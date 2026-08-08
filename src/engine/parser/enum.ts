import * as ts from "ts-morph";
import { IREnum, IREnumInitializer } from "@ir/enum";
import { IRDeclKind } from "@ir/index";
import { declarationModifiersOf, nodeMetadata } from "./metadata";

function enumInitializer(
  member: ts.EnumMember,
  implicitValue: number | undefined,
): IREnumInitializer {
  const initializer = member.getInitializer();
  const computedValue = member.getValue();
  if (!initializer) {
    return {
      kind: "implicit",
      ...(computedValue ?? implicitValue) !== undefined
        ? { computedValue: computedValue ?? implicitValue }
        : {},
    };
  }

  const text = initializer.getText();
  if (
    ts.Node.isStringLiteral(initializer) ||
    ts.Node.isNoSubstitutionTemplateLiteral(initializer)
  ) {
    return {
      kind: "string",
      text,
      value:
        typeof computedValue === "string" ? computedValue : text.slice(1, -1),
    };
  }

  if (
    ts.Node.isNumericLiteral(initializer) ||
    (ts.Node.isPrefixUnaryExpression(initializer) &&
      ts.Node.isNumericLiteral(initializer.getOperand()))
  ) {
    return {
      kind: "number",
      text,
      value: typeof computedValue === "number" ? computedValue : Number(text),
    };
  }

  return {
    kind: "computed",
    text,
    ...(computedValue !== undefined ? { computedValue } : {}),
  };
}

export function parseEnum(declaration: ts.EnumDeclaration): IREnum {
  let nextImplicitValue: number | undefined = 0;
  const members = declaration.getMembers().map((member) => {
    const initializer = enumInitializer(member, nextImplicitValue);
    const value =
      initializer.kind === "number" || initializer.kind === "string"
        ? initializer.value
        : initializer.computedValue;
    nextImplicitValue = typeof value === "number" ? value + 1 : undefined;
    return {
      ...nodeMetadata(member),
      name: member.getName(),
      initializer,
    };
  });

  return {
    ...nodeMetadata(declaration),
    kind: IRDeclKind.Enum,
    modifiers: declarationModifiersOf(declaration),
    name: declaration.getName(),
    members,
  };
}
