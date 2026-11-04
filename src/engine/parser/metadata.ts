import * as ts from "ts-morph";
import {
  IRDeclarationModifiers,
  IRNode,
  IRSourceLocation,
  IRVisibility,
} from "@ir/node";

type JSDocableNode = ts.Node & { getJsDocs?: () => ts.JSDoc[] };
type ModifierNode = ts.Node & {
  hasModifier?: (kind: ts.SyntaxKind) => boolean;
};

export function sourceLocationOf(node: ts.Node): IRSourceLocation {
  const sourceFile = node.getSourceFile();
  // The compiler's cached line-start table makes this O(log n). ts-morph's
  // `getLineAndColumnAtPos` rescans the text from the start on every call,
  // which made lib.dom.d.ts spend 90 s here (1-based, like ts-morph).
  const position = ts.ts.getLineAndCharacterOfPosition(
    sourceFile.compilerNode,
    node.getStart(),
  );
  return {
    file: sourceFile.getFilePath(),
    line: position.line + 1,
    column: position.character + 1,
  };
}

export function jsDocOf(node: ts.Node): string | undefined {
  const docs = (node as JSDocableNode).getJsDocs?.() ?? [];
  const text = docs.map((doc) => doc.getText()).join("\n");
  return text || undefined;
}

export function nodeMetadata(node: ts.Node): IRNode {
  const jsDoc = jsDocOf(node);
  return {
    loc: sourceLocationOf(node),
    ...(jsDoc ? { jsDoc } : {}),
  };
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return (node as ModifierNode).hasModifier?.(kind) ?? false;
}

export function visibilityOf(node: ts.Node): IRVisibility | undefined {
  if (hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return "private";
  if (hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return "protected";
  if (hasModifier(node, ts.SyntaxKind.PublicKeyword)) return "public";
  return undefined;
}

export function declarationModifiersOf(
  node: ts.Node,
): IRDeclarationModifiers {
  const isDefault = hasModifier(node, ts.SyntaxKind.DefaultKeyword);
  const isExported = hasModifier(node, ts.SyntaxKind.ExportKeyword) || isDefault;
  const modifierFlags = ts.ts.getCombinedModifierFlags(
    node.compilerNode as ts.ts.Declaration,
  );

  const name = (node as ts.Node & { getName?: () => string | undefined })
    .getName?.();
  const anonymousDefault =
    isDefault &&
    (ts.Node.isClassDeclaration(node) || ts.Node.isFunctionDeclaration(node)) &&
    !name;
  return {
    exportKind: isDefault ? "default" : isExported ? "named" : "none",
    ...(anonymousDefault ? { isAnonymousDefault: true } : {}),
    isDeclare: hasModifier(node, ts.SyntaxKind.DeclareKeyword),
    isAmbient:
      node.getSourceFile().isDeclarationFile() ||
      Boolean(modifierFlags & ts.ts.ModifierFlags.Ambient),
  };
}
