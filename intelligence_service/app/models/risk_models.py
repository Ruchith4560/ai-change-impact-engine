"""Domain models for Historical Churn, Risk Scoring, and Intelligent Test Planning."""
from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    """Categorical classification of change risk."""
    LOW = "LOW"          # 0 - 39
    MEDIUM = "MEDIUM"    # 40 - 69
    HIGH = "HIGH"        # 70 - 84
    CRITICAL = "CRITICAL"# 85 - 100


class RiskFactorContribution(BaseModel):
    """An individual factor contributing to the composite risk score."""
    factor_id: str
    name: str
    weight: int = Field(..., description="Configured maximum weight out of 100")
    raw_value: float = Field(..., description="Normalized metric value [0.0, 1.0]")
    contribution_points: int = Field(..., description="Actual integer points added to score")
    evidence: str = Field(..., description="Human-readable factual justification")


class HistoricalSignal(BaseModel):
    """Git commit history signals for touched components."""
    is_available: bool = True
    commits_analyzed: int = 0
    recent_bugfixes_count: int = 0
    high_churn_files: List[str] = Field(default_factory=list)
    co_changed_files: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Map of file -> files historically committed together (frequency >= 0.25)"
    )
    unavailability_reason: Optional[str] = None


class TestPriority(str, Enum):
    """Priority bucket for test execution."""
    __test__ = False
    P1 = "P1"  # Direct unit test asserting the modified symbol
    P2 = "P2"  # Downstream integration test asserting blast-radius dependents
    P3 = "P3"  # Historical safety-net test (frequently co-changed)


class SelectedTest(BaseModel):
    """A recommended test with explicit justification."""
    test_file_path: str
    test_name: Optional[str] = None
    priority: TestPriority
    rationale: str
    target_entity_id: Optional[str] = None
    path_distance: int = Field(default=0, description="Hop distance from modified symbol")
    confidence: float = Field(default=1.0)


class TestPlan(BaseModel):
    """Prioritized test suite recommendation for a PR."""
    __test__ = False
    total_repo_tests: int = 0
    selected_tests_count: int = 0
    test_reduction_ratio: float = Field(default=0.0, description="1.0 - (selected / total)")
    p1_count: int = 0
    p2_count: int = 0
    p3_count: int = 0
    selected_tests: List[SelectedTest] = Field(default_factory=list)


class RiskReport(BaseModel):
    """Complete explainable risk and test recommendation report."""
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: RiskLevel
    factors: List[RiskFactorContribution] = Field(default_factory=list)
    historical_signal: HistoricalSignal
    test_plan: TestPlan
    limitations: List[str] = Field(default_factory=list)


class EvaluateRiskRequest(BaseModel):
    """Request payload for risk scoring and test selection."""
    total_files_changed: int
    total_additions: int
    total_deletions: int
    breaking_candidates_count: int
    changed_symbol_ids: List[str]
    impacted_entities_count: int
    max_dependency_depth: int
    impacted_file_paths: List[str] = Field(default_factory=list)
    repo_files: Dict[str, str] = Field(
        default_factory=dict,
        description="Map of relative file paths to content (used for test discovery)"
    )
    commit_messages: List[str] = Field(
        default_factory=list,
        description="Recent commit messages touching the modified files"
    )
    co_change_map: Optional[Dict[str, List[str]]] = None
