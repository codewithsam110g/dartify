import {
  IRDeclaration,
  IRDeclKind,
  IRVariable,
  IRTypeAlias,
  IRFunction,
  IRInterface,
  IRClass,
  IRParameter,
} from "@ir/index";
import { IRParameter as IRLiteralParameter } from "@ir/type";
import {
  IRType,
  TypeKind,
} from "@ir/type";

import { IRLiteral } from "@ir/literal";

export class TypeVisitor {
  // State for deduplication and hoisting
  private hoistedInterfaces: Map<string, IRLiteral> = new Map();
  private seenLiterals: Map<string, string> = new Map(); // Hash -> Name
  private anonCount: number = 1;

  /**
   * Entry point: Extract and clean types from a Declaration.
   * This mutates the declaration in-place.
   */
  public visitDeclaration(decl: IRDeclaration): void {
    switch (decl.kind) {
      case IRDeclKind.Variable:
        const varDecl = decl as IRVariable;
        varDecl.type = this.visit(varDecl.type);
        break;

      case IRDeclKind.TypeAlias:
        const typeAlias = decl as IRTypeAlias;
        typeAlias.type = this.visit(typeAlias.type);
        break;

      case IRDeclKind.Function:
        const funcDecl = decl as IRFunction;
        if (funcDecl.returnType) {
          funcDecl.returnType = this.visit(funcDecl.returnType);
        }
        this.visitParameters(funcDecl.parameters);
        break;

      case IRDeclKind.Interface:
        const ifaceDecl = decl as IRInterface;
        this.visitMembers(ifaceDecl);
        break;

      case IRDeclKind.Class:
        const classDecl = decl as IRClass;
        this.visitMembers(classDecl);
        break;
    }
  }

  /**
   * The Recursive Core: Visits a type and returns its cleaned version.
   * If it finds a TypeLiteral, it returns a TypeReference to the hoisted version.
   */
  public visit(type: IRType): IRType {
    if (!type) return type;

    switch (type.kind) {
      case TypeKind.Array:
        if (type.elementType) {
          type.elementType = this.visit(type.elementType);
        }
        break;

      case TypeKind.Tuple:
        // Check property name based on your IR (tupleTypes vs elements)
        if ((type as any).tupleTypes) {
          (type as any).tupleTypes = (type as any).tupleTypes.map((el: IRType) => this.visit(el));
        }
        break;

      case TypeKind.Union:
        if ((type as any).unionTypes) {
          (type as any).unionTypes = (type as any).unionTypes.map((t: IRType) => this.visit(t));
        }
        break;

      case TypeKind.Intersection:
        if ((type as any).intersectionTypes) {
          (type as any).intersectionTypes = (type as any).intersectionTypes.map((t: IRType) => this.visit(t));
        }
        break;

      case TypeKind.TypeReference:
        // Handle Generics: Promise<{x: 1}> -> Promise<Anon$1>
        // Check property name (genericArgs vs typeArguments)
        const typeRef = type as any;
        if (typeRef.genericArgs && typeRef.genericArgs.length > 0) {
          typeRef.genericArgs = typeRef.genericArgs.map((arg: IRType) => this.visit(arg));
        }
        break;

      case TypeKind.TypeLiteral:
        // 1. UNWRAP: Get the inner objectLiteral from the wrapper

        // Safety check: ensure objectLiteral exists
        if (!type.objectLiteral) {
          return type;
        }

        const literal = type.objectLiteral;

        // 2. RECURSE: Clean children first (Bottom-Up)
        this.visitLiteralChildren(literal);

        // 3. HOIST: Now that children are references, hoist this literal
        return this.hoistLiteral(literal);

      default:
        break;
    }

    return type;
  }

  /**
   * Helper to visit all types inside a Class or Interface definition
   */
  private visitMembers(container: IRInterface | IRClass) {
    // Properties
    for (const prop of container.properties) {
      prop.type = this.visit(prop.type);
    }
    // Methods
    for (const method of container.methods) {
      if (method.returnType) {
        method.returnType = this.visit(method.returnType);
      }
      this.visitParameters(method.parameters);
    }
    // Constructors
    if (container.constructors) {
      for (const ctor of container.constructors) {
        this.visitParameters(ctor.parameters);
      }
    }
    // Index Signatures
    if (container.kind === IRDeclKind.Interface && (container as IRInterface).indexSignatures) {
      for (const idx of (container as IRInterface).indexSignatures) {
        idx.keyType = this.visit(idx.keyType);
        idx.valueType = this.visit(idx.valueType);
      }
    }
    // Accessors
    if (container.getAccessors) {
      for (const get of container.getAccessors) {
        if (get.type) get.type = this.visit(get.type);
      }
    }
    if (container.setAccessors) {
      for (const set of container.setAccessors) {
        set.parameter.type = this.visit(set.parameter.type);
      }
    }
  }

  /**
   * Helper to visit parameters array
   */
  private visitParameters(params: IRParameter[] | IRLiteralParameter[]) {
    for (const param of params) {
      param.type = this.visit(param.type);
    }
  }

  /**
   * Visits the internals of an IRLiteral (properties, methods, etc.)
   */
  private visitLiteralChildren(literal: IRLiteral) {
    // Properties
    for (const prop of literal.properties) {
      prop.type = this.visit(prop.type);
    }

    // Methods
    for (const method of literal.methods) {
      if (method.returnType) {
        method.returnType = this.visit(method.returnType);
      }
      this.visitParameters(method.parameters);
    }

    // Constructors
    for (const ctor of literal.constructors) {
      this.visitParameters(ctor.parameters);
      if (ctor.returnType) ctor.returnType = this.visit(ctor.returnType);
    }

    // Index Signatures
    for (const idx of literal.indexSignatures) {
      idx.keyType = this.visit(idx.keyType);
      idx.valueType = this.visit(idx.valueType);
    }

    // Accessors
    for (const get of literal.getAccessors) {
      if (get.type) get.type = this.visit(get.type);
    }
    for (const set of literal.setAccessors) {
      set.parameter.type = this.visit(set.parameter.type);
    }
  }

  /**
   * The Logic Core: Hashes, Dedupes, and Hoists
   */
  private hoistLiteral(literal: IRLiteral): IRType {
    // 1. Canonicalize: Sort members by name to ensure {a,b} == {b,a}
    this.canonicalizeLiteral(literal);

    // 2. Hash
    const hash = JSON.stringify(literal);

    // 3. Deduplicate
    if (this.seenLiterals.has(hash)) {
      const existingName = this.seenLiterals.get(hash)!;
      return {
        kind: TypeKind.TypeReference,
        name: existingName,
        isNullable: false,
        genericArgs: []
      } as any;
    }

    // 4. Create New Name
    const newName = `AnonInterface$${this.anonCount++}`;

    // 5. Register
    this.seenLiterals.set(hash, newName);
    this.hoistedInterfaces.set(newName, literal);

    // 6. Return Reference
    return {
      kind: TypeKind.TypeReference,
      name: newName,
      isNullable: false,
      // @ts-ignore
      genericArgs: []
    } as any;
  }

  /**
   * Sorts members alphabetically to ensure stable hashing.
   */
  private canonicalizeLiteral(literal: IRLiteral) {
    if (literal.properties) literal.properties.sort((a, b) => a.name.localeCompare(b.name));
    if (literal.methods) literal.methods.sort((a, b) => a.name.localeCompare(b.name));
    if (literal.getAccessors) literal.getAccessors.sort((a, b) => a.name.localeCompare(b.name));
    if (literal.setAccessors) literal.setAccessors.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * API to retrieve the extracted interfaces after visiting is done.
   */
  public getHoistedDeclarations(): Map<string, IRLiteral> {
    return this.hoistedInterfaces;
  }
}
