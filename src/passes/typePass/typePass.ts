/**
 * Pass 1: Type Parsing
 * Walks the AST and extracts all IRTypes from TypeNodes
 */

import * as ts from "ts-morph";
import { IRType } from "../../ir/type";
import { TypeParser } from "../../type/parser/type";
import { TranspileException } from "../../transpiler";
import { processTypeAliasStmtTypes, processVariableStmtTypes, processFunctionStmtTypes, processInterfaceStmtTypes, processClassStmtTypes } from "./processors";

export interface TypePassResult {
  typeMap: Map<string, IRType>;
  errors: TranspileException[];
}

export class TypePassProcessor {
  private typeParser: TypeParser;

  constructor(typeParser: TypeParser) {
    this.typeParser = typeParser;
  }

  public async processFile(
    sourceFile: ts.SourceFile,
    modulePrefix: string,
  ): Promise<TypePassResult> {
    const typeMap = new Map<string, IRType>();
    const errors: TranspileException[] = [];

    try {
      await this.walkStatements(
        sourceFile.getStatements(),
        typeMap,
        errors,
        modulePrefix,
        sourceFile.getFilePath(),
      );
    } catch (error) {
      const transpileError =
        error instanceof TranspileException
          ? error
          : new TranspileException(
              `Type pass failed: ${error instanceof Error ? error.message : String(error)}`,
              "TYPE_PASS_ERROR",
              sourceFile.getFilePath(),
            );
      errors.push(transpileError);
    }

    return { typeMap, errors };
  }

  private async walkStatements(
    statements: ts.Statement[],
    typeMap: Map<string, IRType>,
    errors: TranspileException[],
    modulePrefix: string,
    filePath: string,
  ): Promise<void> {
    for (const statement of statements) {
      try {
        await this.processStatementTypes(
          statement,
          typeMap,
          modulePrefix,
          filePath,
        );
      } catch (error) {
        const transpileError =
          error instanceof TranspileException
            ? error
            : new TranspileException(
                `Error processing statement types: ${error instanceof Error ? error.message : String(error)}`,
                "STATEMENT_TYPE_ERROR",
                filePath,
                statement.getStartLineNumber(),
                statement.getStart(),
              );
        errors.push(transpileError);
      }
    }
  }

  private async processStatementTypes(
    statement: ts.Statement,
    typeMap: Map<string, IRType>,
    modulePrefix: string,
    filePath: string,
  ): Promise<void> {
    switch (statement.getKind()) {
      case ts.SyntaxKind.InterfaceDeclaration:
        processInterfaceStmtTypes(
          statement as ts.InterfaceDeclaration,
          typeMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.TypeAliasDeclaration:
        processTypeAliasStmtTypes(
          statement as ts.TypeAliasDeclaration,
          typeMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.ClassDeclaration:
        processClassStmtTypes(
          statement as ts.ClassDeclaration,
          typeMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.FunctionDeclaration:
        processFunctionStmtTypes(
          statement as ts.FunctionDeclaration,
          typeMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.VariableStatement:
        processVariableStmtTypes(
          statement as ts.VariableStatement,
          typeMap,
          modulePrefix,
        );
        break;      

      case ts.SyntaxKind.ModuleDeclaration:
        await this.processModuleTypes(
          statement as ts.ModuleDeclaration,
          typeMap,
          modulePrefix,
          filePath,
        );
        break;

      default:
        // Skip unsupported statements in type pass
        break;
    }
  }


  private async processModuleTypes(
    node: ts.ModuleDeclaration,
    typeMap: Map<string, IRType>,
    modulePrefix: string,
    filePath: string,
  ): Promise<void> {
    const moduleName = node.getName();
    const newModulePrefix = modulePrefix + moduleName + ".";

    const statements = node.getStatements();
    await this.walkStatements(
      statements,
      typeMap,
      [],
      newModulePrefix,
      filePath,
    );
  }
}
