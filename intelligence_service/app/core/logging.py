"""Structured logger ensuring no source code secrets or credentials leak into logs."""
import logging
import sys
import re

SENSITIVE_PATTERNS = [
    re.compile(r"(ghp_[a-zA-Z0-9]{36})"),  # GitHub Personal Access Token
    re.compile(r"(gho_[a-zA-Z0-9]{36})"),  # GitHub OAuth Token
    re.compile(r"(github_pat_[a-zA-Z0-9_]{82})"),
    re.compile(r"(AIzaSy[a-zA-Z0-9_-]{33})"),  # Google API Key
    re.compile(r"Bearer\s+([a-zA-Z0-9\._\-]+)", re.IGNORECASE),
]


class RedactingFormatter(logging.Formatter):
    """Formatter that scrubs credentials and sensitive tokens from log messages."""

    def format(self, record: logging.LogRecord) -> str:
        orig = super().format(record)
        sanitized = orig
        for pattern in SENSITIVE_PATTERNS:
            sanitized = pattern.sub("[REDACTED_CREDENTIAL]", sanitized)
        return sanitized


def get_logger(name: str) -> logging.Logger:
    """Returns a configured sanitized logger instance."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            RedactingFormatter(
                fmt="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
