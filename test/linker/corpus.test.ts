import { describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";

const ENABLED = process.env.DARTIFY_S2_CORPUS === "1";

describe.skipIf(!ENABLED)("S2 corpus gate", () => {
  test("leaflet resolves every module and reference", async () => {
    const analysis = await new Transpiler({
      files: [
        "def_files/leaflet/leaflet.d.ts",
        "def_files/leaflet/geojson.d.ts",
      ],
    }).analyze();

    expect(analysis.resolution.unresolved).toEqual([]);
    expect(analysis.resolution.fallbacks).toEqual([
      expect.objectContaining({
        specifier: "geojson",
        strategy: "explicitInput",
      }),
    ]);
    expect(analysis.link.broken).toBe(0);
    expect(
      analysis.link.edges.filter((edge) => edge.resolution.kind !== "resolved"),
    ).toEqual([]);
  }, 60_000);

  test("three.js has exact internal targets and exposes missing external types", async () => {
    const analysis = await new Transpiler({
      files: ["def_files/three/src/Three.Core.d.ts"],
    }).analyze();

    expect(
      analysis.resolution.unresolved.map((issue) => issue.specifier).sort(),
    ).toEqual(["@webgpu/types", "webxr"]);
    expect(analysis.link.diagnostics).toEqual([]);
    expect(
      analysis.link.edges.filter(
        (edge) => edge.resolution.kind === "ambiguous",
      ),
    ).toEqual([]);

    for (const symbols of analysis.link.results.keys()) {
      expect(symbols).toContain("::");
    }

    const missing = analysis.link.edges.filter(
      (edge) => edge.resolution.kind === "missing",
    );
    expect(missing.length).toBeGreaterThan(0);

    // The decisive L-01/L-14 invariant: every checker-backed successful use
    // site resolves to one of the checker-derived declaration identities.
    const { transpilerContext } = await import("../../src/context");
    for (const group of transpilerContext.symbolTable.getSymbolTable().values()) {
      for (const symbol of group) {
        for (const dependency of symbol.deps) {
          if (dependency.lookup.kind !== "checker") continue;
          expect(dependency.resolvedFQN).toBeDefined();
          expect(dependency.lookup.candidates).toContain(
            dependency.resolvedFQN,
          );
        }
      }
    }
  }, 60_000);
});
