import * as ts from "ts-morph";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "../ir/interface";
import { IRParameter } from "../ir/function";
import { parseType } from "../type/parser/type";
import { IRDeclKind } from "../ir";

export function parseInterface(
  interfaceDecl: ts.InterfaceDeclaration,
): IRInterface {
  let name = interfaceDecl.getName();
  let extenders = interfaceDecl.getExtends().map((e) => e.getText());

  // Properties
  let properties: IRProperties[] = [];
  for (let prop of interfaceDecl.getProperties()) {
    let name = prop.getName();
    let typeBefore = prop.getTypeNode();
    let typeAfter = parseType(prop.getTypeNode());
    let isReadonly = prop.isReadonly();
    let isOptional = prop.hasQuestionToken();

    properties.push({
      name,
      typeBefore,
      typeAfter,
      isReadonly,
      isOptional,
      isStatic: false,
    });
  }

  // Methods
  let methods: IRMethod[] = [];
  for (let method of interfaceDecl.getMethods()) {
    let name = method.getName();
    let parameters: IRParameter[] = [];
    let returnType = parseType(method.getReturnTypeNode());
    let returnTypeNode = method.getReturnTypeNode();
    let isOptional = method.hasQuestionToken();

    for (let param of method.getParameters()) {
      // Do not parse `this` param
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

      let name = param.getName();
      let typeBefore = param.getTypeNode();
      let typeAfter = parseType(param.getTypeNode());
      let isOptional = param.isOptional();
      let isRest = param.isRestParameter();
      parameters.push({
        name: name,
        typeBefore: typeBefore,
        typeAfter: typeAfter,
        isOptional: isOptional,
        isRest: isRest,
      });
    }
    methods.push({
      name,
      parameters,
      returnType,
      returnTypeNode,
      isOptional,
      isStatic: false,
    });
  }

  // Constructors
  let constructors: IRMethod[] = [];
  for (let constructor of interfaceDecl.getConstructSignatures()) {
    let parameters: IRParameter[] = [];
    let returnType = parseType(constructor.getReturnTypeNode());
    let returnTypeNode = constructor.getReturnTypeNode();

    for (let param of constructor.getParameters()) {
      // Do not parse `this` param
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

      let name = param.getName();
      let typeBefore = param.getTypeNode();
      let typeAfter = parseType(param.getTypeNode());
      let isOptional = param.isOptional();
      let isRest = param.isRestParameter();
      parameters.push({
        name: name,
        typeBefore: typeBefore,
        typeAfter: typeAfter,
        isOptional: isOptional,
        isRest: isRest,
      });
    }
    constructors.push({
      name: "constructor",
      parameters,
      returnType,
      returnTypeNode,
      isOptional: false,
      isStatic: false,
    });
  }

  // Get Accessors
  let getAccessors: IRGetAccessor[] = [];
  for (let ga of interfaceDecl.getGetAccessors()) {
    let name = ga.getName();
    let typeBefore = ga.getReturnTypeNode();
    let typeAfter = parseType(ga.getReturnTypeNode());

    getAccessors.push({
      name,
      typeBefore,
      typeAfter,
      isStatic: false,
    });
  }

  // Set Accessors
  let setAccessors: IRSetAccessor[] = [];
  for (let sa of interfaceDecl.getSetAccessors()) {
    let name = sa.getName();
    let param = sa.getParameters()[0];
    setAccessors.push({
      name: name,
      parameter: {
        name: param.getName(),
        typeBefore: param.getTypeNode(),
        typeAfter: parseType(param.getTypeNode()),
        isOptional: param.hasQuestionToken(),
        isRest: param.isRestParameter(),
      },
      isStatic: false,
    });
  }

  // IndexSignatures
  let indexSignatures: IRIndexSignatures[] = [];
  for (let indexSig of interfaceDecl.getIndexSignatures()) {
    let keyType = parseType(indexSig.getKeyTypeNode());
    let valueType = parseType(indexSig.getReturnTypeNode());
    let isReadonly = indexSig.isReadonly();
    indexSignatures.push({
      keyType,
      valueType,
      isReadonly,
    });
  }

  return {
    kind: IRDeclKind.Interface,
    name,
    extends: extenders,
    properties,
    methods,
    constructors,
    getAccessors,
    setAccessors,
    indexSignatures,
  };
}
