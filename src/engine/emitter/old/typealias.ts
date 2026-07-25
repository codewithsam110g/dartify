import { IRTypeAlias } from "@ir/typealias";
import { TypeKind } from "@ir/type";
import { emitType } from "@typeEmitter/emit";

export function emitTypeAlias(
  irTypeAlias: IRTypeAlias,
  prefix: string,
  debug = false,
): string {
  const declaration = `typedef ${irTypeAlias.name} = ${emitType(irTypeAlias.type)};`;

  // A typedef standing in for something with no Dart representation says so,
  // once, with the original spelling (`E-16`, design principle 2).
  if (irTypeAlias.type.kind === TypeKind.Unsupported) {
    const original = irTypeAlias.type.originalText;
    if (original) {
      return `/// Unrepresentable in Dart: ${codeSpan(original)}\n${declaration}`;
    }
  }

  return declaration;
}

/**
 * Wraps text as a dartdoc code span.
 *
 * A code span rather than bare text because dartdoc reads `[x]` as a reference
 * link, and these texts are full of index signatures and tuples. The fence has
 * to out-length any backtick run inside — template literal types like
 * `` `pre-${string}` `` carry their own — and content touching a backtick at
 * either end needs a space so the delimiters stay unambiguous. Both are
 * standard Markdown rules; the naive single-backtick version renders wrong.
 */
function codeSpan(text: string): string {
  const runs = [...text.matchAll(/`+/g)].map((match) => match[0].length);
  const fence = "`".repeat(Math.max(0, ...runs) + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";

  return `${fence}${pad}${text}${pad}${fence}`;
}
