import * as ts from "ts-morph";

/**
 * Keyword predicates shared by the union and intersection handlers.
 *
 * They dispatch on `SyntaxKind`, never on rendered source text (`T-08`).
 * Comparing `getText()` is what every other handler avoids, and it breaks on
 * anything the printer does not normalise — a comment inside the node, an alias
 * shadowing the keyword, unusual whitespace.
 */

/**
 * `null` or `undefined` in type position.
 *
 * Note the asymmetry: `undefined` is an `UndefinedKeyword`, but `null` is a
 * `LiteralType` wrapping a `NullKeyword`, which is why a bare `NullKeyword`
 * case never fires (`T-07`).
 */
export function isNullOrUndefined(node: ts.TypeNode): boolean {
  if (node.getKind() === ts.SyntaxKind.UndefinedKeyword) return true;

  if (node.getKind() === ts.SyntaxKind.LiteralType) {
    return (
      (node as ts.LiteralTypeNode).getLiteral().getKind() ===
      ts.SyntaxKind.NullKeyword
    );
  }

  return false;
}

export function isNever(node: ts.TypeNode): boolean {
  return node.getKind() === ts.SyntaxKind.NeverKeyword;
}

export function isVoid(node: ts.TypeNode): boolean {
  return node.getKind() === ts.SyntaxKind.VoidKeyword;
}
