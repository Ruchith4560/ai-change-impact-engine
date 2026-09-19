"""API endpoints for risk scoring and intelligent test planning."""
from fastapi import APIRouter, HTTPException, status
from app.models.risk_models import (
    EvaluateRiskRequest,
    RiskReport,
    HistoricalSignal,
)
from app.models.graph_models import ImpactedEntity, ImpactType
from app.history.cochange_miner import GitHistoryMiner, CommitRecord
from app.risk.scorer import CompositeRiskScorer
from app.test_selection.selector import IntelligentTestSelector
from app.core.logging import get_logger

logger = get_logger("api_risk")
router = APIRouter(prefix="/api/v1/risk", tags=["Risk Scoring & Test Planning"])


@router.post(
    "/evaluate",
    response_model=RiskReport,
    summary="Compute composite risk score and intelligent test selection",
)
async def evaluate_risk(payload: EvaluateRiskRequest) -> RiskReport:
    try:
        # 1. Historical Signals
        if payload.commit_messages and len(payload.commit_messages) >= 5:
            # Reconstruct commit records
            commits = [
                CommitRecord(
                    commit_hash=f"c_{idx}",
                    message=msg,
                    files_touched=payload.impacted_file_paths,
                )
                for idx, msg in enumerate(payload.commit_messages)
            ]
            history_signal = GitHistoryMiner.analyze_history(
                commits=commits,
                target_files=payload.impacted_file_paths,
            )
        elif payload.co_change_map:
            history_signal = HistoricalSignal(
                is_available=True,
                commits_analyzed=10,
                recent_bugfixes_count=1,
                co_changed_files=payload.co_change_map,
            )
        else:
            history_signal = HistoricalSignal(
                is_available=False,
                unavailability_reason="Git history not provided with request",
            )

        # 2. Reconstruct impacted entities
        impacted_entities: List[ImpactedEntity] = [
            ImpactedEntity(
                entity_id=f"ent_{idx}",
                qualified_name=f"Impacted_{idx}",
                entity_type="METHOD",
                file_path=f_path,
                impact_type=ImpactType.DIRECT if idx == 0 else ImpactType.TRANSITIVE,
                depth=min(payload.max_dependency_depth, idx + 1),
                causal_path=[payload.changed_symbol_ids[0] if payload.changed_symbol_ids else "", f_path],
            )
            for idx, f_path in enumerate(payload.impacted_file_paths)
        ]

        # 3. Intelligent Test Selection
        test_plan = IntelligentTestSelector.select_tests(
            changed_symbol_ids=payload.changed_symbol_ids,
            impacted_entities=impacted_entities,
            repo_files=payload.repo_files,
            co_changed_files=history_signal.co_changed_files if history_signal.is_available else None,
        )

        # 4. Composite Risk Score
        score, level, factors = CompositeRiskScorer.calculate_risk(
            impacted_entities_count=payload.impacted_entities_count,
            max_dependency_depth=payload.max_dependency_depth,
            breaking_candidates_count=payload.breaking_candidates_count,
            covered_impacted_count=len(test_plan.selected_tests),
            historical_signal=history_signal,
            total_additions=payload.total_additions,
            total_deletions=payload.total_deletions,
        )

        limitations = []
        if not history_signal.is_available:
            limitations.append(f"Historical signals: {history_signal.unavailability_reason}")
        if test_plan.total_repo_tests == 0:
            limitations.append("No test files detected in repository; test proximity score uses conservative penalty.")

        return RiskReport(
            risk_score=score,
            risk_level=level,
            factors=factors,
            historical_signal=history_signal,
            test_plan=test_plan,
            limitations=limitations,
        )
    except Exception as e:
        logger.error(f"Error evaluating risk: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Risk evaluation failed: {str(e)}",
        )
