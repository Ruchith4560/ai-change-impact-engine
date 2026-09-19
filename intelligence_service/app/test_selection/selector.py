"""Intelligent Regression Test Selector (RTS).

Maps code changes and downstream blast-radius entities to relevant tests,
categorizing recommendations into Priority 1 (Direct), Priority 2 (Downstream),
and Priority 3 (Historical).
"""
import re
import posixpath
from typing import List, Dict, Set, Optional
from app.models.graph_models import ImpactedEntity
from app.models.risk_models import (
    TestPlan,
    SelectedTest,
    TestPriority,
)
from app.parsing.parser_factory import ParserFactory
from app.core.logging import get_logger

logger = get_logger("test_selector")

TEST_FILE_PATTERN = re.compile(
    r"(^|/)(tests?|__tests__|spec)/|(\.spec\.|\.test\.|test_)[a-zA-Z0-9_\-\.]+$",
    re.IGNORECASE,
)


class IntelligentTestSelector:
    """Selects and prioritizes tests based on static call reachability and historical coupling."""

    @classmethod
    def select_tests(
        cls,
        changed_symbol_ids: List[str],
        impacted_entities: List[ImpactedEntity],
        repo_files: Dict[str, str],
        co_changed_files: Optional[Dict[str, List[str]]] = None,
    ) -> TestPlan:
        """Constructs an evidence-backed prioritized test plan."""
        # 1. Discover all test files in the repository
        all_test_files = [f for f in repo_files.keys() if TEST_FILE_PATTERN.search(f)]
        total_tests = len(all_test_files)

        if total_tests == 0:
            return TestPlan(
                total_repo_tests=0,
                selected_tests_count=0,
                test_reduction_ratio=0.0,
                selected_tests=[],
            )

        # Build symbol lookup maps
        changed_symbols_set = set(changed_symbol_ids)
        # Extract pure symbol names (e.g. 'PaymentService.processTransaction' and 'processTransaction')
        changed_names = set()
        for s in changed_symbol_ids:
            if "::" in s:
                qual = s.split("::", 1)[1]
                changed_names.add(qual)
                if "." in qual:
                    changed_names.add(qual.split(".", 1)[1])

        impacted_map = {e.qualified_name: e for e in impacted_entities}
        impacted_pure_names = {}
        for qual, ent in impacted_map.items():
            impacted_pure_names[qual] = ent
            if "." in qual:
                impacted_pure_names[qual.split(".", 1)[1]] = ent

        selected_tests: List[SelectedTest] = []
        visited_test_files: Set[str] = set()

        # 2. Parse each test file to inspect its target imports and calls
        for test_file in all_test_files:
            code = repo_files[test_file]
            parser = ParserFactory.get_parser_for_file(test_file)

            calls_in_test: Set[str] = set()
            imports_in_test: Set[str] = set()

            if parser:
                try:
                    analysis = parser.parse_source(test_file, code)
                    for imp in analysis.imports:
                        imports_in_test.update(imp.imported_names)
                    for ent in analysis.entities:
                        for c in ent.calls:
                            calls_in_test.add(c.target_name)
                except Exception as e:
                    logger.warning(f"Failed to parse test file {test_file}: {e}")

            # Also check text occurrence fallback for test names like `it("processes transaction")`
            # Priority 1: Directly targets modified symbol
            p1_match = False
            for c_name in changed_names:
                if c_name in calls_in_test or c_name in imports_in_test or c_name in code:
                    selected_tests.append(
                        SelectedTest(
                            test_file_path=test_file,
                            test_name=None,
                            priority=TestPriority.P1,
                            rationale=f"Direct unit test asserting modified symbol '{c_name}'",
                            target_entity_id=next((s for s in changed_symbol_ids if c_name in s), None),
                            path_distance=0,
                            confidence=1.0,
                        )
                    )
                    visited_test_files.add(test_file)
                    p1_match = True
                    break

            if p1_match:
                continue

            # Priority 2: Downstream integration test asserting blast-radius dependents
            p2_match = False
            for imp_name, ent in impacted_pure_names.items():
                if imp_name in calls_in_test or imp_name in imports_in_test or imp_name in code:
                    selected_tests.append(
                        SelectedTest(
                            test_file_path=test_file,
                            test_name=None,
                            priority=TestPriority.P2,
                            rationale=(
                                f"Integration test covering downstream dependent '{ent.qualified_name}' "
                                f"(Blast radius depth {ent.depth})"
                            ),
                            target_entity_id=ent.entity_id,
                            path_distance=ent.depth,
                            confidence=0.9,
                        )
                    )
                    visited_test_files.add(test_file)
                    p2_match = True
                    break

            if p2_match:
                continue

            # Priority 3: Historical co-change coupling
            if co_changed_files:
                for changed_file, co_list in co_changed_files.items():
                    if test_file in co_list and test_file not in visited_test_files:
                        selected_tests.append(
                            SelectedTest(
                                test_file_path=test_file,
                                test_name=None,
                                priority=TestPriority.P3,
                                rationale=f"Historically co-committed with modified file '{changed_file}'",
                                target_entity_id=None,
                                path_distance=3,
                                confidence=0.75,
                            )
                        )
                        visited_test_files.add(test_file)
                        break

        # Count priorities
        p1_c = sum(1 for t in selected_tests if t.priority == TestPriority.P1)
        p2_c = sum(1 for t in selected_tests if t.priority == TestPriority.P2)
        p3_c = sum(1 for t in selected_tests if t.priority == TestPriority.P3)

        reduction = round(1.0 - (len(selected_tests) / total_tests), 3) if total_tests > 0 else 0.0

        # Sort tests: P1 first, then P2 by path_distance, then P3
        priority_order = {TestPriority.P1: 1, TestPriority.P2: 2, TestPriority.P3: 3}
        selected_tests.sort(key=lambda t: (priority_order[t.priority], t.path_distance))

        logger.info(
            f"Test selection complete: {len(selected_tests)} of {total_tests} tests recommended "
            f"({p1_c} P1, {p2_c} P2, {p3_c} P3) - {reduction * 100}% reduction."
        )

        return TestPlan(
            total_repo_tests=total_tests,
            selected_tests_count=len(selected_tests),
            test_reduction_ratio=reduction,
            p1_count=p1_c,
            p2_count=p2_c,
            p3_count=p3_c,
            selected_tests=selected_tests,
        )
