/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import * as ts from "ts-morph";
import { readFile, writeFile, mkdir } from "fs/promises";
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
  outDir?: string;
  debug?: boolean;
}

export interface StringTranspileOptions {
  fileName?: string;
  debug?: boolean;
}

export interface StringTranspileResult {
  content: string;
  errors: TranspileException[];
}

interface FileTranspileResult {
  filePath: string;
  outputPath?: string;
  errors: TranspileException[];
  content: string;
}

export class Transpiler {
  private readonly files: string[];
  private readonly outDir: string | undefined;
  private readonly debug: boolean;
  private project: ts.Project;
  private modulePrefix: string = "";
  private currentFile: string = "";

  constructor(options: TranspilerOptions) {
    this.files = options.files;
    this.outDir = options.outDir;
    this.debug = options.debug ?? false;
    this.project = new ts.Project();

    if (!Array.isArray(this.files) || this.files.length === 0) {
      throw new TranspileException(
        "Files array cannot be empty",
        "INVALID_FILES",
      );
    }
  }

  /**
   * Static method to transpile TypeScript content from a string directly
   * Useful for testing and scenarios where you don't have physical files
   */
  public static async transpileFromString(
    content: string,
    options: StringTranspileOptions = {},
  ): Promise<StringTranspileResult> {
    const fileName = options.fileName || "virtual.d.ts";
    const debug = options.debug ?? false;

    // Create a temporary project for this operation
    const project = new ts.Project();

    // Create a virtual source file
    const sourceFile = project.createSourceFile(fileName, content, {
      overwrite: true,
    });

    const result: StringTranspileResult = {
      content: "",
      errors: [],
    };

    try {
      // Create a temporary transpiler instance for processing
      const tempTranspiler = new Transpiler({ files: [fileName], debug });
      tempTranspiler.project = project;
      tempTranspiler.currentFile = fileName;

      // Collect all output strings
      const outputStrings: string[] = [];

      // Add header
      const header = tempTranspiler.generateDartFileHeader(fileName);
      outputStrings.push(header);

      // Process all statements
      for (const statement of sourceFile.getStatements()) {
        try {
          const emittedCode = await tempTranspiler.processStatement(statement);
          if (emittedCode) {
            outputStrings.push(emittedCode);
          }
        } catch (error) {
          const transpileError =
            error instanceof TranspileException
              ? error
              : new TranspileException(
                  `Error processing statement: ${error instanceof Error ? error.message : String(error)}`,
                  "STATEMENT_ERROR",
                  fileName,
                );
          result.errors.push(transpileError);
        }
      }

      // Join all strings with newlines
      result.content = outputStrings.join("\n");
    } catch (error) {
      const transpileError =
        error instanceof TranspileException
          ? error
          : new TranspileException(
              `Failed to process content: ${error instanceof Error ? error.message : String(error)}`,
              "CONTENT_PROCESS_ERROR",
              fileName,
            );
      result.errors.push(transpileError);
    }

    return result;
  }

  public async transpile(): Promise<void> {
    try {
      await this.validateFiles();

      const results: FileTranspileResult[] = [];

      for (const file of this.files) {
        const result = await this.transpileFile(file);
        results.push(result);
      }

      // Handle output based on outDir
      const shouldPrintToStdout = !this.outDir || this.outDir.trim() === "";

      if (shouldPrintToStdout) {
        // Print all content to stdout
        for (const result of results) {
          console.log(result.content);
        }
      } else {
        // Write to individual files
        for (const result of results) {
          if (result.content && result.outputPath) {
            // Ensure output directory exists
            const dir = dirname(result.outputPath);
            await mkdir(dir, { recursive: true });

            await writeFile(result.outputPath, result.content);
            console.log(`Generated Dart file: ${result.outputPath}`);
          }
        }
      }

      // Report any errors
      const allErrors = results.flatMap((r) => r.errors);
      if (allErrors.length > 0) {
        console.warn(
          `Transpilation completed with ${allErrors.length} warnings/errors`,
        );
        allErrors.forEach((error) => console.warn(error.toString()));
      }
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

    // Calculate output path only if outDir is provided
    const shouldPrintToStdout = !this.outDir || this.outDir.trim() === "";
    const outputPath = shouldPrintToStdout
      ? undefined
      : join(this.outDir!, this.getDartFileName(filePath));

    const result: FileTranspileResult = {
      filePath,
      outputPath,
      errors: [],
      content: "",
    };

    try {
      // Collect all output strings
      const outputStrings: string[] = [];

      // Add header
      const header = this.generateDartFileHeader(filePath);
      outputStrings.push(header);

      // Read and create source file
      const content = await readFile(filePath, "utf-8");
      const sourceFile = this.project.createSourceFile(filePath, content, {
        overwrite: true,
      });

      // Process all statements
      for (const statement of sourceFile.getStatements()) {
        try {
          const emittedCode = await this.processStatement(statement);
          if (emittedCode) {
            outputStrings.push(emittedCode);
          }
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

      // Join all strings with newlines
      result.content = outputStrings.join("\n");
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

  private async processStatement(statement: ts.Statement): Promise<string> {
    switch (statement.getKind()) {
      case ts.SyntaxKind.InterfaceDeclaration:
        return this.processInterfaceDeclaration(
          statement as ts.InterfaceDeclaration,
        );

      case ts.SyntaxKind.TypeAliasDeclaration:
        return this.processTypeAliasDeclaration(
          statement as ts.TypeAliasDeclaration,
        );

      case ts.SyntaxKind.ClassDeclaration:
        return this.processClassDeclaration(statement as ts.ClassDeclaration);

      case ts.SyntaxKind.FunctionDeclaration:
        return this.processFunctionDeclaration(
          statement as ts.FunctionDeclaration,
        );

      case ts.SyntaxKind.VariableStatement:
        return this.processVariableStatement(statement as ts.VariableStatement);

      case ts.SyntaxKind.EnumDeclaration:
        return this.processEnumDeclaration(statement as ts.EnumDeclaration);

      case ts.SyntaxKind.ModuleDeclaration:
        return await this.processModuleDeclaration(
          statement as ts.ModuleDeclaration,
        );

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

  private processInterfaceDeclaration(node: ts.InterfaceDeclaration): string {
    const parsedInterface = parser.parseInterface(node);
    return emitter.emitInterface(
      parsedInterface,
      this.modulePrefix,
      this.debug,
    );
  }

  private processTypeAliasDeclaration(node: ts.TypeAliasDeclaration): string {
    const parsedTypeAlias = parser.parseTypeAlias(node);
    return emitter.emitTypeAlias(
      parsedTypeAlias,
      this.modulePrefix,
      this.debug,
    );
  }

  private processClassDeclaration(node: ts.ClassDeclaration): string {
    const parsedClass = parser.parseClass(node);
    return emitter.emitClass(parsedClass, this.modulePrefix, this.debug);
  }

  private processFunctionDeclaration(node: ts.FunctionDeclaration): string {
    const parsedFunction = parser.parseFunction(node);
    return emitter.emitFunction(parsedFunction, this.modulePrefix, this.debug);
  }

  private processVariableStatement(node: ts.VariableStatement): string {
    const parsedVariables = parser.parseVariableStmt(node);
    const varEmits: string[] = [];
    for (const variable of parsedVariables) {
      const res = emitter.emitVariable(variable, this.modulePrefix, this.debug);
      varEmits.push(res);
    }
    return varEmits.join("\n");
  }

  private processEnumDeclaration(node: ts.EnumDeclaration): string {
    const parsedEnum = parser.parseEnum(node);
    return emitter.emitEnum(parsedEnum, this.modulePrefix, this.debug);
  }

  private async processModuleDeclaration(
    node: ts.ModuleDeclaration,
  ): Promise<string> {
    const moduleName = node.getName();
    const previousPrefix = this.modulePrefix;

    // Collect all module output
    const moduleOutputs: string[] = [];

    // Add module processing comment
    moduleOutputs.push(`\n// Start module: ${moduleName}`);

    // Add current module name with trailing dot to the prefix
    this.modulePrefix = this.modulePrefix + moduleName + ".";

    try {
      // Process all statements within the module
      const statements = node.getStatements();
      for (const statement of statements) {
        switch (statement.getKind()) {
          case ts.SyntaxKind.InterfaceDeclaration:
            const interfaceResult = this.processInterfaceDeclaration(
              statement as ts.InterfaceDeclaration,
            );
            moduleOutputs.push(interfaceResult);
            break;

          case ts.SyntaxKind.TypeAliasDeclaration:
            const typeAliasResult = this.processTypeAliasDeclaration(
              statement as ts.TypeAliasDeclaration,
            );
            moduleOutputs.push(typeAliasResult);
            break;

          case ts.SyntaxKind.ClassDeclaration:
            const classResult = this.processClassDeclaration(
              statement as ts.ClassDeclaration,
            );
            moduleOutputs.push(classResult);
            break;

          case ts.SyntaxKind.FunctionDeclaration:
            const functionResult = this.processFunctionDeclaration(
              statement as ts.FunctionDeclaration,
            );
            moduleOutputs.push(functionResult);
            break;

          case ts.SyntaxKind.VariableStatement:
            const variableResult = this.processVariableStatement(
              statement as ts.VariableStatement,
            );
            moduleOutputs.push(variableResult);
            break;

          case ts.SyntaxKind.EnumDeclaration:
            const enumResult = this.processEnumDeclaration(
              statement as ts.EnumDeclaration,
            );
            moduleOutputs.push(enumResult);
            break;

          case ts.SyntaxKind.ModuleDeclaration:
            const nestedModuleResult = await this.processModuleDeclaration(
              statement as ts.ModuleDeclaration,
            );
            moduleOutputs.push(nestedModuleResult);
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
      moduleOutputs.push(`\n// End module: ${moduleName}\n`);
      // Restore the previous prefix when exiting the module
      this.modulePrefix = previousPrefix;
    }

    return moduleOutputs.join("\n");
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
