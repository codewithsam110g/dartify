import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { LinkReport } from "../src/engine/phase/linkerPhase";
import { formatLinkWarning } from "../src/reporting/linker";
import { formatGenerationFailure, reportRun } from "../src/reporting/run";
import { Transpiler } from "../src/transpiler";
import { WatchSession } from "../src/watch";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

/** Everything `fn` prints, in order, tagged by stream. */
async function printed(fn: () => Promise<void> | void): Promise<string[]> {
  const lines: string[] = [];
  const record = (stream: string) => (...args: unknown[]) => {
    lines.push(`${stream}: ${args.map(String).join(" ")}`);
  };
  vi.spyOn(console, "log").mockImplementation(record("log"));
  vi.spyOn(console, "warn").mockImplementation(record("warn"));
  vi.spyOn(console, "error").mockImplementation(record("error"));
  await fn();
  return lines;
}

async function scratch(sources: Record<string, string>): Promise<{ root: string; path: (name: string) => string }> {
  const root = await mkdtemp(join(tmpdir(), "dartify-report-"));
  roots.push(root);
  for (const [name, source] of Object.entries(sources)) await writeFile(join(root, name), source);
  return { root, path: (name) => join(root, name) };
}

// A computed member the backend omits (a warning in one-shot mode) next to a
// reference to a name that is declared nowhere (a link failure).
const TRIGGER = "export interface A { [Symbol.iterator](): Iterator<number> }\nexport declare const a: Missing;\n";

describe("the link summary (default output, no -l)", () => {
  async function linkOf(source: string): Promise<LinkReport> {
    const { path } = await scratch({ "x.d.ts": source });
    return (await new Transpiler({ files: [path("x.d.ts")] }).analyze()).link;
  }

  test("a clean link prints nothing", async () => {
    expect(formatLinkWarning(await linkOf("export declare const a: number;\n"))).toBeNull();
  });

  test("broken symbols and ambiguous edges are counted, with a pointer to -lv", async () => {
    const link = await linkOf("export declare const a: Missing;\nexport interface B { m: Missing }\n");
    expect(link.broken).toBe(2);
    expect(formatLinkWarning(link)).toBe(
      "⚠️  Link report: 2 broken symbol(s), 0 ambiguous reference(s); rerun with -lv for the full linker report",
    );
    expect(formatLinkWarning(link, true)).toBe("⚠️  Link report: 2 broken symbol(s), 0 ambiguous reference(s)");
  });

  test("an ambiguous reference is counted", async () => {
    // Two namespaces declare an `Options` and the bare name is not in scope for
    // the checker, so a use of it has two candidates.
    const { path } = await scratch({
      "a.d.ts": "declare namespace A { interface Options {} }\n",
      "b.d.ts": "declare namespace B { interface Options {} }\n",
      "use.d.ts": "export interface Uses { options: Options }\n",
    });
    const link = (await new Transpiler({ files: [path("a.d.ts"), path("b.d.ts"), path("use.d.ts")] }).analyze()).link;
    expect(link.edges.filter((edge) => edge.resolution.kind === "ambiguous")).toHaveLength(1);
    expect(formatLinkWarning(link)).toBe(
      "⚠️  Link report: 1 broken symbol(s), 1 ambiguous reference(s); rerun with -lv for the full linker report",
    );
  });

  test("reportRun prints it without -lv", async () => {
    const { root, path } = await scratch({ "x.d.ts": "export declare const a: Missing;\n" });
    const rendered = await new Transpiler({ files: [path("x.d.ts")], outDir: join(root, "out") }).render();
    const lines = await printed(() => reportRun(rendered, { verbose: false }));
    expect(lines).toContain(
      "warn: ⚠️  Link report: 1 broken symbol(s), 0 ambiguous reference(s); rerun with -lv for the full linker report",
    );
  });
});

describe("one-shot and watch print the same report", () => {
  test.each([
    ["without -lv", false],
    ["with -lv", true],
  ])("the trigger, %s: initial build and after an edit", async (_label, verbose) => {
    const { root, path } = await scratch({ "t.d.ts": TRIGGER, "u.d.ts": "export declare const u: number;\n" });
    const files = [path("t.d.ts"), path("u.d.ts")];
    const outDir = join(root, "out");
    const options = { verbose };

    const oneShot = async () =>
      printed(async () => reportRun(await new Transpiler({ files, outDir }).render(), options));
    const session = new WatchSession({ files, outDir, write: false });

    const firstWatch = await printed(async () => reportRun(await session.build(), options));
    const firstOneShot = await oneShot();
    expect(firstWatch).toEqual(firstOneShot);
    expect(firstWatch.some((line) => line.includes("Semantic analysis: 1 diagnostic(s)"))).toBe(true);
    expect(firstWatch.some((line) => line.includes("Link report: 1 broken symbol(s)"))).toBe(true);

    await writeFile(path("u.d.ts"), "export declare const u: Missing2;\nexport declare const v: string;\n");
    const secondWatch = await printed(async () => reportRun(await session.build([path("u.d.ts")]), options));
    const secondOneShot = await oneShot();
    expect(secondWatch).toEqual(secondOneShot);
    expect(secondWatch.some((line) => line.includes("Link report: 2 broken symbol(s)"))).toBe(true);
  });

  test("a build with generation failures prints each failure and nothing else", async () => {
    const { root, path } = await scratch({ "bad.d.ts": "export declare function f(x: number: string;\n" });
    const session = new WatchSession({ files: [path("bad.d.ts")], outDir: join(root, "out"), write: false });
    const build = await session.build();
    const lines = await printed(() => reportRun(build, { verbose: true, cwd: root }));
    expect(lines.length).toBe(build.analysis.generation.length);
    expect(lines[0]).toMatch(/^error: bad\.d\.ts:1:\d+ TS1005 /);
    expect(lines[0]).toBe(`error: ${formatGenerationFailure(build.analysis.generation[0], root)}`);
  });
});
