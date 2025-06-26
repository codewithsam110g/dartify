import {
  Type,
  TypeFormatFlags,
  Node,
  SyntaxKind,
  SourceFile,
  Project,
  TypeChecker,
  IndexSignatureDeclaration,
} from "ts-morph";
import * as ts from "ts-morph";
// Registry for custom type mappings
const defaultCustomTypeRegistry = new Map<string, string>([
  ["string", "String"],
  ["number", "double"],
  ["boolean", "bool"],
  ["Date", "DateTime"],
  ["RegExp", "RegExp"],
  ["BigInt", "BigInt"],
]);

export class TypeScriptToDartParser {
  private customTypeRegistry: Map<string, string>;
  private visitedTypes: Set<string>;
  private sourceFile?: SourceFile;
  private project?: Project;
  private typeChecker?: TypeChecker;
  private maxDepth: number;

  constructor(options?: {
    customTypeRegistry?: Map<string, string>;
    sourceFile?: SourceFile;
    project?: Project;
    maxDepth?: number;
  }) {
    this.customTypeRegistry =
      options?.customTypeRegistry || new Map(defaultCustomTypeRegistry);
    this.visitedTypes = new Set();
    this.sourceFile = options?.sourceFile;
    this.project = options?.project;
    this.typeChecker = this.project?.getTypeChecker();
    this.maxDepth = options?.maxDepth || 15;
  }

  public resolveDartType(tsType: Type, depth: number = 0): string {
    // Prevent runaway recursion
    if (depth > this.maxDepth) return "dynamic";

    const typeKey = this.getTypeKey(tsType);

    // Handle circular references
    if (this.visitedTypes.has(typeKey)) {
      console.log("Found revisted type: ", tsType.getText());
      return "dynamic";
    }

    this.visitedTypes.add(typeKey);

    try {

      // === PRIMITIVE TYPES ===
      const primitiveResult = this.handlePrimitiveTypes(tsType);
      if (primitiveResult !== null) {
        return primitiveResult;
      }

      // === LITERAL TYPES ===
      const literalResult = this.handleLiteralTypes(tsType);
      if (literalResult !== null) {
        return literalResult;
      }

      // === CONDITIONAL TYPES ===
      const conditionalResult = this.handleConditionalTypes(tsType, depth);
      if (conditionalResult !== null) {
        return conditionalResult;
      }

      // === TEMPLATE LITERAL TYPES ===
      const templateResult = this.handleTemplateLiteralTypes(tsType);
      if (templateResult !== null) {
        return templateResult;
      }

      // === UNION TYPES ===
      if (tsType.isUnion()) {
        return this.handleUnionType(tsType, depth);
      }

      // === INTERSECTION TYPES ===
      if (tsType.isIntersection()) {
        return this.handleIntersectionType(tsType, depth);
      }

      // === ARRAY TYPES ===
      const arrayResult = this.handleArrayTypes(tsType, depth);
      if (arrayResult !== null) {
        return arrayResult;
      }

      // === TUPLE TYPES ===
      if (tsType.isTuple()) {
        return this.handleTupleType(tsType, depth);
      }

      // === OBJECT/INTERFACE TYPES (before generic handling) ===
      const objectResult = this.handleObjectTypes(tsType, depth);
      if (objectResult !== null) {
        return objectResult;
      }

      // === FUNCTION TYPES ===
      const functionResult = this.handleFunctionTypes(tsType, depth);
      if (functionResult !== null) {
        return functionResult;
      }

      // === GENERIC TYPES ===
      const genericResult = this.handleGenericTypes(tsType, depth);
      if (genericResult !== null) {
        return genericResult;
      }

      // === ENUM TYPES ===
      const enumResult = this.handleEnumTypes(tsType);
      if (enumResult !== null) {
        return enumResult;
      }

      // === CLASS/INTERFACE TYPES ===
      const classResult = this.handleClassInterfaceTypes(tsType);
      if (classResult !== null) {
        return classResult;
      }

      // === FALLBACK ===
      return this.handleFallbackTypes(tsType);
    } finally {
      this.visitedTypes.delete(typeKey);
    }
  }

  private getTypeKey(tsType: Type): string {
    return tsType.getText();
  }

  // === PRIMITIVE TYPE HANDLERS ===
  private handlePrimitiveTypes(tsType: Type): string | null {
    if (tsType.isString()) return "String";
    if (tsType.isNumber()) return "double";
    if (tsType.isBoolean()) return "bool";
    if (tsType.isNull()) return "Null";
    if (tsType.isUndefined()) return "Null";
    if (tsType.isVoid()) return "void";
    if (tsType.isAny()) return "dynamic";
    if (tsType.isUnknown()) return "dynamic";
    if (tsType.isNever()) return "Never";
    if (tsType.isBigInt()) return "BigInt";

    return null;
  }

  // === LITERAL TYPE HANDLERS ===
  private handleLiteralTypes(tsType: Type): string | null {
    if (tsType.isStringLiteral()) return "String";
    if (tsType.isNumberLiteral()) return "double";
    if (tsType.isBooleanLiteral()) return "bool";

    return null;
  }

  // === CONDITIONAL TYPE HANDLER ===
  private handleConditionalTypes(tsType: Type, depth: number): string | null {
    const typeText = tsType.getText();

    // Pattern: T extends U ? X : Y
    const conditionalPattern = /^(.+)\s+extends\s+(.+)\s+\?\s+(.+)\s+:\s+(.+)$/;
    const match = typeText.match(conditionalPattern);

    if (match) {
      // For conditional types, we need to evaluate them if possible
      // In most cases, we'll fall back to the "true" branch or dynamic
      const trueBranch = match[3].trim();
      const falseBranch = match[4].trim();

      // Try to resolve the true branch first as it's more common
      try {
        // This is a simplified approach - in practice, you'd need to
        // properly evaluate the conditional based on the type checker
        return "dynamic"; // Safe fallback for complex conditionals
      } catch {
        return "dynamic";
      }
    }

    return null;
  }

  // === TEMPLATE LITERAL TYPE HANDLER ===
  private handleTemplateLiteralTypes(tsType: Type): string | null {
    const typeText = tsType.getText();

    // Handle template literal types like `hello-${string}` or `${number}-world`
    if (typeText.includes("${") && typeText.includes("}")) {
      return "String"; // Template literals resolve to strings
    }

    return null;
  }

  // === UNION TYPE HANDLER ===
  private handleUnionType(tsType: Type, depth: number): string {
    const unionTypes = tsType.getUnionTypes();

    // Check for nullable union (T | null | undefined)
    const nullableTypes = unionTypes.filter(
      (t) => t.isNull() || t.isUndefined(),
    );
    const nonNullableTypes = unionTypes.filter(
      (t) => !t.isNull() && !t.isUndefined(),
    );

    if (nullableTypes.length > 0 && nonNullableTypes.length === 1) {
      // Simple nullable type: T | null => T?
      return `${this.resolveDartType(nonNullableTypes[0], depth + 1)}?`;
    }

    if (nonNullableTypes.length === 1) {
      return this.resolveDartType(nonNullableTypes[0], depth + 1);
    }

    // Check if all types are the same (after resolution)
    const resolvedTypes = nonNullableTypes.map((t) =>
      this.resolveDartType(t, depth + 1),
    );
    const uniqueTypes = [...new Set(resolvedTypes)];

    if (uniqueTypes.length === 1) {
      const baseType = uniqueTypes[0];
      return nullableTypes.length > 0 ? `${baseType}?` : baseType;
    }

    // Complex union - use Object in Dart (or dynamic as fallback)
    return nullableTypes.length > 0 ? "Object?" : "Object";
  }

  // === INTERSECTION TYPE HANDLER ===
  private handleIntersectionType(tsType: Type, depth: number): string {
    // For intersection types, we could potentially create a merged interface
    // For now, use dynamic as Dart doesn't have intersection types
    return "dynamic";
  }

  // === ARRAY TYPE HANDLERS ===
  private handleArrayTypes(tsType: Type, depth: number): string | null {
    // Handle T[] syntax
    if (tsType.isArray()) {
      const elementType = tsType.getArrayElementType();
      if (elementType) {
        return `List<${this.resolveDartType(elementType, depth + 1)}>`;
      }
      return "List<dynamic>";
    }

    // Handle Array<T> syntax
    const typeText = tsType.getText();
    if (typeText.startsWith("Array<")) {
      const typeArgs = tsType.getTypeArguments();
      if (typeArgs.length === 1) {
        return `List<${this.resolveDartType(typeArgs[0], depth + 1)}>`;
      }
      return "List<dynamic>";
    }

    // Handle ReadonlyArray<T>
    if (typeText.startsWith("ReadonlyArray<")) {
      const typeArgs = tsType.getTypeArguments();
      if (typeArgs.length === 1) {
        return `List<${this.resolveDartType(typeArgs[0], depth + 1)}>`;
      }
      return "List<dynamic>";
    }

    return null;
  }

  // === TUPLE TYPE HANDLER ===
  private handleTupleType(tsType: Type, depth: number): string {
    const tupleElements = tsType.getTupleElements();

    if (tupleElements.length === 0) {
      return "List<dynamic>";
    }

    // Map each tuple element to Dart type
    const dartTypes = tupleElements.map((element) =>
      this.resolveDartType(element, depth + 1),
    );
    const uniqueTypes = [...new Set(dartTypes)];

    // If all elements are the same type, use List<T>
    if (uniqueTypes.length === 1) {
      return `List<${uniqueTypes[0]}>`;
    }

    // For mixed types, you might want to use a Record class in Dart
    // For now, fallback to List<dynamic>
    return "List<dynamic>";
  }

  // === OBJECT TYPE HANDLERS ===
  private handleObjectTypes(tsType: Type, depth: number): string | null {
    const typeText = tsType.getText(
      undefined,
      TypeFormatFlags.UseFullyQualifiedType,
    );

    // Handle Record<K, V>
    if (typeText.startsWith("Record<")) {
      const typeArgs = tsType.getTypeArguments();
      if (typeArgs.length === 2) {
        const keyType = this.resolveDartType(typeArgs[0], depth + 1);
        const valueType = this.resolveDartType(typeArgs[1], depth + 1);
        return `Map<${keyType}, ${valueType}>`;
      }
      return "Map<String, dynamic>";
    }

    // Handle Map<K, V>
    if (typeText.startsWith("Map<")) {
      const typeArgs = tsType.getTypeArguments();
      if (typeArgs.length === 2) {
        const keyType = this.resolveDartType(typeArgs[0], depth + 1);
        const valueType = this.resolveDartType(typeArgs[1], depth + 1);
        return `Map<${keyType}, ${valueType}>`;
      }
      return "Map<dynamic, dynamic>";
    }

    // Handle Set<T>
    if (typeText.startsWith("Set<")) {
      const typeArgs = tsType.getTypeArguments();
      if (typeArgs.length === 1) {
        const elementType = this.resolveDartType(typeArgs[0], depth + 1);
        return `Set<${elementType}>`;
      }
      return "Set<dynamic>";
    }

    // Handle Promise<T>
    if (typeText.startsWith("Promise<")) {
      const typeArgs = tsType.getTypeArguments();
      if (typeArgs.length === 1) {
        const resultType = this.resolveDartType(typeArgs[0], depth + 1);
        return `Future<${resultType}>`;
      }
      return "Future<dynamic>";
    }

    // Handle object literal types and interfaces
    if (tsType.isObject() && !tsType.isArray() && !tsType.isTuple()) {
      return this.handleObjectLiteralType(tsType, depth);
    }

    return null;
  }

  // === OBJECT LITERAL TYPE HANDLER ===
  private handleObjectLiteralType(tsType: Type, depth: number): string {
    const symbol = tsType.getSymbol();
    if (!symbol) {
      return "Map<String, dynamic>";
    }

    // Check if this is a type literal (anonymous object type)
    const declarations = symbol.getDeclarations();
    const hasTypeLiteral = declarations.some(
      (d) => d.getKind() === SyntaxKind.TypeLiteral,
    );
    if (hasTypeLiteral || this.isObjectLiteralType(tsType)) {
      // This is an object literal type like { i: number; j: number }
      return this.analyzeObjectStructure(tsType, depth);
    }

    // Check if it's a named interface/type alias
    const symbolName = symbol.getName();
    if (symbolName && symbolName !== "__type") {
      return symbolName; // Return the interface/type name
    }

    return "Map<String, dynamic>";
  }

  private isObjectLiteralType(tsType: Type): boolean {
    // Additional checks to identify object literal types
    const typeText = tsType.getText();

    // Check if it looks like an object literal: { prop: type, ... }
    if (typeText.startsWith("{") && typeText.endsWith("}")) {
      return true;
    }

    // Check properties to see if they suggest an object literal
    const apparentProperties = tsType.getApparentProperties();
    if (apparentProperties.length > 0) {
      // If it has properties but no clear symbol name, likely an object literal
      const symbol = tsType.getSymbol();
      return !symbol || symbol.getName() === "__type";
    }

    return false;
  }

  private analyzeObjectStructure(tsType: Type, depth: number): string {
    const properties = tsType.getApparentProperties();
    const callSignatures = tsType.getCallSignatures();
    const indexSignatures = this.getIndexSignatures(tsType);

    // If it has index signatures, it's likely a map-like structure
    if (indexSignatures.length > 0) {
      return this.handleIndexSignatures(indexSignatures, depth);
    }

    // If it has call signatures, it's a function-like object
    if (callSignatures.length > 0 && properties.length === 0) {
      return this.handleFunctionTypes(tsType, depth) || "Function";
    }

    // Analyze properties to determine if it's a structured object or a map
    if (properties.length === 0) {
      return "Map<String, dynamic>";
    }

    // Check if all properties have similar types (suggesting a map-like usage)
    const propertyTypes = properties.map((prop) => {
      const propType = prop.getTypeAtLocation(prop.getDeclarations()[0]);
      return this.resolveDartType(propType, depth + 1);
    });

    const uniquePropertyTypes = [...new Set(propertyTypes)];

    // If all properties have the same type and there are many properties,
    // it might be better represented as a Map
    if (uniquePropertyTypes.length === 1 && properties.length > 5) {
      return `Map<String, ${uniquePropertyTypes[0]}>`;
    }

    // Fallback to Map for generic object structures
    if (uniquePropertyTypes.length === 1) {
      return `Map<String, ${uniquePropertyTypes[0]}>`;
    }
    return "Map<String, dynamic>";
  }

  private getIndexSignatures(tsType: Type): IndexSignatureDeclaration[] {
    // This is a simplified implementation
    // In practice, you'd need to examine the type's symbol and declarations
    const symbol = tsType.getSymbol();
    if (!symbol) return [];

    const indexSignatures: IndexSignatureDeclaration[] = [];

    for (const declaration of symbol.getDeclarations()) {
      if (
        Node.isInterfaceDeclaration(declaration) ||
        Node.isTypeLiteral(declaration)
      ) {
        const members = declaration.getMembers();
        for (const member of members) {
          if (Node.isIndexSignatureDeclaration(member)) {
            indexSignatures.push(member);
          }
        }
      }
    }

    return indexSignatures;
  }

  private handleIndexSignatures(
    indexSignatures: IndexSignatureDeclaration[],
    depth: number,
  ): string {
    if (indexSignatures.length === 0) {
      return "Map<String, dynamic>";
    }

    // Take the first index signature
    const signature = indexSignatures[0];
    const keyType = signature.getKeyType();
    const valueType = signature.getReturnType();

    const dartKeyType = this.resolveDartType(keyType, depth + 1);
    const dartValueType = this.resolveDartType(valueType, depth + 1);

    return `Map<${dartKeyType}, ${dartValueType}>`;
  }

  // === FUNCTION TYPE HANDLER ===
  private handleFunctionTypes(tsType: Type, depth: number): string | null {
    const callSignatures = tsType.getCallSignatures();

    if (callSignatures.length > 0) {
      const signature = callSignatures[0];
      const parameters = signature.getParameters();
      const returnType = signature.getReturnType();

      // Simple function type mapping
      if (parameters.length === 0) {
        const dartReturnType = this.resolveDartType(returnType, depth + 1);
        return `${dartReturnType} Function()`;
      } else {
        const paramTypes = parameters.map((param) => {
          const paramType = param.getTypeAtLocation(param.getDeclarations()[0]);
          return this.resolveDartType(paramType, depth + 1);
        });
        const dartReturnType = this.resolveDartType(returnType, depth + 1);
        return `${dartReturnType} Function(${paramTypes.join(", ")})`;
      }
    }

    return null;
  }

  // === GENERIC TYPE HANDLER ===
  private handleGenericTypes(tsType: Type, depth: number): string | null {
    const typeText = tsType.getText();
    const typeArgs = tsType.getTypeArguments();

    // Handle common generic utility types
    const genericPatterns = [
      {
        pattern: /^Partial<(.+)>$/,
        handler: (args: Type[]) =>
          args.length === 1
            ? `${this.resolveDartType(args[0], depth + 1)}?`
            : "dynamic",
      },
      {
        pattern: /^Required<(.+)>$/,
        handler: (args: Type[]) =>
          args.length === 1
            ? this.resolveDartType(args[0], depth + 1)
            : "dynamic",
      },
      {
        pattern: /^Readonly<(.+)>$/,
        handler: (args: Type[]) =>
          args.length === 1
            ? this.resolveDartType(args[0], depth + 1)
            : "dynamic",
      },
      {
        pattern: /^Pick<(.+),\s*(.+)>$/,
        handler: () => "Map<String, dynamic>",
      },
      {
        pattern: /^Omit<(.+),\s*(.+)>$/,
        handler: () => "Map<String, dynamic>",
      },
      {
        pattern: /^Exclude<(.+),\s*(.+)>$/,
        handler: (args: Type[]) =>
          args.length >= 1
            ? this.resolveDartType(args[0], depth + 1)
            : "dynamic",
      },
      {
        pattern: /^Extract<(.+),\s*(.+)>$/,
        handler: (args: Type[]) =>
          args.length >= 1
            ? this.resolveDartType(args[0], depth + 1)
            : "dynamic",
      },
    ];

    for (const { pattern, handler } of genericPatterns) {
      const match = typeText.match(pattern);
      if (match) {
        return handler(typeArgs);
      }
    }

    // Handle generic types with type parameters
    if (typeArgs.length > 0) {
      const symbol = tsType.getSymbol();
      if (symbol) {
        const baseName = symbol.getName();
        if (this.customTypeRegistry.has(baseName)) {
          const dartBase = this.customTypeRegistry.get(baseName)!;
          const dartArgs = typeArgs.map((arg) =>
            this.resolveDartType(arg, depth + 1),
          );
          return `${dartBase}<${dartArgs.join(", ")}>`;
        }

        // Generic class/interface
        const dartArgs = typeArgs.map((arg) =>
          this.resolveDartType(arg, depth + 1),
        );
        return `${baseName}<${dartArgs.join(", ")}>`;
      }
    }

    return null;
  }

  // === ENUM TYPE HANDLER ===
  private handleEnumTypes(tsType: Type): string | null {
    const symbol = tsType.getSymbol();
    if (symbol) {
      const declarations = symbol.getDeclarations();
      if (
        declarations.some((d) => d.getKind() === SyntaxKind.EnumDeclaration)
      ) {
        return symbol.getName(); // Return enum name as-is
      }
    }

    return null;
  }

  // === CLASS/INTERFACE TYPE HANDLER ===
  private handleClassInterfaceTypes(tsType: Type): string | null {
    const symbol = tsType.getSymbol();
    if (!symbol) return null;

    const name = symbol.getName();

    // Check custom type registry first
    if (this.customTypeRegistry.has(name)) {
      return this.customTypeRegistry.get(name)!;
    }

    // Handle built-in types
    const builtInTypes: Record<string, string> = {
      Object: "Object",
      Function: "Function",
      Error: "Exception",
      Date: "DateTime",
      RegExp: "RegExp",
      JSON: "dynamic",
    };

    if (builtInTypes[name]) {
      return builtInTypes[name];
    }

    // Extract class name from fully qualified name
    const typeText = tsType.getText(
      undefined,
      TypeFormatFlags.UseFullyQualifiedType,
    );
    const match = /\.([A-Za-z0-9_]+)(?:<.*>)?$/.exec(typeText);
    if (match) {
      const cleanName = match[1];
      if (this.customTypeRegistry.has(cleanName)) {
        return this.customTypeRegistry.get(cleanName)!;
      }
      return cleanName;
    }

    return name;
  }

  // === FALLBACK HANDLER ===
  private handleFallbackTypes(tsType: Type): string {
    // Last resort - try to extract a meaningful name
    const typeText = tsType.getText();

    // Handle type parameters (generics like T, U, etc.)
    if (/^[A-Z][A-Za-z0-9]*$/.test(typeText)) {
      return typeText; // Return as-is for type parameters
    }

    // Extract identifier from complex type strings
    const identifierMatch = /([A-Za-z][A-Za-z0-9_]*)/.exec(typeText);
    if (identifierMatch) {
      return identifierMatch[1];
    }

    return "dynamic";
  }

  // === UTILITY METHODS ===

  public resetTypeResolution(): void {
    this.visitedTypes.clear();
  }

  public addCustomTypeMapping(tsType: string, dartType: string): void {
    this.customTypeRegistry.set(tsType, dartType);
  }

  public getCustomTypeMappings(): Map<string, string> {
    return new Map(this.customTypeRegistry);
  }

  public setSourceFile(sourceFile: SourceFile): void {
    this.sourceFile = sourceFile;
  }

  public setProject(project: Project): void {
    this.project = project;
    this.typeChecker = project.getTypeChecker();
  }
}

// === CONVENIENCE FUNCTIONS ===

export function createParser(options?: {
  customTypeRegistry?: Map<string, string>;
  sourceFile?: SourceFile;
  project?: Project;
  maxDepth?: number;
}): TypeScriptToDartParser {
  return new TypeScriptToDartParser(options);
}

export function resolveDartType(
  tsType: Type,
  options?: {
    customTypeRegistry?: Map<string, string>;
    sourceFile?: SourceFile;
    project?: Project;
    maxDepth?: number;
  },
): string {
  const parser = new TypeScriptToDartParser(options);
  return parser.resolveDartType(tsType);
}
