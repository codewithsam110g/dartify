import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";

/**
 * Literal types: `"success"`, `42`, `-2n`, `true`.
 *
 * `name` is the TypeScript-side kind, never a Dart type (`T-06`). This file
 * used to say `"double"`, `"String"` and `"bool"`, which made it a partial
 * emitter living in the parser — and left a second backend inheriting Dart
 * vocabulary it cannot use. All Dart mapping belongs in `emitType`'s table.
 */
export function handleLiteralType(node: ts.LiteralTypeNode, depth: number): IRType {
  const literal = node.getLiteral();
  const kind = literal.getKind();

  // Handle prefix unary expressions (negative numbers/bigints)
  if (literal.getKind() === ts.SyntaxKind.PrefixUnaryExpression) {
    const prefixUnary = literal as ts.PrefixUnaryExpression;
    const operand = prefixUnary.getOperand();
    const operatorToken = prefixUnary.getOperatorToken();

    if (operand.getKind() === ts.SyntaxKind.NumericLiteral) {
      const num = Number(operand.getText());
      return {
        kind: TypeKind.NumberLiteral,
        name: TypeKind.NumberLiteral,
        literalValue: operatorToken === ts.SyntaxKind.MinusToken ? -num : num,
        isNullable: false,
      };
    }

    if (operand.getKind() === ts.SyntaxKind.BigIntLiteral) {
      const bigintText = operand.getText().replace(/n$/, "");
      const val = BigInt(bigintText);
      return {
        kind: TypeKind.BigInt,
        name: TypeKind.BigInt,
        literalValue: operatorToken === ts.SyntaxKind.MinusToken ? -val : val,
        isNullable: false,
      };
    }
  }

  switch (kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return {
        kind: TypeKind.StringLiteral,
        name: TypeKind.StringLiteral,
        literalValue: (literal as ts.StringLiteral).getText().slice(1, -1), // Remove quotes
        isNullable: false,
      };

    case ts.SyntaxKind.NumericLiteral:
      return {
        kind: TypeKind.NumberLiteral,
        name: TypeKind.NumberLiteral,
        literalValue: Number((literal as ts.NumericLiteral).getText()),
        isNullable: false,
      };

    case ts.SyntaxKind.TrueKeyword:
      return {
        kind: TypeKind.BooleanLiteral,
        name: TypeKind.BooleanLiteral,
        literalValue: true,
        isNullable: false,
      };

    case ts.SyntaxKind.FalseKeyword:
      return {
        kind: TypeKind.BooleanLiteral,
        name: TypeKind.BooleanLiteral,
        literalValue: false,
        isNullable: false,
      };

    // A bigint literal is `TypeKind.BigInt`, not a `NumberLiteral` carrying the
    // string "BigInt" in `name`. The old shape leaned on an unread Dart name to
    // hold the distinction, so the emitter saw `NumberLiteral` and emitted
    // `num` for `10n` while emitting `BigInt` for a plain `bigint` (`T-06`).
    case ts.SyntaxKind.BigIntLiteral:
      return {
        kind: TypeKind.BigInt,
        name: TypeKind.BigInt,
        literalValue: BigInt(
          (literal as ts.BigIntLiteral).getText().replace(/n$/, ""),
        ),
        isNullable: false,
      };

    // Bare `null` in type position. TypeScript parses this as a LiteralType
    // wrapping a NullKeyword, so the NullKeyword case in `parseType` is
    // unreachable and this is the only place it can be caught (`T-07`).
    // `js_facade_gen` §1.10 gives `Null`; it was giving `dynamic`.
    case ts.SyntaxKind.NullKeyword:
      return {
        kind: TypeKind.Null,
        name: TypeKind.Null,
        isNullable: true,
      };

    default:
      return {
        kind: TypeKind.Any,
        name: TypeKind.Any,
        isNullable: false,
      };
  }
}
