import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { afterAll, describe, expect, test } from "vitest";
import { Transpiler } from "../src/transpiler";
import { WatchSession } from "../src/watch";

const contents = (files: Map<string, { content: string }>) =>
  Object.fromEntries([...files].map(([path, file]) => [path, file.content]).sort());

/**
 * Watch mode must be an optimization only: after any edit sequence its output
 * is byte-identical to a fresh `Transpiler.render()` of the same inputs.
 */
describe("watch session", () => {
  const roots: string[] = [];
  afterAll(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

  test("a first build equals a fresh render (Leaflet)", async () => {
    const files = ["def_files/leaflet/leaflet.d.ts", "def_files/leaflet/geojson.d.ts"].map((file) =>
      resolve(file),
    );
    const outDir = "/out";
    const session = new WatchSession({ files, outDir, write: false });
    const fresh = await new Transpiler({ files, outDir }).render();
    const build = await session.build();
    expect(contents(build.files)).toEqual(contents(fresh.files));
    expect(build.analysis.link.valid).toBe(fresh.analysis.link.valid);
    expect(build.analysis.link.edges.length).toBe(fresh.analysis.link.edges.length);
  }, 60_000);

  test("incremental rebuilds stay identical and only redo dependents", async () => {
    const root = mkdtempSync(join(tmpdir(), "dartify-watch-"));
    roots.push(root);
    cpSync(resolve("def_files/synthetic/s5_emitter"), root, { recursive: true });
    const files = ["foundation.d.ts", "consumer.d.ts", "augmentation.d.ts", "ambient.d.ts"].map(
      (name) => join(root, name),
    );
    const outDir = join(root, "out");
    const session = new WatchSession({ files, outDir });
    const first = await session.build();
    expect(first.written.length).toBeGreaterThan(0);

    // No change: nothing is regenerated or written.
    const idle = await session.build([]);
    expect(idle.rebuilt).toEqual([]);
    expect(idle.written).toEqual([]);

    // Editing a file another file imports rebuilds both.
    const foundation = files[0];
    writeFileSync(
      foundation,
      readFileSync(foundation, "utf8").replace(
        "export interface WidgetOptions {",
        "export interface WidgetOptions {\n  /** Added in a watch edit. */\n  added?: string;",
      ),
    );
    const edit = await session.build([foundation]);
    expect(edit.rebuilt).toContain(foundation.split("\\").join("/"));
    // Only members changed, which importers cannot observe while generating.
    expect(edit.rebuilt).not.toContain(files[1].split("\\").join("/"));
    expect(edit.written.some((path) => path.endsWith("foundation.dart"))).toBe(true);
    const fresh = await new Transpiler({ files, outDir }).render();
    expect(contents(edit.files)).toEqual(contents(fresh.files));
    expect(readFileSync(join(outDir, "foundation.dart"), "utf8")).toContain("added");

    // Changing a declaration's surface (here: its type parameters) regenerates
    // the importers that name it.
    writeFileSync(
      foundation,
      readFileSync(foundation, "utf8").replace(
        "export interface Entity<TId extends string | number = string>",
        "export interface Entity<TId extends string | number = number>",
      ),
    );
    const surface = await session.build([foundation]);
    expect(surface.rebuilt).toContain(files[1].split("\\").join("/"));
    const freshSurface = await new Transpiler({ files, outDir }).render();
    expect(contents(surface.files)).toEqual(contents(freshSurface.files));

    // Editing a module nothing imports rebuilds only that file.
    const consumer = files[1];
    writeFileSync(consumer, `${readFileSync(consumer, "utf8")}\nexport declare const late: number;\n`);
    const leaf = await session.build([consumer]);
    expect(leaf.rebuilt).toEqual([consumer.split("\\").join("/")]);
    const freshAgain = await new Transpiler({ files, outDir }).render();
    expect(contents(leaf.files)).toEqual(contents(freshAgain.files));

    // A script file declares globals any file may bind by name, so changing
    // it rebuilds everything.
    const ambient = files[3];
    writeFileSync(ambient, `${readFileSync(ambient, "utf8")}\n`);
    const script = await session.build([ambient]);
    expect(script.rebuilt).toHaveLength(4);
    const freshScript = await new Transpiler({ files, outDir }).render();
    expect(contents(script.files)).toEqual(contents(freshScript.files));
  }, 60_000);
});
