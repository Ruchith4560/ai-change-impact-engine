"""Pydantic domain models for Dependency Graphs, Blast Radius, and Causal Paths."""
from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class RelationType(str, Enum):
    """Classification of directed relationships between graph nodes."""
    DEFINES = "DEFINES"        # File defines Class, or Class defines Method
    IMPORTS = "IMPORTS"        # File A imports from File B
    CALLS = "CALLS"            # Entity A invokes Entity B
    REFERENCES = "REFERENCES"  # Entity A references Type/Interface B
    TESTS = "TESTS"            # Test suite/case targets Entity


class ImpactType(str, Enum):
    """Proximity classification of blast radius impact."""
    DIRECT = "DIRECT"          # Immediate caller (Hop 1)
    TRANSITIVE = "TRANSITIVE"  # Indirect downstream consumer (Hop 2+)


class GraphNode(BaseModel):
    """A node within the repository code graph (File, Class, Method, Function, Interface)."""
    id: str = Field(..., description="Unique node ID (e.g. 'src/payment.ts::PaymentService.charge')")
    label: str
    file_path: str
    entity_type: str           # FILE, CLASS, METHOD, FUNCTION, INTERFACE, etc.
    is_exported: bool = False
    metadata: Dict[str, str] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    """A directed edge in the repository dependency graph."""
    source_id: str             # Caller / Importer / Parent
    target_id: str             # Callee / Imported / Child
    relation_type: RelationType
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    is_dynamic: bool = False   # True if resolved via heuristic rather than deterministic AST


class ImpactedEntity(BaseModel):
    """A downstream entity affected by a code change."""
    entity_id: str
    qualified_name: str
    entity_type: str
    file_path: str
    impact_type: ImpactType
    depth: int = Field(..., description="Distance from the modified source symbol (1 = Direct)")
    causal_path: List[str] = Field(
        ...,
        description="Chronological chain of symbol IDs explaining why this entity is affected",
    )
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class BlastRadiusReport(BaseModel):
    """Complete impact analysis report calculated for a set of changed symbols."""
    changed_symbol_ids: List[str] = Field(default_factory=list)
    direct_impact_count: int = 0
    transitive_impact_count: int = 0
    total_impacted_count: int = 0
    max_depth_reached: int = 0
    impacted_entities: List[ImpactedEntity] = Field(default_factory=list)
    subgraph_nodes: List[GraphNode] = Field(
        default_factory=list,
        description="Focused set of nodes relevant to the blast radius for UI visualization",
    )
    subgraph_edges: List[GraphEdge] = Field(
        default_factory=list,
        description="Focused set of edges tracing the blast radius for UI visualization",
    )
    unresolved_calls: List[str] = Field(
        default_factory=list,
        description="Function calls that could not be statically resolved to a known symbol",
    )


class BuildGraphRequest(BaseModel):
    """Request payload to construct a repository dependency graph."""
    files: Dict[str, str] = Field(
        ...,
        description="Map of relative file paths to source code contents",
    )


class BlastRadiusRequest(BaseModel):
    """Request payload to compute blast radius from changed symbols."""
    files: Dict[str, str] = Field(..., description="Repository files dictionary")
    changed_symbol_ids: List[str] = Field(
        ...,
        description="List of entity IDs directly changed in the commit/PR",
    )
    max_depth: int = Field(default=10, ge=1, le=25)
