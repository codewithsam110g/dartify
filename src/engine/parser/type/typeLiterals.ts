import * as ts from "ts-morph";
import { IRParameter, IRType, TypeKind } from "@ir/type";
import { parseType } from "./type";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/literal";

import { transpilerContext } from "@/context";

export function handleTypeLiterals(
  node: ts.TypeLiteralNode,
  depth: number,
): IRType {
  // Properties
  let properties: IRProperties[] = [];
  for (let prop of node.getProperties()) {
    let name = prop.getName();
    let typeBefore = prop.getTypeNode();
    let typeAfter = parseType(prop.getTypeNode());
    let isReadonly = prop.isReadonly();
    let isOptional = prop.hasQuestionToken();

    properties.push({
      name,
      typeAfter,
      isReadonly,
      isOptional,
      isStatic: false,
    });
  }

  // Methods
  let methods: IRMethod[] = [];
  for (let method of node.getMethods()) {
    let name = method.getName();
    let parameters: IRParameter[] = [];
    let returnType = parseType(method.getReturnTypeNode());
    let returnTypeNode = method.getReturnTypeNode();
    let isOptional = method.hasQuestionToken();

    for (let param of method.getParameters()) {
      // Do not parse `this` param
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

      let name = param.getName();
      let typeAfter = parseType(param.getTypeNode());
      let isOptional = param.isOptional();
      let isRest = param.isRestParameter();
      parameters.push({
        name: name,
        type: typeAfter,
        isOptional: isOptional,
        isRestParameter: isRest,
      });
    }
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
    let returnType = parseType(constructor.getReturnTypeNode());
    let returnTypeNode = constructor.getReturnTypeNode();

    for (let param of constructor.getParameters()) {
      // Do not parse `this` param
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

      let name = param.getName();
      let typeAfter = parseType(param.getTypeNode());
      let isOptional = param.isOptional();
      let isRest = param.isRestParameter();
      parameters.push({
        name: name,
        type: typeAfter,
        isOptional: isOptional,
        isRestParameter: isRest,
      });
    }
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
    let name = ga.getName();
    let typeBefore = ga.getReturnTypeNode();
    let typeAfter = parseType(ga.getReturnTypeNode());

    getAccessors.push({
      name,
      typeAfter,
      isStatic: false,
    });
  }

  // Set Accessors
  let setAccessors: IRSetAccessor[] = [];
  for (let sa of node.getSetAccessors()) {
    let name = sa.getName();
    let param = sa.getParameters()[0];
    setAccessors.push({
      name: name,
      parameter: {
        name: param.getName(),
        type: parseType(param.getTypeNode()),
        isOptional: param.hasQuestionToken(),
        isRestParameter: param.isRestParameter(),
      },
      isStatic: false,
    });
  }

  // IndexSignatures
  let indexSignatures: IRIndexSignatures[] = [];
  for (let indexSig of node.getIndexSignatures()) {
    let keyType = parseType(indexSig.getKeyTypeNode());
    let valueType = parseType(indexSig.getReturnTypeNode());
    let isReadonly = indexSig.isReadonly();
    indexSignatures.push({
      keyType,
      valueType,
      isReadonly,
    });
  }

  let val = {
    kind: TypeKind.TypeLiteral,
    name: TypeKind.TypeLiteral,
    isNullable: false,
    objectLiteral: {
      properties,
      methods,
      constructors,
      getAccessors,
      setAccessors,
      indexSignatures,
    },
  };

  let parseLiterals = transpilerContext.getParseLiterals();
  let count = transpilerContext.getAnonInterfaceCount();

  // Check if we've already hoisted this literal
  let existingName = transpilerContext.getHoistedLiteral(JSON.stringify(val));

  let res;
  if (existingName) {
    // Reuse existing name
    res = {
      kind: TypeKind.TypeReference,
      name: existingName,
      isNullable: false,
    };
  } else {
    // Create new name and hoist it
    let newName = `AnonInterface$${count}`;
    res = {
      kind: TypeKind.TypeReference,
      name: newName,
      isNullable: false,
    };
    transpilerContext.setHoistedLiteral(JSON.stringify(val), newName);
    transpilerContext.setAnonInterfaceCount(count + 1);
  }

  if (!parseLiterals) {
    return res;
  }
  return val;
}
