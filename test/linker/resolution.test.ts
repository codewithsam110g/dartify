import { describe, expect, test } from "vitest";
import { renderTestProject, withTestProject } from "./test-project";

describe("S2 project resolution", () => {
  test("resolves a bare module to one explicit declaration input", async () => {
    await withTestProject(
      {
        "geojson.d.ts": "export interface Feature {}",
        "leaflet.d.ts":
          'import * as geojson from "geojson"; export interface Layer { feature: geojson.Feature }',
      },
      ({ analysis, files }) => {
        expect(analysis.resolution.unresolved).toEqual([]);
        expect(analysis.resolution.fallbacks).toEqual([
          expect.objectContaining({
            specifier: "geojson",
            resolvedFile: files.get("geojson.d.ts"),
            strategy: "explicitInput",
          }),
        ]);
        expect(analysis.link.broken).toBe(0);
      },
    );
  });

  test("does not choose between ambiguous explicit inputs", async () => {
    await withTestProject(
      {
        "a/foo.d.ts": "export interface A {}",
        "b/foo.d.ts": "export interface B {}",
        "use.d.ts": 'import * as foo from "foo"; export type T = foo.A;',
      },
      ({ analysis }) => {
        expect(analysis.resolution.unresolved).toEqual([
          expect.objectContaining({
            specifier: "foo",
            reason: "ambiguousExplicitInput",
            candidates: expect.arrayContaining([
              expect.stringContaining("/a/foo.d.ts"),
              expect.stringContaining("/b/foo.d.ts"),
            ]),
          }),
        ]);
      },
    );
  });

  test("uses the common input ancestor and preserves sibling paths", async () => {
    const report = await renderTestProject({
      "a/x.d.ts": "export interface A {}",
      "b/x.d.ts": "export interface B {}",
    });
    expect([...report.files.keys()].sort()).toEqual([
      expect.stringMatching(/[\\/]out[\\/]a[\\/]x\.dart$/),
      expect.stringMatching(/[\\/]out[\\/]b[\\/]x\.dart$/),
    ]);
  });

  test("treats an explicit tsconfig module policy as authoritative", async () => {
    await withTestProject(
      {
        "base.d.ts": "export interface Base {}",
        "derived.d.ts":
          'import { Base } from "./base"; export interface Derived { base: Base }',
      },
      ({ analysis }) => {
        expect(
          analysis.resolution.unresolved.map((issue) => issue.specifier),
        ).toContain("./base");
        expect(analysis.resolution.fallbacks).toEqual([]);
      },
      {
        tsConfig: {
          compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            moduleResolution: "NodeNext",
          },
        },
      },
    );
  });
});
