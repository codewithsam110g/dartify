import * as ts from "ts-morph";
import {
  IRHostTypeIdentity,
  IRReferenceTarget,
  IRType,
  TypeKind,
} from "@ir/type";
import { parseType } from "./type";
import { ParseContext } from "@parser/context";
import { declarationFQN } from "@/symbol/fqn";
import { hostFamilyOf, isStdlibFile } from "@/resolution/stdlib";

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
export interface CollectedReference {
  reference?: IRReferenceTarget;
  host?: IRHostTypeIdentity;
}

export function collectTypeDep(
  node: ReferenceLikeNode,
): IRReferenceTarget | undefined {
  return collectReference(node).reference;
}

function hostIdentityOf(
  symbol: ts.Symbol,
  declarations: readonly ts.Node[],
): IRHostTypeIdentity | undefined {
  const families = new Set(
    declarations.map((declaration) =>
      hostFamilyOf(declaration.getSourceFile().getFilePath()),
    ),
  );
  if (families.size !== 1) return undefined;
  const family = [...families][0];
  if (!family) return undefined;
  const libraries = [
    ...new Set(
      declarations.map((declaration) => declaration.getSourceFile().getBaseName()),
    ),
  ].sort();
  return {
    family,
    libraries,
    qualifiedName: symbol.getFullyQualifiedName().replace(/^"[^"]*"\./, ""),
  };
}

/**
 * Resolves a reference to either a linkable project target or a host
 * identity. Lexical type parameters get neither.
 */
export function collectReference(node: ReferenceLikeNode): CollectedReference {
  const reference = collectReferenceTarget(node);
  return reference;
}

function collectReferenceTarget(node: ReferenceLikeNode): CollectedReference {
  try {
    const nameNode = referenceNameNode(node);
    const writtenName = nameNode.getText();

    let symbol = nameNode.getSymbol();
    // `node.getType().isTypeParameter()` is not reliable at every use site.
    // In particular, an optional class property such as `value?: T` can be
    // reported as the surrounding union rather than as T. The declaration
    // identity is definitive and prevents a fake `/file.d.ts::T` dependency.
    // Cheapest checks first: the symbol's declarations decide almost every
    // case, and `getType()` (a full checker query) is only needed when the
    // name has no symbol at all.
    if (
      symbol?.getDeclarations().some(ts.Node.isTypeParameterDeclaration) ||
      isLexicalTypeParameter(node, writtenName) ||
      (!symbol && node.getType().isTypeParameter())
    ) {
      return {};
    }
    if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol();

    if (!symbol) {
      const type = node.getType();
      symbol = type.getAliasSymbol() ?? type.getSymbol();
      if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol();
    }

    if (!symbol) return { reference: syntaxReference(node) };

    const declarations = symbol.getDeclarations();
    if (
      declarations.length > 0 &&
      declarations.every((declaration) =>
        isStdlibFile(declaration.getSourceFile().getFilePath()),
      )
    ) {
      const host = hostIdentityOf(symbol, declarations);
      return host ? { host } : {};
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

    return {
      reference:
        candidates.length > 0
          ? { writtenName, lookup: { kind: "checker", candidates } }
          : syntaxReference(node),
    };
  } catch (error) {
    return { reference: syntaxReference(node, error) };
  }
}

export function handleTypeReferences(
  node: ReferenceLikeNode,
  depth: number,
  context: ParseContext,
): IRType {
  const name = referenceNameNode(node).getText();
  const { reference, host } = collectReference(node);

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
    ...(host ? { host } : {}),
  };
}
