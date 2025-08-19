import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";


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
        name: "double",
        literalValue: operatorToken === ts.SyntaxKind.MinusToken ? -num : num,
        isNullable: false,
      };
    }

    if (operand.getKind() === ts.SyntaxKind.BigIntLiteral) {
      const bigintText = operand.getText().replace(/n$/, "");
      const val = BigInt(bigintText);
      return {
        kind: TypeKind.NumberLiteral,
        name: "BigInt",
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
        name: "String",
        literalValue: (literal as ts.StringLiteral).getText().slice(1, -1), // Remove quotes
        isNullable: false,
      };

    case ts.SyntaxKind.NumericLiteral:
      return {
        kind: TypeKind.NumberLiteral,
        name: "double",
        literalValue: Number((literal as ts.NumericLiteral).getText()),
        isNullable: false,
      };

    case ts.SyntaxKind.TrueKeyword:
      return {
        kind: TypeKind.BooleanLiteral,
        name: "bool",
        literalValue: true,
        isNullable: false,
      };

    case ts.SyntaxKind.FalseKeyword:
      return {
        kind: TypeKind.BooleanLiteral,
        name: "bool",
        literalValue: false,
        isNullable: false,
      };

    case ts.SyntaxKind.BigIntLiteral:
      return {
        kind: TypeKind.NumberLiteral,
        name: "BigInt",
        literalValue: BigInt(
          (literal as ts.BigIntLiteral).getText().replace(/n$/, ""),
        ),
        isNullable: false,
      };

    default:
      return {
        kind: TypeKind.Any,
        name: "dynamic",
        isNullable: false,
      };
  }
}