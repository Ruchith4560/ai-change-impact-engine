"""Unit tests for Git history and co-change mining."""
from app.history.cochange_miner import GitHistoryMiner, CommitRecord


def test_shallow_history():
    # Fewer than 5 commits should report unavailable
    commits = [
        CommitRecord("c1", "initial commit", ["src/a.ts"]),
        CommitRecord("c2", "second commit", ["src/b.ts"]),
    ]
    res = GitHistoryMiner.analyze_history(commits, ["src/a.ts"])
    assert res.is_available is False
    assert "Insufficient" in (res.unavailability_reason or "")


def test_cochange_and_bugfix_mining():
    commits = [
        CommitRecord("c1", "feat: add user billing", ["src/payment.py", "src/billing.py"]),
        CommitRecord("c2", "fix: resolve currency rounding bug in payment", ["src/payment.py", "tests/test_payment.py"]),
        CommitRecord("c3", "fix: patch checkout calculation defect", ["src/payment.py", "src/checkout.py"]),
        CommitRecord("c4", "refactor: simplify database layer", ["src/db.py"]),
        CommitRecord("c5", "fix: hotfix payment race condition", ["src/payment.py", "src/checkout.py"]),
        CommitRecord("c6", "docs: update readme", ["README.md"]),
    ]

    res = GitHistoryMiner.analyze_history(commits, ["src/payment.py"])
    assert res.is_available is True
    assert res.commits_analyzed == 6
    # 3 commits touching payment were bugfixes (c2, c3, c5)
    assert res.recent_bugfixes_count == 3

    # Co-change check: checkout.py co-occurred in c3 and c5 (2 out of 4 commits touching payment = 50%)
    assert "src/payment.py" in res.co_changed_files
    co_files = res.co_changed_files["src/payment.py"]
    assert "src/checkout.py" in co_files
