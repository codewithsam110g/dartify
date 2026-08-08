import * as ts from "ts-morph";
import { IRTypeAlias } from "@ir/typealias";
import { IRDeclKind } from "@ir/index";
import { parseType } from "@typeParser/type";
import { declarationParseContext, ParseContext } from "./context";
import { declarationModifiersOf, nodeMetadata } from "./metadata";
import { parseTypeParameters } from "./signature";

export function parseTypeAlias(
  declaration: ts.TypeAliasDeclaration,
  context: ParseContext = declarationParseContext(
    declaration,
    declaration.getName(),
  ),
): IRTypeAlias {
  return {
    ...nodeMetadata(declaration),
    kind: IRDeclKind.TypeAlias,
    modifiers: declarationModifiersOf(declaration),
    name: declaration.getName(),
    typeParams: parseTypeParameters(declaration, context),
    type: parseType(declaration.getTypeNode(), 0, context),
  };
}
