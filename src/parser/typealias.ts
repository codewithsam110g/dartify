import * as ts from "ts-morph";
import { IRTypeAlias } from "../ir/typealias";
import { resolveDartType } from "../legacy/typeNode";
import { IRDeclKind } from "../ir";
export function parseTypeAlias(tas: ts.TypeAliasDeclaration): IRTypeAlias {
  let name = tas.getName();
  let typeBefore = tas.getTypeNode();
  let typeAfter = resolveDartType(tas.getTypeNode());
  return {
    kind:IRDeclKind.TypeAlias,
    name: name,
    typeBefore: typeBefore,
    typeAfter: typeAfter,
  };
}
