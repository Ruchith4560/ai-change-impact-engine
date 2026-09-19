"""Unit tests for DependencyGraphBuilder."""
from app.graph.builder import DependencyGraphBuilder
from app.models.graph_models import RelationType

FILE_A = """
import { helperB } from "./b.js";

export function funcA() {
    return helperB() + 1;
}
"""

FILE_B = """
import { funcA } from "./a.js";

export function helperB() {
    return 42;
}

export function circularCaller() {
    return funcA();
}
"""


def test_build_graph_with_cycles():
    files = {
        "src/a.ts": FILE_A,
        "src/b.ts": FILE_B,
    }

    builder = DependencyGraphBuilder()
    graph = builder.build_from_files(files)

    assert graph.has_node("file:src/a.ts")
    assert graph.has_node("file:src/b.ts")
    assert graph.has_node("src/a.ts::funcA")
    assert graph.has_node("src/b.ts::helperB")
    assert graph.has_node("src/b.ts::circularCaller")

    # Verify import edges
    assert graph.has_edge("file:src/a.ts", "file:src/b.ts")
    assert graph.has_edge("file:src/b.ts", "file:src/a.ts")

    # Verify call edges
    assert graph.has_edge("src/a.ts::funcA", "src/b.ts::helperB")
    edge_data = graph.get_edge_data("src/a.ts::funcA", "src/b.ts::helperB")
    assert edge_data["relation_type"] == RelationType.CALLS
    assert edge_data["confidence"] >= 0.9

    # Verify circular call edge
    assert graph.has_edge("src/b.ts::circularCaller", "src/a.ts::funcA")
