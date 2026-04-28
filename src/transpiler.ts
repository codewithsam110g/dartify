/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import * as ts from "ts-morph";
import { resolve, dirname } from "path";
import { generateSymbols } from "./engine/phase/symbolGeneration";
import { runLinker } from "./engine/phase/linkerPhase";
import { emitAllFiles } from "./engine/phase/emitterPhase";
import { transpilerContext } from "./context";

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

export class Transpiler {
  private readonly files: string[];
  private readonly outDir: string | undefined;
  private readonly debug: boolean;
  private project: ts.Project;

  // Resolved source file maps — populated by transpile()
  private inputFiles = new Map<string, ts.SourceFile>();
  private packageDepFiles = new Map<string, ts.SourceFile>();
  private stdlibFiles = new Map<string, ts.SourceFile>();

  constructor(options: TranspilerOptions) {
    this.files = options.files;
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
          moduleResolution: ts.ts.ModuleResolutionKind.NodeNext,
          types: [],
          skipLibCheck: true,
          noEmit: true,
        },
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

  public async transpile(): Promise<void> {
    try {
      await this.validateFiles();
      this.resolveAndCategorize();

      if (this.debug) {
        this.printResolutionSummary();
        this.detectUnresolvedDeps();
      }

      for (const [filePath, sourceFile] of this.inputFiles) {
        await this.transpileFile(filePath, sourceFile);
      }
      for (const [filePath, sourceFile] of this.packageDepFiles) {
        await this.transpileFile(filePath, sourceFile);
      }

      // Print all generated symbols after everything is parsed
      if (this.debug) {
        let sta = transpilerContext.symbolTable.getSymbolTable();
        for (const [_, symbols] of sta) {
          if (symbols.length > 1) {
            for (const symbol of symbols) {
              console.log("FQN:", symbol.fqn);
            }
          }
        }
      }

      // Phase 2: Linker — fix overloads, augmentations, resolve deps
      await runLinker(this.debug);

      // Phase 3: Emission — write Dart files
      const outDir = this.outDir || "./dart_out";
      // Use the directory of the first input file as the input root
      const firstInputFile = this.inputFiles.keys().next().value;
      const inputRoot = firstInputFile ? dirname(firstInputFile) : ".";
      await emitAllFiles(outDir, inputRoot, this.debug);
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
      .compilerObject.getSourceFiles();
    const inputSet = new Set(
      this.files.map(f => Transpiler.toForwardSlash(resolve(f)))
    );

    // Reset maps
    this.inputFiles.clear();
    this.packageDepFiles.clear();
    this.stdlibFiles.clear();

    for (const sf of allProgramFiles) {
      const morphSf =
        this.project.addSourceFileAtPathIfExists(sf.fileName) ??
        this.project.addSourceFileAtPath(sf.fileName);

      if (inputSet.has(sf.fileName)) {
        this.inputFiles.set(sf.fileName, morphSf);
      } else if (Transpiler.isStdlib(sf.fileName)) {
        this.stdlibFiles.set(sf.fileName, morphSf);
      } else {
        this.packageDepFiles.set(sf.fileName, morphSf);
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
   * Classify a file path as stdlib (Node builtins, TS libs, undici internals).
   */
  private static isStdlib(filePath: string): boolean {
    if (filePath.includes("@types/node/")) return true;
    if (filePath.includes("undici-types/")) return true;
    if (/typescript\/lib\/lib\..*\.d\.ts$/.test(filePath)) return true;
    return false;
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

  /**
   * Scan input source files for unresolved references and report them.
   */
  private detectUnresolvedDeps(): void {
    const allResolvedPaths = new Set([
      ...this.inputFiles.keys(),
      ...this.packageDepFiles.keys(),
      ...this.stdlibFiles.keys(),
    ]);

    const unresolvedRefs: { file: string; ref: string; kind: string }[] = [];

    for (const sf of this.project.getSourceFiles()) {
      for (const ref of sf.getPathReferenceDirectives()) {
        const refText = ref.getFileName();
        const resolvedPath = resolve(
          dirname(String(sf.getFilePath())),
          refText,
        );
        if (
          !allResolvedPaths.has(resolvedPath) &&
          !allResolvedPaths.has(resolvedPath.replace(/\.ts$/, ".d.ts"))
        ) {
          unresolvedRefs.push({
            file: sf.getFilePath(),
            ref: refText,
            kind: "path",
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
            ref: refText,
            kind: "types",
          });
        }
      }

      for (const importDecl of sf.getImportDeclarations()) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        if (!importDecl.getModuleSpecifierSourceFile()) {
          unresolvedRefs.push({
            file: sf.getFilePath(),
            ref: moduleSpecifier,
            kind: "import",
          });
        }
      }

      for (const exportDecl of sf.getExportDeclarations()) {
        const moduleSpecifier = exportDecl.getModuleSpecifierValue();
        if (moduleSpecifier && !exportDecl.getModuleSpecifierSourceFile()) {
          unresolvedRefs.push({
            file: sf.getFilePath(),
            ref: moduleSpecifier,
            kind: "export",
          });
        }
      }
    }

    if (unresolvedRefs.length > 0) {
      console.log(`\n⚠️  Unresolved Dependencies (${unresolvedRefs.length}):`);
      console.log(`----------------------------------------`);
      for (const { file, ref, kind } of unresolvedRefs) {
        console.log(`  [${kind}] ${ref}`);
        console.log(`    ↳ from: ${file}`);
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
