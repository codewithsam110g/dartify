import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { readdirSync, readFileSync } from "fs";
import { describe, expect, test } from "vitest";
import { Transpiler } from "../src/transpiler";
import { SymbolTable } from "../src/symbol/table";
import { IRInterface } from "../src/ir/interface";

/**
 * Task 4.11 acceptance: every invocation owns its compiler state (`R-14`,
 * `L-10`, `R-13`). There is no global context and no reset seam.
 */
async function withFiles<T>(
  sources: Record<string, string>,
  run: (files: Record<string, string>, root: string) => Promise<T>,
): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "dartify-isolation-"));
  try {
    const files: Record<string, string> = {};
    for (const [name, source] of Object.entries(sources)) {
      const file = join(root, name);
      await writeFile(file, source, "utf8");
      files[name] = file;
    }
    return await run(files, root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("4.11 run-owned pipeline state", () => {
  test("overlapping transpileFromString calls never observe each other", async () => {
    const pairs = Array.from({ length: 10 }, (_, index) => [
      Transpiler.transpileFromString(`declare var alpha${index}: number;`, {
        fileName: `/alpha${index}.d.ts`,
      }),
      Transpiler.transpileFromString(`declare var beta${index}: string;`, {
        fileName: `/beta${index}.d.ts`,
      }),
    ]);
    const results = await Promise.all(pairs.flat());
    results.forEach((result, position) => {
      const index = Math.floor(position / 2);
      const own = position % 2 === 0 ? `alpha${index}` : `beta${index}`;
      const other = position % 2 === 0 ? `beta${index}` : `alpha${index}`;
      expect(result.errors).toEqual([]);
      expect(result.content).toContain(own);
      expect(result.content).not.toContain(other);
    });
    // 20 concurrent runs share one event loop, and coverage instrumentation on
    // a 4-CPU CI runner measured 32.8 s against the 30 s global testTimeout.
    // The explicit budget is ~3.5x that; the work is not reduced.
  }, 120_000);

  test("overlapping analyze/render/transpile calls on one instance are independent", async () => {
    await withFiles(
      { "a.d.ts": "export interface A { value: string; }" },
      async (files, root) => {
        const transpiler = new Transpiler({
          files: [files["a.d.ts"]],
          outDir: join(root, "out"),
        });
        const [analysis, rendered, written, again] = await Promise.all([
          transpiler.analyze(),
          transpiler.render(),
          transpiler.transpile(),
          transpiler.analyze(),
        ]);
        expect(analysis.link.results.size).toBe(1);
        expect(again.link.results.size).toBe(1);
        expect(rendered.files.size).toBe(1);
        expect(written.writtenFiles).toHaveLength(1);
        expect(analysis.generation).toEqual([]);
      },
    );
  });

  test("overlapping instances over different inputs keep separate tables", async () => {
    await withFiles(
      {
        "left.d.ts": "export declare function left(): void;",
        "right.d.ts": "export declare function right(): void;",
      },
      async (files) => {
        const [left, right] = await Promise.all([
          new Transpiler({ files: [files["left.d.ts"]] }).render(),
          new Transpiler({ files: [files["right.d.ts"]] }).render(),
        ]);
        const leftDart = [...left.files.values()][0].content;
        const rightDart = [...right.files.values()][0].content;
        expect(leftDart).toContain("left");
        expect(leftDart).not.toContain("right");
        expect(rightDart).toContain("right");
        expect(rightDart).not.toContain("left");
      },
    );
  });

  test("the linked program is deeply detached from later runs and from consumers", async () => {
    const first = await Transpiler.transpileFromString(
      "interface Box { value: string; }",
      { fileName: "/box.d.ts" },
    );
    const symbols = first.program!.symbols;
    const facet = symbols.get("/box.d.ts::Box")![0].facets[0];
    (facet.ir as IRInterface).properties.length = 0;

    const second = await Transpiler.transpileFromString(
      "interface Box { value: string; }",
      { fileName: "/box.d.ts" },
    );
    const fresh = second.program!.symbols.get("/box.d.ts::Box")![0].facets[0]
      .ir as IRInterface;
    expect(fresh.properties).toHaveLength(1);
  });

  test("symbol table reads return deep copies and transactions roll back", () => {
    const table = new SymbolTable();
    const ir: IRInterface = {
      kind: "interface" as IRInterface["kind"],
      name: "A",
      modifiers: { exportKind: "none", isDeclare: true, isAmbient: true },
      typeParams: [],
      extends: [],
      properties: [],
      methods: [],
      callSignatures: [],
      constructSignatures: [],
      getAccessors: [],
      setAccessors: [],
      indexSignatures: [],
    };
    table.register("/a.d.ts::A", {
      fqn: "/a.d.ts::A",
      facets: [
        {
          type: 2,
          namespace: "type",
          ir,
          origin: { filePath: "/a.d.ts", scopes: [], sourceOrder: 0 },
          emit: true,
          provenance: [],
        },
      ],
      deps: [],
      resolvedDeps: [],
    });

    // The registered input is cloned on the way in.
    ir.name = "Mutated";
    const read = table.lookup("/a.d.ts::A")!;
    expect(read[0].facets[0].ir.name).toBe("A");

    // A nested mutation of a read is invisible to the table.
    (read[0].facets[0].ir as IRInterface).name = "Leaked";
    (read[0].deps as unknown[]).push({});
    expect(table.lookup("/a.d.ts::A")![0].facets[0].ir.name).toBe("A");
    expect(table.lookup("/a.d.ts::A")![0].deps).toEqual([]);

    // A throwing transaction commits nothing.
    expect(() =>
      table.transaction((draft) => {
        draft.get("/a.d.ts::A")![0].facets[0].ir.name = "Draft";
        draft.delete("/a.d.ts::A");
        throw new Error("abort");
      }),
    ).toThrow("abort");
    expect(table.lookup("/a.d.ts::A")![0].facets[0].ir.name).toBe("A");

    // An invalid draft commits nothing.
    expect(() =>
      table.transaction((draft) => {
        draft.set("/a.d.ts::B", []);
      }),
    ).toThrow(/empty group/);
    expect(table.has("/a.d.ts::B")).toBe(false);
  });

  test("no live source imports the deleted context or reset modules", () => {
    const offenders: string[] = [];
    const deleted = new Set([resolve("src/context"), resolve("src/reset")]);
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "legacy") visit(path);
          continue;
        }
        if (!path.endsWith(".ts")) continue;
        const text = readFileSync(path, "utf8");
        for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) {
          const specifier = match[1];
          const target = specifier.startsWith("@/")
            ? resolve("src", specifier.slice(2))
            : specifier.startsWith(".")
              ? resolve(dirname(path), specifier)
              : undefined;
          if (target && deleted.has(target)) offenders.push(path);
        }
      }
    };
    visit("src");
    visit("tools");
    expect(offenders).toEqual([]);
  });
});
