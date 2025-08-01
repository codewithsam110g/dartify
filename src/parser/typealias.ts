import * as ts from "ts-morph";
import { IRTypeAlias } from "../ir/typealias";
import { IRDeclKind } from "../ir";
import { parseType } from "../type/parser/type";

export function parseTypeAlias(tas: ts.TypeAliasDeclaration): IRTypeAlias {
  let name = tas.getName();
  let typeBefore = tas.getTypeNode();
  let typeAfter = parseType(tas.getTypeNode());
  return {
    kind:IRDeclKind.TypeAlias,
    name: name,
    typeBefore: typeBefore,
    typeAfter: typeAfter,
  };
}
