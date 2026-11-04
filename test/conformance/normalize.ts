/**
 * Normalizes js_facade_gen reference output and dartify output into
 * comparable declaration blocks.
 *
 * Every rule here erases a *documented, deliberate* style difference, never a
 * semantic one:
 *
 * - js_facade_gen predates null safety: `?`, `required` and `covariant` are
 *   dropped from both sides, and untyped members become `dynamic`.
 * - js_facade_gen's `X.fakeConstructor$()` workaround is gone; dartify uses
 *   `external` constructors, so zero-argument constructors are not compared.
 * - `@JS()` and `@JS("sameName")` bind the same JavaScript name; only dotted
 *   paths are kept. Member-level renames live in dartify extensions and are
 *   merged back into their class.
 * - Inline `dynamic /*why*\/` and dartify's named `typedef Why = dynamic;`
 *   carry the same information (design principle 2); named dynamic typedefs
 *   are substituted back to `dynamic`.
 * - Old-style `typedef R F(A a);` is the new-style `typedef F = R Function(A a);`.
 * - Setter parameters are `v` in js_facade_gen and `value` in dartify.
 * - Member order inside a class is not significant.
 */

export type Blocks = Map<string, string[]>;

export interface NormalizeOptions {
  /** Drop `///` documentation lines. */
  ignoreDocs?: boolean;
  /**
   * Also substitute non-`dynamic` local typedefs (`typedef H3Index = String;`)
   * with their right-hand side, for comparison with tools that inlined them.
   */
  inlineTypedefs?: boolean;
}

export function normalizeDart(source: string, options: NormalizeOptions = {}): Blocks {
  let text = source.replace(/\r\n/g, "\n");
  // Block comments (including `dynamic /*num|List<num>*/` explanations).
  text = text.replace(/\/\*[\s\S]*?\*\//g, " ");
  const raw = text.split("\n").map((line) => line.replace(/\s+$/, "")).filter((line) => line.trim() !== "");
  // The library directive's own `@JS()` annotation.
  const withoutLibraryAnnotation = raw.filter(
    (line, index) => !(line.trim() === "@JS()" && raw[index + 1]?.trim().startsWith("library ")),
  );
  const lines = withoutLibraryAnnotation
    .filter((line) => !/^\s*\/\/(?!\/)/.test(line))
    .filter((line) => !/^\s*(library |import |export |part )/.test(line))
    .filter((line) => !/fakeConstructor\$/.test(line));

  // Join statements that the reference tool wrapped across lines.
  const joined: string[] = [];
  for (const line of lines) {
    const previous = joined[joined.length - 1];
    const unterminated =
      previous !== undefined &&
      /^\s*external /.test(previous) &&
      !/[;{}]$/.test(previous.trim());
    if (previous !== undefined && (/[(,]$/.test(previous.trim()) || unterminated)) {
      joined[joined.length - 1] = `${previous.trim()} ${line.trim()}`;
    } else {
      joined.push(line);
    }
  }

  const dynamicTypedefs = new Set<string>();
  const aliasTypedefs = new Map<string, string>();
  for (const line of joined) {
    const match = line.match(/^typedef ([A-Za-z_$][\w$]*)(?:<[^=]*>)? = dynamic;$/);
    if (match) dynamicTypedefs.add(match[1]);
    const alias = line.match(/^typedef ([A-Za-z_$][\w$]*) = (?!dynamic;)([^;]+);$/);
    if (alias && options.inlineTypedefs && !alias[2].includes(" Function")) {
      aliasTypedefs.set(alias[1], alias[2]);
    }
  }

  const normalizeLine = (raw: string): string => {
    let line = raw.trim().replace(/'/g, '"');
    line = line.replace(/@JS\("([^".]*)"\)/g, "@JS()");
    line = line.replace(/\brequired\s+/g, "").replace(/\bcovariant\s+/g, "");
    line = line.replace(/\?(?=[\s,)>\]};])/g, "");
    for (const [name, target] of aliasTypedefs) {
      line = line.replace(new RegExp(`(?<![\\w$.])${name.replace(/\$/g, "\\$")}(?![\\w$])`, "g"), target);
    }
    for (const name of dynamicTypedefs) {
      line = line.replace(new RegExp(`(?<![\\w$.])${name.replace(/\$/g, "\\$")}(?![\\w$])`, "g"), "dynamic");
    }
    line = oldStyleTypedef(line);
    line = line.replace(/^external (get|set) /, "external dynamic $1 ");
    line = line.replace(/^external static (get|set) /, "external static dynamic $1 ");
    line = line.replace(/^external dynamic set /, "external set ");
    line = line.replace(/^external static dynamic set /, "external static set ");
    // Untyped methods: `external x(` → `external dynamic x(`.
    line = line.replace(/^external (static )?([A-Za-z_$][\w$]*)(<[^(]*>)?\(/, (whole, statics, name, generics) =>
      ["factory", "dynamic"].includes(name) ? whole : `external ${statics ?? ""}dynamic ${name}${generics ?? ""}(`,
    );
    line = line.replace(/^external factory ([\w$]+)/, "external factory $1");
    line = normalizeParameters(line);
    line = line.replace(/\bset ([A-Za-z_$][\w$]*)\((.*) (?:v|value)\)/, "set $1($2 v)");
    line = line.replace(/\s+/g, " ").replace(/\s*\{\s*\}$/, " {}").replace(/([^\s]){$/, "$1 {");
    // Spaces left behind by removed comments: `X<dynamic /*T*/ >`, `f/*<T>*/(`.
    line = line.replace(/\s+([>(])/g, "$1");
    return line;
  };

  const blocks: Blocks = new Map();
  const add = (key: string, entries: string[]) => {
    const existing = blocks.get(key) ?? [];
    existing.push(...entries);
    blocks.set(key, existing);
  };

  let pending: string[] = [];
  for (let index = 0; index < joined.length; index++) {
    const line = normalizeLine(joined[index]);
    if (options.ignoreDocs && line.startsWith("///")) continue;
    if (line.startsWith("@") || line.startsWith("///")) {
      pending.push(line);
      continue;
    }
    const classMatch = line.match(/^(?:abstract )?class ([A-Za-z_$][\w$]*)/);
    const extensionMatch = line.match(/^extension [\w$]+(?:<[^>]*>)? on ([A-Za-z_$][\w$]*)/);
    if ((classMatch || extensionMatch) && line.endsWith("{")) {
      const members: string[] = [];
      let depth = 1;
      while (++index < joined.length) {
        const memberRaw = joined[index].trim();
        if (memberRaw === "}") {
          depth--;
          if (depth === 0) break;
        }
        const owner = (classMatch ?? extensionMatch)![1];
        // Constructors, recognized by the class name before any other rule:
        // generative and factory spellings are equivalent here, and
        // zero-argument constructors are not compared (see header).
        const ctor = memberRaw.match(
          new RegExp(`^external (?:factory )?${owner.replace(/\$/g, "\\$")}(\\.[\\w$]+)?\\((.*)\\);$`),
        );
        if (ctor) {
          if (ctor[2].trim() === "") continue;
          members.push(normalizeLine(`external factory ${owner}${ctor[1] ?? ""}(${ctor[2]});`).replace(/^external dynamic factory/, "external factory"));
          continue;
        }
        const member = normalizeLine(memberRaw);
        if (/^@JS\(/.test(member)) continue;
        members.push(member);
      }
      const key = (classMatch ?? extensionMatch)![1];
      if (classMatch) {
        const header = [...pending.filter((entry) => !entry.startsWith("@")).sort(), ...pending.filter((entry) => entry.startsWith("@")).sort(), line.replace(/ \{$/, " {}")];
        add(key, [...header, ...members.map((member) => `  ${member}`)]);
      } else {
        add(key, members.map((member) => `  ${member}`));
      }
      pending = [];
      continue;
    }
    if (classMatch) {
      add(classMatch[1], [...pending.filter((entry) => !entry.startsWith("@")).sort(), ...pending.filter((entry) => entry.startsWith("@")).sort(), line]);
      pending = [];
      continue;
    }
    const typedefMatch = line.match(/^typedef ([A-Za-z_$][\w$]*)/);
    if (typedefMatch) {
      if (!dynamicTypedefs.has(typedefMatch[1]) && !aliasTypedefs.has(typedefMatch[1])) {
        add(typedefMatch[1], [...pending, line]);
      }
      pending = [];
      continue;
    }
    const accessor = line.match(/\b(?:get|set) ([A-Za-z_$][\w$]*)\b/);
    const key = accessor?.[1] ?? functionName(line) ?? line;
    add(key, [...pending, line]);
    pending = [];
  }
  for (const entries of blocks.values()) {
    // Order-insensitive within a declaration, except the header line(s).
    const headerEnd = entries.findIndex((entry) => entry.startsWith("  "));
    if (headerEnd > 0) {
      const body = entries.splice(headerEnd).sort();
      entries.push(...body);
    } else {
      entries.sort();
    }
  }
  return blocks;
}

/** The identifier before a declaration's parameter list, generics removed. */
function functionName(line: string): string | undefined {
  const open = line.indexOf("(");
  if (open < 0) return undefined;
  let head = line.slice(0, open);
  while (head.endsWith(">")) {
    let depth = 0;
    let index = head.length - 1;
    for (; index >= 0; index--) {
      if (head[index] === ">") depth++;
      if (head[index] === "<") depth--;
      if (depth === 0) break;
    }
    head = head.slice(0, index);
  }
  return head.match(/([A-Za-z_$][\w$]*)$/)?.[1];
}

/** `typedef R F<T>(params);` → `typedef F<T> = R Function(params);` */
function oldStyleTypedef(line: string): string {
  const match = line.match(/^typedef (.+?) ([A-Za-z_$][\w$]*)(<[^>]*>)?\((.*)\);$/);
  if (!match || line.includes(" = ")) return line;
  const [, returnType, name, generics, params] = match;
  return `typedef ${name}${generics ?? ""} = ${returnType} Function(${params});`;
}

/**
 * Inside a parameter list: untyped parameters become `dynamic name`, and
 * old-style function-typed parameters `R f(A a)` become `R Function(A) f`.
 */
function normalizeParameters(line: string): string {
  const open = line.indexOf("(");
  if (open < 0 || !line.endsWith(");")) return line;
  const head = line.slice(0, open + 1);
  const inner = line.slice(open + 1, -2);
  const parts = splitTopLevel(inner);
  const rewritten = parts.map((part) => {
    let prefix = "";
    let body = part.trim();
    const bracket = body.match(/^([[{])/);
    if (bracket) {
      prefix = bracket[1];
      body = body.slice(1).trim();
    }
    let suffix = "";
    const closing = body.match(/([\]}])$/);
    if (closing) {
      suffix = closing[1];
      body = body.slice(0, -1).trim();
    }
    const fnParam = body.match(/^(.+?) ([A-Za-z_$][\w$]*)\((.*)\)$/);
    if (fnParam && !/ Function$/.test(fnParam[1])) {
      const types = splitTopLevel(fnParam[3]).map((p) => p.trim().split(" ").slice(0, -1).join(" ") || "dynamic");
      body = `${fnParam[1]} Function(${types.join(", ")}) ${fnParam[2]}`;
    } else if (/^[A-Za-z_$][\w$]*$/.test(body) && body !== "") {
      body = `dynamic ${body}`;
    }
    return `${prefix}${body}${suffix}`;
  });
  return `${head}${rewritten.join(", ")});`;
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if ("(<".includes(char)) depth++;
    if (")>".includes(char)) depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim() !== "") parts.push(current);
  return parts;
}
