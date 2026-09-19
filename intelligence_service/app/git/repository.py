"""Git repository management and diff execution."""
import os
import subprocess
from pathlib import Path
from typing import Optional, List, Tuple
from app.core.logging import get_logger
from app.git.diff_parser import UnifiedDiffParser
from app.models.diff_models import DiffAnalysisResult

logger = get_logger("repository_ops")


class GitRepositoryManager:
    """Provides local and remote git operations with security controls."""

    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
        if not self.repo_path.exists():
            raise FileNotFoundError(f"Repository path does not exist: {repo_path}")

    def run_git(self, args: List[str], timeout: int = 30) -> subprocess.CompletedProcess:
        """Executes a git command inside the target repo with timeout and error handling."""
        cmd = ["git"] + args
        try:
            result = subprocess.run(
                cmd,
                cwd=str(self.repo_path),
                capture_output=True,
                text=True,
                check=True,
                timeout=timeout,
            )
            return result
        except subprocess.CalledProcessError as e:
            logger.error(f"Git command failed: {' '.join(cmd)} - Error: {e.stderr.strip()}")
            raise RuntimeError(f"Git operation failed: {e.stderr.strip()}") from e
        except subprocess.TimeoutExpired as e:
            logger.error(f"Git command timed out: {' '.join(cmd)}")
            raise TimeoutError(f"Git operation timed out after {timeout} seconds") from e

    def get_commit_diff(self, base_sha: str, head_sha: str) -> str:
        """Extracts the unified diff between two commit SHAs."""
        res = self.run_git(["diff", "-U3", f"{base_sha}...{head_sha}"])
        return res.stdout

    def get_working_tree_diff(self, base_sha: Optional[str] = None) -> str:
        """Extracts the working tree diff (or diff against a base commit)."""
        args = ["diff", "-U3"]
        if base_sha:
            args.append(base_sha)
        res = self.run_git(args)
        return res.stdout

    def parse_commit_diff(self, base_sha: str, head_sha: str) -> DiffAnalysisResult:
        """Fetches and parses the commit diff into structured ChangedFiles and Hunks."""
        raw_diff = self.get_commit_diff(base_sha, head_sha)
        return UnifiedDiffParser.parse(raw_diff)

    def get_commit_history(self, limit: int = 50) -> List[Tuple[str, str, str]]:
        """Returns list of (commit_sha, author, commit_message) tuples."""
        res = self.run_git(["log", f"-n{limit}", "--pretty=format:%H|%an|%s"])
        history = []
        for line in res.stdout.splitlines():
            if not line.strip():
                continue
            parts = line.split("|", 2)
            if len(parts) == 3:
                history.append((parts[0], parts[1], parts[2]))
        return history
