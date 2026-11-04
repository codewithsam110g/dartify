/**
 * Text utilities shared by the package:js backend: Dart string literals,
 * dartdoc code spans and JSDoc conversion.
 */

/**
 * A double-quoted Dart string literal for an arbitrary JavaScript name
 * (`E-32`). Escapes backslashes, quotes, interpolation and control
 * characters; the result is always a single valid token.
 */
export function dartString(value: string): string {
  let escaped = "";
  for (const char of value) {
    switch (char) {
      case "\\":
        escaped += "\\\\";
        break;
      case '"':
        escaped += '\\"';
        break;
      case "$":
        escaped += "\\$";
        break;
      case "\n":
        escaped += "\\n";
        break;
      case "\r":
        escaped += "\\r";
        break;
      case "\t":
        escaped += "\\t";
        break;
      default: {
        const code = char.codePointAt(0)!;
        escaped +=
          code < 0x20 ? `\\u{${code.toString(16)}}` : char;
      }
    }
  }
  return `"${escaped}"`;
}

/**
 * Wraps text as a dartdoc code span. The fence out-lengths any backtick run
 * inside, and content touching a backtick at either end is padded.
 */
export function codeSpan(text: string): string {
  const runs = [...text.matchAll(/`+/g)].map((match) => match[0].length);
  const fence = "`".repeat(Math.max(0, ...runs) + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}

const STRIPPED_TAGS = new Set([
  "param",
  "arg",
  "argument",
  "return",
  "returns",
  "throws",
  "exception",
  "type",
  "typedef",
  "template",
  "typeparam",
  "static",
  "memberof",
  "function",
]);

/**
 * Converts raw TypeScript JSDoc (one or more `/** … *\/` blocks) to `///`
 * lines (js_facade_gen §11, `I-06`). `@param`/`@returns`/`@throws` and type
 * tags are dropped because the Dart signature states them; `{@link x}` and
 * `{@link x text}` become `[x]`. Returns `[]` when nothing remains.
 */
export function dartDocLines(jsDoc: string | undefined, indent = ""): string[] {
  if (!jsDoc) return [];
  const blocks = jsDoc.match(/\/\*\*[\s\S]*?\*\//g) ?? [jsDoc];
  const lines: string[] = [];
  for (const block of blocks) {
    const body = block
      .replace(/^\/\*\*/, "")
      .replace(/\*\/$/, "")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\*? ?/, ""));
    let skipping = false;
    for (const raw of body) {
      const tag = raw.match(/^\s*@(\w+)/);
      if (tag) skipping = STRIPPED_TAGS.has(tag[1].toLowerCase());
      if (skipping) continue;
      lines.push(
        raw
          .replace(/\{@(?:link|linkcode|linkplain)\s+([^\s}|]+)(?:[\s|][^}]*)?\}/g, "[$1]")
          .replace(/\*\//g, "*\\/")
          // `[new X]` is a deprecated dartdoc reference form.
          .replace(/\[new\s+/g, "[")
          .trimEnd(),
      );
    }
  }
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  const collapsed: string[] = [];
  for (const line of lines) {
    if (line.trim() === "" && collapsed[collapsed.length - 1]?.trim() === "") continue;
    collapsed.push(line);
  }
  return collapsed.map((line) => `${indent}///${line ? ` ${line}` : ""}`);
}

/** PascalCase words from arbitrary text, for derived support names. */
export function pascalWords(text: string): string {
  const words = text.match(/[A-Za-z0-9]+/g) ?? [];
  const joined = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  const safe = /^[0-9]/.test(joined) ? `T${joined}` : joined;
  return safe.length > 48 ? safe.slice(0, 48) : safe;
}

/** FNV-1a, hex, `length` characters. Stable across runs and platforms. */
export function stableHash(text: string, length = 6): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, length);
}
