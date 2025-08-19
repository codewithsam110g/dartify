/**
 * Pass 3: Declaration Parsing
 * Parses actual declarations using the transformed types from previous passes
 */

import * as ts from "ts-morph";
import { IRDeclaration } from "@/ir";
import * as parser from "@parser/index";
import { TranspileException } from "@/transpiler";
import { transpilerContext } from "@/context";
import { Logger, LogLevel } from "@/log";

export interface DeclarationPassResult {
  declarationMap: Map<string, IRDeclaration[]>;
  errors: TranspileException[];
}

export class DeclarationPassProcessor {
  public async processFile(
    sourceFile: ts.SourceFile,
    modulePrefix: string,
  ): Promise<DeclarationPassResult> {
    const declarationMap = new Map<string, IRDeclaration[]>();
    const errors: TranspileException[] = [];

    try {
      await this.walkStatements(
        sourceFile.getStatements(),
        declarationMap,
        errors,
        modulePrefix,
        sourceFile.getFilePath(),
      );
    } catch (error) {
      const transpileError =
        error instanceof TranspileException
          ? error
          : new TranspileException(
              `Declaration pass failed: ${error instanceof Error ? error.message : String(error)}`,
              "DECLARATION_PASS_ERROR",
              sourceFile.getFilePath(),
            );
      errors.push(transpileError);
    }
    if (transpilerContext.getIsLogging()) {
      let logger = new Logger("declarationPass.ir", "./logs", LogLevel.DEBUG);
      logger.clearLogFile();
      logger.log(
        LogLevel.DEBUG,
        "Pass: 3 -> Declaration Pass",
        "Writing all the Declaration IR's to Log",
      );
      for (const [key, value] of declarationMap) {
        if (value.length > 1) {
          let count = 0;
          for (let val of value) {
            logger.debug(`${key}: ${count++}: ${JSON.stringify(val)}`);
          }
        }else{
          logger.debug(`${key}: ${JSON.stringify(value[0])}`);          
        }
      }
      if (errors.length > 0) {
        Logger.stdout.warn(
          "Got some errors from declaration parser, writing them to log",
        );
        for (let err of errors) {
          logger.warn(err.message);
        }
      }
    }
    return { declarationMap, errors };
  }

  private async walkStatements(
    statements: ts.Statement[],
    declarationMap: Map<string, IRDeclaration[]>,
    errors: TranspileException[],
    modulePrefix: string,
    filePath: string,
  ): Promise<void> {
    for (const statement of statements) {
      try {
        await this.processStatementDeclaration(
          statement,
          declarationMap,
          modulePrefix,
          filePath,
        );
      } catch (error) {
        const transpileError =
          error instanceof TranspileException
            ? error
            : new TranspileException(
                `Error processing statement declaration: ${error instanceof Error ? error.message : String(error)}`,
                "STATEMENT_DECLARATION_ERROR",
                filePath,
                statement.getStartLineNumber(),
                statement.getStart(),
              );
        errors.push(transpileError);
      }
    }
  }

  private async processStatementDeclaration(
    statement: ts.Statement,
    declarationMap: Map<string, IRDeclaration[]>,
    modulePrefix: string,
    filePath: string,
  ): Promise<void> {
    switch (statement.getKind()) {
      case ts.SyntaxKind.InterfaceDeclaration:
        this.processInterfaceDeclaration(
          statement as ts.InterfaceDeclaration,
          declarationMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.TypeAliasDeclaration:
        this.processTypeAliasDeclaration(
          statement as ts.TypeAliasDeclaration,
          declarationMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.ClassDeclaration:
        this.processClassDeclaration(
          statement as ts.ClassDeclaration,
          declarationMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.FunctionDeclaration:
        this.processFunctionDeclaration(
          statement as ts.FunctionDeclaration,
          declarationMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.VariableStatement:
        this.processVariableStatement(
          statement as ts.VariableStatement,
          declarationMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.EnumDeclaration:
        this.processEnumDeclaration(
          statement as ts.EnumDeclaration,
          declarationMap,
          modulePrefix,
        );
        break;

      case ts.SyntaxKind.ModuleDeclaration:
        await this.processModuleDeclaration(
          statement as ts.ModuleDeclaration,
          declarationMap,
          modulePrefix,
          filePath,
        );
        break;

      default:
        throw new TranspileException(
          `Unsupported statement kind: ${statement.getKindName()}`,
          "UNSUPPORTED_STATEMENT",
          filePath,
          statement.getStartLineNumber(),
          statement.getStart(),
        );
    }
  }

  private processInterfaceDeclaration(
    node: ts.InterfaceDeclaration,
    declarationMap: Map<string, IRDeclaration[]>,
    modulePrefix: string,
  ): void {
    const interfaceName = node.getName();
    const fullName = modulePrefix + interfaceName;
    const parsedInterface = parser.parseInterface(node);

    if (declarationMap.has(fullName)) {
      declarationMap.get(fullName)!.push(parsedInterface);
    } else {
      declarationMap.set(fullName, [parsedInterface]);
    }
  }

  private processTypeAliasDeclaration(
    node: ts.TypeAliasDeclaration,
    declarationMap: Map<string, IRDeclaration[]>,
    modulePrefix: string,
  ): void {
    const aliasName = node.getName();
    const fullName = modulePrefix + aliasName;
    const parsedTypeAlias = parser.parseTypeAlias(node);

    if (declarationMap.has(fullName)) {
      declarationMap.get(fullName)!.push(parsedTypeAlias);
    } else {
      declarationMap.set(fullName, [parsedTypeAlias]);
    }
  }

  private processClassDeclaration(
    node: ts.ClassDeclaration,
    declarationMap: Map<string, IRDeclaration[]>,
    modulePrefix: string,
  ): void {
    const className = node.getName();
    if (!className) return;
    const fullName = modulePrefix + className;
    const parsedClass = parser.parseClass(node);

    if (declarationMap.has(fullName)) {
      declarationMap.get(fullName)!.push(parsedClass);
    } else {
      declarationMap.set(fullName, [parsedClass]);
    }
  }

  private processFunctionDeclaration(
    node: ts.FunctionDeclaration,
    declarationMap: Map<string, IRDeclaration[]>,
    modulePrefix: string,
  ): void {
    const functionName = node.getName();
    if (!functionName) return;
    const fullName = modulePrefix + functionName;
    const parsedFunction = parser.parseFunction(node);

    if (declarationMap.has(fullName)) {
      declarationMap.get(fullName)!.push(parsedFunction);
    } else {
      declarationMap.set(fullName, [parsedFunction]);
    }
  }

  private processVariableStatement(
    node: ts.VariableStatement,
    declarationMap: Map<string, IRDeclaration[]>,
    modulePrefix: string,
  ): void {
    const parsedVariables = parser.parseVariableStmt(node);
    for (const variable of parsedVariables) {
      const fullName = modulePrefix + variable.name;

      if (declarationMap.has(fullName)) {
        declarationMap.get(fullName)!.push(variable);
      } else {
        declarationMap.set(fullName, [variable]);
      }
    }
  }

  private processEnumDeclaration(
    node: ts.EnumDeclaration,
    declarationMap: Map<string, IRDeclaration[]>,
    modulePrefix: string,
  ): void {
    const enumName = node.getName();
    const fullName = modulePrefix + enumName;
    const parsedEnum = parser.parseEnum(node);

    if (declarationMap.has(fullName)) {
      declarationMap.get(fullName)!.push(parsedEnum);
    } else {
      declarationMap.set(fullName, [parsedEnum]);
    }
  }

  private async processModuleDeclaration(
    node: ts.ModuleDeclaration,
    declarationMap: Map<string, IRDeclaration[]>,
    modulePrefix: string,
    filePath: string,
  ): Promise<void> {
    const moduleName = node.getName();
    const newModulePrefix = modulePrefix + moduleName + ".";
    const statements = node.getStatements();
    await this.walkStatements(
      statements,
      declarationMap,
      [],
      newModulePrefix,
      filePath,
    );
  }
}
