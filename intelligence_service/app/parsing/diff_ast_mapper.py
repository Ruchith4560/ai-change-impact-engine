"""Diff-to-AST Mapper.

Maps raw line-hunk modifications to granular AST CodeEntities, classifying
change nature (SIGNATURE_MODIFIED vs BODY_MODIFIED vs ADDED/DELETED) and flagging
potential breaking changes on public interfaces.
"""
from typing import List, Dict, Set, Optional
from app.models.diff_models import ChangedFile, ChangeType
from app.models.ast_models import (
    ASTFileAnalysis,
    CodeEntity,
    ChangedSymbol,
    ChangeNature,
    DiffToASTResult,
    EntityType,
)
from app.core.logging import get_logger

logger = get_logger("diff_ast_mapper")


class DiffASTMapper:
    """Intersects Git diff line changes with AST entity spans."""

    @classmethod
    def map_file_diff_to_ast(
        cls,
        changed_file: ChangedFile,
        ast_analysis: Optional[ASTFileAnalysis],
        base_ast_analysis: Optional[ASTFileAnalysis] = None,
    ) -> List[ChangedSymbol]:
        """Maps line changes for a single file to its enclosing AST entities."""
        if not ast_analysis and changed_file.change_type != ChangeType.DELETED:
            return []

        changed_symbols: List[ChangedSymbol] = []

        # Case 1: Entire file was deleted
        if changed_file.change_type == ChangeType.DELETED:
            if base_ast_analysis:
                for entity in base_ast_analysis.entities:
                    changed_symbols.append(
                        ChangedSymbol(
                            entity_id=entity.id,
                            qualified_name=entity.qualified_name,
                            entity_type=entity.entity_type,
                            file_path=changed_file.new_path,
                            change_nature=ChangeNature.DELETED,
                            is_exported=entity.is_exported,
                            is_breaking_candidate=entity.is_exported,
                            diff_lines_intersected=[],
                            location=entity.location,
                        )
                    )
            return changed_symbols

        # Case 2: Brand new file added
        if changed_file.change_type == ChangeType.ADDED:
            assert ast_analysis is not None
            for entity in ast_analysis.entities:
                changed_symbols.append(
                    ChangedSymbol(
                        entity_id=entity.id,
                        qualified_name=entity.qualified_name,
                        entity_type=entity.entity_type,
                        file_path=changed_file.new_path,
                        change_nature=ChangeNature.ADDED,
                        is_exported=entity.is_exported,
                        is_breaking_candidate=False,
                        diff_lines_intersected=list(range(entity.location.start_line, entity.location.end_line + 1)),
                        location=entity.location,
                    )
                )
            return changed_symbols

        # Case 3: Modified or Renamed file
        assert ast_analysis is not None
        # Collect all modified new lines across hunks
        all_modified_lines: Set[int] = set()
        for hunk in changed_file.hunks:
            all_modified_lines.update(hunk.modified_new_lines)

        if not all_modified_lines:
            return []

        # Find innermost enclosing entities
        # Methods are evaluated before classes so methods take priority over the outer class span
        sorted_entities = sorted(
            ast_analysis.entities,
            key=lambda e: (e.location.end_line - e.location.start_line),
        )

        accounted_lines: Set[int] = set()

        for entity in sorted_entities:
            intersected = [l for l in all_modified_lines if entity.location.contains_line(l)]
            if not intersected:
                continue

            # Determine change nature
            nature = ChangeNature.BODY_MODIFIED
            is_breaking = False

            if entity.signature_span:
                sig_start, sig_end = entity.signature_span
                sig_intersected = [l for l in intersected if sig_start <= l <= sig_end]
                if sig_intersected:
                    nature = ChangeNature.SIGNATURE_MODIFIED
                    if entity.is_exported:
                        is_breaking = True

            changed_symbols.append(
                ChangedSymbol(
                    entity_id=entity.id,
                    qualified_name=entity.qualified_name,
                    entity_type=entity.entity_type,
                    file_path=changed_file.new_path,
                    change_nature=nature,
                    is_exported=entity.is_exported,
                    is_breaking_candidate=is_breaking,
                    diff_lines_intersected=sorted(intersected),
                    location=entity.location,
                )
            )
            accounted_lines.update(intersected)

        return changed_symbols

    @classmethod
    def map_diff_to_ast(
        cls,
        changed_files: List[ChangedFile],
        analyses_by_path: Dict[str, ASTFileAnalysis],
        base_analyses_by_path: Optional[Dict[str, ASTFileAnalysis]] = None,
    ) -> DiffToASTResult:
        """Processes multiple changed files and maps them to AST changed symbols."""
        all_changed_symbols: List[ChangedSymbol] = []
        unmapped_lines: Dict[str, List[int]] = {}

        for cf in changed_files:
            head_analysis = analyses_by_path.get(cf.new_path)
            base_analysis = base_analyses_by_path.get(cf.old_path or cf.new_path) if base_analyses_by_path else None

            symbols = cls.map_file_diff_to_ast(cf, head_analysis, base_analysis)
            all_changed_symbols.extend(symbols)

            # Track unmapped lines
            all_file_lines = set()
            for h in cf.hunks:
                all_file_lines.update(h.modified_new_lines)

            mapped_lines = set()
            for s in symbols:
                mapped_lines.update(s.diff_lines_intersected)

            unmapped = sorted(list(all_file_lines - mapped_lines))
            if unmapped:
                unmapped_lines[cf.new_path] = unmapped

        breaking_count = sum(1 for s in all_changed_symbols if s.is_breaking_candidate)

        return DiffToASTResult(
            total_changed_symbols=len(all_changed_symbols),
            breaking_candidates_count=breaking_count,
            changed_symbols=all_changed_symbols,
            unmapped_lines_by_file=unmapped_lines,
        )
