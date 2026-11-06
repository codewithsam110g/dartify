/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import * as ts from "ts-morph";
import { resolve, dirname, join, parse as parsePath } from "path";
import {
  generateSymbols,
  GenerationDiagnostic,
  NamespaceExports,
  syntacticDiagnosticsOf,
} from "./engine/phase/symbolGeneration";
import {
  runLinker,
  LinkedProgram,
  LinkReport,
} from "./engine/phase/linkerPhase";
import { SymbolTable } from "./symbol/table";
import { createPackageJsBackend } from "./engine/emitter/packagejs/index";
import { ModuleExportTable } from "./symbol/exports";
import {
  renderAllFiles,
  writeAllFiles,
  RenderedFile,
} from "./engine/phase/emitterPhase";
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
  /** Every failure behind a `GENERATION_FAILED`, not only the first the message names. */
  public readonly diagnostics?: readonly GenerationDiagnostic[];

  constructor(
    message: string,
    code: string = "TRANSPILE_ERROR",
    file?: string,
    line?: number,
    column?: number,
    diagnostics?: readonly GenerationDiagnostic[],
  ) {
    super(message);
    this.name = "TranspileException";
    this.code = code;
    this.file = file;
    this.line = line;
    this.column = column;
    this.diagnostics = diagnostics;
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
  /** See `PackageJsOptions.jsRoot`. */
  jsRoot?: string;
  /**
   * Directory output paths are made relative to. Default: the common
   * ancestor of the input files (`resolvedInputRoot`). The CLI's `--base-path`
   * (HD-14); the caller guarantees every input lies under it.
   */
  inputRoot?: string;
}

export interface TranspileFromStringOptions {
  /** Virtual file name the source is treated as. Determines the Dart library name. */
  fileName?: string;
  debug?: boolean;
}

export interface TranspileFromStringResult {
  /** The generated Dart source */
  content: string;
  /**
   * Syntax errors in the input, statement-generation diagnostics, plus
   * anything thrown during emission.
   */
  errors: TranspileException[];
  /** The owned linked program the content was rendered from, when linking ran. */
  program?: LinkedProgram;
}

export interface AnalysisReport {
  resolution: ResolutionReport;
  /** Statements symbol generation could not process (`R-13`). */
  generation: GenerationDiagnostic[];
  link: LinkReport;
}

export interface ProgramReport {
  analysis: AnalysisReport;
  program: LinkedProgram;
}

export interface RenderReport {
  analysis: AnalysisReport;
  files: Map<string, RenderedFile>;
}

export interface TranspileReport extends RenderReport {
  writtenFiles: string[];
}

/**
 * Immutable options plus entry points. Holds no compiler state: every call to
 * `analyze`, `analyzeProgram`, `render`, `transpile` or `transpileFromString`
 * constructs an independent run that owns its `ts.Project`, resolution maps,
 * fallback records, symbol table, namespace aliases and diagnostics (task
 * 4.11, `R-14`). Overlapping calls — including two on one instance — cannot
 * observe each other.
 */
export class Transpiler {
  private readonly files: string[];
  private readonly outDir: string | undefined;
  private readonly debug: boolean;
  private readonly tsConfigFilePath: string | undefined;
  private readonly jsRoot: string | undefined;
  private readonly inputRoot: string | undefined;

  constructor(options: TranspilerOptions) {
    if (!Array.isArray(options.files) || options.files.length === 0) {
      throw new TranspileException(
        "Files array cannot be empty",
        "INVALID_FILES",
      );
    }
    this.files = [...new Set(options.files)].sort();
    this.outDir = options.outDir;
    this.debug = options.debug ?? false;
    this.tsConfigFilePath = options.tsConfigFilePath;
    this.jsRoot = options.jsRoot;
    this.inputRoot = options.inputRoot ? resolve(options.inputRoot) : undefined;
  }

  /**
   * Phases 1 and 2 only: resolve inputs, build the symbol table, run the
   * linker. Returns explicit resolution, generation and link phase reports
   * without emitting anything.
   *
   * This is the seam consumers other than the emitter hang off — `tools/graph.ts`
   * uses it to render the dependency graph without producing Dart (`L-07`).
   */
  public async analyze(): Promise<AnalysisReport> {
    return (await this.analyzeProgram()).analysis;
  }

  /**
   * Phases 1 and 2, also returning the owned `LinkedProgram` that backends
   * consume. The program is deeply detached from the run that produced it.
   */
  public async analyzeProgram(): Promise<ProgramReport> {
    return this.guard(async () => {
      this.validateFiles();
      const run = new ResolutionRun(this.files, this.tsConfigFilePath);
      run.resolveAndCategorize();
      const resolution = run.buildResolutionReport();

      if (this.debug) {
        run.printResolutionSummary();
        run.printResolutionDetails(resolution);
      }

      // Phase 1: Symbol generation into run-owned state.
      const symbolTable = new SymbolTable();
      const namespaceExports: NamespaceExports = new Map();
      const moduleExports: ModuleExportTable = new Map();
      const generation: GenerationDiagnostic[] = [];
      for (const [filePath, sourceFile] of [
        ...run.inputFiles,
        ...run.packageDepFiles,
      ]) {
        generation.push(
          ...syntacticDiagnosticsOf(sourceFile),
          ...(await generateSymbols(
            filePath,
            sourceFile,
            symbolTable,
            namespaceExports,
            moduleExports,
          )),
        );
      }

      // Phase 2: semantic normalization followed by reference linking.
      const program = await runLinker(
        symbolTable,
        namespaceExports,
        moduleExports,
        [...run.inputFiles.keys()].sort(),
        [...run.inputFiles.keys(), ...run.packageDepFiles.keys()],
      );
      if (this.debug) {
        printGenerationDiagnostics(generation);
        printLinkSummary(program.report);
      }
      return {
        analysis: {
          resolution,
          generation,
          link: program.report,
        },
        program,
      };
    });
  }

  /**
   * Phases 1-3, stopping short of the filesystem. Returns the analysis report
   * and rendered Dart source keyed by the path it would be written to (`E-11`).
   *
   * Generation diagnostics do not block rendering; callers that need partial
   * output inspect `analysis.generation`.
   */
  public async render(): Promise<RenderReport> {
    const { analysis, program } = await this.analyzeProgram();
    const inputRoot = this.inputRoot ?? resolvedInputRoot(analysis.resolution.inputFiles);
    const files = await this.guard(() =>
      renderAllFiles(
        program,
        this.resolvedOutDir(),
        inputRoot,
        this.debug,
        createPackageJsBackend(this.jsRoot ? { jsRoot: this.jsRoot } : {}),
      ),
    );
    return { analysis, files };
  }

  /**
   * The full pipeline: render, then write to disk.
   *
   * A generation failure blocks every write: output that silently omits a
   * declaration is worse than no output (design principle 1). Use `render()`
   * for partial results.
   */
  public async transpile(): Promise<TranspileReport> {
    const rendered = await this.render();
    const failures = rendered.analysis.generation;
    if (failures.length > 0) {
      const first = failures[0];
      throw new TranspileException(
        `Generation failed with ${failures.length} error(s); no files were written. First: ${first.message}`,
        "GENERATION_FAILED",
        first.file,
        first.line,
        first.column,
        failures,
      );
    }
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
    let program: LinkedProgram | undefined;
    try {
      const symbolTable = new SymbolTable();
      const namespaceExports: NamespaceExports = new Map();
      const moduleExports: ModuleExportTable = new Map();
      const generation = await generateSymbols(
        filePath,
        sourceFile,
        symbolTable,
        namespaceExports,
        moduleExports,
      );
      for (const diagnostic of generation) {
        errors.push(
          new TranspileException(
            diagnostic.message,
            diagnostic.code,
            fileName,
            diagnostic.line,
            diagnostic.column,
          ),
        );
      }
      program = await runLinker(
        symbolTable,
        namespaceExports,
        moduleExports,
        [filePath],
        [filePath],
      );

      const rendered = renderAllFiles(program, ".", dirname(filePath), debug);
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

    return { content, errors, ...(program ? { program } : {}) };
  }

  private validateFiles(): void {
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

function printGenerationDiagnostics(
  diagnostics: readonly GenerationDiagnostic[],
): void {
  if (diagnostics.length === 0) return;
  console.error(
    `\n⚠️  Symbol generation: ${diagnostics.length} statement(s) failed`,
  );
  for (const diagnostic of diagnostics) {
    const at =
      diagnostic.line !== undefined ? `:${diagnostic.line}` : "";
    console.error(
      `  [${diagnostic.code}] ${diagnostic.file}${at} — ${diagnostic.message}`,
    );
  }
}

function printLinkSummary(report: LinkReport): void {
  console.log(
    `\n  ✅ Graph Verification Complete: ${report.valid} valid, ${report.broken} broken.`,
  );
  if (report.diagnostics.length > 0) {
    console.log(
      `  ⚠️  ${report.diagnostics.length} checker fallback diagnostic(s).`,
    );
  }
}

/**
 * Root that output paths are made relative to.
 *
 * Uses the longest common ancestor of all resolved input files so sibling
 * source trees remain distinct under the output directory (`R-03`).
 */
export function resolvedInputRoot(inputFiles: readonly string[]): string {
  const directories = inputFiles.map((file) => resolve(dirname(file)));
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
 * Normalize a file path to use forward slashes (POSIX style).
 * ts-morph always uses forward slashes internally, but Windows
 * path.resolve() returns backslashes.
 */
function toForwardSlash(p: string): string {
  return p.split("\\").join("/");
}

/**
 * Module resolution state for exactly one analysis run: the project, the
 * categorized file maps and the fallback records the resolution host emits.
 * Constructed per call and discarded with it.
 */
export class ResolutionRun {
  public readonly project: ts.Project;
  public readonly inputFiles = new Map<string, ts.SourceFile>();
  public readonly packageDepFiles = new Map<string, ts.SourceFile>();
  /**
   * Host library files are recorded by name only: dartify never parses them,
   * so materializing ts-morph wrappers for ~50 lib files was waste (`R-05`).
   */
  public readonly stdlibFiles = new Set<string>();
  private readonly moduleFallbacks: ModuleFallbackResolution[] = [];
  private readonly moduleFallbackAmbiguities: ModuleFallbackAmbiguity[] = [];

  constructor(
    private readonly files: readonly string[],
    tsConfigFilePath: string | undefined,
  ) {
    if (tsConfigFilePath) {
      this.project = new ts.Project({
        tsConfigFilePath,
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
          files.map((file) => toForwardSlash(resolve(file))),
          {
            resolved: (fallback) => this.moduleFallbacks.push(fallback),
            ambiguous: (ambiguity) =>
              this.moduleFallbackAmbiguities.push(ambiguity),
          },
        ),
      });
    }
  }

  /**
   * Add input files to the project, resolve all transitive dependencies,
   * and categorize every resolved file into input / packageDep / stdlib.
   */
  /**
   * Removes project files no input reaches through imports, re-exports,
   * module augmentations or reference directives, using the compiler's own
   * resolution. Returns whether anything was removed.
   */
  private pruneUnreachable(inputs: readonly ts.SourceFile[]): boolean {
    // Resolution lookups the compiler exposes at runtime but omits from its
    // public typings; they answer with the program's own resolution results.
    const program = this.project.getProgram().compilerObject as ts.ts.Program & {
      getResolvedModuleFromModuleSpecifier(
        specifier: ts.ts.StringLiteralLike,
        sourceFile: ts.ts.SourceFile,
      ): { resolvedModule?: { resolvedFileName: string } } | undefined;
      getSourceFileFromReference(
        sourceFile: ts.ts.SourceFile,
        reference: ts.ts.FileReference,
      ): ts.ts.SourceFile | undefined;
      getResolvedTypeReferenceDirectiveFromTypeReferenceDirective(
        reference: ts.ts.FileReference,
        sourceFile: ts.ts.SourceFile,
      ): { resolvedTypeReferenceDirective?: { resolvedFileName?: string } } | undefined;
    };
    const reachable = new Set<string>();
    const queue = inputs.map((input) => String(input.getFilePath()));
    while (queue.length > 0) {
      const fileName = queue.pop()!;
      if (reachable.has(fileName)) continue;
      reachable.add(fileName);
      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) continue;
      const compiled = sourceFile as ts.ts.SourceFile & {
        imports?: readonly ts.ts.Node[];
        moduleAugmentations?: readonly ts.ts.Node[];
      };
      for (const specifier of [...(compiled.imports ?? []), ...(compiled.moduleAugmentations ?? [])]) {
        if (!ts.ts.isStringLiteralLike(specifier)) continue;
        const target = program.getResolvedModuleFromModuleSpecifier(specifier, sourceFile)
          ?.resolvedModule?.resolvedFileName;
        if (target) queue.push(target);
      }
      for (const reference of sourceFile.referencedFiles) {
        const target = program.getSourceFileFromReference(sourceFile, reference)?.fileName;
        if (target) queue.push(target);
      }
      for (const reference of sourceFile.typeReferenceDirectives) {
        const target = program.getResolvedTypeReferenceDirectiveFromTypeReferenceDirective(
          reference,
          sourceFile,
        )?.resolvedTypeReferenceDirective?.resolvedFileName;
        if (target) queue.push(target);
      }
    }
    let removed = false;
    for (const sourceFile of this.project.getSourceFiles()) {
      if (reachable.has(String(sourceFile.getFilePath()))) continue;
      this.project.removeSourceFile(sourceFile);
      removed = true;
    }
    return removed;
  }

  /**
   * Re-entrant: a watch session calls it again after refreshing changed files,
   * and the project's program is rebuilt incrementally.
   */
  public resolveAndCategorize(): void {
    this.inputFiles.clear();
    this.packageDepFiles.clear();
    this.stdlibFiles.clear();
    const addedSourceFiles = this.project.addSourceFilesAtPaths(this.files);
    this.project.resolveSourceFileDependencies();
    // A long-lived project (watch mode) keeps every file it ever loaded as a
    // root; drop the ones the inputs no longer reach, so the program is the
    // one a cold compilation would build. A no-op on a fresh project.
    if (this.pruneUnreachable(addedSourceFiles)) this.project.resolveSourceFileDependencies();

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
        toForwardSlash(sourceFile.getFilePath()),
      ),
    );

    for (const sf of allProgramFiles) {
      const fileName = toForwardSlash(sf.fileName);
      if (!inputSet.has(fileName) && isStdlibFile(fileName)) {
        this.stdlibFiles.add(fileName);
        continue;
      }
      const morphSf =
        this.project.getSourceFile(sf.fileName) ??
        this.project.addSourceFileAtPath(sf.fileName);
      if (inputSet.has(fileName)) {
        this.inputFiles.set(fileName, morphSf);
      } else {
        this.packageDepFiles.set(fileName, morphSf);
      }
    }
  }

  /**
   * Print a categorized summary of all resolved source files.
   */
  public printResolutionSummary(): void {
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

  private readonly issueCache = new Map<string, ModuleResolutionIssue[]>();

  /**
   * Scan source files for unresolved references. Files in `reuse` (unchanged
   * since the last scan, in a watch session) keep their cached issues.
   */
  private detectUnresolvedDeps(reuse?: ReadonlySet<string>): ModuleResolutionIssue[] {
    const allResolvedPaths = new Set([
      ...this.inputFiles.keys(),
      ...this.packageDepFiles.keys(),
      ...this.stdlibFiles.keys(),
    ]);

    // Only package paths can satisfy a `/// <reference types>`; computed once
    // and only when a file has such a directive (it was an O(files × refs)
    // scan over every resolved path, 270 ms on three.js).
    let packagePaths: string[] | undefined;
    const resolvedPackagePaths = () =>
      (packagePaths ??= [...allResolvedPaths].filter((path) => path.includes("node_modules/")));
    const unresolvedRefs: ModuleResolutionIssue[] = [];
    const ambiguities = new Map(
      this.moduleFallbackAmbiguities.map((item) => [
        `${item.file}\u0000${item.specifier}`,
        item.candidates,
      ]),
    );

    for (const sf of this.project.getSourceFiles()) {
      const cacheKey = toForwardSlash(sf.getFilePath());
      const cached = reuse?.has(cacheKey) ? this.issueCache.get(cacheKey) : undefined;
      if (cached) {
        unresolvedRefs.push(...cached);
        continue;
      }
      const firstIssue = unresolvedRefs.length;
      for (const ref of sf.getPathReferenceDirectives()) {
        const refText = ref.getFileName();
        const resolvedPath = toForwardSlash(
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
        const isResolved = resolvedPackagePaths().some(
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
          const file = toForwardSlash(sf.getFilePath());
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
          const file = toForwardSlash(sf.getFilePath());
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
      this.issueCache.set(cacheKey, unresolvedRefs.slice(firstIssue));
    }

    return unresolvedRefs.sort((a, b) =>
      `${a.file}\u0000${a.kind}\u0000${a.specifier}`.localeCompare(
        `${b.file}\u0000${b.kind}\u0000${b.specifier}`,
      ),
    );
  }

  public buildResolutionReport(reuse?: ReadonlySet<string>): ResolutionReport {
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
      unresolved: this.detectUnresolvedDeps(reuse),
      fallbacks,
    };
  }

  public printResolutionDetails(report: ResolutionReport): void {
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
}
