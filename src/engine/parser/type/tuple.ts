import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";

export function handleTupleType(node: ts.TupleTypeNode, depth: number): IRType {
  const elements = node.getElements();

  // Every branch spreads into a fresh object. `isOptional` / `isRestParameter`
  // describe the *position in this tuple*, not the type sitting in it, so they
  // must never be written onto whatever `parseType` handed back (T-03).
  const elementTypes = elements.map((e): IRType => {
    if (ts.Node.isRestTypeNode(e)) {
      return {
        ...parseType(e.getTypeNode(), depth + 1),
        isRestParameter: true,
      };
    }

    if (ts.Node.isNamedTupleMember(e)) {
      return {
        ...parseType(e.getTypeNode(), depth + 1),
        ...(e.hasQuestionToken() ? { isOptional: true } : {}),
        ...(e.getDotDotDotToken() ? { isRestParameter: true } : {}),
      };
    }

    if (e.getKind() === ts.SyntaxKind.OptionalType) {
      // This fails as ts-morph didnt wrap OptionalTypeNode
      // so we cant parseType and it will return any
      return { ...parseType(e, depth + 1), isOptional: true };
    }

    return parseType(e, depth + 1);
  });

  return {
    kind: TypeKind.Tuple,
    name: TypeKind.Tuple,
    isNullable: false,
    tupleTypes: elementTypes,
  };
}
