import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
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
  {
    name: "files: stop importing it",
    file: "derived.d.ts",
    apply: (text) => text.replace('import { Extra } from "./extra";\n', "").replace("export declare function extra(): Extra;\n", ""),
  },
  { name: "kinds: an interface becomes a class", file: "base.d.ts", apply: replace("export interface Shape {\n  id: string;\n}", "export declare class Shape {\n  id: string;\n}") },
  { name: "typeof: a const becomes a variable", file: "base.d.ts", apply: replace('export declare const LIMIT: "ten";', "export declare let LIMIT: number;") },
  { name: "no-op: identical rewrite", file: "base.d.ts", apply: (text) => text },
];

describe("watch mode equals a cold compilation after every edit", () => {
  const roots: string[] = [];
  afterAll(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

  async function expectEquivalent(build: WatchBuild, files: string[], outDir: string, label: string) {
    const fresh = await new Transpiler({ files, outDir }).render();
    const freshProgram = (await new Transpiler({ files, outDir }).analyzeProgram()).program;
    const dart = (map: Map<string, { content: string }>) =>
      Object.fromEntries([...map].map(([path, file]) => [path, file.content]).sort());
    expect(dart(build.files), `${label}: Dart output`).toEqual(dart(fresh.files));
    expect(canonical(build.program.symbols), `${label}: linked IR`).toBe(canonical(freshProgram.symbols));
    expect(canonical(reportView(build.analysis.link)), `${label}: link report`).toBe(
      canonical(reportView(fresh.analysis.link)),
    );
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

