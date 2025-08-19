/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import * as ts from "ts-morph";
import { readFile, writeFile, mkdir } from "fs/promises";
import { basename, extname, join, dirname } from "path";
import { TypeParser } from "@typeParser/type";
import { TypePassProcessor } from "@passes/typePass/typePass";
import {
  TypeTransformer,
} from "@transformers/typeTransformers";
import {
  DeclarationPassProcessor,
} from "@passes/declarationPass";
import {
  DeclarationTransformer,
} from "@transformers/declarationTransformers";
import {
  EmissionPassProcessor,
} from "@passes/emissionPass";
import { transpilerContext } from "./context";
import { Logger, LogLevel, LogPayload } from "./log";

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

  // Multi-pass state
  private typeParser: TypeParser;
  private typePassProcessor: TypePassProcessor;
  private typeTransformer: TypeTransformer;
  private declarationPassProcessor: DeclarationPassProcessor;
  private declarationTransformer: DeclarationTransformer;
  private emissionPassProcessor: EmissionPassProcessor;

  constructor(options: TranspilerOptions) {
    this.files = options.files;
    this.outDir = options.outDir;
    this.debug = options.debug ?? false;
    this.project = new ts.Project();
    
    transpilerContext.setIsLogging(this.debug);
    
    if (!Array.isArray(this.files) || this.files.length === 0) {
      throw new TranspileException(
        "Files array cannot be empty",
        "INVALID_FILES",
      );
    }

    // Initialize pass processors
    this.typeParser = TypeParser.getInstance();
    this.typePassProcessor = new TypePassProcessor(this.typeParser);
    this.typeTransformer = new TypeTransformer();
    this.declarationPassProcessor = new DeclarationPassProcessor();
    this.declarationTransformer = new DeclarationTransformer();
    this.emissionPassProcessor = new EmissionPassProcessor();
  }

  /**
   * Static method to transpile TypeScript content from a string directly
   */
  public static async transpileFromString(
    content: string,
    options: StringTranspileOptions = {},
  ): Promise<StringTranspileResult> {
    const fileName = options.fileName || "virtual.d.ts";
    const debug = options.debug ?? false;

    const tempTranspiler = new Transpiler({ files: [fileName], debug });
    const project = new ts.Project();
    const sourceFile = project.createSourceFile(fileName, content, {
      overwrite: true,
    });

    tempTranspiler.project = project;
    tempTranspiler.currentFile = fileName;

    const result: StringTranspileResult = {
      content: "",
      errors: [],
    };

    try {
      const fileResult = await tempTranspiler.processFileMultiPass(sourceFile);
      result.content = fileResult.content;
      result.errors = fileResult.errors;
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
        for (const result of results) {
          console.log(result.content);
        }
      } else {
        for (const result of results) {
          if (result.content && result.outputPath) {
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
      const content = await readFile(filePath, "utf-8");
      const sourceFile = this.project.createSourceFile(filePath, content, {
        overwrite: true,
      });

      const fileResult = await this.processFileMultiPass(sourceFile);
      result.content = fileResult.content;
      result.errors.push(...fileResult.errors);
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

  private async processFileMultiPass(sourceFile: ts.SourceFile): Promise<{
    content: string;
    errors: TranspileException[];
  }> {
    const errors: TranspileException[] = [];
    try {
      transpilerContext.setParseLiterals(true);
      // PASS 1: Type Parsing - Extract all types from AST nodes
      if (this.debug) Logger.stdout.info("Pass 1: Type parsing...");
      const typePassResult = await this.typePassProcessor.processFile(
        sourceFile,
        this.modulePrefix,
      );
      errors.push(...typePassResult.errors);
      transpilerContext.setParseLiterals(false);

      // PASS 2: Type Transformations - Apply type hoisting
      if (this.debug) Logger.stdout.info("Pass 2: Type transformations...");
      const typeTransformResult = this.typeTransformer.transform(
        typePassResult.typeMap,
      );
      errors.push(...typeTransformResult.errors);

      // PASS 3: Declaration Parsing - Parse actual declarations using transformed types
      if (this.debug) Logger.stdout.info("Pass 3: Declaration parsing...");
      const declarationPassResult =
        await this.declarationPassProcessor.processFile(
          sourceFile,
          this.modulePrefix,
        );
      errors.push(...declarationPassResult.errors);

      // PASS 4: Declaration Transformations - Apply transformations on declarations
      if (this.debug) Logger.stdout.info("Pass 4: Declaration transformations...");
      const declarationTransformResult = this.declarationTransformer.transform(
        declarationPassResult.declarationMap,
        typeTransformResult.hoistedMap,
      );
      errors.push(...declarationTransformResult.errors);

      // PASS 5: Code Emission - Generate final Dart code
      if (this.debug) Logger.stdout.info("Pass 5: Code emission...");
      const emissionResult = this.emissionPassProcessor.processDeclarations(
        declarationTransformResult.declarationMap,
        this.generateDartFileHeader(sourceFile.getFilePath()),
        this.debug,
      );
      errors.push(...emissionResult.errors);

      return {
        content: emissionResult.content,
        errors,
      };
    } catch (error) {
      const transpileError =
        error instanceof TranspileException
          ? error
          : new TranspileException(
              `Multi-pass processing failed: ${error instanceof Error ? error.message : String(error)}`,
              "MULTIPASS_ERROR",
              this.currentFile,
            );
      errors.push(transpileError);

      return {
        content: "",
        errors,
      };
    }
  }

  private getDartFileName(filePath: string): string {
    const fileName = basename(filePath);

    if (fileName.endsWith(".d.ts")) {
      return fileName.slice(0, -5) + ".dart";
    }

    if (fileName.endsWith(".ts")) {
      return fileName.slice(0, -3) + ".dart";
    }

    const nameWithoutExt = basename(filePath, extname(filePath));
    return nameWithoutExt + ".dart";
  }

  private generateDartFileHeader(filePath: string): string {
    const fileName = basename(filePath);

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
