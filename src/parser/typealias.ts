import * as ts from "ts-morph";
import { IRTypeAlias } from "../ir/typealias";
import { resolveDartType } from "../legacy/typeNode";
export function parseTypeAlias(tas: ts.TypeAliasDeclaration): IRTypeAlias {
  let name = tas.getName();
  let typeBefore = tas.getTypeNode();
  let typeAfter = resolveDartType(tas.getTypeNode());
  return {
    name: name,
    typeBefore: typeBefore,
    typeAfter: typeAfter,
  };
}
