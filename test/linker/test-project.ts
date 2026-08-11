import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { Transpiler, AnalysisReport, RenderReport } from "../../src/transpiler";
import { transpilerContext } from "../../src/context";
import { Symbol } from "../../src/symbol";

export interface TestProject {
  root: string;
  files: Map<string, string>;
  analysis: AnalysisReport;
  symbols: ReadonlyMap<string, readonly Symbol[]>;
}

export async function withTestProject<T>(
  sources: Record<string, string>,
  run: (project: TestProject) => Promise<T> | T,
  options: { tsConfig?: object } = {},
): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "dartify-s2-"));
  const files = new Map<string, string>();
  try {
    for (const [relativePath, source] of Object.entries(sources)) {
      const file = join(root, relativePath);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, source, "utf8");
      files.set(relativePath, file);
    }

    let tsConfigFilePath: string | undefined;
    if (options.tsConfig) {
      tsConfigFilePath = join(root, "tsconfig.json");
      await writeFile(
        tsConfigFilePath,
        JSON.stringify(options.tsConfig),
        "utf8",
      );
    }

    const analysis = await new Transpiler({
      files: [...files.values()],
      tsConfigFilePath,
    }).analyze();
    return await run({
      root,
      files,
      analysis,
      symbols: transpilerContext.symbolTable.getSymbolTable(),
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function renderTestProject(
  sources: Record<string, string>,
): Promise<RenderReport> {
  const root = await mkdtemp(join(tmpdir(), "dartify-s2-render-"));
  try {
    const files: string[] = [];
    for (const [relativePath, source] of Object.entries(sources)) {
      const file = join(root, relativePath);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, source, "utf8");
      files.push(file);
    }
    return await new Transpiler({ files, outDir: join(root, "out") }).render();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
