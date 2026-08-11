import * as ts from "ts-morph";
import { IRReferenceTarget, IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import { ParseContext } from "@parser/context";
import { declarationFQN } from "@/symbol/fqn";
import { isStdlibFile } from "@/resolution/stdlib";

export type ReferenceLikeNode =
  | ts.TypeReferenceNode
  | ts.ExpressionWithTypeArguments;

function referenceNameNode(node: ReferenceLikeNode): ts.Node {
  return ts.Node.isTypeReference(node)
    ? node.getTypeName()
    : node.getExpression();
}

function syntaxReference(node: ReferenceLikeNode, error?: unknown): IRReferenceTarget {
  const writtenName = referenceNameNode(node).getText();
  const checkerError =
    error === undefined
      ? undefined
      : error instanceof Error
        ? error.message
        : String(error);
  return {
    writtenName,
    lookup: {
      kind: "syntax",
      pseudoFQN: `${node.getSourceFile().getFilePath()}::${writtenName}`,
      ...(checkerError ? { checkerError } : {}),
    },
  };
}

function isExternalModuleAugmentation(declaration: ts.Node): boolean {
  if (!ts.ts.isExternalModule(declaration.getSourceFile().compilerNode)) {
    return false;
  }
  let parent = declaration.getParent();
  while (parent) {
    if (
      ts.Node.isModuleDeclaration(parent) &&
      ts.Node.isStringLiteral(parent.getNameNode())
    ) {
      return true;
    }
    parent = parent.getParent();
  }
  return false;
}

function isLexicalTypeParameter(node: ts.Node, writtenName: string): boolean {
  if (writtenName.includes(".")) return false;
  for (const ancestor of node.getAncestors()) {
    const getTypeParameters = (
      ancestor as ts.Node & {
        getTypeParameters?: () => ts.TypeParameterDeclaration[];
      }
    ).getTypeParameters;
    if (
      getTypeParameters?.call(ancestor).some(
        (parameter) => parameter.getName() === writtenName,
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves a TypeReferenceNode to its source file path using the identifier's symbol,
 * then adds a pseudo-FQN to the context deps bucket.
 *
 * We use the identifier symbol (typeName.getSymbol()) rather than the resolved type
 * (node.getType().getSymbol()) because simple type aliases like `type H3Index = string`
 * resolve through to the primitive, losing the alias source file information.
 */
export function collectTypeDep(
  node: ReferenceLikeNode,
): IRReferenceTarget | undefined {
  try {
    const nameNode = referenceNameNode(node);
    const writtenName = nameNode.getText();

    let symbol = nameNode.getSymbol();
    // `node.getType().isTypeParameter()` is not reliable at every use site.
    // In particular, an optional class property such as `value?: T` can be
    // reported as the surrounding union rather than as T. The declaration
    // identity is definitive and prevents a fake `/file.d.ts::T` dependency.
    if (
      node.getType().isTypeParameter() ||
      isLexicalTypeParameter(node, writtenName) ||
      symbol?.getDeclarations().some(ts.Node.isTypeParameterDeclaration)
    ) {
      return undefined;
    }
    if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol();

    if (!symbol) {
      const type = node.getType();
      symbol = type.getAliasSymbol() ?? type.getSymbol();
      if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol();
    }

    if (!symbol) return syntaxReference(node);

    const declarations = symbol.getDeclarations();
    if (
      declarations.length > 0 &&
      declarations.every((declaration) =>
        isStdlibFile(declaration.getSourceFile().getFilePath()),
      )
    ) {
      return undefined;
    }

    const nonStdlibDeclarations = declarations.filter(
      (declaration) =>
        !isStdlibFile(declaration.getSourceFile().getFilePath()),
    );
    const primaryDeclarations = nonStdlibDeclarations.filter(
      (declaration) => !isExternalModuleAugmentation(declaration),
    );
    const targetDeclarations =
      primaryDeclarations.length > 0
        ? primaryDeclarations
        : nonStdlibDeclarations;

    const candidates = [
      ...new Set(
        targetDeclarations
          .map((declaration) => declarationFQN(declaration, symbol!.getName()))
          .filter((fqn): fqn is string => fqn !== null),
      ),
    ].sort();

    return candidates.length > 0
      ? { writtenName, lookup: { kind: "checker", candidates } }
      : syntaxReference(node);
  } catch (error) {
    return syntaxReference(node, error);
  }
}

export function handleTypeReferences(
  node: ReferenceLikeNode,
  depth: number,
  context: ParseContext,
): IRType {
  const name = referenceNameNode(node).getText();
  const reference = collectTypeDep(node);

  const typeArgs = node.getTypeArguments();
  let genericArgs: IRType[] = [];
  for (const [index, typeArg] of typeArgs.entries()) {
    const res = parseType(
      typeArg,
      depth + 1,
      context.child(`arg_${index}`),
    );
    genericArgs.push(res);
  }
  return {
    kind: TypeKind.TypeReference,
    name: name,
    isNullable: false,
    genericArgs: genericArgs,
    ...(reference ? { reference } : {}),
  };
}
