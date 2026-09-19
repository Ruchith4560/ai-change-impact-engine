"""Pydantic data models for Git diffs, hunks, and changed code regions."""
from enum import Enum
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field


class ChangeType(str, Enum):
    """Classification of file modifications."""
    ADDED = "ADDED"
    MODIFIED = "MODIFIED"
    DELETED = "DELETED"
    RENAMED = "RENAMED"


class LineChangeType(str, Enum):
    """Classification of individual diff lines."""
    ADD = "ADD"
    DELETE = "DELETE"
    CONTEXT = "CONTEXT"


class ChangedLine(BaseModel):
    """A single line inside a unified diff hunk."""
    old_line_no: Optional[int] = None
    new_line_no: Optional[int] = None
    change_type: LineChangeType
    content: str


class DiffHunk(BaseModel):
    """A contiguous hunk of changes within a file diff."""
    old_start: int
    old_lines: int
    new_start: int
    new_lines: int
    header: str
    lines: List[ChangedLine] = Field(default_factory=list)
    modified_new_lines: List[int] = Field(
        default_factory=list,
        description="Explicit list of 1-indexed line numbers modified/added in the head version."
    )
    modified_old_lines: List[int] = Field(
        default_factory=list,
        description="Explicit list of 1-indexed line numbers modified/deleted in the base version."
    )


class ChangedFile(BaseModel):
    """A file modified in a Git commit or Pull Request."""
    old_path: Optional[str] = None
    new_path: str
    change_type: ChangeType
    is_binary: bool = False
    additions: int = 0
    deletions: int = 0
    hunks: List[DiffHunk] = Field(default_factory=list)

    @property
    def extension(self) -> str:
        """Extracts file extension (e.g. '.py', '.ts', '.tsx')."""
        if "." in self.new_path:
            return "." + self.new_path.rsplit(".", 1)[-1].lower()
        return ""

    @property
    def is_supported_language(self) -> bool:
        """Checks if file is within the initial AST scope (Python, TS, JS)."""
        return self.extension in {".py", ".ts", ".tsx", ".js", ".jsx"}


class DiffAnalysisResult(BaseModel):
    """Aggregated result of parsing a full unified Git diff."""
    total_files_changed: int = 0
    total_additions: int = 0
    total_deletions: int = 0
    files: List[ChangedFile] = Field(default_factory=list)


class ParseDiffRequest(BaseModel):
    """Request payload to parse raw unified diff text."""
    raw_diff: str = Field(..., description="Standard unified git diff text")
    repository_id: Optional[str] = None
    base_sha: Optional[str] = None
    head_sha: Optional[str] = None
