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
import { ParseContext } from "@parser/context";

export function handleTypeLiterals(
  node: ts.TypeLiteralNode,
  depth: number,
  context: ParseContext,
): IRType {
  // Properties
  let properties: IRProperties[] = [];
  for (let prop of node.getProperties()) {
    let name = prop.getName();
    const memberContext = context.child(name);
    let type = parseType(prop.getTypeNode(), depth + 1, memberContext);
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
  for (const method of node.getMethods()) {
    let name = method.getName();
    const methodContext = context.child(name);
    let parameters: IRParameter[] = [];
    let returnType = parseType(
      method.getReturnTypeNode(),
      depth + 1,
      methodContext,
    );
    let isOptional = method.hasQuestionToken();
    for (const [paramIndex, param] of method.getParameters().entries()) {
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;
      let pName = param.getName();
      const paramContext = methodContext.child(pName);
      parameters.push({
        name: pName,
        type: parseType(param.getTypeNode(), depth + 1, paramContext),
        isOptional: param.isOptional(),
        isRest: param.isRestParameter(),
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
  for (const [constructorIndex, constructor] of node
    .getConstructSignatures()
    .entries()) {
    let parameters: IRParameter[] = [];
    const constructorContext = context.child("constructor");
    let returnType = parseType(
      constructor.getReturnTypeNode(),
      depth + 1,
      constructorContext,
    );
    for (const [paramIndex, param] of constructor.getParameters().entries()) {
      if (param.getNameNode().getKind() === ts.SyntaxKind.ThisKeyword) continue;
      let pName = param.getName();
      const paramContext = constructorContext.child(pName);
      parameters.push({
        name: pName,
        type: parseType(param.getTypeNode(), depth + 1, paramContext),
        isOptional: param.isOptional(),
        isRest: param.isRestParameter(),
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
  for (const [accessorIndex, ga] of node.getGetAccessors().entries()) {
    const accessorContext = context.child(ga.getName());
    getAccessors.push({
      name: ga.getName(),
      type: parseType(ga.getReturnTypeNode(), depth + 1, accessorContext),
      isStatic: false,
    });
  }

  // Set Accessors
  let setAccessors: IRSetAccessor[] = [];
  for (const [accessorIndex, sa] of node.getSetAccessors().entries()) {
    const accessorContext = context.child(sa.getName());
    let param = sa.getParameters()[0];
    setAccessors.push({
      name: sa.getName(),
      parameter: {
        name: param.getName(),
        type: parseType(param.getTypeNode(), depth + 1, accessorContext),
        isOptional: param.hasQuestionToken(),
        isRest: param.isRestParameter(),
      },
      isStatic: false,
    });
  }

  // Index Signatures
  let indexSignatures: IRIndexSignatures[] = [];
  for (const [index, indexSig] of node.getIndexSignatures().entries()) {
    const indexContext = context.child("indexSig");
    indexSignatures.push({
      keyType: parseType(
        indexSig.getKeyTypeNode(),
        depth + 1,
        indexContext,
      ),
      valueType: parseType(
        indexSig.getReturnTypeNode(),
        depth + 1,
        indexContext,
      ),
      isReadonly: indexSig.isReadonly(),
    });
  }

  // `{}` — the empty type literal. It means "any non-null value", so `dynamic`
  // says everything there is to say and there is no structure worth hoisting.
  //
  // This used to synthesise a symbol whose type referred to itself, emitting
  // `typedef anon_dynamic = anon_dynamic;` — a cyclic typedef Dart rejects. It
  // also registered under the bare key `"anon_dynamic"` rather than an FQN, so
  // the `has()` guard was checking a key shaped unlike every other one in the
  // table and the entry was unreachable by normal lookup (`T-16`).
  if (node.getMembers().length == 0) {
    return { kind: TypeKind.Any, name: TypeKind.Any, isNullable: false };
  }

  const fqn = context.scopeFQN;

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
  context.registerHoisted(fullAnonFqn, anonInterface);

  // 5. Return a TypeRef pointing at the newly hoisted anonymous interface
  return {
    kind: TypeKind.TypeReference,
    name: anonName, // The Statement Parser will use this string for the Dart output
    isNullable: false,
    genericArgs: [],
    reference: {
      writtenName: anonName,
      lookup: { kind: "checker", candidates: [fullAnonFqn] },
    },
  };
}
