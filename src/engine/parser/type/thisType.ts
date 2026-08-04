import * as ts from "ts-morph";
import { IRType, TypeKind, UnsupportedReason } from "@ir/type";
import { makeUnsupported } from "./unsupported";

/**
 * `this` as a type — the polymorphic receiver type.
 *
 * Dart has no equivalent, so this resolves to the enclosing class or interface
 * by name, which is what `js_facade_gen` does (§3.10:
 * `interface Foo { bar(): this }` → `external Foo bar();`). The covariance is
 * lost — a subclass's `bar()` still reports the base type — but the alternative
 * is `dynamic`, and a named supertype is strictly more useful than that.
 *
 * The owner is found by walking ancestors rather than by parsing a generated
 * FQN. Recovering "the enclosing *type*" from scope text means guessing which
 * segment is a type — the AST already knows.
 *
 * Generic arguments are deliberately not reproduced: `class Box<T>` yields
 * `Box`, not `Box<T>`, because type parameters are not emitted yet (`E-03`) and
 * `Box<T>` would be uncompilable Dart. Revisit when `E-03` lands.
 *
 * With no enclosing type — `this` inside a bare type literal, say — there is
 * nothing to name, so it stays `Unsupported` and gets a documented typedef.
 */
export function handleThisType(node: ts.TypeNode): IRType {
  const owner = node.getFirstAncestor(
    (ancestor): ancestor is ts.ClassDeclaration | ts.InterfaceDeclaration =>
      ts.Node.isClassDeclaration(ancestor) ||
      ts.Node.isInterfaceDeclaration(ancestor),
  );

  const name = owner?.getName();
  if (!name) {
    return makeUnsupported(node, UnsupportedReason.ThisType);
  }

  return {
    kind: TypeKind.TypeReference,
    name,
    isNullable: false,
    genericArgs: [],
  };
}
