import * as ts from "ts-morph";
import { IRTypeAlias } from "@ir/typealias";
import { IRDeclKind } from "@ir/index";
import { parseType } from "@typeParser//type";
import { declarationParseContext, ParseContext } from "./context";

export function parseTypeAlias(
  tas: ts.TypeAliasDeclaration,
  context: ParseContext = declarationParseContext(tas, tas.getName()),
): IRTypeAlias {
  let name = tas.getName();
  let typeAfter = parseType(tas.getTypeNode(), 0, context);
  return {
    kind:IRDeclKind.TypeAlias,
    name: name,
    type: typeAfter,
  };
}
