"""Unit tests for Python AST intelligence parser."""
import pytest
from app.parsing.python_ast_parser import PythonASTParser
from app.models.ast_models import EntityType

SAMPLE_PYTHON_CODE = '''"""Module docstring for billing."""
import os
from typing import List, Optional
from app.services.logger import AuditLogger as Logger

class PaymentManager:
    """Manages transactional charges."""

    def __init__(self, key: str):
        self.key = key
        self.logger = Logger()

    def charge(self, user_id: str, amount: float) -> bool:
        """Charges a given user."""
        self.logger.log_start(user_id)
        if amount <= 0:
            return False
        return self._send_request(amount)

    def _send_request(self, amt: float) -> bool:
        return True

def calculate_fee(subtotal: float) -> float:
    return subtotal * 0.05
'''


def test_python_ast_extraction():
    parser = PythonASTParser()
    analysis = parser.parse_source("services/billing.py", SAMPLE_PYTHON_CODE)

    assert analysis.language == "python"
    assert analysis.file_path == "services/billing.py"
    assert len(analysis.parse_errors) == 0

    # Verify imports
    assert len(analysis.imports) == 3
    from_imp = next(i for i in analysis.imports if "AuditLogger" in i.imported_names)
    assert from_imp.source_module == "app.services.logger"
    assert from_imp.alias_map.get("AuditLogger") == "Logger"

    # Verify entities
    entities_by_name = {e.qualified_name: e for e in analysis.entities}

    # Class
    assert "PaymentManager" in entities_by_name
    pm_class = entities_by_name["PaymentManager"]
    assert pm_class.entity_type == EntityType.CLASS
    assert pm_class.is_exported is True
    assert "Manages transactional charges" in (pm_class.docstring or "")

    # Methods
    assert "PaymentManager.__init__" in entities_by_name
    assert "PaymentManager.charge" in entities_by_name
    charge_m = entities_by_name["PaymentManager.charge"]
    assert charge_m.entity_type == EntityType.METHOD
    assert charge_m.is_exported is True
    assert "user_id" in charge_m.parameters
    assert "amount" in charge_m.parameters
    assert charge_m.return_type == "bool"

    # Verify calls extracted inside charge()
    call_targets = [c.target_name for c in charge_m.calls]
    assert "log_start" in call_targets
    assert "_send_request" in call_targets

    # Private method
    assert "PaymentManager._send_request" in entities_by_name
    priv_m = entities_by_name["PaymentManager._send_request"]
    assert priv_m.is_exported is False

    # Standalone function
    assert "calculate_fee" in entities_by_name
    calc_f = entities_by_name["calculate_fee"]
    assert calc_f.entity_type == EntityType.FUNCTION
    assert calc_f.return_type == "float"
