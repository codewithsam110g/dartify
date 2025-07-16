/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import * as ts from "ts-morph";
import { readFile, writeFile, mkdir } from "fs/promises";
import { TypeScriptToDartParser, createParser } from "../type";
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
  isReadonly: boolean;
}

interface ParsedFunction {
  name: string;
  returnType: string;
  parameters: string;
  functionDecl: ts.FunctionDeclaration | any;
}

interface ParsedEnum {
  name: string;
  members: Array<{ name: string; value: string | null; type: ts.Type }>;
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

interface ParsedClass {
  name: string;
  properties: ParsedVariable[];
  getAccessors: ParsedFunction[];
  setAccessors: Array<{ name: string; parameter: string }>;
  constructSignatures: ParsedFunction[];
  methods: ParsedFunction[];
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

@JS()
library ${fileName.replace(/[^a-zA-Z0-9]/g, "_")};
import 'package:js/js.dart';
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
      .map((variable) => {
        const internalVal = TranspilerUtils.stripQuotes(
          `${this.modulePrefix}${variable.name}`,
        );
        const jsAnnotation = `@JS("${internalVal}")`;
        return `${jsAnnotation}\nexternal ${variable.typeAfter} ${variable.name};`;
      })
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

    const internalVal = TranspilerUtils.stripQuotes(
      `${this.modulePrefix}${parsedEnum.name}`,
    );
    const jsAnnotation = `@JS("${internalVal}")`;

    // Generate Dart enum
    const members = parsedEnum.members
      .map((member) => {
        return `  external static ${this.typeParser.resolveDartType(member.type)} get ${member.name};`;
      })
      .join("\n");

    return `${jsAnnotation}\nclass ${parsedEnum.name}{}\n${jsAnnotation}\nextension ${parsedEnum.name}Enum on ${parsedEnum.name}{\n${members}\n}`;
  }

  private processFunctionDeclaration(
    functionDeclaration: ts.FunctionDeclaration,
  ): string {
    const parsedFunction = this.parseFunction(functionDeclaration);
    this.logFunction(parsedFunction);
    const internalVal = TranspilerUtils.stripQuotes(
      `${this.modulePrefix}${parsedFunction.name}`,
    );
    const jsAnnotation = `@JS("${internalVal}")`;
    // Generate Dart function declaration
    return `${jsAnnotation}\nexternal ${parsedFunction.returnType} ${parsedFunction.name}(${parsedFunction.parameters});`;
  }

  private processInterfaceDeclaration(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): string {
    const parsedInterface = this.parseInterface(interfaceDeclaration);
    this.logInterface(parsedInterface);

    // Generate Dart class/interface
    const dartParts: string[] = [];

    dartParts.push("@JS()");
    dartParts.push("@anonymous");

    // Constructor
    if (parsedInterface.constructSignatures.length > 0) {
      dartParts.push(`class ${parsedInterface.name}{`);
      dartParts.push(
        `  external factory ${parsedInterface.name}(${parsedInterface.constructSignatures[0].parameters});`,
      );
      dartParts.push("}");
    } else {
      dartParts.push(`abstract class ${parsedInterface.name}{}`);
    }

    dartParts.push(
      `extension ${parsedInterface.name}Extension on ${parsedInterface.name} {`,
    );
    // Properties
    parsedInterface.properties.forEach((prop) => {
      if (prop.isReadonly) {
        dartParts.push(`  external ${prop.typeAfter} get ${prop.name};`);
      } else {
        dartParts.push(`  external ${prop.typeAfter} get ${prop.name};`);
        dartParts.push(`  external set ${prop.name}(${prop.typeAfter} value);`);
      }
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

    // Index signatures
    // Note: this is base implementation not precise one
    if (parsedInterface.indexSignatures.length > 0) {
      dartParts.push("  external dynamic operator [](Object key);");
      dartParts.push(
        "  external void operator []=(Object key, dynamic value);",
      );
    }

    dartParts.push("}");

    return dartParts.join("\n");
  }

  private processClassDeclaration(
    classDeclaration: ts.ClassDeclaration,
  ): string {
    const parsedClass = this.parseClass(classDeclaration);
    this.logDebug(`Processing class: ${classDeclaration.getName()}`);
    let dartParts: string[] = [];
    const internalVal = TranspilerUtils.stripQuotes(
      `${this.modulePrefix}${parsedClass.name}`,
    );
    const jsAnnotation = `@JS("${internalVal}")`;
    dartParts.push(`${jsAnnotation}\nclass ${parsedClass.name} {`);

    // Constructors
    let constructorCount = 0;
    for (let constructor of parsedClass.constructSignatures) {
      let constructorName = parsedClass.name + "_".repeat(constructorCount);
      dartParts.push(
        `  external factory ${constructorName}(${constructor.parameters});`,
      );
    }
    // Properties
    parsedClass.properties.forEach((prop) => {
      if (prop.isReadonly) {
        dartParts.push(`  external ${prop.typeAfter} get ${prop.name};`);
      } else {
        dartParts.push(`  external ${prop.typeAfter} get ${prop.name};`);
        dartParts.push(`  external set ${prop.name}(${prop.typeAfter} value);`);
      }
    });

    let overloadMethods = this.getOverloadFuncs(parsedClass.methods);

    for (let [func_name, func_arr] of overloadMethods.entries()) {
      let count = 0;
      for (let func of func_arr) {
        if (func_arr.length == 1) {
          dartParts.push(
            `  external ${func.returnType} ${func.name}(${func.parameters});`,
          );
        } else {
          count += 1;
          let name = func_name + "_" + count;
          // this.getParamTypeSuffix(func.functionDecl.getParameters());
          dartParts.push(`  @JS("${func_name}")`);
          dartParts.push(
            `  external ${func.returnType} ${name}(${func.parameters});`,
          );
        }
      }
    }

    // Methods
    // parsedClass.methods.forEach((method) => {
    //   dartParts.push(
    //     `  external ${method.returnType} ${method.name}(${method.parameters});`,
    //   );
    // });

    // Getters
    parsedClass.getAccessors.forEach((getter) => {
      dartParts.push(`  external ${getter.returnType} get ${getter.name};`);
    });

    // Setters
    parsedClass.setAccessors.forEach((setter) => {
      dartParts.push(`  external set ${setter.name}(${setter.parameter});`);
    });
    dartParts.push("}");
    return dartParts.join("\n");
  }

  private processModuleDeclaration(
    moduleDeclaration: ts.ModuleDeclaration,
  ): string {
    this.logDebug(`Processing module: ${moduleDeclaration.getName()}`);

    const previousPrefix = TranspilerUtils.stripQuotes(this.modulePrefix);
    this.modulePrefix += moduleDeclaration.getName() + ".";
    this.logDebug(`Module prefix updated to: ${this.modulePrefix}`);

    const moduleContent = this.processModuleContents(moduleDeclaration);

    // Process nested modules
    const nestedModules = moduleDeclaration.getModules();
    const nestedContent = nestedModules
      .map((nested) => this.processModuleDeclaration(nested))
      .join("\n\n");

    this.modulePrefix = TranspilerUtils.stripQuotes(previousPrefix);

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

  private getParamTypeSuffix(params: ts.ParameterDeclaration[]): string {
    return params
      .map((param) => {
        const typeNode = param.getTypeNode();
        if (typeNode) {
          return typeNode.getText().replace(/\W+/g, ""); // sanitize like List<T> => ListT
        }
        return "any";
      })
      .join("_");
  }

  // overload fix using map<string, ParsedFunction[]>
  private getOverloadFuncs(
    funcs: ParsedFunction[],
  ): Map<String, ParsedFunction[]> {
    const map = new Map<string, ParsedFunction[]>();
    for (const func of funcs) {
      const list = map.get(func.name) ?? [];
      list.push(func);
      map.set(func.name, list);
    }
    return map;
  }

  // Parsing methods (same as before)
  private parseVariableStatement(
    variableStatement: ts.VariableStatement,
  ): ParsedVariable[] {
    return variableStatement.getDeclarations().map((decl) => {
      const typeBefore = decl.getTypeNode()?.getText() || "inferred";
      const typeAfter = this.typeParser.resolveDartType(decl.getType());

      const isReadonly =
        variableStatement.getDeclarationKind() ===
        ts.VariableDeclarationKind.Const;

      return {
        name: decl.getName(),
        typeBefore,
        typeAfter,
        isReadonly,
      };
    });
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
        type: member.getType(),
      })),
    };
  }

  private parseFunction(
    functionDeclaration: ts.FunctionDeclaration,
  ): ParsedFunction {
    const parameters = functionDeclaration
      .getParameters()
      .map(
        (param) => `${this.getTypeRefNameFromParam(param)} ${param.getName()}`,
      )
      .join(", ");

    return {
      name: functionDeclaration.getName() || "anonymous",
      returnType: this.getRetTypeRefNameForMethod(functionDeclaration),
      parameters,
      functionDecl: functionDeclaration,
    };
  }

  // Shared util for extracting type reference name
  private getTypeReferenceNameFromNode(
    typeNode?: ts.TypeNode,
  ): string | undefined {
    if (!typeNode) return undefined;

    if (typeNode.getKind() === ts.SyntaxKind.TypeReference) {
      const typeRef = typeNode.asKindOrThrow(ts.SyntaxKind.TypeReference);
      const typeName = typeRef.getTypeName();

      if (ts.Node.isIdentifier(typeName)) {
        return typeName.getText();
      } else if (ts.Node.isQualifiedName(typeName)) {
        return typeName.getRight().getText();
      }
    }

    return undefined;
  }

  // For method declarations in classes or interfaces
  private getRetTypeRefNameForMethod(
    method: ts.MethodDeclaration | ts.MethodSignature | ts.FunctionDeclaration,
  ): string {
    const typeText = method.getReturnType().getText();
    const types = ["Array<", "Promise<"];
    const dontTypeRef = types.some((e) => typeText.includes(e));
    if (dontTypeRef) {
      return this.typeParser.resolveDartType(method.getReturnType());
    }
    const val = this.getTypeReferenceNameFromNode(method.getReturnTypeNode());
    if (val != undefined) return val;
    return this.typeParser.resolveDartType(method.getReturnType());
  }

  private getTypeRefNameFromParam(param: ts.ParameterDeclaration): string {
    const val = this.getTypeReferenceNameFromNode(param.getTypeNode());
    if (val != undefined) return val;
    return this.typeParser.resolveDartType(param.getType());
  }

  // For call/construct sigs
  private getRetTypeRefNameFromSig(sig: ts.SignaturedDeclaration): string {
    const typeText = sig.getReturnType().getText();
    const types = ["Array<", "Promise<"];
    const dontTypeRef = types.some((e) => typeText.includes(e));
    if (dontTypeRef) {
      return this.typeParser.resolveDartType(sig.getReturnType());
    }
    const val = this.getTypeReferenceNameFromNode(sig.getReturnTypeNode?.());
    if (val != undefined) return val;
    return this.typeParser.resolveDartType(sig.getReturnType());
  }

  private getRetTypeRefNameFromGetAccessor(
    getAccessor: ts.GetAccessorDeclaration,
  ): string {
    const typeText = getAccessor.getReturnType().getText();
    const types = ["Array<", "Promise<"];
    const dontTypeRef = types.some((e) => typeText.includes(e));
    if (dontTypeRef) {
      return this.typeParser.resolveDartType(getAccessor.getReturnType());
    }

    const val = this.getTypeReferenceNameFromNode(
      getAccessor.getReturnTypeNode?.(),
    );
    if (val != undefined) return val;
    return this.typeParser.resolveDartType(getAccessor.getReturnType());
  }

  private parseInterface(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): ParsedInterface {
    return {
      name: interfaceDeclaration.getName(),
      properties: this.parseInterfaceProperties(interfaceDeclaration),
      methods: this.parseMethods(interfaceDeclaration),
      callSignatures: this.parseCallSignatures(interfaceDeclaration),
      constructSignatures: this.parseConstructSignatures(interfaceDeclaration),
      indexSignatures: this.parseIndexSignatures(interfaceDeclaration),
      getAccessors: this.parseGetAccessors(interfaceDeclaration),
      setAccessors: this.parseSetAccessors(interfaceDeclaration),
      extends: this.parseExtends(interfaceDeclaration),
    };
  }

  private parseInterfaceProperties(
    interfaceDeclaration: ts.InterfaceDeclaration | ts.ClassDeclaration,
  ): ParsedVariable[] {
    return interfaceDeclaration.getProperties().map((prop) => {
      const name = prop.getName();

      // This is the correct way to check readonly
      const isReadonly = prop.hasModifier(ts.SyntaxKind.ReadonlyKeyword);

      const typeNode = prop.getTypeNode();
      const typeBefore = typeNode ? typeNode.getText() : "inferred";
      const typeAfter = this.typeParser.resolveDartType(prop.getType());

      return {
        name,
        typeBefore,
        typeAfter,
        isReadonly,
      };
    });
  }

  private parseMethods(
    interfaceDeclaration: ts.InterfaceDeclaration | ts.ClassDeclaration,
  ): ParsedFunction[] {
    return interfaceDeclaration.getMethods().map((method) => ({
      name: method.getName(),
      returnType: this.getRetTypeRefNameFromSig(method),
      parameters: method
        .getParameters()
        .map(
          (param) =>
            `${this.getTypeRefNameFromParam(param)} ${param.getName()}`,
        )
        .join(", "),
      functionDecl: method,
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
      functionDecl: sig,
    }));
  }

  private parseConstructSignatures(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): ParsedFunction[] {
    return interfaceDeclaration.getConstructSignatures().map((sig) => ({
      name: "constructor",
      returnType: this.getRetTypeRefNameFromSig(sig),
      parameters: sig
        .getParameters()
        .map(
          (param) =>
            `${this.getTypeRefNameFromParam(param)} ${param.getName()}`,
        )
        .join(", "),
      functionDecl: sig,
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
    interfaceDeclaration: ts.InterfaceDeclaration | ts.ClassDeclaration,
  ): ParsedFunction[] {
    return interfaceDeclaration.getGetAccessors().map((getter) => ({
      name: getter.getName(),
      returnType: this.getRetTypeRefNameFromGetAccessor(getter),
      parameters: "",
      functionDecl: getter,
    }));
  }

  private parseSetAccessors(
    interfaceDeclaration: ts.InterfaceDeclaration | ts.ClassDeclaration,
  ) {
    return interfaceDeclaration.getSetAccessors().map((setter) => ({
      name: setter.getName(),
      parameter: setter
        .getParameters()
        .map(
          (param) =>
            `${this.getTypeRefNameFromParam(param)} ${param.getName()}`,
        )
        .join(", "),
    }));
  }

  private parseExtends(
    interfaceDeclaration: ts.InterfaceDeclaration,
  ): string[] {
    return interfaceDeclaration.getExtends().map((ext) => ext.getText());
  }

  private parseClass(classDeclaration: ts.ClassDeclaration): ParsedClass {
    let name = classDeclaration.getName() ?? "";
    let methods = this.parseMethods(classDeclaration);
    let getAccessor = this.parseGetAccessors(classDeclaration);
    let setAccessor = this.parseSetAccessors(classDeclaration);
    let constructorSignatures =
      this.parseConstructorDeclarations(classDeclaration);
    let properties = this.parseInterfaceProperties(classDeclaration);
    return {
      name: name,
      properties: properties,
      getAccessors: getAccessor,
      setAccessors: setAccessor,
      constructSignatures: constructorSignatures,
      methods: methods,
    };
  }
  private parseConstructorDeclarations(
    classDecl: ts.ClassDeclaration,
  ): ParsedFunction[] {
    return classDecl.getConstructors().map((sig) => ({
      name: "constructor",
      returnType: this.getRetTypeRefNameFromSig(sig),
      parameters: sig
        .getParameters()
        .map(
          (param) =>
            `${this.getTypeRefNameFromParam(param)} ${param.getName()}`,
        )
        .join(", "),
      functionDecl: sig,
    }));
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
    return str.replace(/['"]/g, "");
  }
}
