import * as ts from "ts-morph";
import { IREnum } from "../ir/enum";

export function parseEnum(enumDeclaration: ts.EnumDeclaration) : IREnum{
  return {
    name: enumDeclaration.getName(),
    members: enumDeclaration.getMembers().map((member) => ({
      name: member.getName(),
      value: member.getInitializer()?.getText() ?? undefined,
    })),
  };
}