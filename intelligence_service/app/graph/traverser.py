"""Blast Radius Traverser.

Executes reverse reachability BFS on the dependency graph to compute
direct, first-level, and transitive downstream impacts with deterministic causal paths.
"""
from typing import List, Dict, Set, Tuple, Optional
from collections import deque
import networkx as nx

from app.models.graph_models import (
    GraphNode,
    GraphEdge,
    ImpactedEntity,
    ImpactType,
    BlastRadiusReport,
    RelationType,
)
from app.core.logging import get_logger

logger = get_logger("graph_traverser")


class BlastRadiusTraverser:
    """Computes downstream blast radius and causal paths using reverse graph traversal."""

    @classmethod
    def compute_blast_radius(
        cls,
        graph: nx.DiGraph,
        changed_symbol_ids: List[str],
        max_depth: int = 10,
        unresolved_calls: Optional[List[str]] = None,
    ) -> BlastRadiusReport:
        """Calculates all directly and transitively affected entities from changed symbols."""
        if not changed_symbol_ids:
            return BlastRadiusReport()

        # In our graph, edge is (caller -> callee).
        # To find what is impacted by a change to callee, we traverse reverse edges (callee -> caller).
        reversed_graph = graph.reverse(copy=False)

        visited: Set[str] = set()
        impacted_entities: List[ImpactedEntity] = []

        # Subgraph collection for UI visualizer
        subgraph_node_ids: Set[str] = set(changed_symbol_ids)
        subgraph_edges: List[GraphEdge] = []

        # Queue contains: (current_node_id, depth, causal_path, cumulative_confidence)
        queue = deque()

        for changed_id in changed_symbol_ids:
            if graph.has_node(changed_id):
                visited.add(changed_id)
                queue.append((changed_id, 0, [changed_id], 1.0))
            else:
                logger.warning(f"Changed symbol not found in dependency graph: {changed_id}")

        direct_count = 0
        transitive_count = 0
        max_depth_reached = 0

        while queue:
            curr_id, curr_depth, path, curr_conf = queue.popleft()

            if curr_depth >= max_depth:
                continue

            # Traverse all predecessors in original graph (successors in reversed graph)
            for upstream_id in reversed_graph.successors(curr_id):
                edge_data = reversed_graph.get_edge_data(curr_id, upstream_id) or {}
                rel_type = edge_data.get("relation_type", RelationType.CALLS)
                edge_conf = edge_data.get("confidence", 1.0)
                is_dynamic = edge_data.get("is_dynamic", False)

                # Filter edges by granularity:
                # 1. DEFINES represents structural containment (File -> Class -> Method), NOT a caller/usage dependency.
                # 2. For symbol nodes, traverse CALLS and REFERENCES.
                # 3. For file nodes, traverse IMPORTS.
                is_curr_file = curr_id.startswith("file:")
                if is_curr_file:
                    if rel_type != RelationType.IMPORTS:
                        continue
                else:
                    if rel_type not in (RelationType.CALLS, RelationType.REFERENCES):
                        continue

                new_depth = curr_depth + 1
                new_path = path + [upstream_id]
                new_conf = round(curr_conf * edge_conf, 3)

                # Record edge in the impact subgraph (represented in original direction: upstream -> curr)
                subgraph_node_ids.add(upstream_id)
                subgraph_edges.append(
                    GraphEdge(
                        source_id=upstream_id,
                        target_id=curr_id,
                        relation_type=rel_type,
                        confidence=edge_conf,
                        is_dynamic=is_dynamic,
                    )
                )

                if upstream_id not in visited:
                    visited.add(upstream_id)
                    max_depth_reached = max(max_depth_reached, new_depth)

                    upstream_node_data = graph.nodes.get(upstream_id, {})
                    entity_type = upstream_node_data.get("entity_type", "UNKNOWN")
                    file_path = upstream_node_data.get("file_path", "")
                    label = upstream_node_data.get("label", upstream_id)

                    impact_type = ImpactType.DIRECT if new_depth == 1 else ImpactType.TRANSITIVE
                    if impact_type == ImpactType.DIRECT:
                        direct_count += 1
                    else:
                        transitive_count += 1

                    impacted_entities.append(
                        ImpactedEntity(
                            entity_id=upstream_id,
                            qualified_name=label,
                            entity_type=entity_type,
                            file_path=file_path,
                            impact_type=impact_type,
                            depth=new_depth,
                            causal_path=new_path,
                            confidence=new_conf,
                        )
                    )

                    queue.append((upstream_id, new_depth, new_path, new_conf))

        # Assemble subgraph nodes
        subgraph_nodes: List[GraphNode] = []
        for nid in subgraph_node_ids:
            if graph.has_node(nid):
                data = graph.nodes[nid]
                subgraph_nodes.append(
                    GraphNode(
                        id=nid,
                        label=data.get("label", nid),
                        file_path=data.get("file_path", ""),
                        entity_type=data.get("entity_type", "UNKNOWN"),
                        is_exported=data.get("is_exported", False),
                        metadata=data.get("metadata", {}),
                    )
                )

        # Sort impacted entities by depth ascending (closest first)
        impacted_entities.sort(key=lambda x: (x.depth, x.qualified_name))

        return BlastRadiusReport(
            changed_symbol_ids=changed_symbol_ids,
            direct_impact_count=direct_count,
            transitive_impact_count=transitive_count,
            total_impacted_count=direct_count + transitive_count,
            max_depth_reached=max_depth_reached,
            impacted_entities=impacted_entities,
            subgraph_nodes=subgraph_nodes,
            subgraph_edges=subgraph_edges,
            unresolved_calls=unresolved_calls or [],
        )
