"""Python AST intelligence parser using Tree-sitter."""
from typing import List, Optional, Tuple, Dict
from app.parsing.base_parser import BaseASTParser
from app.parsing.tree_sitter_loader import TreeSitterLoader
from app.models.ast_models import (
    ASTFileAnalysis,
    CodeEntity,
    EntityType,
    FunctionCall,
    ImportStatement,
    SymbolLocation,
)
from tree_sitter import Node


class PythonASTParser(BaseASTParser):
    """Extracts classes, functions, methods, imports, and calls from Python source."""

    def __init__(self):
        self.parser = TreeSitterLoader.create_parser("python")

    def parse_source(self, file_path: str, code: str) -> ASTFileAnalysis:
        source_bytes = code.encode("utf-8")
        tree = self.parser.parse(source_bytes)
        root = tree.root_node

        entities: List[CodeEntity] = []
        imports: List[ImportStatement] = []
        exports: List[str] = []
        parse_errors: List[str] = []

        if root.has_error:
            parse_errors.append("Syntax contains parsing errors (partial AST generated)")

        # 1. Extract imports and top-level definitions
        for child in root.children:
            if child.type in ("import_statement", "import_from_statement"):
                imp = self._parse_import(child, source_bytes)
                if imp:
                    imports.append(imp)
            elif child.type == "class_definition":
                class_entities = self._parse_class(child, file_path, source_bytes)
                entities.extend(class_entities)
            elif child.type == "function_definition":
                func_entity = self._parse_function(child, file_path, source_bytes, parent_class=None)
                if func_entity:
                    entities.append(func_entity)

        return ASTFileAnalysis(
            file_path=file_path,
            language="python",
            entities=entities,
            imports=imports,
            exports=exports,
            parse_errors=parse_errors,
        )

    def _parse_import(self, node: Node, source_bytes: bytes) -> Optional[ImportStatement]:
        line_no = node.start_point.row + 1
        if node.type == "import_statement":
            # e.g., import os, sys as s
            imported_names: List[str] = []
            alias_map: Dict[str, str] = {}
            for child in node.children:
                if child.type == "dotted_name":
                    name = self.get_node_text(child, source_bytes)
                    imported_names.append(name)
                elif child.type == "aliased_import":
                    orig = self.get_node_text(child.child_by_field_name("name"), source_bytes)
                    alias = self.get_node_text(child.child_by_field_name("alias"), source_bytes)
                    imported_names.append(orig)
                    if alias:
                        alias_map[orig] = alias
            return ImportStatement(
                source_module=",".join(imported_names),
                imported_names=imported_names,
                alias_map=alias_map,
                line_no=line_no,
            )

        elif node.type == "import_from_statement":
            # e.g., from app.services import payment_service as ps
            mod_node = node.child_by_field_name("module_name")
            source_module = self.get_node_text(mod_node, source_bytes)
            imported_names = []
            alias_map = {}
            is_wildcard = False

            for child in node.children:
                if child.type == "wildcard_import":
                    is_wildcard = True
                elif child.type == "dotted_name" and child != mod_node:
                    imported_names.append(self.get_node_text(child, source_bytes))
                elif child.type == "aliased_import":
                    orig = self.get_node_text(child.child_by_field_name("name"), source_bytes)
                    alias = self.get_node_text(child.child_by_field_name("alias"), source_bytes)
                    imported_names.append(orig)
                    if alias:
                        alias_map[orig] = alias

            return ImportStatement(
                source_module=source_module,
                imported_names=imported_names,
                alias_map=alias_map,
                is_wildcard=is_wildcard,
                line_no=line_no,
            )
        return None

    def _parse_class(self, node: Node, file_path: str, source_bytes: bytes) -> List[CodeEntity]:
        name_node = node.child_by_field_name("name")
        class_name = self.get_node_text(name_node, source_bytes) or "AnonymousClass"
        loc = self.node_to_location(node)

        body_node = node.child_by_field_name("body")
        docstring = self._extract_docstring(body_node, source_bytes)

        class_entity = CodeEntity(
            id=f"{file_path}::{class_name}",
            file_path=file_path,
            entity_type=EntityType.CLASS,
            name=class_name,
            qualified_name=class_name,
            location=loc,
            is_exported=not class_name.startswith("_"),
            docstring=docstring,
            signature_span=(loc.start_line, (body_node.start_point.row + 1 if body_node else loc.start_line)),
            body_span=(body_node.start_point.row + 1, loc.end_line) if body_node else (loc.start_line, loc.end_line),
        )

        entities: List[CodeEntity] = [class_entity]

        # Extract methods inside class body
        if body_node:
            for child in body_node.children:
                if child.type == "function_definition":
                    method_entity = self._parse_function(child, file_path, source_bytes, parent_class=class_name)
                    if method_entity:
                        entities.append(method_entity)

        return entities

    def _parse_function(
        self,
        node: Node,
        file_path: str,
        source_bytes: bytes,
        parent_class: Optional[str] = None,
    ) -> Optional[CodeEntity]:
        name_node = node.child_by_field_name("name")
        func_name = self.get_node_text(name_node, source_bytes)
        if not func_name:
            return None

        loc = self.node_to_location(node)
        params_node = node.child_by_field_name("parameters")
        params_text = self.get_node_text(params_node, source_bytes)
        ret_type_node = node.child_by_field_name("return_type")
        ret_type_text = self.get_node_text(ret_type_node, source_bytes)

        body_node = node.child_by_field_name("body")
        sig_end_line = body_node.start_point.row + 1 if body_node else loc.start_line

        qualified_name = f"{parent_class}.{func_name}" if parent_class else func_name
        entity_id = f"{file_path}::{qualified_name}"
        entity_type = EntityType.METHOD if parent_class else EntityType.FUNCTION

        # Extract calls within body
        calls = self._extract_calls(body_node, source_bytes, caller_id=entity_id) if body_node else []
        docstring = self._extract_docstring(body_node, source_bytes)

        # Parse parameter list into individual names
        param_names: List[str] = []
        if params_node:
            for p in params_node.children:
                p_name = None
                if p.type == "identifier":
                    p_name = self.get_node_text(p, source_bytes)
                elif p.type in ("typed_parameter", "default_parameter", "typed_default_parameter"):
                    id_node = next((ch for ch in p.children if ch.type == "identifier"), None)
                    if id_node:
                        p_name = self.get_node_text(id_node, source_bytes)

                if p_name and p_name not in ("self", "cls"):
                    param_names.append(p_name)

        signature_str = f"def {func_name}{params_text}" + (f" -> {ret_type_text}" if ret_type_text else "")

        return CodeEntity(
            id=entity_id,
            file_path=file_path,
            entity_type=entity_type,
            name=func_name,
            qualified_name=qualified_name,
            parent_name=parent_class,
            location=loc,
            signature_span=(loc.start_line, sig_end_line),
            body_span=(body_node.start_point.row + 1, loc.end_line) if body_node else (loc.start_line, loc.end_line),
            signature=signature_str,
            is_exported=not func_name.startswith("_"),
            docstring=docstring,
            parameters=param_names,
            return_type=ret_type_text or None,
            calls=calls,
        )

    def _extract_calls(self, node: Node, source_bytes: bytes, caller_id: str) -> List[FunctionCall]:
        calls: List[FunctionCall] = []

        def visitor(n: Node):
            if n.type == "call":
                func_child = n.child_by_field_name("function")
                if func_child:
                    line_no = n.start_point.row + 1
                    if func_child.type == "identifier":
                        calls.append(
                            FunctionCall(
                                target_name=self.get_node_text(func_child, source_bytes),
                                caller_entity_id=caller_id,
                                line_no=line_no,
                                is_method_call=False,
                            )
                        )
                    elif func_child.type == "attribute":
                        attr_child = func_child.child_by_field_name("attribute")
                        obj_child = func_child.child_by_field_name("object")
                        target = self.get_node_text(attr_child, source_bytes)
                        receiver = self.get_node_text(obj_child, source_bytes)
                        calls.append(
                            FunctionCall(
                                target_name=target,
                                caller_entity_id=caller_id,
                                line_no=line_no,
                                is_method_call=True,
                                receiver_name=receiver,
                            )
                        )
            for child in n.children:
                visitor(child)

        visitor(node)
        return calls

    def _extract_docstring(self, body_node: Optional[Node], source_bytes: bytes) -> Optional[str]:
        if not body_node or not body_node.children:
            return None
        first_child = body_node.children[0]
        if first_child.type == "expression_statement":
            expr = first_child.children[0] if first_child.children else None
            if expr and expr.type == "string":
                raw_text = self.get_node_text(expr, source_bytes)
                return raw_text.strip("'''\"\"\" \n\r\t")
        return None
