import * as ts from "ts-morph";
import { IREnum } from "@ir/enum";
import { IRDeclKind } from "@ir/index";

export function parseEnum(enumDeclaration: ts.EnumDeclaration) : IREnum{
  return {
    kind: IRDeclKind.Enum,
    name: enumDeclaration.getName(),
    members: enumDeclaration.getMembers().map((member) => ({
      name: member.getName(),
      value: member.getInitializer()?.getText() ?? undefined,
    })),
  };
}