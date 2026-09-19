"""API router for master end-to-end impact analysis pipeline."""
from fastapi import APIRouter, HTTPException, status
from app.models.analysis_models import RunFullAnalysisRequest, FullAnalysisReport
from app.orchestration.analyzer import ChangeImpactOrchestrator
from app.core.logging import get_logger

logger = get_logger("api_pipeline")
router = APIRouter(prefix="/api/v1/pipeline", tags=["Analysis Pipeline"])


@router.post(
    "/analyze",
    response_model=FullAnalysisReport,
    status_code=status.HTTP_200_OK,
    summary="Execute complete end-to-end code change risk and blast-radius analysis",
)
async def run_analysis(payload: RunFullAnalysisRequest) -> FullAnalysisReport:
    """Coordinates the full pipeline: Diff -> AST -> Graph -> Blast Radius -> Risk -> RTS -> AI Explanation."""
    try:
        report = ChangeImpactOrchestrator.run_analysis(payload)
        return report
    except Exception as e:
        logger.error(f"Full analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline execution failed: {str(e)}",
        )
