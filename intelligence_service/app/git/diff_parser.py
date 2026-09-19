"""Production-grade Unified Git Diff Parser.

Converts standard git diff / patch text into structured ChangedFile and DiffHunk entities
with precise line-number accounting for downstream AST symbol intersection.
"""
import re
from typing import List, Optional, Tuple
from app.models.diff_models import (
    ChangeType,
    LineChangeType,
    ChangedLine,
    DiffHunk,
    ChangedFile,
    DiffAnalysisResult,
)
from app.core.logging import get_logger

logger = get_logger("diff_parser")

# Regex patterns for diff markers
DIFF_FILE_HEADER = re.compile(r"^diff --git a/(.*?) b/(.*?)$")
HUNK_HEADER = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$")
BINARY_FILE = re.compile(r"^Binary files (?:a/.*|/dev/null) and (?:b/.*|/dev/null) differ$")
RENAME_FROM = re.compile(r"^rename from (.*)$")
RENAME_TO = re.compile(r"^rename to (.*)$")
NEW_FILE_MODE = re.compile(r"^new file mode \d+$")
DELETED_FILE_MODE = re.compile(r"^deleted file mode \d+$")


class UnifiedDiffParser:
    """Parses standard unified git diffs into structured domain models."""

    @classmethod
    def parse(cls, raw_diff: str) -> DiffAnalysisResult:
        """Parses a complete git diff string into a DiffAnalysisResult."""
        if not raw_diff or not raw_diff.strip():
            return DiffAnalysisResult()

        lines = raw_diff.splitlines()
        
        # Fallback for unified diffs missing "diff --git a/... b/..." headers
        if not any(line.startswith("diff --git") for line in lines):
            synthesized: List[str] = []
            j = 0
            while j < len(lines):
                line = lines[j]
                if line.startswith("--- ") and j + 1 < len(lines) and lines[j + 1].startswith("+++ "):
                    old_p = line[4:].strip()
                    new_p = lines[j + 1][4:].strip()
                    old_clean = old_p[2:] if old_p.startswith("a/") else old_p
                    new_clean = new_p[2:] if new_p.startswith("b/") else new_p
                    if old_clean == "/dev/null":
                        old_clean = new_clean
                    if new_clean == "/dev/null":
                        new_clean = old_clean
                    synthesized.append(f"diff --git a/{old_clean} b/{new_clean}")
                synthesized.append(line)
                j += 1
            lines = synthesized

        changed_files: List[ChangedFile] = []
        
        i = 0
        n = len(lines)

        while i < n:
            line = lines[i]

            # Look for file boundary: "diff --git a/... b/..."
            match = DIFF_FILE_HEADER.match(line)
            if match:
                file_lines: List[str] = [line]
                i += 1
                # Collect all lines until the next file boundary
                while i < n and not DIFF_FILE_HEADER.match(lines[i]):
                    file_lines.append(lines[i])
                    i += 1
                
                parsed_file = cls._parse_single_file_diff(file_lines)
                if parsed_file:
                    changed_files.append(parsed_file)
            else:
                # If there's preamble or unstructured lines before the first diff header
                i += 1

        total_adds = sum(f.additions for f in changed_files)
        total_dels = sum(f.deletions for f in changed_files)

        return DiffAnalysisResult(
            total_files_changed=len(changed_files),
            total_additions=total_adds,
            total_deletions=total_dels,
            files=changed_files,
        )

    @classmethod
    def _parse_single_file_diff(cls, lines: List[str]) -> Optional[ChangedFile]:
        """Parses the diff section for a single file."""
        if not lines:
            return None

        header_match = DIFF_FILE_HEADER.match(lines[0])
        if not header_match:
            return None

        old_path_raw = header_match.group(1)
        new_path_raw = header_match.group(2)

        old_path = old_path_raw
        new_path = new_path_raw
        change_type = ChangeType.MODIFIED
        is_binary = False

        hunk_start_idx = -1

        # Scan file metadata lines
        for idx in range(1, len(lines)):
            curr = lines[idx]
            if HUNK_HEADER.match(curr):
                hunk_start_idx = idx
                break
            elif BINARY_FILE.match(curr):
                is_binary = True
            elif NEW_FILE_MODE.match(curr):
                change_type = ChangeType.ADDED
                old_path = None
            elif DELETED_FILE_MODE.match(curr):
                change_type = ChangeType.DELETED
                new_path = old_path
            elif RENAME_FROM.match(curr):
                change_type = ChangeType.RENAMED
                old_path = RENAME_FROM.match(curr).group(1)
            elif RENAME_TO.match(curr):
                change_type = ChangeType.RENAMED
                new_path = RENAME_TO.match(curr).group(1)
            elif curr.startswith("--- /dev/null"):
                change_type = ChangeType.ADDED
                old_path = None
            elif curr.startswith("+++ /dev/null"):
                change_type = ChangeType.DELETED

        hunks: List[DiffHunk] = []
        total_adds = 0
        total_dels = 0

        if hunk_start_idx != -1 and not is_binary:
            hunk_lines_chunk: List[str] = []
            for line_idx in range(hunk_start_idx, len(lines)):
                curr_line = lines[line_idx]
                if HUNK_HEADER.match(curr_line) and hunk_lines_chunk:
                    # Flush previous hunk
                    hunk = cls._parse_hunk(hunk_lines_chunk)
                    if hunk:
                        hunks.append(hunk)
                    hunk_lines_chunk = [curr_line]
                else:
                    hunk_lines_chunk.append(curr_line)

            if hunk_lines_chunk:
                hunk = cls._parse_hunk(hunk_lines_chunk)
                if hunk:
                    hunks.append(hunk)

            for h in hunks:
                for line in h.lines:
                    if line.change_type == LineChangeType.ADD:
                        total_adds += 1
                    elif line.change_type == LineChangeType.DELETE:
                        total_dels += 1

        return ChangedFile(
            old_path=old_path,
            new_path=new_path,
            change_type=change_type,
            is_binary=is_binary,
            additions=total_adds,
            deletions=total_dels,
            hunks=hunks,
        )

    @classmethod
    def _parse_hunk(cls, hunk_lines: List[str]) -> Optional[DiffHunk]:
        """Parses a single hunk with line number tracking."""
        if not hunk_lines:
            return None

        header_line = hunk_lines[0]
        match = HUNK_HEADER.match(header_line)
        if not match:
            return None

        old_start = int(match.group(1))
        old_lines = int(match.group(2)) if match.group(2) is not None else 1
        new_start = int(match.group(3))
        new_lines = int(match.group(4)) if match.group(4) is not None else 1

        curr_old = old_start
        curr_new = new_start

        parsed_lines: List[ChangedLine] = []
        modified_new_lines: List[int] = []
        modified_old_lines: List[int] = []

        for raw_line in hunk_lines[1:]:
            if not raw_line:
                # Empty line in unified diff represents empty context line
                parsed_lines.append(
                    ChangedLine(
                        old_line_no=curr_old,
                        new_line_no=curr_new,
                        change_type=LineChangeType.CONTEXT,
                        content="",
                    )
                )
                curr_old += 1
                curr_new += 1
                continue

            prefix = raw_line[0]
            content = raw_line[1:]

            if prefix == "+":
                parsed_lines.append(
                    ChangedLine(
                        old_line_no=None,
                        new_line_no=curr_new,
                        change_type=LineChangeType.ADD,
                        content=content,
                    )
                )
                modified_new_lines.append(curr_new)
                curr_new += 1
            elif prefix == "-":
                parsed_lines.append(
                    ChangedLine(
                        old_line_no=curr_old,
                        new_line_no=None,
                        change_type=LineChangeType.DELETE,
                        content=content,
                    )
                )
                modified_old_lines.append(curr_old)
                curr_old += 1
            elif prefix == " ":
                parsed_lines.append(
                    ChangedLine(
                        old_line_no=curr_old,
                        new_line_no=curr_new,
                        change_type=LineChangeType.CONTEXT,
                        content=content,
                    )
                )
                curr_old += 1
                curr_new += 1
            elif prefix == "\\":
                # Special git line, e.g. "\ No newline at end of file"
                continue
            else:
                # Default context if standard prefix is absent
                parsed_lines.append(
                    ChangedLine(
                        old_line_no=curr_old,
                        new_line_no=curr_new,
                        change_type=LineChangeType.CONTEXT,
                        content=raw_line,
                    )
                )
                curr_old += 1
                curr_new += 1

        return DiffHunk(
            old_start=old_start,
            old_lines=old_lines,
            new_start=new_start,
            new_lines=new_lines,
            header=header_line,
            lines=parsed_lines,
            modified_new_lines=modified_new_lines,
            modified_old_lines=modified_old_lines,
        )
