import { UnsupportedReason } from "@ir/type";

/**
 * Derives the Dart identifier for a TypeScript construct dartify cannot
 * represent, so that degradation lands on a *named* type rather than a bare
 * `dynamic` (`E-16`, design principle 2).
 *
 * The derivation is a pure function of the source text: the same expression
 * always yields the same name, in any file, in any run. That is what lets the
 * linker dedup identical expressions (`L-05`) and lets a regenerated binding
 * diff cleanly against its predecessor. Uniqueness is *not* handled here —
 * `AliasRegistry` owns that, because it needs to see the symbol table.
 */

/**
 * TypeScript keywords whose mechanical capitalisation reads badly. Everything
 * else is capitalised by rule, so this table stays short on purpose.
 */
const KEYWORD_WORDS: Record<string, string> = {
  keyof: "KeyOf",
  typeof: "TypeOf",
  infer: "Infer",
  extends: "Extends",
  readonly: "Readonly",
  unique: "Unique",
  import: "Import",
  new: "New",
  in: "In",
  is: "Is",
};

/**
 * Constructs whose source text carries no marker keyword.
 *
 * `keyof T`, `typeof x`, `infer U`, `new () => T`, `import("m").T` and
 * conditional types (which always contain `extends`) all name themselves. An
 * indexed access does not: `Attributes[K]` would derive to `AttributesK`,
 * indistinguishable from an ordinary type reference at the use site. Since the
 * entire point of a minted alias over `js_facade_gen`'s inline comment is that
 * the *use site* stays legible, these three get told what they are.
 */
const REASON_PREFIX: Partial<Record<UnsupportedReason, string>> = {
  [UnsupportedReason.IndexedAccess]: "Indexed",
  [UnsupportedReason.Mapped]: "Mapped",
  [UnsupportedReason.TemplateLiteral]: "Template",
};

/**
 * Names longer than this get truncated and hash-suffixed.
 *
 * Measured, not guessed: over three.js + leaflet + probe the derived-name
 * length is p50 23, p90 37, p99 56. A 64-char budget therefore leaves the
 * truncation path for genuine pathologies — the corpus's worst case is a
 * 21-branch conditional type that derives to 1,379 characters.
 */
const MAX_LENGTH = 64;

/** Hex digits of source-text hash appended when a name needs disambiguating. */
const HASH_LENGTH = 6;

/**
 * Identifier-ish runs in the source text. Underscores are kept inside a run —
 * `SUBGROUP_BROADCAST_FIRST` reads far better whole than mashed together, and
 * dartify already emits underscored type names for hoisted anonymous types
 * (`Anon_Foo`). `$` is deliberately excluded: in this input it is nearly
 * always the `${` of a template literal type, not part of a name.
 */
const SEGMENT = /[A-Za-z_][A-Za-z0-9_]*|[0-9]+/g;

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * FNV-1a over the *full* source text, so two long expressions sharing a
 * truncated prefix still get different names.
 */
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, HASH_LENGTH);
}

function wordsOf(originalText: string, reason?: UnsupportedReason): string[] {
  const words = (originalText.match(SEGMENT) ?? []).map(
    (segment) => KEYWORD_WORDS[segment] ?? capitalise(segment),
  );

  const prefix = reason ? REASON_PREFIX[reason] : undefined;
  if (prefix && words[0] !== prefix) words.unshift(prefix);

  return words;
}

/**
 * Guarantees the result is a *public* Dart identifier. A leading underscore
 * would make the typedef library-private, which for a generated binding means
 * every use site fails to resolve.
 */
function sanitise(name: string, reason?: UnsupportedReason): string {
  const stripped = name.replace(/^_+/, "");
  if (stripped.length > 0 && !/^[0-9]/.test(stripped)) return stripped;
  return capitalise(reason ?? "unsupported") + stripped;
}

export function deriveAliasName(
  originalText: string,
  reason?: UnsupportedReason,
): string {
  const words = wordsOf(originalText, reason);

  // Text with no identifier in it at all — `[]`, `"..."`. Nothing to name it
  // after, so the reason plus a hash is the honest answer.
  if (words.length === 0) {
    return `${capitalise(reason ?? "unsupported")}_${textHash(originalText)}`;
  }

  const joined = words.join("");
  if (joined.length <= MAX_LENGTH) return sanitise(joined, reason);

  // Keep whole words: a name cut mid-identifier is worse than a short one.
  const budget = MAX_LENGTH - HASH_LENGTH - 1;
  let head = "";
  for (const word of words) {
    if (head.length + word.length > budget) break;
    head += word;
  }
  if (head.length === 0) head = joined.slice(0, budget);

  return sanitise(`${head}_${textHash(originalText)}`, reason);
}
