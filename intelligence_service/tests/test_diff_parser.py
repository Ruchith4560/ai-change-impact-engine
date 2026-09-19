"""Unit tests for the UnifiedDiffParser and diff API endpoint."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.git.diff_parser import UnifiedDiffParser
from app.models.diff_models import ChangeType, LineChangeType

SAMPLE_PYTHON_DIFF = """diff --git a/src/payment_service.py b/src/payment_service.py
index 1234567..89abcde 100644
--- a/src/payment_service.py
+++ b/src/payment_service.py
@@ -10,6 +10,8 @@ def initialize_gateway():
     return StripeClient()
 
-def process_transaction(order_id: str, amount: float):
+def process_transaction(order_id: str, amount: float, currency: str = "USD"):
+    validate_currency(currency)
     gateway = initialize_gateway()
-    return gateway.charge(order_id, amount)
+    return gateway.charge(order_id, amount, currency)
"""

SAMPLE_NEW_FILE_DIFF = """diff --git a/src/currency_validator.py b/src/currency_validator.py
new file mode 100644
index 0000000..abcdef1
--- /dev/null
+++ b/src/currency_validator.py
@@ -0,0 +1,5 @@
+SUPPORTED = ["USD", "EUR", "GBP"]
+
+def validate_currency(curr: str) -> bool:
+    return curr in SUPPORTED
+
"""

SAMPLE_DELETED_FILE_DIFF = """diff --git a/src/legacy_billing.py b/src/legacy_billing.py
deleted file mode 100644
index abcdef1..0000000
--- a/src/legacy_billing.py
+++ /dev/null
@@ -1,2 +0,0 @@
-def old_charge():
-    pass
"""

SAMPLE_RENAMED_FILE_DIFF = """diff --git a/src/old_name.ts b/src/new_name.ts
similarity index 95%
rename from src/old_name.ts
rename to src/new_name.ts
index 1111111..2222222 100644
--- a/src/old_name.ts
+++ b/src/new_name.ts
@@ -1,3 +1,3 @@
 export function helper() {
-  return 1;
+  return 2;
 }
"""


def test_parse_empty_diff():
    res = UnifiedDiffParser.parse("")
    assert res.total_files_changed == 0
    assert len(res.files) == 0


def test_parse_standard_modification():
    res = UnifiedDiffParser.parse(SAMPLE_PYTHON_DIFF)
    assert res.total_files_changed == 1
    file = res.files[0]

    assert file.new_path == "src/payment_service.py"
    assert file.change_type == ChangeType.MODIFIED
    assert not file.is_binary
    assert file.is_supported_language is True
    assert file.extension == ".py"

    # Additions: 3 lines added, 2 lines deleted
    assert file.additions == 3
    assert file.deletions == 2
    assert len(file.hunks) == 1

    hunk = file.hunks[0]
    assert hunk.old_start == 10
    assert hunk.old_lines == 6
    assert hunk.new_start == 10
    assert hunk.new_lines == 8

    # Verify line numbers of additions
    assert len(hunk.modified_new_lines) == 3
    assert len(hunk.modified_old_lines) == 2


def test_parse_new_file():
    res = UnifiedDiffParser.parse(SAMPLE_NEW_FILE_DIFF)
    assert res.total_files_changed == 1
    file = res.files[0]

    assert file.new_path == "src/currency_validator.py"
    assert file.old_path is None
    assert file.change_type == ChangeType.ADDED
    assert file.additions == 5
    assert file.deletions == 0
    assert len(file.hunks) == 1
    assert file.hunks[0].modified_new_lines == [1, 2, 3, 4, 5]


def test_parse_deleted_file():
    res = UnifiedDiffParser.parse(SAMPLE_DELETED_FILE_DIFF)
    assert res.total_files_changed == 1
    file = res.files[0]

    assert file.change_type == ChangeType.DELETED
    assert file.additions == 0
    assert file.deletions == 2


def test_parse_renamed_file():
    res = UnifiedDiffParser.parse(SAMPLE_RENAMED_FILE_DIFF)
    assert res.total_files_changed == 1
    file = res.files[0]

    assert file.change_type == ChangeType.RENAMED
    assert file.old_path == "src/old_name.ts"
    assert file.new_path == "src/new_name.ts"
    assert file.additions == 1
    assert file.deletions == 1


@pytest.mark.anyio
async def test_api_parse_diff_endpoint():
    """Test the POST /api/v1/diff/parse HTTP route."""
    combined_diff = f"{SAMPLE_PYTHON_DIFF}\n{SAMPLE_NEW_FILE_DIFF}"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/diff/parse",
            json={"raw_diff": combined_diff},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_files_changed"] == 2
        assert data["total_additions"] == 8
        assert data["total_deletions"] == 2
        assert len(data["files"]) == 2
