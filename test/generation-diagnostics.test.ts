import { existsSync } from "fs";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, test, vi } from "vitest";

// Force one statement kind to fail so the returned-diagnostic contract (`R-13`)
// is exercised end to end. No corpus file triggers a generation failure today.
vi.mock("../src/engine/parser/enum", () => ({
  parseEnum: () => {
    throw new Error("forced enum failure");
  },
}));

const { Transpiler } = await import("../src/transpiler");

describe("returned generation diagnostics (R-13)", () => {
  test("transpileFromString returns statement failures in errors", async () => {
    const result = await Transpiler.transpileFromString(
      "declare enum Broken { A }\ndeclare const fine: number;",
      { fileName: "/broken.d.ts" },
    );
    expect(result.errors.map((error) => error.code)).toEqual([
      "STATEMENT_DECLARATION_ERROR",
    ]);
    expect(result.errors[0].line).toBe(1);
    expect(result.content).toContain("fine");
  });

  test("analyze reports, render returns partial output, transpile writes nothing", async () => {
    const root = await mkdtemp(join(tmpdir(), "dartify-generation-"));
    try {
      const file = join(root, "broken.d.ts");
      await writeFile(file, "export declare enum Broken { A }\nexport declare const fine: number;\n");
      const transpiler = new Transpiler({ files: [file], outDir: join(root, "out") });

      const analysis = await transpiler.analyze();
      expect(analysis.generation).toHaveLength(1);
      expect(analysis.generation[0].message).toContain("forced enum failure");

      const rendered = await transpiler.render();
      expect([...rendered.files.values()][0].content).toContain("fine");

      await expect(transpiler.transpile()).rejects.toMatchObject({
        code: "GENERATION_FAILED",
      });
      expect(existsSync(join(root, "out"))).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
