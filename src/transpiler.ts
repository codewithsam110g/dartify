import * as ts from "ts-morph";
import { readFile, writeFile, mkdir } from "fs/promises";
import { TypeScriptToDartParser, createParser } from "./type.js";
import { resolve, basename, extname, join, dirname } from "path";

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
  debugOut?: boolean;
}

interface ParsedVariable {
  name: string;
  typeBefore: string;
  typeAfter: string;
}

interface ParsedFunction {
  name: string;
  returnType: string;
  parameters: string;
}

interface ParsedEnum {
  name: string;
  members: Array<{ name: string; value: string | null; type: ts.Type; }>;
}

interface ParsedTypeAlias {
  name: string;
  typeBefore: string;
  typeAfter: string;
}

interface ParsedInterface {
  name: string;
  properties: ParsedVariable[];
  methods: ParsedFunction[];
  callSignatures: ParsedFunction[];
  constructSignatures: ParsedFunction[];
  indexSignatures: Array<{
    keyName: string;
    keyType: string;
    returnType: string;
  }>;
  getAccessors: ParsedFunction[];
  setAccessors: Array<{ name: string; parameter: string }>;
  extends: string[];
}

interface FileTranspileResult {
  filePath: string;
  dartOutput: string;
  errors: TranspileException[];
}

export class Transpiler {
  private readonly files: string[];
  private readonly outDir: string;
  private readonly debugOut: boolean;
  private project: ts.Project;
  private typeParser: TypeScriptToDartParser;
  private modulePrefix: string = "";
  private currentFile: string = "";

  constructor(options: TranspilerOptions) {
    this.files = options.files;
    this.outDir = options.outDir;
    this.debugOut = options.debugOut ?? false;
    this.project = new ts.Project();
    this.typeParser = createParser();

    this.logDebug("Debug output:", this.debugOut);
    if (!Array.isArray(this.files) || this.files.length === 0) {
      throw new TranspileException(
        "Files array cannot be empty",
        "INVALID_FILES",
      );
    }

    this.logDebug("Transpiler initialized with files:", this.files);
  }

  public async transpile(): Promise<void> {
    try {
      this.logDebug("Starting transpilation process...");
      await this.validateFiles();

      const results: FileTranspileResult[] = [];

      for (const file of this.files) {
        const result = await this.transpileFile(file);
        results.push(result);
      }

      await this.writeResults(results);

      // Report any errors
      const allErrors = results.flatMap((r) => r.errors);
      if (allErrors.length > 0) {
        console.warn(
          `Transpilation completed with ${allErrors.length} warnings/errors`,
        );
        allErrors.forEach((error) => console.warn(error.toString()));
      }

      this.logDebug("Transpilation completed successfully");
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
    this.logDebug(`Transpiling file: ${filePath}`);

    const result: FileTranspileResult = {
      filePath,
      dartOutput: "",
      errors: [],
    };

    try {
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
      const dartParts: string[] = [];
      for (const statement of sourceFile.getStatements()) {
        try {
          const dartCode = this.processStatement(statement);
          if (dartCode) {
            dartParts.push(dartCode);
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

      // Generate final Dart output
      result.dartOutput =
        this.generateDartFileHeader(filePath) + dartParts.join("\n\n");
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

  private generateDartFileHeader(filePath: string): string {
    const fileName = basename(filePath, extname(filePath));
    return `// Generated from ${basename(filePath)}
// Do not edit directly

library ${fileName.replace(/[^a-zA-Z0-9]/g, "_")};

`;
  }

  private processStatement(statement: ts.Statement): string | null {
    switch (statement.getKind()) {
      case ts.SyntaxKind.VariableStatement:
        return this.processVariableStatement(
          statement.asKindOrThrow(ts.SyntaxKind.VariableStatement),
        );
      case ts.SyntaxKind.TypeAliasDeclaration:
        return this.processTypeAliasDeclaration(
          statement.asKindOrThrow(ts.SyntaxKind.TypeAliasDeclaration),
        );
      case ts.SyntaxKind.EnumDeclaration:
        return this.processEnumDeclaration(
          statement.asKindOrThrow(ts.SyntaxKind.EnumDeclaration),
        );
      case ts.SyntaxKind.FunctionDeclaration:
        return this.processFunctionDeclaration(
          statement.asKindOrThrow(ts.SyntaxKind.FunctionDeclaration),
        );
      case ts.SyntaxKind.InterfaceDeclaration:
        return this.processInterfaceDeclaration(
          statement.asKindOrThrow(ts.SyntaxKind.InterfaceDeclaration),
        );
      case ts.SyntaxKind.ClassDeclaration:
        return this.processClassDeclaration(
          statement.asKindOrThrow(ts.SyntaxKind.ClassDeclaration),
        );
      case ts.SyntaxKind.ModuleDeclaration:
        return this.processModuleDeclaration(
          statement.asKindOrThrow(ts.SyntaxKind.ModuleDeclaration),
        );
      default:
        this.logDebug(`Unhandled statement kind: ${statement.getKindName()}`);
        return null;
    }
  }

  private processVariableStatement(
    variableStatement: ts.VariableStatement,
  ): string {
    const variables = this.parseVariableStatement(variableStatement);
    this.logVariableStatement(variables);

    // Generate Dart code for variables
    return variables
      .map((variable) => `external ${variable.typeAfter} ${variable.name};`)
      .join("\n");
  }

  private processTypeAliasDeclaration(
    typeAlias: ts.TypeAliasDeclaration,
  ): string {
    const parsed = this.parseTypeAlias(typeAlias);
    this.logTypeAlias(parsed);

    // Generate Dart typedef
    return `typedef ${parsed.name} = ${parsed.typeAfter};`;
  }

  private processEnumDeclaration(enumDeclaration: ts.EnumDeclaration): string {
    const parsedEnum = this.parseEnum(enumDeclaration);
    this.logEnum(parsedEnum);   
    // Generate Dart enum
    const members = parsedEnum.members
      .map((member) => {
        return `  external static ${this.typeParser.resolveDartType(member.type)} get ${member.name};`;
      })
      .join("\n");
    
    return `class ${parsedEnum.name}{}\nextension ${parsedEnum.name}Enum on ${parsedEnum.name}{\n${members}\n}`;
  }

  private processFunctionDeclaration(
    functionDeclaration: ts.FunctionDeclaration,
  ): string {
    const parsedFunction = this.parseFunction(functionDeclaration);
    this.logFunction(parsedFunction);

    // Generate Dart function declaration
    return `external ${parsedFunction.returnType} ${parsedFunction.name}(${parsedFunction.parameters});`;
  }

  private processInterfaceDeclaration(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): string {
    const parsedInterface = this.parseInterface(interfaceDeclaration);
    this.logInterface(parsedInterface);

    // Generate Dart class/interface
    const dartParts: string[] = [];

    // Class declaration with extends
    let classDecl = `abstract class ${parsedInterface.name}`;
    if (parsedInterface.extends.length > 0) {
      classDecl += ` extends ${parsedInterface.extends[0]}`; // Dart only supports single inheritance
    }
    dartParts.push(classDecl + " {");

    // Properties
    parsedInterface.properties.forEach((prop) => {
      dartParts.push(`  external ${prop.typeAfter} ${prop.name};`);
    });

    // Methods
    parsedInterface.methods.forEach((method) => {
      dartParts.push(
        `  external ${method.returnType} ${method.name}(${method.parameters});`,
      );
    });

    // Getters
    parsedInterface.getAccessors.forEach((getter) => {
      dartParts.push(`  external ${getter.returnType} get ${getter.name};`);
    });

    // Setters
    parsedInterface.setAccessors.forEach((setter) => {
      dartParts.push(`  external set ${setter.name}(${setter.parameter});`);
    });

    dartParts.push("}");

    return dartParts.join("\n");
  }

  private processClassDeclaration(
    classDeclaration: ts.ClassDeclaration,
  ): string {
    this.logDebug(`Processing class: ${classDeclaration.getName()}`);
    // TODO: Implement full class processing
    return `// TODO: Class ${classDeclaration.getName()} processing not yet implemented`;
  }

  private processModuleDeclaration(
    moduleDeclaration: ts.ModuleDeclaration,
  ): string {
    this.logDebug(`Processing module: ${moduleDeclaration.getName()}`);

    const previousPrefix = this.modulePrefix;
    this.modulePrefix += moduleDeclaration.getName() + ".";
    this.logDebug(`Module prefix updated to: ${this.modulePrefix}`);

    const moduleContent = this.processModuleContents(moduleDeclaration);

    // Process nested modules
    const nestedModules = moduleDeclaration.getModules();
    const nestedContent = nestedModules
      .map((nested) => this.processModuleDeclaration(nested))
      .join("\n\n");

    this.modulePrefix = previousPrefix;

    // Generate Dart library/namespace equivalent
    const moduleName = moduleDeclaration.getName();
    const dartParts = [`// Module: ${moduleName}`, moduleContent];

    if (nestedContent) {
      dartParts.push(nestedContent);
    }

    return dartParts.join("\n");
  }

  private processModuleContents(
    moduleDeclaration: ts.ModuleDeclaration,
  ): string {
    const statements = moduleDeclaration.getStatements();
    const dartParts: string[] = [];

    // Process variables
    const variableStatements = statements.filter((stmt) =>
      stmt.isKind(ts.SyntaxKind.VariableStatement),
    ) as ts.VariableStatement[];

    variableStatements.forEach((varStmt) => {
      const result = this.processVariableStatement(varStmt);
      if (result) dartParts.push(result);
    });

    // Process type aliases
    const typeAliases = statements.filter((stmt) =>
      stmt.isKind(ts.SyntaxKind.TypeAliasDeclaration),
    ) as ts.TypeAliasDeclaration[];

    typeAliases.forEach((typeAlias) => {
      const result = this.processTypeAliasDeclaration(typeAlias);
      if (result) dartParts.push(result);
    });

    // Process functions
    const functions = moduleDeclaration.getFunctions();
    functions.forEach((func) => {
      const result = this.processFunctionDeclaration(func);
      if (result) dartParts.push(result);
    });

    // Process enums
    const enums = moduleDeclaration.getEnums();
    enums.forEach((enumDecl) => {
      const result = this.processEnumDeclaration(enumDecl);
      if (result) dartParts.push(result);
    });

    // Process interfaces
    const interfaces = moduleDeclaration.getInterfaces();
    interfaces.forEach((interfaceDecl) => {
      const result = this.processInterfaceDeclaration(interfaceDecl);
      if (result) dartParts.push(result);
    });

    return dartParts.join("\n\n");
  }

  // Parsing methods (same as before)
  private parseVariableStatement(
    variableStatement: ts.VariableStatement,
  ): ParsedVariable[] {
    return variableStatement.getDeclarations().map((decl) => ({
      name: decl.getName(),
      typeBefore: decl.getTypeNode()?.getText() || "inferred",
      typeAfter: this.typeParser.resolveDartType(decl.getType()),
    }));
  }

  private parseTypeAlias(typeAlias: ts.TypeAliasDeclaration): ParsedTypeAlias {
    const type = typeAlias.getType();
    return {
      name: typeAlias.getName(),
      typeBefore: type.getText(),
      typeAfter: this.typeParser.resolveDartType(type),
    };
  }

  private parseEnum(enumDeclaration: ts.EnumDeclaration): ParsedEnum {
    return {
      name: enumDeclaration.getName(),
      members: enumDeclaration.getMembers().map((member) => ({
        name: member.getName(),
        value: member.getInitializer()?.getText() || null,
        type: member.getType()
      })),
    };
  }

  private parseFunction(
    functionDeclaration: ts.FunctionDeclaration,
  ): ParsedFunction {
    const parameters = functionDeclaration
      .getParameters()
      .map(
        (param) =>
          `${this.getTypeRefName(param)} ${param.getName()}`,
      )
      .join(", ");    

    return {
      name: functionDeclaration.getName() || "anonymous",
      returnType: this.getRetTypeRefName(functionDeclaration),
      parameters,
    };
  }
  
  private getRetTypeRefName(func: ts.FunctionDeclaration,
): string{
    let val = this.getReturnTypeReferenceName(func);
    if (val != undefined) return val;
    return this.typeParser.resolveDartType(func.getReturnType());
}
  
  private getReturnTypeReferenceName(
    func: ts.FunctionDeclaration,
  ): string | undefined {
    const returnTypeNode = func.getReturnTypeNode();
  
    if (!returnTypeNode) return undefined;
  
    if (returnTypeNode.getKind() === ts.SyntaxKind.TypeReference) {
      const typeRef = returnTypeNode.asKindOrThrow(ts.SyntaxKind.TypeReference);
  
      const typeName = typeRef.getTypeName();
  
      if (ts.Node.isIdentifier(typeName)) {
        return typeName.getText(); // ✅ e.g. "CoordIJ"
      } else if (ts.Node.isQualifiedName(typeName)) {
        return typeName.getRight().getText(); // e.g. ns.Type → "Type"
      }
    }
  
    return undefined;
  }

  
  private getTypeRefName(param: ts.ParameterDeclaration): string{
    let val = this.getTypeReferenceName(param);
    if (val != undefined) return val;
    return this.typeParser.resolveDartType(param.getType());
  }
  private getTypeReferenceName(param: ts.ParameterDeclaration): string | undefined {
    const typeNode = param.getTypeNode();
  
    if (!typeNode) return undefined;
  
    if (typeNode.getKind() === ts.SyntaxKind.TypeReference) {
      const typeRef = typeNode.asKindOrThrow(ts.SyntaxKind.TypeReference) as ts.TypeReferenceNode;
      const typeName = typeRef.getTypeName(); // could be Identifier or QualifiedName
  
      // Handle both Identifier and QualifiedName
      if (ts.Node.isIdentifier(typeName)) {
        return typeName.getText(); // ✅ "H3IndexInput"
      } else if (ts.Node.isQualifiedName(typeName)) {
        return typeName.getRight().getText(); // e.g., in `ns.Type`, get `Type`
      }
    }
  
    return undefined;
  }
  
  private parseInterface(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): ParsedInterface {
    return {
      name: interfaceDeclaration.getName(),
      properties: this.parseInterfaceProperties(interfaceDeclaration),
      methods: this.parseInterfaceMethods(interfaceDeclaration),
      callSignatures: this.parseCallSignatures(interfaceDeclaration),
      constructSignatures: this.parseConstructSignatures(interfaceDeclaration),
      indexSignatures: this.parseIndexSignatures(interfaceDeclaration),
      getAccessors: this.parseGetAccessors(interfaceDeclaration),
      setAccessors: this.parseSetAccessors(interfaceDeclaration),
      extends: this.parseExtends(interfaceDeclaration),
    };
  }

  private parseInterfaceProperties(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): ParsedVariable[] {
    return interfaceDeclaration.getProperties().map((prop) => ({
      name: prop.getName(),
      typeBefore: prop.getTypeNode()?.getText() || "inferred",
      typeAfter: this.typeParser.resolveDartType(prop.getType()),
    }));
  }

  private parseInterfaceMethods(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): ParsedFunction[] {
    return interfaceDeclaration.getMethods().map((method) => ({
      name: method.getName(),
      returnType: this.typeParser.resolveDartType(method.getReturnType()),
      parameters: method
        .getParameters()
        .map((p) => p.getText())
        .join(", "),
    }));
  }

  private parseCallSignatures(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): ParsedFunction[] {
    return interfaceDeclaration.getCallSignatures().map((sig) => ({
      name: "call",
      returnType: this.typeParser.resolveDartType(sig.getReturnType()),
      parameters: sig
        .getParameters()
        .map((p) => p.getText())
        .join(", "),
    }));
  }

  private parseConstructSignatures(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): ParsedFunction[] {
    return interfaceDeclaration.getConstructSignatures().map((sig) => ({
      name: "constructor",
      returnType: this.typeParser.resolveDartType(sig.getReturnType()),
      parameters: sig
        .getParameters()
        .map((p) => p.getText())
        .join(", "),
    }));
  }

  private parseIndexSignatures(interfaceDeclaration: ts.InterfaceDeclaration) {
    return interfaceDeclaration.getIndexSignatures().map((sig) => ({
      keyName: sig.getKeyName(),
      keyType: sig.getKeyType().toString(),
      returnType: this.typeParser.resolveDartType(sig.getReturnType()),
    }));
  }

  private parseGetAccessors(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): ParsedFunction[] {
    return interfaceDeclaration.getGetAccessors().map((getter) => ({
      name: getter.getName(),
      returnType: this.typeParser.resolveDartType(getter.getReturnType()),
      parameters: "",
    }));
  }

  private parseSetAccessors(interfaceDeclaration: ts.InterfaceDeclaration) {
    return interfaceDeclaration.getSetAccessors().map((setter) => ({
      name: setter.getName(),
      parameter: setter.getParameters()[0]?.getText() || "value",
    }));
  }

  private parseExtends(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): string[] {
    return interfaceDeclaration.getExtends().map((ext) => ext.getText());
  }

  private async writeResults(results: FileTranspileResult[]): Promise<void> {
    for (const result of results) {
      if (result.dartOutput) {
        const fileName =
          basename(result.filePath, extname(result.filePath)) + ".dart";
        const outputPath = join(this.outDir, fileName);
        const dir = dirname(outputPath);
        await mkdir(dir, { recursive: true });
        await writeFile(outputPath, result.dartOutput);
        console.log(`Generated Dart file: ${outputPath}`);
      }
    }
  }

  // Logging methods
  private logVariableStatement(variables: ParsedVariable[]): void {
    if (!this.debugOut) return;

    console.log("===============");
    console.log(`Variable Statement (${variables.length} declarations):`);

    variables.forEach((variable, i) => {
      console.log(`  ${i + 1}. ${variable.name}`);
      console.log(`     Type before parse: ${variable.typeBefore}`);
      console.log(`     Type after parse: ${variable.typeAfter}`);
    });

    console.log("===============");
  }

  private logTypeAlias(typeAlias: ParsedTypeAlias): void {
    if (!this.debugOut) return;
    console.log("===============");
    console.log(
      `Type Alias: name: ${typeAlias.name} type: ${typeAlias.typeBefore} dartResType: ${typeAlias.typeAfter}`,
    );
    console.log("===============");
  }

  private logEnum(parsedEnum: ParsedEnum): void {
    if (!this.debugOut) return;
    console.log("===============");
    console.log(`Enum: ${parsedEnum.name}`);
    console.log("Members: ", parsedEnum.members);
    console.log("===============");
  }

  private logFunction(func: ParsedFunction): void {
    if (!this.debugOut) return;
    console.log("================");
    console.log(`Function: ${func.name}`);
    console.log(`Return type: ${func.returnType}`);
    console.log(`Parameters: ${func.parameters}`);
    console.log("================");
  }

  private logInterface(parsedInterface: ParsedInterface): void {
    if (!this.debugOut) return;
    console.log("===============");
    console.log(`Interface Name: ${parsedInterface.name}`);

    console.log(`Properties (${parsedInterface.properties.length}):`);
    parsedInterface.properties.forEach((prop, i) => {
      console.log(`  ${i + 1}. ${prop.name}`);
      console.log(`     Type before parse: ${prop.typeBefore}`);
      console.log(`     Type after parse: ${prop.typeAfter}`);
    });

    console.log(`Methods (${parsedInterface.methods.length}):`);
    parsedInterface.methods.forEach((method, i) => {
      console.log(`  ${i + 1}. ${method.name}(${method.parameters})`);
      console.log(`     Return type: ${method.returnType}`);
    });

    console.log(`Call Signatures (${parsedInterface.callSignatures.length}):`);
    parsedInterface.callSignatures.forEach((sig, i) => {
      console.log(`  ${i + 1}. (${sig.parameters})`);
      console.log(`     Return type: ${sig.returnType}`);
    });

    console.log(
      `Construct Signatures (${parsedInterface.constructSignatures.length}):`,
    );
    parsedInterface.constructSignatures.forEach((sig, i) => {
      console.log(`  ${i + 1}. new (${sig.parameters})`);
      console.log(`     Return type: ${sig.returnType}`);
    });

    console.log(
      `Index Signatures (${parsedInterface.indexSignatures.length}):`,
    );
    parsedInterface.indexSignatures.forEach((sig, i) => {
      console.log(`  ${i + 1}. [${sig.keyName}: ${sig.keyType}]`);
      console.log(`     Return type: ${sig.returnType}`);
    });

    console.log(`Get Accessors (${parsedInterface.getAccessors.length}):`);
    parsedInterface.getAccessors.forEach((getter, i) => {
      console.log(`  ${i + 1}. get ${getter.name}()`);
      console.log(`     Return type: ${getter.returnType}`);
    });

    console.log(`Set Accessors (${parsedInterface.setAccessors.length}):`);
    parsedInterface.setAccessors.forEach((setter, i) => {
      console.log(`  ${i + 1}. set ${setter.name}(${setter.parameter})`);
    });

    console.log(`Extends (${parsedInterface.extends.length}):`);
    parsedInterface.extends.forEach((ext, i) => {
      console.log(`  ${i + 1}. ${ext}`);
    });

    console.log("===============");
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
      this.logDebug(`Validating file: ${file}`);
    }
  }

  private logDebug(message: string, ...args: any[]): void {
    if (this.debugOut) {
      console.log(`[Transpiler Debug] ${message}`, ...args);
    }
  }

  public getFiles(): readonly string[] {
    return [...this.files];
  }

  public isDebugEnabled(): boolean {
    return this.debugOut;
  }
}

// Utility functions
export class TranspilerUtils {
  static stripQuotes(str: string): string {
    return str.replace(/^['"]|['"]$/g, "");
  }
}
