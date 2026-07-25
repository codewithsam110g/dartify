import * as ts from "ts-morph";
import { IRType, TypeKind, UnsupportedReason } from "@ir/type";
import { sourceTextOf } from "./sourceText";

/**
 * Names the TypeScript construct behind a node `parseType` cannot represent.
 *
 * `TypeOperator` covers three unrelated constructs (`keyof`, `readonly`,
 * `unique symbol`) so it dispatches on the operator token rather than the node
 * kind — otherwise `keyof T` and `readonly T[]` would be indistinguishable in
 * the IR despite needing completely different treatment in S1.4/S1.5.
 */
export function classifyUnsupported(node: ts.TypeNode): UnsupportedReason {
  switch (node.getKind()) {
    case ts.SyntaxKind.ThisType:
      return UnsupportedReason.ThisType;

    case ts.SyntaxKind.TypeOperator: {
      const operator = (node as ts.TypeOperatorTypeNode).getOperator();
      if (operator === ts.SyntaxKind.KeyOfKeyword) {
        return UnsupportedReason.KeyOf;
      }
      if (operator === ts.SyntaxKind.ReadonlyKeyword) {
        return UnsupportedReason.ReadonlyOperator;
      }
      if (operator === ts.SyntaxKind.UniqueKeyword) {
        return UnsupportedReason.UniqueSymbol;
      }
      return UnsupportedReason.Unclassified;
    }

    case ts.SyntaxKind.ConditionalType:
      return UnsupportedReason.Conditional;

    case ts.SyntaxKind.MappedType:
      return UnsupportedReason.Mapped;

    case ts.SyntaxKind.TemplateLiteralType:
      return UnsupportedReason.TemplateLiteral;

    case ts.SyntaxKind.InferType:
      return UnsupportedReason.Infer;

    case ts.SyntaxKind.IndexedAccessType:
      return UnsupportedReason.IndexedAccess;

    case ts.SyntaxKind.TypePredicate:
      return UnsupportedReason.TypePredicate;

    case ts.SyntaxKind.TypeQuery:
      return UnsupportedReason.TypeQuery;

    case ts.SyntaxKind.ImportType:
      return UnsupportedReason.ImportType;

    case ts.SyntaxKind.ConstructorType:
      return UnsupportedReason.ConstructorType;

    case ts.SyntaxKind.OptionalType:
      return UnsupportedReason.OptionalMember;

    default:
      return UnsupportedReason.Unclassified;
  }
}

/**
 * Builds the IR node for something dartify cannot represent.
 *
 * Always carries the source text. The whole point of `TypeKind.Unsupported`
 * is that degradation stops being anonymous, so a node without `originalText`
 * would defeat it (`T-01`, `T-02`).
 */
export function makeUnsupported(
  node: ts.TypeNode,
  reason: UnsupportedReason = classifyUnsupported(node),
): IRType {
  return {
    kind: TypeKind.Unsupported,
    name: TypeKind.Unsupported,
    isNullable: false,
    originalText: sourceTextOf(node),
    unsupportedReason: reason,
  };
}
