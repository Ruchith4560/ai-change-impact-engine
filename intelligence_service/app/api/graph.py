"""API endpoints for repository dependency graph and blast radius analysis."""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Dict, List
from app.models.graph_models import (
    BuildGraphRequest,
    BlastRadiusRequest,
    BlastRadiusReport,
    GraphNode,
    GraphEdge,
)
from app.graph.builder import DependencyGraphBuilder
from app.graph.traverser import BlastRadiusTraverser
from app.core.logging import get_logger

logger = get_logger("api_graph")
router = APIRouter(prefix="/api/v1/graph", tags=["Dependency Graph & Blast Radius"])


class GraphSummaryResponse(BaseModel):
    total_nodes: int
    total_edges: int
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    unresolved_calls: List[str]


@router.post(
    "/build",
    response_model=GraphSummaryResponse,
    summary="Construct full dependency graph from repository source files",
)
async def build_graph(payload: BuildGraphRequest) -> GraphSummaryResponse:
    try:
        builder = DependencyGraphBuilder()
        graph = builder.build_from_files(payload.files)

        nodes = []
        for nid, data in graph.nodes(data=True):
            nodes.append(
                GraphNode(
                    id=nid,
                    label=data.get("label", nid),
                    file_path=data.get("file_path", ""),
                    entity_type=data.get("entity_type", "UNKNOWN"),
                    is_exported=data.get("is_exported", False),
                    metadata=data.get("metadata", {}),
                )
            )

        edges = []
        for u, v, data in graph.edges(data=True):
            edges.append(
                GraphEdge(
                    source_id=u,
                    target_id=v,
                    relation_type=data.get("relation_type"),
                    confidence=data.get("confidence", 1.0),
                    is_dynamic=data.get("is_dynamic", False),
                )
            )

        return GraphSummaryResponse(
            total_nodes=graph.number_of_nodes(),
            total_edges=graph.number_of_edges(),
            nodes=nodes,
            edges=edges,
            unresolved_calls=builder.unresolved_calls,
        )
    except Exception as e:
        logger.error(f"Failed to build graph: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Graph construction failed: {str(e)}",
        )


@router.post(
    "/blast-radius",
    response_model=BlastRadiusReport,
    summary="Calculate direct and transitive downstream blast radius with causal paths",
)
async def compute_blast_radius(payload: BlastRadiusRequest) -> BlastRadiusReport:
    try:
        builder = DependencyGraphBuilder()
        graph = builder.build_from_files(payload.files)

        report = BlastRadiusTraverser.compute_blast_radius(
            graph=graph,
            changed_symbol_ids=payload.changed_symbol_ids,
            max_depth=payload.max_depth,
            unresolved_calls=builder.unresolved_calls,
        )

        logger.info(
            f"Computed blast radius for {len(payload.changed_symbol_ids)} symbols: "
            f"{report.direct_impact_count} direct, {report.transitive_impact_count} transitive"
        )
        return report
    except Exception as e:
        logger.error(f"Failed to compute blast radius: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Blast radius analysis failed: {str(e)}",
        )
