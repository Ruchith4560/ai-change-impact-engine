"""TypeScript and JavaScript AST intelligence parser using Tree-sitter."""
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


class TypeScriptASTParser(BaseASTParser):
    """Extracts classes, interfaces, functions, methods, imports, and calls from TS/JS."""

    def __init__(self, is_tsx: bool = False):
        self.is_tsx = is_tsx
        grammar_name = "tsx" if is_tsx else "typescript"
        self.parser = TreeSitterLoader.create_parser(grammar_name)

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

        self._walk_statements(root, file_path, source_bytes, entities, imports, exports)

        return ASTFileAnalysis(
            file_path=file_path,
            language="typescript" if not self.is_tsx else "tsx",
            entities=entities,
            imports=imports,
            exports=exports,
            parse_errors=parse_errors,
        )

    def _walk_statements(
        self,
        node: Node,
        file_path: str,
        source_bytes: bytes,
        entities: List[CodeEntity],
        imports: List[ImportStatement],
        exports: List[str],
    ):
        for child in node.children:
            if child.type == "import_statement":
                imp = self._parse_import(child, source_bytes)
                if imp:
                    imports.append(imp)
            elif child.type == "export_statement":
                self._parse_export(child, file_path, source_bytes, entities, exports)
            elif child.type == "class_declaration":
                entities.extend(self._parse_class(child, file_path, source_bytes, is_exported=False))
            elif child.type == "function_declaration":
                func = self._parse_function(child, file_path, source_bytes, parent_class=None, is_exported=False)
                if func:
                    entities.append(func)
            elif child.type == "interface_declaration":
                interface = self._parse_interface(child, file_path, source_bytes, is_exported=False)
                if interface:
                    entities.append(interface)
            elif child.type == "type_alias_declaration":
                t_alias = self._parse_type_alias(child, file_path, source_bytes, is_exported=False)
                if t_alias:
                    entities.append(t_alias)

    def _parse_import(self, node: Node, source_bytes: bytes) -> Optional[ImportStatement]:
        line_no = node.start_point.row + 1
        source_node = node.child_by_field_name("source")
        if not source_node:
            return None
        source_module = self.get_node_text(source_node, source_bytes).strip("'\"")

        imported_names: List[str] = []
        alias_map: Dict[str, str] = {}
        is_default = False
        is_wildcard = False

        clause = None
        for child in node.children:
            if child.type == "import_clause":
                clause = child
                break

        if clause:
            for child in clause.children:
                if child.type == "identifier":
                    name = self.get_node_text(child, source_bytes)
                    imported_names.append(name)
                    is_default = True
                elif child.type == "named_imports":
                    for spec in child.children:
                        if spec.type == "import_specifier":
                            name_node = spec.child_by_field_name("name")
                            alias_node = spec.child_by_field_name("alias")
                            orig = self.get_node_text(name_node, source_bytes)
                            imported_names.append(orig)
                            if alias_node:
                                alias_map[orig] = self.get_node_text(alias_node, source_bytes)
                elif child.type == "namespace_import":
                    # import * as Foo from ...
                    for ns_child in child.children:
                        if ns_child.type == "identifier":
                            imported_names.append(self.get_node_text(ns_child, source_bytes))
                            is_wildcard = True

        return ImportStatement(
            source_module=source_module,
            imported_names=imported_names,
            alias_map=alias_map,
            is_default=is_default,
            is_wildcard=is_wildcard,
            line_no=line_no,
        )

    def _parse_export(
        self,
        node: Node,
        file_path: str,
        source_bytes: bytes,
        entities: List[CodeEntity],
        exports: List[str],
    ):
        decl = node.child_by_field_name("declaration")
        if decl:
            if decl.type == "class_declaration":
                class_ents = self._parse_class(decl, file_path, source_bytes, is_exported=True)
                entities.extend(class_ents)
                exports.append(class_ents[0].name)
            elif decl.type == "function_declaration":
                func = self._parse_function(decl, file_path, source_bytes, parent_class=None, is_exported=True)
                if func:
                    entities.append(func)
                    exports.append(func.name)
            elif decl.type == "interface_declaration":
                iface = self._parse_interface(decl, file_path, source_bytes, is_exported=True)
                if iface:
                    entities.append(iface)
                    exports.append(iface.name)
            elif decl.type == "type_alias_declaration":
                t_alias = self._parse_type_alias(decl, file_path, source_bytes, is_exported=True)
                if t_alias:
                    entities.append(t_alias)
                    exports.append(t_alias.name)
        else:
            # e.g. export { a, b }
            for child in node.children:
                if child.type == "export_clause":
                    for spec in child.children:
                        if spec.type == "export_specifier":
                            name_node = spec.child_by_field_name("name")
                            if name_node:
                                exports.append(self.get_node_text(name_node, source_bytes))

    def _parse_class(
        self,
        node: Node,
        file_path: str,
        source_bytes: bytes,
        is_exported: bool = False,
    ) -> List[CodeEntity]:
        name_node = node.child_by_field_name("name")
        class_name = self.get_node_text(name_node, source_bytes) or "AnonymousClass"
        loc = self.node_to_location(node)

        body_node = node.child_by_field_name("body")
        sig_end_line = body_node.start_point.row + 1 if body_node else loc.start_line

        class_entity = CodeEntity(
            id=f"{file_path}::{class_name}",
            file_path=file_path,
            entity_type=EntityType.CLASS,
            name=class_name,
            qualified_name=class_name,
            location=loc,
            signature_span=(loc.start_line, sig_end_line),
            body_span=(body_node.start_point.row + 1, loc.end_line) if body_node else (loc.start_line, loc.end_line),
            signature=f"class {class_name}",
            is_exported=is_exported,
        )

        entities = [class_entity]

        if body_node:
            for child in body_node.children:
                if child.type == "method_definition":
                    method = self._parse_method(child, file_path, source_bytes, class_name, is_exported)
                    if method:
                        entities.append(method)

        return entities

    def _parse_method(
        self,
        node: Node,
        file_path: str,
        source_bytes: bytes,
        class_name: str,
        is_class_exported: bool,
    ) -> Optional[CodeEntity]:
        name_node = node.child_by_field_name("name")
        method_name = self.get_node_text(name_node, source_bytes)
        if not method_name:
            return None

        loc = self.node_to_location(node)
        params_node = node.child_by_field_name("parameters")
        params_text = self.get_node_text(params_node, source_bytes)
        ret_type_node = node.child_by_field_name("return_type")
        ret_type_text = self.get_node_text(ret_type_node, source_bytes)

        body_node = node.child_by_field_name("body")
        sig_end_line = body_node.start_point.row + 1 if body_node else loc.start_line

        qualified_name = f"{class_name}.{method_name}"
        entity_id = f"{file_path}::{qualified_name}"

        calls = self._extract_calls(body_node, source_bytes, caller_id=entity_id) if body_node else []

        param_names: List[str] = []
        if params_node:
            for p in params_node.children:
                if p.type in ("required_parameter", "optional_parameter"):
                    p_id = p.child_by_field_name("pattern") or p
                    p_name = self.get_node_text(p_id, source_bytes)
                    if p_name:
                        param_names.append(p_name)

        signature_str = f"{method_name}{params_text}" + (f": {ret_type_text}" if ret_type_text else "")

        return CodeEntity(
            id=entity_id,
            file_path=file_path,
            entity_type=EntityType.METHOD,
            name=method_name,
            qualified_name=qualified_name,
            parent_name=class_name,
            location=loc,
            signature_span=(loc.start_line, sig_end_line),
            body_span=(body_node.start_point.row + 1, loc.end_line) if body_node else (loc.start_line, loc.end_line),
            signature=signature_str,
            is_exported=is_class_exported and not method_name.startswith("#") and not method_name.startswith("_"),
            parameters=param_names,
            return_type=ret_type_text or None,
            calls=calls,
        )

    def _parse_function(
        self,
        node: Node,
        file_path: str,
        source_bytes: bytes,
        parent_class: Optional[str] = None,
        is_exported: bool = False,
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
        calls = self._extract_calls(body_node, source_bytes, caller_id=entity_id) if body_node else []

        param_names: List[str] = []
        if params_node:
            for p in params_node.children:
                if p.type in ("required_parameter", "optional_parameter"):
                    p_id = p.child_by_field_name("pattern") or p
                    p_name = self.get_node_text(p_id, source_bytes)
                    if p_name:
                        param_names.append(p_name)

        signature_str = f"function {func_name}{params_text}" + (f": {ret_type_text}" if ret_type_text else "")

        return CodeEntity(
            id=entity_id,
            file_path=file_path,
            entity_type=EntityType.FUNCTION,
            name=func_name,
            qualified_name=qualified_name,
            parent_name=parent_class,
            location=loc,
            signature_span=(loc.start_line, sig_end_line),
            body_span=(body_node.start_point.row + 1, loc.end_line) if body_node else (loc.start_line, loc.end_line),
            signature=signature_str,
            is_exported=is_exported,
            parameters=param_names,
            return_type=ret_type_text or None,
            calls=calls,
        )

    def _parse_interface(
        self,
        node: Node,
        file_path: str,
        source_bytes: bytes,
        is_exported: bool = False,
    ) -> Optional[CodeEntity]:
        name_node = node.child_by_field_name("name")
        iface_name = self.get_node_text(name_node, source_bytes)
        if not iface_name:
            return None

        loc = self.node_to_location(node)
        body_node = node.child_by_field_name("body")

        return CodeEntity(
            id=f"{file_path}::{iface_name}",
            file_path=file_path,
            entity_type=EntityType.INTERFACE,
            name=iface_name,
            qualified_name=iface_name,
            location=loc,
            signature_span=(loc.start_line, loc.start_line),
            body_span=(loc.start_line, loc.end_line),
            signature=f"interface {iface_name}",
            is_exported=is_exported,
        )

    def _parse_type_alias(
        self,
        node: Node,
        file_path: str,
        source_bytes: bytes,
        is_exported: bool = False,
    ) -> Optional[CodeEntity]:
        name_node = node.child_by_field_name("name")
        type_name = self.get_node_text(name_node, source_bytes)
        if not type_name:
            return None

        loc = self.node_to_location(node)
        return CodeEntity(
            id=f"{file_path}::{type_name}",
            file_path=file_path,
            entity_type=EntityType.TYPE_ALIAS,
            name=type_name,
            qualified_name=type_name,
            location=loc,
            signature_span=(loc.start_line, loc.end_line),
            body_span=(loc.start_line, loc.end_line),
            signature=f"type {type_name}",
            is_exported=is_exported,
        )

    def _extract_calls(self, node: Node, source_bytes: bytes, caller_id: str) -> List[FunctionCall]:
        calls: List[FunctionCall] = []

        def visitor(n: Node):
            if n.type == "call_expression":
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
                    elif func_child.type == "member_expression":
                        prop_child = func_child.child_by_field_name("property")
                        obj_child = func_child.child_by_field_name("object")
                        target = self.get_node_text(prop_child, source_bytes)
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
