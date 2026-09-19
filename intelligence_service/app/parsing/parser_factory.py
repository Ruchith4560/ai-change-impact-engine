"""Factory for instantiating language-specific AST parsers."""
from typing import Optional
from app.parsing.base_parser import BaseASTParser
from app.parsing.python_ast_parser import PythonASTParser
from app.parsing.typescript_ast_parser import TypeScriptASTParser

# Singleton parser instances to prevent repeated initialization
_py_parser: Optional[PythonASTParser] = None
_ts_parser: Optional[TypeScriptASTParser] = None
_tsx_parser: Optional[TypeScriptASTParser] = None


class ParserFactory:
    """Detects language by file extension and returns the appropriate AST parser."""

    @classmethod
    def get_parser_for_file(cls, file_path: str) -> Optional[BaseASTParser]:
        """Returns the cached parser instance matching the file extension."""
        global _py_parser, _ts_parser, _tsx_parser

        lower = file_path.lower()
        if lower.endswith(".py"):
            if _py_parser is None:
                _py_parser = PythonASTParser()
            return _py_parser
        elif lower.endswith(".ts"):
            if _ts_parser is None:
                _ts_parser = TypeScriptASTParser(is_tsx=False)
            return _ts_parser
        elif lower.endswith((".tsx", ".js", ".jsx")):
            if _tsx_parser is None:
                _tsx_parser = TypeScriptASTParser(is_tsx=True)
            return _tsx_parser
        return None

    @classmethod
    def is_supported(cls, file_path: str) -> bool:
        """Checks whether the file format has an available AST parser."""
        return cls.get_parser_for_file(file_path) is not None
