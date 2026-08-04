import * as ts from "ts-morph";
import { Symbol, SymbolType } from "@/symbol";
import * as parser from "@parser/index";
import { transpilerContext } from "@/context";
import { TranspileException } from "@/transpiler";
import { IRDeclaration } from "@ir/declaration";
import { IRReferenceTarget } from "@ir/type";
import { forEachIRType } from "@ir/visit";
import { createFQN, createFQNPrefix } from "@/symbol/fqn";
import { ParseContext } from "@parser/context";

function dependenciesOf(ir: IRDeclaration): IRReferenceTarget[] {
  const dependencies: IRReferenceTarget[] = [];
  forEachIRType(ir, (type) => {
    if (type.reference) dependencies.push(type.reference);
  });
  return dependencies;
}

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
  private moduleScopes: string[] = [];

  private parseContext(fqn: string): ParseContext {
    return new ParseContext(fqn, (hoistedFQN, declaration) => {
      transpilerContext.symbolTable.register(hoistedFQN, {
        type: SymbolType.INTERFACE,
        ir: declaration,
        fqn: hoistedFQN,
        deps: dependenciesOf(declaration),
        resolvedDeps: [],
      });
    });
  }

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
        await this.processStatementDeclaration(statement, filePath, errors);
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
    errors: TranspileException[],
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
          errors,
        );
        break;

      case ts.SyntaxKind.NamespaceExportDeclaration: {
        const alias = (
          statement.compilerNode as ts.ts.NamespaceExportDeclaration
        ).name.text;
        let aliases = transpilerContext.namespaceExports.get(filePath);
        if (!aliases) {
          aliases = new Set();
          transpilerContext.namespaceExports.set(filePath, aliases);
        }
        aliases.add(alias);
        break;
      }

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
    let fqn = createFQN(filePath, this.moduleScopes, interfaceName);
    const parsedInterface = parser.parseInterface(node, this.parseContext(fqn));
    let symbol: Symbol = {
      type: SymbolType.INTERFACE,
      ir: parsedInterface,
      fqn,
      deps: dependenciesOf(parsedInterface),
      resolvedDeps: [],
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private processTypeAliasDeclaration(
    node: ts.TypeAliasDeclaration,
    filePath: string,
  ): void {
    const aliasName = node.getName();
    let fqn = createFQN(filePath, this.moduleScopes, aliasName);
    const parsedTypeAlias = parser.parseTypeAlias(node, this.parseContext(fqn));
    let symbol: Symbol = {
      type: SymbolType.TYPE_ALIAS,
      ir: parsedTypeAlias,
      fqn,
      deps: dependenciesOf(parsedTypeAlias),
      resolvedDeps: [],
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private processClassDeclaration(
    node: ts.ClassDeclaration,
    filePath: string,
  ): void {
    let className = node.getName() || "Error_Class";
    let fqn = createFQN(filePath, this.moduleScopes, className);
    const parsedClass = parser.parseClass(node, this.parseContext(fqn));
    let symbol: Symbol = {
      type: SymbolType.CLASS,
      ir: parsedClass,
      fqn,
      deps: dependenciesOf(parsedClass),
      resolvedDeps: [],
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private processFunctionDeclaration(
    node: ts.FunctionDeclaration,
    filePath: string,
  ): void {
    let functionName = node.getName() || "Error_Function";
    let fqn = createFQN(filePath, this.moduleScopes, functionName);
    const parsedFunction = parser.parseFunction(node, this.parseContext(fqn));
    let symbol: Symbol = {
      type: SymbolType.FUNCTION,
      ir: parsedFunction,
      fqn,
      deps: dependenciesOf(parsedFunction),
      resolvedDeps: [],
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private processVariableStatement(
    node: ts.VariableStatement,
    filePath: string,
  ): void {
    const fqnPrefix = createFQNPrefix(filePath, this.moduleScopes);
    const parsedVariables = parser.parseVariableStmt(
      fqnPrefix,
      node,
      new ParseContext(fqnPrefix, (hoistedFQN, declaration) => {
        transpilerContext.symbolTable.register(hoistedFQN, {
          type: SymbolType.INTERFACE,
          ir: declaration,
          fqn: hoistedFQN,
          deps: dependenciesOf(declaration),
          resolvedDeps: [],
        });
      }),
    );
    for (const variable of parsedVariables) {
      let fqn = createFQN(filePath, this.moduleScopes, variable.name);
      let symbol: Symbol = {
        type: SymbolType.VARIABLE,
        ir: variable,
        fqn,
        deps: dependenciesOf(variable),
        resolvedDeps: [],
      };
      transpilerContext.symbolTable.register(fqn, symbol);
    }
  }

  private processEnumDeclaration(
    node: ts.EnumDeclaration,
    filePath: string,
  ): void {
    const enumName = node.getName();
    let fqn = createFQN(filePath, this.moduleScopes, enumName);
    const parsedEnum = parser.parseEnum(node);
    let symbol: Symbol = {
      type: SymbolType.ENUM,
      ir: parsedEnum,
      fqn,
      deps: dependenciesOf(parsedEnum),
      resolvedDeps: [],
    };
    transpilerContext.symbolTable.register(fqn, symbol);
  }

  private async processModuleDeclaration(
    node: ts.ModuleDeclaration,
    filePath: string,
    errors: TranspileException[],
  ): Promise<void> {
    const moduleName = node.getName();
    try {
      this.moduleScopes.push(moduleName);
      const statements = node.getStatements();
      // The caller's array, not a fresh one. This used to pass `[]`, so every
      // error raised inside a `declare module` or `namespace` was pushed into
      // a value nothing could read — unreported even with `--enable-logs`, and
      // invisible to the stress tier, which only sees what escapes the run
      // (`R-12`). leaflet alone has 15 namespaces.
      await this.walkStatements(statements, errors, filePath);
    } finally {
      this.moduleScopes.pop();
    }
  }
}
