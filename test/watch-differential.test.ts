import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { afterAll, describe, expect, test } from "vitest";
import { Transpiler } from "../src/transpiler";
import { WatchBuild, WatchSession } from "../src/watch";
import { LinkReport } from "../src/engine/phase/linkerPhase";

/**
 * Differential test for watch mode: after every simulated edit the
 * incremental build must equal a fresh cold compilation of the same files —
 * every Dart output byte for byte, the linked IR, and the link report.
 */

const FIXTURE = resolve("def_files/synthetic/watch");
const GLOBALS_FIXTURE = resolve("def_files/synthetic/watch_globals");
const INPUTS = ["base.d.ts", "derived.d.ts", "grand.d.ts", "other.d.ts", "barrel.d.ts", "script.d.ts"];

function canonical(value: unknown): string {
  return JSON.stringify(value, (_, inner) => {
    if (inner instanceof Map) return Object.fromEntries([...inner].sort(([a], [b]) => String(a).localeCompare(String(b))));
    if (inner instanceof Set) return [...inner].sort();
    if (typeof inner === "bigint") return `${inner}n`;
    return inner;
  });
}

function reportView(report: LinkReport): unknown {
  return {
    edges: report.edges,
    results: report.results,
    diagnostics: report.diagnostics,
    moduleExportDiagnostics: report.moduleExportDiagnostics,
    valid: report.valid,
    broken: report.broken,
    aliasesMinted: report.aliasesMinted,
    aliasUseSites: report.aliasUseSites,
    semantic: report.semantic,
  };
}

interface Edit {
  name: string;
  file: string;
  apply: (text: string) => string;
  /** Files the edit creates (they become part of the program via imports). */
  creates?: Record<string, string>;
}

const replace = (from: string | RegExp, to: string) => (text: string) => {
  const next = text.replace(from, to);
  if (next === text) throw new Error(`edit did not apply: ${String(from)}`);
  return next;
};

const EDITS: Edit[] = [
  { name: "inheritance: add a member to the root class", file: "base.d.ts", apply: replace("  name: string;\n", "  name: string;\n  age: number;\n") },
  { name: "generics: change a default type argument", file: "base.d.ts", apply: replace("Animal<T = string>", "Animal<T = number>") },
  { name: "inheritance: widen an overridden method", file: "base.d.ts", apply: replace("feed(food: T): void;", "feed(food: T, extra?: string): void;") },
  { name: "typeof: change a const's literal type", file: "base.d.ts", apply: replace("LIMIT: 10;", 'LIMIT: "ten";') },
  { name: "typeof: change an enum member value", file: "base.d.ts", apply: replace("High = 4,", "High = 7,") },
  { name: "merging: add a reopened interface", file: "base.d.ts", apply: (text) => `${text}\nexport interface Config {\n  c: boolean;\n}\n` },
  { name: "merging: remove a reopened interface", file: "base.d.ts", apply: replace("export interface Config {\n  b: number;\n}\n", "") },
  {
    name: "merging: remove the constructor companion",
    file: "base.d.ts",
    apply: replace(/export declare var Widget: \{[\s\S]*?\};\n/, ""),
  },
  {
    name: "merging: restore the constructor companion",
    file: "base.d.ts",
    apply: (text) => `${text}\nexport declare var Widget: {\n  new (label: string): WidgetType;\n  prototype: WidgetType;\n};\n`,
  },
  { name: "generics: tighten a bound and default", file: "derived.d.ts", apply: replace("Box<T extends Shape = Shape>", "Box<T extends Bone = Bone>") },
  { name: "inheritance: change a heritage clause", file: "derived.d.ts", apply: replace("extends Animal<Bone>", "extends Animal<Shape>") },
  { name: "binding: rename a root interface", file: "base.d.ts", apply: replace("export interface Shape {", "export interface Shape2 {") },
  { name: "binding: rename it back", file: "base.d.ts", apply: replace("export interface Shape2 {", "export interface Shape {") },
  { name: "re-exports: a second source supplies Bone", file: "other.d.ts", apply: (text) => `${text}\nexport interface Bone {\n  other: true;\n}\n` },
  { name: "re-exports: drop a star re-export", file: "barrel.d.ts", apply: replace('export * from "./other";\n', "") },
  { name: "re-exports: restore it", file: "barrel.d.ts", apply: replace('export * from "./derived";\n', 'export * from "./derived";\nexport * from "./other";\n') },
  { name: "globals: edit the script file", file: "script.d.ts", apply: replace("  x: number;\n", "  x: number;\n  y: string;\n") },
  { name: "locations: shift every line of a file", file: "derived.d.ts", apply: (text) => `\n\n// moved\n\n${text}` },
  { name: "inheritance: edit the grandchild", file: "grand.d.ts", apply: replace("play(): void;", "play(speed: number): void;") },
  {
    name: "files: import a new file",
    file: "derived.d.ts",
    creates: { "extra.d.ts": "export interface Extra {\n  e: number;\n}\n" },
    apply: (text) => `import { Extra } from "./extra";\n${text}\nexport declare function extra(): Extra;\n`,
  },
  { name: "files: edit the new file", file: "extra.d.ts", apply: replace("  e: number;\n", "  e: number;\n  f?: string;\n") },
  // Syntax errors are generation failures in both modes (HD-13): the same
  // failures, in the same order, and no writes.
  { name: "syntax: break an imported dependency", file: "extra.d.ts", apply: (text) => `${text}export declare function broken(x: number: string;\n` },
  { name: "syntax: break an input as well", file: "other.d.ts", apply: (text) => `${text}export interface Open { a: string\n` },
  { name: "syntax: repair the dependency", file: "extra.d.ts", apply: replace("export declare function broken(x: number: string;\n", "") },
  { name: "syntax: repair the input", file: "other.d.ts", apply: replace("export interface Open { a: string\n", "") },
  {
    name: "files: stop importing it",
    file: "derived.d.ts",
    apply: (text) => text.replace('import { Extra } from "./extra";\n', "").replace("export declare function extra(): Extra;\n", ""),
  },
  { name: "kinds: an interface becomes a class", file: "base.d.ts", apply: replace("export interface Shape {\n  id: string;\n}", "export declare class Shape {\n  id: string;\n}") },
  { name: "typeof: a const becomes a variable", file: "base.d.ts", apply: replace('export declare const LIMIT: "ten";', "export declare let LIMIT: number;") },
  {
    name: "structural: add a shape a class satisfies",
    file: "other.d.ts",
    apply: (text) => `${text}\nexport interface Named {\n  readonly name: string;\n  readonly id?: string;\n}\n`,
  },
  { name: "structural: the shape grows past the class", file: "other.d.ts", apply: replace("  readonly id?: string;\n", "  readonly id?: string;\n  readonly extra: number;\n") },
  { name: "structural: the class grows to fit again", file: "base.d.ts", apply: replace("  name: string;\n", "  name: string;\n  extra: number;\n  id?: string;\n") },
  { name: "no-op: identical rewrite", file: "base.d.ts", apply: (text) => text },
];

/**
 * Edits to export lists. They change other files' output without touching
 * those files (a name's runtime path comes from whoever exports it, a public
 * name is declared from the declaration it points at), which is what a cache
 * keyed on the edited file alone would get wrong (HD-17, HD-18, D-16).
 */
const EXPORT_EDITS: Edit[] = [
  // The barrel already star-exports `unbox`; a name that sorts before it takes over as the path.
  { name: "exports: a re-export under a second name is added", file: "barrel.d.ts", apply: (text) => `${text}export { unbox as aaUnbox } from "./derived";\n` },
  { name: "exports: the public name is renamed", file: "barrel.d.ts", apply: replace("unbox as aaUnbox", "unbox as aaUnboxed") },
  {
    name: "exports: a new file re-exports that name, two hops from the declaration",
    file: "grand.d.ts",
    creates: { "chain.d.ts": 'export { aaUnboxed as viaChain } from "./barrel";\n' },
    apply: (text) => `${text}export * from "./chain";\n`,
  },
  { name: "exports: the signature behind a second binding changes", file: "derived.d.ts", apply: replace("export declare function unbox<T extends Shape>(box: Box<T>): T;", "export declare function unbox<T extends Shape>(box: Box<T>, strict?: boolean): T;") },
  { name: "exports: a type gets a second public name", file: "barrel.d.ts", apply: (text) => `${text}export { Shape as Form } from "./base";\n` },
  { name: "exports: that name is renamed", file: "barrel.d.ts", apply: replace("Shape as Form", "Shape as Figure") },
  { name: "exports: the declaration changes under it", file: "base.d.ts", apply: replace("export interface Shape {\n  id: string;\n}", "export interface Shape {\n  id: string;\n  tag?: number;\n}") },
  { name: "exports: an import is exported (import, then export)", file: "barrel.d.ts", apply: (text) => `import { Level } from "./base";\n${text}export { Level as Tier };\n` },
  { name: "exports: a declaration is exported only under an alias", file: "other.d.ts", apply: (text) => `${text}declare function secret(): void;\nexport { secret as revealed };\n` },
  { name: "exports: that alias is renamed", file: "other.d.ts", apply: replace("secret as revealed", "secret as shown") },
  { name: "exports: a namespace re-export is added", file: "barrel.d.ts", apply: (text) => `${text}export * as inner from "./other";\n` },
  { name: "exports: the namespace re-export is removed", file: "barrel.d.ts", apply: replace('export * as inner from "./other";\n', "") },
  { name: "exports: the renamed re-export is removed", file: "barrel.d.ts", apply: replace('export { unbox as aaUnboxed } from "./derived";\n', "") },
  { name: "exports: the import-then-export is removed", file: "barrel.d.ts", apply: (text) => text.replace('import { Level } from "./base";\n', "").replace("export { Level as Tier };\n", "") },
  { name: "exports: a default export is added to an input", file: "other.d.ts", apply: (text) => `${text}export default function entry(): void;\n` },
  { name: "exports: the alias-only declaration is removed", file: "other.d.ts", apply: (text) => text.replace("declare function secret(): void;\n", "").replace("export { secret as shown };\n", "") },
];

describe("watch mode equals a cold compilation after every edit", () => {
  const roots: string[] = [];
  afterAll(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

  async function expectEquivalent(build: WatchBuild, files: string[], outDir: string, label: string, jsRoot?: string) {
    const options = { files, outDir, ...(jsRoot ? { jsRoot } : {}) };
    const fresh = await new Transpiler(options).render();
    const freshProgram = (await new Transpiler(options).analyzeProgram()).program;
    const dart = (map: Map<string, { content: string }>) =>
      Object.fromEntries([...map].map(([path, file]) => [path, file.content]).sort());
    expect(dart(build.files), `${label}: Dart output`).toEqual(dart(fresh.files));
    expect(canonical(build.program.symbols), `${label}: linked IR`).toBe(canonical(freshProgram.symbols));
    expect(canonical(reportView(build.analysis.link)), `${label}: link report`).toBe(
      canonical(reportView(fresh.analysis.link)),
    );
    // The export graph's product: the same routes and public names either way.
    expect(canonical(build.program.moduleExports), `${label}: export graph`).toBe(
      canonical(freshProgram.moduleExports),
    );
    const diagnostics = (map: Map<string, { diagnostics: unknown[] }>) =>
      Object.fromEntries([...map].map(([path, file]) => [path, file.diagnostics]).sort());
    expect(diagnostics(build.files), `${label}: backend diagnostics`).toEqual(diagnostics(fresh.files));
    expect(build.analysis.generation, `${label}: generation diagnostics`).toEqual(fresh.analysis.generation);
  }

  test("the scripted edit sequence", async () => {
    const root = mkdtempSync(join(tmpdir(), "dartify-differential-"));
    roots.push(root);
    cpSync(FIXTURE, root, { recursive: true });
    const files = INPUTS.map((name) => join(root, name));
    const outDir = join(root, "out");
    const session = new WatchSession({ files, outDir });

    await expectEquivalent(await session.build(), files, outDir, "initial build");
    for (const edit of EDITS) {
      for (const [name, content] of Object.entries(edit.creates ?? {})) {
        writeFileSync(join(root, name), content);
      }
      const path = join(root, edit.file);
      expect(existsSync(path), edit.name).toBe(true);
      writeFileSync(path, edit.apply(readFileSync(path, "utf8")));
      const build = await session.build([path, ...Object.keys(edit.creates ?? {}).map((name) => join(root, name))]);
      await expectEquivalent(build, files, outDir, edit.name);
    }
  }, 120_000);

  async function runExportEdits(jsRoot: string | undefined) {
    const root = mkdtempSync(join(tmpdir(), "dartify-differential-exports-"));
    roots.push(root);
    cpSync(FIXTURE, root, { recursive: true });
    const files = INPUTS.map((name) => join(root, name));
    const outDir = join(root, "out");
    const session = new WatchSession({ files, outDir, ...(jsRoot ? { jsRoot } : {}) });
    await expectEquivalent(await session.build(), files, outDir, "initial build", jsRoot);
    for (const edit of EXPORT_EDITS) {
      for (const [name, content] of Object.entries(edit.creates ?? {})) writeFileSync(join(root, name), content);
      const path = join(root, edit.file);
      writeFileSync(path, edit.apply(readFileSync(path, "utf8")));
      const changed = [path, ...Object.keys(edit.creates ?? {}).map((name) => join(root, name))];
      await expectEquivalent(await session.build(changed), files, outDir, edit.name, jsRoot);
    }
  }

  test("export-list edits, with a root", async () => {
    await runExportEdits("Root");
  }, 120_000);

  test("export-list edits, without a root", async () => {
    await runExportEdits(undefined);
  }, 120_000);

  /**
   * Global declarations merged across files (HD-06): the owner is the first
   * declaring file in the run's file order, so a part added, a member changed
   * or an owner removed moves what every other file emits. The session names
   * its inputs by glob so the edits can add and delete whole files.
   */
  test("global merge edits: parts added, owners removed, members changed", async () => {
    const root = mkdtempSync(join(tmpdir(), "dartify-differential-globals-"));
    roots.push(root);
    cpSync(GLOBALS_FIXTURE, root, { recursive: true });
    const files = [join(root, "*.d.ts")];
    const outDir = join(root, "out");
    const session = new WatchSession({ files, outDir });

    const write = (name: string, text: string) => writeFileSync(join(root, name), text);
    const edit = (name: string, apply: (text: string) => string) =>
      write(name, apply(readFileSync(join(root, name), "utf8")));
    const remove = (name: string) => unlinkSync(join(root, name));
    const settingsOf = (member: string) => replace("interface Settings {\n", `interface Settings {\n  ${member}\n`);

    const edits: { name: string; run: () => void; touched: string[] }[] = [
      {
        name: "a third part is added (sorts last)",
        run: () => write("z_extra.d.ts", "interface Settings {\n  extra: boolean;\n}\ndeclare function useExtra(s: Settings): void;\n"),
        touched: ["z_extra.d.ts"],
      },
      { name: "a member is added to a non-owner part", run: () => edit("b.d.ts", settingsOf("y: string;")), touched: ["b.d.ts"] },
      { name: "a member is added to the owner part", run: () => edit("a.d.ts", settingsOf("age: number;")), touched: ["a.d.ts"] },
      {
        name: "a part is added that sorts first (ownership moves to it)",
        run: () => write("0_first.d.ts", "interface Settings {\n  first: number;\n}\ndeclare var marker: number;\n"),
        touched: ["0_first.d.ts"],
      },
      {
        name: "the owner's part is removed (ownership moves on)",
        run: () => edit("0_first.d.ts", replace("interface Settings {\n  first: number;\n}\n", "")),
        touched: ["0_first.d.ts"],
      },
      { name: "the owner file is deleted", run: () => remove("a.d.ts"), touched: ["a.d.ts"] },
      {
        name: "the owner file is restored",
        run: () =>
          write(
            "a.d.ts",
            "interface Settings {\n  theme: string;\n}\ndeclare function configure(s: Settings): void;\ndeclare namespace NS {\n  interface Opt {\n    a: number;\n  }\n}\n",
          ),
        touched: ["a.d.ts"],
      },
      {
        name: "the declare global part changes",
        run: () => edit("m.d.ts", replace("    locale: string;\n", "    locale: string;\n    region?: string;\n")),
        touched: ["m.d.ts"],
      },
      {
        name: "the module stops declaring a global",
        run: () => edit("m.d.ts", replace(/declare global \{[\s\S]*?\n\}\n/, "")),
        touched: ["m.d.ts"],
      },
      {
        name: "the module declares it again",
        run: () => edit("m.d.ts", (text) => `${text}declare global {\n  interface Settings {\n    locale: string;\n  }\n}\n`),
        touched: ["m.d.ts"],
      },
      {
        name: "a same-named value in another file joins the symbol",
        run: () => write("v.d.ts", "declare var Settings: { defaults(): Settings; LEVEL: number };\n"),
        touched: ["v.d.ts"],
      },
      { name: "that value is deleted", run: () => remove("v.d.ts"), touched: ["v.d.ts"] },
      {
        name: "an overload is added in a third file",
        run: () => edit("z_extra.d.ts", (text) => `${text}declare function configure(s: Settings, n: number, m: number): void;\n`),
        touched: ["z_extra.d.ts"],
      },
      {
        name: "an ordinary module changes",
        run: () => edit("plain.d.ts", replace("export declare function plain", "export declare function other(): void;\nexport declare function plain")),
        touched: ["plain.d.ts"],
      },
      { name: "identical rewrite of the owner", run: () => edit("a.d.ts", (text) => text), touched: ["a.d.ts"] },
    ];

    await expectEquivalent(await session.build(), files, outDir, "initial build");
    for (const step of edits) {
      step.run();
      const build = await session.build(step.touched.map((name) => join(root, name)));
      await expectEquivalent(build, files, outDir, step.name);
    }
  }, 120_000);

  /** Edits real corpora, comparing every incremental build with a cold one. */
  async function runCorpus(source: string, inputs: string[], edits: Edit[]) {
    const root = mkdtempSync(join(tmpdir(), "dartify-differential-corpus-"));
    roots.push(root);
    cpSync(resolve(source), root, { recursive: true });
    const files = inputs.map((name) => join(root, name));
    const outDir = join(root, "out");
    const session = new WatchSession({ files, outDir, write: false });
    await session.build();
    for (const edit of edits) {
      const path = join(root, edit.file);
      writeFileSync(path, edit.apply(readFileSync(path, "utf8")));
      await expectEquivalent(await session.build([path]), files, outDir, edit.name);
    }
  }

  test("Leaflet edit sequence", async () => {
    await runCorpus("def_files/leaflet", ["leaflet.d.ts", "geojson.d.ts"], [
      { name: "inheritance: member on the Layer base class", file: "leaflet.d.ts", apply: replace("export class Layer extends Evented {", "export class Layer extends Evented {\n    benchmarkMember?: number;") },
      { name: "merging: reopen LatLngLiteral", file: "leaflet.d.ts", apply: (text) => `${text}\nexport interface LatLngLiteral {\n    extra?: number;\n}\n` },
      { name: "overloads: delete the first latLng overload", file: "leaflet.d.ts", apply: replace("export function latLng(latitude: number, longitude: number, altitude?: number): LatLng;\n", "") },
      { name: "typeof: add a const and a typeof use", file: "leaflet.d.ts", apply: (text) => `${text}\nexport const ZOOM: 3;\nexport function zoom(): typeof ZOOM;\n` },
      { name: "typeof: change the const", file: "leaflet.d.ts", apply: replace("export const ZOOM: 3;", 'export const ZOOM: "far";') },
      { name: "inheritance across files: GeoJsonObject member", file: "geojson.d.ts", apply: replace("export interface GeoJsonObject {", "export interface GeoJsonObject {\n    extra?: string;") },
    ]);
  }, 180_000);

  // ~15 s of cold three.js compilations: `pnpm test:incremental` and CI.
  test.skipIf(process.env.DARTIFY_INCREMENTAL !== "1")("three.js edit sequence", async () => {
    await runCorpus("def_files/three", ["src/Three.Core.d.ts"], [
      { name: "members: Vector3", file: "src/math/Vector3.d.ts", apply: replace("export class Vector3 {", "export class Vector3 {\n    benchmarkMember: number;") },
      { name: "inheritance: the Object3D root", file: "src/core/Object3D.d.ts", apply: replace("    name: string;\n", "    name: string;\n    benchmarkRootMember?: boolean;\n") },
      { name: "typeof: NearestFilter's literal", file: "src/constants.d.ts", apply: replace("export const NearestFilter: 1003;", "export const NearestFilter: 1004;") },
      { name: "re-exports: drop one from the barrel", file: "src/Three.Core.d.ts", apply: replace('export * from "./animation/AnimationAction.js";\n', "") },
    ]);
  }, 300_000);
});

