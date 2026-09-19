"""Tree-sitter grammar loader and singleton parser cache."""
from typing import Dict
from tree_sitter import Language, Parser
import tree_sitter_python as tspython
import tree_sitter_typescript as tstypescript
from app.core.logging import get_logger

logger = get_logger("tree_sitter_loader")


class TreeSitterLoader:
    """Manages compiled Tree-sitter language grammars and parser allocation."""

    _languages: Dict[str, Language] = {}

    @classmethod
    def get_language(cls, lang_name: str) -> Language:
        """Retrieves or loads the Tree-sitter Language for a supported runtime."""
        lang_key = lang_name.lower()
        if lang_key in cls._languages:
            return cls._languages[lang_key]

        if lang_key in ("python", "py"):
            lang = Language(tspython.language())
        elif lang_key in ("typescript", "ts"):
            lang = Language(tstypescript.language_typescript())
        elif lang_key in ("tsx", "jsx", "javascript", "js"):
            # TSX grammar is a strict superset capable of parsing modern JS/JSX and TSX
            lang = Language(tstypescript.language_tsx())
        else:
            raise ValueError(f"Unsupported language for Tree-sitter: {lang_name}")

        cls._languages[lang_key] = lang
        logger.debug(f"Loaded Tree-sitter grammar for {lang_key}")
        return lang

    @classmethod
    def create_parser(cls, lang_name: str) -> Parser:
        """Creates a new Tree-sitter Parser bound to the requested language grammar."""
        language = cls.get_language(lang_name)
        return Parser(language)
