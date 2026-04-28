import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import { transpilerContext } from "@/context";

/**
 * Resolves a TypeReferenceNode to its source file path using the identifier's symbol,
 * then adds a pseudo-FQN to the context deps bucket.
 *
 * We use the identifier symbol (typeName.getSymbol()) rather than the resolved type
 * (node.getType().getSymbol()) because simple type aliases like `type H3Index = string`
 * resolve through to the primitive, losing the alias source file information.
 */
export function collectTypeDep(node: ts.TypeReferenceNode): void {
  try {
    const typeName = node.getTypeName();
    const name = typeName.getText();

    // First try: get the symbol from the name identifier directly.
    // This correctly handles type aliases that resolve to primitives.
    let sourceFilePath: string | undefined;

    const identSymbol = typeName.getSymbol();
    if (identSymbol) {
      const declarations = identSymbol.getDeclarations();
      if (declarations && declarations.length > 0) {
        sourceFilePath = declarations[0].getSourceFile().getFilePath() as string;
      }
    }

    // Fallback: use the resolved type's symbol (handles complex generics, etc.)
    if (!sourceFilePath) {
      const type = node.getType();
      const typeSymbol = type.getSymbol() ?? type.getAliasSymbol();
      if (typeSymbol) {
        const declarations = typeSymbol.getDeclarations();
        if (declarations && declarations.length > 0) {
          sourceFilePath = declarations[0].getSourceFile().getFilePath() as string;
        }
      }
    }

    if (!sourceFilePath) return;

    // Skip stdlib / TS lib files — we never emit these
    if (
      sourceFilePath.includes("typescript/lib/lib.") ||
      sourceFilePath.includes("@types/node/") ||
      sourceFilePath.includes("undici-types/")
    ) {
      return;
    }

    const pseudoFqn = `${sourceFilePath}::${name}`;
    transpilerContext.currentDeps.add(pseudoFqn);
  } catch {
    // If type resolution fails, silently skip — the dep just won't be tracked
  }
}

export function handleTypeReferences(
  node: ts.TypeReferenceNode,
  depth: number,
): IRType {
  const name = node.getTypeName().getText();

  // Collect dependency info before proceeding with IR generation
  collectTypeDep(node);

  const typeArgs = node.getTypeArguments();
  let genericArgs: IRType[] = [];
  for (let typeArg of typeArgs) {
    let res = parseType(typeArg, depth + 1);
    genericArgs.push(res);
  }
  return {
    kind: TypeKind.TypeReference,
    name: name,
    isNullable: false,
    genericArgs: genericArgs,
  };
}

