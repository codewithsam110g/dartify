import { basename, extname } from "path";
import { Symbol, SymbolFacet } from "@/symbol";
import { isDeclarationFileName, stripDeclarationSuffix } from "@/resolution/declarationFile";
import { IRDeclKind } from "@ir/declaration";
import { DART_RESERVED_WORDS } from "@engine/semantic/keywords";
import {
  Backend,
  BackendDiagnostic,
  LibraryInput,
  RenderedLibrary,
  RenderSession,
  SUPPORT_LIBRARY,
} from "../backend";
import { renderSupportLibrary, SUPPORT_PUBLIC_NAMES, supportExports } from "./support";
import {
  emitAnonymousDefault,
  emitAugmentation,
  emitClass,
  emitEnum,
  emitFunction,
  emitInterface,
  EmittedDeclaration,
  emitTypeAlias,
  emitVariable,
} from "./declarations";
import { isJsPropertyPath, jsPath } from "./declarations";
import { LibraryPlan, siblingUri } from "./library";
import { ProgramIndex, sdkAugmentation } from "./program";
import { planPublicNames, ReExport } from "./publicNames";
import { needsRuntimePath, planRoutes, RoutePlan, umdRootOf } from "./routes";
import { EmitContext } from "./types";

const TYPE_DEFINITIONS_HEADER = [
  "// " + "-".repeat(75),
  "// Type definitions",
  "//",
  "// TypeScript constructs with no direct Dart representation. Each one is",
  "// stated once, with its original spelling, and every use site refers to it",
  "// by name. Replacing a `dynamic` here upgrades every use site at once.",
  "// " + "-".repeat(75),
];

/**
 * The v1 backend: `package:js` bindings compatible with the archived
 * `js_facade_gen` (see `def_files/js_facade_gen_test_cases.md`), with named
 * degradations instead of inline `dynamic` comments.
 */
export interface PackageJsOptions {
  /**
   * Global object that module libraries without `export as namespace` are
   * reached through, e.g. `THREE` for three.js's classic build. Their
   * declarations then bind `THREE.<name>` instead of bare globals.
   */
  jsRoot?: string;
}

export function createPackageJsBackend(options: PackageJsOptions = {}): Backend {
  return {
    id: "package:js",
    renderLibraries(
      inputs: readonly LibraryInput[],
      session?: RenderSession,
    ): Map<string, RenderedLibrary> {
      if (inputs.length === 0) return new Map();
      const index = new ProgramIndex(inputs[0].program.symbols, inputs[0].outputPathOfFile);
      // Paths depend on other files' export lists, so they are planned once per
      // render over the whole program (HD-17).
      const routes = planRoutes(inputs[0].program, options.jsRoot);
      const drafts = new Map<string, LibraryDraft>();
      for (const input of inputs) {
        const cached = session?.cache.get(input.sourceFile) as LibraryDraft | undefined;
        // A library re-renders when its own file changed, when what the export
        // graph says about it changed (its declarations' paths, what its export
        // lists resolve to), or when it declares additional public names, which
        // copy signatures from other files.
        const reusable =
          cached !== undefined &&
          !session!.dirty.has(input.sourceFile) &&
          !cached.volatile &&
          cached.routeKey === exportKeyOf(input, index, routes);
        const draft = reusable ? cached : renderLibrary(input, index, options, routes);
        session?.cache.set(input.sourceFile, draft);
        drafts.set(input.sourceFile, draft);
      }
      if (session) {
        const live = new Set(inputs.map((input) => input.sourceFile));
        for (const file of [...session.cache.keys()]) if (!live.has(file)) session.cache.delete(file);
      }
      // The shared support library exists only if some library used it.
      const usesSupport = [...drafts.values()].some((draft) =>
        draft.reExports.some((directive) => directive.targetFile === SUPPORT_LIBRARY),
      );
      if (usesSupport) {
        drafts.set(SUPPORT_LIBRARY, {
          content: `${renderSupportLibrary().replace(/\n$/, "")}\n`,
          diagnostics: [],
          publicNames: new Set(SUPPORT_PUBLIC_NAMES),
          reExports: [],
          comments: [],
          volatile: false,
          routeKey: "",
        });
      }
      const hidden = resolveExports(drafts);
      const result = new Map<string, RenderedLibrary>();
      for (const [file, draft] of drafts) {
        const exportLines = [
          ...draft.reExports
            .map((directive) => formatExport(directive, hidden.get(file)?.get(directive.uri) ?? []))
            .filter((line): line is string => line !== undefined),
          ...draft.comments,
        ];
        result.set(file, {
          content: draft.content.replace(
            EXPORTS_MARKER,
            exportLines.length > 0 ? `\n${exportLines.join("\n")}` : "",
          ),
          diagnostics: draft.diagnostics,
        });
      }
      return result;
    },
  };
}

const EXPORTS_MARKER = "\uE010EXPORTS\uE011";

interface LibraryDraft extends RenderedLibrary {
  publicNames: Set<string>;
  reExports: ReExport[];
  /** Lines after the `export` directives (`export * as ns` pointers, HD-19). */
  comments: string[];
  /** States public names, which depend on other files: never served from the cache. */
  volatile: boolean;
  /** What the route plan said about this library when it was rendered. */
  routeKey: string;
}

function formatExport(directive: ReExport, hide: readonly string[]): string | undefined {
  if (directive.show) {
    const shown = directive.show.filter((name) => !hide.includes(name));
    return shown.length > 0 ? `export '${directive.uri}' show ${shown.join(", ")};` : undefined;
  }
  return hide.length > 0
    ? `export '${directive.uri}' hide ${[...hide].sort().join(", ")};`
    : `export '${directive.uri}';`;
}

/**
 * Computes `hide` lists so no library exports one name from two different
 * declarations — a Dart error (`AMBIGUOUS_EXPORT`). This matches TypeScript,
 * where a name supplied by two `export *` sources is simply not exported.
 */
function resolveExports(
  drafts: ReadonlyMap<string, LibraryDraft>,
): Map<string, Map<string, string[]>> {
  const hidden = new Map<string, Map<string, string[]>>();
  const memo = new Map<string, Map<string, Set<string>>>();
  const active = new Set<string>();

  const exportsOf = (file: string): Map<string, Set<string>> => {
    const cached = memo.get(file);
    if (cached) return cached;
    const draft = drafts.get(file);
    const own = new Map<string, Set<string>>();
    for (const name of draft?.publicNames ?? []) own.set(name, new Set([file]));
    if (!draft || active.has(file)) return own;
    active.add(file);

    const provided = draft.reExports.map((directive) => {
      const names = new Map<string, Set<string>>();
      for (const [name, origins] of exportsOf(directive.targetFile)) {
        if (directive.show && !directive.show.includes(name)) continue;
        names.set(name, origins);
      }
      return names;
    });
    const origins = new Map<string, Set<string>>();
    const sources = new Map<string, number>();
    for (const [name, from] of own) origins.set(name, new Set(from));
    for (const names of provided) {
      for (const [name, from] of names) {
        const set = origins.get(name) ?? new Set<string>();
        from.forEach((origin) => set.add(origin));
        origins.set(name, set);
        sources.set(name, (sources.get(name) ?? 0) + 1);
      }
    }
    const ambiguous = new Set(
      [...origins].filter(([name, from]) => from.size > 1 || (own.has(name) && sources.has(name))).map(([name]) => name),
    );
    const hides = new Map<string, string[]>();
    draft.reExports.forEach((directive, i) => {
      const hide = [...provided[i].keys()].filter((name) => ambiguous.has(name));
      if (hide.length > 0) hides.set(directive.uri, hide);
    });
    if (hides.size > 0) hidden.set(file, hides);

    const result = new Map(own);
    for (const names of provided) {
      for (const [name, from] of names) {
        if (!ambiguous.has(name)) result.set(name, from);
      }
    }
    active.delete(file);
    memo.set(file, result);
    return result;
  };

  for (const file of [...drafts.keys()].sort()) exportsOf(file);
  return hidden;
}

function renderLibrary(
  input: LibraryInput,
  index: ProgramIndex,
  options: PackageJsOptions,
  routes: RoutePlan,
): LibraryDraft {
  const plan = new LibraryPlan(input.outputPath);
  const root = umdRootOf(input.program, input.sourceFile) ?? options.jsRoot;
  const context: EmitContext = {
    plan,
    index,
    file: input.sourceFile,
    scope: new Map(),
    outputPath: input.outputPath,
    routes,
    ...(root ? { jsRoot: root } : {}),
    ...(input.supportPath ? { shared: { path: input.supportPath, used: new Set<string>() } } : {}),
  };
  const diagnostics: BackendDiagnostic[] = [...routes.conflictsOf(input.sourceFile)];

  const facets = (symbols: readonly Symbol[]) =>
    symbols.flatMap((symbol) =>
      symbol.facets.filter((facet) => facet.emit).map((facet) => ({ symbol, facet })),
    );
  const declared = facets(input.symbols.filter((symbol) => !symbol.minted)).sort(
    (a, b) => a.facet.origin.sourceOrder - b.facet.origin.sourceOrder,
  );
  const minted = facets(input.symbols.filter((symbol) => symbol.minted)).sort((a, b) =>
    a.symbol.fqn.localeCompare(b.symbol.fqn),
  );

  const body: string[] = [];
  // Declarations no input exports, named in one diagnostic per library (HD-21):
  // a library such as three's `nodes/` can leave hundreds, and one line each
  // tells the user nothing the list does not.
  const unrouted = new Map<string, string>();
  const emitOne = ({ symbol, facet }: { symbol: Symbol; facet: SymbolFacet }) => {
    let emitted: EmittedDeclaration;
    if (routes.isMissing(symbol.fqn) && !unrouted.has(symbol.fqn)) {
      const bound = jsPath(facet, { ...context, currentFQN: symbol.fqn });
      unrouted.set(symbol.fqn, `${facet.ir.name} (${bound})`);
    }
    try {
      emitted = emitFacet(facet, context, symbol.fqn);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitted = {
        lines: [`// ERROR emitting ${symbol.fqn}: ${message}`],
        diagnostics: [],
      };
      diagnostics.push({
        code: "EMIT_ERROR",
        file: input.sourceFile,
        name: symbol.fqn,
        message,
      });
    }
    for (const line of emitted.lines) declareTopLevel(plan, line);
    if (emitted.lines.length > 0) body.push(...emitted.lines, "");
    for (const diagnostic of emitted.diagnostics) {
      diagnostics.push({ ...diagnostic, file: input.sourceFile });
    }
  };

  declared.forEach(emitOne);

  if (unrouted.size > 0) {
    const count = unrouted.size;
    diagnostics.push({
      code: "EXPORT_ROUTE_MISSING",
      file: input.sourceFile,
      name: input.sourceFile,
      message: `${count} declaration${count === 1 ? " is" : "s are"} not exported by any input file; ${count === 1 ? "it binds" : "each binds"} its own name: ${[...unrouted.values()].join(", ")}`,
    });
  }

  // Ambient modules whose specifier cannot be an `@JS` path bind bare globals
  // when nothing supplies a root (HD-20): said once per module.
  const unrooted = new Map<string, Set<string>>();
  if (!context.jsRoot) {
    for (const { symbol, facet } of declared) {
      const scope = facet.origin.scopes[0];
      if (scope?.kind !== "externalModule" || isJsPropertyPath(scope.specifier)) continue;
      if (!needsRuntimePath(symbol)) continue;
      const names = unrooted.get(scope.specifier) ?? new Set<string>();
      names.add(symbol.fqn);
      unrooted.set(scope.specifier, names);
    }
  }
  for (const [specifier, names] of [...unrooted].sort(([a], [b]) => a.localeCompare(b))) {
    diagnostics.push({
      code: "AMBIENT_MODULE_UNROOTED",
      file: input.sourceFile,
      name: specifier,
      message: `ambient module "${specifier}" has no JavaScript global to bind under: its ${names.size} value(s) bind bare globals; pass --js-root <global> to bind them under one`,
    });
  }

  // The public names of this library's module that are not its declarations'
  // own names (HD-18), and the namespace re-exports Dart cannot forward (HD-19).
  const names = planPublicNames(input, index, context);
  for (const line of names.aliasLines) declareTopLevel(plan, line);
  body.push(...names.aliasLines);
  diagnostics.push(...names.diagnostics);

  if (minted.length > 0) {
    body.push(...TYPE_DEFINITIONS_HEADER, "");
    minted.forEach(emitOne);
  }

  const directives = names.directives;
  // A library that uses shared support names re-exports them, so users get
  // `Promise` and its `toFuture` extension from the library they import.
  if (context.shared && context.shared.used.size > 0) {
    directives.push({
      uri: siblingUri(input.outputPath, context.shared.path),
      targetFile: SUPPORT_LIBRARY,
      show: [...new Set([...context.shared.used].flatMap(supportExports))].sort(),
    });
    directives.sort((a, b) => a.uri.localeCompare(b.uri));
  }
  const finished = plan.finish(
    body.join("\n").replace(/\n+$/, ""),
    minted.length > 0 ? [] : TYPE_DEFINITIONS_HEADER,
  );

  const header = [
    `// Generated by dart_bindgen from ${basename(input.sourceFile)}`,
    "// Do not edit directly",
    "",
    "@JS()",
    `library ${libraryName(input.sourceFile)};`,
    "",
    "import 'package:js/js.dart';",
    ...finished.imports,
    EXPORTS_MARKER,
    "",
  ];
  const content = `${[...header, finished.body].join("\n").replace(/\n+$/, "")}\n`
    .replace(`${EXPORTS_MARKER}\n`, EXPORTS_MARKER);
  const publicNames = new Set<string>();
  for (const line of finished.body.split("\n")) {
    declareTopLevel({ declare: (name) => publicNames.add(name) }, line);
  }
  for (const name of [...publicNames]) if (name.startsWith("_")) publicNames.delete(name);
  return {
    content,
    diagnostics,
    publicNames,
    reExports: directives,
    comments: names.comments,
    // An additional public name copies a signature from the declaration's own
    // file, so such a library is never served from the cache.
    volatile: names.aliasLines.length > 0,
    routeKey: exportKeyOf(input, index, routes),
  };
}

/**
 * Everything the export graph contributes to one library besides its own text:
 * its declarations' runtime paths, what its export lists resolve to, and the
 * Dart names those resolve to (the `show` lists spell them).
 */
function exportKeyOf(input: LibraryInput, index: ProgramIndex, routes: RoutePlan): string {
  const key = routes.keyOf(input.sourceFile);
  if (input.moduleExports.length === 0) return key;
  const dartNames = input.moduleExports.flatMap((record) =>
    record.kind === "named"
      ? (record.resolvedElements ?? []).flatMap((element) =>
          element.fqns.map((fqn) =>
            (index.symbols.get(fqn) ?? []).flatMap((symbol) =>
              symbol.facets.filter((facet) => facet.emit).map((facet) => facet.ir.dartName ?? facet.ir.name),
            ),
          ),
        )
      : [],
  );
  return JSON.stringify([key, input.moduleExports, dartNames]);
}

function emitFacet(
  facet: SymbolFacet,
  context: EmitContext,
  fqn: string,
): EmittedDeclaration {
  if (facet.ir.modifiers.isAnonymousDefault) return emitAnonymousDefault(facet);
  // §5.11: an alias that solely owns an object literal is emitted as the class.
  if (context.index.isOwningAlias(facet)) return { lines: [], diagnostics: [] };
  const owner = context.index.aliasOwnerOf(fqn);
  if (owner) {
    facet = {
      ...facet,
      ir: {
        ...facet.ir,
        dartName: owner.ir.dartName ?? owner.ir.name,
        ...(owner.ir.jsDoc ? { jsDoc: owner.ir.jsDoc } : {}),
      },
    };
  }
  // The declaration's FQN decides its runtime path, so every kind carries it.
  const scoped = { ...context, currentFQN: fqn };
  switch (facet.ir.kind) {
    case IRDeclKind.Class:
      return emitClass(facet, scoped);
    case IRDeclKind.Interface:
      return sdkAugmentation(facet) ? emitAugmentation(facet, scoped) : emitInterface(facet, scoped);
    case IRDeclKind.Function:
      return emitFunction(facet, scoped);
    case IRDeclKind.Variable:
      return emitVariable(facet, scoped);
    case IRDeclKind.TypeAlias:
      return emitTypeAlias(facet, scoped);
    case IRDeclKind.Enum:
      return emitEnum(facet, scoped);
  }
}

/** Records the top-level names an emitted declaration introduces. */
function declareTopLevel(plan: Pick<LibraryPlan, "declare">, line: string): void {
  const patterns = [
    /^(?:abstract )?class ([A-Za-z_$][\w$]*)/,
    /^typedef ([A-Za-z_$][\w$]*)/,
    /^extension ([A-Za-z_$][\w$]*)/,
    /^external .*\bget ([A-Za-z_$][\w$]*);$/,
    /^external set ([A-Za-z_$][\w$]*)\(/,
  ];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      plan.declare(match[1]);
      return;
    }
  }
  if (line.startsWith("external ")) {
    // `external <type> name<T>(...)`: the identifier before the parameter list
    // at bracket depth zero.
    let depth = 0;
    for (let i = "external ".length; i < line.length; i++) {
      const char = line[i];
      if (char === "<") depth++;
      else if (char === ">") depth--;
      else if (char === "(" && depth === 0) {
        const head = line.slice(0, i).replace(/<[^<>]*(?:<[^<>]*>[^<>]*)*>$/, "");
        const match = head.match(/([A-Za-z_$][\w$]*)$/);
        if (match && !/Function$/.test(head)) plan.declare(match[1]);
        return;
      }
    }
  }
}

/** A keyword-safe library identifier (`E-33`). */
export function libraryName(sourceFile: string): string {
  let fileName = basename(sourceFile);
  if (isDeclarationFileName(fileName)) fileName = stripDeclarationSuffix(fileName);
  else if (fileName.endsWith(".ts")) fileName = fileName.slice(0, -3);
  else fileName = fileName.replace(extname(fileName), "");
  const sanitized = fileName.replace(/[^a-zA-Z0-9]/g, "_");
  if (/^[a-zA-Z_]/.test(sanitized) && !DART_RESERVED_WORDS.has(sanitized)) {
    return sanitized;
  }
  return `dartify_${sanitized || "bindings"}`;
}
