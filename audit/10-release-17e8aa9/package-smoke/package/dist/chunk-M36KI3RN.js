// src/symbol/fqn.ts
import * as morph from "ts-morph";
var FQN_SEPARATOR = "::";
var SCOPE_SEPARATOR = "|";
function createFQN(filePath, scopes, name) {
  const logicalName = [...scopes, name].filter(Boolean).join(SCOPE_SEPARATOR);
  return `${filePath}${FQN_SEPARATOR}${logicalName}`;
}
function createFQNPrefix(filePath, scopes) {
  const logicalPrefix = scopes.length > 0 ? `${scopes.join(SCOPE_SEPARATOR)}|` : "";
  return `${filePath}${FQN_SEPARATOR}${logicalPrefix}`;
}
function sourceFileOfFQN(fqn) {
  const separator = fqn.indexOf(FQN_SEPARATOR);
  return separator === -1 ? fqn : fqn.substring(0, separator);
}
function logicalNameOfFQN(fqn) {
  const separator = fqn.indexOf(FQN_SEPARATOR);
  return separator === -1 ? "" : fqn.substring(separator + FQN_SEPARATOR.length);
}
function terminalNameOfFQN(fqn) {
  const logical = logicalNameOfFQN(fqn);
  const parts = logical.split(SCOPE_SEPARATOR);
  return parts[parts.length - 1] ?? "";
}
function declarationName(declaration, symbolName) {
  const candidate = declaration;
  const ownName = candidate.getName?.();
  if (ownName && ownName !== "default") return ownName;
  if (symbolName && symbolName !== "default") return symbolName;
  return ownName;
}
function declarationFQN(declaration, symbolName) {
  const name = declarationName(declaration, symbolName);
  if (!name) return null;
  const scopes = [];
  let parent = declaration.getParent();
  while (parent) {
    if (morph.Node.isModuleDeclaration(parent)) {
      if (parent.getDeclarationKind() !== "global") {
        scopes.unshift(parent.getName());
      }
    }
    parent = parent.getParent();
  }
  return createFQN(declaration.getSourceFile().getFilePath(), scopes, name);
}

// src/engine/phase/symbolGeneration.ts
import * as ts20 from "ts-morph";

// src/symbol/index.ts
function isGloballyVisible(facet) {
  if (facet.origin.scopes.some((scope) => scope.kind === "global")) return true;
  if (facet.origin.scopes.some((scope) => scope.kind === "externalModule")) {
    return false;
  }
  return facet.origin.fileIsModule !== true;
}
function namespaceOfSymbolType(type) {
  switch (type) {
    case 1 /* CLASS */:
    case 5 /* ENUM */:
      return "both";
    case 2 /* INTERFACE */:
    case 4 /* TYPE_ALIAS */:
      return "type";
    case 0 /* FUNCTION */:
    case 3 /* VARIABLE */:
      return "value";
  }
}

// src/engine/parser/type/type.ts
import * as ts12 from "ts-morph";

// src/ir/type.ts
var TypeKind = /* @__PURE__ */ ((TypeKind2) => {
  TypeKind2["String"] = "string";
  TypeKind2["Number"] = "number";
  TypeKind2["BigInt"] = "bigInt";
  TypeKind2["Boolean"] = "boolean";
  TypeKind2["Undefined"] = "undefined";
  TypeKind2["Null"] = "null";
  TypeKind2["Void"] = "void";
  TypeKind2["Any"] = "any";
  TypeKind2["Unknown"] = "unknown";
  TypeKind2["Never"] = "never";
  TypeKind2["Array"] = "array";
  TypeKind2["Tuple"] = "tuple";
  TypeKind2["Object"] = "object";
  TypeKind2["Function"] = "function";
  TypeKind2["Union"] = "union";
  TypeKind2["Intersection"] = "intersection";
  TypeKind2["StringLiteral"] = "stringLiteral";
  TypeKind2["NumberLiteral"] = "numberLiteral";
  TypeKind2["BooleanLiteral"] = "booleanLiteral";
  TypeKind2["TypeLiteral"] = "typeLiteral";
  TypeKind2["TypeReference"] = "typeReference";
  TypeKind2["Unsupported"] = "unsupported";
  return TypeKind2;
})(TypeKind || {});

// src/engine/parser/type/literals.ts
import * as ts from "ts-morph";
function handleLiteralType(node, depth) {
  const literal = node.getLiteral();
  const kind = literal.getKind();
  if (literal.getKind() === ts.SyntaxKind.PrefixUnaryExpression) {
    const prefixUnary = literal;
    const operand = prefixUnary.getOperand();
    const operatorToken = prefixUnary.getOperatorToken();
    if (operand.getKind() === ts.SyntaxKind.NumericLiteral) {
      const num = Number(operand.getText());
      return {
        kind: "numberLiteral" /* NumberLiteral */,
        name: "numberLiteral" /* NumberLiteral */,
        literalValue: operatorToken === ts.SyntaxKind.MinusToken ? -num : num,
        isNullable: false
      };
    }
    if (operand.getKind() === ts.SyntaxKind.BigIntLiteral) {
      const bigintText = operand.getText().replace(/n$/, "");
      const val = BigInt(bigintText);
      return {
        kind: "bigInt" /* BigInt */,
        name: "bigInt" /* BigInt */,
        literalValue: operatorToken === ts.SyntaxKind.MinusToken ? -val : val,
        isNullable: false
      };
    }
  }
  switch (kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return {
        kind: "stringLiteral" /* StringLiteral */,
        name: "stringLiteral" /* StringLiteral */,
        literalValue: literal.getText().slice(1, -1),
        // Remove quotes
        isNullable: false
      };
    case ts.SyntaxKind.NumericLiteral:
      return {
        kind: "numberLiteral" /* NumberLiteral */,
        name: "numberLiteral" /* NumberLiteral */,
        literalValue: Number(literal.getText()),
        isNullable: false
      };
    case ts.SyntaxKind.TrueKeyword:
      return {
        kind: "booleanLiteral" /* BooleanLiteral */,
        name: "booleanLiteral" /* BooleanLiteral */,
        literalValue: true,
        isNullable: false
      };
    case ts.SyntaxKind.FalseKeyword:
      return {
        kind: "booleanLiteral" /* BooleanLiteral */,
        name: "booleanLiteral" /* BooleanLiteral */,
        literalValue: false,
        isNullable: false
      };
    // A bigint literal is `TypeKind.BigInt`, not a `NumberLiteral` carrying the
    // string "BigInt" in `name`. The old shape leaned on an unread Dart name to
    // hold the distinction, so the emitter saw `NumberLiteral` and emitted
    // `num` for `10n` while emitting `BigInt` for a plain `bigint` (`T-06`).
    case ts.SyntaxKind.BigIntLiteral:
      return {
        kind: "bigInt" /* BigInt */,
        name: "bigInt" /* BigInt */,
        literalValue: BigInt(
          literal.getText().replace(/n$/, "")
        ),
        isNullable: false
      };
    // Bare `null` in type position. TypeScript parses this as a LiteralType
    // wrapping a NullKeyword, so the NullKeyword case in `parseType` is
    // unreachable and this is the only place it can be caught (`T-07`).
    // `js_facade_gen` §1.10 gives `Null`; it was giving `dynamic`.
    case ts.SyntaxKind.NullKeyword:
      return {
        kind: "null" /* Null */,
        name: "null" /* Null */,
        isNullable: true
      };
    default:
      return {
        kind: "any" /* Any */,
        name: "any" /* Any */,
        isNullable: false
      };
  }
}

// src/engine/parser/type/keywords.ts
import * as ts2 from "ts-morph";
function isNullOrUndefined(node) {
  if (node.getKind() === ts2.SyntaxKind.UndefinedKeyword) return true;
  if (node.getKind() === ts2.SyntaxKind.LiteralType) {
    return node.getLiteral().getKind() === ts2.SyntaxKind.NullKeyword;
  }
  return false;
}
function isNever(node) {
  return node.getKind() === ts2.SyntaxKind.NeverKeyword;
}
function isVoid(node) {
  return node.getKind() === ts2.SyntaxKind.VoidKeyword;
}

// src/engine/parser/type/unions.ts
function handleUnionType(node, depth, context) {
  const unionNodes = node.getTypeNodes();
  const isNullable = unionNodes.some(isNullOrUndefined);
  const unionIRs = unionNodes.flatMap(
    (unionNode, index) => isNullOrUndefined(unionNode) ? [] : [
      parseType(
        unionNode,
        depth + 1,
        context.child(`union_${index}`)
      )
    ]
  );
  if (unionIRs.length === 0) {
    return { kind: "any" /* Any */, name: "any" /* Any */, isNullable: true };
  }
  if (unionIRs.length === 1) {
    return {
      ...unionIRs[0],
      isNullable: unionIRs[0].isNullable || isNullable
    };
  }
  return {
    kind: "union" /* Union */,
    name: "union" /* Union */,
    isNullable,
    unionTypes: unionIRs
  };
}

// src/engine/parser/type/array.ts
function handleDirectArrayType(node, depth, context) {
  const elementType = node.getElementTypeNode();
  const arg = parseType(
    elementType,
    depth + 1,
    context.child("array_element")
  );
  return {
    kind: "array" /* Array */,
    name: "array" /* Array */,
    isNullable: false,
    elementType: arg
  };
}

// src/engine/parser/type/typeRefernce.ts
import * as ts3 from "ts-morph";

// src/resolution/stdlib.ts
function hostFamilyOf(filePath) {
  if (filePath.includes("@types/node/")) return "node";
  if (filePath.includes("undici-types/")) return "undici";
  if (/typescript\/lib\/lib\..*\.d\.ts$/.test(filePath)) return "typescript";
  return void 0;
}
function isStdlibFile(filePath) {
  if (filePath.includes("@types/node/")) return true;
  if (filePath.includes("undici-types/")) return true;
  return /typescript\/lib\/lib\..*\.d\.ts$/.test(filePath);
}

// src/engine/parser/type/typeRefernce.ts
function referenceNameNode(node) {
  return ts3.Node.isTypeReference(node) ? node.getTypeName() : node.getExpression();
}
function syntaxReference(node, error) {
  const writtenName = referenceNameNode(node).getText();
  const checkerError = error === void 0 ? void 0 : error instanceof Error ? error.message : String(error);
  return {
    writtenName,
    lookup: {
      kind: "syntax",
      pseudoFQN: `${node.getSourceFile().getFilePath()}::${writtenName}`,
      ...checkerError ? { checkerError } : {}
    }
  };
}
function isExternalModuleAugmentation(declaration) {
  if (!ts3.ts.isExternalModule(declaration.getSourceFile().compilerNode)) {
    return false;
  }
  let parent = declaration.getParent();
  while (parent) {
    if (ts3.Node.isModuleDeclaration(parent) && ts3.Node.isStringLiteral(parent.getNameNode())) {
      return true;
    }
    parent = parent.getParent();
  }
  return false;
}
function isLexicalTypeParameter(node, writtenName) {
  if (writtenName.includes(".")) return false;
  for (const ancestor of node.getAncestors()) {
    const getTypeParameters = ancestor.getTypeParameters;
    if (getTypeParameters?.call(ancestor).some(
      (parameter) => parameter.getName() === writtenName
    )) {
      return true;
    }
  }
  return false;
}
function hostIdentityOf(symbol, declarations) {
  const families = new Set(
    declarations.map(
      (declaration) => hostFamilyOf(declaration.getSourceFile().getFilePath())
    )
  );
  if (families.size !== 1) return void 0;
  const family = [...families][0];
  if (!family) return void 0;
  const libraries = [
    ...new Set(
      declarations.map((declaration) => declaration.getSourceFile().getBaseName())
    )
  ].sort();
  return {
    family,
    libraries,
    qualifiedName: symbol.getFullyQualifiedName().replace(/^"[^"]*"\./, "")
  };
}
function collectReference(node) {
  const reference2 = collectReferenceTarget(node);
  return reference2;
}
function collectReferenceTarget(node) {
  try {
    const nameNode = referenceNameNode(node);
    const writtenName = nameNode.getText();
    let symbol = nameNode.getSymbol();
    if (symbol?.getDeclarations().some(ts3.Node.isTypeParameterDeclaration) || isLexicalTypeParameter(node, writtenName) || !symbol && node.getType().isTypeParameter()) {
      return {};
    }
    if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol();
    if (!symbol) {
      const type = node.getType();
      symbol = type.getAliasSymbol() ?? type.getSymbol();
      if (symbol?.isAlias()) symbol = symbol.getAliasedSymbol();
    }
    if (!symbol) return { reference: syntaxReference(node) };
    const declarations = symbol.getDeclarations();
    if (declarations.length > 0 && declarations.every(
      (declaration) => isStdlibFile(declaration.getSourceFile().getFilePath())
    )) {
      const host2 = hostIdentityOf(symbol, declarations);
      return host2 ? { host: host2 } : {};
    }
    const nonStdlibDeclarations = declarations.filter(
      (declaration) => !isStdlibFile(declaration.getSourceFile().getFilePath())
    );
    const primaryDeclarations = nonStdlibDeclarations.filter(
      (declaration) => !isExternalModuleAugmentation(declaration)
    );
    const targetDeclarations = primaryDeclarations.length > 0 ? primaryDeclarations : nonStdlibDeclarations;
    const candidates = [
      ...new Set(
        targetDeclarations.map((declaration) => declarationFQN(declaration, symbol.getName())).filter((fqn) => fqn !== null)
      )
    ].sort();
    return {
      reference: candidates.length > 0 ? { writtenName, lookup: { kind: "checker", candidates } } : syntaxReference(node)
    };
  } catch (error) {
    return { reference: syntaxReference(node, error) };
  }
}
function handleTypeReferences(node, depth, context) {
  const name = referenceNameNode(node).getText();
  const { reference: reference2, host: host2 } = collectReference(node);
  const typeArgs = node.getTypeArguments();
  let genericArgs = [];
  for (const [index, typeArg] of typeArgs.entries()) {
    const res = parseType(
      typeArg,
      depth + 1,
      context.child(`arg_${index}`)
    );
    genericArgs.push(res);
  }
  return {
    kind: "typeReference" /* TypeReference */,
    name,
    isNullable: false,
    genericArgs,
    ...reference2 ? { reference: reference2 } : {},
    ...host2 ? { host: host2 } : {}
  };
}

// src/engine/parser/signature.ts
import * as ts7 from "ts-morph";

// src/engine/parser/metadata.ts
import * as ts5 from "ts-morph";
function sourceLocationOf(node) {
  const sourceFile = node.getSourceFile();
  const position = ts5.ts.getLineAndCharacterOfPosition(
    sourceFile.compilerNode,
    node.getStart()
  );
  return {
    file: sourceFile.getFilePath(),
    line: position.line + 1,
    column: position.character + 1
  };
}
function jsDocOf(node) {
  const docs2 = node.getJsDocs?.() ?? [];
  const text = docs2.map((doc) => doc.getText()).join("\n");
  return text || leadingBlockComment(node);
}
function leadingBlockComment(node) {
  const sourceFile = node.getSourceFile().compilerNode;
  const ranges = ts5.ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart()) ?? [];
  const last = ranges[ranges.length - 1];
  if (!last || last.kind !== ts5.ts.SyntaxKind.MultiLineCommentTrivia) return void 0;
  const raw = sourceFile.text.slice(last.pos, last.end);
  if (raw.startsWith("/**")) return void 0;
  const endLine = ts5.ts.getLineAndCharacterOfPosition(sourceFile, last.end).line;
  const nodeLine = ts5.ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line;
  if (nodeLine - endLine > 1) return void 0;
  return `/**${raw.slice(2)}`;
}
function nodeMetadata(node) {
  const jsDoc = jsDocOf(node);
  return {
    loc: sourceLocationOf(node),
    ...jsDoc ? { jsDoc } : {}
  };
}
function hasModifier(node, kind) {
  return node.hasModifier?.(kind) ?? false;
}
function visibilityOf(node) {
  if (hasModifier(node, ts5.SyntaxKind.PrivateKeyword)) return "private";
  if (hasModifier(node, ts5.SyntaxKind.ProtectedKeyword)) return "protected";
  if (hasModifier(node, ts5.SyntaxKind.PublicKeyword)) return "public";
  return void 0;
}
function declarationModifiersOf(node) {
  const isDefault = hasModifier(node, ts5.SyntaxKind.DefaultKeyword);
  const isExported = hasModifier(node, ts5.SyntaxKind.ExportKeyword) || isDefault;
  const modifierFlags = ts5.ts.getCombinedModifierFlags(
    node.compilerNode
  );
  const name = node.getName?.();
  const anonymousDefault = isDefault && (ts5.Node.isClassDeclaration(node) || ts5.Node.isFunctionDeclaration(node)) && !name;
  return {
    exportKind: isDefault ? "default" : isExported ? "named" : "none",
    ...anonymousDefault ? { isAnonymousDefault: true } : {},
    isDeclare: hasModifier(node, ts5.SyntaxKind.DeclareKeyword),
    isAmbient: node.getSourceFile().isDeclarationFile() || Boolean(modifierFlags & ts5.ts.ModifierFlags.Ambient)
  };
}

// src/engine/parser/signature.ts
function parameterJsDocOf(node, parameterName2) {
  const docs2 = node.getJsDocs?.() ?? [];
  const tags = docs2.flatMap((doc) => doc.getTags()).filter(ts7.Node.isJSDocParameterTag).filter((tag) => tag.getName() === parameterName2).map((tag) => tag.getText());
  return tags.length > 0 ? tags.join("\n") : void 0;
}
function parseTypeParameters(node, context, depth = 0) {
  return node.getTypeParameters().map((parameter, index) => {
    const parameterContext = context.child(
      `typeParam_${index}_${parameter.getName()}`
    );
    const constraintNode = parameter.getConstraint();
    const defaultNode = parameter.getDefault();
    return {
      ...nodeMetadata(parameter),
      name: parameter.getName(),
      ...constraintNode ? {
        constraint: parseType(
          constraintNode,
          depth + 1,
          parameterContext.child("constraint")
        )
      } : {},
      ...defaultNode ? {
        default: parseType(
          defaultNode,
          depth + 1,
          parameterContext.child("default")
        )
      } : {}
    };
  });
}
function parseParameter(parameter, context, depth = 0, jsDoc) {
  const nameNode = parameter.getNameNode();
  const bindingPattern = ts7.Node.isObjectBindingPattern(nameNode) ? { kind: "object", text: nameNode.getText() } : ts7.Node.isArrayBindingPattern(nameNode) ? { kind: "array", text: nameNode.getText() } : void 0;
  const initializer = parameter.getInitializer();
  return {
    ...nodeMetadata(parameter),
    ...jsDoc ? { jsDoc } : {},
    name: parameter.getName(),
    type: parseType(parameter.getTypeNode(), depth + 1, context),
    isOptional: parameter.isOptional(),
    isRest: parameter.isRestParameter(),
    ...bindingPattern ? { bindingPattern } : {},
    ...initializer ? { initializerText: initializer.getText() } : {}
  };
}
function parseParameters(node, context, depth = 0) {
  return node.getParameters().filter(
    (parameter) => parameter.getNameNode().getKind() !== ts7.SyntaxKind.ThisKeyword && parameter.getName() !== "this"
  ).map(
    (parameter, index) => parseParameter(
      parameter,
      context.child(`param_${index}_${parameter.getName()}`),
      depth,
      parameterJsDocOf(node, parameter.getName())
    )
  );
}
function parseCallSignature(node, context, depth = 0) {
  return {
    ...nodeMetadata(node),
    typeParams: parseTypeParameters(node, context, depth),
    parameters: parseParameters(node, context, depth),
    returnType: parseType(
      node.getReturnTypeNode(),
      depth + 1,
      context.child("return")
    )
  };
}
function parseConstructSignature(node, context, includeReturnType, depth = 0) {
  const visibility = visibilityOf(node);
  return {
    ...nodeMetadata(node),
    typeParams: parseTypeParameters(node, context, depth),
    parameters: parseParameters(node, context, depth),
    ...includeReturnType ? {
      returnType: parseType(
        node.getReturnTypeNode(),
        depth + 1,
        context.child("return")
      )
    } : {},
    ...visibility ? { visibility } : {}
  };
}

// src/engine/parser/type/function.ts
function handleFunctionTypes(node, depth, context) {
  const params = parseParameters(node, context, depth);
  const retType = node.getReturnTypeNode();
  const returnIR = parseType(retType, depth + 1, context.child("return"));
  return {
    kind: "function" /* Function */,
    name: "function" /* Function */,
    typeParams: parseTypeParameters(node, context, depth),
    parameters: params,
    isNullable: false,
    returnType: returnIR
  };
}

// src/engine/parser/type/typeLiterals.ts
function handleTypeLiterals(node, depth, context) {
  if (node.getMembers().length === 0) {
    return {
      ...nodeMetadata(node),
      kind: "any" /* Any */,
      name: "any" /* Any */,
      isNullable: false
    };
  }
  const properties = node.getProperties().map((property, index) => {
    const memberContext2 = context.child(
      `property_${index}_${property.getName()}`
    );
    return {
      ...nodeMetadata(property),
      name: property.getName(),
      type: parseType(property.getTypeNode(), depth + 1, memberContext2),
      isReadonly: property.isReadonly(),
      isOptional: property.hasQuestionToken(),
      isStatic: false,
      isAbstract: false
    };
  });
  const methods = node.getMethods().map((method, index) => {
    const memberContext2 = context.child(`method_${index}_${method.getName()}`);
    return {
      ...nodeMetadata(method),
      name: method.getName(),
      typeParams: parseTypeParameters(method, memberContext2, depth),
      parameters: parseParameters(method, memberContext2, depth),
      returnType: parseType(
        method.getReturnTypeNode(),
        depth + 1,
        memberContext2.child("return")
      ),
      isOptional: method.hasQuestionToken(),
      isStatic: false,
      isAbstract: false
    };
  });
  const callSignatures = node.getCallSignatures().map(
    (signature, index) => parseCallSignature(signature, context.child(`call_${index}`), depth)
  );
  const constructSignatures = node.getConstructSignatures().map(
    (signature, index) => parseConstructSignature(
      signature,
      context.child(`constructor_${index}`),
      true,
      depth
    )
  );
  const getAccessors = node.getGetAccessors().map((accessor, index) => {
    const memberContext2 = context.child(
      `getter_${index}_${accessor.getName()}`
    );
    return {
      ...nodeMetadata(accessor),
      name: accessor.getName(),
      type: parseType(
        accessor.getReturnTypeNode(),
        depth + 1,
        memberContext2
      ),
      isStatic: false,
      isAbstract: false
    };
  });
  const setAccessors = node.getSetAccessors().map((accessor, index) => {
    const memberContext2 = context.child(
      `setter_${index}_${accessor.getName()}`
    );
    return {
      ...nodeMetadata(accessor),
      name: accessor.getName(),
      parameter: parseParameter(
        accessor.getParameters()[0],
        memberContext2,
        depth
      ),
      isStatic: false,
      isAbstract: false
    };
  });
  const indexSignatures = node.getIndexSignatures().map((signature, index) => {
    const memberContext2 = context.child(`indexSig_${index}`);
    return {
      ...nodeMetadata(signature),
      keyType: parseType(
        signature.getKeyTypeNode(),
        depth + 1,
        memberContext2.child("key")
      ),
      valueType: parseType(
        signature.getReturnTypeNode(),
        depth + 1,
        memberContext2.child("value")
      ),
      isReadonly: signature.isReadonly()
    };
  });
  const [filePath, scopePath] = context.scopeFQN.split("::");
  const safeScopeName = (scopePath || "Global").replace(/["']/g, "").replace(/\|/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  const anonymousName = `Anon_${safeScopeName}`;
  const anonymousFQN = `${filePath}::${anonymousName}`;
  const anonymousInterface = {
    ...nodeMetadata(node),
    kind: "interface" /* Interface */,
    modifiers: {
      exportKind: "none",
      isDeclare: false,
      isAmbient: node.getSourceFile().isDeclarationFile()
    },
    name: anonymousName,
    typeParams: [],
    extends: [],
    properties,
    methods,
    callSignatures,
    constructSignatures,
    getAccessors,
    setAccessors,
    indexSignatures
  };
  context.registerHoisted(anonymousFQN, anonymousInterface);
  return {
    ...nodeMetadata(node),
    kind: "typeReference" /* TypeReference */,
    name: anonymousName,
    isNullable: false,
    genericArgs: [],
    reference: {
      writtenName: anonymousName,
      lookup: { kind: "checker", candidates: [anonymousFQN] }
    }
  };
}

// src/engine/parser/type/tuple.ts
import * as ts8 from "ts-morph";
function handleTupleType(node, depth, context) {
  const elements = node.getElements();
  const elementTypes = elements.map((e, index) => {
    const elementContext = context.child(`tuple_${index}`);
    if (ts8.Node.isRestTypeNode(e)) {
      return {
        ...parseType(e.getTypeNode(), depth + 1, elementContext),
        isRestParameter: true
      };
    }
    if (ts8.Node.isNamedTupleMember(e)) {
      return {
        ...parseType(e.getTypeNode(), depth + 1, elementContext),
        ...e.hasQuestionToken() ? { isOptional: true } : {},
        ...e.getDotDotDotToken() ? { isRestParameter: true } : {}
      };
    }
    if (ts8.Node.isOptionalTypeNode(e)) {
      return {
        ...parseType(e.getTypeNode(), depth + 1, elementContext),
        isOptional: true
      };
    }
    return parseType(e, depth + 1, elementContext);
  });
  return {
    kind: "tuple" /* Tuple */,
    name: "tuple" /* Tuple */,
    isNullable: false,
    tupleTypes: elementTypes
  };
}

// src/engine/parser/type/intersection.ts
function checkerSaysNever(node) {
  try {
    return node.getType().isNever();
  } catch {
    return false;
  }
}
function never() {
  return { kind: "never" /* Never */, name: "never" /* Never */, isNullable: false };
}
function handleIntersectionType(node, depth, context) {
  const rawTypes = node.getTypeNodes();
  if (checkerSaysNever(node)) return never();
  let hasEmptyDomainMember = false;
  let hasAny = false;
  const intersectionNodes = [];
  for (const [index, typeNode] of rawTypes.entries()) {
    if (isNullOrUndefined(typeNode) || isVoid(typeNode)) {
      hasEmptyDomainMember = true;
      continue;
    }
    if (isNever(typeNode)) return never();
    const parsed = parseType(
      typeNode,
      depth + 1,
      context.child(`intersection_${index}`)
    );
    if (parsed.kind === "any" /* Any */) hasAny = true;
    intersectionNodes.push(parsed);
  }
  if (hasAny) {
    return { kind: "any" /* Any */, name: "any" /* Any */, isNullable: false };
  }
  if (hasEmptyDomainMember) return never();
  if (intersectionNodes.length === 1) return intersectionNodes[0];
  return {
    kind: "intersection" /* Intersection */,
    name: "intersection" /* Intersection */,
    isNullable: false,
    intersectionTypes: intersectionNodes
  };
}

// src/engine/parser/type/restType.ts
function handleRestType(node, depth, context) {
  return {
    ...parseType(
      node.getTypeNode(),
      depth + 1,
      context.child("rest_inner")
    ),
    isRestParameter: true
  };
}

// src/engine/parser/type/sourceText.ts
function sourceTextOf(typeNode) {
  return typeNode.getText().replace(/\s+/g, " ").trim();
}

// src/engine/parser/type/unsupported.ts
import * as ts9 from "ts-morph";
function classifyUnsupported(node) {
  switch (node.getKind()) {
    case ts9.SyntaxKind.ThisType:
      return "thisType" /* ThisType */;
    case ts9.SyntaxKind.TypeOperator: {
      const operator = node.getOperator();
      if (operator === ts9.SyntaxKind.KeyOfKeyword) {
        return "keyOf" /* KeyOf */;
      }
      if (operator === ts9.SyntaxKind.ReadonlyKeyword) {
        return "readonlyOperator" /* ReadonlyOperator */;
      }
      if (operator === ts9.SyntaxKind.UniqueKeyword) {
        return "uniqueSymbol" /* UniqueSymbol */;
      }
      return "unclassified" /* Unclassified */;
    }
    case ts9.SyntaxKind.ConditionalType:
      return "conditional" /* Conditional */;
    case ts9.SyntaxKind.MappedType:
      return "mapped" /* Mapped */;
    case ts9.SyntaxKind.TemplateLiteralType:
      return "templateLiteral" /* TemplateLiteral */;
    case ts9.SyntaxKind.InferType:
      return "infer" /* Infer */;
    case ts9.SyntaxKind.IndexedAccessType:
      return "indexedAccess" /* IndexedAccess */;
    case ts9.SyntaxKind.TypePredicate:
      return "typePredicate" /* TypePredicate */;
    case ts9.SyntaxKind.TypeQuery:
      return "typeQuery" /* TypeQuery */;
    case ts9.SyntaxKind.ImportType:
      return "importType" /* ImportType */;
    case ts9.SyntaxKind.ConstructorType:
      return "constructorType" /* ConstructorType */;
    case ts9.SyntaxKind.OptionalType:
      return "optionalMember" /* OptionalMember */;
    default:
      return "unclassified" /* Unclassified */;
  }
}
function makeUnsupported(node, reason = classifyUnsupported(node)) {
  return {
    kind: "unsupported" /* Unsupported */,
    name: "unsupported" /* Unsupported */,
    isNullable: false,
    originalText: sourceTextOf(node),
    unsupportedReason: reason
  };
}

// src/engine/parser/type/thisType.ts
import * as ts10 from "ts-morph";
function handleThisType(node) {
  const owner = node.getFirstAncestor(
    (ancestor) => ts10.Node.isClassDeclaration(ancestor) || ts10.Node.isInterfaceDeclaration(ancestor)
  );
  const name = owner?.getName();
  if (!owner || !name) {
    return makeUnsupported(node, "thisType" /* ThisType */);
  }
  const ownerFQN = declarationFQN(owner, name);
  return {
    kind: "typeReference" /* TypeReference */,
    name,
    isNullable: false,
    genericArgs: [],
    ...ownerFQN ? {
      reference: {
        writtenName: name,
        lookup: { kind: "checker", candidates: [ownerFQN] }
      }
    } : {}
  };
}

// src/engine/parser/type/typeOperator.ts
import * as ts11 from "ts-morph";
function handleTypeOperator(node, depth, context) {
  if (node.getOperator() === ts11.SyntaxKind.ReadonlyKeyword) {
    return parseType(
      node.getTypeNode(),
      depth + 1,
      context.child("operator_inner")
    );
  }
  return makeUnsupported(node);
}
function handleTypePredicate() {
  return {
    kind: "boolean" /* Boolean */,
    name: "boolean" /* Boolean */,
    isNullable: false
  };
}

// src/engine/parser/type/typeQuery.ts
function handleTypeQuery(node) {
  let resolved2;
  try {
    resolved2 = node.getType();
  } catch {
    return makeUnsupported(node, "typeQuery" /* TypeQuery */);
  }
  if (resolved2.isNumberLiteral()) {
    return {
      kind: "numberLiteral" /* NumberLiteral */,
      name: "numberLiteral" /* NumberLiteral */,
      literalValue: resolved2.getLiteralValue(),
      isNullable: false
    };
  }
  if (resolved2.isStringLiteral()) {
    return {
      kind: "stringLiteral" /* StringLiteral */,
      name: "stringLiteral" /* StringLiteral */,
      literalValue: resolved2.getLiteralValue(),
      isNullable: false
    };
  }
  if (resolved2.isBooleanLiteral()) {
    return {
      kind: "booleanLiteral" /* BooleanLiteral */,
      name: "booleanLiteral" /* BooleanLiteral */,
      literalValue: resolved2.getText() === "true",
      isNullable: false
    };
  }
  if (resolved2.isNumber()) {
    return { kind: "number" /* Number */, name: "number" /* Number */, isNullable: false };
  }
  if (resolved2.isString()) {
    return { kind: "string" /* String */, name: "string" /* String */, isNullable: false };
  }
  if (resolved2.isBoolean()) {
    return { kind: "boolean" /* Boolean */, name: "boolean" /* Boolean */, isNullable: false };
  }
  return makeUnsupported(node, "typeQuery" /* TypeQuery */);
}

// src/engine/parser/context.ts
var ParseContext = class _ParseContext {
  constructor(scopeFQN, registerHoistedDeclaration) {
    this.scopeFQN = scopeFQN;
    this.registerHoistedDeclaration = registerHoistedDeclaration;
  }
  child(segment) {
    return new _ParseContext(
      `${this.scopeFQN}|${segment}`,
      this.registerHoistedDeclaration
    );
  }
  atFQN(fqn) {
    return new _ParseContext(fqn, this.registerHoistedDeclaration);
  }
  registerHoisted(fqn, declaration) {
    this.registerHoistedDeclaration?.(fqn, declaration);
  }
};
function declarationParseContext(node, name, registerHoistedDeclaration) {
  return new ParseContext(
    `${node.getSourceFile().getFilePath()}::${name}`,
    registerHoistedDeclaration
  );
}
function typeParseContext(node) {
  const filePath = node?.getSourceFile().getFilePath() ?? "/virtual.d.ts";
  return new ParseContext(`${filePath}::Global`);
}

// src/engine/parser/type/type.ts
var TypeParser = class _TypeParser {
  constructor() {
  }
  static getInstance() {
    if (!_TypeParser.instance) {
      _TypeParser.instance = new _TypeParser();
    }
    return _TypeParser.instance;
  }
  parseType(typeNode, depth = 0, context = typeParseContext(typeNode)) {
    if (typeNode == void 0) {
      return {
        kind: "any" /* Any */,
        name: "any" /* Any */,
        isNullable: false
      };
    }
    if (depth > 15) {
      return makeUnsupported(typeNode, "recursionLimit" /* RecursionLimit */);
    }
    let result;
    switch (typeNode.getKind()) {
      // Primitive Keywords: direct keywords like let abc: string;
      case ts12.SyntaxKind.StringKeyword:
        result = {
          kind: "string" /* String */,
          name: "string" /* String */,
          isNullable: false
        };
        break;
      case ts12.SyntaxKind.NumberKeyword:
        result = {
          kind: "number" /* Number */,
          name: "number" /* Number */,
          isNullable: false
        };
        break;
      case ts12.SyntaxKind.BigIntKeyword:
        result = {
          kind: "bigInt" /* BigInt */,
          name: "bigInt" /* BigInt */,
          isNullable: false
        };
        break;
      case ts12.SyntaxKind.BooleanKeyword:
        result = {
          kind: "boolean" /* Boolean */,
          name: "boolean" /* Boolean */,
          isNullable: false
        };
        break;
      case ts12.SyntaxKind.UndefinedKeyword:
      case ts12.SyntaxKind.NullKeyword:
        result = {
          kind: "undefined" /* Undefined */,
          name: "undefined" /* Undefined */,
          isNullable: true
        };
        break;
      case ts12.SyntaxKind.VoidKeyword:
        result = {
          kind: "void" /* Void */,
          name: "void" /* Void */,
          isNullable: false
        };
        break;
      case ts12.SyntaxKind.AnyKeyword:
      case ts12.SyntaxKind.UnknownKeyword:
        result = { kind: "any" /* Any */, name: "any" /* Any */, isNullable: false };
        break;
      case ts12.SyntaxKind.NeverKeyword:
        result = { kind: "never" /* Never */, name: "never" /* Never */, isNullable: false };
        break;
      case ts12.SyntaxKind.ObjectKeyword:
        result = { kind: "object" /* Object */, name: "object" /* Object */, isNullable: false };
        break;
      // Literals: "abc", 1, -2n, false
      case ts12.SyntaxKind.LiteralType:
        result = handleLiteralType(typeNode, depth);
        break;
      // Unions: str | null, str | num | null
      case ts12.SyntaxKind.UnionType:
        result = handleUnionType(typeNode, depth, context);
        break;
      // Tuples: [string, number], [number, number]
      case ts12.SyntaxKind.TupleType:
        result = handleTupleType(typeNode, depth, context);
        break;
      // Intersection: T1 & T2
      case ts12.SyntaxKind.IntersectionType:
        result = handleIntersectionType(
          typeNode,
          depth,
          context
        );
        break;
      // Direct Arrays: T[] => string[], num[], (str | num)[]
      case ts12.SyntaxKind.ArrayType:
        result = handleDirectArrayType(typeNode, depth, context);
        break;
      // ParenthesizedType: (str | num) is not union, it has union internally tho
      // Just unwrap it and process it again.
      //
      // `depth + 1`, not `depth`. Passing `depth` made this the one path the
      // recursion guard could not see: `(((…)))` nested to any depth never
      // tripped it, because unwrapping consumed a level without charging for
      // one (`T-17`). Verified — 40 nested parens used to sail straight past.
      case ts12.SyntaxKind.ParenthesizedType:
        result = this.parseType(
          typeNode.getTypeNode(),
          depth + 1,
          context.child("parenthesized_inner")
        );
        break;
      // TypeReferenceType: Array,Promise,Record,Set,Map and other User Defined ones
      case ts12.SyntaxKind.TypeReference:
        result = handleTypeReferences(typeNode, depth, context);
        break;
      case ts12.SyntaxKind.ExpressionWithTypeArguments:
        result = handleTypeReferences(
          typeNode,
          depth,
          context
        );
        break;
      // FunctionType: what do you want me to say, they are funcs god dammit
      case ts12.SyntaxKind.FunctionType:
        result = handleFunctionTypes(typeNode, depth, context);
        break;
      // TypeLiterals are raw inline interface / objects
      case ts12.SyntaxKind.TypeLiteral:
        result = handleTypeLiterals(typeNode, depth, context);
        break;
      // Rest Type: ...number[] with internal type being number[]
      case ts12.SyntaxKind.RestType:
        result = handleRestType(typeNode, depth, context);
        break;
      // `this` — resolves to the enclosing class/interface (P-07, 900 sites)
      case ts12.SyntaxKind.ThisType:
        result = handleThisType(typeNode);
        break;
      // readonly T[] → List<T>; keyof / unique symbol stay Unsupported
      case ts12.SyntaxKind.TypeOperator:
        result = handleTypeOperator(typeNode, depth, context);
        break;
      // x is T → bool (js_facade_gen §6.6)
      case ts12.SyntaxKind.TypePredicate:
        result = handleTypePredicate();
        break;
      // typeof x → whatever the checker says x is, when that is a primitive
      case ts12.SyntaxKind.TypeQuery:
        result = handleTypeQuery(typeNode);
        break;
      // Everything with no case above. Previously this collapsed to `Any`,
      // making a genuine `any` in the source indistinguishable from a
      // construct dartify simply could not handle (`T-01`).
      default:
        result = makeUnsupported(typeNode);
        break;
    }
    result.originalText = sourceTextOf(typeNode);
    result.loc = sourceLocationOf(typeNode);
    return result;
  }
};
var globalTypeParser = TypeParser.getInstance();
function parseType(typeNode, depth = 0, context = typeParseContext(typeNode)) {
  return globalTypeParser.parseType(typeNode, depth, context);
}

// src/engine/parser/typealias.ts
function parseTypeAlias(declaration, context = declarationParseContext(
  declaration,
  declaration.getName()
)) {
  return {
    ...nodeMetadata(declaration),
    kind: "typeAlias" /* TypeAlias */,
    modifiers: declarationModifiersOf(declaration),
    name: declaration.getName(),
    typeParams: parseTypeParameters(declaration, context),
    type: parseType(declaration.getTypeNode(), 0, context)
  };
}

// src/engine/parser/class.ts
import * as ts13 from "ts-morph";
function parseClass(declaration, context = declarationParseContext(
  declaration,
  declaration.getName() ?? "default"
)) {
  const extendsNode = declaration.getExtends();
  const properties = declaration.getProperties().map((node, index) => {
    const memberContext2 = context.child(
      `property_${index}_${node.getName()}`
    );
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      type: parseType(node.getTypeNode(), 0, memberContext2),
      isReadonly: node.isReadonly(),
      isOptional: node.hasQuestionToken(),
      isStatic: node.isStatic(),
      isAbstract: node.isAbstract(),
      visibility: visibilityOf(node)
    };
  });
  const methods = declaration.getMethods().map((node, index) => {
    const memberContext2 = context.child(`method_${index}_${node.getName()}`);
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      typeParams: parseTypeParameters(node, memberContext2),
      parameters: parseParameters(node, memberContext2),
      returnType: parseType(
        node.getReturnTypeNode(),
        0,
        memberContext2.child("return")
      ),
      isOptional: node.hasQuestionToken(),
      isStatic: node.isStatic(),
      isAbstract: node.isAbstract(),
      visibility: visibilityOf(node)
    };
  });
  const constructors = declaration.getConstructors().map(
    (node, index) => parseConstructSignature(
      node,
      context.child(`constructor_${index}`),
      false
    )
  );
  const getAccessors = declaration.getGetAccessors().map((node, index) => {
    const memberContext2 = context.child(`getter_${index}_${node.getName()}`);
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      type: parseType(
        node.getReturnTypeNode(),
        0,
        memberContext2.child("return")
      ),
      isStatic: node.isStatic(),
      isAbstract: node.isAbstract(),
      visibility: visibilityOf(node)
    };
  });
  const setAccessors = declaration.getSetAccessors().map((node, index) => {
    const memberContext2 = context.child(`setter_${index}_${node.getName()}`);
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      parameter: parseParameter(node.getParameters()[0], memberContext2),
      isStatic: node.isStatic(),
      isAbstract: node.isAbstract(),
      visibility: visibilityOf(node)
    };
  });
  const indexSignatures = declaration.getChildrenOfKind(ts13.SyntaxKind.IndexSignature).map((node, index) => {
    const memberContext2 = context.child(`indexSig_${index}`);
    return {
      ...nodeMetadata(node),
      keyType: parseType(
        node.getKeyTypeNode(),
        0,
        memberContext2.child("key")
      ),
      valueType: parseType(
        node.getReturnTypeNode(),
        0,
        memberContext2.child("value")
      ),
      isReadonly: node.isReadonly()
    };
  });
  return {
    ...nodeMetadata(declaration),
    kind: "class" /* Class */,
    modifiers: declarationModifiersOf(declaration),
    name: declaration.getName() ?? "default",
    extends: extendsNode ? parseType(extendsNode, 0, context.child("extends")) : void 0,
    implements: declaration.getImplements().map(
      (heritage, index) => parseType(heritage, 0, context.child(`implements_${index}`))
    ),
    isAbstract: declaration.isAbstract(),
    typeParams: parseTypeParameters(declaration, context),
    constructors,
    properties,
    methods,
    getAccessors,
    setAccessors,
    indexSignatures
  };
}

// src/engine/parser/function.ts
import * as ts14 from "ts-morph";
function parseFunction(funcDecl, context = declarationParseContext(
  funcDecl,
  funcDecl.getName() ?? "default"
)) {
  const name = funcDecl.getName() ?? "default";
  const declarations = funcDecl.getSymbol()?.getDeclarations().filter(ts14.Node.isFunctionDeclaration) ?? [funcDecl];
  const overloadIndex = Math.max(
    0,
    declarations.findIndex(
      (declaration) => declaration.compilerNode === funcDecl.compilerNode
    )
  );
  const signatureContext = context.child(`overload_${overloadIndex}`);
  return {
    ...nodeMetadata(funcDecl),
    kind: "function" /* Function */,
    modifiers: declarationModifiersOf(funcDecl),
    name,
    typeParams: parseTypeParameters(funcDecl, signatureContext),
    returnType: parseType(
      funcDecl.getReturnTypeNode(),
      0,
      signatureContext.child("return")
    ),
    parameters: parseParameters(funcDecl, signatureContext)
  };
}

// src/engine/parser/interface.ts
function parseInterface(declaration, context = declarationParseContext(
  declaration,
  declaration.getName()
)) {
  const properties = declaration.getProperties().map((node, index) => {
    const memberContext2 = context.child(
      `property_${index}_${node.getName()}`
    );
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      type: parseType(node.getTypeNode(), 0, memberContext2),
      isReadonly: node.isReadonly(),
      isOptional: node.hasQuestionToken(),
      isStatic: false,
      isAbstract: false
    };
  });
  const methods = declaration.getMethods().map((node, index) => {
    const memberContext2 = context.child(`method_${index}_${node.getName()}`);
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      typeParams: parseTypeParameters(node, memberContext2),
      parameters: parseParameters(node, memberContext2),
      returnType: parseType(
        node.getReturnTypeNode(),
        0,
        memberContext2.child("return")
      ),
      isOptional: node.hasQuestionToken(),
      isStatic: false,
      isAbstract: false
    };
  });
  const callSignatures = declaration.getCallSignatures().map(
    (node, index) => parseCallSignature(node, context.child(`call_${index}`))
  );
  const constructSignatures = declaration.getConstructSignatures().map(
    (node, index) => parseConstructSignature(
      node,
      context.child(`constructor_${index}`),
      true
    )
  );
  const getAccessors = declaration.getGetAccessors().map((node, index) => {
    const memberContext2 = context.child(`getter_${index}_${node.getName()}`);
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      type: parseType(node.getReturnTypeNode(), 0, memberContext2),
      isStatic: false,
      isAbstract: false
    };
  });
  const setAccessors = declaration.getSetAccessors().map((node, index) => {
    const memberContext2 = context.child(`setter_${index}_${node.getName()}`);
    return {
      ...nodeMetadata(node),
      name: node.getName(),
      parameter: parseParameter(node.getParameters()[0], memberContext2),
      isStatic: false,
      isAbstract: false
    };
  });
  const indexSignatures = declaration.getIndexSignatures().map((node, index) => {
    const memberContext2 = context.child(`indexSig_${index}`);
    return {
      ...nodeMetadata(node),
      keyType: parseType(
        node.getKeyTypeNode(),
        0,
        memberContext2.child("key")
      ),
      valueType: parseType(
        node.getReturnTypeNode(),
        0,
        memberContext2.child("value")
      ),
      isReadonly: node.isReadonly()
    };
  });
  return {
    ...nodeMetadata(declaration),
    kind: "interface" /* Interface */,
    modifiers: declarationModifiersOf(declaration),
    name: declaration.getName(),
    typeParams: parseTypeParameters(declaration, context),
    extends: declaration.getExtends().map(
      (heritage, index) => parseType(heritage, 0, context.child(`heritage_${index}`))
    ),
    properties,
    methods,
    callSignatures,
    constructSignatures,
    getAccessors,
    setAccessors,
    indexSignatures
  };
}

// src/engine/parser/variable.ts
import * as ts15 from "ts-morph";
function parseVariableStmt(fqnPrefix, statement, context = new ParseContext(fqnPrefix)) {
  const declarationList = statement.getDeclarationList();
  const declarationKind = declarationList.getDeclarationKind();
  const kind = declarationKind === ts15.VariableDeclarationKind.Const ? "const" : declarationKind === ts15.VariableDeclarationKind.Let ? "let" : "var";
  return declarationList.getDeclarations().map((declaration) => {
    const name = declaration.getName();
    const fqn = fqnPrefix + name;
    const statementJsDoc = nodeMetadata(statement).jsDoc;
    return {
      ...nodeMetadata(declaration),
      ...statementJsDoc ? { jsDoc: statementJsDoc } : {},
      kind: "variable" /* Variable */,
      modifiers: declarationModifiersOf(statement),
      name,
      type: parseType(declaration.getTypeNode(), 0, context.atFQN(fqn)),
      declarationKind: kind,
      isConst: kind === "const"
    };
  });
}

// src/engine/parser/enum.ts
import * as ts16 from "ts-morph";
function enumInitializer(member, implicitValue) {
  const initializer = member.getInitializer();
  const computedValue = member.getValue();
  if (!initializer) {
    return {
      kind: "implicit",
      ...(computedValue ?? implicitValue) !== void 0 ? { computedValue: computedValue ?? implicitValue } : {}
    };
  }
  const text = initializer.getText();
  if (ts16.Node.isStringLiteral(initializer) || ts16.Node.isNoSubstitutionTemplateLiteral(initializer)) {
    return {
      kind: "string",
      text,
      value: typeof computedValue === "string" ? computedValue : text.slice(1, -1)
    };
  }
  if (ts16.Node.isNumericLiteral(initializer) || ts16.Node.isPrefixUnaryExpression(initializer) && ts16.Node.isNumericLiteral(initializer.getOperand())) {
    return {
      kind: "number",
      text,
      value: typeof computedValue === "number" ? computedValue : Number(text)
    };
  }
  return {
    kind: "computed",
    text,
    ...computedValue !== void 0 ? { computedValue } : {}
  };
}
function parseEnum(declaration) {
  let nextImplicitValue = 0;
  const members = declaration.getMembers().map((member) => {
    const initializer = enumInitializer(member, nextImplicitValue);
    const value = initializer.kind === "number" || initializer.kind === "string" ? initializer.value : initializer.computedValue;
    nextImplicitValue = typeof value === "number" ? value + 1 : void 0;
    return {
      ...nodeMetadata(member),
      name: member.getName(),
      initializer
    };
  });
  return {
    ...nodeMetadata(declaration),
    kind: "enum" /* Enum */,
    modifiers: declarationModifiersOf(declaration),
    name: declaration.getName(),
    isConst: declaration.isConstEnum(),
    members
  };
}

// src/transpiler.ts
import * as ts18 from "ts-morph";
import { resolve as resolve2, dirname as dirname4, join as join2, parse as parsePath } from "path";

// src/symbol/resolve.ts
function resolved(fqn, strategy) {
  return { kind: "resolved", fqn, strategy };
}
function uniqueOrAmbiguous(lookupFQN, candidates, strategy) {
  const unique = [...new Set(candidates)].sort();
  if (unique.length === 0) return null;
  if (unique.length === 1) return resolved(unique[0], strategy);
  return { kind: "ambiguous", lookupFQN, candidates: unique };
}
function resolveReference(reference2, table, namespaceExports = /* @__PURE__ */ new Map()) {
  if (reference2.lookup.kind === "checker") {
    const present = reference2.lookup.candidates.filter(
      (candidate) => table.has(candidate)
    );
    const result = uniqueOrAmbiguous(
      reference2.writtenName,
      present,
      "checker"
    );
    if (result) return result;
    return {
      kind: "missing",
      lookupFQN: reference2.lookup.candidates.length === 1 ? reference2.lookup.candidates[0] : reference2.lookup.candidates.join(" | ")
    };
  }
  const pseudoFQN = reference2.lookup.pseudoFQN;
  if (table.has(pseudoFQN)) return resolved(pseudoFQN, "exact");
  const separator = pseudoFQN.indexOf(FQN_SEPARATOR);
  if (separator === -1) return { kind: "missing", lookupFQN: pseudoFQN };
  const filePath = pseudoFQN.substring(0, separator);
  const rawName = pseudoFQN.substring(separator + FQN_SEPARATOR.length);
  if (!rawName) return { kind: "missing", lookupFQN: pseudoFQN };
  let logicalName = rawName;
  let usedNamespaceAlias = false;
  const firstDot = logicalName.indexOf(".");
  if (firstDot !== -1) {
    const prefix = logicalName.substring(0, firstDot);
    if (namespaceExports.get(filePath)?.has(prefix)) {
      logicalName = logicalName.substring(firstDot + 1);
      usedNamespaceAlias = true;
    }
  }
  logicalName = logicalName.split(".").join("|");
  const normalizedFQN = `${filePath}${FQN_SEPARATOR}${logicalName}`;
  if (table.has(normalizedFQN)) {
    return resolved(
      normalizedFQN,
      usedNamespaceAlias ? "namespaceAlias" : "exact"
    );
  }
  const sameFile = [...table.keys()].filter(
    (candidate) => sourceFileOfFQN(candidate) === filePath && (logicalNameOfFQN(candidate) === logicalName || logicalNameOfFQN(candidate).endsWith(`|${logicalName}`))
  );
  const sameFileResult = uniqueOrAmbiguous(
    normalizedFQN,
    sameFile,
    usedNamespaceAlias ? "namespaceAlias" : "sameFile"
  );
  if (sameFileResult) return sameFileResult;
  if (logicalName.includes("|")) {
    return { kind: "missing", lookupFQN: normalizedFQN };
  }
  const logicalParts = logicalName.split("|");
  const terminalName = logicalParts[logicalParts.length - 1] ?? logicalName;
  const globalMatches = [...table.keys()].filter(
    (candidate) => terminalNameOfFQN(candidate) === terminalName && (table.get(candidate) ?? []).some(
      (symbol) => symbol.facets.some(isGloballyVisible)
    )
  );
  const globalResult = uniqueOrAmbiguous(
    normalizedFQN,
    globalMatches,
    "uniqueGlobal"
  );
  return globalResult ?? { kind: "missing", lookupFQN: normalizedFQN };
}

// src/engine/alias/name.ts
var KEYWORD_WORDS = {
  keyof: "KeyOf",
  typeof: "TypeOf",
  infer: "Infer",
  extends: "Extends",
  readonly: "Readonly",
  unique: "Unique",
  import: "Import",
  new: "New",
  in: "In",
  is: "Is"
};
var REASON_PREFIX = {
  ["indexedAccess" /* IndexedAccess */]: "Indexed",
  ["mapped" /* Mapped */]: "Mapped",
  ["templateLiteral" /* TemplateLiteral */]: "Template"
};
var MAX_LENGTH = 64;
var HASH_LENGTH = 6;
var SEGMENT = /[A-Za-z_][A-Za-z0-9_]*|[0-9]+/g;
function capitalise(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
function textHash(text, length = HASH_LENGTH) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, length);
}
function wordsOf(originalText, reason) {
  const words = (originalText.match(SEGMENT) ?? []).map(
    (segment) => KEYWORD_WORDS[segment] ?? capitalise(segment)
  );
  const prefix = reason ? REASON_PREFIX[reason] : void 0;
  if (prefix && words[0] !== prefix) words.unshift(prefix);
  return words;
}
function sanitise(name, reason) {
  const stripped = name.replace(/^_+/, "");
  if (stripped.length > 0 && !/^[0-9]/.test(stripped)) return stripped;
  return capitalise(reason ?? "unsupported") + stripped;
}
function deriveAliasName(originalText, reason) {
  const words = wordsOf(originalText, reason);
  if (words.length === 0) {
    return `${capitalise(reason ?? "unsupported")}_${textHash(originalText)}`;
  }
  const joined = words.join("");
  if (joined.length <= MAX_LENGTH) return sanitise(joined, reason);
  const budget = MAX_LENGTH - HASH_LENGTH - 1;
  let head = "";
  for (const word of words) {
    if (head.length + word.length > budget) break;
    head += word;
  }
  if (head.length === 0) head = joined.slice(0, budget);
  return sanitise(`${head}_${textHash(originalText)}`, reason);
}

// src/engine/alias/registry.ts
var AliasRegistry = class {
  /**
   * @param isTaken reports names already claimed outside this registry —
   *   normally the symbol table for the file being emitted.
   */
  constructor(isTaken = () => false) {
    this.isTaken = isTaken;
    this.byText = /* @__PURE__ */ new Map();
    this.allocated = true;
  }
  /**
   * Returns the alias for `originalText`, minting one on first sight.
   * Idempotent: calling it per use site is the intended usage, and is how
   * `useCount` gets filled in. The returned alias's `name` is final once every
   * text has been minted; reading it earlier allocates over the texts seen so
   * far and is recomputed after further mints.
   */
  mint(originalText, reason) {
    const existing = this.byText.get(originalText);
    if (existing) {
      existing.useCount++;
      return existing;
    }
    let name = "";
    const registry = this;
    const alias = {
      get name() {
        registry.allocate();
        return name;
      },
      set name(value) {
        name = value;
      },
      originalText,
      reason,
      useCount: 1
    };
    this.byText.set(originalText, alias);
    this.allocated = false;
    return alias;
  }
  /** The alias already minted for this text, if any. Does not mint. */
  lookup(originalText) {
    return this.byText.get(originalText);
  }
  /** Every alias minted, sorted by allocated name. */
  all() {
    this.allocate();
    return [...this.byText.values()].sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }
  get size() {
    return this.byText.size;
  }
  allocate() {
    if (this.allocated) return;
    this.allocated = true;
    const groups = /* @__PURE__ */ new Map();
    for (const alias of this.byText.values()) {
      const base = deriveAliasName(alias.originalText, alias.reason);
      let group = groups.get(base);
      if (!group) groups.set(base, group = []);
      group.push(alias);
    }
    const used = /* @__PURE__ */ new Set();
    for (const base of [...groups.keys()].sort()) {
      const group = groups.get(base).sort((a, b) => a.originalText.localeCompare(b.originalText));
      if (group.length === 1 && !this.isTaken(base) && !used.has(base)) {
        group[0].name = base;
        used.add(base);
        continue;
      }
      for (const alias of group) {
        let chosen;
        for (let length = 6; length <= 8 && !chosen; length++) {
          const candidate = `${base}_${textHash(alias.originalText, length)}`;
          if (!used.has(candidate) && !this.isTaken(candidate)) chosen = candidate;
        }
        for (let n = 2; !chosen; n++) {
          const candidate = `${base}_${textHash(alias.originalText, 8)}_${n}`;
          if (!used.has(candidate) && !this.isTaken(candidate)) chosen = candidate;
        }
        alias.name = chosen;
        used.add(chosen);
      }
    }
  }
};

// src/ir/visit.ts
var TYPE_KINDS = new Set(Object.values(TypeKind));
var LEAF_KEYS = /* @__PURE__ */ new Set([
  "loc",
  "jsDoc",
  "name",
  "dartName",
  "jsName",
  "originalText",
  "modifiers",
  "initializer",
  "initializerText",
  "bindingPattern",
  "host",
  "reference",
  "literalValue",
  "unsupportedReason",
  "aliasName"
]);
function forEachIRType(declaration, visit) {
  function walk(node) {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (let index = 0; index < node.length; index++) walk(node[index]);
      return;
    }
    const record = node;
    if (typeof record.isNullable === "boolean" && TYPE_KINDS.has(record.kind)) {
      visit(record);
    }
    for (const key in record) {
      if (LEAF_KEYS.has(key)) continue;
      const value = record[key];
      if (value !== null && typeof value === "object") walk(value);
    }
  }
  walk(declaration);
}

// src/engine/alias/register.ts
function sourceFileOf(fqn) {
  const separator = fqn.indexOf("::");
  return separator === -1 ? fqn : fqn.substring(0, separator);
}
function declaredNameOf(fqn) {
  const separator = fqn.indexOf("::");
  if (separator === -1) return fqn;
  const segments = fqn.substring(separator + 2).split("|");
  return segments[segments.length - 1] ?? "";
}
function registerAliasSymbols(table) {
  const symbolsByFile = /* @__PURE__ */ new Map();
  const namesByFile = /* @__PURE__ */ new Map();
  for (const [fqn, symbols] of table) {
    const file = sourceFileOf(fqn);
    let group = symbolsByFile.get(file);
    if (!group) symbolsByFile.set(file, group = []);
    group.push(...symbols);
    let names = namesByFile.get(file);
    if (!names) namesByFile.set(file, names = /* @__PURE__ */ new Set());
    const declared = declaredNameOf(fqn);
    if (declared) names.add(declared);
  }
  const byFile = /* @__PURE__ */ new Map();
  let total = 0;
  let useSites = 0;
  for (const [file, symbols] of symbolsByFile) {
    const declared = namesByFile.get(file) ?? /* @__PURE__ */ new Set();
    const registry = new AliasRegistry((name) => declared.has(name));
    const useSitesInFile = [];
    for (const symbol of symbols) {
      for (const facet of symbol.facets) {
        const authorNamed = facet.ir.kind === "typeAlias" /* TypeAlias */ ? facet.ir.type : void 0;
        forEachIRType(facet.ir, (type) => {
          if (type.kind !== "unsupported" /* Unsupported */) return;
          if (type === authorNamed) return;
          const alias = registry.mint(
            type.originalText ?? "",
            type.unsupportedReason
          );
          useSitesInFile.push([type, alias]);
          useSites++;
        });
      }
    }
    for (const [type, alias] of useSitesInFile) type.aliasName = alias.name;
    const minted = registry.all();
    if (minted.length === 0) continue;
    byFile.set(file, minted);
    total += minted.length;
    for (const alias of minted) {
      const declaration = {
        kind: "typeAlias" /* TypeAlias */,
        modifiers: {
          exportKind: "none",
          isDeclare: false,
          isAmbient: false
        },
        name: alias.name,
        typeParams: [],
        type: {
          kind: "unsupported" /* Unsupported */,
          name: "unsupported" /* Unsupported */,
          isNullable: false,
          originalText: alias.originalText,
          unsupportedReason: alias.reason
        }
      };
      const fqn = `${file}::${alias.name}`;
      const facet = {
        type: 4 /* TYPE_ALIAS */,
        namespace: namespaceOfSymbolType(4 /* TYPE_ALIAS */),
        ir: declaration,
        origin: {
          filePath: file,
          scopes: [],
          sourceOrder: Number.MAX_SAFE_INTEGER
        },
        emit: true,
        provenance: []
      };
      const symbol = {
        fqn,
        facets: [facet],
        // `dynamic` depends on nothing. Registering it with an empty dep list
        // keeps it `LinkedIndependent` rather than absent from the graph.
        deps: [],
        resolvedDeps: [],
        minted: true
      };
      const existing = table.get(fqn);
      if (existing) table.set(fqn, [...existing, symbol]);
      else table.set(fqn, [symbol]);
    }
  }
  return { byFile, total, useSites };
}

// src/symbol/dependencies.ts
function dependenciesOf(declaration) {
  const dependencies = [];
  forEachIRType(declaration, (type) => {
    if (type.reference) dependencies.push(type.reference);
  });
  return dependencies;
}
function dependenciesOfFacets(facets) {
  return facets.flatMap((facet) => dependenciesOf(facet.ir));
}

// src/engine/semantic/shape.ts
var EXCLUDED_KEYS = /* @__PURE__ */ new Set([
  "loc",
  "jsDoc",
  "dartName",
  "jsName",
  "resolvedFQN",
  "resolvedDartName",
  "aliasName"
]);
var UNORDERED_ARRAY_KEYS = /* @__PURE__ */ new Set([
  "callSignatures",
  "constructSignatures",
  "extends",
  "getAccessors",
  "implements",
  "indexSignatures",
  "intersectionTypes",
  "methods",
  "properties",
  "setAccessors",
  "unionTypes"
]);
function anonymousShapeKey(declaration) {
  return JSON.stringify(canonicalValue(declaration, void 0, true));
}
function semanticKey(value) {
  return JSON.stringify(canonicalValue(value));
}
function canonicalValue(value, parentKey, declarationRoot = false) {
  if (typeof value === "bigint") return { bigint: value.toString() };
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalValue(item, parentKey));
    if (!parentKey || !UNORDERED_ARRAY_KEYS.has(parentKey)) return items;
    return items.sort(
      (a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
  }
  const record = value;
  const isUnsupported = record.kind === "unsupported" /* Unsupported */;
  const result = {};
  for (const key of Object.keys(record).sort()) {
    if (EXCLUDED_KEYS.has(key)) continue;
    if (declarationRoot && (key === "name" || key === "modifiers")) continue;
    if (key === "originalText" && !isUnsupported) continue;
    const child = canonicalValue(record[key], key);
    result[key] = child;
  }
  return result;
}

// src/engine/semantic/merge.ts
function mergeDeclarationGroups(draft, report, redirects) {
  mergeSameFQNTypeDeclarations(draft, report);
  mergeConstructorCompanions(draft, report, redirects);
  mergeDefaultInterfaceValues(draft, report, redirects);
  diagnoseUnsupportedGroups(draft, report);
}
function mergeSameFQNTypeDeclarations(draft, report) {
  for (const [fqn, group] of draft) {
    const symbol = group[0];
    const interfaces = symbol.facets.filter(
      (facet) => facet.ir.kind === "interface" /* Interface */
    );
    const classes = symbol.facets.filter(
      (facet) => facet.ir.kind === "class" /* Class */
    );
    if (interfaces.length > 1) {
      const merged = mergeInterfaces(fqn, interfaces, report);
      if (merged) {
        symbol.facets = [
          ...symbol.facets.filter(
            (facet) => facet.ir.kind !== "interface" /* Interface */
          ),
          merged
        ].sort(bySourceOrder);
        report.declarationGroupsMerged++;
      }
    }
    const currentInterfaces = symbol.facets.filter(
      (facet) => facet.ir.kind === "interface" /* Interface */
    );
    const currentClasses = symbol.facets.filter(
      (facet) => facet.ir.kind === "class" /* Class */
    );
    if (currentClasses.length === 1 && currentInterfaces.length === 1) {
      const merged = mergeClassInterface(
        fqn,
        currentClasses[0],
        currentInterfaces[0],
        report
      );
      if (merged) {
        symbol.facets = [
          ...symbol.facets.filter(
            (facet) => facet.ir.kind !== "class" /* Class */ && facet.ir.kind !== "interface" /* Interface */
          ),
          merged
        ].sort(bySourceOrder);
        report.declarationGroupsMerged++;
      }
    } else if (classes.length > 1 || currentClasses.length > 1) {
      diagnoseConflict(
        report,
        fqn,
        "Multiple class declarations cannot be merged safely"
      );
    }
  }
}
function mergeInterfaces(fqn, facets, report) {
  const declarations = facets.map(
    (facet) => facet.ir
  );
  if (!compatibleTypeParameters(declarations.map((value) => value.typeParams))) {
    diagnoseConflict(report, fqn, "Interface type parameters are incompatible");
    return void 0;
  }
  const properties = mergeNamedMembers(
    declarations.flatMap((value) => value.properties)
  );
  const getters = mergeNamedMembers(
    declarations.flatMap((value) => value.getAccessors)
  );
  const setters = mergeNamedMembers(
    declarations.flatMap((value) => value.setAccessors)
  );
  if (!properties || !getters || !setters) {
    diagnoseConflict(
      report,
      fqn,
      "Interface declarations contain conflicting non-overload members"
    );
    return void 0;
  }
  const canonical = structuredClone(declarations[0]);
  canonical.jsDoc = combinedDocs(declarations);
  canonical.extends = uniqueSemantic(
    declarations.flatMap((value) => value.extends)
  );
  canonical.properties = properties;
  canonical.methods = uniqueSemantic(
    declarations.flatMap((value) => value.methods)
  );
  canonical.callSignatures = uniqueSemantic(
    declarations.flatMap((value) => value.callSignatures)
  );
  canonical.constructSignatures = uniqueSemantic(
    declarations.flatMap((value) => value.constructSignatures)
  );
  canonical.getAccessors = getters;
  canonical.setAccessors = setters;
  canonical.indexSignatures = uniqueSemantic(
    declarations.flatMap((value) => value.indexSignatures)
  );
  return combinedFacet(facets, 2 /* INTERFACE */, canonical, "type");
}
function mergeClassInterface(fqn, classFacet, interfaceFacet, report) {
  const classDeclaration = classFacet.ir;
  const interfaceDeclaration = interfaceFacet.ir;
  if (!compatibleTypeParameters([
    classDeclaration.typeParams,
    interfaceDeclaration.typeParams
  ])) {
    diagnoseConflict(report, fqn, "Class/interface type parameters are incompatible");
    return void 0;
  }
  if (interfaceDeclaration.callSignatures.length > 0 || interfaceDeclaration.constructSignatures.length > 0) {
    diagnoseConflict(
      report,
      fqn,
      "Callable or constructable interface facets cannot be folded into IRClass"
    );
    return void 0;
  }
  const properties = mergeNamedMembers([
    ...classDeclaration.properties,
    ...interfaceDeclaration.properties
  ]);
  const getters = mergeNamedMembers([
    ...classDeclaration.getAccessors,
    ...interfaceDeclaration.getAccessors
  ]);
  const setters = mergeNamedMembers([
    ...classDeclaration.setAccessors,
    ...interfaceDeclaration.setAccessors
  ]);
  if (!properties || !getters || !setters) {
    diagnoseConflict(
      report,
      fqn,
      "Class/interface declarations contain conflicting non-overload members"
    );
    return void 0;
  }
  const merged = structuredClone(classDeclaration);
  merged.jsDoc = combinedDocs([classDeclaration, interfaceDeclaration]);
  merged.implements = uniqueSemantic([
    ...merged.implements,
    ...interfaceDeclaration.extends
  ]);
  merged.properties = properties;
  merged.methods = uniqueSemantic([
    ...merged.methods,
    ...interfaceDeclaration.methods
  ]);
  merged.getAccessors = getters;
  merged.setAccessors = setters;
  merged.indexSignatures = uniqueSemantic([
    ...merged.indexSignatures,
    ...interfaceDeclaration.indexSignatures
  ]);
  return combinedFacet(
    [classFacet, interfaceFacet],
    1 /* CLASS */,
    merged,
    "both"
  );
}
function mergeConstructorCompanions(draft, report, redirects) {
  const variables = [...draft.entries()].flatMap(
    ([fqn, group]) => group[0].facets.filter((facet) => facet.ir.kind === "variable" /* Variable */).map((facet) => ({ fqn, facet }))
  );
  for (const { fqn: variableFQN, facet: variableFacet } of variables) {
    const shape = anonymousValueShape(variableFacet, draft);
    if (!shape) continue;
    const target = constructorTarget(shape.facet.ir);
    if (target.kind === "none") continue;
    if (target.kind === "ambiguous") {
      report.diagnostics.push({
        code: "AMBIGUOUS_CONSTRUCTOR_COMPANION",
        ownerFQN: variableFQN,
        action: "preservedUnmerged",
        message: `Constructor companion targets disagree: ${target.candidates.join(", ")}`
      });
      continue;
    }
    const targetGroup = draft.get(target.fqn);
    const targetFacet = targetGroup?.[0].facets.find(
      (facet) => facet.ir.kind === "interface" /* Interface */
    );
    if (!targetFacet) {
      diagnoseConflict(
        report,
        variableFQN,
        `Constructor target '${target.fqn}' is not an interface binding`
      );
      continue;
    }
    const targetIR = targetFacet.ir;
    const shapeIR = shape.facet.ir;
    const unsupported = unsupportedConstructorCompanion(targetIR, shapeIR);
    if (unsupported) {
      diagnoseConflict(report, variableFQN, unsupported);
      continue;
    }
    const synthesized = synthesizeClass(
      variableFacet,
      targetFacet,
      shape.facet
    );
    const variableGroup = draft.get(variableFQN)[0];
    const unrelatedVariableFacets = variableGroup.facets.filter(
      (facet) => facet !== variableFacet && facet !== targetFacet
    );
    variableGroup.facets = [...unrelatedVariableFacets, synthesized].sort(
      bySourceOrder
    );
    draft.delete(shape.fqn);
    redirects.set(shape.fqn, variableFQN);
    report.redirects.push({
      fromFQN: shape.fqn,
      toFQN: variableFQN,
      reason: "constructorCompanion"
    });
    if (target.fqn !== variableFQN) {
      draft.delete(target.fqn);
      redirects.set(target.fqn, variableFQN);
      report.redirects.push({
        fromFQN: target.fqn,
        toFQN: variableFQN,
        reason: "constructorCompanion"
      });
    }
    report.declarationGroupsMerged++;
  }
}
function mergeDefaultInterfaceValues(draft, report, redirects) {
  for (const [fqn, group] of [...draft]) {
    const symbol = group[0];
    const interfaceFacet = symbol.facets.find(
      (facet) => facet.ir.kind === "interface" /* Interface */
    );
    const variableFacet = symbol.facets.find(
      (facet) => facet.ir.kind === "variable" /* Variable */
    );
    if (!interfaceFacet || !variableFacet) continue;
    const shape = anonymousValueShape(variableFacet, draft);
    if (!shape) continue;
    const shapeIR = shape.facet.ir;
    const constructor = constructorTarget(shapeIR);
    if (constructor.kind !== "none") {
      diagnoseConflict(
        report,
        fqn,
        "Constructable value shapes cannot be folded into an interface"
      );
      continue;
    }
    if (shapeIR.callSignatures.length > 0) {
      diagnoseConflict(
        report,
        fqn,
        "Callable value shapes cannot be folded into an interface"
      );
      continue;
    }
    if (shapeIR.indexSignatures.length > 0) {
      diagnoseConflict(
        report,
        fqn,
        "Value-side index signatures cannot be represented as static interface members"
      );
      continue;
    }
    const base = interfaceFacet.ir;
    const merged = structuredClone(base);
    merged.jsDoc = combinedDocs([base, variableFacet.ir]);
    merged.properties = [
      ...merged.properties,
      ...shapeIR.properties.map(asStaticProperty)
    ];
    merged.methods = [
      ...merged.methods,
      ...shapeIR.methods.map(asStaticMethod)
    ];
    merged.getAccessors = [
      ...merged.getAccessors,
      ...shapeIR.getAccessors.map((value) => ({ ...value, isStatic: true }))
    ];
    merged.setAccessors = [
      ...merged.setAccessors,
      ...shapeIR.setAccessors.map((value) => ({ ...value, isStatic: true }))
    ];
    const combined = combinedFacet(
      [interfaceFacet, variableFacet, shape.facet],
      2 /* INTERFACE */,
      merged,
      "both"
    );
    symbol.facets = [
      ...symbol.facets.filter(
        (facet) => facet !== interfaceFacet && facet !== variableFacet
      ),
      combined
    ].sort(bySourceOrder);
    draft.delete(shape.fqn);
    redirects.set(shape.fqn, fqn);
    report.redirects.push({
      fromFQN: shape.fqn,
      toFQN: fqn,
      reason: "constructorCompanion"
    });
    report.declarationGroupsMerged++;
  }
}
function anonymousValueShape(variableFacet, draft) {
  const variable = variableFacet.ir;
  if (variable.type.kind !== "typeReference" /* TypeReference */ || variable.type.reference?.lookup.kind !== "checker" || variable.type.reference.lookup.candidates.length !== 1) {
    return void 0;
  }
  const fqn = variable.type.reference.lookup.candidates[0];
  const facet = draft.get(fqn)?.[0].facets.find(
    (candidate) => candidate.ir.kind === "interface" /* Interface */ && candidate.synthetic === "anonymousType"
  );
  return facet ? { fqn, facet } : void 0;
}
function unsupportedConstructorCompanion(target, shape) {
  if (target.callSignatures.length > 0) {
    return "Callable constructor targets cannot be folded into IRClass";
  }
  if (target.constructSignatures.length > 0) {
    return "Constructable constructor targets cannot be folded into IRClass";
  }
  if (shape.callSignatures.length > 0) {
    return "Callable constructor value shapes cannot be folded into IRClass";
  }
  if (shape.indexSignatures.length > 0) {
    return "Constructor value-side index signatures cannot be folded into IRClass";
  }
  return void 0;
}
function constructorTarget(shape) {
  const candidates = [];
  const prototype = shape.properties.find(
    (property) => property.name === "prototype"
  );
  if (prototype) candidates.push(...referenceCandidates(prototype.type));
  for (const signature of shape.constructSignatures) {
    if (signature.returnType) {
      candidates.push(...referenceCandidates(signature.returnType));
    }
  }
  const unique = [...new Set(candidates)].sort();
  if (shape.constructSignatures.length === 0 && !prototype) {
    return { kind: "none" };
  }
  if (unique.length === 1) return { kind: "resolved", fqn: unique[0] };
  return { kind: "ambiguous", candidates: unique };
}
function referenceCandidates(type) {
  return type.reference?.lookup.kind === "checker" ? type.reference.lookup.candidates : [];
}
function synthesizeClass(variableFacet, targetFacet, shapeFacet) {
  const variable = variableFacet.ir;
  const target = targetFacet.ir;
  const shape = shapeFacet.ir;
  const declaration = {
    kind: "class" /* Class */,
    name: variable.name,
    modifiers: variable.modifiers,
    loc: variable.loc,
    jsDoc: combinedDocs([target, variable]),
    extends: void 0,
    implements: structuredClone(target.extends),
    isAbstract: false,
    typeParams: structuredClone(target.typeParams),
    constructors: shape.constructSignatures.map(withoutReturnType),
    properties: [
      ...structuredClone(target.properties),
      ...shape.properties.filter((property) => property.name !== "prototype").map(asStaticProperty)
    ],
    methods: [
      ...structuredClone(target.methods),
      ...shape.methods.map(asStaticMethod)
    ],
    getAccessors: [
      ...structuredClone(target.getAccessors),
      ...shape.getAccessors.map((value) => ({ ...value, isStatic: true }))
    ],
    setAccessors: [
      ...structuredClone(target.setAccessors),
      ...shape.setAccessors.map((value) => ({ ...value, isStatic: true }))
    ],
    indexSignatures: structuredClone(target.indexSignatures)
  };
  return combinedFacet(
    [variableFacet, targetFacet, shapeFacet],
    1 /* CLASS */,
    declaration,
    "both"
  );
}
function withoutReturnType(signature) {
  const clone = structuredClone(signature);
  delete clone.returnType;
  return clone;
}
function asStaticProperty(property) {
  return { ...structuredClone(property), isStatic: true };
}
function asStaticMethod(method) {
  return { ...structuredClone(method), isStatic: true };
}
function combinedFacet(facets, type, ir, namespace) {
  const sorted = [...facets].sort(bySourceOrder);
  return {
    type,
    namespace,
    ir,
    origin: structuredClone(sorted[0].origin),
    emit: sorted.some((facet) => facet.emit),
    provenance: sorted.flatMap((facet) => facet.provenance)
  };
}
function compatibleTypeParameters(lists) {
  const first = semanticKey(lists[0] ?? []);
  return lists.every((list) => semanticKey(list) === first);
}
function mergeNamedMembers(members) {
  const result = [];
  const byName = /* @__PURE__ */ new Map();
  for (const member of members) {
    const previous = byName.get(member.name);
    if (!previous) {
      const clone = structuredClone(member);
      byName.set(member.name, clone);
      result.push(clone);
      continue;
    }
    if (semanticKey(previous) !== semanticKey(member)) return void 0;
  }
  return result;
}
function uniqueSemantic(values) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const value of values) {
    const key = semanticKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(structuredClone(value));
  }
  return result;
}
function combinedDocs(declarations) {
  const docs2 = [
    ...new Set(
      declarations.map((declaration) => declaration.jsDoc?.trim()).filter((value) => Boolean(value))
    )
  ];
  return docs2.length > 0 ? docs2.join("\n\n") : void 0;
}
function diagnoseUnsupportedGroups(draft, report) {
  for (const [fqn, group] of draft) {
    const facets = group[0].facets;
    if (facets.length < 2) continue;
    const kinds = facets.map((facet) => facet.ir.kind);
    const allFunctions = kinds.every((kind) => kind === "function" /* Function */);
    const typeValuePair = facets.some((facet) => facet.namespace === "type") && facets.some((facet) => facet.namespace === "value");
    if (allFunctions || typeValuePair) continue;
    report.diagnostics.push({
      code: "UNSUPPORTED_DECLARATION_GROUP",
      ownerFQN: fqn,
      action: "preservedUnmerged",
      message: `Declaration group is preserved without merging: ${kinds.join(", ")}`
    });
  }
}
function diagnoseConflict(report, fqn, message) {
  if (report.diagnostics.some(
    (diagnostic) => diagnostic.code === "DECLARATION_MERGE_CONFLICT" && diagnostic.ownerFQN === fqn && diagnostic.message === message
  )) {
    return;
  }
  report.diagnostics.push({
    code: "DECLARATION_MERGE_CONFLICT",
    ownerFQN: fqn,
    action: "preservedUnmerged",
    message
  });
}
function bySourceOrder(a, b) {
  return a.origin.sourceOrder - b.origin.sourceOrder;
}

// src/engine/semantic/keywords.ts
var DART_RESERVED_WORDS = /* @__PURE__ */ new Set([
  "assert",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "else",
  "enum",
  "extends",
  "false",
  "final",
  "finally",
  "for",
  "if",
  "in",
  "is",
  "new",
  "null",
  "rethrow",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "var",
  "void",
  "while",
  "with",
  "yield"
]);
var DART_BUILT_IN_IDENTIFIERS = /* @__PURE__ */ new Set([
  "Function",
  "abstract",
  "as",
  "covariant",
  "deferred",
  "dynamic",
  "export",
  "extension",
  "external",
  "factory",
  "get",
  "implements",
  "import",
  "interface",
  "late",
  "library",
  "mixin",
  "operator",
  "part",
  "required",
  "set",
  "static",
  "type",
  "typedef"
]);
var DART_BACKEND_RESERVED_NAMES = /* @__PURE__ */ new Set([
  "BigInt",
  "DateTime",
  "Future",
  "JS",
  "List",
  "Map",
  "Null",
  "Object",
  "Record",
  "Set",
  "String",
  "anonymous",
  "bool",
  "double",
  "dynamic",
  "int",
  "num",
  "void"
]);
function legalDartName(sourceName, context) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(sourceName)) {
    const sanitized = sourceName.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/^_+|_+$/g, "");
    return `JS$${sanitized || "binding"}`;
  }
  if (sourceName.startsWith("_") && context !== "parameter") {
    return `JS$${sourceName}`;
  }
  const illegal = DART_RESERVED_WORDS.has(sourceName) || context === "type" && DART_BUILT_IN_IDENTIFIERS.has(sourceName) || (context === "type" || context === "value") && DART_BACKEND_RESERVED_NAMES.has(sourceName);
  return illegal ? `JS$${sourceName}` : sourceName;
}

// src/engine/semantic/names.ts
function assignSemanticNames(draft, report) {
  renameOverloads(draft, report);
  for (const [fqn, group] of draft) {
    for (const symbol of group) {
      for (const facet of symbol.facets) {
        assignMemberNames(fqn, facet.ir, report);
        assignNestedNames(facet.ir, report);
      }
    }
  }
  allocateTopLevelNames(draft, report);
}
function renameOverloads(draft, report) {
  for (const group of draft.values()) {
    const symbol = group[0];
    const functions = symbol.facets.filter(
      (facet) => facet.ir.kind === "function" /* Function */
    );
    if (functions.length > 1) {
      const ordered = [...functions].sort(bySourceOrder2);
      ordered.forEach((facet, index) => {
        const declaration = facet.ir;
        declaration.dartName = `${declaration.name}_${index + 1}`;
        declaration.jsName = declaration.name;
      });
      report.overloadGroupsRenamed++;
      report.overloadsRenamed += ordered.length;
    }
    for (const facet of symbol.facets) {
      if (facet.ir.kind !== "class" /* Class */ && facet.ir.kind !== "interface" /* Interface */) {
        continue;
      }
      const declaration = facet.ir;
      const groups = /* @__PURE__ */ new Map();
      for (const method of declaration.methods) {
        const key = `${method.isStatic ? "static" : "instance"}\0${method.name}`;
        const overloads = groups.get(key) ?? [];
        overloads.push(method);
        groups.set(key, overloads);
      }
      for (const methods of groups.values()) {
        if (methods.length < 2) continue;
        methods.forEach((method, index) => {
          method.dartName = `${method.name}_${index + 1}`;
          method.jsName = method.name;
        });
        report.overloadGroupsRenamed++;
        report.overloadsRenamed += methods.length;
      }
    }
  }
}
function allocateTopLevelNames(draft, report) {
  const byFile = /* @__PURE__ */ new Map();
  for (const [fqn, group] of draft) {
    const symbol = group[0];
    const hasSeparateType = symbol.facets.some(
      (facet) => facet.namespace === "type"
    );
    const hasSeparateValue = symbol.facets.some(
      (facet) => facet.namespace === "value"
    );
    const isDual = hasSeparateType && hasSeparateValue;
    for (const facet of symbol.facets) {
      if (!facet.emit) continue;
      const sourceName = facet.ir.name;
      const context = facet.namespace === "value" ? "value" : "type";
      const escaped = legalDartName(sourceName, context);
      if (escaped !== sourceName) report.keywordRenames++;
      const preassigned = facet.ir.dartName;
      const forcedDualValue = isDual && facet.namespace === "value";
      const preferred = forcedDualValue ? withJSPrefix(preassigned ?? escaped) : preassigned ?? escaped;
      const entry = {
        facet,
        forcedDualValue,
        preferred,
        scopeSegments: dartScopeSegments(facet)
      };
      const file = sourceFileOfFQN(fqn);
      const entries = byFile.get(file) ?? [];
      entries.push(entry);
      byFile.set(file, entries);
    }
  }
  for (const entries of byFile.values()) {
    const used = /* @__PURE__ */ new Set();
    entries.sort((a, b) => {
      const aScoped = a.scopeSegments.length > 0 ? 1 : 0;
      const bScoped = b.scopeSegments.length > 0 ? 1 : 0;
      return aScoped - bScoped || bySourceOrder2(a.facet, b.facet);
    });
    for (const entry of entries) {
      const allocated = allocateName(
        entry.preferred,
        entry.scopeSegments,
        used,
        (candidate) => generatedCompanionNames(entry.facet, candidate).every(
          (name) => !used.has(name)
        )
      );
      entry.facet.ir.dartName = allocated;
      entry.facet.ir.jsName = entry.facet.ir.name;
      if (entry.forcedDualValue) report.dualFacetRenames++;
      if (allocated !== entry.preferred && entry.scopeSegments.length > 0 && !allocated.match(/_\d+$/)) {
        report.namespaceRenames++;
      }
      used.add(allocated);
      for (const companion of generatedCompanionNames(entry.facet, allocated)) {
        used.add(companion);
      }
    }
  }
}
function allocateName(preferred, scopeSegments, used, additionalAvailability = () => true) {
  const available = (candidate) => !used.has(candidate) && additionalAvailability(candidate);
  if (available(preferred)) return preferred;
  for (let count = 1; count <= scopeSegments.length; count++) {
    const prefix = scopeSegments.slice(-count).join("_");
    const candidate = legalDartName(`${prefix}_${preferred}`, "type");
    if (available(candidate)) return candidate;
  }
  let suffix = 2;
  while (!available(`${preferred}_${suffix}`)) suffix++;
  return `${preferred}_${suffix}`;
}
function generatedCompanionNames(facet, declarationName2) {
  if (facet.ir.kind === "interface" /* Interface */) {
    return [`${declarationName2}Extension`];
  }
  if (facet.ir.kind === "enum" /* Enum */) {
    return [`${declarationName2}Enum`];
  }
  if (facet.ir.kind === "class" /* Class */) {
    const declaration = facet.ir;
    const generated = classNeedsInteropExtension(declaration) ? [`${declarationName2}Extension`] : [];
    for (const member of [
      ...declaration.properties,
      ...declaration.methods,
      ...declaration.getAccessors,
      ...declaration.setAccessors
    ]) {
      if (member.isStatic && !isComputedMemberName(member.name) && (member.dartName ?? member.name) !== (member.jsName ?? member.name)) {
        generated.push(
          `${declarationName2}_${member.dartName ?? member.name}`
        );
      }
    }
    return [...new Set(generated)];
  }
  return [];
}
function classNeedsInteropExtension(declaration) {
  return [
    ...declaration.properties,
    ...declaration.methods,
    ...declaration.getAccessors,
    ...declaration.setAccessors
  ].some(
    (member) => !member.isStatic && !isComputedMemberName(member.name) && (member.dartName ?? member.name) !== (member.jsName ?? member.name)
  );
}
function dartScopeSegments(facet) {
  return facet.origin.scopes.flatMap((scope) => {
    if (scope.kind === "global") return [];
    const raw = scope.kind === "namespace" ? scope.jsSegments : [scope.specifier];
    return raw.flatMap((segment) => segment.split(/[./\\]+/)).map((segment) => segment.replace(/[^A-Za-z0-9_$]/g, "_")).filter(Boolean);
  });
}
function withJSPrefix(name) {
  return name.startsWith("JS$") ? name : `JS$${name}`;
}
function assignMemberNames(ownerFQN, declaration, report) {
  if (declaration.kind === "enum" /* Enum */) {
    allocateMemberGroups(
      ownerFQN,
      declaration.members.map((member) => [member]),
      report
    );
    return;
  }
  if (declaration.kind !== "class" /* Class */ && declaration.kind !== "interface" /* Interface */) {
    return;
  }
  const owner = declaration;
  const groups = [
    ...owner.properties.map((property) => [property]),
    ...owner.methods.map((method) => [method])
  ];
  const accessors = /* @__PURE__ */ new Map();
  for (const accessor of [...owner.getAccessors, ...owner.setAccessors]) {
    const key = `${accessor.isStatic ? "static" : "instance"}\0${accessor.name}`;
    const values = accessors.get(key) ?? [];
    values.push(accessor);
    accessors.set(key, values);
  }
  groups.push(...accessors.values());
  allocateMemberGroups(ownerFQN, groups, report);
}
function allocateMemberGroups(ownerFQN, groups, report) {
  const used = /* @__PURE__ */ new Set();
  for (const nodes of groups) {
    const sourceName = nodes[0].name;
    const preassigned = nodes[0].dartName;
    const escaped = legalDartName(preassigned ?? sourceName, "member");
    if (escaped !== (preassigned ?? sourceName)) report.keywordRenames++;
    const allocated = allocateName(escaped, [], used);
    for (const node of nodes) {
      node.dartName = allocated;
      node.jsName = sourceName;
    }
    used.add(allocated);
    if (isComputedMemberName(sourceName)) {
      addMemberDiagnostic(
        report,
        "UNSUPPORTED_COMPUTED_MEMBER",
        ownerFQN,
        `Computed member '${sourceName}' is preserved in IR but not emitted by the package:js backend`
      );
    }
  }
}
function isComputedMemberName(name) {
  return name.startsWith("[") && name.endsWith("]");
}
function addMemberDiagnostic(report, code, ownerFQN, message) {
  if (report.diagnostics.some(
    (diagnostic) => diagnostic.code === code && diagnostic.ownerFQN === ownerFQN && diagnostic.message === message
  )) {
    return;
  }
  report.diagnostics.push({
    code,
    ownerFQN,
    action: "preservedUnsupported",
    message
  });
}
function assignNestedNames(declaration, report) {
  const seen = /* @__PURE__ */ new Set();
  const renameTypeParams = (parameters) => {
    for (const parameter of parameters) {
      if (seen.has(parameter)) continue;
      seen.add(parameter);
      const name = legalDartName(parameter.name, "type");
      if (name !== parameter.name) report.keywordRenames++;
      parameter.dartName = name;
      parameter.jsName = parameter.name;
    }
  };
  const renameParameters = (parameters) => {
    const used = /* @__PURE__ */ new Set();
    for (const parameter of parameters) {
      if (seen.has(parameter)) continue;
      seen.add(parameter);
      const preferred = legalDartName(parameter.name, "parameter");
      if (preferred !== parameter.name) report.keywordRenames++;
      const name = allocateName(preferred, [], used);
      parameter.dartName = name;
      parameter.jsName = parameter.name;
      used.add(name);
    }
  };
  const renameSignatures = (signatures) => {
    for (const signature of signatures) {
      renameTypeParams(signature.typeParams);
      renameParameters(signature.parameters);
    }
  };
  if (declaration.kind === "function" /* Function */) {
    const value = declaration;
    renameTypeParams(value.typeParams);
    renameParameters(value.parameters);
  } else if (declaration.kind === "class" /* Class */ || declaration.kind === "interface" /* Interface */) {
    const value = declaration;
    renameTypeParams(value.typeParams);
    for (const method of value.methods) {
      renameTypeParams(method.typeParams);
      renameParameters(method.parameters);
    }
    if (declaration.kind === "class" /* Class */) {
      renameSignatures(value.constructors);
    } else {
      const interfaceValue = value;
      renameSignatures(interfaceValue.callSignatures);
      renameSignatures(interfaceValue.constructSignatures);
    }
    for (const setter of value.setAccessors) {
      renameParameters([setter.parameter]);
    }
  } else if (declaration.kind === "typeAlias" /* TypeAlias */) {
    renameTypeParams(declaration.typeParams);
  }
  forEachIRType(declaration, (type) => {
    renameTypeParams(type.typeParams ?? []);
    renameParameters(type.parameters ?? []);
  });
}
function bySourceOrder2(a, b) {
  return a.origin.sourceOrder - b.origin.sourceOrder;
}

// src/engine/semantic/types.ts
function emptySemanticReport() {
  return {
    inputSymbols: 0,
    inputDeclarations: 0,
    outputSymbols: 0,
    outputFacets: 0,
    anonymousSymbolsCanonicalized: 0,
    declarationGroupsMerged: 0,
    overloadGroupsRenamed: 0,
    overloadsRenamed: 0,
    keywordRenames: 0,
    namespaceRenames: 0,
    dualFacetRenames: 0,
    globalDeclarationsHoisted: 0,
    externalAugmentationsSuppressed: 0,
    redirects: [],
    suppressedAugmentations: [],
    diagnostics: []
  };
}

// src/engine/semantic/run.ts
function runSemanticPassOnDraft(table) {
  const input = new Map(table);
  const report = emptySemanticReport();
  report.inputSymbols = [...input.values()].reduce(
    (count, group) => count + group.length,
    0
  );
  report.inputDeclarations = [...input.values()].reduce(
    (count, group) => count + group.reduce((facetCount, symbol) => facetCount + symbol.facets.length, 0),
    0
  );
  report.globalDeclarationsHoisted = [...input.values()].reduce(
    (count, group) => count + group.reduce(
      (symbolCount, symbol) => symbolCount + symbol.facets.filter(
        (facet) => facet.origin.scopes.some((scope) => scope.kind === "global")
      ).length,
      0
    ),
    0
  );
  const draft = cloneAndConsolidate(input);
  suppressExternalAugmentations(draft, report);
  const redirects = canonicalizeAnonymousSymbols(draft, report);
  mergeDeclarationGroups(draft, report, redirects);
  rewriteRedirects(draft, redirects);
  const aliases = registerAliasSymbols(draft);
  assignSemanticNames(draft, report);
  refreshDependencies(draft);
  table.clear();
  for (const [fqn, group] of draft) table.set(fqn, group);
  report.outputSymbols = draft.size;
  report.outputFacets = [...draft.values()].reduce(
    (count, group) => count + group.reduce((facetCount, symbol) => facetCount + symbol.facets.length, 0),
    0
  );
  report.redirects.sort((a, b) => a.fromFQN.localeCompare(b.fromFQN));
  report.suppressedAugmentations.sort(
    (a, b) => a.ownerFQN.localeCompare(b.ownerFQN)
  );
  report.diagnostics.sort(
    (a, b) => `${a.ownerFQN}\0${a.code}`.localeCompare(
      `${b.ownerFQN}\0${b.code}`
    )
  );
  return {
    report,
    aliasesMinted: aliases.total,
    aliasUseSites: aliases.useSites
  };
}
function cloneAndConsolidate(input) {
  const result = /* @__PURE__ */ new Map();
  for (const [fqn, group] of input) {
    const clones = [...group];
    const facets = clones.flatMap((symbol) => symbol.facets).sort(
      (a, b) => a.origin.sourceOrder - b.origin.sourceOrder
    );
    result.set(fqn, [
      {
        fqn,
        facets,
        deps: [],
        resolvedDeps: [],
        ...clones.every((symbol) => symbol.minted) ? { minted: true } : {}
      }
    ]);
  }
  return result;
}
function suppressExternalAugmentations(draft, report) {
  for (const [fqn, group] of [...draft]) {
    const symbol = group[0];
    const suppressed = symbol.facets.filter(
      (facet) => facet.origin.scopes.some(
        (scope) => scope.kind === "externalModule" && scope.isAugmentation
      )
    );
    if (suppressed.length === 0) continue;
    const retained = symbol.facets.filter(
      (facet) => !suppressed.includes(facet)
    );
    const moduleScope = suppressed.flatMap((facet) => facet.origin.scopes).find(
      (scope) => scope.kind === "externalModule" && scope.isAugmentation
    );
    if (!moduleScope || moduleScope.kind !== "externalModule") continue;
    report.externalAugmentationsSuppressed += suppressed.length;
    report.suppressedAugmentations.push({
      ownerFQN: fqn,
      moduleSpecifier: moduleScope.specifier,
      canonicalTarget: moduleScope.canonicalTarget,
      declarationKinds: suppressed.map((facet) => facet.ir.kind).sort()
    });
    report.diagnostics.push({
      code: "EXTERNAL_MODULE_AUGMENTATION_SUPPRESSED",
      ownerFQN: fqn,
      action: "suppressed",
      message: `External module augmentation '${moduleScope.specifier}' is modeled but not emitted in Stage 4`
    });
    if (retained.length === 0) draft.delete(fqn);
    else {
      symbol.facets = retained;
      symbol.deps = dependenciesOfFacets(retained);
    }
  }
}
function canonicalizeAnonymousSymbols(draft, report) {
  const canonicalByFileAndShape = /* @__PURE__ */ new Map();
  const redirects = /* @__PURE__ */ new Map();
  const candidates = [...draft.entries()].filter(([fqn, group]) => {
    const facet = group[0].facets[0];
    return group[0].facets.length === 1 && facet.ir.kind === "interface" /* Interface */ && facet.synthetic === "anonymousType";
  }).sort(
    ([, a], [, b]) => a[0].facets[0].origin.sourceOrder - b[0].facets[0].origin.sourceOrder
  );
  for (const [fqn, group] of candidates) {
    const facet = group[0].facets[0];
    const shape = anonymousShapeKey(facet.ir);
    const key = `${sourceFileOfFQN(fqn)}\0${shape}`;
    const canonical = canonicalByFileAndShape.get(key);
    if (!canonical) {
      canonicalByFileAndShape.set(key, fqn);
      continue;
    }
    redirects.set(fqn, canonical);
    draft.delete(fqn);
    report.anonymousSymbolsCanonicalized++;
    report.redirects.push({
      fromFQN: fqn,
      toFQN: canonical,
      reason: "anonymousCanonicalization"
    });
  }
  return redirects;
}
function rewriteRedirects(draft, redirects) {
  if (redirects.size === 0) return;
  const resolveRedirect = (fqn) => {
    const seen = /* @__PURE__ */ new Set();
    let current = fqn;
    while (redirects.has(current)) {
      if (seen.has(current)) {
        throw new Error(`Semantic redirect cycle detected at '${current}'`);
      }
      seen.add(current);
      current = redirects.get(current);
    }
    return current;
  };
  for (const group of draft.values()) {
    for (const symbol of group) {
      for (const facet of symbol.facets) {
        forEachIRType(facet.ir, (type) => {
          const reference2 = type.reference;
          if (!reference2) return;
          if (reference2.lookup.kind === "checker") {
            reference2.lookup.candidates = [
              ...new Set(
                reference2.lookup.candidates.map(resolveRedirect)
              )
            ].sort();
          } else {
            reference2.lookup.pseudoFQN = resolveRedirect(
              reference2.lookup.pseudoFQN
            );
          }
          if (reference2.resolvedFQN) {
            reference2.resolvedFQN = resolveRedirect(reference2.resolvedFQN);
          }
        });
      }
    }
  }
}
function refreshDependencies(draft) {
  for (const group of draft.values()) {
    for (const symbol of group) {
      symbol.deps = dependenciesOfFacets(symbol.facets);
      symbol.resolvedDeps = [];
      for (const facet of symbol.facets) {
        forEachIRType(facet.ir, (type) => {
          if (!type.reference) return;
          delete type.reference.resolvedFQN;
          delete type.reference.resolvedDartName;
        });
      }
    }
  }
}
function mergeSemanticResults(results) {
  const report = emptySemanticReport();
  const counts = [
    "inputSymbols",
    "inputDeclarations",
    "outputSymbols",
    "outputFacets",
    "anonymousSymbolsCanonicalized",
    "declarationGroupsMerged",
    "overloadGroupsRenamed",
    "overloadsRenamed",
    "keywordRenames",
    "namespaceRenames",
    "dualFacetRenames",
    "globalDeclarationsHoisted",
    "externalAugmentationsSuppressed"
  ];
  let aliasesMinted = 0;
  let aliasUseSites = 0;
  for (const result of results) {
    for (const key of counts) report[key] += result.report[key];
    report.redirects.push(...result.report.redirects);
    report.suppressedAugmentations.push(...result.report.suppressedAugmentations);
    report.diagnostics.push(...result.report.diagnostics);
    aliasesMinted += result.aliasesMinted;
    aliasUseSites += result.aliasUseSites;
  }
  report.redirects.sort((a, b) => a.fromFQN.localeCompare(b.fromFQN));
  report.suppressedAugmentations.sort((a, b) => a.ownerFQN.localeCompare(b.ownerFQN));
  report.diagnostics.sort(
    (a, b) => `${a.ownerFQN}\0${a.code}`.localeCompare(`${b.ownerFQN}\0${b.code}`)
  );
  return { report, aliasesMinted, aliasUseSites };
}

// src/symbol/exports.ts
function linkModuleExports(table, symbolFQNs) {
  const topLevel = /* @__PURE__ */ new Map();
  const filesWithSymbols = /* @__PURE__ */ new Set();
  for (const fqn of symbolFQNs) {
    const separator = fqn.indexOf("::");
    if (separator < 0) continue;
    const file = fqn.slice(0, separator);
    filesWithSymbols.add(file);
    const logical = fqn.slice(separator + 2);
    const head = logical.split("|")[0];
    const key = `${file}\0${head}`;
    let set = topLevel.get(key);
    if (!set) topLevel.set(key, set = /* @__PURE__ */ new Set());
    set.add(fqn);
  }
  const byFile = /* @__PURE__ */ new Map();
  const diagnostics = [];
  for (const file of [...table.keys()].sort()) {
    const resolved2 = [];
    for (const record of table.get(file) ?? []) {
      if (record.kind === "assignment") {
        const name = record.expression.split(".")[0];
        const targets = [...topLevel.get(`${file}\0${name}`) ?? []].sort();
        if (targets.length === 0 && /^[A-Za-z_$][\w$]*$/.test(name)) {
          diagnostics.push({
            code: "MODULE_EXPORT_UNRESOLVED",
            file,
            line: record.line,
            message: `${record.isDefault ? "export default" : "export ="} ${record.expression} does not name a declaration in this file`
          });
        }
        resolved2.push({ ...record, targets });
        continue;
      }
      if (record.specifier !== void 0 && !record.targetFile) {
        diagnostics.push({
          code: "MODULE_EXPORT_TARGET_MISSING",
          file,
          line: record.line,
          message: `Re-export target '${record.specifier}' was not resolved`
        });
        resolved2.push({ ...record, targets: [] });
        continue;
      }
      const sourceFile = record.targetFile ?? file;
      if (record.kind === "named") {
        const targets = record.elements.flatMap((element) => [
          ...topLevel.get(
            `${sourceFile}\0${element.propertyName ?? element.name}`
          ) ?? []
        ]).sort();
        resolved2.push({ ...record, targets });
      } else {
        resolved2.push({ ...record, targets: [sourceFile] });
      }
    }
    if (resolved2.length > 0) byFile.set(file, resolved2);
  }
  return { byFile, diagnostics };
}

// src/engine/phase/linkerPhase.ts
function failureOf(edge) {
  if (edge.resolution.kind === "missing") {
    return {
      kind: "missing",
      reference: edge.writtenName,
      lookupFQN: edge.resolution.lookupFQN
    };
  }
  if (edge.resolution.kind === "ambiguous") {
    return {
      kind: "ambiguous",
      reference: edge.writtenName,
      lookupFQN: edge.resolution.lookupFQN,
      candidates: edge.resolution.candidates
    };
  }
  return null;
}
function edgeSortKey(edge) {
  const target = edge.resolution.kind === "resolved" ? edge.resolution.fqn : edge.resolution.lookupFQN;
  return `${edge.from}\0${edge.writtenName}\0${target}`;
}
async function runLinker(symbolTable, namespaceExports, moduleExports = /* @__PURE__ */ new Map()) {
  const symbols = symbolTable.release();
  const semantic = runSemanticPassOnDraft(symbols);
  const report = linkDraft(symbols, namespaceExports, semantic);
  const linkedExports = linkModuleExports(
    structuredClone(moduleExports),
    symbols.keys()
  );
  report.moduleExportDiagnostics = [...linkedExports.diagnostics];
  return {
    symbols,
    namespaceExports: structuredClone(namespaceExports),
    moduleExports: linkedExports,
    report
  };
}
function linkDraft(table, namespaceExports, semantic) {
  const linked = linkReferences(table, table, namespaceExports);
  return summarizeLinks(linked.edgesByFQN, linked.diagnostics, table.keys(), semantic);
}
function linkReferences(groups, table, namespaceExports) {
  const diagnostics = [];
  const edgesByFQN = /* @__PURE__ */ new Map();
  for (const fqn of [...groups.keys()].sort()) {
    const groupEdges = [];
    for (const symbol of groups.get(fqn) ?? []) {
      const resolvedDeps = /* @__PURE__ */ new Set();
      for (const dependency of symbol.deps) {
        if (dependency.lookup.kind === "syntax" && dependency.lookup.checkerError) {
          diagnostics.push({
            code: "REFERENCE_CHECKER_FALLBACK",
            ownerFQN: fqn,
            writtenName: dependency.writtenName,
            message: dependency.lookup.checkerError
          });
        }
        const resolution = resolveReference(
          dependency,
          table,
          namespaceExports
        );
        if (resolution.kind === "resolved") {
          dependency.resolvedFQN = resolution.fqn;
          dependency.resolvedDartName = resolvedTypeName(
            table.get(resolution.fqn) ?? []
          );
          resolvedDeps.add(resolution.fqn);
        } else {
          delete dependency.resolvedFQN;
          delete dependency.resolvedDartName;
        }
        const edge = {
          from: fqn,
          writtenName: dependency.writtenName,
          resolution
        };
        groupEdges.push(edge);
      }
      symbol.resolvedDeps = [...resolvedDeps].sort();
    }
    edgesByFQN.set(
      fqn,
      groupEdges.sort(
        (a, b) => edgeSortKey(a).localeCompare(edgeSortKey(b))
      )
    );
  }
  return { edgesByFQN, diagnostics };
}
function summarizeLinks(edgesByFQN, linkDiagnostics, symbolFQNs, semantic) {
  const fqns = [...symbolFQNs].sort();
  const edges = fqns.flatMap((fqn) => edgesByFQN.get(fqn) ?? []);
  const diagnostics = [...linkDiagnostics];
  edges.sort((a, b) => edgeSortKey(a).localeCompare(edgeSortKey(b)));
  diagnostics.sort(
    (a, b) => `${a.ownerFQN}\0${a.writtenName}`.localeCompare(
      `${b.ownerFQN}\0${b.writtenName}`
    )
  );
  const cache = /* @__PURE__ */ new Map();
  const resolving = /* @__PURE__ */ new Set();
  function checkDeps(fqn) {
    const cached = cache.get(fqn);
    if (cached) return cached;
    if (resolving.has(fqn)) return { state: "LinkedResolved" /* LinkedResolved */ };
    resolving.add(fqn);
    const directEdges = edgesByFQN.get(fqn) ?? [];
    if (directEdges.length === 0) {
      resolving.delete(fqn);
      const result2 = { state: "LinkedIndependent" /* LinkedIndependent */ };
      cache.set(fqn, result2);
      return result2;
    }
    for (const edge of directEdges) {
      const failure = failureOf(edge);
      if (failure) {
        resolving.delete(fqn);
        const result2 = {
          state: "NotLinkedDirect" /* NotLinkedDirect */,
          failure
        };
        cache.set(fqn, result2);
        return result2;
      }
      if (edge.resolution.kind !== "resolved") {
        throw new Error("Unreachable unresolved edge without a link failure");
      }
      const target = edge.resolution.fqn;
      const dependencyResult = checkDeps(target);
      if (dependencyResult.state === "NotLinkedDirect" /* NotLinkedDirect */ || dependencyResult.state === "NotLinkedIndirect" /* NotLinkedIndirect */) {
        resolving.delete(fqn);
        const result2 = {
          state: "NotLinkedIndirect" /* NotLinkedIndirect */,
          failure: dependencyResult.failure,
          viaChain: [
            target,
            ...dependencyResult.state === "NotLinkedIndirect" /* NotLinkedIndirect */ ? dependencyResult.viaChain : []
          ]
        };
        cache.set(fqn, result2);
        return result2;
      }
    }
    resolving.delete(fqn);
    const result = { state: "LinkedResolved" /* LinkedResolved */ };
    cache.set(fqn, result);
    return result;
  }
  const results = /* @__PURE__ */ new Map();
  let valid = 0;
  let broken = 0;
  for (const fqn of fqns) {
    const result = checkDeps(fqn);
    results.set(fqn, result);
    if (result.state === "NotLinkedDirect" /* NotLinkedDirect */ || result.state === "NotLinkedIndirect" /* NotLinkedIndirect */) {
      broken++;
    } else {
      valid++;
    }
  }
  return {
    semantic: semantic.report,
    results,
    edges,
    diagnostics,
    moduleExportDiagnostics: [],
    valid,
    broken,
    aliasesMinted: semantic.aliasesMinted,
    aliasUseSites: semantic.aliasUseSites
  };
}
function resolvedTypeName(symbols) {
  for (const symbol of symbols) {
    const facet = symbol.facets.find(
      (candidate) => candidate.namespace === "type" || candidate.namespace === "both"
    );
    if (facet) return facet.ir.dartName ?? facet.ir.name;
  }
  return void 0;
}

// src/symbol/table.ts
var SymbolTable = class {
  constructor() {
    this.symbols = /* @__PURE__ */ new Map();
  }
  register(fqn, symbol) {
    this.assertSymbolMatches(fqn, symbol);
    this.symbols.set(fqn, [
      ...this.symbols.get(fqn) ?? [],
      structuredClone(symbol)
    ]);
  }
  /**
   * Registers a symbol whose ownership the caller hands over: it must be a
   * fresh object graph the caller never touches again. Symbol generation
   * builds every symbol from scratch, so it adopts instead of cloning (three.js
   * spent ~190 ms cloning freshly built symbols).
   */
  adopt(fqn, symbol) {
    this.assertSymbolMatches(fqn, symbol);
    const group = this.symbols.get(fqn);
    if (group) group.push(symbol);
    else this.symbols.set(fqn, [symbol]);
  }
  /**
   * Transfers the whole table to the caller without copying and leaves this
   * table empty. Used once per run by the linker, which owns the result and
   * hands it to backends as the `LinkedProgram`; nothing can reach it through
   * the table afterwards, so ownership stays exclusive (`L-10`) without the
   * three deep copies the transactional path costs.
   */
  release() {
    const owned = this.symbols;
    for (const [fqn, group] of owned) this.validatedGroup(fqn, group);
    this.symbols = /* @__PURE__ */ new Map();
    return owned;
  }
  replace(fqn, symbols) {
    this.symbols.set(fqn, structuredClone(this.validatedGroup(fqn, symbols)));
  }
  unregister(fqn) {
    const removed = this.symbols.get(fqn) ?? [];
    this.symbols.delete(fqn);
    return removed;
  }
  /**
   * Runs a rewrite against a deep draft of the whole table and commits it
   * atomically. If `mutate` throws or the draft fails validation, the table is
   * unchanged.
   */
  transaction(mutate) {
    const draft = this.deepCopy(this.symbols);
    const result = mutate(draft);
    const validated = /* @__PURE__ */ new Map();
    for (const [fqn, group] of draft) {
      validated.set(fqn, this.validatedGroup(fqn, group));
    }
    this.symbols = validated;
    return result;
  }
  /**
   * Applies a semantic rewrite as one transaction. Validation happens against
   * a detached draft, so an invalid later change cannot expose earlier ones.
   */
  apply(changes) {
    const changedFQNs = /* @__PURE__ */ new Set();
    this.transaction((draft) => {
      for (const change of changes) {
        if (changedFQNs.has(change.fqn)) {
          throw new Error(
            `Symbol table mutation contains duplicate target '${change.fqn}'`
          );
        }
        changedFQNs.add(change.fqn);
        if (change.kind === "unregister") {
          draft.delete(change.fqn);
        } else {
          draft.set(
            change.fqn,
            structuredClone(this.validatedGroup(change.fqn, change.symbols))
          );
        }
      }
    });
  }
  lookup(fqn) {
    const group = this.symbols.get(fqn);
    return group ? structuredClone(group) : void 0;
  }
  has(fqn) {
    return this.symbols.has(fqn);
  }
  getAll() {
    return structuredClone([...this.symbols.values()].flat());
  }
  /** Returns a deeply detached snapshot, not the table's backing storage. */
  getSymbolTable() {
    return this.deepCopy(this.symbols);
  }
  get size() {
    return this.symbols.size;
  }
  validatedGroup(fqn, symbols) {
    if (symbols.length === 0) {
      throw new Error(
        `Cannot replace '${fqn}' with an empty group; unregister it instead`
      );
    }
    for (const symbol of symbols) this.assertSymbolMatches(fqn, symbol);
    return [...symbols];
  }
  assertSymbolMatches(fqn, symbol) {
    if (symbol.fqn !== fqn) {
      throw new Error(
        `Symbol FQN '${symbol.fqn}' does not match table key '${fqn}'`
      );
    }
  }
  deepCopy(table) {
    return structuredClone(new Map(table));
  }
};

// src/engine/emitter/packagejs/index.ts
import { basename as basename2, extname } from "path";

// src/engine/emitter/backend.ts
var SUPPORT_LIBRARY = "\0dartify-support";

// src/engine/emitter/packagejs/text.ts
function dartString(value) {
  let escaped = "";
  for (const char of value) {
    switch (char) {
      case "\\":
        escaped += "\\\\";
        break;
      case '"':
        escaped += '\\"';
        break;
      case "$":
        escaped += "\\$";
        break;
      case "\n":
        escaped += "\\n";
        break;
      case "\r":
        escaped += "\\r";
        break;
      case "	":
        escaped += "\\t";
        break;
      default: {
        const code = char.codePointAt(0);
        escaped += code < 32 ? `\\u{${code.toString(16)}}` : char;
      }
    }
  }
  return `"${escaped}"`;
}
function codeSpan(text) {
  const runs = [...text.matchAll(/`+/g)].map((match) => match[0].length);
  const fence = "`".repeat(Math.max(0, ...runs) + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
}
var STRIPPED_TAGS = /* @__PURE__ */ new Set([
  "param",
  "arg",
  "argument",
  "return",
  "returns",
  "throws",
  "exception",
  "type",
  "typedef",
  "template",
  "typeparam",
  "static",
  "memberof",
  "function"
]);
function dartDocLines(jsDoc, indent = "") {
  if (!jsDoc) return [];
  const blocks = jsDoc.match(/\/\*\*[\s\S]*?\*\//g) ?? [jsDoc];
  const lines = [];
  for (const block of blocks) {
    const body = block.replace(/^\/\*\*/, "").replace(/\*\/$/, "").split(/\r?\n/).map((line) => line.replace(/^\s*\*? ?/, ""));
    let skipping = false;
    for (const raw of body) {
      const tag = raw.match(/^\s*@(\w+)/);
      if (tag) skipping = STRIPPED_TAGS.has(tag[1].toLowerCase());
      if (skipping) continue;
      lines.push(
        raw.replace(/\{@(?:link|linkcode|linkplain)\s+([^\s}|]+)(?:[\s|][^}]*)?\}/g, "[$1]").replace(/\*\//g, "*\\/").replace(/\[new\s+/g, "[").trimEnd()
      );
    }
  }
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  const collapsed = [];
  for (const line of lines) {
    if (line.trim() === "" && collapsed[collapsed.length - 1]?.trim() === "") continue;
    collapsed.push(line);
  }
  return collapsed.map((line) => `${indent}///${line ? ` ${line}` : ""}`);
}
function pascalWords(text) {
  const words = text.match(/[A-Za-z0-9]+/g) ?? [];
  const joined = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
  const safe = /^[0-9]/.test(joined) ? `T${joined}` : joined;
  return safe.length > 48 ? safe.slice(0, 48) : safe;
}
function stableHash(text, length = 6) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, length);
}

// src/engine/emitter/packagejs/support.ts
var SUPPORT_FILE_NAME = "dartify_support.dart";
function supportExports(name) {
  return name === "Promise" ? ["Promise", "PromiseToFuture"] : [name];
}
var SUPPORT_PUBLIC_NAMES = ["JSBigInt", "Promise", "PromiseToFuture"];
function renderSupportLibrary() {
  return [
    "// Generated by dart_bindgen: interop support shared by the generated libraries",
    "// Do not edit directly",
    "",
    "@JS()",
    "library dartify_support;",
    "",
    "import 'package:js/js.dart';",
    "import 'package:js/js_util.dart' show promiseToFuture;",
    "",
    "/// A JavaScript `bigint`. Dart's `BigInt` is a different runtime type.",
    "typedef JSBigInt = Object;",
    "",
    "/// A JavaScript `Promise`. Use `toFuture()` to await it from Dart.",
    `@JS(${dartString("Promise")})`,
    "abstract class Promise<T> {}",
    "",
    "extension PromiseToFuture<T> on Promise<T> {",
    "  Future<T> toFuture() => promiseToFuture<T>(this);",
    "}",
    ""
  ].join("\n");
}

// src/engine/emitter/packagejs/program.ts
var ProgramIndex = class {
  constructor(symbols, outputPathOfFile) {
    this.symbols = symbols;
    this.outputPathOfFile = outputPathOfFile;
    this.targets = /* @__PURE__ */ new Map();
    this.ownershipByFile = /* @__PURE__ */ new Map();
  }
  /** The emitted Dart type a resolved FQN names, if it emits one. */
  typeTarget(fqn) {
    if (this.targets.has(fqn)) return this.targets.get(fqn) ?? void 0;
    const target = this.computeTarget(fqn);
    this.targets.set(fqn, target ?? null);
    return target;
  }
  /** Every structural-shape interface in the program, computed once. */
  shapes() {
    if (!this.shapeList) {
      this.shapeList = [];
      for (const [fqn, group] of this.symbols) {
        for (const symbol of group) {
          for (const facet of symbol.facets) {
            if (isShapeCandidate(facet)) this.shapeList.push({ fqn, facet });
          }
        }
      }
      this.shapeList.sort((a, b) => a.fqn.localeCompare(b.fqn));
    }
    return this.shapeList;
  }
  /** The emitted type facet for an FQN: class, interface, enum or alias. */
  typeFacet(fqn) {
    for (const symbol of this.symbols.get(fqn) ?? []) {
      const facet = symbol.facets.find(
        (candidate) => candidate.emit && (candidate.namespace === "type" || candidate.namespace === "both")
      );
      if (facet) return facet;
    }
    return void 0;
  }
  /**
   * `type EventParameters = { … }` hoists the literal as an anonymous
   * interface. When that alias is the literal's only user, the class is
   * emitted under the alias's name and the alias itself is not (js_facade_gen
   * §5.11). Returns the owning alias facet for such an anonymous FQN.
   */
  aliasOwnerOf(anonymousFQN) {
    return this.ownership(sourceFileOfFQN(anonymousFQN)).owned.get(anonymousFQN);
  }
  /** Whether an alias facet is replaced by the class it names. */
  isOwningAlias(facet) {
    return this.ownership(facet.origin.filePath).aliases.has(facet);
  }
  /**
   * Ownership is decided per file and lazily: an anonymous hoisted type can
   * only be referenced from its own file, so counting that file's uses is
   * enough, and incremental renders never walk unaffected files.
   */
  ownership(file) {
    let entry = this.ownershipByFile.get(file);
    if (entry) return entry;
    entry = { owned: /* @__PURE__ */ new Map(), aliases: /* @__PURE__ */ new Set() };
    this.ownershipByFile.set(file, entry);
    const groups = this.groupsOfFile(file);
    const uses = /* @__PURE__ */ new Map();
    for (const group of groups) {
      for (const symbol of group) {
        for (const facet of symbol.facets) {
          forEachIRType(facet.ir, (type) => {
            const target = type.reference?.resolvedFQN;
            if (target) uses.set(target, (uses.get(target) ?? 0) + 1);
          });
        }
      }
    }
    for (const group of groups) {
      for (const symbol of group) {
        for (const facet of symbol.facets) {
          if (!facet.emit || facet.ir.kind !== "typeAlias" /* TypeAlias */) continue;
          const alias = facet.ir;
          if (alias.typeParams.length > 0) continue;
          if (alias.type.kind !== "typeReference" /* TypeReference */ || alias.type.isNullable) continue;
          const target = alias.type.reference?.resolvedFQN;
          if (!target || uses.get(target) !== 1) continue;
          if (sourceFileOfFQN(target) !== file) continue;
          const anonymous = this.typeFacet(target);
          if (anonymous?.synthetic !== "anonymousType") continue;
          if (anonymous.ir.kind !== "interface" /* Interface */) continue;
          entry.owned.set(target, facet);
          entry.aliases.add(facet);
        }
      }
    }
    return entry;
  }
  groupsOfFile(file) {
    if (!this.filesIndex) {
      this.filesIndex = /* @__PURE__ */ new Map();
      for (const [fqn, group] of this.symbols) {
        const owner = sourceFileOfFQN(fqn);
        const list = this.filesIndex.get(owner) ?? [];
        list.push(group);
        this.filesIndex.set(owner, list);
      }
    }
    return this.filesIndex.get(file) ?? [];
  }
  computeTarget(fqn) {
    const facet = this.typeFacet(fqn);
    if (!facet) return void 0;
    if (facet.ir.kind === "enum" /* Enum */) {
      return { kind: "enumValue", dartType: enumValueType(facet.ir) };
    }
    const file = sourceFileOfFQN(fqn);
    if (!this.outputPathOfFile.has(file)) return void 0;
    const declaration = facet.ir;
    const owner = this.aliasOwnerOf(fqn);
    return {
      kind: "type",
      fqn,
      file,
      dartName: owner ? owner.ir.dartName ?? owner.ir.name : declaration.dartName ?? declaration.name,
      typeParams: declaration.typeParams ?? [],
      facet
    };
  }
};
function isShapeCandidate(facet) {
  if (!facet.emit || facet.synthetic || facet.namespace !== "type") return false;
  if (facet.ir.kind !== "interface" /* Interface */) return false;
  const shape = facet.ir;
  if (shape.typeParams.length > 0) return false;
  if (shape.methods.length > 0 || shape.callSignatures.length > 0) return false;
  if (shape.constructSignatures.length > 0 || shape.indexSignatures.length > 0) return false;
  if (shape.setAccessors.length > 0) return false;
  const members = [...shape.properties, ...shape.getAccessors].filter((member) => !member.isStatic);
  return members.length >= 2 && members.length === shape.properties.length + shape.getAccessors.length;
}
function enumValueType(declaration) {
  const kinds = new Set(
    declaration.members.map((member) => {
      const initializer = member.initializer;
      const value = initializer.kind === "number" || initializer.kind === "string" ? initializer.value : initializer.computedValue;
      if (typeof value === "string") return "String";
      if (typeof value === "number" || initializer.kind === "implicit") return "num";
      return "Object";
    })
  );
  if (kinds.size === 0) return "num";
  if (kinds.size === 1) return [...kinds][0];
  return "Object";
}

// src/engine/emitter/packagejs/browserTypes.ts
var BROWSER_TYPES = {
  "dart:html": {
    AbstractWorker: "AbstractWorker",
    Animation: "Animation",
    AnimationTimeline: "AnimationTimeline",
    ApplicationCache: "ApplicationCache",
    ApplicationCacheErrorEvent: "ApplicationCacheErrorEvent",
    BarProp: "BarProp",
    BatteryManager: "BatteryManager",
    BeforeUnloadEvent: "BeforeUnloadEvent",
    Blob: "Blob",
    Body: "Body",
    CDATASection: "CDataSection",
    CSS: "Css",
    CSSCharsetRule: "CssCharsetRule",
    CSSFontFaceRule: "CssFontFaceRule",
    CSSImportRule: "CssImportRule",
    CSSKeyframeRule: "CssKeyframeRule",
    CSSKeyframesRule: "CssKeyframesRule",
    CSSMediaRule: "CssMediaRule",
    CSSPageRule: "CssPageRule",
    CSSRule: "CssRule",
    CSSStyleDeclaration: "CssStyleDeclaration",
    CSSStyleRule: "CssStyleRule",
    CSSStyleSheet: "CssStyleSheet",
    CSSSupportsRule: "CssSupportsRule",
    CSSViewportRule: "CssViewportRule",
    CacheStorage: "CacheStorage",
    CanvasGradient: "CanvasGradient",
    CanvasPattern: "CanvasPattern",
    CanvasRenderingContext2D: "CanvasRenderingContext2D",
    CharacterData: "CharacterData",
    ChildNode: "ChildNode",
    CloseEvent: "CloseEvent",
    Comment: "Comment",
    CompositionEvent: "CompositionEvent",
    Console: "Console",
    Coordinates: "Coordinates",
    Credential: "Credential",
    CredentialsContainer: "CredentialsContainer",
    Crypto: "Crypto",
    CryptoKey: "CryptoKey",
    CustomEvent: "CustomEvent",
    DOMError: "DomError",
    DOMException: "DomException",
    DOMFileSystem: "FileSystem",
    DOMImplementation: "DomImplementation",
    DOMMatrix: "DomMatrix",
    DOMMatrixReadOnly: "DomMatrixReadOnly",
    DOMParser: "DomParser",
    DOMPoint: "DomPoint",
    DOMPointReadOnly: "DomPointReadOnly",
    DOMRectReadOnly: "DomRectReadOnly",
    DOMStringList: "DomStringList",
    DOMStringMap: "DomStringMap",
    DOMTokenList: "DomTokenList",
    DataTransfer: "DataTransfer",
    DataTransferItem: "DataTransferItem",
    DataTransferItemList: "DataTransferItemList",
    DedicatedWorkerGlobalScope: "DedicatedWorkerGlobalScope",
    DeprecatedStorageInfo: "DeprecatedStorageInfo",
    DeprecatedStorageQuota: "DeprecatedStorageQuota",
    DeviceAcceleration: "DeviceAcceleration",
    DeviceMotionEvent: "DeviceMotionEvent",
    DeviceOrientationEvent: "DeviceOrientationEvent",
    DeviceRotationRate: "DeviceRotationRate",
    DirectoryEntry: "DirectoryEntry",
    DirectoryReader: "DirectoryReader",
    Document: "Document",
    DocumentFragment: "DocumentFragment",
    Element: "Element",
    Entry: "Entry",
    ErrorEvent: "ErrorEvent",
    Event: "Event",
    EventSource: "EventSource",
    EventTarget: "EventTarget",
    ExtendableEvent: "ExtendableEvent",
    FederatedCredential: "FederatedCredential",
    FetchEvent: "FetchEvent",
    File: "File",
    FileEntry: "FileEntry",
    FileList: "FileList",
    FileReader: "FileReader",
    FileWriter: "FileWriter",
    FocusEvent: "FocusEvent",
    FontFace: "FontFace",
    FontFaceSet: "FontFaceSet",
    FontFaceSetLoadEvent: "FontFaceSetLoadEvent",
    FormData: "FormData",
    Gamepad: "Gamepad",
    GamepadButton: "GamepadButton",
    GamepadEvent: "GamepadEvent",
    Geolocation: "Geolocation",
    Geoposition: "Geoposition",
    GlobalEventHandlers: "GlobalEventHandlers",
    HTMLAnchorElement: "AnchorElement",
    HTMLAreaElement: "AreaElement",
    HTMLAudioElement: "AudioElement",
    HTMLBRElement: "BRElement",
    HTMLBaseElement: "BaseElement",
    HTMLBodyElement: "BodyElement",
    HTMLButtonElement: "ButtonElement",
    HTMLCanvasElement: "CanvasElement",
    HTMLCollection: "HtmlCollection",
    HTMLContentElement: "ContentElement",
    HTMLDListElement: "DListElement",
    HTMLDataListElement: "DataListElement",
    HTMLDetailsElement: "DetailsElement",
    HTMLDialogElement: "DialogElement",
    HTMLDivElement: "DivElement",
    HTMLDocument: "HtmlDocument",
    HTMLElement: "HtmlElement",
    HTMLEmbedElement: "EmbedElement",
    HTMLFieldSetElement: "FieldSetElement",
    HTMLFormControlsCollection: "HtmlFormControlsCollection",
    HTMLFormElement: "FormElement",
    HTMLHRElement: "HRElement",
    HTMLHeadElement: "HeadElement",
    HTMLHeadingElement: "HeadingElement",
    HTMLHtmlElement: "HtmlHtmlElement",
    HTMLIFrameElement: "IFrameElement",
    HTMLImageElement: "ImageElement",
    HTMLInputElement: "InputElement",
    HTMLLIElement: "LIElement",
    HTMLLabelElement: "LabelElement",
    HTMLLegendElement: "LegendElement",
    HTMLLinkElement: "LinkElement",
    HTMLMapElement: "MapElement",
    HTMLMediaElement: "MediaElement",
    HTMLMenuElement: "MenuElement",
    HTMLMetaElement: "MetaElement",
    HTMLMeterElement: "MeterElement",
    HTMLModElement: "ModElement",
    HTMLOListElement: "OListElement",
    HTMLObjectElement: "ObjectElement",
    HTMLOptGroupElement: "OptGroupElement",
    HTMLOptionElement: "OptionElement",
    HTMLOptionsCollection: "HtmlOptionsCollection",
    HTMLOutputElement: "OutputElement",
    HTMLParagraphElement: "ParagraphElement",
    HTMLParamElement: "ParamElement",
    HTMLPictureElement: "PictureElement",
    HTMLPreElement: "PreElement",
    HTMLProgressElement: "ProgressElement",
    HTMLQuoteElement: "QuoteElement",
    HTMLScriptElement: "ScriptElement",
    HTMLSelectElement: "SelectElement",
    HTMLShadowElement: "ShadowElement",
    HTMLSourceElement: "SourceElement",
    HTMLSpanElement: "SpanElement",
    HTMLStyleElement: "StyleElement",
    HTMLTableCaptionElement: "TableCaptionElement",
    HTMLTableCellElement: "TableCellElement",
    HTMLTableColElement: "TableColElement",
    HTMLTableElement: "TableElement",
    HTMLTableRowElement: "TableRowElement",
    HTMLTableSectionElement: "TableSectionElement",
    HTMLTemplateElement: "TemplateElement",
    HTMLTextAreaElement: "TextAreaElement",
    HTMLTitleElement: "TitleElement",
    HTMLTrackElement: "TrackElement",
    HTMLUListElement: "UListElement",
    HTMLUnknownElement: "UnknownElement",
    HTMLVideoElement: "VideoElement",
    HashChangeEvent: "HashChangeEvent",
    Headers: "Headers",
    History: "History",
    ImageBitmap: "ImageBitmap",
    ImageData: "ImageData",
    InstallEvent: "InstallEvent",
    Iterator: "DomIterator",
    KeyboardEvent: "KeyboardEvent",
    Location: "Location",
    MIDIAccess: "MidiAccess",
    MIDIConnectionEvent: "MidiConnectionEvent",
    MIDIInput: "MidiInput",
    MIDIInputMap: "MidiInputMap",
    MIDIMessageEvent: "MidiMessageEvent",
    MIDIOutput: "MidiOutput",
    MIDIOutputMap: "MidiOutputMap",
    MIDIPort: "MidiPort",
    MediaDeviceInfo: "MediaDeviceInfo",
    MediaError: "MediaError",
    MediaKeyMessageEvent: "MediaKeyMessageEvent",
    MediaKeySession: "MediaKeySession",
    MediaKeys: "MediaKeys",
    MediaList: "MediaList",
    MediaQueryList: "MediaQueryList",
    MediaQueryListEvent: "MediaQueryListEvent",
    MediaSource: "MediaSource",
    MediaStream: "MediaStream",
    MediaStreamEvent: "MediaStreamEvent",
    MediaStreamTrack: "MediaStreamTrack",
    MediaStreamTrackEvent: "MediaStreamTrackEvent",
    MemoryInfo: "MemoryInfo",
    MessageChannel: "MessageChannel",
    MessageEvent: "MessageEvent",
    MessagePort: "MessagePort",
    Metadata: "Metadata",
    MimeType: "MimeType",
    MimeTypeArray: "MimeTypeArray",
    MouseEvent: "MouseEvent",
    MutationEvent: "MutationEvent",
    MutationObserver: "MutationObserver",
    MutationRecord: "MutationRecord",
    Navigator: "Navigator",
    NavigatorID: "NavigatorID",
    NavigatorLanguage: "NavigatorLanguage",
    NavigatorOnLine: "NavigatorOnLine",
    NavigatorUserMediaError: "NavigatorUserMediaError",
    NetworkInformation: "NetworkInformation",
    Node: "Node",
    NodeFilter: "NodeFilter",
    NodeIterator: "NodeIterator",
    NodeList: "NodeList",
    Notification: "Notification",
    PageTransitionEvent: "PageTransitionEvent",
    ParentNode: "ParentNode",
    Path2D: "Path2D",
    Performance: "Performance",
    PerformanceEntry: "PerformanceEntry",
    PerformanceMark: "PerformanceMark",
    PerformanceMeasure: "PerformanceMeasure",
    PerformanceNavigation: "PerformanceNavigation",
    PerformanceResourceTiming: "PerformanceResourceTiming",
    PerformanceTiming: "PerformanceTiming",
    Plugin: "Plugin",
    PluginArray: "PluginArray",
    PopStateEvent: "PopStateEvent",
    PositionError: "PositionError",
    Presentation: "Presentation",
    ProcessingInstruction: "ProcessingInstruction",
    ProgressEvent: "ProgressEvent",
    PushEvent: "PushEvent",
    PushManager: "PushManager",
    RTCDTMFSender: "RtcDtmfSender",
    RTCDTMFToneChangeEvent: "RtcDtmfToneChangeEvent",
    RTCDataChannel: "RtcDataChannel",
    RTCDataChannelEvent: "RtcDataChannelEvent",
    RTCIceCandidate: "RtcIceCandidate",
    RTCPeerConnection: "RtcPeerConnection",
    RTCSessionDescription: "RtcSessionDescription",
    RTCStatsReport: "RtcStatsReport",
    RTCStatsResponse: "RtcStatsResponse",
    Range: "Range",
    Screen: "Screen",
    ScreenOrientation: "ScreenOrientation",
    SecurityPolicyViolationEvent: "SecurityPolicyViolationEvent",
    Selection: "Selection",
    ServiceWorker: "ServiceWorker",
    ServiceWorkerContainer: "ServiceWorkerContainer",
    ServiceWorkerGlobalScope: "ServiceWorkerGlobalScope",
    ServiceWorkerRegistration: "ServiceWorkerRegistration",
    ShadowRoot: "ShadowRoot",
    SharedWorker: "SharedWorker",
    SharedWorkerGlobalScope: "SharedWorkerGlobalScope",
    SourceBuffer: "SourceBuffer",
    SourceBufferList: "SourceBufferList",
    SpeechGrammar: "SpeechGrammar",
    SpeechGrammarList: "SpeechGrammarList",
    SpeechRecognition: "SpeechRecognition",
    SpeechRecognitionAlternative: "SpeechRecognitionAlternative",
    SpeechRecognitionError: "SpeechRecognitionError",
    SpeechRecognitionEvent: "SpeechRecognitionEvent",
    SpeechRecognitionResult: "SpeechRecognitionResult",
    SpeechSynthesis: "SpeechSynthesis",
    SpeechSynthesisEvent: "SpeechSynthesisEvent",
    SpeechSynthesisUtterance: "SpeechSynthesisUtterance",
    SpeechSynthesisVoice: "SpeechSynthesisVoice",
    Storage: "Storage",
    StorageEvent: "StorageEvent",
    StyleMedia: "StyleMedia",
    StyleSheet: "StyleSheet",
    Text: "Text",
    TextEvent: "TextEvent",
    TextMetrics: "TextMetrics",
    TextTrack: "TextTrack",
    TextTrackCue: "TextTrackCue",
    TextTrackCueList: "TextTrackCueList",
    TextTrackList: "TextTrackList",
    TimeRanges: "TimeRanges",
    Touch: "Touch",
    TouchEvent: "TouchEvent",
    TouchList: "TouchList",
    TrackEvent: "TrackEvent",
    TransitionEvent: "TransitionEvent",
    TreeWalker: "TreeWalker",
    UIEvent: "UIEvent",
    URL: "Url",
    URLUtilsReadOnly: "UrlUtilsReadOnly",
    VTTCue: "VttCue",
    VTTRegion: "VttRegion",
    ValidityState: "ValidityState",
    VideoPlaybackQuality: "VideoPlaybackQuality",
    VideoTrack: "VideoTrack",
    VideoTrackList: "VideoTrackList",
    WebKitAnimationEvent: "AnimationEvent",
    WebSocket: "WebSocket",
    WheelEvent: "WheelEvent",
    Window: "Window",
    WindowBase64: "WindowBase64",
    WindowEventHandlers: "WindowEventHandlers",
    Worker: "Worker",
    WorkerGlobalScope: "WorkerGlobalScope",
    WorkerPerformance: "WorkerPerformance",
    XMLDocument: "XmlDocument",
    XMLHttpRequest: "HttpRequest",
    XMLHttpRequestEventTarget: "HttpRequestEventTarget",
    XMLHttpRequestUpload: "HttpRequestUpload",
    XMLSerializer: "XmlSerializer",
    XPathEvaluator: "XPathEvaluator",
    XPathExpression: "XPathExpression",
    XPathNSResolver: "XPathNSResolver",
    XPathResult: "XPathResult",
    XSLTProcessor: "XsltProcessor"
  },
  "dart:indexed_db": {
    IDBCursor: "Cursor",
    IDBCursorWithValue: "CursorWithValue",
    IDBDatabase: "Database",
    IDBFactory: "IdbFactory",
    IDBIndex: "Index",
    IDBKeyRange: "KeyRange",
    IDBObjectStore: "ObjectStore",
    IDBOpenDBRequest: "OpenDBRequest",
    IDBRequest: "Request",
    IDBTransaction: "Transaction",
    IDBVersionChangeEvent: "VersionChangeEvent"
  },
  "dart:math": {
    ClientRect: "Rectangle"
  },
  "dart:svg": {
    SVGAElement: "AElement",
    SVGAngle: "Angle",
    SVGAnimateElement: "AnimateElement",
    SVGAnimateMotionElement: "AnimateMotionElement",
    SVGAnimateTransformElement: "AnimateTransformElement",
    SVGAnimatedAngle: "AnimatedAngle",
    SVGAnimatedBoolean: "AnimatedBoolean",
    SVGAnimatedEnumeration: "AnimatedEnumeration",
    SVGAnimatedInteger: "AnimatedInteger",
    SVGAnimatedLength: "AnimatedLength",
    SVGAnimatedLengthList: "AnimatedLengthList",
    SVGAnimatedNumber: "AnimatedNumber",
    SVGAnimatedNumberList: "AnimatedNumberList",
    SVGAnimatedPreserveAspectRatio: "AnimatedPreserveAspectRatio",
    SVGAnimatedRect: "AnimatedRect",
    SVGAnimatedString: "AnimatedString",
    SVGAnimatedTransformList: "AnimatedTransformList",
    SVGAnimationElement: "AnimationElement",
    SVGCircleElement: "CircleElement",
    SVGClipPathElement: "ClipPathElement",
    SVGDefsElement: "DefsElement",
    SVGDescElement: "DescElement",
    SVGDiscardElement: "DiscardElement",
    SVGElement: "SvgElement",
    SVGEllipseElement: "EllipseElement",
    SVGFEBlendElement: "FEBlendElement",
    SVGFEColorMatrixElement: "FEColorMatrixElement",
    SVGFEComponentTransferElement: "FEComponentTransferElement",
    SVGFECompositeElement: "FECompositeElement",
    SVGFEConvolveMatrixElement: "FEConvolveMatrixElement",
    SVGFEDiffuseLightingElement: "FEDiffuseLightingElement",
    SVGFEDisplacementMapElement: "FEDisplacementMapElement",
    SVGFEDistantLightElement: "FEDistantLightElement",
    SVGFEFloodElement: "FEFloodElement",
    SVGFEFuncAElement: "FEFuncAElement",
    SVGFEFuncBElement: "FEFuncBElement",
    SVGFEFuncGElement: "FEFuncGElement",
    SVGFEFuncRElement: "FEFuncRElement",
    SVGFEGaussianBlurElement: "FEGaussianBlurElement",
    SVGFEImageElement: "FEImageElement",
    SVGFEMergeElement: "FEMergeElement",
    SVGFEMergeNodeElement: "FEMergeNodeElement",
    SVGFEMorphologyElement: "FEMorphologyElement",
    SVGFEOffsetElement: "FEOffsetElement",
    SVGFEPointLightElement: "FEPointLightElement",
    SVGFESpecularLightingElement: "FESpecularLightingElement",
    SVGFESpotLightElement: "FESpotLightElement",
    SVGFETileElement: "FETileElement",
    SVGFETurbulenceElement: "FETurbulenceElement",
    SVGFilterElement: "FilterElement",
    SVGFilterPrimitiveStandardAttributes: "FilterPrimitiveStandardAttributes",
    SVGFitToViewBox: "FitToViewBox",
    SVGForeignObjectElement: "ForeignObjectElement",
    SVGGElement: "GElement",
    SVGGeometryElement: "GeometryElement",
    SVGGraphicsElement: "GraphicsElement",
    SVGImageElement: "ImageElement",
    SVGLength: "Length",
    SVGLengthList: "LengthList",
    SVGLineElement: "LineElement",
    SVGLinearGradientElement: "LinearGradientElement",
    SVGMarkerElement: "MarkerElement",
    SVGMaskElement: "MaskElement",
    SVGMatrix: "Matrix",
    SVGMetadataElement: "MetadataElement",
    SVGNumber: "Number",
    SVGNumberList: "NumberList",
    SVGPathElement: "PathElement",
    SVGPatternElement: "PatternElement",
    SVGPoint: "Point",
    SVGPointList: "PointList",
    SVGPolygonElement: "PolygonElement",
    SVGPolylineElement: "PolylineElement",
    SVGPreserveAspectRatio: "PreserveAspectRatio",
    SVGRadialGradientElement: "RadialGradientElement",
    SVGRect: "Rect",
    SVGRectElement: "RectElement",
    SVGSVGElement: "SvgSvgElement",
    SVGScriptElement: "ScriptElement",
    SVGSetElement: "SetElement",
    SVGStopElement: "StopElement",
    SVGStringList: "StringList",
    SVGStyleElement: "StyleElement",
    SVGSwitchElement: "SwitchElement",
    SVGSymbolElement: "SymbolElement",
    SVGTSpanElement: "TSpanElement",
    SVGTests: "Tests",
    SVGTextContentElement: "TextContentElement",
    SVGTextElement: "TextElement",
    SVGTextPathElement: "TextPathElement",
    SVGTextPositioningElement: "TextPositioningElement",
    SVGTitleElement: "TitleElement",
    SVGTransform: "Transform",
    SVGTransformList: "TransformList",
    SVGURIReference: "UriReference",
    SVGUnitTypes: "UnitTypes",
    SVGUseElement: "UseElement",
    SVGViewElement: "ViewElement",
    SVGZoomAndPan: "ZoomAndPan"
  },
  "dart:typed_data": {
    ArrayBuffer: "ByteBuffer",
    ArrayBufferView: "TypedData",
    DataView: "ByteData",
    Float32Array: "Float32List",
    Float64Array: "Float64List",
    Int16Array: "Int16List",
    Int32Array: "Int32List",
    Int8Array: "Int8List",
    Uint16Array: "Uint16List",
    Uint32Array: "Uint32List",
    Uint8Array: "Uint8List",
    Uint8ClampedArray: "Uint8ClampedList"
  },
  "dart:web_audio": {
    AnalyserNode: "AnalyserNode",
    AudioBuffer: "AudioBuffer",
    AudioBufferSourceNode: "AudioBufferSourceNode",
    AudioContext: "AudioContext",
    AudioDestinationNode: "AudioDestinationNode",
    AudioListener: "AudioListener",
    AudioNode: "AudioNode",
    AudioParam: "AudioParam",
    AudioProcessingEvent: "AudioProcessingEvent",
    BiquadFilterNode: "BiquadFilterNode",
    ChannelMergerNode: "ChannelMergerNode",
    ChannelSplitterNode: "ChannelSplitterNode",
    ConvolverNode: "ConvolverNode",
    DelayNode: "DelayNode",
    DynamicsCompressorNode: "DynamicsCompressorNode",
    GainNode: "GainNode",
    MediaElementAudioSourceNode: "MediaElementAudioSourceNode",
    MediaStreamAudioDestinationNode: "MediaStreamAudioDestinationNode",
    MediaStreamAudioSourceNode: "MediaStreamAudioSourceNode",
    OfflineAudioCompletionEvent: "OfflineAudioCompletionEvent",
    OfflineAudioContext: "OfflineAudioContext",
    OscillatorNode: "OscillatorNode",
    PannerNode: "PannerNode",
    PeriodicWave: "PeriodicWave",
    ScriptProcessorNode: "ScriptProcessorNode",
    WaveShaperNode: "WaveShaperNode"
  },
  "dart:web_gl": {
    ANGLEInstancedArrays: "AngleInstancedArrays",
    EXTBlendMinMax: "ExtBlendMinMax",
    EXTFragDepth: "ExtFragDepth",
    EXTShaderTextureLOD: "ExtShaderTextureLod",
    EXTTextureFilterAnisotropic: "ExtTextureFilterAnisotropic",
    OESElementIndexUint: "OesElementIndexUint",
    OESStandardDerivatives: "OesStandardDerivatives",
    OESTextureFloat: "OesTextureFloat",
    OESTextureFloatLinear: "OesTextureFloatLinear",
    OESTextureHalfFloat: "OesTextureHalfFloat",
    OESTextureHalfFloatLinear: "OesTextureHalfFloatLinear",
    OESVertexArrayObject: "OesVertexArrayObject",
    WebGLActiveInfo: "ActiveInfo",
    WebGLBuffer: "Buffer",
    WebGLCompressedTextureATC: "CompressedTextureAtc",
    WebGLCompressedTextureETC1: "CompressedTextureETC1",
    WebGLCompressedTexturePVRTC: "CompressedTexturePvrtc",
    WebGLCompressedTextureS3TC: "CompressedTextureS3TC",
    WebGLContextEvent: "ContextEvent",
    WebGLDebugRendererInfo: "DebugRendererInfo",
    WebGLDebugShaders: "DebugShaders",
    WebGLDepthTexture: "DepthTexture",
    WebGLDrawBuffers: "DrawBuffers",
    WebGLFramebuffer: "Framebuffer",
    WebGLLoseContext: "LoseContext",
    WebGLProgram: "Program",
    WebGLRenderbuffer: "Renderbuffer",
    WebGLRenderingContext: "RenderingContext",
    WebGLShader: "Shader",
    WebGLShaderPrecisionFormat: "ShaderPrecisionFormat",
    WebGLTexture: "Texture",
    WebGLUniformLocation: "UniformLocation",
    WebGLVertexArrayObjectOES: "VertexArrayObject"
  },
  "dart:web_sql": {
    Database: "SqlDatabase",
    SQLError: "SqlError",
    SQLResultSet: "SqlResultSet",
    SQLResultSetRowList: "SqlResultSetRowList",
    SQLTransaction: "SqlTransaction"
  }
};

// src/engine/emitter/packagejs/library.ts
import { dirname, relative, basename } from "path";
var IMPORT_OPEN = "\uE000";
var IMPORT_SEP = "\uE001";
var IMPORT_CLOSE = "\uE002";
var SUPPORT_OPEN = "\uE003";
var SUPPORT_CLOSE = "\uE004";
var CORE_NAMES = /* @__PURE__ */ new Set([
  "bool",
  "num",
  "int",
  "double",
  "String",
  "List",
  "Map",
  "Set",
  "Iterable",
  "Object",
  "Function",
  "Future",
  "DateTime",
  "BigInt",
  "Never",
  "Null",
  "Record",
  "Type",
  "Symbol",
  "Error",
  "Exception",
  "RegExp",
  "Duration",
  "Pattern",
  "Comparable",
  "Iterator",
  "JS",
  "anonymous",
  "staticInterop",
  "allowInterop",
  "dynamic",
  "void"
]);
var LibraryPlan = class {
  constructor(outputPath) {
    this.outputPath = outputPath;
    this.declared = /* @__PURE__ */ new Set();
    this.uris = [];
    this.uriIndex = /* @__PURE__ */ new Map();
    this.supports = [];
    this.supportIndex = /* @__PURE__ */ new Map();
  }
  /** Records a top-level name this library declares. */
  declare(name) {
    this.declared.add(name);
  }
  isDeclared(name) {
    return this.declared.has(name);
  }
  /** A use of `name` exported by the Dart library at `uri`. */
  importName(uri, name) {
    let index = this.uriIndex.get(uri);
    if (index === void 0) {
      index = this.uris.length;
      this.uris.push(uri);
      this.uriIndex.set(uri, index);
    }
    return `${IMPORT_OPEN}${index}${IMPORT_SEP}${name}${IMPORT_CLOSE}`;
  }
  /** A use of `name` declared by another generated library. */
  siblingName(targetOutputPath, name) {
    return this.importName(siblingUri(this.outputPath, targetOutputPath), name);
  }
  /** A use of a backend-minted support declaration. */
  support(declaration) {
    let index = this.supportIndex.get(declaration.key);
    if (index === void 0) {
      index = this.supports.length;
      this.supports.push(declaration);
      this.supportIndex.set(declaration.key, index);
    }
    return `${SUPPORT_OPEN}${index}${SUPPORT_CLOSE}`;
  }
  /**
   * Resolves every token in `body`, appends the support section, and returns
   * the import directives plus the final body.
   */
  finish(body, supportHeader) {
    const requestedImportNames = /* @__PURE__ */ new Set();
    for (const match of body.matchAll(tokenPattern())) {
      requestedImportNames.add(match[2]);
    }
    const supportNames = this.allocateSupportNames(requestedImportNames);
    const supportSection = [];
    const used = this.supports.map((declaration, index) => ({ declaration, name: supportNames[index], index })).filter(({ index }) => body.includes(`${SUPPORT_OPEN}${index}${SUPPORT_CLOSE}`));
    if (used.length > 0) {
      supportSection.push("", ...supportHeader, ...supportHeader.length > 0 ? [""] : []);
      const ordered2 = used.sort((a, b) => a.name.localeCompare(b.name));
      for (const { declaration, name } of ordered2) {
        supportSection.push(...declaration.render(name), "");
      }
    }
    let text = [body, ...supportSection].join("\n");
    text = text.replace(
      new RegExp(`${SUPPORT_OPEN}(\\d+)${SUPPORT_CLOSE}`, "g"),
      (_, index) => supportNames[Number(index)]
    );
    const local = /* @__PURE__ */ new Set([...this.declared, ...supportNames]);
    const urisByName = /* @__PURE__ */ new Map();
    for (const match of text.matchAll(tokenPattern())) {
      const index = Number(match[1]);
      let set = urisByName.get(match[2]);
      if (!set) urisByName.set(match[2], set = /* @__PURE__ */ new Set());
      set.add(index);
    }
    const shown = /* @__PURE__ */ new Map();
    const prefixed = /* @__PURE__ */ new Set();
    const prefixedNames = /* @__PURE__ */ new Set();
    for (const [name, uris] of urisByName) {
      const clash = uris.size > 1 || local.has(name) || CORE_NAMES.has(name);
      for (const index of uris) {
        if (clash) {
          prefixed.add(index);
          prefixedNames.add(`${index}\0${name}`);
        } else {
          let set = shown.get(index);
          if (!set) shown.set(index, set = /* @__PURE__ */ new Set());
          set.add(name);
        }
      }
    }
    const unprefixedImported = new Set(
      [...shown.values()].flatMap((names) => [...names])
    );
    const prefixes = /* @__PURE__ */ new Map();
    const takenPrefixes = /* @__PURE__ */ new Set([
      ...local,
      ...unprefixedImported,
      ...CORE_NAMES
    ]);
    for (const index of [...prefixed].sort(
      (a, b) => this.uris[a].localeCompare(this.uris[b])
    )) {
      const base = prefixBase(this.uris[index]);
      let candidate = base;
      for (let n = 2; takenPrefixes.has(candidate) || DART_RESERVED_WORDS.has(candidate); n++) {
        candidate = `${base}${n}`;
      }
      takenPrefixes.add(candidate);
      prefixes.set(index, candidate);
    }
    text = text.replace(tokenPattern(), (_, rawIndex, name) => {
      const index = Number(rawIndex);
      return prefixedNames.has(`${index}\0${name}`) ? `${prefixes.get(index)}.${name}` : name;
    });
    const imports = [];
    const ordered = this.uris.map((uri, index) => ({ uri, index })).filter(({ index }) => shown.has(index) || prefixes.has(index)).sort((a, b) => importRank(a.uri) - importRank(b.uri) || a.uri.localeCompare(b.uri));
    for (const { uri, index } of ordered) {
      const names = shown.get(index);
      if (names) {
        imports.push(`import '${uri}' show ${[...names].sort().join(", ")};`);
      }
      const prefix = prefixes.get(index);
      if (prefix) {
        if (uri === "dart:core") imports.push("import 'dart:core';");
        imports.push(`import '${uri}' as ${prefix};`);
      }
    }
    return { imports, body: text };
  }
  /** Whether a support token in emitted text names a dynamic-like typedef. */
  supportIsDynamicLike(token) {
    const match = token.match(new RegExp(`^${SUPPORT_OPEN}(\\d+)${SUPPORT_CLOSE}$`));
    return match ? this.supports[Number(match[1])].dynamicLike : false;
  }
  allocateSupportNames(requestedImportNames) {
    const taken = (name) => this.declared.has(name) || CORE_NAMES.has(name) || requestedImportNames.has(name) || DART_RESERVED_WORDS.has(name);
    const names = new Array(this.supports.length);
    const groups = /* @__PURE__ */ new Map();
    this.supports.forEach((declaration, index) => {
      const group = groups.get(declaration.base) ?? [];
      group.push(index);
      groups.set(declaration.base, group);
    });
    const used = /* @__PURE__ */ new Set();
    for (const base of [...groups.keys()].sort()) {
      const members = groups.get(base).sort((a, b) => this.supports[a].key.localeCompare(this.supports[b].key));
      if (members.length === 1 && !taken(base) && !used.has(base)) {
        names[members[0]] = base;
        used.add(base);
        continue;
      }
      for (const index of members) {
        let length = 6;
        let candidate = `${base}_${stableHash(this.supports[index].key, length)}`;
        while ((used.has(candidate) || taken(candidate)) && length < 8) {
          length++;
          candidate = `${base}_${stableHash(this.supports[index].key, length)}`;
        }
        for (let n = 2; used.has(candidate) || taken(candidate); n++) {
          candidate = `${base}_${stableHash(this.supports[index].key, 8)}_${n}`;
        }
        names[index] = candidate;
        used.add(candidate);
      }
    }
    return names;
  }
};
function tokenPattern() {
  return new RegExp(`${IMPORT_OPEN}(\\d+)${IMPORT_SEP}([^${IMPORT_CLOSE}]+)${IMPORT_CLOSE}`, "g");
}
function isSupportToken(text) {
  return new RegExp(`^${SUPPORT_OPEN}\\d+${SUPPORT_CLOSE}$`).test(text);
}
function importRank(uri) {
  if (uri.startsWith("dart:")) return 0;
  if (uri.startsWith("package:")) return 1;
  return 2;
}
function prefixBase(uri) {
  const stem = uri.startsWith("dart:") ? uri.slice("dart:".length) : basename(uri).replace(/\.dart$/, "");
  const words = stem.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const safe = words || "lib";
  return /^[0-9]/.test(safe) ? `lib_${safe}` : safe;
}
function siblingUri(fromOutput, toOutput) {
  const path = relative(dirname(fromOutput), toOutput).split("\\").join("/");
  return path.startsWith(".") ? path : path;
}
function supportBase(prefix, text) {
  const words = pascalWords(text);
  return `${prefix}${words || "Type"}`;
}

// src/engine/emitter/packagejs/types.ts
function sharedName(context, name) {
  if (!context.shared) return void 0;
  context.shared.used.add(name);
  return context.plan.siblingName(context.shared.path, name);
}
function withSubstitution(context, typeParams, args, argContext) {
  if (!typeParams || typeParams.length === 0) return context;
  const scope = new Map(context.scope);
  typeParams.forEach((parameter, index) => {
    const arg = args?.[index] ?? parameter.default;
    scope.set(parameter.name, arg ? emit(arg, argContext).text : "dynamic");
  });
  return { ...context, scope };
}
function withTypeParams(context, typeParams) {
  if (!typeParams || typeParams.length === 0) return context;
  const scope = new Map(context.scope);
  for (const parameter of typeParams) {
    scope.set(parameter.name, parameter.dartName ?? parameter.name);
  }
  return { ...context, scope };
}
function emitTypeParams(typeParams, context) {
  if (!typeParams || typeParams.length === 0) return "";
  const parts = typeParams.map((parameter) => {
    const name = parameter.dartName ?? parameter.name;
    if (!parameter.constraint) return name;
    const bound = emit(parameter.constraint, context);
    const classLike = !bound.admitsNull && parameter.constraint.reference?.resolvedFQN !== void 0;
    if (!classLike) {
      const original = parameter.constraint.originalText ?? bound.text;
      return `${name} /* extends ${original.replace(/\*\//g, "* /")} */`;
    }
    return `${name} extends ${bound.text}`;
  });
  return `<${parts.join(", ")}>`;
}
function emitType(type, context) {
  return emit(type, context).text;
}
function typeAdmitsNull(type, context) {
  return emit(type, context).admitsNull;
}
function core(name, context) {
  return context.shadowed?.has(name) ? context.plan.importName("dart:core", name) : name;
}
function nullable(base, isNullable) {
  if (!isNullable || base.admitsNull) return base;
  return { text: `${base.text}?`, admitsNull: true };
}
function plain(text) {
  return { text, admitsNull: false };
}
var SUPPORT_MARK = "\uE003";
var DYNAMIC = { text: "dynamic", admitsNull: true };
function emit(type, context) {
  switch (type.kind) {
    case "any" /* Any */:
    case "unknown" /* Unknown */:
      return DYNAMIC;
    case "never" /* Never */:
      return type.isNullable ? { text: "Null", admitsNull: true } : plain("Never");
    case "null" /* Null */:
    case "undefined" /* Undefined */:
      return { text: "Null", admitsNull: true };
    case "void" /* Void */:
      return { text: "void", admitsNull: true };
    case "string" /* String */:
    case "stringLiteral" /* StringLiteral */:
      return nullable(plain(core("String", context)), type.isNullable);
    case "number" /* Number */:
    case "numberLiteral" /* NumberLiteral */:
      return nullable(plain(core("num", context)), type.isNullable);
    case "boolean" /* Boolean */:
    case "booleanLiteral" /* BooleanLiteral */:
      return nullable(plain(core("bool", context)), type.isNullable);
    case "bigInt" /* BigInt */:
      return nullable(bigIntSupport(context), type.isNullable);
    case "object" /* Object */:
      return nullable(plain(core("Object", context)), type.isNullable);
    case "array" /* Array */:
      return nullable(
        plain(`${core("List", context)}<${emit(type.elementType, context).text}>`),
        type.isNullable
      );
    case "tuple" /* Tuple */:
      return nullable(tuple(type, context), type.isNullable);
    case "function" /* Function */:
      return nullable(functionType(type, context), type.isNullable);
    case "union" /* Union */:
      return union(type, context);
    case "intersection" /* Intersection */:
      return intersection(type, context);
    case "typeReference" /* TypeReference */:
      return reference(type, context);
    case "unsupported" /* Unsupported */:
      if (type.aliasName) return { text: type.aliasName, admitsNull: true };
      return fallback(
        context,
        "Unrepresentable",
        type.originalText ?? type.unsupportedReason ?? "unknown",
        `Unrepresentable in Dart: ${codeSpan(type.originalText ?? "unknown")}`
      );
    default:
      return fallback(
        context,
        "Unrepresentable",
        type.originalText ?? type.kind,
        `Unrepresentable in Dart: ${codeSpan(type.originalText ?? type.kind)}`
      );
  }
}
function tuple(type, context) {
  const members = (type.tupleTypes ?? []).map((member) => emit(member, context));
  const unique = [...new Set(members.map((member) => member.text))];
  const list = core("List", context);
  if (unique.length === 1) return plain(`${list}<${unique[0]}>`);
  if (unique.length === 0) return plain(`${list}<dynamic>`);
  return plain(`${list}<${core("Object", context)}?>`);
}
function functionType(type, context) {
  const inner = withTypeParams(context, type.typeParams);
  const returnType = type.returnType ? emit(type.returnType, inner).text : "void";
  const required = [];
  const optional = [];
  for (const parameter of type.parameters ?? []) {
    if (parameter.isRest) {
      const element = restElement(parameter, inner);
      for (let index = 0; index < REST_ARITY; index++) optional.push(element);
      continue;
    }
    const text = emit(parameter.type, inner).text;
    (parameter.isOptional ? optional : required).push(text);
  }
  let parameters = required.join(", ");
  if (optional.length > 0) {
    parameters += `${parameters ? ", " : ""}[${optional.join(", ")}]`;
  }
  const typeParams = emitTypeParams(type.typeParams, inner);
  return plain(`${returnType} Function${typeParams}(${parameters})`);
}
var REST_ARITY = 5;
function restElement(parameter, context) {
  const type = parameter.type;
  if (type.kind === "array" /* Array */ && type.elementType) {
    return emit(type.elementType, context).text;
  }
  if (type.kind === "typeReference" /* TypeReference */ && (type.name === "Array" || type.name === "ReadonlyArray") && type.genericArgs?.length === 1) {
    return emit(type.genericArgs[0], context).text;
  }
  return "dynamic";
}
function arrayElement(type) {
  if (type.kind === "array" /* Array */) return type.elementType;
  if (type.kind === "typeReference" /* TypeReference */ && (type.host?.qualifiedName === "Array" || type.host?.qualifiedName === "ReadonlyArray")) {
    return type.genericArgs?.[0];
  }
  return void 0;
}
function listUpperBound(members, context) {
  if (members.length < 2) return void 0;
  const elements = members.map(arrayElement);
  if (elements.some((element) => !element)) return void 0;
  const list = core("List", context);
  const texts = [...new Set(elements.map((element) => emit(element, context).text))];
  if (texts.length === 1) return `${list}<${texts[0]}>`;
  const inner = listUpperBound(elements, context);
  return `${list}<${inner ?? "dynamic"}>`;
}
function unionShape(type, context) {
  const members = type.unionTypes ?? [];
  const hasVoid = members.some((member) => member.kind === "void" /* Void */);
  const concrete = members.filter((member) => member.kind !== "void" /* Void */);
  if (concrete.length === 0) return { kind: "single", emitted: { text: "void", admitsNull: true } };
  const emitted = concrete.map((member) => emit(member, context));
  const isNullable = type.isNullable || hasVoid || emitted.some((member) => member.admitsNull);
  const unique = [...new Set(emitted.map((member) => stripNullable(member.text)))];
  if (unique.length === 1) {
    const only = emitted.find((member) => stripNullable(member.text) === unique[0]);
    if (only.admitsNull && !only.text.endsWith("?")) return { kind: "single", emitted: only };
    return { kind: "single", emitted: nullable(plain(unique[0]), isNullable) };
  }
  if (unique.includes("dynamic")) return { kind: "single", emitted: DYNAMIC };
  const listBound = listUpperBound(concrete, context);
  if (listBound) return { kind: "single", emitted: nullable(plain(listBound), isNullable) };
  const described = unique.map((text) => {
    if (!text.includes(SUPPORT_MARK)) return plainText(text);
    const member = concrete.find((_, index) => stripNullable(emitted[index].text) === text);
    return member?.originalText ?? member?.name ?? plainText(text);
  });
  return { kind: "degraded", members: described, display: described.join(" | ") };
}
function aliasUnionDisplay(type, context) {
  if (type.kind !== "union" /* Union */) return void 0;
  const shape = unionShape(type, context);
  return shape.kind === "degraded" ? shape.display : void 0;
}
function union(type, context) {
  const shape = unionShape(type, context);
  if (shape.kind === "single") return shape.emitted;
  const token = context.plan.support({
    key: `union:${shape.display}`,
    base: unionBase(shape.members),
    dynamicLike: true,
    render: (name) => [
      `/// A JavaScript union of ${codeSpan(shape.display)}; Dart has no union types.`,
      `typedef ${name} = dynamic;`
    ]
  });
  return { text: token, admitsNull: true };
}
function unionBase(members) {
  const words = members.map((member) => supportBase("", member));
  const joined = words.join("Or");
  return joined.length > 60 ? `${words[0]}OrOther` : joined || "Union";
}
function plainText(text) {
  return text.replace(/\uE000\d+\uE001([^\uE002]+)\uE002/g, "$1").replace(/\uE003\d+\uE004/g, "\u2026");
}
function stripNullable(text) {
  return text.endsWith("?") ? text.slice(0, -1) : text;
}
function intersection(type, context) {
  const members = (type.intersectionTypes ?? []).map((member) => emit(member, context));
  const unique = [...new Set(members.map((member) => member.text))];
  const first = members[0] ?? DYNAMIC;
  const base = nullable(first, type.isNullable);
  if (unique.length <= 1) return base;
  const comment = [
    ...new Set(
      (type.intersectionTypes ?? []).map(
        (member, index) => members[index].text.includes(SUPPORT_MARK) ? member.originalText ?? member.name : plainText(members[index].text)
      )
    )
  ].join("&");
  return { text: `${base.text} /* ${comment.replace(/\*\//g, "* /")} */`, admitsNull: base.admitsNull };
}
function reference(type, context) {
  if (!type.reference && !type.host) {
    const scoped = context.scope.get(type.name);
    if (scoped) {
      const admits = scoped === "dynamic" || scoped.endsWith("?") || isSupportToken(scoped) || scoped === "void";
      return admits ? { text: scoped, admitsNull: true } : nullable(plain(scoped), type.isNullable);
    }
  }
  const target = type.reference?.resolvedFQN ? context.index.typeTarget(type.reference.resolvedFQN) : void 0;
  if (target?.kind === "enumValue") return nullable(plain(target.dartType), type.isNullable);
  if (target?.kind === "type") {
    const name = target.file !== context.file ? context.plan.siblingName(
      context.index.outputPathOfFile.get(target.file),
      target.dartName
    ) : context.shadowed?.has(target.dartName) && context.outputPath ? context.plan.siblingName(context.outputPath, target.dartName) : target.dartName;
    const args = padTypeArguments(type.genericArgs ?? [], target.typeParams, context);
    const aliasNullable = target.facet.ir.kind === "typeAlias" && irAdmitsNull(target.facet.ir.type, context, /* @__PURE__ */ new Set([target.fqn]));
    if (aliasNullable) return { text: name, admitsNull: true };
    return nullable(plain(`${name}${args}`), type.isNullable);
  }
  if (type.host) return host(type, type.host, context);
  const written = type.reference?.writtenName ?? type.name;
  return fallback(
    context,
    "",
    written,
    `Unresolved TypeScript reference ${codeSpan(type.originalText ?? written)}; its declaration is not part of this build.`
  );
}
function irAdmitsNull(type, context, seen) {
  if (type.isNullable) return true;
  switch (type.kind) {
    case "any" /* Any */:
    case "unknown" /* Unknown */:
    case "void" /* Void */:
    case "null" /* Null */:
    case "undefined" /* Undefined */:
    case "unsupported" /* Unsupported */:
      return true;
    case "union" /* Union */: {
      const members = (type.unionTypes ?? []).filter((member) => member.kind !== "void" /* Void */);
      if ((type.unionTypes ?? []).some((member) => member.kind === "void" /* Void */)) return true;
      if (members.some((member) => irAdmitsNull(member, context, seen))) return true;
      const kinds = new Set(members.map((member) => scalarKind(member) ?? JSON.stringify(member.reference?.resolvedFQN ?? member.originalText)));
      return kinds.size > 1;
    }
    case "typeReference" /* TypeReference */: {
      const fqn = type.reference?.resolvedFQN;
      if (!fqn) {
        if (type.host) return false;
        return !context.scope.has(type.name);
      }
      const target = context.index.typeTarget(fqn);
      if (!target) return true;
      if (target.kind !== "type" || target.facet.ir.kind !== "typeAlias") return false;
      if (seen.has(fqn)) return true;
      seen.add(fqn);
      return irAdmitsNull(target.facet.ir.type, context, seen);
    }
    default:
      return false;
  }
}
function scalarKind(type) {
  switch (type.kind) {
    case "string" /* String */:
    case "stringLiteral" /* StringLiteral */:
      return "String";
    case "number" /* Number */:
    case "numberLiteral" /* NumberLiteral */:
      return "num";
    case "boolean" /* Boolean */:
    case "booleanLiteral" /* BooleanLiteral */:
      return "bool";
    default:
      return void 0;
  }
}
function padTypeArguments(args, typeParams, context) {
  if (typeParams.length === 0) return "";
  const emitted = typeParams.map((parameter, index) => {
    const arg = args[index] ?? parameter.default;
    return arg ? emit(arg, context).text : "dynamic";
  });
  if (args.length === 0) return "";
  return `<${emitted.join(", ")}>`;
}
function bigIntSupport(context) {
  const shared = sharedName(context, "JSBigInt");
  if (shared) return plain(shared);
  const token = context.plan.support({
    key: "host:bigint",
    base: "JSBigInt",
    dynamicLike: false,
    render: (name) => [
      "/// A JavaScript `bigint`. Dart's `BigInt` is a different runtime type.",
      `typedef ${name} = Object;`
    ]
  });
  return plain(token);
}
var DOM_LIBRARY = /^lib\.(dom|webworker)/;
var ES_LIBRARY = /^lib\.(es|dom)/;
function isPlatformType(identity) {
  return platformMapping(identity) !== void 0;
}
function platformMapping(identity) {
  if (identity.family !== "typescript") return void 0;
  for (const [library, names] of Object.entries(BROWSER_TYPES)) {
    const dartName2 = names[identity.qualifiedName];
    if (!dartName2) continue;
    const pattern = library === "dart:typed_data" || library === "dart:math" ? ES_LIBRARY : DOM_LIBRARY;
    if (identity.libraries.some((file) => pattern.test(file))) {
      return { library, name: dartName2 };
    }
  }
  return void 0;
}
function host(type, identity, context) {
  const args = type.genericArgs ?? [];
  const arg = (index) => args[index] ? emit(args[index], context).text : "dynamic";
  if (identity.family === "typescript") {
    switch (identity.qualifiedName) {
      case "Array":
      case "ReadonlyArray":
        return nullable(plain(`${core("List", context)}<${arg(0)}>`), type.isNullable);
      case "Date":
        return nullable(plain(core("DateTime", context)), type.isNullable);
      case "Boolean":
        return nullable(plain(core("bool", context)), type.isNullable);
      case "Number":
        return nullable(plain(core("num", context)), type.isNullable);
      case "String":
        return nullable(plain(core("String", context)), type.isNullable);
      case "Object":
        return nullable(plain(core("Object", context)), type.isNullable);
      case "Function":
        return nullable(plain(core("Function", context)), type.isNullable);
      case "Promise":
      case "PromiseLike":
        return nullable(plain(`${promiseSupport(context)}<${arg(0)}>`), type.isNullable);
      // Verified utility lowerings (`E-36`, S5.18): the runtime value is the
      // argument itself; only optionality/readonly-ness is lost.
      case "Partial":
      case "Required":
      case "Readonly":
        if (args[0]) return nullable(emit(args[0], context), type.isNullable);
        break;
      case "NonNullable":
        if (args[0]) {
          const inner = emit(args[0], context);
          return nullable(plain(stripNullable(inner.text)), type.isNullable);
        }
        break;
    }
    const mapped = platformMapping(identity);
    if (mapped) {
      return nullable(
        plain(context.plan.importName(mapped.library, mapped.name)),
        type.isNullable
      );
    }
  }
  const written = type.originalText ?? identity.qualifiedName;
  return fallback(
    context,
    "",
    written,
    `TypeScript host type ${codeSpan(written)} (${identity.libraries[0] ?? identity.family}) has no Dart mapping.`
  );
}
function promiseSupport(context) {
  const shared = sharedName(context, "Promise");
  if (shared) return shared;
  const promiseToFuture = context.plan.importName(
    "package:js/js_util.dart",
    "promiseToFuture"
  );
  return context.plan.support({
    key: "host:Promise",
    base: "Promise",
    dynamicLike: false,
    render: (name) => [
      "/// A JavaScript `Promise`. Use `toFuture()` to await it from Dart.",
      `@JS(${dartString("Promise")})`,
      `abstract class ${name}<T> {}`,
      "",
      `extension ${name}ToFuture<T> on ${name}<T> {`,
      `  Future<T> toFuture() => ${promiseToFuture}<T>(this);`,
      "}"
    ]
  });
}
function fallback(context, prefix, text, doc) {
  const token = context.plan.support({
    key: `fallback:${text}`,
    base: supportBase(prefix, text),
    dynamicLike: true,
    render: (name) => [`/// ${doc}`, `typedef ${name} = dynamic;`]
  });
  return { text: token, admitsNull: true };
}

// src/engine/emitter/packagejs/declarations.ts
function dartName(binding) {
  return binding.dartName ?? binding.name;
}
function jsName(binding) {
  return binding.jsName ?? binding.name;
}
function isComputed(binding) {
  const name = jsName(binding);
  return name.startsWith("[") && name.endsWith("]");
}
function isRenamed(binding) {
  return dartName(binding) !== jsName(binding);
}
function isTopLevelStatic(member, options) {
  if (!member.isStatic) return false;
  return isRenamed(member) || options.inherited.has(jsName(member));
}
function unquote(name) {
  const match = name.match(/^(['"`])([\s\S]*)\1$/);
  return match ? match[2] : name;
}
function jsPath(facet, context) {
  const segments = facet.origin.scopes.flatMap((scope) => {
    if (scope.kind === "global") return [];
    if (scope.kind === "namespace") return scope.jsSegments.map(unquote);
    return [scope.specifier];
  });
  const isGlobal = facet.origin.scopes.some((scope) => scope.kind === "global");
  const root = !isGlobal && facet.origin.fileIsModule ? context?.jsRoot : void 0;
  return [...root ? [root] : [], ...segments, unquote(jsName(facet.ir))].join(".");
}
function jsAnnotation(path, indent = "") {
  return `${indent}@JS(${dartString(path)})`;
}
function memberAnnotation(binding, indent = "  ") {
  return isRenamed(binding) ? [jsAnnotation(unquote(jsName(binding)), indent)] : [];
}
function computedComment(binding, indent = "  ") {
  return `${indent}// Unsupported computed JavaScript member preserved in IR: ${jsName(binding).replace(/\r?\n/g, " ")}`;
}
function docs(node, indent = "") {
  return dartDocLines(node.jsDoc, indent);
}
function parameterName(parameter) {
  if (parameter.bindingPattern) {
    const names = [
      ...parameter.bindingPattern.text.matchAll(/(?:^|[{,[])\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)/g)
    ].map((match) => match[1]);
    const joined = names.join("_").replace(/^_+/, "");
    if (joined && /^[A-Za-z$][\w$]*$/.test(joined)) return joined;
  }
  return dartName(parameter);
}
function formatParameters(parameters, context, modifier = "") {
  const required = [];
  const optional = [];
  for (const parameter of parameters) {
    if (parameter.isRest) {
      const element = restElement(parameter, context);
      const name = parameterName(parameter);
      for (let index = 1; index <= REST_ARITY; index++) {
        optional.push(`${modifier}${element} ${name}${index}`);
      }
      continue;
    }
    const text = `${modifier}${emitType(parameter.type, context)} ${parameterName(parameter)}`;
    (parameter.isOptional || optional.length > 0 ? optional : required).push(text);
  }
  const parts = [];
  if (required.length > 0) parts.push(required.join(", "));
  if (optional.length > 0) parts.push(`[${optional.join(", ")}]`);
  return parts.join(", ");
}
function nullableType(type, context) {
  const text = emitType(type, context);
  return typeAdmitsNull(type, context) ? text : `${text}?`;
}
function contextFor(member, options) {
  return member.isStatic && options.staticContext ? { ...options, context: options.staticContext } : options;
}
function covariantPrefix(member, options) {
  return !member.isStatic && options.inherited.has(jsName(member)) ? "covariant " : "";
}
function inheritedValueType(inherited) {
  const member = inherited.member;
  if (inherited.kind === "method") return member.returnType;
  if (inherited.kind === "setter") return member.parameter?.type;
  return member.type;
}
function isTopLike(text, context) {
  return text === "dynamic" || text === "void" || text === "Object?" || context.plan.supportIsDynamicLike(text);
}
function provableSubtype(child, childContext, parent, parentContext) {
  const c = emitType(child, childContext);
  const p = emitType(parent, parentContext);
  if (c === p || isTopLike(p, parentContext) || c === "Never") return true;
  const parentNullable = typeAdmitsNull(parent, parentContext);
  const childNullable = typeAdmitsNull(child, childContext);
  if (childNullable && !parentNullable) return false;
  const strip = (text) => text.endsWith("?") ? text.slice(0, -1) : text;
  if (strip(c) === strip(p)) return true;
  if (strip(p) === "Object" || strip(p) === "Function" && / Function[<(]/.test(c)) return true;
  if (c === "Null") return parentNullable;
  const childTarget = child.reference?.resolvedFQN;
  const parentTarget = parent.reference?.resolvedFQN;
  if (childTarget && parentTarget) {
    if (childTarget === parentTarget) return true;
    return reachesSupertype(childTarget, parentTarget, childContext);
  }
  return false;
}
function reachesSupertype(fromFQN, toFQN, context) {
  const seen = /* @__PURE__ */ new Set();
  const queue = [fromFQN];
  while (queue.length > 0) {
    const fqn = queue.shift();
    if (fqn === toFQN) return true;
    if (seen.has(fqn)) continue;
    seen.add(fqn);
    const target = context.index.typeTarget(fqn);
    if (target?.kind !== "type") continue;
    const ir = target.facet.ir;
    if (ir.kind !== "class" /* Class */ && ir.kind !== "interface" /* Interface */) continue;
    for (const parent of parentsOf(ir)) {
      if (parent.reference?.resolvedFQN) queue.push(parent.reference.resolvedFQN);
    }
  }
  return false;
}
function overrideValueType(member, type, text, options) {
  if (member.isStatic) return text;
  const ancestors = options.inherited.get(jsName(member));
  if (!ancestors) return text;
  const chain = [
    { type, context: options.context, optional: false },
    ...ancestors.flatMap((inherited) => {
      const parentType = inheritedValueType(inherited);
      return parentType ? [{
        type: parentType,
        context: inherited.context,
        optional: inherited.kind === "property" && inherited.member.isOptional
      }] : [];
    })
  ];
  for (let i = 0; i < chain.length; i++) {
    const ok = chain.slice(i + 1).every((later) => provableSubtype(chain[i].type, chain[i].context, later.type, later.context));
    if (!ok) continue;
    if (i === 0) return text;
    const chosen = chain[i];
    const chosenText = emitType(chosen.type, chosen.context);
    return chosen.optional && !typeAdmitsNull(chosen.type, chosen.context) ? `${chosenText}?` : chosenText;
  }
  return text;
}
function overrideParameters(method, context, options) {
  const modifier = covariantPrefix(method, options);
  const inherited = method.isStatic ? void 0 : options.inherited.get(jsName(method))?.[0];
  if (!inherited || inherited.kind !== "method") {
    return formatParameters(method.parameters, context, modifier);
  }
  const parent = inherited.member;
  const parentRequired = parent.parameters.filter((p) => !p.isOptional && !p.isRest).length;
  const entries = [];
  method.parameters.forEach((parameter, index) => {
    let entry = { parameter, context };
    if (!parameter.isRest) {
      const candidates = [
        { type: parameter.type, context },
        ...(options.inherited.get(jsName(method)) ?? []).filter((ancestor) => ancestor.kind === "method").flatMap((ancestor) => {
          const other = ancestor.member.parameters[index];
          return other && !other.isRest ? [{ type: other.type, context: ancestor.context }] : [];
        })
      ];
      const related = (a, b) => provableSubtype(a.type, a.context, b.type, b.context) || provableSubtype(b.type, b.context, a.type, a.context);
      const chosen = candidates.find(
        (candidate, i) => candidates.slice(i + 1).every((later) => related(candidate, later))
      ) ?? candidates[candidates.length - 1];
      if (chosen !== candidates[0]) {
        entry = { parameter: { ...parameter, type: chosen.type }, context: chosen.context };
      }
    }
    if (index >= parentRequired && !parameter.isOptional && !parameter.isRest) {
      entry = { ...entry, parameter: { ...entry.parameter, isOptional: true } };
    }
    entries.push(entry);
  });
  const ownHasRest = method.parameters.some((parameter) => parameter.isRest);
  if (!ownHasRest) {
    for (const extra of parent.parameters.slice(method.parameters.length)) {
      entries.push({ parameter: { ...extra, isOptional: !extra.isRest }, context: inherited.context });
    }
  }
  return formatMixedParameters(entries, modifier);
}
function formatMixedParameters(entries, modifier) {
  const required = [];
  const optional = [];
  const names = /* @__PURE__ */ new Set();
  for (const { parameter, context } of entries) {
    let name = parameterName(parameter);
    while (names.has(name)) name = `${name}_`;
    names.add(name);
    if (parameter.isRest) {
      const element = restElement(parameter, context);
      for (let index = 1; index <= REST_ARITY; index++) {
        optional.push(`${modifier}${element} ${name}${index}`);
      }
      continue;
    }
    const text = `${modifier}${emitType(parameter.type, context)} ${name}`;
    (parameter.isOptional || optional.length > 0 ? optional : required).push(text);
  }
  const parts = [];
  if (required.length > 0) parts.push(required.join(", "));
  if (optional.length > 0) parts.push(`[${optional.join(", ")}]`);
  return parts.join(", ");
}
function propertyType(property, context) {
  return property.isOptional ? nullableType(property.type, context) : emitType(property.type, context);
}
function emitProperty(property, sink, options) {
  if (isComputed(property)) {
    sink.body.push(computedComment(property));
    return;
  }
  const type = overrideValueType(
    property,
    property.type,
    propertyType(property, options.context),
    options
  );
  const name = dartName(property);
  if (isTopLevelStatic(property, options)) {
    const binding = `${options.ownerDartName}_${name}`;
    const path = `${options.ownerJsPath}.${unquote(jsName(property))}`;
    sink.topLevel.push(...docs(property), jsAnnotation(path), `external ${type} get ${binding};`);
    if (!property.isReadonly) {
      sink.topLevel.push(jsAnnotation(path), `external set ${binding}(${type} value);`);
    }
    return;
  }
  const target = isRenamed(property) ? sink.extension : sink.body;
  const statics = property.isStatic ? "static " : "";
  target.push(...docs(property, "  "));
  target.push(...memberAnnotation(property), `  external ${statics}${type} get ${name};`);
  if (!property.isReadonly) {
    target.push(
      ...memberAnnotation(property),
      `  external ${statics}set ${name}(${covariantPrefix(property, options)}${type} value);`
    );
  }
}
function emitMethod(method, sink, options) {
  if (isComputed(method)) {
    sink.body.push(computedComment(method));
    return;
  }
  const context = withTypeParams(options.context, method.typeParams);
  const returnType = overrideValueType(
    method,
    method.returnType,
    emitType(method.returnType, context),
    { ...options, context }
  );
  const signature = `${returnType} %NAME%${emitTypeParams(method.typeParams, context)}(${overrideParameters(method, context, options)})`;
  const name = dartName(method);
  if (isTopLevelStatic(method, options)) {
    const binding = `${options.ownerDartName}_${name}`;
    sink.topLevel.push(
      ...docs(method),
      jsAnnotation(`${options.ownerJsPath}.${unquote(jsName(method))}`),
      `external ${signature.replace("%NAME%", binding)};`
    );
    return;
  }
  const target = isRenamed(method) ? sink.extension : sink.body;
  const statics = method.isStatic ? "static " : "";
  target.push(
    ...docs(method, "  "),
    ...memberAnnotation(method),
    `  external ${statics}${signature.replace("%NAME%", name)};`
  );
}
function emitGetter(getter, sink, options) {
  if (isComputed(getter)) {
    sink.body.push(computedComment(getter));
    return;
  }
  const type = overrideValueType(
    getter,
    getter.type,
    emitType(getter.type, options.context),
    options
  );
  const name = dartName(getter);
  if (isTopLevelStatic(getter, options)) {
    sink.topLevel.push(
      ...docs(getter),
      jsAnnotation(`${options.ownerJsPath}.${unquote(jsName(getter))}`),
      `external ${type} get ${options.ownerDartName}_${name};`
    );
    return;
  }
  const target = isRenamed(getter) ? sink.extension : sink.body;
  target.push(
    ...docs(getter, "  "),
    ...memberAnnotation(getter),
    `  external ${getter.isStatic ? "static " : ""}${type} get ${name};`
  );
}
function emitSetter(setter, sink, options) {
  if (isComputed(setter)) {
    sink.body.push(computedComment(setter));
    return;
  }
  const parameterType = overrideValueType(
    setter,
    setter.parameter.type,
    emitType(setter.parameter.type, options.context),
    options
  );
  const parameter = `${covariantPrefix(setter, options)}${parameterType} ${parameterName(setter.parameter)}`;
  const name = dartName(setter);
  if (isTopLevelStatic(setter, options)) {
    sink.topLevel.push(
      jsAnnotation(`${options.ownerJsPath}.${unquote(jsName(setter))}`),
      `external set ${options.ownerDartName}_${name}(${parameter});`
    );
    return;
  }
  const target = isRenamed(setter) ? sink.extension : sink.body;
  target.push(
    ...memberAnnotation(setter),
    `  external ${setter.isStatic ? "static " : ""}set ${name}(${parameter});`
  );
}
function indexKey(type) {
  if (type.kind === "string" /* String */) return "String";
  if (type.kind === "number" /* Number */) return "num";
  return "Object";
}
function emitIndexSignatures(signatures, sink, context) {
  if (signatures.length === 0) return;
  const keys = [...new Set(signatures.map((signature) => indexKey(signature.keyType)))];
  const values = [...new Set(signatures.map((signature) => emitType(signature.valueType, context)))];
  const key = keys.length === 1 ? keys[0] : "Object";
  const value = values.length === 1 ? values[0] : "dynamic";
  sink.extension.push(`  external ${value} operator [](${key} key);`);
  if (signatures.every((signature) => !signature.isReadonly)) {
    sink.extension.push(`  external void operator []=(${key} key, ${value} value);`);
  }
}
function emitMembers(members, sink, options) {
  for (const property of members.properties) emitProperty(property, sink, contextFor(property, options));
  for (const method of members.methods) emitMethod(method, sink, contextFor(method, options));
  for (const getter of members.getAccessors) emitGetter(getter, sink, contextFor(getter, options));
  for (const setter of members.setAccessors) emitSetter(setter, sink, contextFor(setter, options));
}
function staticContextOf(typeParams, context) {
  if (typeParams.length === 0) return void 0;
  const scope = new Map(context.scope);
  for (const parameter of typeParams) scope.set(parameter.name, "dynamic");
  return { ...context, scope };
}
function heritageTarget(type, context) {
  const fqn = type.reference?.resolvedFQN;
  const target = fqn ? context.index.typeTarget(fqn) : void 0;
  return target?.kind === "type" ? target : void 0;
}
function implementable(type, context) {
  const target = heritageTarget(type, context);
  if (target) {
    const ir = target.facet.ir;
    if (ir.kind === "class" /* Class */) return true;
    return ir.kind === "interface" /* Interface */ && !(isCallableOnly(ir, target.facet) && !typedefCycle(target.facet, context));
  }
  if (type.host) {
    switch (type.host.qualifiedName) {
      case "Array":
      case "ReadonlyArray":
        return true;
      case "Partial":
      case "Required":
      case "Readonly":
        return !!type.genericArgs?.[0] && implementable(type.genericArgs[0], context);
    }
    return isPlatformType(type.host);
  }
  return false;
}
function provideDeep(declaration, provide, context, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(declaration)) return;
  seen.add(declaration);
  provide(declaration);
  for (const parent of parentsOf(declaration)) {
    const ir = heritageTarget(parent, context)?.facet.ir;
    if (ir && (ir.kind === "class" /* Class */ || ir.kind === "interface" /* Interface */)) {
      provideDeep(ir, provide, context, seen);
    }
  }
}
function typedefCycle(facet, context) {
  const start = facet;
  const seen = /* @__PURE__ */ new Set();
  const stack = [facet];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const fqn of typedefReferences(current)) {
      const next = context.index.typeFacet(fqn);
      if (!next) continue;
      if (next === start || next.ir === start.ir) return true;
      if (seen.has(next) || !emitsTypedef(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }
  return false;
}
function emitsTypedef(facet) {
  if (facet.ir.kind === "typeAlias" /* TypeAlias */) return true;
  return facet.ir.kind === "interface" /* Interface */ && isCallableOnly(facet.ir, facet);
}
function typedefReferences(facet) {
  const types = [];
  if (facet.ir.kind === "typeAlias" /* TypeAlias */) types.push(facet.ir.type);
  else if (facet.ir.kind === "interface" /* Interface */) {
    for (const signature of facet.ir.callSignatures) {
      types.push(signature.returnType, ...signature.parameters.map((parameter) => parameter.type));
    }
  }
  const result = [];
  const visit = (type) => {
    if (!type) return;
    if (type.reference?.resolvedFQN) result.push(type.reference.resolvedFQN);
    type.genericArgs?.forEach(visit);
    type.unionTypes?.forEach(visit);
    type.intersectionTypes?.forEach(visit);
    type.tupleTypes?.forEach(visit);
    visit(type.elementType);
    visit(type.returnType);
    type.parameters?.forEach((parameter) => visit(parameter.type));
  };
  types.forEach(visit);
  return result;
}
function originalOf(type) {
  return type.originalText ?? type.name;
}
var NATIVE_NAMES = new Set(
  Object.values(BROWSER_TYPES).flatMap((names) => Object.keys(names))
);
function nativeConflict(path, name) {
  return !path.includes(".") && NATIVE_NAMES.has(path) ? [{
    code: "NATIVE_NAME_CONFLICT",
    name,
    message: `${name} binds the bare global '${path}', which dart2js reserves for its native class; generate with --js-root <global> for module libraries`
  }] : [];
}
function providedProperties(declaration, context, into = /* @__PURE__ */ new Map(), seen = /* @__PURE__ */ new Set()) {
  if (seen.has(declaration)) return into;
  seen.add(declaration);
  const setters = new Set(declaration.setAccessors.filter((s) => !s.isStatic).map((s) => jsName(s)));
  for (const property of declaration.properties) {
    if (property.isStatic || into.has(jsName(property))) continue;
    into.set(jsName(property), {
      type: property.type,
      context,
      optional: property.isOptional,
      readonly: property.isReadonly
    });
  }
  for (const getter of declaration.getAccessors) {
    if (getter.isStatic || into.has(jsName(getter))) continue;
    into.set(jsName(getter), { type: getter.type, context, optional: false, readonly: !setters.has(jsName(getter)) });
  }
  for (const parent of parentsOf(declaration)) {
    const target = heritageTarget(parent, context);
    const ir = target?.facet.ir;
    if (!ir || ir.kind !== "class" /* Class */ && ir.kind !== "interface" /* Interface */) continue;
    const parentIR = ir;
    providedProperties(
      parentIR,
      withSubstitution({ ...context, scope: new Map(context.scope) }, parentIR.typeParams, parent.genericArgs, context),
      into,
      seen
    );
  }
  return into;
}
function structuralConformances(declaration, context) {
  const self = context.currentFQN;
  if (!self) return [];
  const provided = providedProperties(declaration, context);
  if (provided.size < 2) return [];
  const result = [];
  for (const shape of context.index.shapes()) {
    if (shape.fqn === self) continue;
    if (reachesSupertype(self, shape.fqn, context) || reachesSupertype(shape.fqn, self, context)) continue;
    const ir = shape.facet.ir;
    const required = [...providedProperties(ir, context)].map(([name2, property]) => ({
      name: name2,
      type: property.type,
      context: property.context,
      optional: property.optional,
      readonly: property.readonly
    }));
    if (required.length >= provided.size) continue;
    const fits = required.every((member) => {
      const own = provided.get(member.name);
      if (!own) return false;
      if (own.optional && !member.optional) return false;
      if (own.readonly && !member.readonly) return false;
      if (!member.readonly) {
        return emitType(own.type, own.context) === emitType(member.type, member.context);
      }
      return provableSubtype(own.type, own.context, member.type, member.context);
    });
    if (!fits) continue;
    const name = ir.dartName ?? ir.name;
    result.push({
      kind: "typeReference" /* TypeReference */,
      name,
      isNullable: false,
      originalText: name,
      reference: {
        writtenName: name,
        lookup: { kind: "checker", candidates: [shape.fqn] },
        resolvedFQN: shape.fqn,
        resolvedDartName: name
      }
    });
  }
  return result;
}
function computeHeritage(extendsTypes, implementsTypes, context, isConcreteClass) {
  const heritage = { implementsClauses: [], dropped: [], implemented: [] };
  for (const type of extendsTypes) {
    const target = heritageTarget(type, context);
    if (isConcreteClass && target?.facet.ir.kind === "class" /* Class */ && !heritage.extendsClause) {
      heritage.extendsClause = emitType(type, context);
    } else if (implementable(type, context) && (!isConcreteClass || target)) {
      heritage.implementsClauses.push(emitType(type, context));
      if (target && isConcreteClass) {
        heritage.implemented.push(target.facet.ir);
      }
    } else {
      heritage.dropped.push(`extends ${originalOf(type)}`);
    }
  }
  for (const type of implementsTypes) {
    const target = heritageTarget(type, context);
    if (implementable(type, context) && (!isConcreteClass || target)) {
      heritage.implementsClauses.push(emitType(type, context));
      if (target && isConcreteClass) {
        heritage.implemented.push(target.facet.ir);
      }
    } else {
      heritage.dropped.push(`implements ${originalOf(type)}`);
    }
  }
  heritage.implementsClauses = [...new Set(heritage.implementsClauses)];
  return heritage;
}
function heritageText(heritage) {
  let text = "";
  if (heritage.extendsClause) text += ` extends ${heritage.extendsClause}`;
  if (heritage.implementsClauses.length > 0) {
    text += ` implements ${heritage.implementsClauses.join(", ")}`;
  }
  return text;
}
function droppedHeritageComment(heritage) {
  return heritage.dropped.length > 0 ? [`// Heritage with no Dart class to inherit from: ${heritage.dropped.join(", ")}`] : [];
}
function instanceMemberKeys(declaration, context, seen = /* @__PURE__ */ new Set(), keyOf = jsName, includeStatic = false) {
  const keys = /* @__PURE__ */ new Set();
  if (seen.has(declaration)) return keys;
  seen.add(declaration);
  const add = (members) => {
    for (const member of members) {
      if (includeStatic || !member.isStatic) keys.add(keyOf(member));
    }
  };
  add(declaration.properties);
  add(declaration.methods);
  add(declaration.getAccessors);
  add(declaration.setAccessors);
  const parents = declaration.kind === "class" /* Class */ ? [declaration.extends, ...declaration.implements].filter((t) => !!t) : declaration.extends;
  for (const parent of parents) {
    const target = heritageTarget(parent, context);
    if (!target) continue;
    const ir = target.facet.ir;
    if (ir.kind === "class" /* Class */ || ir.kind === "interface" /* Interface */) {
      for (const key of instanceMemberKeys(ir, context, seen, keyOf, includeStatic)) {
        keys.add(key);
      }
    }
  }
  return keys;
}
function parentsOf(declaration) {
  return declaration.kind === "class" /* Class */ ? [declaration.extends, ...declaration.implements].filter((t) => !!t) : declaration.extends;
}
function inheritedMembers(declaration, context) {
  const result = /* @__PURE__ */ new Map();
  const seen = /* @__PURE__ */ new Set([declaration]);
  const visit = (owner, ownerContext) => {
    for (const parent of parentsOf(owner)) {
      const target = heritageTarget(parent, ownerContext);
      const ir = target?.facet.ir;
      if (!ir || ir.kind !== "class" /* Class */ && ir.kind !== "interface" /* Interface */) continue;
      const parentIR = ir;
      if (seen.has(parentIR)) continue;
      seen.add(parentIR);
      const parentContext = withSubstitution(
        { ...ownerContext, scope: new Map(ownerContext.scope) },
        parentIR.typeParams,
        parent.genericArgs,
        ownerContext
      );
      const add = (members, kind) => {
        for (const member of members) {
          if (member.isStatic) continue;
          const chain = result.get(jsName(member)) ?? [];
          chain.push({ member, kind, context: parentContext });
          result.set(jsName(member), chain);
        }
      };
      add(parentIR.properties, "property");
      add(parentIR.methods, "method");
      add(parentIR.getAccessors, "getter");
      add(parentIR.setAccessors, "setter");
      visit(parentIR, parentContext);
    }
  };
  visit(declaration, context);
  return result;
}
function memberContext(declaration, context) {
  const shadowed = instanceMemberKeys(declaration, context, /* @__PURE__ */ new Set(), dartName, true);
  return {
    context: { ...context, shadowed },
    inherited: inheritedMembers(declaration, context)
  };
}
function constructorLines(name, signatures, context, generative) {
  const lines = [];
  signatures.forEach((signature, index) => {
    const ctorName = index === 0 ? name : `${name}.overload${index + 1}`;
    const keyword = index === 0 && generative ? "" : "factory ";
    lines.push(
      ...docs(signature, "  "),
      `  external ${keyword}${ctorName}(${formatParameters(signature.parameters, context)});`
    );
  });
  return lines;
}
function inheritedConstructors(declaration, context, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(declaration)) return [];
  seen.add(declaration);
  const own = declaration.constructors.filter((ctor) => ctor.visibility !== "private");
  if (declaration.constructors.length > 0) return own;
  if (!declaration.extends) return [];
  const target = heritageTarget(declaration.extends, context);
  if (target?.facet.ir.kind !== "class" /* Class */) return [];
  return inheritedConstructors(target.facet.ir, context, seen);
}
function emitClass(facet, context) {
  const declaration = facet.ir;
  const name = dartName(declaration);
  const path = jsPath(facet, context);
  const inner = withTypeParams(context, declaration.typeParams);
  const typeParams = emitTypeParams(declaration.typeParams, inner);
  const typeArgs = typeArguments(declaration.typeParams);
  const heritage = computeHeritage(
    declaration.extends ? [declaration.extends] : [],
    [...declaration.implements, ...structuralConformances(declaration, inner)],
    inner,
    true
  );
  const sink = { body: [], extension: [], topLevel: [] };
  const scoped = memberContext(declaration, inner);
  const constructors = inheritedConstructors(declaration, inner);
  if (constructors.length > 0) {
    sink.body.push(...constructorLines(name, constructors, scoped.context, true));
  } else if (declaration.constructors.length === 0) {
    sink.body.push(`  external ${name}();`);
  }
  const options = {
    ownerDartName: name,
    ownerJsPath: path,
    context: scoped.context,
    inherited: scoped.inherited,
    staticContext: staticContextOf(declaration.typeParams, scoped.context)
  };
  emitMembers(declaration, sink, options);
  if (heritage.implemented.length > 0) {
    const provided = /* @__PURE__ */ new Set();
    const provide = (owner) => {
      for (const property of owner.properties) {
        if (property.isStatic) continue;
        provided.add(`get:${jsName(property)}`);
        if (!property.isReadonly) provided.add(`set:${jsName(property)}`);
      }
      for (const method of owner.methods) if (!method.isStatic) provided.add(`method:${jsName(method)}`);
      for (const getter of owner.getAccessors) if (!getter.isStatic) provided.add(`get:${jsName(getter)}`);
      for (const setter of owner.setAccessors) if (!setter.isStatic) provided.add(`set:${jsName(setter)}`);
    };
    provide(declaration);
    let superclass = declaration.extends ? heritageTarget(declaration.extends, inner) : void 0;
    const seenSuper = /* @__PURE__ */ new Set();
    while (superclass?.facet.ir.kind === "class" /* Class */ && !seenSuper.has(superclass.fqn)) {
      seenSuper.add(superclass.fqn);
      const superIR = superclass.facet.ir;
      provide(superIR);
      for (const parent of superIR.implements) {
        const implemented = heritageTarget(parent, inner)?.facet.ir;
        if (implemented && (implemented.kind === "interface" /* Interface */ || implemented.kind === "class" /* Class */)) {
          provideDeep(implemented, provide, inner);
        }
      }
      superclass = superIR.extends ? heritageTarget(superIR.extends, inner) : void 0;
    }
    for (const [key, chain] of options.inherited) {
      const roles = /* @__PURE__ */ new Map();
      for (const entry of chain) if (!roles.has(entry.kind)) roles.set(entry.kind, entry);
      for (const inherited of roles.values()) {
        if (isComputed(inherited.member)) continue;
        const restated = {
          ...options,
          context: { ...inherited.context, shadowed: scoped.context.shadowed },
          inherited: /* @__PURE__ */ new Map()
        };
        const set = { properties: [], methods: [], getAccessors: [], setAccessors: [] };
        if (inherited.kind === "property") {
          const property = inherited.member;
          const needGet = !provided.has(`get:${key}`);
          const needSet = !property.isReadonly && !provided.has(`set:${key}`);
          if (needGet && needSet) set.properties = [property];
          else if (needGet) set.properties = [{ ...property, isReadonly: true }];
          else if (needSet) {
            set.setAccessors = [{
              name: property.name,
              ...property.dartName ? { dartName: property.dartName } : {},
              ...property.jsName ? { jsName: property.jsName } : {},
              parameter: {
                name: "value",
                type: property.isOptional ? { ...property.type, isNullable: true } : property.type,
                isOptional: false,
                isRest: false
              },
              isStatic: false,
              isAbstract: false
            }];
          }
        }
        if (inherited.kind === "method" && !provided.has(`method:${key}`)) {
          set.methods = [inherited.member];
        }
        if (inherited.kind === "getter" && !provided.has(`get:${key}`)) {
          set.getAccessors = [inherited.member];
        }
        if (inherited.kind === "setter" && !provided.has(`set:${key}`)) {
          set.setAccessors = [inherited.member];
        }
        emitMembers(set, sink, restated);
        provide({
          properties: set.properties,
          methods: set.methods,
          getAccessors: set.getAccessors,
          setAccessors: set.setAccessors
        });
      }
    }
  }
  emitIndexSignatures(declaration.indexSignatures, sink, inner);
  const lines = [
    ...docs(declaration),
    ...droppedHeritageComment(heritage),
    jsAnnotation(path),
    `${declaration.isAbstract ? "abstract " : ""}class ${name}${typeParams}${heritageText(heritage)} {`,
    ...sink.body,
    "}"
  ];
  appendExtension(lines, name, typeParams, typeArgs, sink.extension);
  lines.push(...sink.topLevel);
  return {
    lines,
    diagnostics: [
      ...heritage.dropped.map((text) => ({
        code: "HERITAGE_DROPPED",
        name,
        message: `${name}: ${text} has no Dart class to inherit from`
      })),
      ...true ? nativeConflict(path, name) : []
    ]
  };
}
function typeArguments(typeParams) {
  return typeParams.length > 0 ? `<${typeParams.map((parameter) => dartName(parameter)).join(", ")}>` : "";
}
function appendExtension(lines, name, typeParams, typeArgs, members) {
  if (members.length === 0) return;
  lines.push(`extension ${name}Extension${typeParams} on ${name}${typeArgs} {`, ...members, "}");
}
function isCallableOnly(declaration, facet) {
  return facet.namespace !== "both" && declaration.callSignatures.length > 0 && declaration.properties.length === 0 && declaration.methods.length === 0 && declaration.getAccessors.length === 0 && declaration.setAccessors.length === 0 && declaration.constructSignatures.length === 0 && declaration.indexSignatures.length === 0;
}
function propertyBag(declaration, context, seen = /* @__PURE__ */ new Set()) {
  if (seen.has(declaration)) return { fields: [], omitted: [] };
  seen.add(declaration);
  if (declaration.methods.some((method) => !method.isStatic) || declaration.callSignatures.length > 0 || declaration.constructSignatures.length > 0) {
    return void 0;
  }
  const fields = [];
  const omitted = [];
  for (const property of declaration.properties) {
    if (property.isStatic) continue;
    if (isComputed(property) || isRenamed(property)) {
      omitted.push(jsName(property));
      continue;
    }
    fields.push({
      name: dartName(property),
      type: property.isOptional ? nullableType(property.type, context) : emitType(property.type, context),
      required: !property.isOptional
    });
  }
  for (const parent of declaration.extends) {
    const target = heritageTarget(parent, context);
    if (!target || target.facet.ir.kind !== "interface" /* Interface */) return void 0;
    const parentIR = target.facet.ir;
    const inherited = propertyBag(
      parentIR,
      withSubstitution(context, parentIR.typeParams, parent.genericArgs, context),
      seen
    );
    if (!inherited) return void 0;
    for (const field of inherited.fields) {
      if (!fields.some((existing) => existing.name === field.name)) fields.push(field);
    }
    omitted.push(...inherited.omitted);
  }
  return { fields, omitted };
}
function emitInterface(facet, context) {
  const declaration = facet.ir;
  const name = dartName(declaration);
  const inner = withTypeParams(context, declaration.typeParams);
  const typeParams = emitTypeParams(declaration.typeParams, inner);
  const typeArgs = typeArguments(declaration.typeParams);
  const hasRuntimeBinding = facet.namespace === "both";
  if (isCallableOnly(declaration, facet) && !typedefCycle(facet, context)) {
    const signatures = declaration.callSignatures;
    if (signatures.length === 1) {
      const signature = signatures[0];
      const fnContext = withTypeParams(inner, signature.typeParams);
      return {
        lines: [
          ...docs(declaration),
          `typedef ${name}${typeParams} = ${emitType(signature.returnType, fnContext)} Function${emitTypeParams(signature.typeParams, fnContext)}(${formatParameters(signature.parameters, fnContext)});`
        ],
        diagnostics: []
      };
    }
    return {
      lines: [
        ...docs(declaration),
        `/// Overloaded TypeScript call signatures; Dart function types cannot overload.`,
        `typedef ${name}${typeParams} = Function;`
      ],
      diagnostics: []
    };
  }
  const path = jsPath(facet, context);
  const heritage = computeHeritage(
    declaration.extends,
    structuralConformances(declaration, inner),
    inner,
    false
  );
  const sink = { body: [], extension: [], topLevel: [] };
  const scoped = memberContext(declaration, inner);
  if (hasRuntimeBinding) {
    sink.body.push(...constructorLines(name, declaration.constructSignatures, scoped.context, false));
  } else {
    const bag = propertyBag(declaration, scoped.context);
    if (bag && bag.fields.length + bag.omitted.length > 0) {
      const params = bag.fields.map(
        (field) => `${field.required ? "required " : ""}${field.type} ${field.name}`
      );
      if (bag.omitted.length > 0) {
        sink.body.push(`  // Not settable through the factory: ${bag.omitted.join(", ")}`);
      }
      sink.body.push(
        `  external factory ${name}(${params.length > 0 ? `{${params.join(", ")}}` : ""});`
      );
    }
  }
  const options = {
    ownerDartName: name,
    ownerJsPath: path,
    context: scoped.context,
    inherited: scoped.inherited,
    staticContext: staticContextOf(declaration.typeParams, scoped.context)
  };
  emitMembers(declaration, sink, options);
  const [firstCall, ...otherCalls] = declaration.callSignatures;
  const hasCallMember = scoped.context.shadowed?.has("call");
  if (firstCall && !hasCallMember) {
    const fnContext = withTypeParams(scoped.context, firstCall.typeParams);
    sink.body.push(
      `  external ${emitType(firstCall.returnType, fnContext)} call${emitTypeParams(firstCall.typeParams, fnContext)}(${formatParameters(firstCall.parameters, fnContext)});`
    );
    if (otherCalls.length > 0) {
      sink.body.push(`  // ${otherCalls.length} further call signature(s) omitted: Dart methods cannot overload.`);
    }
  }
  emitIndexSignatures(declaration.indexSignatures, sink, scoped.context);
  const header = hasRuntimeBinding ? [jsAnnotation(path)] : ["@JS()", "@anonymous"];
  const opening = `abstract class ${name}${typeParams}${heritageText(heritage)}`;
  const lines = [
    ...docs(declaration),
    ...droppedHeritageComment(heritage),
    ...header,
    ...sink.body.length === 0 ? [`${opening} {}`] : [`${opening} {`, ...sink.body, "}"]
  ];
  appendExtension(lines, name, typeParams, typeArgs, sink.extension);
  lines.push(...sink.topLevel);
  return {
    lines,
    diagnostics: [
      ...heritage.dropped.map((text) => ({
        code: "HERITAGE_DROPPED",
        name,
        message: `${name}: ${text} has no Dart class to inherit from`
      })),
      ...hasRuntimeBinding ? nativeConflict(path, name) : []
    ]
  };
}
function emitFunction(facet, context) {
  const declaration = facet.ir;
  const inner = withTypeParams(context, declaration.typeParams);
  return {
    lines: [
      ...docs(declaration),
      jsAnnotation(jsPath(facet, context)),
      `external ${emitType(declaration.returnType, inner)} ${dartName(declaration)}${emitTypeParams(declaration.typeParams, inner)}(${formatParameters(declaration.parameters, inner)});`
    ],
    diagnostics: []
  };
}
function emitVariable(facet, context) {
  const declaration = facet.ir;
  const name = dartName(declaration);
  const type = emitType(declaration.type, context);
  const annotation = jsAnnotation(jsPath(facet, context));
  const lines = [...docs(declaration), annotation, `external ${type} get ${name};`];
  if (!declaration.isConst && declaration.declarationKind !== "const") {
    lines.push(annotation, `external set ${name}(${type} value);`);
  }
  return { lines, diagnostics: [] };
}
function emitTypeAlias(facet, context) {
  const declaration = facet.ir;
  const name = dartName(declaration);
  const inner = withTypeParams(context, declaration.typeParams);
  const typeParams = emitTypeParams(declaration.typeParams, inner);
  if (declaration.type.kind === "unsupported" /* Unsupported */) {
    const original = declaration.type.originalText;
    return {
      lines: [
        ...docs(declaration),
        ...original ? [`/// Unrepresentable in Dart: ${codeSpan(original)}`] : [],
        `typedef ${name}${typeParams} = dynamic;`
      ],
      diagnostics: []
    };
  }
  if (typedefCycle(facet, context)) {
    const original = declaration.type.originalText ?? declaration.name;
    return {
      lines: [
        ...docs(declaration),
        `/// Recursive TypeScript alias ${codeSpan(original)}; Dart typedefs cannot refer to themselves.`,
        `typedef ${name}${typeParams} = dynamic;`
      ],
      diagnostics: []
    };
  }
  const unionDisplay = aliasUnionDisplay(declaration.type, inner);
  if (unionDisplay) {
    return {
      lines: [
        ...docs(declaration),
        `/// A JavaScript union of ${codeSpan(unionDisplay)}; Dart has no union types.`,
        `typedef ${name}${typeParams} = dynamic;`
      ],
      diagnostics: []
    };
  }
  if (declaration.type.kind === "function" /* Function */) {
    const fn = declaration.type;
    const fnContext = withTypeParams(inner, fn.typeParams);
    return {
      lines: [
        ...docs(declaration),
        `typedef ${name}${typeParams} = ${fn.returnType ? emitType(fn.returnType, fnContext) : "void"} Function${emitTypeParams(fn.typeParams, fnContext)}(${formatParameters(fn.parameters ?? [], fnContext)});`
      ],
      diagnostics: []
    };
  }
  const target = emitType(declaration.type, inner);
  return {
    lines: [...docs(declaration), `typedef ${name}${typeParams} = ${target};`],
    diagnostics: []
  };
}
function enumMemberValue(member) {
  const initializer = member.initializer;
  if (initializer.kind === "number" || initializer.kind === "string") return initializer.value;
  return initializer.computedValue;
}
function dartLiteral(value) {
  if (typeof value === "string") return dartString(value);
  if (!Number.isFinite(value)) return void 0;
  return Object.is(value, -0) ? "0" : String(value);
}
function emitEnum(facet, context) {
  const declaration = facet.ir;
  const name = dartName(declaration);
  const valueType = enumValueType(declaration);
  const diagnostics = [];
  const body = [];
  const topLevel = [];
  const path = jsPath(facet, context);
  if (declaration.isConst) {
    for (const member of declaration.members) {
      const value = enumMemberValue(member);
      const literal = value === void 0 ? void 0 : dartLiteral(value);
      if (literal === void 0) {
        body.push(`  // ${jsName(member)}: no compile-time value`);
        diagnostics.push({
          code: "CONST_ENUM_MEMBER_WITHOUT_VALUE",
          name,
          message: `${name}.${jsName(member)} has no compile-time value and is omitted`
        });
        continue;
      }
      body.push(...docs(member, "  "), `  static const ${valueType} ${dartName(member)} = ${literal};`);
    }
    return {
      lines: [
        ...docs(declaration),
        "/// A TypeScript `const enum`: inlined at compile time, with no JavaScript object.",
        ...body.length === 0 ? [`abstract class ${name} {}`] : [`abstract class ${name} {`, ...body, "}"]
      ],
      diagnostics
    };
  }
  for (const member of declaration.members) {
    if (isRenamed(member)) {
      topLevel.push(
        jsAnnotation(`${path}.${unquote(jsName(member))}`),
        `external ${valueType} get ${name}_${dartName(member)};`
      );
      continue;
    }
    body.push(...docs(member, "  "), `  external static ${valueType} get ${dartName(member)};`);
  }
  return {
    lines: [
      ...docs(declaration),
      jsAnnotation(path),
      ...body.length === 0 ? [`abstract class ${name} {}`] : [`abstract class ${name} {`, ...body, "}"],
      ...topLevel
    ],
    diagnostics
  };
}
function emitAnonymousDefault(facet) {
  const kind = facet.ir.kind === "class" /* Class */ ? "class" : "function";
  return {
    lines: [
      `// Skipped: anonymous default-exported ${kind}. It has no JavaScript name a package:js binding could address.`
    ],
    diagnostics: [
      {
        code: "ANONYMOUS_DEFAULT_NOT_BOUND",
        name: "default",
        message: `Anonymous default-exported ${kind} is not addressable through package:js`
      }
    ]
  };
}

// src/engine/emitter/packagejs/index.ts
var TYPE_DEFINITIONS_HEADER = [
  "// " + "-".repeat(75),
  "// Type definitions",
  "//",
  "// TypeScript constructs with no direct Dart representation. Each one is",
  "// stated once, with its original spelling, and every use site refers to it",
  "// by name. Replacing a `dynamic` here upgrades every use site at once.",
  "// " + "-".repeat(75)
];
function createPackageJsBackend(options = {}) {
  return {
    id: "package:js",
    renderLibraries(inputs, session) {
      if (inputs.length === 0) return /* @__PURE__ */ new Map();
      const index = new ProgramIndex(inputs[0].program.symbols, inputs[0].outputPathOfFile);
      const drafts = /* @__PURE__ */ new Map();
      for (const input of inputs) {
        const cached = session?.cache.get(input.sourceFile);
        const draft = cached && !session.dirty.has(input.sourceFile) ? cached : renderLibrary(input, index, options);
        session?.cache.set(input.sourceFile, draft);
        drafts.set(input.sourceFile, draft);
      }
      if (session) {
        const live = new Set(inputs.map((input) => input.sourceFile));
        for (const file of [...session.cache.keys()]) if (!live.has(file)) session.cache.delete(file);
      }
      const usesSupport = [...drafts.values()].some(
        (draft) => draft.reExports.some((directive) => directive.targetFile === SUPPORT_LIBRARY)
      );
      if (usesSupport) {
        drafts.set(SUPPORT_LIBRARY, {
          content: `${renderSupportLibrary().replace(/\n$/, "")}
`,
          diagnostics: [],
          publicNames: new Set(SUPPORT_PUBLIC_NAMES),
          reExports: []
        });
      }
      const hidden = resolveExports(drafts);
      const result = /* @__PURE__ */ new Map();
      for (const [file, draft] of drafts) {
        const exportLines = draft.reExports.map((directive) => formatExport(directive, hidden.get(file)?.get(directive.uri) ?? [])).filter((line) => line !== void 0);
        result.set(file, {
          content: draft.content.replace(
            EXPORTS_MARKER,
            exportLines.length > 0 ? `
${exportLines.join("\n")}` : ""
          ),
          diagnostics: draft.diagnostics
        });
      }
      return result;
    }
  };
}
var EXPORTS_MARKER = "\uE010EXPORTS\uE011";
function formatExport(directive, hide) {
  if (directive.show) {
    const shown = directive.show.filter((name) => !hide.includes(name));
    return shown.length > 0 ? `export '${directive.uri}' show ${shown.join(", ")};` : void 0;
  }
  return hide.length > 0 ? `export '${directive.uri}' hide ${[...hide].sort().join(", ")};` : `export '${directive.uri}';`;
}
function resolveExports(drafts) {
  const hidden = /* @__PURE__ */ new Map();
  const memo = /* @__PURE__ */ new Map();
  const active = /* @__PURE__ */ new Set();
  const exportsOf = (file) => {
    const cached = memo.get(file);
    if (cached) return cached;
    const draft = drafts.get(file);
    const own = /* @__PURE__ */ new Map();
    for (const name of draft?.publicNames ?? []) own.set(name, /* @__PURE__ */ new Set([file]));
    if (!draft || active.has(file)) return own;
    active.add(file);
    const provided = draft.reExports.map((directive) => {
      const names = /* @__PURE__ */ new Map();
      for (const [name, origins2] of exportsOf(directive.targetFile)) {
        if (directive.show && !directive.show.includes(name)) continue;
        names.set(name, origins2);
      }
      return names;
    });
    const origins = /* @__PURE__ */ new Map();
    const sources = /* @__PURE__ */ new Map();
    for (const [name, from] of own) origins.set(name, new Set(from));
    for (const names of provided) {
      for (const [name, from] of names) {
        const set = origins.get(name) ?? /* @__PURE__ */ new Set();
        from.forEach((origin) => set.add(origin));
        origins.set(name, set);
        sources.set(name, (sources.get(name) ?? 0) + 1);
      }
    }
    const ambiguous = new Set(
      [...origins].filter(([name, from]) => from.size > 1 || own.has(name) && sources.has(name)).map(([name]) => name)
    );
    const hides = /* @__PURE__ */ new Map();
    draft.reExports.forEach((directive, i) => {
      const hide = [...provided[i].keys()].filter((name) => ambiguous.has(name));
      if (hide.length > 0) hides.set(directive.uri, hide);
    });
    if (hides.size > 0) hidden.set(file, hides);
    const result = new Map(own);
    for (const names of provided) {
      for (const [name, from] of names) {
        if (!ambiguous.has(name)) result.set(name, from);
      }
    }
    active.delete(file);
    memo.set(file, result);
    return result;
  };
  for (const file of [...drafts.keys()].sort()) exportsOf(file);
  return hidden;
}
function renderLibrary(input, index, options = {}) {
  const plan = new LibraryPlan(input.outputPath);
  const context = {
    plan,
    index,
    file: input.sourceFile,
    scope: /* @__PURE__ */ new Map(),
    outputPath: input.outputPath,
    ...namespaceRoot(input) ?? options.jsRoot ? { jsRoot: namespaceRoot(input) ?? options.jsRoot } : {},
    ...input.supportPath ? { shared: { path: input.supportPath, used: /* @__PURE__ */ new Set() } } : {}
  };
  const diagnostics = [];
  const facets = (symbols) => symbols.flatMap(
    (symbol) => symbol.facets.filter((facet) => facet.emit).map((facet) => ({ symbol, facet }))
  );
  const declared = facets(input.symbols.filter((symbol) => !symbol.minted)).sort(
    (a, b) => a.facet.origin.sourceOrder - b.facet.origin.sourceOrder
  );
  const minted = facets(input.symbols.filter((symbol) => symbol.minted)).sort(
    (a, b) => a.symbol.fqn.localeCompare(b.symbol.fqn)
  );
  const body = [];
  const emitOne = ({ symbol, facet }) => {
    let emitted;
    try {
      emitted = emitFacet(facet, context, symbol.fqn);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitted = {
        lines: [`// ERROR emitting ${symbol.fqn}: ${message}`],
        diagnostics: []
      };
      diagnostics.push({
        code: "EMIT_ERROR",
        file: input.sourceFile,
        name: symbol.fqn,
        message
      });
    }
    for (const line of emitted.lines) declareTopLevel(plan, line);
    if (emitted.lines.length > 0) body.push(...emitted.lines, "");
    for (const diagnostic of emitted.diagnostics) {
      diagnostics.push({ ...diagnostic, file: input.sourceFile });
    }
  };
  declared.forEach(emitOne);
  if (minted.length > 0) {
    body.push(...TYPE_DEFINITIONS_HEADER, "");
    minted.forEach(emitOne);
  }
  const directives = reExports(input, index);
  if (context.shared && context.shared.used.size > 0) {
    directives.push({
      uri: siblingUri(input.outputPath, context.shared.path),
      targetFile: SUPPORT_LIBRARY,
      show: [...new Set([...context.shared.used].flatMap(supportExports))].sort()
    });
    directives.sort((a, b) => a.uri.localeCompare(b.uri));
  }
  const finished = plan.finish(
    body.join("\n").replace(/\n+$/, ""),
    minted.length > 0 ? [] : TYPE_DEFINITIONS_HEADER
  );
  const header = [
    `// Generated by dart_bindgen from ${basename2(input.sourceFile)}`,
    "// Do not edit directly",
    "",
    "@JS()",
    `library ${libraryName(input.sourceFile)};`,
    "",
    "import 'package:js/js.dart';",
    ...finished.imports,
    EXPORTS_MARKER,
    ""
  ];
  const content = `${[...header, finished.body].join("\n").replace(/\n+$/, "")}
`.replace(`${EXPORTS_MARKER}
`, EXPORTS_MARKER);
  const publicNames = /* @__PURE__ */ new Set();
  for (const line of finished.body.split("\n")) {
    declareTopLevel({ declare: (name) => publicNames.add(name) }, line);
  }
  for (const name of [...publicNames]) if (name.startsWith("_")) publicNames.delete(name);
  return { content, diagnostics, publicNames, reExports: directives };
}
function namespaceRoot(input) {
  const aliases = input.program.namespaceExports.get(input.sourceFile);
  return aliases && aliases.size > 0 ? [...aliases].sort()[0] : void 0;
}
function emitFacet(facet, context, fqn) {
  if (facet.ir.modifiers.isAnonymousDefault) return emitAnonymousDefault(facet);
  if (context.index.isOwningAlias(facet)) return { lines: [], diagnostics: [] };
  const owner = context.index.aliasOwnerOf(fqn);
  if (owner) {
    facet = {
      ...facet,
      ir: {
        ...facet.ir,
        dartName: owner.ir.dartName ?? owner.ir.name,
        ...owner.ir.jsDoc ? { jsDoc: owner.ir.jsDoc } : {}
      }
    };
  }
  switch (facet.ir.kind) {
    case "class" /* Class */:
      return emitClass(facet, { ...context, currentFQN: fqn });
    case "interface" /* Interface */:
      return emitInterface(facet, { ...context, currentFQN: fqn });
    case "function" /* Function */:
      return emitFunction(facet, context);
    case "variable" /* Variable */:
      return emitVariable(facet, context);
    case "typeAlias" /* TypeAlias */:
      return emitTypeAlias(facet, context);
    case "enum" /* Enum */:
      return emitEnum(facet, context);
  }
}
function declareTopLevel(plan, line) {
  const patterns = [
    /^(?:abstract )?class ([A-Za-z_$][\w$]*)/,
    /^typedef ([A-Za-z_$][\w$]*)/,
    /^extension ([A-Za-z_$][\w$]*)/,
    /^external .*\bget ([A-Za-z_$][\w$]*);$/,
    /^external set ([A-Za-z_$][\w$]*)\(/
  ];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      plan.declare(match[1]);
      return;
    }
  }
  if (line.startsWith("external ")) {
    let depth = 0;
    for (let i = "external ".length; i < line.length; i++) {
      const char = line[i];
      if (char === "<") depth++;
      else if (char === ">") depth--;
      else if (char === "(" && depth === 0) {
        const head = line.slice(0, i).replace(/<[^<>]*(?:<[^<>]*>[^<>]*)*>$/, "");
        const match = head.match(/([A-Za-z_$][\w$]*)$/);
        if (match && !/Function$/.test(head)) plan.declare(match[1]);
        return;
      }
    }
  }
}
function reExports(input, index) {
  const byUri = /* @__PURE__ */ new Map();
  for (const record of input.moduleExports) {
    if (record.kind !== "star" && record.kind !== "named") continue;
    if (!record.targetFile) continue;
    const target = input.outputPathOfFile.get(record.targetFile);
    if (!target || record.targetFile === input.sourceFile) continue;
    const uri = siblingUri(input.outputPath, target);
    if (record.kind === "star") {
      byUri.set(uri, { uri, targetFile: record.targetFile });
      continue;
    }
    const names = /* @__PURE__ */ new Set();
    for (const fqn of record.targets) {
      for (const symbol of index.symbols.get(fqn) ?? []) {
        for (const facet of symbol.facets) {
          if (facet.emit) names.add(facet.ir.dartName ?? facet.ir.name);
        }
      }
    }
    const existing = byUri.get(uri);
    if (existing && !existing.show) continue;
    const show = /* @__PURE__ */ new Set([...existing?.show ?? [], ...names]);
    if (show.size > 0) {
      byUri.set(uri, { uri, targetFile: record.targetFile, show: [...show].sort() });
    }
  }
  return [...byUri.values()].sort((a, b) => a.uri.localeCompare(b.uri));
}
function libraryName(sourceFile) {
  let fileName = basename2(sourceFile);
  if (fileName.endsWith(".d.ts")) fileName = fileName.slice(0, -5);
  else if (fileName.endsWith(".ts")) fileName = fileName.slice(0, -3);
  else fileName = fileName.replace(extname(fileName), "");
  const sanitized = fileName.replace(/[^a-zA-Z0-9]/g, "_");
  if (/^[a-zA-Z_]/.test(sanitized) && !DART_RESERVED_WORDS.has(sanitized)) {
    return sanitized;
  }
  return `dartify_${sanitized || "bindings"}`;
}

// src/engine/phase/emitterPhase.ts
import { writeFile, mkdir } from "fs/promises";
import { dirname as dirname2, extname as extname2, join, relative as relative2 } from "path";
function renderAllFiles(program, outDir, inputRoot, debug = false, backend = createPackageJsBackend(), session) {
  const fileGroups = groupSymbolsByFile(program.symbols);
  const emitting = new Set(
    [...fileGroups].filter(
      ([, symbols]) => symbols.some((symbol) => symbol.facets.some((facet) => facet.emit))
    ).map(([file]) => file)
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const [file, records] of program.moduleExports.byFile) {
      if (emitting.has(file)) continue;
      const reexportsRendered = records.some(
        (record) => (record.kind === "star" || record.kind === "named") && record.targetFile !== void 0 && emitting.has(record.targetFile)
      );
      if (reexportsRendered) {
        emitting.add(file);
        changed = true;
      }
    }
  }
  const outputPathOfFile = /* @__PURE__ */ new Map();
  const ownerOfOutput = /* @__PURE__ */ new Map();
  for (const file of [...emitting].sort()) {
    const outputPath = deriveOutputPath(file, inputRoot, outDir);
    const collision = ownerOfOutput.get(outputPath);
    if (collision) {
      throw new TranspileException(
        `Output path collision: ${collision} and ${file} both map to ${outputPath}`,
        "OUTPUT_PATH_COLLISION",
        file
      );
    }
    ownerOfOutput.set(outputPath, file);
    outputPathOfFile.set(file, outputPath);
  }
  let supportPath;
  if (outputPathOfFile.size > 1) {
    supportPath = join(outDir, SUPPORT_FILE_NAME);
    while (ownerOfOutput.has(supportPath)) supportPath = supportPath.replace(/\.dart$/, "_.dart");
  }
  const libraries = backend.renderLibraries(
    [...outputPathOfFile].map(([sourceFile, outputPath]) => ({
      program,
      sourceFile,
      outputPath,
      outputPathOfFile,
      symbols: fileGroups.get(sourceFile) ?? [],
      moduleExports: program.moduleExports.byFile.get(sourceFile) ?? [],
      ...supportPath ? { supportPath } : {}
    })),
    session
  );
  const rendered = /* @__PURE__ */ new Map();
  for (const [sourceFile, outputPath] of outputPathOfFile) {
    const symbols = fileGroups.get(sourceFile) ?? [];
    const library = libraries.get(sourceFile);
    rendered.set(outputPath, {
      sourceFile,
      outputPath,
      content: library.content,
      symbolCount: symbols.reduce(
        (count, symbol) => count + symbol.facets.filter((facet) => facet.emit).length,
        0
      ),
      diagnostics: library.diagnostics
    });
    if (debug && library.diagnostics.length > 0) {
      console.log(`  \u26A0\uFE0F  ${outputPath}: ${library.diagnostics.length} backend diagnostic(s)`);
    }
  }
  const support = libraries.get(SUPPORT_LIBRARY);
  if (support && supportPath) {
    rendered.set(supportPath, {
      sourceFile: SUPPORT_FILE_NAME,
      outputPath: supportPath,
      content: support.content,
      symbolCount: 0,
      diagnostics: []
    });
  }
  return rendered;
}
async function writeAllFiles(files, debug) {
  for (const [outputPath, file] of files) {
    await mkdir(dirname2(outputPath), { recursive: true });
    await writeFile(outputPath, file.content, "utf-8");
    if (debug) {
      console.log(
        `  \u{1F4DD} ${file.sourceFile} \u2192 ${outputPath} (${file.symbolCount} symbols)`
      );
    }
  }
}
function groupSymbolsByFile(table) {
  const groups = /* @__PURE__ */ new Map();
  for (const [, symbols] of table) {
    for (const symbol of symbols) {
      const sourceFile = sourceFileOfFQN(symbol.fqn);
      const existing = groups.get(sourceFile) || [];
      existing.push(symbol);
      groups.set(sourceFile, existing);
    }
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
function deriveOutputPath(sourceFile, inputRoot, outDir) {
  let relPath = relative2(inputRoot, sourceFile);
  const segments = relPath.split(/[\\/]/);
  while (segments.length > 0 && (segments[0] === ".." || segments[0] === ".")) {
    segments.shift();
  }
  relPath = segments.join("/");
  let dartPath;
  if (relPath.endsWith(".d.ts")) {
    dartPath = relPath.slice(0, -5) + ".dart";
  } else if (relPath.endsWith(".ts")) {
    dartPath = relPath.slice(0, -3) + ".dart";
  } else {
    dartPath = relPath.replace(extname2(relPath), ".dart");
  }
  return join(outDir, dartPath);
}

// src/resolution/moduleHost.ts
import { dirname as dirname3, resolve } from "path";
import { ts as ts17 } from "ts-morph";
function normalize(filePath) {
  return filePath.split("\\").join("/");
}
function uniqueExisting(candidates, host2) {
  return [...new Set(candidates.map((candidate) => normalize(candidate)))].filter((candidate) => host2.fileExists(candidate)).sort();
}
function relativeCandidates(specifier, containingFile, host2) {
  const base = resolve(dirname3(containingFile), specifier);
  return uniqueExisting([`${base}.d.ts`, resolve(base, "index.d.ts")], host2);
}
function explicitInputCandidates(specifier, explicitInputs) {
  const suffixes = [
    `/${specifier}.d.ts`,
    `/${specifier}/index.d.ts`
  ];
  if (!specifier.includes("/")) {
    suffixes.push(`/@types/${specifier}/index.d.ts`);
  }
  return explicitInputs.filter((file) => suffixes.some((suffix) => file.endsWith(suffix))).sort();
}
function createDeclarationResolutionHost(explicitFiles, callbacks) {
  const explicitInputs = [...new Set(explicitFiles.map(normalize))].sort();
  return (moduleResolutionHost, getCompilerOptions) => {
    const cache = ts17.createModuleResolutionCache(
      moduleResolutionHost.getCurrentDirectory?.() ?? process.cwd(),
      (fileName) => fileName,
      getCompilerOptions()
    );
    return {
      resolveModuleNames(moduleNames, containingFile) {
        return moduleNames.map((specifier) => {
          const standard = ts17.resolveModuleName(
            specifier,
            containingFile,
            getCompilerOptions(),
            moduleResolutionHost,
            cache
          ).resolvedModule;
          if (standard) return standard;
          const relative3 = ts17.isExternalModuleNameRelative(specifier);
          const candidates = relative3 ? relativeCandidates(specifier, containingFile, moduleResolutionHost) : explicitInputCandidates(specifier, explicitInputs);
          if (candidates.length > 1) {
            callbacks.ambiguous({
              file: normalize(containingFile),
              specifier,
              candidates
            });
            return void 0;
          }
          if (candidates.length === 0) return void 0;
          const resolvedFile = candidates[0];
          callbacks.resolved({
            file: normalize(containingFile),
            specifier,
            resolvedFile,
            strategy: relative3 ? "relativeDeclaration" : "explicitInput"
          });
          return {
            resolvedFileName: resolvedFile,
            extension: ts17.Extension.Dts,
            isExternalLibraryImport: !relative3
          };
        });
      }
    };
  };
}

// src/transpiler.ts
var TranspileException = class _TranspileException extends Error {
  constructor(message, code = "TRANSPILE_ERROR", file, line, column) {
    super(message);
    this.name = "TranspileException";
    this.code = code;
    this.file = file;
    this.line = line;
    this.column = column;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _TranspileException);
    }
  }
  toString() {
    let result = `${this.name}: ${this.message}`;
    if (this.file) {
      result += ` (${this.file}`;
      if (this.line !== void 0) {
        result += `:${this.line}`;
        if (this.column !== void 0) {
          result += `:${this.column}`;
        }
      }
      result += ")";
    }
    return result;
  }
};
var Transpiler = class {
  constructor(options) {
    if (!Array.isArray(options.files) || options.files.length === 0) {
      throw new TranspileException(
        "Files array cannot be empty",
        "INVALID_FILES"
      );
    }
    this.files = [...new Set(options.files)].sort();
    this.outDir = options.outDir;
    this.debug = options.debug ?? false;
    this.tsConfigFilePath = options.tsConfigFilePath;
    this.jsRoot = options.jsRoot;
  }
  /**
   * Phases 1 and 2 only: resolve inputs, build the symbol table, run the
   * linker. Returns explicit resolution, generation and link phase reports
   * without emitting anything.
   *
   * This is the seam consumers other than the emitter hang off — `tools/graph.ts`
   * uses it to render the dependency graph without producing Dart (`L-07`).
   */
  async analyze() {
    return (await this.analyzeProgram()).analysis;
  }
  /**
   * Phases 1 and 2, also returning the owned `LinkedProgram` that backends
   * consume. The program is deeply detached from the run that produced it.
   */
  async analyzeProgram() {
    return this.guard(async () => {
      this.validateFiles();
      const run = new ResolutionRun(this.files, this.tsConfigFilePath);
      run.resolveAndCategorize();
      const resolution = run.buildResolutionReport();
      if (this.debug) {
        run.printResolutionSummary();
        run.printResolutionDetails(resolution);
      }
      const symbolTable = new SymbolTable();
      const namespaceExports = /* @__PURE__ */ new Map();
      const moduleExports = /* @__PURE__ */ new Map();
      const generation = [];
      for (const [filePath, sourceFile] of [
        ...run.inputFiles,
        ...run.packageDepFiles
      ]) {
        generation.push(
          ...await generateSymbols(
            filePath,
            sourceFile,
            symbolTable,
            namespaceExports,
            moduleExports
          )
        );
      }
      const program = await runLinker(
        symbolTable,
        namespaceExports,
        moduleExports
      );
      if (this.debug) {
        printGenerationDiagnostics(generation);
        printLinkSummary(program.report);
      }
      return {
        analysis: {
          resolution,
          generation,
          link: program.report
        },
        program
      };
    });
  }
  /**
   * Phases 1-3, stopping short of the filesystem. Returns the analysis report
   * and rendered Dart source keyed by the path it would be written to (`E-11`).
   *
   * Generation diagnostics do not block rendering; callers that need partial
   * output inspect `analysis.generation`.
   */
  async render() {
    const { analysis, program } = await this.analyzeProgram();
    const inputRoot = resolvedInputRoot(analysis.resolution.inputFiles);
    const files = await this.guard(
      () => renderAllFiles(
        program,
        this.resolvedOutDir(),
        inputRoot,
        this.debug,
        createPackageJsBackend(this.jsRoot ? { jsRoot: this.jsRoot } : {})
      )
    );
    return { analysis, files };
  }
  /**
   * The full pipeline: render, then write to disk.
   *
   * A generation failure blocks every write: output that silently omits a
   * declaration is worse than no output (design principle 1). Use `render()`
   * for partial results.
   */
  async transpile() {
    const rendered = await this.render();
    const failures = rendered.analysis.generation;
    if (failures.length > 0) {
      const first = failures[0];
      throw new TranspileException(
        `Symbol generation failed for ${failures.length} statement(s); no files were written. First: ${first.message}`,
        "GENERATION_FAILED",
        first.file,
        first.line,
        first.column
      );
    }
    await this.guard(() => writeAllFiles(rendered.files, this.debug));
    if (this.debug) {
      console.log(
        `
\u2705 Emitted ${rendered.files.size} Dart file(s) to ${this.resolvedOutDir()}`
      );
    }
    return { ...rendered, writtenFiles: [...rendered.files.keys()].sort() };
  }
  resolvedOutDir() {
    return this.outDir || "./dart_out";
  }
  /**
   * Wraps a pipeline step so anything that escapes it surfaces as a
   * TranspileException rather than a raw error.
   */
  async guard(fn) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof TranspileException) {
        throw error;
      }
      throw new TranspileException(
        `Unexpected error during transpilation: ${error instanceof Error ? error.message : String(error)}`,
        "UNEXPECTED_ERROR"
      );
    }
  }
  /**
   * Transpiles a single in-memory `.d.ts` source to Dart, touching no
   * filesystem in either direction.
   *
   * Runs the same three phases as `transpile()` over one virtual source file.
   * Intended for tests and for embedding; multi-file features (cross-file
   * imports, augmentation across files) are by definition out of scope here,
   * since there is only one file.
   */
  static async transpileFromString(source, options = {}) {
    const fileName = options.fileName ?? "virtual.d.ts";
    const debug = options.debug ?? false;
    const errors = [];
    const project = new ts18.Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: ts18.ts.ScriptTarget.ES2020,
        module: ts18.ts.ModuleKind.ESNext,
        types: [],
        skipLibCheck: true,
        noEmit: true
      }
    });
    const sourceFile = project.createSourceFile(fileName, source, {
      overwrite: true
    });
    const filePath = String(sourceFile.getFilePath());
    for (const diagnostic of sourceFile.getPreEmitDiagnostics()) {
      const start = diagnostic.getStart();
      const lineAndCol = start !== void 0 ? sourceFile.getLineAndColumnAtPos(start) : void 0;
      errors.push(
        new TranspileException(
          ts18.ts.flattenDiagnosticMessageText(
            diagnostic.getMessageText(),
            "\n"
          ),
          `TS${diagnostic.getCode()}`,
          fileName,
          lineAndCol?.line,
          lineAndCol?.column
        )
      );
    }
    let content = "";
    let program;
    try {
      const symbolTable = new SymbolTable();
      const namespaceExports = /* @__PURE__ */ new Map();
      const moduleExports = /* @__PURE__ */ new Map();
      const generation = await generateSymbols(
        filePath,
        sourceFile,
        symbolTable,
        namespaceExports,
        moduleExports
      );
      for (const diagnostic of generation) {
        errors.push(
          new TranspileException(
            diagnostic.message,
            diagnostic.code,
            fileName,
            diagnostic.line,
            diagnostic.column
          )
        );
      }
      program = await runLinker(symbolTable, namespaceExports, moduleExports);
      const rendered = renderAllFiles(program, ".", dirname4(filePath), debug);
      content = rendered.values().next().value?.content ?? "";
    } catch (error) {
      errors.push(
        error instanceof TranspileException ? error : new TranspileException(
          `Unexpected error during transpilation: ${error instanceof Error ? error.message : String(error)}`,
          "UNEXPECTED_ERROR",
          fileName
        )
      );
    }
    return { content, errors, ...program ? { program } : {} };
  }
  validateFiles() {
    for (const file of this.files) {
      if (typeof file !== "string" || file.trim() === "") {
        throw new TranspileException(
          `Invalid file path: ${file}`,
          "INVALID_FILE_PATH",
          file
        );
      }
    }
  }
};
function printGenerationDiagnostics(diagnostics) {
  if (diagnostics.length === 0) return;
  console.error(
    `
\u26A0\uFE0F  Symbol generation: ${diagnostics.length} statement(s) failed`
  );
  for (const diagnostic of diagnostics) {
    const at = diagnostic.line !== void 0 ? `:${diagnostic.line}` : "";
    console.error(
      `  [${diagnostic.code}] ${diagnostic.file}${at} \u2014 ${diagnostic.message}`
    );
  }
}
function printLinkSummary(report) {
  console.log(
    `
  \u2705 Graph Verification Complete: ${report.valid} valid, ${report.broken} broken.`
  );
  if (report.diagnostics.length > 0) {
    console.log(
      `  \u26A0\uFE0F  ${report.diagnostics.length} checker fallback diagnostic(s).`
    );
  }
}
function resolvedInputRoot(inputFiles) {
  const directories = inputFiles.map((file) => resolve2(dirname4(file)));
  if (directories.length === 0) return ".";
  const roots = new Set(directories.map((directory) => parsePath(directory).root));
  if (roots.size !== 1) {
    throw new TranspileException(
      "Input files do not share a filesystem root",
      "NO_COMMON_INPUT_ROOT"
    );
  }
  const root = [...roots][0];
  const parts = directories.map(
    (directory) => directory.substring(root.length).split(/[\\/]/).filter(Boolean)
  );
  const common = [];
  for (let index = 0; index < Math.min(...parts.map((value) => value.length)); index++) {
    const segment = parts[0][index];
    if (parts.every((value) => value[index] === segment)) common.push(segment);
    else break;
  }
  return join2(root, ...common);
}
function toForwardSlash(p) {
  return p.split("\\").join("/");
}
var ResolutionRun = class {
  constructor(files, tsConfigFilePath) {
    this.files = files;
    this.inputFiles = /* @__PURE__ */ new Map();
    this.packageDepFiles = /* @__PURE__ */ new Map();
    /**
     * Host library files are recorded by name only: dartify never parses them,
     * so materializing ts-morph wrappers for ~50 lib files was waste (`R-05`).
     */
    this.stdlibFiles = /* @__PURE__ */ new Set();
    this.moduleFallbacks = [];
    this.moduleFallbackAmbiguities = [];
    this.issueCache = /* @__PURE__ */ new Map();
    if (tsConfigFilePath) {
      this.project = new ts18.Project({
        tsConfigFilePath,
        skipAddingFilesFromTsConfig: true,
        compilerOptions: {
          types: []
        }
      });
    } else {
      this.project = new ts18.Project({
        compilerOptions: {
          target: ts18.ts.ScriptTarget.ES2020,
          module: ts18.ts.ModuleKind.ESNext,
          moduleResolution: ts18.ts.ModuleResolutionKind.Bundler,
          types: [],
          skipLibCheck: true,
          noEmit: true
        },
        resolutionHost: createDeclarationResolutionHost(
          files.map((file) => toForwardSlash(resolve2(file))),
          {
            resolved: (fallback2) => this.moduleFallbacks.push(fallback2),
            ambiguous: (ambiguity) => this.moduleFallbackAmbiguities.push(ambiguity)
          }
        )
      });
    }
  }
  /**
   * Add input files to the project, resolve all transitive dependencies,
   * and categorize every resolved file into input / packageDep / stdlib.
   */
  /**
   * Removes project files no input reaches through imports, re-exports,
   * module augmentations or reference directives, using the compiler's own
   * resolution. Returns whether anything was removed.
   */
  pruneUnreachable(inputs) {
    const program = this.project.getProgram().compilerObject;
    const reachable = /* @__PURE__ */ new Set();
    const queue = inputs.map((input) => String(input.getFilePath()));
    while (queue.length > 0) {
      const fileName = queue.pop();
      if (reachable.has(fileName)) continue;
      reachable.add(fileName);
      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) continue;
      const compiled = sourceFile;
      for (const specifier of [...compiled.imports ?? [], ...compiled.moduleAugmentations ?? []]) {
        if (!ts18.ts.isStringLiteralLike(specifier)) continue;
        const target = program.getResolvedModuleFromModuleSpecifier(specifier, sourceFile)?.resolvedModule?.resolvedFileName;
        if (target) queue.push(target);
      }
      for (const reference2 of sourceFile.referencedFiles) {
        const target = program.getSourceFileFromReference(sourceFile, reference2)?.fileName;
        if (target) queue.push(target);
      }
      for (const reference2 of sourceFile.typeReferenceDirectives) {
        const target = program.getResolvedTypeReferenceDirectiveFromTypeReferenceDirective(
          reference2,
          sourceFile
        )?.resolvedTypeReferenceDirective?.resolvedFileName;
        if (target) queue.push(target);
      }
    }
    let removed = false;
    for (const sourceFile of this.project.getSourceFiles()) {
      if (reachable.has(String(sourceFile.getFilePath()))) continue;
      this.project.removeSourceFile(sourceFile);
      removed = true;
    }
    return removed;
  }
  /**
   * Re-entrant: a watch session calls it again after refreshing changed files,
   * and the project's program is rebuilt incrementally.
   */
  resolveAndCategorize() {
    this.inputFiles.clear();
    this.packageDepFiles.clear();
    this.stdlibFiles.clear();
    const addedSourceFiles = this.project.addSourceFilesAtPaths(this.files);
    this.project.resolveSourceFileDependencies();
    if (this.pruneUnreachable(addedSourceFiles)) this.project.resolveSourceFileDependencies();
    const allProgramFiles = this.project.getProgram().compilerObject.getSourceFiles().slice().sort((a, b) => a.fileName.localeCompare(b.fileName));
    const inputSet = new Set(
      addedSourceFiles.map(
        (sourceFile) => toForwardSlash(sourceFile.getFilePath())
      )
    );
    for (const sf of allProgramFiles) {
      const fileName = toForwardSlash(sf.fileName);
      if (!inputSet.has(fileName) && isStdlibFile(fileName)) {
        this.stdlibFiles.add(fileName);
        continue;
      }
      const morphSf = this.project.getSourceFile(sf.fileName) ?? this.project.addSourceFileAtPath(sf.fileName);
      if (inputSet.has(fileName)) {
        this.inputFiles.set(fileName, morphSf);
      } else {
        this.packageDepFiles.set(fileName, morphSf);
      }
    }
  }
  /**
   * Print a categorized summary of all resolved source files.
   */
  printResolutionSummary() {
    const total = this.inputFiles.size + this.packageDepFiles.size + this.stdlibFiles.size;
    console.log(`
========================================`);
    console.log(`  Source Path Resolution Summary`);
    console.log(`========================================`);
    console.log(`  Input files (from CLI):     ${this.files.length}`);
    console.log(`  Total resolved files:       ${total}`);
    console.log(`  \u2500\u2500 Categorized \u2500\u2500`);
    console.log(`  \u{1F4E5} Input files:             ${this.inputFiles.size}`);
    console.log(`  \u{1F4E6} Package dependencies:    ${this.packageDepFiles.size}`);
    console.log(`  \u{1F4DA} Stdlib / Node builtins:  ${this.stdlibFiles.size}`);
    console.log(`========================================
`);
    console.log(`\u{1F4E5} Input file paths (${this.inputFiles.size}):`);
    [...this.inputFiles.keys()].forEach((f, i) => {
      console.log(`  ${i + 1}. ${f}`);
    });
    if (this.packageDepFiles.size > 0) {
      console.log(`
\u{1F4E6} Package Dependencies (${this.packageDepFiles.size}):`);
      [...this.packageDepFiles.keys()].forEach((f, i) => {
        console.log(`  ${i + 1}. ${f}`);
      });
    }
    if (this.stdlibFiles.size > 0) {
      console.log(`
\u{1F4DA} Stdlib / Node.js Builtins (${this.stdlibFiles.size}):`);
      [...this.stdlibFiles.keys()].forEach((f, i) => {
        console.log(`  ${i + 1}. ${f}`);
      });
    }
    const delta = total - this.files.length;
    console.log(`
Delta: ${delta} additional files resolved via dependencies`);
  }
  /**
   * Scan source files for unresolved references. Files in `reuse` (unchanged
   * since the last scan, in a watch session) keep their cached issues.
   */
  detectUnresolvedDeps(reuse) {
    const allResolvedPaths = /* @__PURE__ */ new Set([
      ...this.inputFiles.keys(),
      ...this.packageDepFiles.keys(),
      ...this.stdlibFiles.keys()
    ]);
    let packagePaths;
    const resolvedPackagePaths = () => packagePaths ??= [...allResolvedPaths].filter((path) => path.includes("node_modules/"));
    const unresolvedRefs = [];
    const ambiguities = new Map(
      this.moduleFallbackAmbiguities.map((item) => [
        `${item.file}\0${item.specifier}`,
        item.candidates
      ])
    );
    for (const sf of this.project.getSourceFiles()) {
      const cacheKey = toForwardSlash(sf.getFilePath());
      const cached = reuse?.has(cacheKey) ? this.issueCache.get(cacheKey) : void 0;
      if (cached) {
        unresolvedRefs.push(...cached);
        continue;
      }
      const firstIssue = unresolvedRefs.length;
      for (const ref of sf.getPathReferenceDirectives()) {
        const refText = ref.getFileName();
        const resolvedPath = toForwardSlash(
          resolve2(dirname4(String(sf.getFilePath())), refText)
        );
        if (!allResolvedPaths.has(resolvedPath) && !allResolvedPaths.has(resolvedPath.replace(/\.ts$/, ".d.ts"))) {
          unresolvedRefs.push({
            file: sf.getFilePath(),
            specifier: refText,
            kind: "path",
            reason: "notFound"
          });
        }
      }
      for (const ref of sf.getTypeReferenceDirectives()) {
        const refText = ref.getFileName();
        const isResolved = resolvedPackagePaths().some(
          (p) => p.includes(`@types/${refText}`) || p.includes(`node_modules/${refText}`)
        );
        if (!isResolved) {
          unresolvedRefs.push({
            file: sf.getFilePath(),
            specifier: refText,
            kind: "types",
            reason: "notFound"
          });
        }
      }
      for (const importDecl of sf.getImportDeclarations()) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        if (!importDecl.getModuleSpecifierSourceFile()) {
          const file = toForwardSlash(sf.getFilePath());
          const candidates = ambiguities.get(`${file}\0${moduleSpecifier}`);
          unresolvedRefs.push({
            file,
            specifier: moduleSpecifier,
            kind: "import",
            reason: candidates ? "ambiguousExplicitInput" : "notFound",
            candidates
          });
        }
      }
      for (const exportDecl of sf.getExportDeclarations()) {
        const moduleSpecifier = exportDecl.getModuleSpecifierValue();
        if (moduleSpecifier && !exportDecl.getModuleSpecifierSourceFile()) {
          const file = toForwardSlash(sf.getFilePath());
          const candidates = ambiguities.get(`${file}\0${moduleSpecifier}`);
          unresolvedRefs.push({
            file,
            specifier: moduleSpecifier,
            kind: "export",
            reason: candidates ? "ambiguousExplicitInput" : "notFound",
            candidates
          });
        }
      }
      this.issueCache.set(cacheKey, unresolvedRefs.slice(firstIssue));
    }
    return unresolvedRefs.sort(
      (a, b) => `${a.file}\0${a.kind}\0${a.specifier}`.localeCompare(
        `${b.file}\0${b.kind}\0${b.specifier}`
      )
    );
  }
  buildResolutionReport(reuse) {
    const fallbacks = [
      ...new Map(
        this.moduleFallbacks.map((fallback2) => [
          `${fallback2.file}\0${fallback2.specifier}\0${fallback2.resolvedFile}`,
          fallback2
        ])
      ).values()
    ].sort(
      (a, b) => `${a.file}\0${a.specifier}`.localeCompare(
        `${b.file}\0${b.specifier}`
      )
    );
    return {
      inputFiles: [...this.inputFiles.keys()].sort(),
      packageDependencies: [...this.packageDepFiles.keys()].sort(),
      stdlibFiles: [...this.stdlibFiles.keys()].sort(),
      unresolved: this.detectUnresolvedDeps(reuse),
      fallbacks
    };
  }
  printResolutionDetails(report) {
    if (report.fallbacks.length > 0) {
      console.log(`
\u{1F501} Module fallbacks (${report.fallbacks.length}):`);
      for (const fallback2 of report.fallbacks) {
        console.log(
          `  [${fallback2.strategy}] ${fallback2.specifier} \u2192 ${fallback2.resolvedFile}`
        );
      }
    }
    if (report.unresolved.length > 0) {
      console.log(`
\u26A0\uFE0F  Unresolved Dependencies (${report.unresolved.length}):`);
      console.log(`----------------------------------------`);
      for (const { file, specifier, kind, candidates } of report.unresolved) {
        console.log(`  [${kind}] ${specifier}`);
        console.log(`    \u21B3 from: ${file}`);
        if (candidates) console.log(`    \u21B3 candidates: ${candidates.join(", ")}`);
      }
      console.log(`----------------------------------------`);
    } else {
      console.log(`
\u2705 All dependencies resolved successfully.`);
    }
  }
};

// src/ir/clone.ts
function cloneData(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    const copy2 = new Array(value.length);
    for (let index = 0; index < value.length; index++) copy2[index] = cloneData(value[index]);
    return copy2;
  }
  const source = value;
  const copy = {};
  for (const key in source) copy[key] = cloneData(source[key]);
  return copy;
}

// src/engine/phase/symbolGeneration.ts
async function generateSymbols(fp, sourceFile, symbolTable, namespaceExports, moduleExports = /* @__PURE__ */ new Map(), options = {}) {
  const generator = new SymbolGenerator(
    symbolTable,
    namespaceExports,
    moduleExports,
    options.statementCache,
    options.freshFQNs
  );
  return generator.generateSymbols(fp, sourceFile);
}
var IDENTIFIER = /[A-Za-z_$][\w$]*/g;
function lineOf(node) {
  const position = ts20.ts.getLineAndCharacterOfPosition(
    node.getSourceFile().compilerNode,
    node.getStart()
  );
  return { line: position.line + 1, column: position.character + 1 };
}
function declaredNamesOf(statement, into = /* @__PURE__ */ new Set()) {
  const named = statement;
  if (ts20.Node.isVariableStatement(statement)) {
    for (const declaration of statement.getDeclarations()) into.add(declaration.getName());
  } else if (ts20.Node.isModuleDeclaration(statement)) {
    for (const segment of statement.getName().split(".")) into.add(segment.replace(/['"]/g, ""));
    for (const inner of statement.getStatements()) declaredNamesOf(inner, into);
  } else if (named.getName) {
    into.add(named.getName() ?? "default");
  } else {
    for (const token of statement.getText().match(IDENTIFIER) ?? []) into.add(token);
  }
  return into;
}
function isValueLike(statement) {
  return ts20.Node.isVariableStatement(statement) || ts20.Node.isEnumDeclaration(statement) || ts20.Node.isModuleDeclaration(statement) || ts20.Node.isClassDeclaration(statement);
}
function valueTokensOf(statement) {
  const text = statement.getFullText();
  if (ts20.Node.isEnumDeclaration(statement)) return new Set(text.match(IDENTIFIER) ?? []);
  return new Set([...text.matchAll(/\btypeof\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1]));
}
function shiftLocations(value, delta, seen = /* @__PURE__ */ new Set()) {
  if (delta === 0 || value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) shiftLocations(item, delta, seen);
    return;
  }
  const record = value;
  const loc = record.loc;
  if (loc && typeof loc.line === "number" && !seen.has(loc)) {
    seen.add(loc);
    loc.line += delta;
  }
  for (const key in record) {
    if (key !== "loc") shiftLocations(record[key], delta, seen);
  }
}
var SymbolGenerator = class {
  constructor(symbolTable, namespaceExports, moduleExports, statementCache, freshFQNs) {
    this.symbolTable = symbolTable;
    this.namespaceExports = namespaceExports;
    this.moduleExports = moduleExports;
    this.statementCache = statementCache;
    this.freshFQNs = freshFQNs;
    this.moduleScopes = [];
    this.sourceOrder = 0;
    this.fileIsModule = false;
  }
  recordExport(filePath, record) {
    if (this.moduleScopes.length > 0) return;
    let records = this.moduleExports.get(filePath);
    if (!records) this.moduleExports.set(filePath, records = []);
    records.push(record);
  }
  parseContext(fqn, filePath) {
    return new ParseContext(fqn, (hoistedFQN, declaration) => {
      this.register(
        hoistedFQN,
        2 /* INTERFACE */,
        declaration,
        filePath,
        "anonymousType"
      );
    });
  }
  fqnScopes() {
    return this.moduleScopes.flatMap(
      (scope) => scope.kind === "global" ? [] : [scope.sourceName]
    );
  }
  register(fqn, type, ir, filePath, synthetic) {
    const facet = {
      type,
      namespace: namespaceOfSymbolType(type),
      ir,
      origin: {
        filePath,
        scopes: this.moduleScopes.map((scope) => ({ ...scope })),
        sourceOrder: this.sourceOrder++,
        fileIsModule: this.fileIsModule
      },
      emit: true,
      ...synthetic ? { synthetic } : {},
      provenance: [{ fqn, type, loc: ir.loc }]
    };
    const symbol = {
      fqn,
      facets: [facet],
      // Dependencies are derived once, after semantic rewrites, by the
      // semantic pass (`refreshDependencies`); computing them here was a
      // full IR walk thrown away immediately.
      deps: [],
      resolvedDeps: []
    };
    this.captured?.push(symbol);
    this.symbolTable.adopt(fqn, symbol);
  }
  /**
   * Generates the file's top-level statements, replaying cached ones that are
   * provably unaffected: same text and position-independent identity, and no
   * identifier they mention is declared by a statement that changed or
   * disappeared (which could change what the checker binds it to).
   */
  async walkTopLevelWithCache(statements, errors, filePath, cache) {
    const overloadIndex = /* @__PURE__ */ new Map();
    const keys = statements.map((statement) => {
      let overload = "";
      if (ts20.Node.isFunctionDeclaration(statement)) {
        const name = statement.getName() ?? "default";
        const index = overloadIndex.get(name) ?? 0;
        overloadIndex.set(name, index + 1);
        overload = `${name}#${index}`;
      }
      const { column } = lineOf(statement);
      return `${this.fileIsModule ? "m" : "s"}\0${column}\0${overload}\0${statement.getFullText()}`;
    });
    const used = /* @__PURE__ */ new Set();
    const newDeclared = /* @__PURE__ */ new Set();
    const changedValues = /* @__PURE__ */ new Set();
    keys.forEach((key, index) => {
      const statement = statements[index];
      const names = declaredNamesOf(statement);
      names.forEach((name) => newDeclared.add(name));
      if (cache.has(key) && !used.has(key)) used.add(key);
      else if (isValueLike(statement)) names.forEach((name) => changedValues.add(name));
    });
    const oldDeclared = /* @__PURE__ */ new Set();
    for (const [key, entry] of cache) {
      entry.declared.forEach((name) => oldDeclared.add(name));
      if (!used.has(key) && entry.valueLike) entry.declared.forEach((name) => changedValues.add(name));
    }
    const touched = /* @__PURE__ */ new Set();
    for (const name of newDeclared) if (!oldDeclared.has(name)) touched.add(name);
    for (const name of oldDeclared) if (!newDeclared.has(name)) touched.add(name);
    const next = /* @__PURE__ */ new Map();
    for (const [index, statement] of statements.entries()) {
      const key = keys[index];
      const entry = cache.get(key);
      const reusable = entry !== void 0 && !next.has(key) && ![...touched].some((name) => entry.tokens.has(name)) && ![...changedValues].some((name) => entry.valueTokens.has(name));
      if (reusable) {
        this.replay(entry, statement, filePath, errors);
        next.set(key, entry);
        continue;
      }
      const firstError = errors.length;
      const aliasesBefore = new Set(this.namespaceExports.get(filePath) ?? []);
      const recordsBefore = this.moduleExports.get(filePath)?.length ?? 0;
      this.captured = [];
      await this.walkStatements([statement], errors, filePath);
      const symbols = this.captured;
      this.captured = void 0;
      for (const symbol of symbols) this.freshFQNs?.add(symbol.fqn);
      const declared = declaredNamesOf(statement);
      for (const symbol of symbols) {
        for (const segment of symbol.fqn.slice(symbol.fqn.indexOf("::") + 2).split("|")) {
          declared.add(segment);
        }
      }
      next.set(key, {
        symbols: cloneData(symbols),
        namespaceAliases: [...this.namespaceExports.get(filePath) ?? []].filter(
          (alias) => !aliasesBefore.has(alias)
        ),
        exportRecords: structuredClone(
          (this.moduleExports.get(filePath) ?? []).slice(recordsBefore)
        ),
        errors: errors.slice(firstError).map((error) => ({
          code: error.code,
          message: error.message,
          ...error.line !== void 0 ? { line: error.line } : {},
          ...error.column !== void 0 ? { column: error.column } : {}
        })),
        line: lineOf(statement).line,
        tokens: new Set(statement.getFullText().match(IDENTIFIER) ?? []),
        declared,
        valueLike: isValueLike(statement),
        valueTokens: valueTokensOf(statement)
      });
    }
    cache.clear();
    for (const [key, entry] of next) cache.set(key, entry);
  }
  replay(entry, statement, filePath, errors) {
    const delta = lineOf(statement).line - entry.line;
    const symbols = cloneData(entry.symbols);
    shiftLocations(symbols, delta);
    for (const symbol of symbols) {
      for (const facet of symbol.facets) {
        facet.origin = { ...facet.origin, sourceOrder: this.sourceOrder++ };
      }
      this.symbolTable.adopt(symbol.fqn, symbol);
    }
    if (entry.namespaceAliases.length > 0) {
      let aliases = this.namespaceExports.get(filePath);
      if (!aliases) this.namespaceExports.set(filePath, aliases = /* @__PURE__ */ new Set());
      entry.namespaceAliases.forEach((alias) => aliases.add(alias));
    }
    for (const record of entry.exportRecords) {
      this.recordExport(filePath, { ...structuredClone(record), line: record.line + delta });
    }
    for (const error of entry.errors) {
      errors.push(
        new TranspileException(
          error.message,
          error.code,
          filePath,
          error.line !== void 0 ? error.line + delta : void 0,
          error.column
        )
      );
    }
  }
  async generateSymbols(fp, sourceFile) {
    const errors = [];
    this.fileIsModule = ts20.ts.isExternalModule(sourceFile.compilerNode);
    try {
      if (this.statementCache) {
        await this.walkTopLevelWithCache(sourceFile.getStatements(), errors, fp, this.statementCache);
      } else {
        await this.walkStatements(sourceFile.getStatements(), errors, fp);
      }
    } catch (error) {
      const transpileError = error instanceof TranspileException ? error : new TranspileException(
        `Symbol Generator Failed: ${error instanceof Error ? error.message : String(error)}`,
        "SYMBOL_GENERATOR_ERROR",
        sourceFile.getFilePath()
      );
      errors.push(transpileError);
    }
    return errors.map((error) => ({
      code: error.code,
      message: error.message,
      file: error.file ?? fp,
      ...error.line !== void 0 ? { line: error.line } : {},
      ...error.column !== void 0 ? { column: error.column } : {}
    }));
  }
  async walkStatements(statements, errors, filePath) {
    for (const statement of statements) {
      try {
        await this.processStatementDeclaration(statement, filePath, errors);
      } catch (error) {
        const transpileError = error instanceof TranspileException ? error : new TranspileException(
          `Error processing statement declaration: ${error instanceof Error ? error.message : String(error)}`,
          "STATEMENT_DECLARATION_ERROR",
          filePath,
          lineOf(statement).line,
          lineOf(statement).column
        );
        errors.push(transpileError);
      }
    }
  }
  async processStatementDeclaration(statement, filePath, errors) {
    switch (statement.getKind()) {
      case ts20.SyntaxKind.InterfaceDeclaration:
        this.processInterfaceDeclaration(
          statement,
          filePath
        );
        break;
      case ts20.SyntaxKind.TypeAliasDeclaration:
        this.processTypeAliasDeclaration(
          statement,
          filePath
        );
        break;
      case ts20.SyntaxKind.ClassDeclaration:
        this.processClassDeclaration(
          statement,
          filePath
        );
        break;
      case ts20.SyntaxKind.FunctionDeclaration:
        this.processFunctionDeclaration(
          statement,
          filePath
        );
        break;
      case ts20.SyntaxKind.VariableStatement:
        this.processVariableStatement(
          statement,
          filePath
        );
        break;
      case ts20.SyntaxKind.EnumDeclaration:
        this.processEnumDeclaration(statement, filePath);
        break;
      case ts20.SyntaxKind.ModuleDeclaration:
        await this.processModuleDeclaration(
          statement,
          filePath,
          errors
        );
        break;
      case ts20.SyntaxKind.NamespaceExportDeclaration: {
        const alias = statement.compilerNode.name.text;
        let aliases = this.namespaceExports.get(filePath);
        if (!aliases) {
          aliases = /* @__PURE__ */ new Set();
          this.namespaceExports.set(filePath, aliases);
        }
        aliases.add(alias);
        break;
      }
      case ts20.SyntaxKind.ExportAssignment: {
        const assignment = statement;
        this.recordExport(filePath, {
          kind: "assignment",
          isDefault: !assignment.isExportEquals(),
          expression: assignment.getExpression().getText(),
          line: assignment.getStartLineNumber()
        });
        break;
      }
      case ts20.SyntaxKind.ExportDeclaration: {
        const declaration = statement;
        const specifier = declaration.getModuleSpecifierValue();
        const target = declaration.getModuleSpecifierSourceFile();
        const targetFile = target ? String(target.getFilePath()).split("\\").join("/") : void 0;
        const common = {
          ...targetFile ? { targetFile } : {},
          isTypeOnly: declaration.isTypeOnly(),
          line: declaration.getStartLineNumber()
        };
        const namespaceExport = declaration.getNamespaceExport();
        if (namespaceExport && specifier !== void 0) {
          this.recordExport(filePath, {
            kind: "namespace",
            alias: namespaceExport.getName(),
            specifier,
            ...common
          });
        } else if (declaration.hasNamedExports()) {
          this.recordExport(filePath, {
            kind: "named",
            elements: declaration.getNamedExports().map((element) => {
              const alias = element.getAliasNode()?.getText();
              return {
                name: alias ?? element.getName(),
                ...alias ? { propertyName: element.getName() } : {},
                isTypeOnly: element.isTypeOnly()
              };
            }),
            ...specifier !== void 0 ? { specifier } : {},
            ...common
          });
        } else if (specifier !== void 0) {
          this.recordExport(filePath, { kind: "star", specifier, ...common });
        }
        break;
      }
      default:
        break;
    }
  }
  processInterfaceDeclaration(node, filePath) {
    const interfaceName = node.getName();
    const fqn = createFQN(filePath, this.fqnScopes(), interfaceName);
    const parsedInterface = parseInterface(
      node,
      this.parseContext(fqn, filePath)
    );
    this.register(fqn, 2 /* INTERFACE */, parsedInterface, filePath);
  }
  processTypeAliasDeclaration(node, filePath) {
    const aliasName = node.getName();
    const fqn = createFQN(filePath, this.fqnScopes(), aliasName);
    const parsedTypeAlias = parseTypeAlias(
      node,
      this.parseContext(fqn, filePath)
    );
    this.register(fqn, 4 /* TYPE_ALIAS */, parsedTypeAlias, filePath);
  }
  processClassDeclaration(node, filePath) {
    const className = node.getName() ?? "default";
    const fqn = createFQN(filePath, this.fqnScopes(), className);
    const parsedClass = parseClass(
      node,
      this.parseContext(fqn, filePath)
    );
    this.register(fqn, 1 /* CLASS */, parsedClass, filePath);
  }
  processFunctionDeclaration(node, filePath) {
    const functionName = node.getName() ?? "default";
    const fqn = createFQN(filePath, this.fqnScopes(), functionName);
    const parsedFunction = parseFunction(
      node,
      this.parseContext(fqn, filePath)
    );
    this.register(fqn, 0 /* FUNCTION */, parsedFunction, filePath);
  }
  processVariableStatement(node, filePath) {
    const fqnPrefix = createFQNPrefix(filePath, this.fqnScopes());
    const parsedVariables = parseVariableStmt(
      fqnPrefix,
      node,
      new ParseContext(fqnPrefix, (hoistedFQN, declaration) => {
        this.register(
          hoistedFQN,
          2 /* INTERFACE */,
          declaration,
          filePath,
          "anonymousType"
        );
      })
    );
    for (const variable of parsedVariables) {
      const fqn = createFQN(filePath, this.fqnScopes(), variable.name);
      this.register(fqn, 3 /* VARIABLE */, variable, filePath);
    }
  }
  processEnumDeclaration(node, filePath) {
    const enumName = node.getName();
    const fqn = createFQN(filePath, this.fqnScopes(), enumName);
    const parsedEnum = parseEnum(node);
    this.register(fqn, 5 /* ENUM */, parsedEnum, filePath);
  }
  async processModuleDeclaration(node, filePath, errors) {
    const scope = this.moduleScope(node);
    try {
      this.moduleScopes.push(scope);
      const statements = node.getStatements();
      await this.walkStatements(statements, errors, filePath);
    } finally {
      this.moduleScopes.pop();
    }
  }
  moduleScope(node) {
    const sourceName = node.getName();
    const declarationKind = node.getDeclarationKind();
    if (declarationKind === "global") {
      return { kind: "global", sourceName: "global" };
    }
    if (declarationKind === "namespace") {
      return {
        kind: "namespace",
        sourceName,
        jsSegments: sourceName.split(".").filter(Boolean)
      };
    }
    const nameNode = node.getNameNode();
    const specifier = ts20.Node.isStringLiteral(nameNode) ? nameNode.getLiteralText() : sourceName.replace(/^['"]|['"]$/g, "");
    return {
      kind: "externalModule",
      sourceName,
      specifier,
      canonicalTarget: specifier,
      isAugmentation: ts20.Node.isStringLiteral(nameNode) && ts20.ts.isExternalModule(node.getSourceFile().compilerNode)
    };
  }
};

export {
  sourceFileOfFQN,
  generateSymbols,
  runSemanticPassOnDraft,
  rewriteRedirects,
  mergeSemanticResults,
  linkModuleExports,
  linkReferences,
  summarizeLinks,
  SymbolTable,
  isShapeCandidate,
  createPackageJsBackend,
  renderAllFiles,
  TranspileException,
  Transpiler,
  resolvedInputRoot,
  ResolutionRun
};
