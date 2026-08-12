import { readdirSync } from "fs";
import { basename, join, resolve } from "path";
import { Project, ts } from "ts-morph";
import { beforeAll, describe, expect, test } from "vitest";
import {
  formatSemanticWarning,
  formatVerboseLinkReport,
} from "../../src/reporting/linker";
import { RenderReport, Transpiler } from "../../src/transpiler";

const fixtureRoot = resolve("def_files/synthetic/s5_emitter");
const fixtureFiles = readdirSync(fixtureRoot)
  .filter((file) => file.endsWith(".d.ts"))
  .sort()
  .map((file) => join(fixtureRoot, file));

function normalizeFixturePaths(value: string): string {
  return value.split(fixtureRoot).join("<fixture>");
}

describe("pre-S5 emitter acceptance fixture", () => {
  let report: RenderReport;

  beforeAll(async () => {
    report = await new Transpiler({
      files: fixtureFiles,
      outDir: "/virtual/s5-output",
    }).render();
  });

  test("contains valid declaration files rather than TypeScript implementations", () => {
    const declarationProject = new Project({
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        noEmit: true,
      },
      skipAddingFilesFromTsConfig: true,
    });
    for (const file of fixtureFiles) declarationProject.addSourceFileAtPath(file);

    const diagnostics = declarationProject
      .getPreEmitDiagnostics()
      .map((diagnostic) => diagnostic.getMessageText());

    expect(fixtureFiles.every((file) => file.endsWith(".d.ts"))).toBe(true);
    expect(diagnostics).toEqual([]);
  });

  test("renders the complete multi-file Dart and verbose CLI baseline", () => {
    const renderedFiles = [...report.files.values()]
      .sort((left, right) => left.sourceFile.localeCompare(right.sourceFile))
      .map((file) => ({
        source: basename(file.sourceFile),
        output: basename(file.outputPath),
        symbols: file.symbolCount,
        dart: file.content,
      }));
    const verbose = normalizeFixturePaths(
      formatVerboseLinkReport(report.analysis.link),
    );

    expect({
      renderedFiles,
      cli: {
        warning: formatSemanticWarning(report.analysis.link),
        verbose,
      },
    }).toMatchSnapshot();
  });

  test("keeps the semantic and linker acceptance counts explicit", () => {
    const { link, resolution } = report.analysis;

    expect(fixtureFiles.map((file) => basename(file))).toEqual([
      "ambient.d.ts",
      "augmentation.d.ts",
      "consumer.d.ts",
      "foundation.d.ts",
    ]);
    expect(resolution.unresolved).toEqual([]);
    expect(link.broken).toBe(0);
    expect(link.valid).toBe(link.results.size);
    expect(link.semantic).toMatchObject({
      inputDeclarations: 49,
      declarationGroupsMerged: 4,
      anonymousSymbolsCanonicalized: 1,
      overloadsRenamed: 6,
      keywordRenames: 3,
      namespaceRenames: 2,
      globalDeclarationsHoisted: 2,
      externalAugmentationsSuppressed: 2,
    });
    expect(
      link.semantic.diagnostics.map((diagnostic) => diagnostic.code),
    ).toEqual([
      "EXTERNAL_MODULE_AUGMENTATION_SUPPRESSED",
      "EXTERNAL_MODULE_AUGMENTATION_SUPPRESSED",
      "UNSUPPORTED_COMPUTED_MEMBER",
    ]);

    const foundation = [...report.files.values()].find(
      (file) => basename(file.sourceFile) === "foundation.d.ts",
    )?.content;
    expect(foundation).toContain("external Widget configure_1(");
    expect(foundation).toContain("external Widget configure_2(");
    expect(foundation).not.toContain("external WidgetType configure_");
  });
});
