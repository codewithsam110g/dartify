import * as ts from "ts-morph";
import {
  ModuleScope,
  namespaceOfSymbolType,
  Symbol,
  SymbolFacet,
  SymbolType,
} from "@/symbol";
import * as parser from "@parser/index";
import { transpilerContext } from "@/context";
import { TranspileException } from "@/transpiler";
import { IRDeclarationUnion } from "@ir/declaration";
import { createFQN, createFQNPrefix } from "@/symbol/fqn";
import { ParseContext } from "@parser/context";
import { dependenciesOf } from "@/symbol/dependencies";

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
  private moduleScopes: ModuleScope[] = [];
  private sourceOrder = 0;

  private parseContext(fqn: string, filePath: string): ParseContext {
    return new ParseContext(fqn, (hoistedFQN, declaration) => {
      this.register(
        hoistedFQN,
        SymbolType.INTERFACE,
        declaration,
        filePath,
        "anonymousType",
      );
    });
  }

  private fqnScopes(): string[] {
    return this.moduleScopes.flatMap((scope) =>
      scope.kind === "global" ? [] : [scope.sourceName],
    );
  }

  private register(
    fqn: string,
    type: SymbolType,
    ir: IRDeclarationUnion,
    filePath: string,
    synthetic?: SymbolFacet["synthetic"],
  ): void {
    const facet: SymbolFacet = {
      type,
      namespace: namespaceOfSymbolType(type),
      ir,
      origin: {
        filePath,
        scopes: this.moduleScopes.map((scope) => ({ ...scope })),
        sourceOrder: this.sourceOrder++,
      },
      emit: true,
      ...(synthetic ? { synthetic } : {}),
      provenance: [{ fqn, type, loc: ir.loc }],
    };
    const symbol: Symbol = {
      fqn,
      facets: [facet],
      deps: dependenciesOf(ir),
      resolvedDeps: [],
    };
    transpilerContext.symbolTable.register(fqn, symbol);
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
    const fqn = createFQN(filePath, this.fqnScopes(), interfaceName);
    const parsedInterface = parser.parseInterface(
      node,
      this.parseContext(fqn, filePath),
    );
    this.register(fqn, SymbolType.INTERFACE, parsedInterface, filePath);
  }

  private processTypeAliasDeclaration(
    node: ts.TypeAliasDeclaration,
    filePath: string,
  ): void {
    const aliasName = node.getName();
    const fqn = createFQN(filePath, this.fqnScopes(), aliasName);
    const parsedTypeAlias = parser.parseTypeAlias(
      node,
      this.parseContext(fqn, filePath),
    );
    this.register(fqn, SymbolType.TYPE_ALIAS, parsedTypeAlias, filePath);
  }

  private processClassDeclaration(
    node: ts.ClassDeclaration,
    filePath: string,
  ): void {
    const className = node.getName() || "Error_Class";
    const fqn = createFQN(filePath, this.fqnScopes(), className);
    const parsedClass = parser.parseClass(
      node,
      this.parseContext(fqn, filePath),
    );
    this.register(fqn, SymbolType.CLASS, parsedClass, filePath);
  }

  private processFunctionDeclaration(
    node: ts.FunctionDeclaration,
    filePath: string,
  ): void {
    const functionName = node.getName() || "Error_Function";
    const fqn = createFQN(filePath, this.fqnScopes(), functionName);
    const parsedFunction = parser.parseFunction(
      node,
      this.parseContext(fqn, filePath),
    );
    this.register(fqn, SymbolType.FUNCTION, parsedFunction, filePath);
  }

  private processVariableStatement(
    node: ts.VariableStatement,
    filePath: string,
  ): void {
    const fqnPrefix = createFQNPrefix(filePath, this.fqnScopes());
    const parsedVariables = parser.parseVariableStmt(
      fqnPrefix,
      node,
      new ParseContext(fqnPrefix, (hoistedFQN, declaration) => {
        this.register(
          hoistedFQN,
          SymbolType.INTERFACE,
          declaration,
          filePath,
          "anonymousType",
        );
      }),
    );
    for (const variable of parsedVariables) {
      const fqn = createFQN(filePath, this.fqnScopes(), variable.name);
      this.register(fqn, SymbolType.VARIABLE, variable, filePath);
    }
  }

  private processEnumDeclaration(
    node: ts.EnumDeclaration,
    filePath: string,
  ): void {
    const enumName = node.getName();
    const fqn = createFQN(filePath, this.fqnScopes(), enumName);
    const parsedEnum = parser.parseEnum(node);
    this.register(fqn, SymbolType.ENUM, parsedEnum, filePath);
  }

  private async processModuleDeclaration(
    node: ts.ModuleDeclaration,
    filePath: string,
    errors: TranspileException[],
  ): Promise<void> {
    const scope = this.moduleScope(node);
    try {
      this.moduleScopes.push(scope);
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

  private moduleScope(node: ts.ModuleDeclaration): ModuleScope {
    const sourceName = node.getName();
    const declarationKind = node.getDeclarationKind();
    if (declarationKind === "global") {
      return { kind: "global", sourceName: "global" };
    }

    if (declarationKind === "namespace") {
      return {
        kind: "namespace",
        sourceName,
        jsSegments: sourceName.split(".").filter(Boolean),
      };
    }

    const nameNode = node.getNameNode();
    const specifier = ts.Node.isStringLiteral(nameNode)
      ? nameNode.getLiteralText()
      : sourceName.replace(/^['"]|['"]$/g, "");
    return {
      kind: "externalModule",
      sourceName,
      specifier,
      canonicalTarget: specifier,
      isAugmentation:
        ts.Node.isStringLiteral(nameNode) &&
        ts.ts.isExternalModule(node.getSourceFile().compilerNode),
    };
  }
}
