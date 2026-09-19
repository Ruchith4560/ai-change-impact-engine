"""Explainable Composite Risk Scoring Engine.

Calculates an interpretable 0-100 risk score using mathematically grounded factors:
blast radius volume, dependency depth, public interface mutation, test gap, defect churn,
and raw code churn.
"""
import math
from typing import List, Tuple
from app.models.risk_models import (
    RiskFactorContribution,
    RiskLevel,
    HistoricalSignal,
)
from app.core.logging import get_logger

logger = get_logger("risk_scorer")


class CompositeRiskScorer:
    """Calculates transparent, interpretable risk scores with exact factor point attribution."""

    WEIGHT_BLAST_RADIUS = 25
    WEIGHT_TRANSITIVE_DEPTH = 20
    WEIGHT_PUBLIC_API_BREAK = 20
    WEIGHT_TEST_GAP = 15
    WEIGHT_HISTORICAL_CHURN = 10
    WEIGHT_CODE_CHURN = 10

    @classmethod
    def calculate_risk(
        cls,
        impacted_entities_count: int,
        max_dependency_depth: int,
        breaking_candidates_count: int,
        covered_impacted_count: int,
        historical_signal: HistoricalSignal,
        total_additions: int,
        total_deletions: int,
    ) -> Tuple[int, RiskLevel, List[RiskFactorContribution]]:
        """Computes the overall score, level, and individual factor point contributions."""
        factors: List[RiskFactorContribution] = []

        # 1. Blast Radius Volume (Weight: 25)
        raw_blast = math.tanh(impacted_entities_count / 15.0)
        pts_blast = int(round(raw_blast * cls.WEIGHT_BLAST_RADIUS))
        factors.append(
            RiskFactorContribution(
                factor_id="BLAST_RADIUS_VOLUME",
                name="Downstream Blast Radius Volume",
                weight=cls.WEIGHT_BLAST_RADIUS,
                raw_value=round(raw_blast, 3),
                contribution_points=pts_blast,
                evidence=(
                    f"{impacted_entities_count} downstream code entities potentially affected."
                ),
            )
        )

        # 2. Transitive Dependency Depth (Weight: 20)
        raw_depth = min(1.0, max_dependency_depth / 5.0)
        pts_depth = int(round(raw_depth * cls.WEIGHT_TRANSITIVE_DEPTH))
        factors.append(
            RiskFactorContribution(
                factor_id="TRANSITIVE_DEPTH",
                name="Maximum Dependency Depth",
                weight=cls.WEIGHT_TRANSITIVE_DEPTH,
                raw_value=round(raw_depth, 3),
                contribution_points=pts_depth,
                evidence=(
                    f"Changes propagate up to {max_dependency_depth} hops away from source."
                ),
            )
        )

        # 3. Public API / Contract Mutation (Weight: 20)
        has_api_break = breaking_candidates_count > 0
        raw_api = 1.0 if has_api_break else 0.0
        pts_api = int(round(raw_api * cls.WEIGHT_PUBLIC_API_BREAK))
        factors.append(
            RiskFactorContribution(
                factor_id="PUBLIC_API_BREAK",
                name="Exported Interface Mutation",
                weight=cls.WEIGHT_PUBLIC_API_BREAK,
                raw_value=raw_api,
                contribution_points=pts_api,
                evidence=(
                    f"{breaking_candidates_count} exported symbols had signature/parameter alterations."
                    if has_api_break
                    else "No public export signatures modified."
                ),
            )
        )

        # 4. Test Proximity Gap (Weight: 15)
        # Higher score if fewer impacted components have existing tests
        denom = max(1, impacted_entities_count)
        coverage_ratio = min(1.0, covered_impacted_count / denom)
        raw_gap = max(0.0, 1.0 - coverage_ratio)
        pts_gap = int(round(raw_gap * cls.WEIGHT_TEST_GAP))
        factors.append(
            RiskFactorContribution(
                factor_id="TEST_PROXIMITY_GAP",
                name="Test Coverage Proximity Gap",
                weight=cls.WEIGHT_TEST_GAP,
                raw_value=round(raw_gap, 3),
                contribution_points=pts_gap,
                evidence=(
                    f"{covered_impacted_count} of {impacted_entities_count} impacted entities directly backed by tests."
                ),
            )
        )

        # 5. Historical Regression Churn (Weight: 10)
        if historical_signal.is_available:
            raw_history = min(1.0, historical_signal.recent_bugfixes_count / 4.0)
            pts_history = int(round(raw_history * cls.WEIGHT_HISTORICAL_CHURN))
            evidence_history = (
                f"{historical_signal.recent_bugfixes_count} past bugfix commits touched these files."
            )
        else:
            raw_history = 0.2  # Neutral baseline
            pts_history = 2
            evidence_history = f"Historical signal unavailable: {historical_signal.unavailability_reason}"

        factors.append(
            RiskFactorContribution(
                factor_id="HISTORICAL_REGRESSION_CHURN",
                name="Historical Defect Frequency",
                weight=cls.WEIGHT_HISTORICAL_CHURN,
                raw_value=round(raw_history, 3),
                contribution_points=pts_history,
                evidence=evidence_history,
            )
        )

        # 6. Raw Code Churn (Weight: 10)
        total_churn = total_additions + total_deletions
        raw_churn = math.tanh(total_churn / 150.0)
        pts_churn = int(round(raw_churn * cls.WEIGHT_CODE_CHURN))
        factors.append(
            RiskFactorContribution(
                factor_id="CODE_CHURN",
                name="Diff Size & Code Churn",
                weight=cls.WEIGHT_CODE_CHURN,
                raw_value=round(raw_churn, 3),
                contribution_points=pts_churn,
                evidence=f"+{total_additions}/-{total_deletions} lines modified across diff.",
            )
        )

        # Sum of factor points
        total_score = min(100, max(0, sum(f.contribution_points for f in factors)))

        if total_score >= 85:
            level = RiskLevel.CRITICAL
        elif total_score >= 70:
            level = RiskLevel.HIGH
        elif total_score >= 40:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        logger.info(f"Calculated risk: {total_score}/100 ({level.value}) across 6 factors")
        return total_score, level, factors
