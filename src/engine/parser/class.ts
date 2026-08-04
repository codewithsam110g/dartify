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
import { declarationParseContext, ParseContext } from "./context";

export function parseClass(
  classDecl: ts.ClassDeclaration,
  context: ParseContext = declarationParseContext(
    classDecl,
    classDecl.getName() || "Error_Class",
  ),
): IRClass {
  let name = classDecl.getName() || "";
  const extendsNode = classDecl.getExtends();
  const extenders = extendsNode
    ? parseType(extendsNode, 0, context)
    : undefined;
  const implementers = classDecl.getImplements().map((heritage, index) =>
    parseType(heritage, 0, context),
  );
  let isAbstract = classDecl.isAbstract();
  let typeParams = classDecl.getTypeParameters().map((tp) => tp.getName());

  // Properties
  let properties: IRProperties[] = [];
  for (const [propertyIndex, prop] of classDecl.getProperties().entries()) {
    let name = prop.getName();
    const propertyContext = context.child(name);
    let type = parseType(prop.getTypeNode(), 0, propertyContext);
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
  for (const [methodIndex, method] of classDecl.getMethods().entries()) {
    let name = method.getName();
    const methodContext = context.child(name);
    let parameters: IRParameter[] = [];
    let returnType = parseType(
      method.getReturnTypeNode(),
      0,
      methodContext,
    );
    let isOptional = method.hasQuestionToken();
    let isStatic = method.isStatic();

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
      isStatic,
    });
  }

  // Constructors
  let constructors: IRConstructor[] = [];
  for (const [constructorIndex, constructor] of classDecl
    .getConstructors()
    .entries()) {
    let parameters: IRParameter[] = [];
    const constructorContext = context.child("constructor");
    let jsDoc =
      constructor
        .getJsDocs()
        .map((doc) => doc.getText())
        .join("\n") || undefined;

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
      parameters,
      jsDoc,
    });
  }

  // Get Accessors
  let getAccessors: IRGetAccessor[] = [];
  for (const [accessorIndex, ga] of classDecl.getGetAccessors().entries()) {
    let name = ga.getName();
    const accessorContext = context.child(name);
    let type = parseType(ga.getReturnTypeNode(), 0, accessorContext);
    let isStatic = ga.isStatic();

    getAccessors.push({
      name,
      type,
      isStatic,
    });
  }

  // Set Accessors
  let setAccessors: IRSetAccessor[] = [];
  for (const [accessorIndex, sa] of classDecl.getSetAccessors().entries()) {
    let name = sa.getName();
    const accessorContext = context.child(name);
    let param = sa.getParameters()[0];
    let isStatic = sa.isStatic();
    setAccessors.push({
      name: name,
      parameter: {
        name: param.getName(),
        type: parseType(param.getTypeNode(), 0, accessorContext),
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
