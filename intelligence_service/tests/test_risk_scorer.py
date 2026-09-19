"""Unit tests for CompositeRiskScorer."""
from app.risk.scorer import CompositeRiskScorer
from app.models.risk_models import HistoricalSignal, RiskLevel


def test_risk_scorer_factor_sum():
    history = HistoricalSignal(
        is_available=True,
        commits_analyzed=20,
        recent_bugfixes_count=2,
    )

    score, level, factors = CompositeRiskScorer.calculate_risk(
        impacted_entities_count=10,
        max_dependency_depth=3,
        breaking_candidates_count=1,
        covered_impacted_count=5,
        historical_signal=history,
        total_additions=120,
        total_deletions=40,
    )

    assert 0 <= score <= 100
    assert len(factors) == 6

    # Verify that the sum of factor contribution points matches the total score
    factor_points_sum = sum(f.contribution_points for f in factors)
    assert score == min(100, factor_points_sum)

    # With breaking_candidates_count=1, the public API factor must contribute max points (20)
    api_factor = next(f for f in factors if f.factor_id == "PUBLIC_API_BREAK")
    assert api_factor.contribution_points == 20


def test_risk_scorer_monotonicity():
    history = HistoricalSignal(is_available=False)

    # Low risk scenario
    low_score, low_level, _ = CompositeRiskScorer.calculate_risk(
        impacted_entities_count=1,
        max_dependency_depth=1,
        breaking_candidates_count=0,
        covered_impacted_count=1,
        historical_signal=history,
        total_additions=5,
        total_deletions=2,
    )

    # High risk scenario: large blast radius, deep dependency, public API break
    high_score, high_level, _ = CompositeRiskScorer.calculate_risk(
        impacted_entities_count=25,
        max_dependency_depth=5,
        breaking_candidates_count=3,
        covered_impacted_count=0,
        historical_signal=history,
        total_additions=450,
        total_deletions=200,
    )

    assert high_score > low_score
    assert low_level in (RiskLevel.LOW, RiskLevel.MEDIUM)
    assert high_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)
