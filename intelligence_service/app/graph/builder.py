"""Dependency Graph Builder.

Constructs a hierarchical bidirectional NetworkX DiGraph by resolving imports,
module references, and symbol-level function/method calls across repository files.
"""
import os
import posixpath
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
import networkx as nx

from app.models.ast_models import ASTFileAnalysis, CodeEntity, EntityType
from app.models.graph_models import (
    GraphNode,
    GraphEdge,
    RelationType,
)
from app.parsing.parser_factory import ParserFactory
from app.core.logging import get_logger

logger = get_logger("graph_builder")


class DependencyGraphBuilder:
    """Builds a NetworkX DiGraph representing repository entities and dependencies."""

    def __init__(self):
        self.graph = nx.DiGraph()
        self.analyses_by_path: Dict[str, ASTFileAnalysis] = {}
        # Map: (normalized_file_stem, exported_name) -> entity_id
        self.export_index: Dict[Tuple[str, str], str] = {}
        # Map: file_path -> List[entity_id]
        self.file_entities: Dict[str, List[str]] = {}
        # Unresolved calls
        self.unresolved_calls: List[str] = []

    def build_from_files(self, files: Dict[str, str]) -> nx.DiGraph:
        """Parses all files with AST extractors and constructs the full dependency graph."""
        self.graph.clear()
        self.analyses_by_path.clear()
        self.export_index.clear()
        self.file_entities.clear()
        self.unresolved_calls.clear()

        # Step 1: Parse all files into AST analyses
        for file_path, content in files.items():
            parser = ParserFactory.get_parser_for_file(file_path)
            if parser:
                norm_path = self._normalize_path(file_path)
                try:
                    analysis = parser.parse_source(norm_path, content)
                    self.analyses_by_path[norm_path] = analysis
                except Exception as e:
                    logger.warning(f"Failed to parse {file_path} during graph build: {e}")

        # Step 2: Index nodes and exported symbols
        for norm_path, analysis in self.analyses_by_path.items():
            self._register_file_node(norm_path)
            for entity in analysis.entities:
                self._register_entity_node(entity)
                # Index exports
                stem = self._get_path_stem(norm_path)
                if entity.is_exported:
                    self.export_index[(stem, entity.name)] = entity.id
                    self.export_index[(norm_path, entity.name)] = entity.id

                # Index method under class
                if entity.entity_type == EntityType.METHOD and entity.parent_name:
                    self.export_index[(stem, f"{entity.parent_name}.{entity.name}")] = entity.id
                    self.export_index[(norm_path, f"{entity.parent_name}.{entity.name}")] = entity.id

        # Step 3: Wire import edges and resolve cross-file calls
        for norm_path, analysis in self.analyses_by_path.items():
            file_node_id = f"file:{norm_path}"

            # Process imports
            imported_file_map: Dict[str, str] = {}  # imported_symbol_name -> target_file_path
            for imp in analysis.imports:
                target_file = self._resolve_import_target(norm_path, imp.source_module, list(self.analyses_by_path.keys()))
                if target_file:
                    target_file_node_id = f"file:{target_file}"
                    self.graph.add_edge(
                        file_node_id,
                        target_file_node_id,
                        relation_type=RelationType.IMPORTS,
                        confidence=1.0,
                        is_dynamic=False,
                    )
                    for name in imp.imported_names:
                        imported_file_map[name] = target_file
                        # If aliased, map the alias as well
                        if name in imp.alias_map:
                            imported_file_map[imp.alias_map[name]] = target_file

            # Process entity calls
            for entity in analysis.entities:
                for call in entity.calls:
                    target_entity_id, conf, is_dyn = self._resolve_call(
                        caller_entity=entity,
                        target_name=call.target_name,
                        receiver_name=call.receiver_name,
                        imported_file_map=imported_file_map,
                        current_file=norm_path,
                    )

                    if target_entity_id:
                        self.graph.add_edge(
                            entity.id,
                            target_entity_id,
                            relation_type=RelationType.CALLS,
                            confidence=conf,
                            is_dynamic=is_dyn,
                        )
                    else:
                        self.unresolved_calls.append(f"{entity.id} -> {call.target_name}")

        logger.info(
            f"Built dependency graph: {self.graph.number_of_nodes()} nodes, "
            f"{self.graph.number_of_edges()} edges"
        )
        return self.graph

    def _register_file_node(self, file_path: str):
        node_id = f"file:{file_path}"
        self.graph.add_node(
            node_id,
            label=os.path.basename(file_path),
            file_path=file_path,
            entity_type=EntityType.FILE.value,
            is_exported=True,
            metadata={"kind": "file"},
        )
        self.file_entities[file_path] = []

    def _register_entity_node(self, entity: CodeEntity):
        file_node_id = f"file:{entity.file_path}"
        self.graph.add_node(
            entity.id,
            label=entity.qualified_name,
            file_path=entity.file_path,
            entity_type=entity.entity_type.value,
            is_exported=entity.is_exported,
            metadata={"signature": entity.signature or ""},
        )
        self.file_entities[entity.file_path].append(entity.id)

        # Connect File -> Top-level entity or Parent -> Child entity
        if entity.parent_name:
            parent_id = f"{entity.file_path}::{entity.parent_name}"
            if self.graph.has_node(parent_id):
                self.graph.add_edge(
                    parent_id,
                    entity.id,
                    relation_type=RelationType.DEFINES,
                    confidence=1.0,
                    is_dynamic=False,
                )
            else:
                self.graph.add_edge(
                    file_node_id,
                    entity.id,
                    relation_type=RelationType.DEFINES,
                    confidence=1.0,
                    is_dynamic=False,
                )
        else:
            self.graph.add_edge(
                file_node_id,
                entity.id,
                relation_type=RelationType.DEFINES,
                confidence=1.0,
                is_dynamic=False,
            )

    def _resolve_call(
        self,
        caller_entity: CodeEntity,
        target_name: str,
        receiver_name: Optional[str],
        imported_file_map: Dict[str, str],
        current_file: str,
    ) -> Tuple[Optional[str], float, bool]:
        """Resolves a call target to its target entity ID with confidence score."""
        current_stem = self._get_path_stem(current_file)

        # 1. Local resolution (same class method or same file function)
        if caller_entity.parent_name:
            local_method_id = f"{current_file}::{caller_entity.parent_name}.{target_name}"
            if self.graph.has_node(local_method_id):
                return local_method_id, 1.0, False

        local_func_id = f"{current_file}::{target_name}"
        if self.graph.has_node(local_func_id):
            return local_func_id, 1.0, False

        # 2. Check imported symbols directly
        if target_name in imported_file_map:
            target_file = imported_file_map[target_name]
            target_id = f"{target_file}::{target_name}"
            if self.graph.has_node(target_id):
                return target_id, 1.0, False

        # 3. Check methods on imported classes (e.g. this.paymentService.processTransaction())
        # Search among files imported by this module
        for imp_symbol, target_file in imported_file_map.items():
            target_stem = self._get_path_stem(target_file)
            # Check (target_stem, f"{imp_symbol}.{target_name}")
            compound_key = (target_stem, f"{imp_symbol}.{target_name}")
            if compound_key in self.export_index:
                return self.export_index[compound_key], 1.0, False

            # Also check direct method match in target file
            direct_method_key = f"{target_file}::{imp_symbol}.{target_name}"
            if self.graph.has_node(direct_method_key):
                return direct_method_key, 1.0, False

            # Check if any class in the imported target file has this method
            target_analysis = self.analyses_by_path.get(target_file)
            if target_analysis:
                for ent in target_analysis.entities:
                    if ent.entity_type == EntityType.METHOD and ent.name == target_name:
                        return ent.id, 0.95, False

        # 4. Global unique symbol match (Heuristic fallback with reduced confidence)
        matches = []
        for (stem, sym), ent_id in self.export_index.items():
            if sym == target_name or sym.endswith(f".{target_name}"):
                matches.append(ent_id)

        if len(matches) == 1:
            return matches[0], 0.75, True

        return None, 0.0, False

    def _resolve_import_target(
        self,
        importer_path: str,
        source_module: str,
        available_files: List[str],
    ) -> Optional[str]:
        """Resolves an import source string to an actual file path in the repository."""
        # Handle relative imports (e.g. "./payment_service.js" or "../utils/math")
        if source_module.startswith("."):
            importer_dir = posixpath.dirname(importer_path)
            raw_target = posixpath.normpath(posixpath.join(importer_dir, source_module))
            target_stem = self._strip_ext(raw_target)

            for cand in available_files:
                cand_stem = self._strip_ext(cand)
                if cand_stem == target_stem:
                    return cand

        # Handle Python dotted imports (e.g. "app.services.payment_service")
        as_path = source_module.replace(".", "/")
        for cand in available_files:
            cand_stem = self._strip_ext(cand)
            if cand_stem == as_path or cand_stem.endswith("/" + as_path):
                return cand

        # Simple file name match
        base_name = posixpath.basename(source_module)
        base_stem = self._strip_ext(base_name)
        for cand in available_files:
            cand_base_stem = self._strip_ext(posixpath.basename(cand))
            if cand_base_stem == base_stem:
                return cand

        return None

    @staticmethod
    def _normalize_path(p: str) -> str:
        return p.replace("\\", "/").lstrip("/")

    @staticmethod
    def _get_path_stem(p: str) -> str:
        base = posixpath.basename(p)
        return DependencyGraphBuilder._strip_ext(base)

    @staticmethod
    def _strip_ext(p: str) -> str:
        for ext in (".ts", ".tsx", ".js", ".jsx", ".py"):
            if p.endswith(ext):
                return p[: -len(ext)]
        return p
