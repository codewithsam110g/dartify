import { readFileSync } from "fs";
import { describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";
import { normalizeDart } from "./normalize";

/**
 * The real-consumer gate (D-15): the js_facade_gen output that ships
 * in the h3 Dart package. Every declaration it contains must normalize
 * identically from dartify's h3 bindings — drop-in replacement, demonstrated.
 * dartify's own additions (newer h3-js APIs, named degradations, dartdoc) are
 * extra and not compared.
 */
describe("h3 golden (js_facade_gen as shipped)", () => {
  test("every shipped declaration is reproduced", async () => {
    const options = { ignoreDocs: true, inlineTypedefs: true };
    const golden = normalizeDart(readFileSync("def_files/h3/h3_web.golden.dart", "utf8"), options);
    const rendered = await new Transpiler({ files: ["def_files/h3/h3.d.ts"] }).render();
    const ours = normalizeDart([...rendered.files.values()][0].content, options);

    const differences = [...golden]
      .filter(([name, lines]) => JSON.stringify(ours.get(name)) !== JSON.stringify(lines))
      .map(([name, lines]) => ({ name, golden: lines, dartify: ours.get(name) }));
    expect(golden.size).toBe(63);
    expect(differences).toEqual([]);
  });
});
