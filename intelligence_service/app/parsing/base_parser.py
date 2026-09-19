"""Abstract base parser interface for AST extractors."""
from abc import ABC, abstractmethod
from typing import Optional
from app.models.ast_models import ASTFileAnalysis, SymbolLocation
from tree_sitter import Node


class BaseASTParser(ABC):
    """Base class for language-specific AST intelligence parsers."""

    @abstractmethod
    def parse_source(self, file_path: str, code: str) -> ASTFileAnalysis:
        """Parses source code text and returns extracted entities, imports, and calls."""
        pass

    @staticmethod
    def node_to_location(node: Node) -> SymbolLocation:
        """Extracts 1-indexed line numbers and offsets from a Tree-sitter AST Node."""
        return SymbolLocation(
            start_line=node.start_point.row + 1,
            end_line=node.end_point.row + 1,
            start_col=node.start_point.column,
            end_col=node.end_point.column,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
        )

    @staticmethod
    def get_node_text(node: Optional[Node], source_bytes: bytes) -> str:
        """Safely extracts UTF-8 text represented by a syntax node."""
        if node is None:
            return ""
        return source_bytes[node.start_byte : node.end_byte].decode("utf-8", errors="replace")
