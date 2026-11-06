import * as ts from "ts-morph";
import {
  ModuleScope,
  namespaceOfSymbolType,
  Symbol,
  SymbolFacet,
  SymbolType,
} from "@/symbol";
import * as parser from "@parser/index";
import { TranspileException } from "@/transpiler";
import { SymbolTable } from "@/symbol/table";
import { ModuleExportRecord, ModuleExportTable } from "@/symbol/exports";
import { IRDeclarationUnion } from "@ir/declaration";
import { createFQN, createFQNPrefix } from "@/symbol/fqn";
import { ParseContext } from "@parser/context";
import { cloneData } from "@ir/clone";

/** `export as namespace X` aliases, keyed by declaring file. Run-owned. */
export type NamespaceExports = Map<string, Set<string>>;

/**
 * A statement symbol generation could not process. Returned to the caller
 * rather than logged through process state (`R-13`): orchestration decides
 * whether it is fatal, printed, or handed back to an embedding API.
 */
export interface GenerationDiagnostic {
  code: string;
  message: string;
  file: string;
  line?: number;
  column?: number;
}

/**
 * TypeScript's syntactic (parse) diagnostics for one file, as generation
 * failures (HD-13). The parser recovers from a malformed declaration by
 * dropping or inventing nodes, so symbols generated from a file that has any
 * would be plausible but untrustworthy; the code is the compiler's `TSnnnn`.
 * Semantic (type-check) diagnostics are deliberately not collected: an
 * unresolved name degrades to a named typedef and the link report counts it
 * (D-10).
 */
export function syntacticDiagnosticsOf(sourceFile: ts.SourceFile): GenerationDiagnostic[] {
  const file = String(sourceFile.getFilePath());
  return sourceFile
    .getProject()
    .getProgram()
    .getSyntacticDiagnostics(sourceFile)
    .map((diagnostic) => {
      const start = diagnostic.getStart();
      const position = start !== undefined ? sourceFile.getLineAndColumnAtPos(start) : undefined;
      return {
        code: `TS${diagnostic.getCode()}`,
        message: ts.ts.flattenDiagnosticMessageText(diagnostic.compilerObject.messageText, "\n"),
        file,
        ...(position ? { line: position.line, column: position.column } : {}),
      };
    });
}

/**
 * One top-level statement's generation output, kept by a watch session so an
 * unchanged statement is replayed instead of re-parsed. `symbols` are pristine
 * copies never handed to a table (the semantic pass mutates what it receives).
 */
export interface StatementCacheEntry {
  symbols: Symbol[];
  namespaceAliases: string[];
  exportRecords: ModuleExportRecord[];
  errors: { code: string; message: string; line?: number; column?: number }[];
  /** 1-based start line when cached; replay shifts every location by the delta. */
  line: number;
  /** Identifier tokens in the statement text. */
  tokens: Set<string>;
  /** Names the statement declares. */
  declared: Set<string>;
  /** Whether other statements can read this one's types through `typeof`. */
  valueLike: boolean;
  /** Names this statement reads as values (`typeof X`; any name in an enum). */
  valueTokens: Set<string>;
}

/** Keyed by statement position-independent identity (see `statementKey`). */
export type StatementCache = Map<string, StatementCacheEntry>;

export interface GenerateOptions {
  /**
   * Reuse unchanged top-level statements from a previous generation of the
   * same file, and leave this generation's statements in the cache.
   */
  statementCache?: StatementCache;
  /** Receives the FQNs registered by statements that were actually parsed. */
  freshFQNs?: Set<string>;
}

/**
 * Top-level entry point for symbol generation.
 *
 * Parses the AST of one file into the run-owned `symbolTable` and records any
 * `export as namespace` aliases in `namespaceExports`. Both are explicit
 * dependencies; there is no ambient compiler state (task 4.11).
 */
export async function generateSymbols(
  fp: string,
  sourceFile: ts.SourceFile,
  symbolTable: SymbolTable,
  namespaceExports: NamespaceExports,
  moduleExports: ModuleExportTable = new Map(),
  options: GenerateOptions = {},
): Promise<GenerationDiagnostic[]> {
  const generator = new SymbolGenerator(
    symbolTable,
    namespaceExports,
    moduleExports,
    options.statementCache,
    options.freshFQNs,
  );
  return generator.generateSymbols(fp, sourceFile);
}

const IDENTIFIER = /[A-Za-z_$][\w$]*/g;

function lineOf(node: ts.Node): { line: number; column: number } {
  const position = ts.ts.getLineAndCharacterOfPosition(
    node.getSourceFile().compilerNode,
    node.getStart(),
  );
  return { line: position.line + 1, column: position.character + 1 };
}

/** Names a top-level statement declares, read from syntax alone. */
function declaredNamesOf(statement: ts.Statement, into = new Set<string>()): Set<string> {
  const named = statement as ts.Statement & { getName?: () => string | undefined };
  if (ts.Node.isVariableStatement(statement)) {
    for (const declaration of statement.getDeclarations()) into.add(declaration.getName());
  } else if (ts.Node.isModuleDeclaration(statement)) {
    for (const segment of statement.getName().split(".")) into.add(segment.replace(/['"]/g, ""));
    for (const inner of statement.getStatements()) declaredNamesOf(inner, into);
  } else if (named.getName) {
    into.add(named.getName() ?? "default");
  } else {
    for (const token of statement.getText().match(IDENTIFIER) ?? []) into.add(token);
  }
  return into;
}

/** Statements whose *types* other statements can read through `typeof`. */
function isValueLike(statement: ts.Statement): boolean {
  return (
    ts.Node.isVariableStatement(statement) ||
    ts.Node.isEnumDeclaration(statement) ||
    ts.Node.isModuleDeclaration(statement) ||
    ts.Node.isClassDeclaration(statement)
  );
}

function valueTokensOf(statement: ts.Statement): Set<string> {
  const text = statement.getFullText();
  if (ts.Node.isEnumDeclaration(statement)) return new Set(text.match(IDENTIFIER) ?? []);
  return new Set([...text.matchAll(/\btypeof\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1]));
}

/** Shifts every source location in a cloned statement output by `delta`. */
function shiftLocations(value: unknown, delta: number, seen = new Set<object>()): void {
  if (delta === 0 || value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) shiftLocations(item, delta, seen);
    return;
  }
  const record = value as Record<string, unknown>;
  const loc = record.loc as { line?: number } | undefined;
  if (loc && typeof loc.line === "number" && !seen.has(loc)) {
    seen.add(loc);
    loc.line += delta;
  }
  for (const key in record) {
    if (key !== "loc") shiftLocations(record[key], delta, seen);
  }
}

class SymbolGenerator {
  private moduleScopes: ModuleScope[] = [];
  private sourceOrder = 0;
  private fileIsModule = false;

  /** Symbols registered while a statement is being captured for the cache. */
  private captured?: Symbol[];

  constructor(
    private readonly symbolTable: SymbolTable,
    private readonly namespaceExports: NamespaceExports,
    private readonly moduleExports: ModuleExportTable,
    private readonly statementCache?: StatementCache,
    private readonly freshFQNs?: Set<string>,
  ) {}

  private recordExport(filePath: string, record: ModuleExportRecord): void {
    // Only file-level export statements describe the file's module. Exports
    // inside `declare module "x"` blocks belong to that ambient module.
    if (this.moduleScopes.length > 0) return;
    let records = this.moduleExports.get(filePath);
    if (!records) this.moduleExports.set(filePath, (records = []));
    records.push(record);
  }

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
        fileIsModule: this.fileIsModule,
      },
      emit: true,
      ...(synthetic ? { synthetic } : {}),
      provenance: [{ fqn, type, loc: ir.loc }],
    };
    const symbol: Symbol = {
      fqn,
      facets: [facet],
      // Dependencies are derived once, after semantic rewrites, by the
      // semantic pass (`refreshDependencies`); computing them here was a
      // full IR walk thrown away immediately.
      deps: [],
      resolvedDeps: [],
    };
    this.captured?.push(symbol);
    this.symbolTable.adopt(fqn, symbol);
  }

  /**
   * Generates the file's top-level statements, replaying cached ones that are
   * provably unaffected: same text and position-independent identity, and no
   * identifier they mention is declared by a statement that changed or
   * disappeared (which could change what the checker binds it to).
   */
  private async walkTopLevelWithCache(
    statements: ts.Statement[],
    errors: TranspileException[],
    filePath: string,
    cache: StatementCache,
  ): Promise<void> {
    const overloadIndex = new Map<string, number>();
    const keys = statements.map((statement) => {
      let overload = "";
      if (ts.Node.isFunctionDeclaration(statement)) {
        const name = statement.getName() ?? "default";
        const index = overloadIndex.get(name) ?? 0;
        overloadIndex.set(name, index + 1);
        overload = `${name}#${index}`;
      }
      const { column } = lineOf(statement);
      return `${this.fileIsModule ? "m" : "s"}\u0000${column}\u0000${overload}\u0000${statement.getFullText()}`;
    });
    // Binding: a name declared before but not now (or now but not before)
    // can change what any statement mentioning it binds to. Values: a
    // changed variable/enum/namespace/class can change what `typeof` reads.
    const used = new Set<string>();
    const newDeclared = new Set<string>();
    const changedValues = new Set<string>();
    keys.forEach((key, index) => {
      const statement = statements[index];
      const names = declaredNamesOf(statement);
      names.forEach((name) => newDeclared.add(name));
      if (cache.has(key) && !used.has(key)) used.add(key);
      else if (isValueLike(statement)) names.forEach((name) => changedValues.add(name));
    });
    const oldDeclared = new Set<string>();
    for (const [key, entry] of cache) {
      entry.declared.forEach((name) => oldDeclared.add(name));
      if (!used.has(key) && entry.valueLike) entry.declared.forEach((name) => changedValues.add(name));
    }
    const touched = new Set<string>();
    for (const name of newDeclared) if (!oldDeclared.has(name)) touched.add(name);
    for (const name of oldDeclared) if (!newDeclared.has(name)) touched.add(name);

    const next: StatementCache = new Map();
    for (const [index, statement] of statements.entries()) {
      const key = keys[index];
      const entry = cache.get(key);
      const reusable =
        entry !== undefined &&
        !next.has(key) &&
        ![...touched].some((name) => entry.tokens.has(name)) &&
        ![...changedValues].some((name) => entry.valueTokens.has(name));
      if (reusable) {
        this.replay(entry, statement, filePath, errors);
        next.set(key, entry);
        continue;
      }
      const firstError = errors.length;
      const aliasesBefore = new Set(this.namespaceExports.get(filePath) ?? []);
      const recordsBefore = this.moduleExports.get(filePath)?.length ?? 0;
      this.captured = [];
      await this.walkStatements([statement], errors, filePath);
      const symbols = this.captured;
      this.captured = undefined;
      for (const symbol of symbols) this.freshFQNs?.add(symbol.fqn);
      const declared = declaredNamesOf(statement);
      for (const symbol of symbols) {
        for (const segment of symbol.fqn.slice(symbol.fqn.indexOf("::") + 2).split("|")) {
          declared.add(segment);
        }
      }
      next.set(key, {
        symbols: cloneData(symbols),
        namespaceAliases: [...(this.namespaceExports.get(filePath) ?? [])].filter(
          (alias) => !aliasesBefore.has(alias),
        ),
        exportRecords: structuredClone(
          (this.moduleExports.get(filePath) ?? []).slice(recordsBefore),
        ),
        errors: errors.slice(firstError).map((error) => ({
          code: error.code,
          message: error.message,
          ...(error.line !== undefined ? { line: error.line } : {}),
          ...(error.column !== undefined ? { column: error.column } : {}),
        })),
        line: lineOf(statement).line,
        tokens: new Set(statement.getFullText().match(IDENTIFIER) ?? []),
        declared,
        valueLike: isValueLike(statement),
        valueTokens: valueTokensOf(statement),
      });
    }
    cache.clear();
    for (const [key, entry] of next) cache.set(key, entry);
  }

  private replay(
    entry: StatementCacheEntry,
    statement: ts.Statement,
    filePath: string,
    errors: TranspileException[],
  ): void {
    const delta = lineOf(statement).line - entry.line;
    const symbols = cloneData(entry.symbols);
    shiftLocations(symbols, delta);
    for (const symbol of symbols) {
      for (const facet of symbol.facets) {
        facet.origin = { ...facet.origin, sourceOrder: this.sourceOrder++ };
      }
      this.symbolTable.adopt(symbol.fqn, symbol);
    }
    if (entry.namespaceAliases.length > 0) {
      let aliases = this.namespaceExports.get(filePath);
      if (!aliases) this.namespaceExports.set(filePath, (aliases = new Set()));
      entry.namespaceAliases.forEach((alias) => aliases!.add(alias));
    }
    for (const record of entry.exportRecords) {
      this.recordExport(filePath, { ...structuredClone(record), line: record.line + delta });
    }
    for (const error of entry.errors) {
      errors.push(
        new TranspileException(
          error.message,
          error.code,
          filePath,
          error.line !== undefined ? error.line + delta : undefined,
          error.column,
        ),
      );
    }
  }

  public async generateSymbols(
    fp: string,
    sourceFile: ts.SourceFile,
  ): Promise<GenerationDiagnostic[]> {
    const errors: TranspileException[] = [];
    this.fileIsModule = ts.ts.isExternalModule(sourceFile.compilerNode);
    try {
      if (this.statementCache) {
        await this.walkTopLevelWithCache(sourceFile.getStatements(), errors, fp, this.statementCache);
      } else {
        await this.walkStatements(sourceFile.getStatements(), errors, fp);
      }
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

    return errors.map((error) => ({
      code: error.code,
      message: error.message,
      file: error.file ?? fp,
      ...(error.line !== undefined ? { line: error.line } : {}),
      ...(error.column !== undefined ? { column: error.column } : {}),
    }));
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
              lineOf(statement).line,
              lineOf(statement).column,
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
        let aliases = this.namespaceExports.get(filePath);
        if (!aliases) {
          aliases = new Set();
          this.namespaceExports.set(filePath, aliases);
        }
        aliases.add(alias);
        break;
      }

      case ts.SyntaxKind.ExportAssignment: {
        const assignment = statement as ts.ExportAssignment;
        this.recordExport(filePath, {
          kind: "assignment",
          isDefault: !assignment.isExportEquals(),
          expression: assignment.getExpression().getText(),
          line: assignment.getStartLineNumber(),
        });
        break;
      }

      case ts.SyntaxKind.ExportDeclaration: {
        const declaration = statement as ts.ExportDeclaration;
        const specifier = declaration.getModuleSpecifierValue();
        const target = declaration.getModuleSpecifierSourceFile();
        const targetFile = target
          ? String(target.getFilePath()).split("\\").join("/")
          : undefined;
        const common = {
          ...(targetFile ? { targetFile } : {}),
          isTypeOnly: declaration.isTypeOnly(),
          line: declaration.getStartLineNumber(),
        };
        const namespaceExport = declaration.getNamespaceExport();
        if (namespaceExport && specifier !== undefined) {
          this.recordExport(filePath, {
            kind: "namespace",
            alias: namespaceExport.getName(),
            specifier,
            ...common,
          });
        } else if (declaration.hasNamedExports()) {
          this.recordExport(filePath, {
            kind: "named",
            elements: declaration.getNamedExports().map((element) => {
              const alias = element.getAliasNode()?.getText();
              return {
                name: alias ?? element.getName(),
                ...(alias ? { propertyName: element.getName() } : {}),
                isTypeOnly: element.isTypeOnly(),
              };
            }),
            ...(specifier !== undefined ? { specifier } : {}),
            ...common,
          });
        } else if (specifier !== undefined) {
          this.recordExport(filePath, { kind: "star", specifier, ...common });
        }
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
    const className = node.getName() ?? "default";
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
    const functionName = node.getName() ?? "default";
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
