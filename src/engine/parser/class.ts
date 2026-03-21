import * as ts from "ts-morph";
import { IRClass, IRConstructor } from "@ir/class";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/interface";
import { IRParameter } from "@ir/function";
import { parseType } from "@typeParser//type";
import { IRDeclKind } from "@ir/index";
import { transpilerContext } from "@/context";

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
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|" + name;
    let type = parseType(prop.getTypeNode());
    transpilerContext.currentFQN = prevFQN;
    let isReadonly = prop.isReadonly();
    let isOptional = prop.hasQuestionToken();
    let isStatic = prop.isStatic();

    properties.push({
      name,
      type,
      isReadonly,
      isOptional,
      isStatic,
    });
  }

  // Methods
  let methods: IRMethod[] = [];
  for (let method of classDecl.getMethods()) {
    let name = method.getName();
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|" + name;
    let parameters: IRParameter[] = [];
    let returnType = parseType(method.getReturnTypeNode());
    let returnTypeNode = method.getReturnTypeNode();
    let isOptional = method.hasQuestionToken();
    let isStatic = method.isStatic();

    for (let param of method.getParameters()) {
      // Do not parse `this` param
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

      let pName = param.getName();
      const paramPrevFQN = transpilerContext.currentFQN;
      transpilerContext.currentFQN = paramPrevFQN + "|" + pName;
      let type = parseType(param.getTypeNode());
      transpilerContext.currentFQN = paramPrevFQN;
      let isOptional = param.isOptional();
      let isRest = param.isRestParameter();
      parameters.push({
        name: pName,
        type: type,
        isOptional: isOptional,
        isRest: isRest,
      });
    }
    transpilerContext.currentFQN = prevFQN;
    methods.push({
      name,
      parameters,
      returnType,
      isOptional,
      isStatic,
    });
  }

  // Constructors
  let constructors: IRConstructor[] = [];
  for (let constructor of classDecl.getConstructors()) {
    let parameters: IRParameter[] = [];
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|constructor";
    let jsDoc =
      constructor
        .getJsDocs()
        .map((doc) => doc.getText())
        .join("\n") || undefined;

    for (let param of constructor.getParameters()) {
      // Do not parse `this` param
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;

      let pName = param.getName();
      const paramPrevFQN = transpilerContext.currentFQN;
      transpilerContext.currentFQN = paramPrevFQN + "|" + pName;
      let type = parseType(param.getTypeNode());
      transpilerContext.currentFQN = paramPrevFQN;
      let isOptional = param.isOptional();
      let isRest = param.isRestParameter();
      parameters.push({
        name: pName,
        type: type,
        isOptional: isOptional,
        isRest: isRest,
      });
    }
    transpilerContext.currentFQN = prevFQN;
    constructors.push({
      parameters,
      jsDoc,
    });
  }

  // Get Accessors
  let getAccessors: IRGetAccessor[] = [];
  for (let ga of classDecl.getGetAccessors()) {
    let name = ga.getName();
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|" + name;
    let type = parseType(ga.getReturnTypeNode());
    transpilerContext.currentFQN = prevFQN;
    let isStatic = ga.isStatic();

    getAccessors.push({
      name,
      type,
      isStatic,
    });
  }

  // Set Accessors
  let setAccessors: IRSetAccessor[] = [];
  for (let sa of classDecl.getSetAccessors()) {
    let name = sa.getName();
    const prevFQN = transpilerContext.currentFQN;
    transpilerContext.currentFQN = prevFQN + "|" + name;
    let param = sa.getParameters()[0];
    let isStatic = sa.isStatic();
    setAccessors.push({
      name: name,
      parameter: {
        name: param.getName(),
        type: parseType(param.getTypeNode()),
        isOptional: param.hasQuestionToken(),
        isRest: param.isRestParameter(),
      },
      isStatic,
    });
    transpilerContext.currentFQN = prevFQN;
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
