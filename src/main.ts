/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import * as ts from "ts-morph";
import { readFile, writeFile, mkdir, appendFile } from "fs/promises";
import { TypeScriptToDartParser, createParser } from "./type.js";
import { resolve, basename, extname, join, dirname } from "path";
import * as parser from "./parser/index.js";
import * as emitter from "./emitter/old/index.js";

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
  outDir: string;
  debug?: boolean;
}

interface FileTranspileResult {
  filePath: string;
  outputPath: string;
  errors: TranspileException[];
}

export class Transpiler {
  private readonly files: string[];
  private readonly outDir: string;
  private readonly debug: boolean;
  private project: ts.Project;
  private typeParser: TypeScriptToDartParser;
  private modulePrefix: string = "";
  private currentFile: string = "";
  private currentOutputPath: string = "";

  constructor(options: TranspilerOptions) {
    this.files = options.files;
    this.outDir = options.outDir;
    this.debug = options.debug ?? false;
    this.project = new ts.Project();
    this.typeParser = createParser();

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

      const results: FileTranspileResult[] = [];

      for (const file of this.files) {
        const result = await this.transpileFile(file);
        results.push(result);
      }

      // Report any errors
      const allErrors = results.flatMap((r) => r.errors);
      if (allErrors.length > 0) {
        console.warn(
          `Transpilation completed with ${allErrors.length} warnings/errors`,
        );
        allErrors.forEach((error) => console.warn(error.toString()));
      }

      // Log generated files
      results.forEach((result) => {
        if (result.outputPath) {
          console.log(`Generated Dart file: ${result.outputPath}`);
        }
      });
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

  private async transpileFile(filePath: string): Promise<FileTranspileResult> {
    this.currentFile = filePath;

    // Calculate output path - handle .d.ts files correctly
    const fileName = this.getDartFileName(filePath);
    const outputPath = join(this.outDir, fileName);
    this.currentOutputPath = outputPath;

    const result: FileTranspileResult = {
      filePath,
      outputPath,
      errors: [],
    };

    try {
      // Ensure output directory exists
      const dir = dirname(outputPath);
      await mkdir(dir, { recursive: true });

      // Create the file with header
      const header = this.generateDartFileHeader(filePath);
      await writeFile(outputPath, header);

      // Read and create source file
      const content = await readFile(filePath, "utf-8");
      const sourceFile = this.project.createSourceFile(filePath, content, {
        overwrite: true,
      });

      // Initialize parser for this file
      this.typeParser = createParser({
        project: this.project,
        sourceFile: sourceFile,
      });

      // Process all statements
      for (const statement of sourceFile.getStatements()) {
        try {
          await this.processStatement(statement);
        } catch (error) {
          const transpileError =
            error instanceof TranspileException
              ? error
              : new TranspileException(
                  `Error processing statement: ${error instanceof Error ? error.message : String(error)}`,
                  "STATEMENT_ERROR",
                  filePath,
                );
          result.errors.push(transpileError);
        }
      }
    } catch (error) {
      const transpileError =
        error instanceof TranspileException
          ? error
          : new TranspileException(
              `Failed to process file: ${error instanceof Error ? error.message : String(error)}`,
              "FILE_PROCESS_ERROR",
              filePath,
            );
      result.errors.push(transpileError);
    }

    return result;
  }

  /**
   * Generate the Dart filename from TypeScript filename
   * Handles .d.ts files correctly by removing .d.ts instead of just .ts
   */
  private getDartFileName(filePath: string): string {
    const fileName = basename(filePath);

    // Handle .d.ts files
    if (fileName.endsWith(".d.ts")) {
      return fileName.slice(0, -5) + ".dart"; // Remove .d.ts and add .dart
    }

    // Handle regular .ts files
    if (fileName.endsWith(".ts")) {
      return fileName.slice(0, -3) + ".dart"; // Remove .ts and add .dart
    }

    // For other files, remove extension and add .dart
    const nameWithoutExt = basename(filePath, extname(filePath));
    return nameWithoutExt + ".dart";
  }

  private async processStatement(statement: ts.Statement): Promise<void> {
    switch (statement.getKind()) {
      case ts.SyntaxKind.InterfaceDeclaration:
        this.processInterfaceDeclaration(statement as ts.InterfaceDeclaration);
        break;

      case ts.SyntaxKind.TypeAliasDeclaration:
        this.processTypeAliasDeclaration(statement as ts.TypeAliasDeclaration);
        break;

      case ts.SyntaxKind.ClassDeclaration:
        this.processClassDeclaration(statement as ts.ClassDeclaration);
        break;

      case ts.SyntaxKind.FunctionDeclaration:
        this.processFunctionDeclaration(statement as ts.FunctionDeclaration);
        break;

      case ts.SyntaxKind.VariableStatement:
        this.processVariableStatement(statement as ts.VariableStatement);
        break;

      case ts.SyntaxKind.EnumDeclaration:
        this.processEnumDeclaration(statement as ts.EnumDeclaration);
        break;

      case ts.SyntaxKind.ModuleDeclaration:
        await this.processModuleDeclaration(statement as ts.ModuleDeclaration);
        break;

      default:
        throw new TranspileException(
          `Unsupported statement kind: ${statement.getKindName()}`,
          "UNSUPPORTED_STATEMENT",
          this.currentFile,
          statement.getStartLineNumber(),
          statement.getStart(),
        );
    }
  }

  private processInterfaceDeclaration(node: ts.InterfaceDeclaration): void {
    const parsedInterface = parser.parseInterface(node);
    emitter.emitInterface(
      parsedInterface,
      this.modulePrefix,
      this.currentOutputPath,
      this.debug,
    );
  }

  private processTypeAliasDeclaration(node: ts.TypeAliasDeclaration): void {
    const parsedTypeAlias = parser.parseTypeAlias(node);
    emitter.emitTypeAlias(
      parsedTypeAlias,
      this.modulePrefix,
      this.currentOutputPath,
      this.debug,
    );
  }

  private processClassDeclaration(node: ts.ClassDeclaration): void {
    const parsedClass = parser.parseClass(node);
    emitter.emitClass(
      parsedClass,
      this.modulePrefix,
      this.currentOutputPath,
      this.debug,
    );
  }

  private processFunctionDeclaration(node: ts.FunctionDeclaration): void {
    const parsedFunction = parser.parseFunction(node);
    emitter.emitFunction(
      parsedFunction,
      this.modulePrefix,
      this.currentOutputPath,
      this.debug,
    );
  }

  private processVariableStatement(node: ts.VariableStatement): void {
    const parsedVariables = parser.parseVariableStmt(node);
    for (const variable of parsedVariables) {
      emitter.emitVariable(
        variable,
        this.modulePrefix,
        this.currentOutputPath,
        this.debug,
      );
    }
  }

  private processEnumDeclaration(node: ts.EnumDeclaration): void {
    const parsedEnum = parser.parseEnum(node);
    emitter.emitEnum(
      parsedEnum,
      this.modulePrefix,
      this.currentOutputPath,
      this.debug,
    );
  }

  private async processModuleDeclaration(
    node: ts.ModuleDeclaration,
  ): Promise<void> {
    const moduleName = node.getName();
    const previousPrefix = this.modulePrefix;

    // Add module processing comment
    const moduleComment = `\n// Start module: ${moduleName}\n`;
    await appendFile(this.currentOutputPath, moduleComment);

    // Add current module name with trailing dot to the prefix
    this.modulePrefix = this.modulePrefix + moduleName + ".";

    try {
      // Process all statements within the module
      const statements = node.getStatements();
      for (const statement of statements) {
        switch (statement.getKind()) {
          case ts.SyntaxKind.InterfaceDeclaration:
            this.processInterfaceDeclaration(
              statement as ts.InterfaceDeclaration,
            );
            break;

          case ts.SyntaxKind.TypeAliasDeclaration:
            this.processTypeAliasDeclaration(
              statement as ts.TypeAliasDeclaration,
            );
            break;

          case ts.SyntaxKind.ClassDeclaration:
            this.processClassDeclaration(statement as ts.ClassDeclaration);
            break;

          case ts.SyntaxKind.FunctionDeclaration:
            this.processFunctionDeclaration(
              statement as ts.FunctionDeclaration,
            );
            break;

          case ts.SyntaxKind.VariableStatement:
            this.processVariableStatement(statement as ts.VariableStatement);
            break;

          case ts.SyntaxKind.EnumDeclaration:
            this.processEnumDeclaration(statement as ts.EnumDeclaration);
            break;

          case ts.SyntaxKind.ModuleDeclaration:
            await this.processModuleDeclaration(
              statement as ts.ModuleDeclaration,
            );
            break;

          default:
            throw new TranspileException(
              `Unsupported statement kind in module: ${statement.getKindName()}`,
              "UNSUPPORTED_MODULE_STATEMENT",
              this.currentFile,
              statement.getStartLineNumber(),
              statement.getStart(),
            );
        }
      }
    } finally {
      await appendFile(
        this.currentOutputPath,
        `\n// End module: ${moduleName}\n\n`,
      );
      // Restore the previous prefix when exiting the module
      this.modulePrefix = previousPrefix;
    }
  }

  private generateDartFileHeader(filePath: string): string {
    const fileName = basename(filePath);

    // Get the base name without extensions for library name
    let baseName: string;
    if (fileName.endsWith(".d.ts")) {
      baseName = fileName.slice(0, -5);
    } else if (fileName.endsWith(".ts")) {
      baseName = fileName.slice(0, -3);
    } else {
      baseName = basename(filePath, extname(filePath));
    }

    return `// Generated from ${fileName}
// Do not edit directly

@JS()
library ${baseName.replace(/[^a-zA-Z0-9]/g, "_")};
import 'package:js/js.dart';

`;
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

  public getFiles(): readonly string[] {
    return [...this.files];
  }

  public isDebugEnabled(): boolean {
    return this.debug;
  }
}
