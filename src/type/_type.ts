/**
 * Copyright 2025 Samba Siva Rao Kovvuru <codewithsam110g>
 * Licensed under the Apache License, Version 2.0
 * https://www.apache.org/licenses/LICENSE-2.0
 */

import {
  TypeNode,
  SyntaxKind,
  SourceFile,
  Project,
  Node,
  UnionTypeNode,
  IntersectionTypeNode,
  ArrayTypeNode,
  TupleTypeNode,
  TypeLiteralNode,
  FunctionTypeNode,
  TypeReferenceNode,
  LiteralTypeNode,
  MappedTypeNode,
  ConditionalTypeNode,
  IndexedAccessTypeNode,
  TypeOperatorTypeNode,
  ParenthesizedTypeNode,
  RestTypeNode,
  TemplateLiteralTypeNode,
  ts,
  Type,
} from "ts-morph";

// Registry for custom type mappings
const defaultCustomTypeRegistry = new Map<string, string>([
  ["string", "String"],
  ["number", "double"],
  ["boolean", "bool"],
  ["Date", "DateTime"],
  ["RegExp", "RegExp"],
  ["BigInt", "BigInt"],
  ["Array", "List"],
  ["ReadonlyArray", "List"],
  ["Map", "Map"],
  ["Set", "Set"],
  ["Record", "Map"],
  ["Promise", "Future"],
  ["Function", "Function"],
  ["Object", "Object"],
  ["Error", "Exception"],
  ["JSON", "dynamic"],
]);

export class TypeNodeToDartParser {
  private customTypeRegistry: Map<string, string>;
  private visitedTypeNodes: Set<string>;
  private sourceFile?: SourceFile;
  private project?: Project;
  private maxDepth: number;

  constructor(options?: {
    customTypeRegistry?: Map<string, string>;
    sourceFile?: SourceFile;
    project?: Project;
    maxDepth?: number;
  }) {
    this.customTypeRegistry =
      options?.customTypeRegistry || new Map(defaultCustomTypeRegistry);
    this.visitedTypeNodes = new Set();
    this.sourceFile = options?.sourceFile;
    this.project = options?.project;
    this.maxDepth = options?.maxDepth || 15;
  }

  public resolveDartType(
    typeNode: TypeNode | undefined,
    depth: number = 0,
  ): string {
    if (typeNode == undefined) return "";

    // Prevent runaway recursion
    if (depth > this.maxDepth) return "dynamic";

    const typeKey = this.getTypeNodeKey(typeNode);

    // Handle circular references
    if (this.visitedTypeNodes.has(typeKey)) {
      console.log("Found revisited type node: ", typeNode.getText());
      return "dynamic";
    }

    this.visitedTypeNodes.add(typeKey);

    try {
      const result = this.processTypeNode(typeNode, depth);
      return result;
    } finally {
      this.visitedTypeNodes.delete(typeKey);
    }
  }

  private processTypeNode(typeNode: TypeNode, depth: number): string {
    const kind = typeNode.getKind();

    switch (kind) {
      // === PRIMITIVE TYPES ===
      case SyntaxKind.StringKeyword:
        return "String";
      case SyntaxKind.NumberKeyword:
        return "double";
      case SyntaxKind.BooleanKeyword:
        return "bool";
      case SyntaxKind.UndefinedKeyword:
      case SyntaxKind.NullKeyword:
        return "Null";
      case SyntaxKind.VoidKeyword:
        return "void";
      case SyntaxKind.AnyKeyword:
      case SyntaxKind.UnknownKeyword:
        return "dynamic";
      case SyntaxKind.NeverKeyword:
        return "Never";
      case SyntaxKind.BigIntKeyword:
        return "BigInt";
      case SyntaxKind.ObjectKeyword:
        return "Object";
      case SyntaxKind.SymbolKeyword:
        return "Symbol";

      // === LITERAL TYPES ===
      case SyntaxKind.LiteralType:
        return this.handleLiteralType(typeNode as LiteralTypeNode, depth);

      // === TEMPLATE LITERAL TYPES ===
      case SyntaxKind.TemplateLiteralType:
        return this.handleTemplateLiteralType(
          typeNode as TemplateLiteralTypeNode,
          depth,
        );

      // === UNION TYPES ===
      case SyntaxKind.UnionType:
        return this.handleUnionType(typeNode as UnionTypeNode, depth);

      // === INTERSECTION TYPES ===
      case SyntaxKind.IntersectionType:
        return this.handleIntersectionType(
          typeNode as IntersectionTypeNode,
          depth,
        );

      // === ARRAY TYPES ===
      case SyntaxKind.ArrayType:
        return this.handleArrayType(typeNode as ArrayTypeNode, depth);

      // === TUPLE TYPES ===
      case SyntaxKind.TupleType:
        return this.handleTupleType(typeNode as TupleTypeNode, depth);

      // === TYPE REFERENCE ===
      case SyntaxKind.TypeReference:
        return this.handleTypeReference(typeNode as TypeReferenceNode, depth);

      // === FUNCTION TYPES ===
      case SyntaxKind.FunctionType:
        return this.handleFunctionType(typeNode as FunctionTypeNode, depth);

      // === TYPE LITERAL (OBJECT) ===
      case SyntaxKind.TypeLiteral:
        return this.handleTypeLiteral(typeNode as TypeLiteralNode, depth);

      // === CONDITIONAL TYPES ===
      case SyntaxKind.ConditionalType:
        return this.handleConditionalType(
          typeNode as ConditionalTypeNode,
          depth,
        );

      // === MAPPED TYPES ===
      case SyntaxKind.MappedType:
        return this.handleMappedType(typeNode as MappedTypeNode, depth);

      // === INDEXED ACCESS TYPES ===
      case SyntaxKind.IndexedAccessType:
        return this.handleIndexedAccessType(
          typeNode as IndexedAccessTypeNode,
          depth,
        );

      // === TYPE OPERATOR ===
      case SyntaxKind.TypeOperator:
        return this.handleTypeOperator(typeNode as TypeOperatorTypeNode, depth);

      // === PARENTHESIZED TYPE ===
      case SyntaxKind.ParenthesizedType:
        return this.handleParenthesizedType(
          typeNode as ParenthesizedTypeNode,
          depth,
        );

      // === REST TYPE ===
      case SyntaxKind.RestType:
        return this.handleRestType(typeNode as RestTypeNode, depth);

      // === FALLBACK ===
      default:
        return this.handleFallbackType(typeNode);
    }
  }

  private getTypeNodeKey(typeNode: TypeNode): string {
    return `${typeNode.getKindName()}_${typeNode.getText()}_${typeNode.getStart()}`;
  }

  // === TYPE HANDLERS ===

  private handleLiteralType(node: LiteralTypeNode, depth: number): string {
    const literal = node.getLiteral();
    const kind = literal.getKind();

    switch (kind) {
      case SyntaxKind.StringLiteral:
      case SyntaxKind.NoSubstitutionTemplateLiteral:
        return "String";
      case SyntaxKind.NumericLiteral:
        return "double";
      case SyntaxKind.TrueKeyword:
      case SyntaxKind.FalseKeyword:
        return "bool";
      case SyntaxKind.NullKeyword:
        return "Null";
      case SyntaxKind.BigIntLiteral:
        return "BigInt";
      default:
        return "dynamic";
    }
  }

  private handleTemplateLiteralType(
    node: TemplateLiteralTypeNode,
    depth: number,
  ): string {
    // Template literal types always resolve to strings
    return "String";
  }

  private handleUnionType(node: UnionTypeNode, depth: number): string {
    const types = node.getTypeNodes();

    // Check for nullable union (T | null | undefined)
    const nullableTypes = types.filter(
      (t) =>
        t.getKind() === SyntaxKind.NullKeyword ||
        t.getKind() === SyntaxKind.UndefinedKeyword,
    );
    const nonNullableTypes = types.filter(
      (t) =>
        t.getKind() !== SyntaxKind.NullKeyword &&
        t.getKind() !== SyntaxKind.UndefinedKeyword,
    );

    if (nullableTypes.length > 0 && nonNullableTypes.length === 1) {
      // Simple nullable type: T | null => T?
      return `${this.resolveDartType(nonNullableTypes[0], depth + 1)}?`;
    }

    if (nonNullableTypes.length === 1) {
      return this.resolveDartType(nonNullableTypes[0], depth + 1);
    }

    // Check if all types resolve to the same Dart type
    const resolvedTypes = nonNullableTypes.map((t) =>
      this.resolveDartType(t, depth + 1),
    );
    const uniqueTypes = [...new Set(resolvedTypes)];

    if (uniqueTypes.length === 1) {
      const baseType = uniqueTypes[0];
      return nullableTypes.length > 0 ? `${baseType}?` : baseType;
    }

    // Complex union - use Object in Dart
    return nullableTypes.length > 0 ? "Object?" : "Object";
  }

  private handleIntersectionType(
    node: IntersectionTypeNode,
    depth: number,
  ): string {
    // Dart doesn't have intersection types, so we use dynamic
    return "dynamic";
  }

  private handleArrayType(node: ArrayTypeNode, depth: number): string {
    const elementType = node.getElementTypeNode();
    const dartElementType = this.resolveDartType(elementType, depth + 1);
    return `List<${dartElementType}>`;
  }

  private handleTupleType(node: TupleTypeNode, depth: number): string {
    const elements = node.getElements();

    if (elements.length === 0) {
      return "List<dynamic>";
    }

    // Resolve all element types
    const dartTypes = elements.map((element) => {
      // Handle named tuple elements and rest elements
      if (Node.isRestTypeNode(element)) {
        return this.handleRestType(element, depth + 1);
      } else if (Node.isNamedTupleMember && Node.isNamedTupleMember(element)) {
        return this.resolveDartType(element.getTypeNode(), depth + 1);
      } else {
        return this.resolveDartType(element, depth + 1);
      }
    });

    const uniqueTypes = [...new Set(dartTypes)];

    // If all elements are the same type, use List<T>
    if (uniqueTypes.length === 1) {
      return `List<${uniqueTypes[0]}>`;
    }

    // For mixed types, use List<dynamic>
    return "List<dynamic>";
  }

  private handleTypeReference(node: TypeReferenceNode, depth: number): string {
    const typeName = node.getTypeName();
    let typeNameText: string;

    if (Node.isIdentifier(typeName)) {
      typeNameText = typeName.getText();
    } else if (Node.isQualifiedName(typeName)) {
      typeNameText = typeName.getText();
      // Extract the last part for simple cases
      const parts = typeNameText.split(".");
      typeNameText = parts[parts.length - 1];
    } else {
      // This should handle any other cases, though they're rare
      typeNameText = "";
    }

    const typeArgs = node.getTypeArguments();

    // Handle built-in generic types
    if (typeArgs.length > 0) {
      const dartArgs = typeArgs.map((arg) =>
        this.resolveDartType(arg, depth + 1),
      );

      // Special handling for common generic types
      switch (typeNameText) {
        case "Array":
        case "ReadonlyArray":
          return `List<${dartArgs[0] || "dynamic"}>`;
        case "Map":
          return `Map<${dartArgs[0] || "dynamic"}, ${dartArgs[1] || "dynamic"}>`;
        case "Set":
        case "ReadonlySet":
          return `Set<${dartArgs[0] || "dynamic"}>`;
        case "Promise":
          return `Future<${dartArgs[0] || "dynamic"}>`;
        case "Record":
          return `Map<${dartArgs[0] || "String"}, ${dartArgs[1] || "dynamic"}>`;
        case "Partial":
          return `${dartArgs[0] || "dynamic"}?`;
        case "Required":
        case "Readonly":
          return dartArgs[0] || "dynamic";
        case "Pick":
        case "Omit":
          return "Map<String, dynamic>";
        case "Exclude":
        case "Extract":
          return dartArgs[0] || "dynamic";
        default:
          // Check if it's in custom registry
          if (this.customTypeRegistry.has(typeNameText)) {
            const dartBase = this.customTypeRegistry.get(typeNameText)!;
            return `${dartBase}<${dartArgs.join(", ")}>`;
          }
          // Generic class/interface
          return `${typeNameText}<${dartArgs.join(", ")}>`;
      }
    }

    // Handle non-generic type references
    if (this.customTypeRegistry.has(typeNameText)) {
      return this.customTypeRegistry.get(typeNameText)!;
    }

    // Return the type name as-is for classes, interfaces, enums
    return typeNameText;
  }

  private handleFunctionType(node: FunctionTypeNode, depth: number): string {
    const parameters = node.getParameters();
    const returnTypeNode = node.getReturnTypeNode();

    const dartReturnType = returnTypeNode
      ? this.resolveDartType(returnTypeNode, depth + 1)
      : "void";

    if (parameters.length === 0) {
      return `${dartReturnType} Function()`;
    }

    const paramTypes = parameters.map((param) => {
      const paramType = param.getTypeNode();
      return paramType ? this.resolveDartType(paramType, depth + 1) : "dynamic";
    });

    return `${dartReturnType} Function(${paramTypes.join(", ")})`;
  }

  private handleTypeLiteral(node: TypeLiteralNode, depth: number): string {
    const members = node.getMembers();

    if (members.length === 0) {
      return "Map<String, dynamic>";
    }

    // Analyze the structure
    const properties: string[] = [];
    const indexSignatures: string[] = [];
    let hasCallSignature = false;

    for (const member of members) {
      if (Node.isPropertySignature(member)) {
        const name = member.getName();
        const typeNode = member.getTypeNode();
        if (typeNode) {
          const dartType = this.resolveDartType(typeNode, depth + 1);
          properties.push(dartType);
        }
      } else if (Node.isIndexSignatureDeclaration(member)) {
        const keyTypeNode = member.getKeyTypeNode();
        const returnTypeNode = member.getReturnTypeNode();
        const dartKeyType = keyTypeNode
          ? this.resolveDartType(keyTypeNode, depth + 1)
          : "String";
        const dartReturnType = returnTypeNode
          ? this.resolveDartType(returnTypeNode, depth + 1)
          : "dynamic";
        indexSignatures.push(`Map<${dartKeyType}, ${dartReturnType}>`);
      } else if (Node.isCallSignatureDeclaration(member)) {
        hasCallSignature = true;
      }
    }

    // If it has index signatures, prefer Map representation
    if (indexSignatures.length > 0) {
      return indexSignatures[0];
    }

    // If it's primarily a function (has call signatures)
    if (hasCallSignature && properties.length === 0) {
      return "Function";
    }

    // Analyze property types for Map vs Object decision
    if (properties.length > 0) {
      const uniquePropertyTypes = [...new Set(properties)];

      if (uniquePropertyTypes.length === 1) {
        // All properties have the same type - could be a Map
        if (properties.length > 3) {
          return `Map<String, ${uniquePropertyTypes[0]}>`;
        }
      }
    }

    // Default to Map for object literals
    return "Map<String, dynamic>";
  }

  private handleConditionalType(
    node: ConditionalTypeNode,
    depth: number,
  ): string {
    // Conditional types are complex to resolve without type checking
    // For now, return dynamic as a safe fallback
    const trueType = node.getTrueType();

    try {
      // Try to resolve the true branch as it's commonly taken
      return this.resolveDartType(trueType, depth + 1);
    } catch {
      return "dynamic";
    }
  }

  private handleMappedType(node: MappedTypeNode, depth: number): string {
    const templateType = node.getType();
    if (templateType) {
      const dartValueType = this.resolveDartTypeFromType(
        templateType,
        depth + 1,
      );
      return `Map<String, ${dartValueType}>`;
    }
    return "Map<String, dynamic>";
  }

  // Create this method if it doesn't exist
  private resolveDartTypeFromType(type: Type<ts.Type>, depth: number): string {
    // Handle Type object directly
    const typeNode = type.getSymbol()?.getDeclarations()?.[0];
    if (typeNode && Node.isTypeNode(typeNode)) {
      return this.resolveDartType(typeNode, depth);
    }
    // Fallback logic for Type objects
    return "dynamic";
  }

  private handleIndexedAccessType(
    node: IndexedAccessTypeNode,
    depth: number,
  ): string {
    // T[K] type access - without type checking, we can't resolve this accurately
    const objectType = node.getObjectTypeNode();

    try {
      // Try to resolve the base object type
      const baseType = this.resolveDartType(objectType, depth + 1);

      // If it's a Map, return the value type (though we can't determine it exactly)
      if (baseType.startsWith("Map<")) {
        const match = baseType.match(/Map<[^,]+,\s*([^>]+)>/);
        if (match) {
          return match[1];
        }
      }

      // If it's a List, return the element type
      if (baseType.startsWith("List<")) {
        const match = baseType.match(/List<([^>]+)>/);
        if (match) {
          return match[1];
        }
      }
    } catch {
      // Fallback
    }

    return "dynamic";
  }

  private handleTypeOperator(
    node: TypeOperatorTypeNode,
    depth: number,
  ): string {
    const operator = node.getOperator();
    const typeNode = node.getTypeNode();

    switch (operator) {
      case SyntaxKind.KeyOfKeyword:
        // keyof T - returns union of keys, which in Dart would be String
        return "String";
      case SyntaxKind.UniqueKeyword:
        // unique symbol - closest in Dart would be Symbol
        return "Symbol";
      case SyntaxKind.ReadonlyKeyword:
        // readonly T - same as T in Dart
        return this.resolveDartType(typeNode, depth + 1);
      default:
        return this.resolveDartType(typeNode, depth + 1);
    }
  }

  private handleParenthesizedType(
    node: ParenthesizedTypeNode,
    depth: number,
  ): string {
    return this.resolveDartType(node.getTypeNode(), depth + 1);
  }

  private handleRestType(node: RestTypeNode, depth: number): string {
    const elementType = node.getTypeNode();
    const dartElementType = this.resolveDartType(elementType, depth + 1);
    return `List<${dartElementType}>`;
  }

  private handleFallbackType(node: TypeNode): string {
    const text = node.getText().trim();

    // Handle type parameters (generics like T, U, etc.)
    if (/^[A-Z][A-Za-z0-9]*$/.test(text)) {
      return text;
    }

    // Try to extract identifier from the text
    const identifierMatch = /([A-Za-z][A-Za-z0-9_]*)/.exec(text);
    if (identifierMatch) {
      const identifier = identifierMatch[1];
      if (this.customTypeRegistry.has(identifier)) {
        return this.customTypeRegistry.get(identifier)!;
      }
      return identifier;
    }

    return "dynamic";
  }

  // === UTILITY METHODS ===

  public resetTypeResolution(): void {
    this.visitedTypeNodes.clear();
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
  }

  public removeCustomTypeMapping(tsType: string): boolean {
    return this.customTypeRegistry.delete(tsType);
  }

  public hasCustomTypeMapping(tsType: string): boolean {
    return this.customTypeRegistry.has(tsType);
  }
}

// === CONVENIENCE FUNCTIONS ===

export function createParser(options?: {
  customTypeRegistry?: Map<string, string>;
  sourceFile?: SourceFile;
  project?: Project;
  maxDepth?: number;
}): TypeNodeToDartParser {
  return new TypeNodeToDartParser(options);
}

export function resolveDartType(
  typeNode: TypeNode | undefined,
  options?: {
    customTypeRegistry?: Map<string, string>;
    sourceFile?: SourceFile;
    project?: Project;
    maxDepth?: number;
  },
): string {
  const parser = new TypeNodeToDartParser(options);
  return parser.resolveDartType(typeNode);
}

// === HELPER FUNCTIONS FOR COMMON PATTERNS ===

export function isNullableTypeNode(typeNode: TypeNode): boolean {
  if (Node.isUnionTypeNode(typeNode)) {
    const types = typeNode.getTypeNodes();
    return types.some(
      (t) =>
        t.getKind() === SyntaxKind.NullKeyword ||
        t.getKind() === SyntaxKind.UndefinedKeyword,
    );
  }
  return false;
}

export function extractNonNullableType(typeNode: TypeNode): TypeNode | null {
  if (Node.isUnionTypeNode(typeNode)) {
    const types = typeNode.getTypeNodes();
    const nonNullable = types.filter(
      (t) =>
        t.getKind() !== SyntaxKind.NullKeyword &&
        t.getKind() !== SyntaxKind.UndefinedKeyword,
    );
    if (nonNullable.length === 1) {
      return nonNullable[0];
    }
  }
  return null;
}
