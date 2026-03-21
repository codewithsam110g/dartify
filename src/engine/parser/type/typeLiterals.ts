import * as ts from "ts-morph";
import { IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/interface";
import { IRParameter } from "@ir/function";

import { IRDeclKind } from "@ir/declaration";
import { transpilerContext } from "@/context";
import { SymbolType } from "@/symbol";
import { IRTypeAlias } from "@/ir";

export function handleTypeLiterals(
  node: ts.TypeLiteralNode,
  depth: number,
): IRType {
  // Properties
  let properties: IRProperties[] = [];
  for (let prop of node.getProperties()) {
    let name = prop.getName();
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|" + name;
    let type = parseType(prop.getTypeNode());
    transpilerContext.currentFQN = prevFQN;
    let isReadonly = prop.isReadonly();
    let isOptional = prop.hasQuestionToken();
    properties.push({
      name,
      type,
      isReadonly,
      isOptional,
      isStatic: false,
    });
  }

  // Methods
  let methods: IRMethod[] = [];
  for (let method of node.getMethods()) {
    let name = method.getName();
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|" + name;
    let parameters: IRParameter[] = [];
    let returnType = parseType(method.getReturnTypeNode());
    let isOptional = method.hasQuestionToken();
    for (let param of method.getParameters()) {
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;
      let pName = param.getName();
      const paramPrevFQN = transpilerContext.currentFQN;
      transpilerContext.currentFQN = paramPrevFQN + "|" + pName;
      parameters.push({
        name: pName,
        type: parseType(param.getTypeNode()),
        isOptional: param.isOptional(),
        isRest: param.isRestParameter(),
      });
      transpilerContext.currentFQN = paramPrevFQN;
    }
    transpilerContext.currentFQN = prevFQN;
    methods.push({
      name,
      parameters,
      returnType,
      isOptional,
      isStatic: false,
    });
  }

  // Constructors
  let constructors: IRMethod[] = [];
  for (let constructor of node.getConstructSignatures()) {
    let parameters: IRParameter[] = [];
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|constructor";
    let returnType = parseType(constructor.getReturnTypeNode());
    for (let param of constructor.getParameters()) {
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;
      let pName = param.getName();
      const paramPrevFQN = transpilerContext.currentFQN;
      transpilerContext.currentFQN = paramPrevFQN + "|" + pName;
      parameters.push({
        name: pName,
        type: parseType(param.getTypeNode()),
        isOptional: param.isOptional(),
        isRest: param.isRestParameter(),
      });
      transpilerContext.currentFQN = paramPrevFQN;
    }
    transpilerContext.currentFQN = prevFQN;
    constructors.push({
      name: "constructor",
      parameters,
      returnType,
      isOptional: false,
      isStatic: false,
    });
  }

  // Get Accessors
  let getAccessors: IRGetAccessor[] = [];
  for (let ga of node.getGetAccessors()) {
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|" + ga.getName();
    getAccessors.push({
      name: ga.getName(),
      type: parseType(ga.getReturnTypeNode()),
      isStatic: false,
    });
    transpilerContext.currentFQN = prevFQN;
  }

  // Set Accessors
  let setAccessors: IRSetAccessor[] = [];
  for (let sa of node.getSetAccessors()) {
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|" + sa.getName();
    let param = sa.getParameters()[0];
    setAccessors.push({
      name: sa.getName(),
      parameter: {
        name: param.getName(),
        type: parseType(param.getTypeNode()),
        isOptional: param.hasQuestionToken(),
        isRest: param.isRestParameter(),
      },
      isStatic: false,
    });
    transpilerContext.currentFQN = prevFQN;
  }

  // Index Signatures
  let indexSignatures: IRIndexSignatures[] = [];
  for (let indexSig of node.getIndexSignatures()) {
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|indexSig";
    indexSignatures.push({
      keyType: parseType(indexSig.getKeyTypeNode()),
      valueType: parseType(indexSig.getReturnTypeNode()),
      isReadonly: indexSig.isReadonly(),
    });
    transpilerContext.currentFQN = prevFQN;
  }

  if (node.getMembers().length == 0) {
    if (!transpilerContext.symbolTable.has("anon_dynamic")) {
      let ir: IRTypeAlias = {
        kind: IRDeclKind.TypeAlias,
        name: "anon_dynamic",
        type: {
          kind: TypeKind.TypeReference,
          name: "anon_dynamic",
          isNullable: false,
        },
      };
      const fqn = transpilerContext.currentFQN;
      const [filePath, scopePath] = fqn.split("::");

      transpilerContext.symbolTable.register("anon_dynamic", {
        fqn: filePath + "::anon_dynamic",
        ir,
        type: SymbolType.TYPE_ALIAS,
      });
    }
    return {
      kind: TypeKind.TypeReference,
      name: "anon_dynamic",
      isNullable: false,
    };
  }

  const fqn = transpilerContext.currentFQN;

  // 1. Split the FQN into the physical File Path and the logical Scope Path
  const [filePath, scopePath] = fqn.split("::");

  // 2. Sanitize the scope path to create a deterministic, valid Dart class name
  // Example: `"h3"|isValidCell|options` -> `h3_isValidCell_options`
  const safeScopeName = (scopePath || "Global")
    .replace(/["']/g, "") // Strip quotes (e.g., from module names)
    .replace(/\|/g, "_") // Convert scope pipes to underscores
    .replace(/[^a-zA-Z0-9_]/g, ""); // Strip any remaining invalid Dart characters

  const anonName = `Anon_${safeScopeName}`;
  const fullAnonFqn = `${filePath}::${anonName}`;

  // 3. Build the anonymous IRInterface
  const anonInterface: IRInterface = {
    kind: IRDeclKind.Interface,
    name: anonName, // Tag it with the generated deterministic name
    extends: [],
    properties,
    methods,
    constructors,
    getAccessors,
    setAccessors,
    indexSignatures,
  };

  // 4. Wrap it in your Symbol struct and register it directly to the global Table
  transpilerContext.symbolTable.register(fullAnonFqn, {
    type: SymbolType.INTERFACE,
    fqn: fullAnonFqn,
    ir: anonInterface,
  });

  // 5. Return a TypeRef pointing at the newly hoisted anonymous interface
  return {
    kind: TypeKind.TypeReference,
    name: anonName, // The Statement Parser will use this string for the Dart output
    isNullable: false,
    genericArgs: [],
  };
}
