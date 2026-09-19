"""Data models for AST code intelligence, symbol extraction, and diff-to-symbol mapping."""
from enum import Enum
from typing import List, Optional, Dict, Tuple
from pydantic import BaseModel, Field


class EntityType(str, Enum):
    """Classification of code entities."""
    FILE = "FILE"
    MODULE = "MODULE"
    CLASS = "CLASS"
    INTERFACE = "INTERFACE"
    TYPE_ALIAS = "TYPE_ALIAS"
    FUNCTION = "FUNCTION"
    METHOD = "METHOD"
    VARIABLE = "VARIABLE"


class SymbolLocation(BaseModel):
    """Exact source code boundaries for an AST entity."""
    start_line: int = Field(..., description="1-indexed starting line")
    end_line: int = Field(..., description="1-indexed ending line (inclusive)")
    start_col: int = Field(..., description="0-indexed start column")
    end_col: int = Field(..., description="0-indexed end column")
    start_byte: int = Field(default=0)
    end_byte: int = Field(default=0)

    def contains_line(self, line_no: int) -> bool:
        """Checks if a 1-indexed line number falls within this symbol's span."""
        return self.start_line <= line_no <= self.end_line

    def intersects_lines(self, lines: List[int]) -> List[int]:
        """Returns the subset of given lines that fall inside this symbol."""
        return [l for l in lines if self.contains_line(l)]


class FunctionCall(BaseModel):
    """An explicit function or method invocation detected in code."""
    target_name: str
    caller_entity_id: Optional[str] = None
    line_no: int
    is_method_call: bool = False
    receiver_name: Optional[str] = None  # e.g. 'self' or 'paymentService'


class ImportStatement(BaseModel):
    """Structured representation of an import declaration."""
    source_module: str  # e.g. './payment_service.js' or 'fastapi'
    imported_names: List[str] = Field(default_factory=list)  # e.g. ['PaymentService', 'PaymentResult']
    alias_map: Dict[str, str] = Field(default_factory=dict)  # e.g. {'PaymentService': 'PS'}
    is_default: bool = False
    is_wildcard: bool = False
    line_no: int = 1


class CodeEntity(BaseModel):
    """A high-level structural code entity extracted via AST."""
    id: str = Field(..., description="Unique deterministic identifier (e.g. 'src/foo.ts::Class.method')")
    file_path: str
    entity_type: EntityType
    name: str
    qualified_name: str
    parent_name: Optional[str] = None
    location: SymbolLocation
    signature_span: Optional[Tuple[int, int]] = Field(
        default=None, 
        description="Line range [start, end] representing solely the signature/header declaration"
    )
    body_span: Optional[Tuple[int, int]] = Field(
        default=None,
        description="Line range [start, end] representing the entity implementation body"
    )
    signature: Optional[str] = None
    is_exported: bool = False
    docstring: Optional[str] = None
    parameters: List[str] = Field(default_factory=list)
    return_type: Optional[str] = None
    calls: List[FunctionCall] = Field(default_factory=list)


class ASTFileAnalysis(BaseModel):
    """Aggregated structural extraction from a single source file."""
    file_path: str
    language: str
    entities: List[CodeEntity] = Field(default_factory=list)
    imports: List[ImportStatement] = Field(default_factory=list)
    exports: List[str] = Field(default_factory=list)
    parse_errors: List[str] = Field(default_factory=list)


class ChangeNature(str, Enum):
    """Classification of the nature of modification to a code symbol."""
    SIGNATURE_MODIFIED = "SIGNATURE_MODIFIED"  # High risk: parameter, return type, or modifier changed
    BODY_MODIFIED = "BODY_MODIFIED"            # Implementation logic changed, public interface intact
    ADDED = "ADDED"                            # Brand new symbol introduced
    DELETED = "DELETED"                        # Symbol removed (potential breaking change)
    STRUCTURAL = "STRUCTURAL"                  # Indentation, comments, or decorators touched


class ChangedSymbol(BaseModel):
    """A code entity identified as directly modified by a Git diff."""
    entity_id: str
    qualified_name: str
    entity_type: EntityType
    file_path: str
    change_nature: ChangeNature
    is_exported: bool
    is_breaking_candidate: bool = False
    diff_lines_intersected: List[int] = Field(default_factory=list)
    location: SymbolLocation


class DiffToASTResult(BaseModel):
    """Complete mapping of a Git diff to changed AST symbols."""
    total_changed_symbols: int = 0
    breaking_candidates_count: int = 0
    changed_symbols: List[ChangedSymbol] = Field(default_factory=list)
    unmapped_lines_by_file: Dict[str, List[int]] = Field(
        default_factory=dict,
        description="Diff lines that modified file preamble, top-level comments, or configuration"
    )
