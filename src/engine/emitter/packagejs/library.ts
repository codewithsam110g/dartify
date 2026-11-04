import { dirname, relative, basename } from "path";
import { DART_RESERVED_WORDS } from "@engine/semantic/keywords";
import { pascalWords, stableHash } from "./text";

/**
 * Per-library import planning and backend-minted support declarations.
 *
 * Emission writes placeholder tokens for every foreign type name and every
 * support typedef; `finish()` resolves them once the whole library body is
 * known. Deferring the decision is what makes it deterministic and
 * collision-safe (`E-08`, `E-23`, `E-26`): a name is imported unprefixed with
 * `show` only when exactly one library supplies it and nothing local claims
 * it; otherwise every use of that library is qualified through an allocated
 * prefix. Support names are allocated over the full set of requested support
 * keys, never by first claimant.
 */

const IMPORT_OPEN = "\uE000";
const IMPORT_SEP = "\uE001";
const IMPORT_CLOSE = "\uE002";
const SUPPORT_OPEN = "\uE003";
const SUPPORT_CLOSE = "\uE004";

/** Unqualified names the generated code relies on from dart:core/package:js. */
const CORE_NAMES = new Set([
  "bool",
  "num",
  "int",
  "double",
  "String",
  "List",
  "Map",
  "Set",
  "Iterable",
  "Object",
  "Function",
  "Future",
  "DateTime",
  "BigInt",
  "Never",
  "Null",
  "Record",
  "Type",
  "Symbol",
  "Error",
  "Exception",
  "RegExp",
  "Duration",
  "Pattern",
  "Comparable",
  "Iterator",
  "JS",
  "anonymous",
  "staticInterop",
  "allowInterop",
  "dynamic",
  "void",
]);

export interface SupportDeclaration {
  /** Identity of the declaration; equal keys share one declaration. */
  key: string;
  /** Preferred readable name. */
  base: string;
  /** Renders the complete declaration given its allocated name. */
  render: (name: string) => string[];
  /** Whether a use of this name admits null without a `?`. */
  dynamicLike: boolean;
}

export class LibraryPlan {
  private readonly declared = new Set<string>();
  private readonly uris: string[] = [];
  private readonly uriIndex = new Map<string, number>();
  private readonly supports: SupportDeclaration[] = [];
  private readonly supportIndex = new Map<string, number>();

  constructor(private readonly outputPath: string) {}

  /** Records a top-level name this library declares. */
  declare(name: string): void {
    this.declared.add(name);
  }

  isDeclared(name: string): boolean {
    return this.declared.has(name);
  }

  /** A use of `name` exported by the Dart library at `uri`. */
  importName(uri: string, name: string): string {
    let index = this.uriIndex.get(uri);
    if (index === undefined) {
      index = this.uris.length;
      this.uris.push(uri);
      this.uriIndex.set(uri, index);
    }
    return `${IMPORT_OPEN}${index}${IMPORT_SEP}${name}${IMPORT_CLOSE}`;
  }

  /** A use of `name` declared by another generated library. */
  siblingName(targetOutputPath: string, name: string): string {
    return this.importName(siblingUri(this.outputPath, targetOutputPath), name);
  }

  /** A use of a backend-minted support declaration. */
  support(declaration: SupportDeclaration): string {
    let index = this.supportIndex.get(declaration.key);
    if (index === undefined) {
      index = this.supports.length;
      this.supports.push(declaration);
      this.supportIndex.set(declaration.key, index);
    }
    return `${SUPPORT_OPEN}${index}${SUPPORT_CLOSE}`;
  }

  /**
   * Resolves every token in `body`, appends the support section, and returns
   * the import directives plus the final body.
   */
  finish(
    body: string,
    supportHeader: string[],
  ): { imports: string[]; body: string } {
    // 1. Support names, allocated against everything that could collide.
    const requestedImportNames = new Set<string>();
    for (const match of body.matchAll(tokenPattern())) {
      requestedImportNames.add(match[2]);
    }
    const supportNames = this.allocateSupportNames(requestedImportNames);
    const supportSection: string[] = [];
    // Only supports whose token survives into the body: probing a type can
    // register one that the final text never uses.
    const used = this.supports
      .map((declaration, index) => ({ declaration, name: supportNames[index], index }))
      .filter(({ index }) => body.includes(`${SUPPORT_OPEN}${index}${SUPPORT_CLOSE}`));
    if (used.length > 0) {
      supportSection.push(...supportHeader, "");
      const ordered = used.sort((a, b) => a.name.localeCompare(b.name));
      for (const { declaration, name } of ordered) {
        supportSection.push(...declaration.render(name), "");
      }
    }
    let text = [body, ...supportSection].join("\n");
    text = text.replace(
      new RegExp(`${SUPPORT_OPEN}(\\d+)${SUPPORT_CLOSE}`, "g"),
      (_, index) => supportNames[Number(index)],
    );

    // 2. Import decisions over the complete text, support section included.
    const local = new Set([...this.declared, ...supportNames]);
    const urisByName = new Map<string, Set<number>>();
    for (const match of text.matchAll(tokenPattern())) {
      const index = Number(match[1]);
      let set = urisByName.get(match[2]);
      if (!set) urisByName.set(match[2], (set = new Set()));
      set.add(index);
    }
    const shown = new Map<number, Set<string>>();
    const prefixed = new Set<number>();
    const prefixedNames = new Set<string>();
    for (const [name, uris] of urisByName) {
      const clash = uris.size > 1 || local.has(name) || CORE_NAMES.has(name);
      for (const index of uris) {
        if (clash) {
          prefixed.add(index);
          prefixedNames.add(`${index}\u0000${name}`);
        } else {
          let set = shown.get(index);
          if (!set) shown.set(index, (set = new Set()));
          set.add(name);
        }
      }
    }

    const unprefixedImported = new Set(
      [...shown.values()].flatMap((names) => [...names]),
    );
    const prefixes = new Map<number, string>();
    const takenPrefixes = new Set<string>([
      ...local,
      ...unprefixedImported,
      ...CORE_NAMES,
    ]);
    for (const index of [...prefixed].sort((a, b) =>
      this.uris[a].localeCompare(this.uris[b]),
    )) {
      const base = prefixBase(this.uris[index]);
      let candidate = base;
      for (let n = 2; takenPrefixes.has(candidate) || DART_RESERVED_WORDS.has(candidate); n++) {
        candidate = `${base}${n}`;
      }
      takenPrefixes.add(candidate);
      prefixes.set(index, candidate);
    }

    text = text.replace(tokenPattern(), (_, rawIndex: string, name: string) => {
      const index = Number(rawIndex);
      return prefixedNames.has(`${index}\u0000${name}`)
        ? `${prefixes.get(index)}.${name}`
        : name;
    });

    const imports: string[] = [];
    const ordered = this.uris
      .map((uri, index) => ({ uri, index }))
      .filter(({ index }) => shown.has(index) || prefixes.has(index))
      .sort((a, b) => importRank(a.uri) - importRank(b.uri) || a.uri.localeCompare(b.uri));
    for (const { uri, index } of ordered) {
      const names = shown.get(index);
      if (names) {
        imports.push(`import '${uri}' show ${[...names].sort().join(", ")};`);
      }
      const prefix = prefixes.get(index);
      if (prefix) {
        // An explicit dart:core import suppresses the implicit one.
        if (uri === "dart:core") imports.push("import 'dart:core';");
        imports.push(`import '${uri}' as ${prefix};`);
      }
    }
    return { imports, body: text };
  }

  /** Whether a support token in emitted text names a dynamic-like typedef. */
  supportIsDynamicLike(token: string): boolean {
    const match = token.match(new RegExp(`^${SUPPORT_OPEN}(\\d+)${SUPPORT_CLOSE}$`));
    return match ? this.supports[Number(match[1])].dynamicLike : false;
  }

  private allocateSupportNames(requestedImportNames: Set<string>): string[] {
    const taken = (name: string) =>
      this.declared.has(name) ||
      CORE_NAMES.has(name) ||
      requestedImportNames.has(name) ||
      DART_RESERVED_WORDS.has(name);
    const names: string[] = new Array(this.supports.length);
    const groups = new Map<string, number[]>();
    this.supports.forEach((declaration, index) => {
      const group = groups.get(declaration.base) ?? [];
      group.push(index);
      groups.set(declaration.base, group);
    });
    const used = new Set<string>();
    for (const base of [...groups.keys()].sort()) {
      const members = groups
        .get(base)!
        .sort((a, b) => this.supports[a].key.localeCompare(this.supports[b].key));
      if (members.length === 1 && !taken(base) && !used.has(base)) {
        names[members[0]] = base;
        used.add(base);
        continue;
      }
      for (const index of members) {
        let length = 6;
        let candidate = `${base}_${stableHash(this.supports[index].key, length)}`;
        while ((used.has(candidate) || taken(candidate)) && length < 8) {
          length++;
          candidate = `${base}_${stableHash(this.supports[index].key, length)}`;
        }
        for (let n = 2; used.has(candidate) || taken(candidate); n++) {
          candidate = `${base}_${stableHash(this.supports[index].key, 8)}_${n}`;
        }
        names[index] = candidate;
        used.add(candidate);
      }
    }
    return names;
  }
}

function tokenPattern(): RegExp {
  return new RegExp(`${IMPORT_OPEN}(\\d+)${IMPORT_SEP}([^${IMPORT_CLOSE}]+)${IMPORT_CLOSE}`, "g");
}

/** Matches a whole emitted type that is exactly one support token. */
export function isSupportToken(text: string): boolean {
  return new RegExp(`^${SUPPORT_OPEN}\\d+${SUPPORT_CLOSE}$`).test(text);
}

function importRank(uri: string): number {
  if (uri.startsWith("dart:")) return 0;
  if (uri.startsWith("package:")) return 1;
  return 2;
}

function prefixBase(uri: string): string {
  const stem = uri.startsWith("dart:")
    ? uri.slice("dart:".length)
    : basename(uri).replace(/\.dart$/, "");
  const words = stem.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const safe = words || "lib";
  return /^[0-9]/.test(safe) ? `lib_${safe}` : safe;
}

export function siblingUri(fromOutput: string, toOutput: string): string {
  const path = relative(dirname(fromOutput), toOutput).split("\\").join("/");
  return path.startsWith(".") ? path : path;
}

/** Derived readable base for a support typedef from arbitrary text. */
export function supportBase(prefix: string, text: string): string {
  const words = pascalWords(text);
  return `${prefix}${words || "Type"}`;
}
