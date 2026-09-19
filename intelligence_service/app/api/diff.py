"""Diff parsing and commit analysis endpoints."""
from fastapi import APIRouter, HTTPException, status
from app.models.diff_models import ParseDiffRequest, DiffAnalysisResult
from app.git.diff_parser import UnifiedDiffParser
from app.core.logging import get_logger

logger = get_logger("api_diff")
router = APIRouter(prefix="/api/v1/diff", tags=["Diff Analysis"])


@router.post(
    "/parse",
    response_model=DiffAnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Parse raw unified diff text into structured file and hunk changes",
)
async def parse_diff(payload: ParseDiffRequest) -> DiffAnalysisResult:
    """Parses standard unified git diff into structured ChangedFile and DiffHunk entities."""
    try:
        result = UnifiedDiffParser.parse(payload.raw_diff)
        logger.info(
            f"Parsed diff: {result.total_files_changed} files changed, "
            f"+{result.total_additions}/-{result.total_deletions} lines."
        )
        return result
    except Exception as e:
        logger.error(f"Failed to parse diff: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Malformed unified diff: {str(e)}",
        )
