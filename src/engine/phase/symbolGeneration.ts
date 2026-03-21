import * as ts from "ts-morph";
import { Symbol, SymbolType } from "@/symbol";
import * as parser from "@parser/index";
import { transpilerContext } from "@/context";
import { TranspileException } from "@/transpiler";

/**
 * Top-level entry point for symbol generation.
 * Parses the AST of the given file and populates the global SymbolTable.
 */
export async function generateSymbols(
  fp: string,
  sourceFile: ts.SourceFile,
): Promise<void> {
  const generator = new SymbolGenerator();
  await generator.generateSymbols(fp, sourceFile);
}

class SymbolGenerator {
  private modulePrefix: string = "";

  public async generateSymbols(fp: string, sourceFile: ts.SourceFile) {
    const errors: TranspileException[] = [];
    try {
      await this.walkStatements(sourceFile.getStatements(), errors, fp);
    } catch (error) {
      const transpileError =
        error instanceof TranspileException
          ? error
          : new TranspileException(
              `Symbol Generator Failed: ${error instanceof Error ? error.message : String(error)}`,
              "SYMBOL_GENERATOR_ERROR",
              sourceFile.getFilePath(),
            );
      errors.push(transpileError);
    }

    if (errors.length > 0 && transpilerContext.getIsLogging()) {
      console.error(
        `[SymbolGeneration] Encountered ${errors.length} errors in ${fp}:`,
        errors,
      );
    }
  }

  private async walkStatements(
    statements: ts.Statement[],
    errors: TranspileException[],
    filePath: string,
  ) {
    for (const statement of statements) {
      try {
        await this.processStatementDeclaration(statement, filePath);
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
    filePath: string,
  ): Promise<void> {
    switch (statement.getKind()) {
      case ts.SyntaxKind.InterfaceDeclaration:
        this.processInterfaceDeclaration(
          statement as ts.InterfaceDeclaration,
          filePath,
        );
        break;

      case ts.SyntaxKind.TypeAliasDeclaration:
        this.processTypeAliasDeclaration(
          statement as ts.TypeAliasDeclaration,
          filePath,
        );
        break;

      case ts.SyntaxKind.ClassDeclaration:
        this.processClassDeclaration(
          statement as ts.ClassDeclaration,
          filePath,
        );
        break;

      case ts.SyntaxKind.FunctionDeclaration:
        this.processFunctionDeclaration(
          statement as ts.FunctionDeclaration,
          filePath,
        );
        break;

      case ts.SyntaxKind.VariableStatement:
        this.processVariableStatement(
          statement as ts.VariableStatement,
          filePath,
        );
        break;

      case ts.SyntaxKind.EnumDeclaration:
        this.processEnumDeclaration(statement as ts.EnumDeclaration, filePath);
        break;

      case ts.SyntaxKind.ModuleDeclaration:
        await this.processModuleDeclaration(
          statement as ts.ModuleDeclaration,
          filePath,
        );
        break;

      default:
        // Ignore unhandled top-level statements for symbol generation (e.g., Imports, Exports, etc.)
        // It's normal for files to contain logic that doesn't generate new public declarations in our IR.
        break;
    }
  }

  private processInterfaceDeclaration(
    node: ts.InterfaceDeclaration,
    filePath: string,
  ): void {
    const interfaceName = node.getName();
    let fqn = filePath + "::" + this.modulePrefix + interfaceName;
    transpilerContext.currentFQN = fqn;
    const parsedInterface = parser.parseInterface(node);
    let symbol: Symbol = {
      type: SymbolType.INTERFACE,
      ir: parsedInterface,
      fqn,
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private processTypeAliasDeclaration(
    node: ts.TypeAliasDeclaration,
    filePath: string,
  ): void {
    const aliasName = node.getName();
    let fqn = filePath + "::" + this.modulePrefix + aliasName;
    transpilerContext.currentFQN = fqn;
    const parsedTypeAlias = parser.parseTypeAlias(node);
    let symbol: Symbol = {
      type: SymbolType.TYPE_ALIAS,
      ir: parsedTypeAlias,
      fqn,
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private processClassDeclaration(
    node: ts.ClassDeclaration,
    filePath: string,
  ): void {
    let className = node.getName() || "Error_Class";
    let fqn = filePath + "::" + this.modulePrefix + className;
    transpilerContext.currentFQN = fqn;
    const parsedClass = parser.parseClass(node);
    let symbol: Symbol = {
      type: SymbolType.CLASS,
      ir: parsedClass,
      fqn,
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private processFunctionDeclaration(
    node: ts.FunctionDeclaration,
    filePath: string,
  ): void {
    let functionName = node.getName() || "Error_Function";
    let fqn = filePath + "::" + this.modulePrefix + functionName;
    transpilerContext.currentFQN = fqn;
    const parsedFunction = parser.parseFunction(node);
    let symbol: Symbol = {
      type: SymbolType.FUNCTION,
      ir: parsedFunction,
      fqn,
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private processVariableStatement(
    node: ts.VariableStatement,
    filePath: string,
  ): void {
    const parsedVariables = parser.parseVariableStmt(
      filePath + "::" + this.modulePrefix,
      node,
    );
    for (const variable of parsedVariables) {
      let fqn = filePath + "::" + this.modulePrefix + variable.name;
      let symbol: Symbol = {
        type: SymbolType.VARIABLE,
        ir: variable,
        fqn,
      };
      transpilerContext.symbolTable.register(fqn, symbol);
    }
  }

  private processEnumDeclaration(
    node: ts.EnumDeclaration,
    filePath: string,
  ): void {
    const enumName = node.getName();
    let fqn = filePath + "::" + this.modulePrefix + enumName;
    transpilerContext.currentFQN = fqn;
    const parsedEnum = parser.parseEnum(node);
    let symbol: Symbol = {
      type: SymbolType.ENUM,
      ir: parsedEnum,
      fqn,
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private async processModuleDeclaration(
    node: ts.ModuleDeclaration,
    filePath: string,
  ): Promise<void> {
    const moduleName = node.getName();
    const previousPrefix = this.modulePrefix;

    try {
      this.modulePrefix += moduleName + "|";
      const statements = node.getStatements();
      await this.walkStatements(statements, [], filePath);
    } finally {
      this.modulePrefix = previousPrefix;
    }
  }
}
