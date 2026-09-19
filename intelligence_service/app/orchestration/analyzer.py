"""End-to-End Change Impact Analysis Orchestrator.

Coordinates diff ingestion, AST symbol extraction, dependency graph assembly,
reverse blast-radius traversal, historical mining, risk scoring, test selection,
and controlled generative AI explanation into an immutable master report.
"""
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, List

from app.models.analysis_models import (
    RunFullAnalysisRequest,
    FullAnalysisReport,
    AnalysisSummary,
    ExecutionMetrics,
)
from app.models.risk_models import RiskReport, HistoricalSignal
from app.git.diff_parser import UnifiedDiffParser
from app.parsing.parser_factory import ParserFactory
from app.parsing.diff_ast_mapper import DiffASTMapper
from app.graph.builder import DependencyGraphBuilder
from app.graph.traverser import BlastRadiusTraverser
from app.history.cochange_miner import GitHistoryMiner, CommitRecord
from app.risk.scorer import CompositeRiskScorer
from app.test_selection.selector import IntelligentTestSelector
from app.ai.llm_gateway import GeminiExplanationGateway
from app.core.logging import get_logger

logger = get_logger("orchestrator")


class ChangeImpactOrchestrator:
    """Master pipeline orchestrating all intelligence modules."""

    @classmethod
    def run_analysis(cls, request: RunFullAnalysisRequest) -> FullAnalysisReport:
        """Executes full end-to-end analysis on a pull request or commit change."""
        start_time = time.perf_counter()
        metrics = ExecutionMetrics()
        analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
        logger.info(f"Starting master analysis run: {analysis_id}")

        # Step 1: Parse Git Diff
        t0 = time.perf_counter()
        diff_result = UnifiedDiffParser.parse(request.raw_diff)
        metrics.diff_parse_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Step 2: AST Parsing of Changed Files and Base Files
        t0 = time.perf_counter()
        analyses_by_path = {}
        for path, code in request.files.items():
            parser = ParserFactory.get_parser_for_file(path)
            if parser:
                try:
                    analyses_by_path[path] = parser.parse_source(path, code)
                except Exception as e:
                    logger.warning(f"AST parsing skipped for {path}: {e}")

        base_analyses_by_path = {}
        if request.base_files:
            for path, code in request.base_files.items():
                parser = ParserFactory.get_parser_for_file(path)
                if parser:
                    try:
                        base_analyses_by_path[path] = parser.parse_source(path, code)
                    except Exception as e:
                        logger.warning(f"Base AST parsing skipped for {path}: {e}")

        diff_to_ast = DiffASTMapper.map_diff_to_ast(
            changed_files=diff_result.files,
            analyses_by_path=analyses_by_path,
            base_analyses_by_path=base_analyses_by_path if base_analyses_by_path else None,
        )
        metrics.ast_parse_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Step 3: Construct Dependency Graph
        t0 = time.perf_counter()
        builder = DependencyGraphBuilder()
        graph = builder.build_from_files(request.files)
        metrics.graph_build_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Step 4: Blast Radius Traversal
        t0 = time.perf_counter()
        changed_symbol_ids = [s.entity_id for s in diff_to_ast.changed_symbols]

        # If only file-level modifications (e.g. comments or unmapped lines), fallback to file nodes
        if not changed_symbol_ids and diff_result.files:
            changed_symbol_ids = [f"file:{f.new_path}" for f in diff_result.files]

        blast_radius = BlastRadiusTraverser.compute_blast_radius(
            graph=graph,
            changed_symbol_ids=changed_symbol_ids,
            max_depth=10,
            unresolved_calls=builder.unresolved_calls,
        )
        metrics.traversal_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Step 5: Historical Commit Mining
        impacted_file_paths = list({e.file_path for e in blast_radius.impacted_entities if e.file_path})
        if request.commit_messages and len(request.commit_messages) >= 5:
            commits = [
                CommitRecord(
                    commit_hash=f"c_{i}",
                    message=msg,
                    files_touched=impacted_file_paths,
                )
                for i, msg in enumerate(request.commit_messages)
            ]
            history_signal = GitHistoryMiner.analyze_history(commits, impacted_file_paths)
        else:
            history_signal = HistoricalSignal(
                is_available=False,
                unavailability_reason="Git commit log not provided or insufficient history (< 5 commits)",
            )

        # Step 6: Test Selection & Risk Scoring
        t0 = time.perf_counter()
        test_plan = IntelligentTestSelector.select_tests(
            changed_symbol_ids=changed_symbol_ids,
            impacted_entities=blast_radius.impacted_entities,
            repo_files=request.files,
            co_changed_files=history_signal.co_changed_files if history_signal.is_available else None,
        )

        score, level, factors = CompositeRiskScorer.calculate_risk(
            impacted_entities_count=blast_radius.total_impacted_count,
            max_dependency_depth=blast_radius.max_depth_reached,
            breaking_candidates_count=diff_to_ast.breaking_candidates_count,
            covered_impacted_count=len(test_plan.selected_tests),
            historical_signal=history_signal,
            total_additions=diff_result.total_additions,
            total_deletions=diff_result.total_deletions,
        )

        limitations: List[str] = []
        if not history_signal.is_available:
            limitations.append(f"Historical context: {history_signal.unavailability_reason}")
        if builder.unresolved_calls:
            limitations.append(
                f"{len(builder.unresolved_calls)} function/method calls could not be statically resolved."
            )
        if test_plan.total_repo_tests == 0:
            limitations.append("Zero test files detected in repository.")

        risk_report = RiskReport(
            risk_score=score,
            risk_level=level,
            factors=factors,
            historical_signal=history_signal,
            test_plan=test_plan,
            limitations=limitations,
        )
        metrics.risk_eval_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Step 7: AI Synthesis via Gemini Gateway
        t0 = time.perf_counter()
        structured_evidence = {
            "changed_symbols": [s.model_dump() for s in diff_to_ast.changed_symbols],
            "risk_score": score,
            "risk_level": level.value,
            "impacted_entities_count": blast_radius.total_impacted_count,
            "top_factors": [f.model_dump() for f in factors if f.contribution_points > 0],
            "recommended_tests": [t.model_dump() for t in test_plan.selected_tests],
            "limitations": limitations,
        }
        ai_explanation = GeminiExplanationGateway.synthesize_explanation(structured_evidence)
        metrics.ai_synthesis_ms = round((time.perf_counter() - t0) * 1000, 2)

        metrics.total_duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Summary KPIs
        summary = AnalysisSummary(
            risk_score=score,
            risk_level=level.value,
            total_files_changed=diff_result.total_files_changed,
            total_changed_symbols=diff_to_ast.total_changed_symbols,
            breaking_candidates_count=diff_to_ast.breaking_candidates_count,
            direct_impact_count=blast_radius.direct_impact_count,
            transitive_impact_count=blast_radius.transitive_impact_count,
            total_impacted_count=blast_radius.total_impacted_count,
            recommended_test_count=test_plan.selected_tests_count,
            test_reduction_ratio=test_plan.test_reduction_ratio,
        )

        report = FullAnalysisReport(
            analysis_id=analysis_id,
            repository_id=request.repository_id,
            pr_number=request.pr_number,
            summary=summary,
            changed_symbols=diff_to_ast.changed_symbols,
            blast_radius=blast_radius,
            risk_report=risk_report,
            test_plan=test_plan,
            ai_explanation=ai_explanation,
            limitations=limitations,
            metrics=metrics,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        logger.info(
            f"Completed analysis {analysis_id} in {metrics.total_duration_ms}ms "
            f"(Score: {score}/100, Impact: {blast_radius.total_impacted_count})"
        )
        return report
