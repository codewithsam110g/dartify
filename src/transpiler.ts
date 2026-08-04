/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import * as ts from "ts-morph";
import { resolve, dirname, join, parse as parsePath } from "path";
import { generateSymbols } from "./engine/phase/symbolGeneration";
import { runLinker, LinkReport } from "./engine/phase/linkerPhase";
import {
  renderAllFiles,
  writeAllFiles,
  RenderedFile,
} from "./engine/phase/emitterPhase";
import { transpilerContext } from "./context";
import { resetTranspilerState } from "./reset";
import { isStdlibFile } from "./resolution/stdlib";
import {
  ModuleFallbackResolution,
  ModuleResolutionIssue,
  ResolutionReport,
} from "./resolution/types";
import {
  createDeclarationResolutionHost,
  ModuleFallbackAmbiguity,
} from "./resolution/moduleHost";

export class TranspileException extends Error {
  public readonly code: string;
  public readonly file?: string;
  public readonly line?: number;
  public readonly column?: number;

  constructor(
    message: string,
    code: string = "TRANSPILE_ERROR",
    file?: string,
    line?: number,
    column?: number,
  ) {
    super(message);
    this.name = "TranspileException";
    this.code = code;
    this.file = file;
    this.line = line;
    this.column = column;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TranspileException);
    }
  }

  public toString(): string {
    let result = `${this.name}: ${this.message}`;
    if (this.file) {
      result += ` (${this.file}`;
      if (this.line !== undefined) {
        result += `:${this.line}`;
        if (this.column !== undefined) {
          result += `:${this.column}`;
        }
      }
      result += ")";
    }
    return result;
  }
}

export interface TranspilerOptions {
  files: string[];
  outDir?: string;
  debug?: boolean;
  tsConfigFilePath?: string;
}

export interface TranspileFromStringOptions {
  /** Virtual file name the source is treated as. Determines the Dart library name. */
  fileName?: string;
  debug?: boolean;
}

export interface TranspileFromStringResult {
  /** The generated Dart source */
  content: string;
  /** Syntax errors in the input, plus anything thrown during emission */
  errors: TranspileException[];
}

export interface AnalysisReport {
  resolution: ResolutionReport;
  link: LinkReport;
}

export interface RenderReport {
  analysis: AnalysisReport;
  files: Map<string, RenderedFile>;
}

export interface TranspileReport extends RenderReport {
  writtenFiles: string[];
}

export class Transpiler {
  private readonly files: string[];
  private readonly outDir: string | undefined;
  private readonly debug: boolean;
  private project: ts.Project;

  // Resolved source file maps — populated by transpile()
  private inputFiles = new Map<string, ts.SourceFile>();
  private packageDepFiles = new Map<string, ts.SourceFile>();
  private stdlibFiles = new Map<string, ts.SourceFile>();
  private moduleFallbacks: ModuleFallbackResolution[] = [];
  private moduleFallbackAmbiguities: ModuleFallbackAmbiguity[] = [];

  constructor(options: TranspilerOptions) {
    this.files = [...new Set(options.files)].sort();
    this.outDir = options.outDir;
    this.debug = options.debug ?? false;

    if (options.tsConfigFilePath) {
      this.project = new ts.Project({
        tsConfigFilePath: options.tsConfigFilePath,
        skipAddingFilesFromTsConfig: true,
        compilerOptions: {
          types: [],
        },
      });
    } else {
      this.project = new ts.Project({
        compilerOptions: {
          target: ts.ts.ScriptTarget.ES2020,
          module: ts.ts.ModuleKind.ESNext,
          moduleResolution: ts.ts.ModuleResolutionKind.Bundler,
          types: [],
          skipLibCheck: true,
          noEmit: true,
        },
        resolutionHost: createDeclarationResolutionHost(
          options.files.map((file) => Transpiler.toForwardSlash(resolve(file))),
          {
            resolved: (fallback) => this.moduleFallbacks.push(fallback),
            ambiguous: (ambiguity) =>
              this.moduleFallbackAmbiguities.push(ambiguity),
          },
        ),
      });
    }

    transpilerContext.setIsLogging(this.debug);

    if (!Array.isArray(this.files) || this.files.length === 0) {
      throw new TranspileException(
        "Files array cannot be empty",
        "INVALID_FILES",
      );
    }
  }

  /**
   * Phases 1 and 2 only: resolve inputs, build the symbol table, run the
   * linker. Returns explicit resolution and link phase reports without
   * emitting anything.
   *
   * This is the seam consumers other than the emitter hang off — `tools/graph.ts`
   * uses it to render the dependency graph without producing Dart (`L-07`).
   */
  public async analyze(): Promise<AnalysisReport> {
    return this.guard(async () => {
      // The context is a singleton; clear it so repeated runs in one process
      // stay independent (`R-11`).
      resetTranspilerState();
      this.moduleFallbacks = [];
      this.moduleFallbackAmbiguities = [];

      await this.validateFiles();
      this.resolveAndCategorize();
      const resolution = this.buildResolutionReport();

      if (this.debug) {
        this.printResolutionSummary();
        this.printResolutionDetails(resolution);
      }

      // Phase 1: Symbol generation
      for (const [filePath, sourceFile] of this.inputFiles) {
        await this.transpileFile(filePath, sourceFile);
      }
      for (const [filePath, sourceFile] of this.packageDepFiles) {
        await this.transpileFile(filePath, sourceFile);
      }

      // Phase 2: Linker — dependency graph, (future) overloads + augmentation
      const link = await runLinker(this.debug);
      return { resolution, link };
    });
  }

  /**
   * Phases 1-3, stopping short of the filesystem. Returns the analysis report
   * and rendered Dart source keyed by the path it would be written to (`E-11`).
   */
  public async render(): Promise<RenderReport> {
    const analysis = await this.analyze();
    const files = renderAllFiles(
      this.resolvedOutDir(),
      this.resolvedInputRoot(),
      this.debug,
    );
    return { analysis, files };
  }

  /**
   * The full pipeline: render, then write to disk.
   */
  public async transpile(): Promise<TranspileReport> {
    const rendered = await this.render();
    await this.guard(() => writeAllFiles(rendered.files, this.debug));

    if (this.debug) {
      console.log(
        `\n✅ Emitted ${rendered.files.size} Dart file(s) to ${this.resolvedOutDir()}`,
      );
    }
    return { ...rendered, writtenFiles: [...rendered.files.keys()].sort() };
  }

  private resolvedOutDir(): string {
    return this.outDir || "./dart_out";
  }

  /**
   * Root that output paths are made relative to.
   *
   * Currently the directory of the *first* input file, which collides when
   * inputs come from sibling trees (`R-03`). Replaced by a longest-common-
   * ancestor computation in S2.
   */
  private resolvedInputRoot(): string {
    const directories = [...this.inputFiles.keys()].map((file) =>
      resolve(dirname(file)),
    );
    if (directories.length === 0) return ".";

    const roots = new Set(directories.map((directory) => parsePath(directory).root));
    if (roots.size !== 1) {
      throw new TranspileException(
        "Input files do not share a filesystem root",
        "NO_COMMON_INPUT_ROOT",
      );
    }

    const root = [...roots][0];
    const parts = directories.map((directory) =>
      directory
        .substring(root.length)
        .split(/[\\/]/)
        .filter(Boolean),
    );
    const common: string[] = [];
    for (let index = 0; index < Math.min(...parts.map((value) => value.length)); index++) {
      const segment = parts[0][index];
      if (parts.every((value) => value[index] === segment)) common.push(segment);
      else break;
    }
    return join(root, ...common);
  }

  /**
   * Wraps a pipeline step so anything that escapes it surfaces as a
   * TranspileException rather than a raw error.
   */
  private async guard<T>(fn: () => Promise<T> | T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof TranspileException) {
        throw error;
      }
      throw new TranspileException(
        `Unexpected error during transpilation: ${error instanceof Error ? error.message : String(error)}`,
        "UNEXPECTED_ERROR",
      );
    }
  }

  private async transpileFile(fp: string, sf: ts.SourceFile) {
    await generateSymbols(fp, sf);
  }

  /**
   * Transpiles a single in-memory `.d.ts` source to Dart, touching no
   * filesystem in either direction.
   *
   * Runs the same three phases as `transpile()` over one virtual source file.
   * Intended for tests and for embedding; multi-file features (cross-file
   * imports, augmentation across files) are by definition out of scope here,
   * since there is only one file.
   */
  public static async transpileFromString(
    source: string,
    options: TranspileFromStringOptions = {},
  ): Promise<TranspileFromStringResult> {
    const fileName = options.fileName ?? "virtual.d.ts";
    const debug = options.debug ?? false;
    const errors: TranspileException[] = [];

    resetTranspilerState();
    transpilerContext.setIsLogging(debug);

    const project = new ts.Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: ts.ts.ScriptTarget.ES2020,
        module: ts.ts.ModuleKind.ESNext,
        types: [],
        skipLibCheck: true,
        noEmit: true,
      },
    });

    const sourceFile = project.createSourceFile(fileName, source, {
      overwrite: true,
    });
    const filePath = String(sourceFile.getFilePath());

    // Surface syntax errors rather than silently producing empty output.
    for (const diagnostic of sourceFile.getPreEmitDiagnostics()) {
      const start = diagnostic.getStart();
      const lineAndCol =
        start !== undefined
          ? sourceFile.getLineAndColumnAtPos(start)
          : undefined;
      errors.push(
        new TranspileException(
          ts.ts.flattenDiagnosticMessageText(
            diagnostic.getMessageText() as any,
            "\n",
          ),
          `TS${diagnostic.getCode()}`,
          fileName,
          lineAndCol?.line,
          lineAndCol?.column,
        ),
      );
    }

    let content = "";
    try {
      await generateSymbols(filePath, sourceFile);
      await runLinker(debug);

      const rendered = renderAllFiles(".", dirname(filePath), debug);
      // Exactly one input file, so at most one rendered output.
      content = rendered.values().next().value?.content ?? "";
    } catch (error) {
      errors.push(
        error instanceof TranspileException
          ? error
          : new TranspileException(
              `Unexpected error during transpilation: ${error instanceof Error ? error.message : String(error)}`,
              "UNEXPECTED_ERROR",
              fileName,
            ),
      );
    }

    return { content, errors };
  }

  /**
   * Add input files to the project, resolve all transitive dependencies,
   * and categorize every resolved file into input / packageDep / stdlib.
   */
  private resolveAndCategorize(): void {
    const addedSourceFiles = this.project.addSourceFilesAtPaths(this.files);
    this.project.resolveSourceFileDependencies();

    // project.getSourceFiles() only returns explicitly added files.
    // The TS program's getSourceFiles() returns ALL resolved files including
    // @types/ packages resolved via /// <reference types> and import statements.
    const allProgramFiles = this.project
      .getProgram()
      .compilerObject.getSourceFiles()
      .slice()
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
    const inputSet = new Set(
      addedSourceFiles.map((sourceFile) =>
        Transpiler.toForwardSlash(sourceFile.getFilePath()),
      ),
    );

    // Reset maps
    this.inputFiles.clear();
    this.packageDepFiles.clear();
    this.stdlibFiles.clear();

    for (const sf of allProgramFiles) {
      const morphSf =
        this.project.addSourceFileAtPathIfExists(sf.fileName) ??
        this.project.addSourceFileAtPath(sf.fileName);

      const fileName = Transpiler.toForwardSlash(sf.fileName);
      if (inputSet.has(fileName)) {
        this.inputFiles.set(fileName, morphSf);
      } else if (isStdlibFile(fileName)) {
        this.stdlibFiles.set(fileName, morphSf);
      } else {
        this.packageDepFiles.set(fileName, morphSf);
      }
    }
  }

  /**
   * Normalize a file path to use forward slashes (POSIX style).
   * ts-morph always uses forward slashes internally, but Windows
   * path.resolve() returns backslashes.
   */
  private static toForwardSlash(p: string): string {
    return p.split("\\").join("/");
  }

  /**
   * Print a categorized summary of all resolved source files.
   */
  private printResolutionSummary(): void {
    const total =
      this.inputFiles.size + this.packageDepFiles.size + this.stdlibFiles.size;

    console.log(`\n========================================`);
    console.log(`  Source Path Resolution Summary`);
    console.log(`========================================`);
    console.log(`  Input files (from CLI):     ${this.files.length}`);
    console.log(`  Total resolved files:       ${total}`);
    console.log(`  ── Categorized ──`);
    console.log(`  📥 Input files:             ${this.inputFiles.size}`);
    console.log(`  📦 Package dependencies:    ${this.packageDepFiles.size}`);
    console.log(`  📚 Stdlib / Node builtins:  ${this.stdlibFiles.size}`);
    console.log(`========================================\n`);

    console.log(`📥 Input file paths (${this.inputFiles.size}):`);
    [...this.inputFiles.keys()].forEach((f, i) => {
      console.log(`  ${i + 1}. ${f}`);
    });

    if (this.packageDepFiles.size > 0) {
      console.log(`\n📦 Package Dependencies (${this.packageDepFiles.size}):`);
      [...this.packageDepFiles.keys()].forEach((f, i) => {
        console.log(`  ${i + 1}. ${f}`);
      });
    }

    if (this.stdlibFiles.size > 0) {
      console.log(`\n📚 Stdlib / Node.js Builtins (${this.stdlibFiles.size}):`);
      [...this.stdlibFiles.keys()].forEach((f, i) => {
        console.log(`  ${i + 1}. ${f}`);
      });
    }

    const delta = total - this.files.length;
    console.log(`\nDelta: ${delta} additional files resolved via dependencies`);
  }

  /** Scan all source files for unresolved references. */
  private detectUnresolvedDeps(): ModuleResolutionIssue[] {
    const allResolvedPaths = new Set([
      ...this.inputFiles.keys(),
      ...this.packageDepFiles.keys(),
      ...this.stdlibFiles.keys(),
    ]);

    const unresolvedRefs: ModuleResolutionIssue[] = [];
    const ambiguities = new Map(
      this.moduleFallbackAmbiguities.map((item) => [
        `${item.file}\u0000${item.specifier}`,
        item.candidates,
      ]),
    );

    for (const sf of this.project.getSourceFiles()) {
      for (const ref of sf.getPathReferenceDirectives()) {
        const refText = ref.getFileName();
        const resolvedPath = Transpiler.toForwardSlash(
          resolve(dirname(String(sf.getFilePath())), refText),
        );
        if (
          !allResolvedPaths.has(resolvedPath) &&
          !allResolvedPaths.has(resolvedPath.replace(/\.ts$/, ".d.ts"))
        ) {
          unresolvedRefs.push({
            file: sf.getFilePath(),
            specifier: refText,
            kind: "path",
            reason: "notFound",
          });
        }
      }

      for (const ref of sf.getTypeReferenceDirectives()) {
        const refText = ref.getFileName();
        const isResolved = [...allResolvedPaths].some(
          (p) =>
            p.includes(`@types/${refText}`) ||
            p.includes(`node_modules/${refText}`),
        );
        if (!isResolved) {
          unresolvedRefs.push({
            file: sf.getFilePath(),
            specifier: refText,
            kind: "types",
            reason: "notFound",
          });
        }
      }

      for (const importDecl of sf.getImportDeclarations()) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        if (!importDecl.getModuleSpecifierSourceFile()) {
          const file = Transpiler.toForwardSlash(sf.getFilePath());
          const candidates = ambiguities.get(`${file}\u0000${moduleSpecifier}`);
          unresolvedRefs.push({
            file,
            specifier: moduleSpecifier,
            kind: "import",
            reason: candidates ? "ambiguousExplicitInput" : "notFound",
            candidates,
          });
        }
      }

      for (const exportDecl of sf.getExportDeclarations()) {
        const moduleSpecifier = exportDecl.getModuleSpecifierValue();
        if (moduleSpecifier && !exportDecl.getModuleSpecifierSourceFile()) {
          const file = Transpiler.toForwardSlash(sf.getFilePath());
          const candidates = ambiguities.get(`${file}\u0000${moduleSpecifier}`);
          unresolvedRefs.push({
            file,
            specifier: moduleSpecifier,
            kind: "export",
            reason: candidates ? "ambiguousExplicitInput" : "notFound",
            candidates,
          });
        }
      }
    }

    return unresolvedRefs.sort((a, b) =>
      `${a.file}\u0000${a.kind}\u0000${a.specifier}`.localeCompare(
        `${b.file}\u0000${b.kind}\u0000${b.specifier}`,
      ),
    );
  }

  private buildResolutionReport(): ResolutionReport {
    const fallbacks = [
      ...new Map(
        this.moduleFallbacks.map((fallback) => [
          `${fallback.file}\u0000${fallback.specifier}\u0000${fallback.resolvedFile}`,
          fallback,
        ]),
      ).values(),
    ].sort((a, b) =>
      `${a.file}\u0000${a.specifier}`.localeCompare(
        `${b.file}\u0000${b.specifier}`,
      ),
    );

    return {
      inputFiles: [...this.inputFiles.keys()].sort(),
      packageDependencies: [...this.packageDepFiles.keys()].sort(),
      stdlibFiles: [...this.stdlibFiles.keys()].sort(),
      unresolved: this.detectUnresolvedDeps(),
      fallbacks,
    };
  }

  private printResolutionDetails(report: ResolutionReport): void {
    if (report.fallbacks.length > 0) {
      console.log(`\n🔁 Module fallbacks (${report.fallbacks.length}):`);
      for (const fallback of report.fallbacks) {
        console.log(
          `  [${fallback.strategy}] ${fallback.specifier} → ${fallback.resolvedFile}`,
        );
      }
    }

    if (report.unresolved.length > 0) {
      console.log(`\n⚠️  Unresolved Dependencies (${report.unresolved.length}):`);
      console.log(`----------------------------------------`);
      for (const { file, specifier, kind, candidates } of report.unresolved) {
        console.log(`  [${kind}] ${specifier}`);
        console.log(`    ↳ from: ${file}`);
        if (candidates) console.log(`    ↳ candidates: ${candidates.join(", ")}`);
      }
      console.log(`----------------------------------------`);
    } else {
      console.log(`\n✅ All dependencies resolved successfully.`);
    }
  }

  private async validateFiles(): Promise<void> {
    for (const file of this.files) {
      if (typeof file !== "string" || file.trim() === "") {
        throw new TranspileException(
          `Invalid file path: ${file}`,
          "INVALID_FILE_PATH",
          file,
        );
      }
    }
  }
}
