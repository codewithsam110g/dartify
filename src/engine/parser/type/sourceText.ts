import * as ts from "ts-morph";

/**
 * The source text a type node was written as, normalised to a single line.
 *
 * This is the body of every degradation comment dartify emits — the
 * `keyof Box<string>` in `/// Unrepresentable in Dart: keyof Box<string>` — so
 * it has to survive parsing. `parseType` used to discard it at the `default:`
 * branch, which made the information unrecoverable downstream no matter how
 * good the emitter got (`T-02`).
 *
 * Whitespace is collapsed because `.d.ts` types are routinely written across
 * several indented lines, and a dartdoc comment is one line. Nothing else is
 * altered: no truncation, no reformatting. Deciding how much of a very long
 * type expression to show is the emitter's call (`E-16`), and it cannot make
 * that call on text it never received.
 */
export function sourceTextOf(typeNode: ts.Node): string {
  return typeNode.getText().replace(/\s+/g, " ").trim();
}
