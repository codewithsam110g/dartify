import * as ts from "ts-morph";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/interface";
import { IRParameter } from "@ir/function";
import { parseType } from "@typeParser/type";
import { IRDeclKind } from "@ir/index";
import { declarationParseContext, ParseContext } from "./context";

export function parseInterface(
  interfaceDecl: ts.InterfaceDeclaration,
  context: ParseContext = declarationParseContext(
    interfaceDecl,
    interfaceDecl.getName(),
  ),
): IRInterface {
  let name = interfaceDecl.getName();
  const extenders = interfaceDecl.getExtends().map((heritage, index) =>
    parseType(heritage, 0, context),
  );

  // Properties
  let properties: IRProperties[] = [];
  for (const [propertyIndex, prop] of interfaceDecl.getProperties().entries()) {
    let name = prop.getName();
    const propertyContext = context.child(name);
    let type = parseType(prop.getTypeNode(), 0, propertyContext);
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
  for (const [methodIndex, method] of interfaceDecl.getMethods().entries()) {
    let name = method.getName();
    const methodContext = context.child(name);
    let parameters: IRParameter[] = [];
    let returnType = parseType(
      method.getReturnTypeNode(),
      0,
      methodContext,
    );
    let isOptional = method.hasQuestionToken();

    for (const [paramIndex, param] of method.getParameters().entries()) {
      // Do not parse `this` param
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

      let pName = param.getName();
      const paramContext = methodContext.child(pName);
      let type = parseType(param.getTypeNode(), 0, paramContext);
      let isOptional = param.isOptional();
      let isRest = param.isRestParameter();
      parameters.push({
        name: pName,
        type: type,
        isOptional: isOptional,
        isRest: isRest,
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
  for (const [constructorIndex, constructor] of interfaceDecl
    .getConstructSignatures()
    .entries()) {
    let parameters: IRParameter[] = [];
    const constructorContext = context.child("constructor");
    let returnType = parseType(
      constructor.getReturnTypeNode(),
      0,
      constructorContext,
    );

    for (const [paramIndex, param] of constructor.getParameters().entries()) {
      // Do not parse `this` param
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

      let pName = param.getName();
      const paramContext = constructorContext.child(pName);
      let type = parseType(param.getTypeNode(), 0, paramContext);
      let isOptional = param.isOptional();
      let isRest = param.isRestParameter();
      parameters.push({
        name: pName,
        type: type,
        isOptional: isOptional,
        isRest: isRest,
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
  for (const [accessorIndex, ga] of interfaceDecl.getGetAccessors().entries()) {
    let name = ga.getName();
    const accessorContext = context.child(name);
    let type = parseType(ga.getReturnTypeNode(), 0, accessorContext);

    getAccessors.push({
      name,
      type,
      isStatic: false,
    });
  }

  // Set Accessors
  let setAccessors: IRSetAccessor[] = [];
  for (const [accessorIndex, sa] of interfaceDecl.getSetAccessors().entries()) {
    let name = sa.getName();
    const accessorContext = context.child(name);
    let param = sa.getParameters()[0];
    setAccessors.push({
      name: name,
      parameter: {
        name: param.getName(),
        type: parseType(param.getTypeNode(), 0, accessorContext),
        isOptional: param.hasQuestionToken(),
        isRest: param.isRestParameter(),
      },
      isStatic: false,
    });
  }

  // IndexSignatures
  let indexSignatures: IRIndexSignatures[] = [];
  for (const [index, indexSig] of interfaceDecl
    .getIndexSignatures()
    .entries()) {
    const indexContext = context.child("indexSig");
    let keyType = parseType(
      indexSig.getKeyTypeNode(),
      0,
      indexContext,
    );
    let valueType = parseType(
      indexSig.getReturnTypeNode(),
      0,
      indexContext,
    );
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
