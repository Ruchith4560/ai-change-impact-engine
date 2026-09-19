"""AST parsing and diff-to-AST mapping API endpoints."""
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.models.ast_models import ASTFileAnalysis, DiffToASTResult
from app.parsing.parser_factory import ParserFactory
from app.parsing.diff_ast_mapper import DiffASTMapper
from app.git.diff_parser import UnifiedDiffParser
from app.core.logging import get_logger

logger = get_logger("api_ast")
router = APIRouter(prefix="/api/v1/ast", tags=["AST Code Intelligence"])


class ParseFileRequest(BaseModel):
    file_path: str = Field(..., examples=["src/payment_service.ts"])
    content: str = Field(..., description="Raw source code content")


class MapDiffRequest(BaseModel):
    raw_diff: str = Field(..., description="Unified git diff text")
    files_content: Dict[str, str] = Field(
        ...,
        description="Map of file path to new head content for changed files",
    )
    base_files_content: Optional[Dict[str, str]] = Field(
        default=None,
        description="Optional map of file path to base content for deleted/modified files",
    )


@router.post(
    "/parse-file",
    response_model=ASTFileAnalysis,
    summary="Extract AST entities, imports, and calls from a single source file",
)
async def parse_file(payload: ParseFileRequest) -> ASTFileAnalysis:
    parser = ParserFactory.get_parser_for_file(payload.file_path)
    if not parser:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type for AST analysis: {payload.file_path}",
        )

    try:
        analysis = parser.parse_source(payload.file_path, payload.content)
        logger.info(
            f"Parsed {payload.file_path} ({analysis.language}): "
            f"{len(analysis.entities)} entities, {len(analysis.imports)} imports"
        )
        return analysis
    except Exception as e:
        logger.error(f"Error parsing file {payload.file_path}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AST parsing failure: {str(e)}",
        )


@router.post(
    "/map-diff",
    response_model=DiffToASTResult,
    summary="Intersect git diff hunks with AST symbols to identify changed entities",
)
async def map_diff_to_ast(payload: MapDiffRequest) -> DiffToASTResult:
    try:
        diff_result = UnifiedDiffParser.parse(payload.raw_diff)

        analyses_by_path: Dict[str, ASTFileAnalysis] = {}
        for path, code in payload.files_content.items():
            parser = ParserFactory.get_parser_for_file(path)
            if parser:
                analyses_by_path[path] = parser.parse_source(path, code)

        base_analyses_by_path: Dict[str, ASTFileAnalysis] = {}
        if payload.base_files_content:
            for path, code in payload.base_files_content.items():
                parser = ParserFactory.get_parser_for_file(path)
                if parser:
                    base_analyses_by_path[path] = parser.parse_source(path, code)

        result = DiffASTMapper.map_diff_to_ast(
            changed_files=diff_result.files,
            analyses_by_path=analyses_by_path,
            base_analyses_by_path=base_analyses_by_path if base_analyses_by_path else None,
        )

        logger.info(
            f"Diff mapped to {result.total_changed_symbols} changed symbols "
            f"({result.breaking_candidates_count} breaking candidates)"
        )
        return result
    except Exception as e:
        logger.error(f"Error mapping diff to AST: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to map diff to AST symbols: {str(e)}",
        )
