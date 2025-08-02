import * as ts from "ts-morph";
import { IRClass, IRConstructor } from "../ir/class";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "../ir/interface";
import { IRParameter } from "../ir/function";
import { parseType } from "../type/parser/type";
import { IRDeclKind } from "../ir";

export function parseClass(classDecl: ts.ClassDeclaration): IRClass {
  let name = classDecl.getName() || "";
  let extenders = classDecl.getExtends()?.getText();
  let implementers = classDecl.getImplements().map((impl) => impl.getText());
  let isAbstract = classDecl.isAbstract();
  let typeParams = classDecl.getTypeParameters().map((tp) => tp.getName());

  // Properties
  let properties: IRProperties[] = [];
  for (let prop of classDecl.getProperties()) {
    let name = prop.getName();
    let typeBefore = prop.getTypeNode();
    let typeAfter = parseType(prop.getTypeNode());
    let isReadonly = prop.isReadonly();
    let isOptional = prop.hasQuestionToken();
    let isStatic = prop.isStatic();

    properties.push({
      name,
      typeBefore,
      typeAfter,
      isReadonly,
      isOptional,
      isStatic,
    });
  }

  // Methods
  let methods: IRMethod[] = [];
  for (let method of classDecl.getMethods()) {
    let name = method.getName();
    let parameters: IRParameter[] = [];
    let returnType = parseType(method.getReturnTypeNode());
    let returnTypeNode = method.getReturnTypeNode();
    let isOptional = method.hasQuestionToken();
    let isStatic = method.isStatic();

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
      isStatic,
    });
  }

  // Constructors
  let constructors: IRConstructor[] = [];
  for (let constructor of classDecl.getConstructors()) {
    let parameters: IRParameter[] = [];
    let jsDoc =
      constructor
        .getJsDocs()
        .map((doc) => doc.getText())
        .join("\n") || undefined;

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
      parameters,
      jsDoc,
    });
  }

  // Get Accessors
  let getAccessors: IRGetAccessor[] = [];
  for (let ga of classDecl.getGetAccessors()) {
    let name = ga.getName();
    let typeBefore = ga.getReturnTypeNode();
    let typeAfter = parseType(ga.getReturnTypeNode());
    let isStatic = ga.isStatic();

    getAccessors.push({
      name,
      typeBefore,
      typeAfter,
      isStatic,
    });
  }

  // Set Accessors
  let setAccessors: IRSetAccessor[] = [];
  for (let sa of classDecl.getSetAccessors()) {
    let name = sa.getName();
    let param = sa.getParameters()[0];
    let isStatic = sa.isStatic();
    setAccessors.push({
      name: name,
      parameter: {
        name: param.getName(),
        typeBefore: param.getTypeNode(),
        typeAfter: parseType(param.getTypeNode()),
        isOptional: param.hasQuestionToken(),
        isRest: param.isRestParameter(),
      },
      isStatic,
    });
  }


  return {
    kind: IRDeclKind.Class,
    name,
    extends: extenders,
    implements: implementers,
    isAbstract,
    typeParams,
    constructors,
    properties,
    methods,
    getAccessors,
    setAccessors,
  };
}
