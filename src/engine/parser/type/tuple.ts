import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";

export function handleTupleType(node: ts.TupleTypeNode, depth: number): IRType {
  const elements = node.getElements();
  const elementTypes = elements.map((e, index) => {
    if (ts.Node.isRestTypeNode(e)) {
      let res = parseType(e.getTypeNode(), depth + 1);
      res.isRestParameter = true;
      return res;
    } else if (ts.Node.isNamedTupleMember(e)) {
      let res = parseType(e.getTypeNode(), depth + 1);
      if (e.hasQuestionToken()) {
        res.isOptional = true;
      }
      if (e.getDotDotDotToken()) {
        res.isRestParameter = true;
      }
      return res;
    } else if (e.getKind() === ts.SyntaxKind.OptionalType) {
      // This fails as ts-morph didnt wrap OptionalTypeNode
      // so we cant parseType and it will return any
      let res = parseType(e, depth + 1);
      res.isOptional = true;
      return res;
    } else {
      // Handle regular elements
      let res = parseType(e, depth + 1);
      return res;
    }
  });

  return {
    kind: TypeKind.Tuple,
    name: TypeKind.Tuple,
    isNullable: false,
    tupleTypes: elementTypes,
  };
}
