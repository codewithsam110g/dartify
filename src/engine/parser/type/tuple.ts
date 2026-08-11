import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import { ParseContext } from "@parser/context";

export function handleTupleType(
  node: ts.TupleTypeNode,
  depth: number,
  context: ParseContext,
): IRType {
  const elements = node.getElements();

  // Every branch spreads into a fresh object. `isOptional` / `isRestParameter`
  // describe the *position in this tuple*, not the type sitting in it, so they
  // must never be written onto whatever `parseType` handed back (T-03).
  const elementTypes = elements.map((e, index): IRType => {
    const elementContext = context.child(`tuple_${index}`);
    if (ts.Node.isRestTypeNode(e)) {
      return {
        ...parseType(e.getTypeNode(), depth + 1, elementContext),
        isRestParameter: true,
      };
    }

    if (ts.Node.isNamedTupleMember(e)) {
      return {
        ...parseType(e.getTypeNode(), depth + 1, elementContext),
        ...(e.hasQuestionToken() ? { isOptional: true } : {}),
        ...(e.getDotDotDotToken() ? { isRestParameter: true } : {}),
      };
    }

    if (ts.Node.isOptionalTypeNode(e)) {
      // `[string?]`. ts-morph only grew OptionalTypeNode in 28.0.0 — before
      // that the inner node was unreachable through the typed API and this
      // branch parsed the `string?` wrapper itself, yielding `any` (`T-10`).
      return {
        ...parseType(e.getTypeNode(), depth + 1, elementContext),
        isOptional: true,
      };
    }

    return parseType(e, depth + 1, elementContext);
  });

  return {
    kind: TypeKind.Tuple,
    name: TypeKind.Tuple,
    isNullable: false,
    tupleTypes: elementTypes,
  };
}
