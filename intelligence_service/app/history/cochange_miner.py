"""Git Repository Commit Miner and Co-Change Analyzer.

Mines Git commit history for logical coupling (files that frequently change together)
and historical bugfix / regression churn.
"""
import re
from typing import List, Dict, Set, Tuple
from collections import defaultdict
from app.models.risk_models import HistoricalSignal
from app.core.logging import get_logger

logger = get_logger("history_miner")

BUGFIX_PATTERN = re.compile(
    r"\b(fix|bug|patch|resolve|resolves|resolved|defect|regression|hotfix)\b",
    re.IGNORECASE,
)


class CommitRecord:
    """Lightweight representation of a Git commit."""
    def __init__(self, commit_hash: str, message: str, files_touched: List[str]):
        self.commit_hash = commit_hash
        self.message = message
        self.files_touched = set(files_touched)

    @property
    def is_bugfix(self) -> bool:
        return bool(BUGFIX_PATTERN.search(self.message))


class GitHistoryMiner:
    """Analyzes commit history for co-change frequencies and defect density."""

    @classmethod
    def analyze_history(
        cls,
        commits: List[CommitRecord],
        target_files: List[str],
        min_support_ratio: float = 0.25,
        min_co_commits: int = 2,
    ) -> HistoricalSignal:
        """Computes co-change couplings and bugfix density for a set of target files."""
        if len(commits) < 5:
            return HistoricalSignal(
                is_available=False,
                commits_analyzed=len(commits),
                unavailability_reason="Insufficient commit history (< 5 commits)",
            )

        target_set = set(target_files)
        file_commit_counts: Dict[str, int] = defaultdict(int)
        co_commit_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        recent_bugfixes_count = 0

        for commit in commits:
            # Check if this commit touches any target file
            intersection = commit.files_touched.intersection(target_set)
            if intersection and commit.is_bugfix:
                recent_bugfixes_count += 1

            for f in commit.files_touched:
                file_commit_counts[f] += 1

            # Count co-occurrences for each target file
            for tf in intersection:
                for other_file in commit.files_touched:
                    if other_file != tf:
                        co_commit_counts[tf][other_file] += 1

        # Identify files with high churn (> 30% of commits)
        high_churn = [
            f for f, count in file_commit_counts.items()
            if (count / len(commits)) >= 0.30 and f in target_set
        ]

        # Extract co-changed files exceeding support threshold
        co_changed_map: Dict[str, List[str]] = {}
        for tf in target_files:
            tf_commits = file_commit_counts.get(tf, 0)
            if tf_commits == 0:
                continue

            candidates = []
            for other_file, count in co_commit_counts[tf].items():
                if count >= min_co_commits:
                    support_ratio = count / tf_commits
                    if support_ratio >= min_support_ratio:
                        candidates.append((other_file, support_ratio))

            # Sort by highest support
            candidates.sort(key=lambda x: x[1], reverse=True)
            if candidates:
                co_changed_map[tf] = [f for f, _ in candidates]

        logger.info(
            f"Mined history across {len(commits)} commits: {recent_bugfixes_count} bugfixes, "
            f"{len(co_changed_map)} files with co-change coupling."
        )

        return HistoricalSignal(
            is_available=True,
            commits_analyzed=len(commits),
            recent_bugfixes_count=recent_bugfixes_count,
            high_churn_files=high_churn,
            co_changed_files=co_changed_map,
        )
