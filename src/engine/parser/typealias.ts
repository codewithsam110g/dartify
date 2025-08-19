import * as ts from "ts-morph";
import { IRTypeAlias } from "@ir/typealias";
import { IRDeclKind } from "@ir/index";
import { parseType } from "@typeParser//type";

export function parseTypeAlias(tas: ts.TypeAliasDeclaration): IRTypeAlias {
  let name = tas.getName();
  let typeAfter = parseType(tas.getTypeNode());
  return {
    kind:IRDeclKind.TypeAlias,
    name: name,
    type: typeAfter,
  };
}
