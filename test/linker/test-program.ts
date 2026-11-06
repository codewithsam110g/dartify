import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { basename, dirname, join } from "path";
import { LinkedProgram } from "../../src/engine/phase/linkerPhase";
import { RenderReport, Transpiler } from "../../src/transpiler";

export interface TestProgram {
  root: string;
  /** Absolute path by the relative name the source was written under. */
  files: Map<string, string>;
  /** The linked program of the files named in `inputs`. */
  program: LinkedProgram;
  /** The rendered Dart text by source file name (`entry.d.ts`). */
  dart: ReadonlyMap<string, string>;
  /** Every backend diagnostic, `[code] message`, in render order. */
  diagnostics: string[];
  report: RenderReport;
}

export interface TestProgramOptions {
  /** The files the user names; default: all of them. Others are dependencies. */
  inputs?: string[];
  jsRoot?: string;
}

/**
 * Writes `sources` to a temporary directory and links and renders them. Which
 * files are inputs matters to export routes (HD-17), so unlike
 * `withTestProject` this can name them.
 */
export async function withTestProgram<T>(
  sources: Record<string, string>,
  options: TestProgramOptions,
  run: (program: TestProgram) => Promise<T> | T,
): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "dartify-exports-"));
  try {
    const files = new Map<string, string>();
    for (const [name, text] of Object.entries(sources)) {
      const file = join(root, name);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, text, "utf8");
      files.set(name, file);
    }
    const inputs = (options.inputs ?? [...files.keys()]).map((name) => {
      const file = files.get(name);
      if (!file) throw new Error(`unknown input ${name}`);
      return file;
    });
    const make = () =>
      new Transpiler({
        files: inputs,
        outDir: join(root, "out"),
        ...(options.jsRoot ? { jsRoot: options.jsRoot } : {}),
      });
    const { program } = await make().analyzeProgram();
    const report = await make().render();
    const dart = new Map<string, string>();
    const diagnostics: string[] = [];
    for (const file of report.files.values()) {
      dart.set(basename(file.sourceFile), file.content);
      for (const diagnostic of file.diagnostics) {
        diagnostics.push(`[${diagnostic.code}] ${diagnostic.message}`);
      }
    }
    return await run({ root, files, program, dart, diagnostics, report });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Every `@JS("…")` path in generated Dart, split into its segments. */
export function jsPathsOf(dart: string): string[][] {
  return [...dart.matchAll(/@JS\("([^"]*)"\)/g)].map((match) => match[1].split("."));
}

/**
 * No generated `@JS` string may contain a segment that is not a JavaScript
 * identifier name: dart2js compiles such a path into invalid JavaScript or
 * crashes on it.
 */
export function invalidJsSegments(dart: string): string[] {
  return jsPathsOf(dart)
    .flat()
    .filter((segment) => segment !== "" && !/^[A-Za-z_$][\w$]*$/.test(segment));
}
