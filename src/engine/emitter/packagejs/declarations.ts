import { SymbolFacet } from "@/symbol";
import { IRClass } from "@ir/class";
import { IRDeclKind } from "@ir/declaration";
import { IREnum, IREnumMember } from "@ir/enum";
import { IRFunction } from "@ir/function";
import {
  IRGetAccessor,
  IRIndexSignatures,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/interface";
import { IRBindingName } from "@ir/node";
import { IRConstructSignature, IRParameter } from "@ir/signature";
import { IRType, TypeKind } from "@ir/type";
import { IRTypeAlias } from "@ir/typealias";
import { IRVariable } from "@ir/variable";
import { enumValueType } from "./program";
import { aliasUnionDisplay, isPlatformType } from "./types";
import { codeSpan, dartDocLines, dartString } from "./text";
import {
  EmitContext,
  emitType,
  emitTypeParams,
  REST_ARITY,
  restElement,
  typeAdmitsNull,
  withSubstitution,
  withTypeParams,
} from "./types";

/** A backend-level fact about one declaration, returned with its code. */
export interface EmitDiagnostic {
  code:
    | "ANONYMOUS_DEFAULT_NOT_BOUND"
    | "CONST_ENUM_MEMBER_WITHOUT_VALUE"
    | "HERITAGE_DROPPED";
  name: string;
  message: string;
}

export interface EmittedDeclaration {
  lines: string[];
  diagnostics: EmitDiagnostic[];
}

// ---------------------------------------------------------------------------
// Names

export function dartName(binding: IRBindingName): string {
  return binding.dartName ?? binding.name;
}

export function jsName(binding: IRBindingName): string {
  return binding.jsName ?? binding.name;
}

function isComputed(binding: IRBindingName): boolean {
  const name = jsName(binding);
  return name.startsWith("[") && name.endsWith("]");
}

function isRenamed(binding: IRBindingName): boolean {
  return dartName(binding) !== jsName(binding);
}

/**
 * Static members lowered to top-level `Owner_member` bindings: renamed ones,
 * and ones that collide with an inherited instance member, which Dart forbids
 * (`CONFLICTING_STATIC_AND_INSTANCE`).
 */
function isTopLevelStatic(
  member: IRBindingName & { isStatic: boolean },
  options: MemberOptions,
): boolean {
  if (!member.isStatic) return false;
  return isRenamed(member) || options.inherited.has(jsName(member));
}

/** Removes the delimiting quotes of a quoted TypeScript name only (`E-13`). */
function unquote(name: string): string {
  const match = name.match(/^(['"`])([\s\S]*)\1$/);
  return match ? match[2] : name;
}

/** The JavaScript object path of a top-level facet. */
export function jsPath(facet: SymbolFacet): string {
  const segments = facet.origin.scopes.flatMap((scope) => {
    if (scope.kind === "global") return [];
    if (scope.kind === "namespace") return scope.jsSegments.map(unquote);
    return [scope.specifier];
  });
  return [...segments, unquote(jsName(facet.ir))].join(".");
}

function jsAnnotation(path: string, indent = ""): string {
  return `${indent}@JS(${dartString(path)})`;
}

function memberAnnotation(binding: IRBindingName, indent = "  "): string[] {
  return isRenamed(binding) ? [jsAnnotation(unquote(jsName(binding)), indent)] : [];
}

function computedComment(binding: IRBindingName, indent = "  "): string {
  return `${indent}// Unsupported computed JavaScript member preserved in IR: ${jsName(binding).replace(/\r?\n/g, " ")}`;
}

function docs(node: { jsDoc?: string }, indent = ""): string[] {
  return dartDocLines(node.jsDoc, indent);
}

// ---------------------------------------------------------------------------
// Parameters

function parameterName(parameter: IRParameter): string {
  return dartName(parameter);
}

/** Positional parameters, with rest parameters polyfilled (`E-31`). */
export function formatParameters(
  parameters: readonly IRParameter[],
  context: EmitContext,
  modifier = "",
): string {
  const required: string[] = [];
  const optional: string[] = [];
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
  const parts: string[] = [];
  if (required.length > 0) parts.push(required.join(", "));
  if (optional.length > 0) parts.push(`[${optional.join(", ")}]`);
  return parts.join(", ");
}

function nullableType(type: IRType, context: EmitContext): string {
  const text = emitType(type, context);
  return typeAdmitsNull(type, context) ? text : `${text}?`;
}

// ---------------------------------------------------------------------------
// Members shared by classes and interfaces

interface MemberSink {
  body: string[];
  extension: string[];
  topLevel: string[];
}

interface MemberOptions {
  ownerDartName: string;
  ownerJsPath: string;
  context: EmitContext;
  /**
   * Instance members inherited from project supertypes, by JavaScript name,
   * with the context their types are emitted in (type arguments substituted).
   */
  inherited: ReadonlyMap<string, readonly InheritedMember[]>;
  /** Class type parameters are not in scope for statics in Dart. */
  staticContext?: EmitContext;
}

function contextFor(member: { isStatic: boolean }, options: MemberOptions): MemberOptions {
  return member.isStatic && options.staticContext
    ? { ...options, context: options.staticContext }
    : options;
}

interface InheritedMember {
  member: IRProperties | IRMethod | IRGetAccessor | IRSetAccessor;
  kind: "property" | "method" | "getter" | "setter";
  context: EmitContext;
}

function covariantPrefix(member: IRBindingName & { isStatic: boolean }, options: MemberOptions): string {
  return !member.isStatic && options.inherited.has(jsName(member)) ? "covariant " : "";
}

/** The type an inherited member exposes (property/getter type, return type). */
function inheritedValueType(inherited: InheritedMember): IRType | undefined {
  const member = inherited.member as Partial<IRProperties & IRMethod & IRSetAccessor>;
  if (inherited.kind === "method") return member.returnType;
  if (inherited.kind === "setter") return member.parameter?.type;
  return member.type;
}

function isTopLike(text: string, context: EmitContext): boolean {
  return (
    text === "dynamic" ||
    text === "void" ||
    text === "Object?" ||
    context.plan.supportIsDynamicLike(text)
  );
}

/**
 * Whether `child` provably overrides `parent` in Dart. TypeScript checks
 * overrides structurally; Dart checks them nominally, so anything not
 * provable here is emitted with the parent's type instead.
 */
function provableSubtype(
  child: IRType,
  childContext: EmitContext,
  parent: IRType,
  parentContext: EmitContext,
): boolean {
  const c = emitType(child, childContext);
  const p = emitType(parent, parentContext);
  if (c === p || isTopLike(p, parentContext) || c === "Never") return true;
  const parentNullable = typeAdmitsNull(parent, parentContext);
  const childNullable = typeAdmitsNull(child, childContext);
  if (childNullable && !parentNullable) return false;
  const strip = (text: string) => (text.endsWith("?") ? text.slice(0, -1) : text);
  if (strip(c) === strip(p)) return true;
  if (strip(p) === "Object" || (strip(p) === "Function" && / Function[<(]/.test(c))) return true;
  if (c === "Null") return parentNullable;
  const childTarget = child.reference?.resolvedFQN;
  const parentTarget = parent.reference?.resolvedFQN;
  if (childTarget && parentTarget) {
    if (childTarget === parentTarget) return true;
    return reachesSupertype(childTarget, parentTarget, childContext);
  }
  return false;
}

function reachesSupertype(fromFQN: string, toFQN: string, context: EmitContext): boolean {
  const seen = new Set<string>();
  const queue = [fromFQN];
  while (queue.length > 0) {
    const fqn = queue.shift()!;
    if (fqn === toFQN) return true;
    if (seen.has(fqn)) continue;
    seen.add(fqn);
    const target = context.index.typeTarget(fqn);
    if (target?.kind !== "type") continue;
    const ir = target.facet.ir;
    if (ir.kind !== IRDeclKind.Class && ir.kind !== IRDeclKind.Interface) continue;
    for (const parent of parentsOf(ir as IRClass | IRInterface)) {
      if (parent.reference?.resolvedFQN) queue.push(parent.reference.resolvedFQN);
    }
  }
  return false;
}

/** Emitted value type for an overriding member, corrected when unprovable. */
function overrideValueType(
  member: IRBindingName & { isStatic: boolean },
  type: IRType,
  text: string,
  options: MemberOptions,
): string {
  if (member.isStatic) return text;
  const ancestors = options.inherited.get(jsName(member));
  if (!ancestors) return text;
  // The effective type is the first in [own, nearest, …, furthest] that is
  // provably a subtype of every type after it, so each ancestor's own
  // correction is respected.
  const chain: { type: IRType; context: EmitContext; optional: boolean }[] = [
    { type, context: options.context, optional: false },
    ...ancestors.flatMap((inherited) => {
      const parentType = inheritedValueType(inherited);
      return parentType
        ? [{
            type: parentType,
            context: inherited.context,
            optional:
              inherited.kind === "property" && (inherited.member as IRProperties).isOptional,
          }]
        : [];
    }),
  ];
  for (let i = 0; i < chain.length; i++) {
    const ok = chain
      .slice(i + 1)
      .every((later) => provableSubtype(chain[i].type, chain[i].context, later.type, later.context));
    if (!ok) continue;
    if (i === 0) return text;
    const chosen = chain[i];
    const chosenText = emitType(chosen.type, chosen.context);
    return chosen.optional && !typeAdmitsNull(chosen.type, chosen.context)
      ? `${chosenText}?`
      : chosenText;
  }
  return text;
}

/**
 * Dart overrides must accept every positional argument the overridden member
 * accepts and require no more. TypeScript subtypes may declare fewer
 * parameters; the parent's extra ones are appended as optional.
 */
function overrideParameters(
  method: IRMethod,
  context: EmitContext,
  options: MemberOptions,
): string {
  const modifier = covariantPrefix(method, options);
  const inherited = method.isStatic ? undefined : options.inherited.get(jsName(method))?.[0];
  if (!inherited || inherited.kind !== "method") {
    return formatParameters(method.parameters, context, modifier);
  }
  const parent = inherited.member as IRMethod;
  const parentRequired = parent.parameters.filter((p) => !p.isOptional && !p.isRest).length;
  const entries: { parameter: IRParameter; context: EmitContext }[] = [];
  method.parameters.forEach((parameter, index) => {
    let entry = { parameter, context };
    if (!parameter.isRest) {
      // A narrowed parameter is fine with `covariant`, a widened one always;
      // anything else is unrelated in Dart. The effective type is the first in
      // [own, nearest, …] related to every overridden declaration after it.
      const candidates = [
        { type: parameter.type, context },
        ...(options.inherited.get(jsName(method)) ?? [])
          .filter((ancestor) => ancestor.kind === "method")
          .flatMap((ancestor) => {
            const other = (ancestor.member as IRMethod).parameters[index];
            return other && !other.isRest ? [{ type: other.type, context: ancestor.context }] : [];
          }),
      ];
      const related = (a: (typeof candidates)[number], b: (typeof candidates)[number]) =>
        provableSubtype(a.type, a.context, b.type, b.context) ||
        provableSubtype(b.type, b.context, a.type, a.context);
      const chosen =
        candidates.find((candidate, i) =>
          candidates.slice(i + 1).every((later) => related(candidate, later)),
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

/** `formatParameters` for parameters drawn from different type contexts. */
function formatMixedParameters(
  entries: readonly { parameter: IRParameter; context: EmitContext }[],
  modifier: string,
): string {
  const required: string[] = [];
  const optional: string[] = [];
  const names = new Set<string>();
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
  const parts: string[] = [];
  if (required.length > 0) parts.push(required.join(", "));
  if (optional.length > 0) parts.push(`[${optional.join(", ")}]`);
  return parts.join(", ");
}

function propertyType(property: IRProperties, context: EmitContext): string {
  return property.isOptional
    ? nullableType(property.type, context)
    : emitType(property.type, context);
}

function emitProperty(
  property: IRProperties,
  sink: MemberSink,
  options: MemberOptions,
): void {
  if (isComputed(property)) {
    sink.body.push(computedComment(property));
    return;
  }
  const type = overrideValueType(
    property,
    property.type,
    propertyType(property, options.context),
    options,
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
      `  external ${statics}set ${name}(${covariantPrefix(property, options)}${type} value);`,
    );
  }
}

function emitMethod(method: IRMethod, sink: MemberSink, options: MemberOptions): void {
  if (isComputed(method)) {
    sink.body.push(computedComment(method));
    return;
  }
  const context = withTypeParams(options.context, method.typeParams);
  const returnType = overrideValueType(
    method,
    method.returnType,
    emitType(method.returnType, context),
    { ...options, context },
  );
  const signature = `${returnType} %NAME%${emitTypeParams(method.typeParams, context)}(${overrideParameters(method, context, options)})`;
  const name = dartName(method);
  if (isTopLevelStatic(method, options)) {
    const binding = `${options.ownerDartName}_${name}`;
    sink.topLevel.push(
      ...docs(method),
      jsAnnotation(`${options.ownerJsPath}.${unquote(jsName(method))}`),
      `external ${signature.replace("%NAME%", binding)};`,
    );
    return;
  }
  const target = isRenamed(method) ? sink.extension : sink.body;
  const statics = method.isStatic ? "static " : "";
  target.push(
    ...docs(method, "  "),
    ...memberAnnotation(method),
    `  external ${statics}${signature.replace("%NAME%", name)};`,
  );
}

function emitGetter(getter: IRGetAccessor, sink: MemberSink, options: MemberOptions): void {
  if (isComputed(getter)) {
    sink.body.push(computedComment(getter));
    return;
  }
  const type = overrideValueType(
    getter,
    getter.type,
    emitType(getter.type, options.context),
    options,
  );
  const name = dartName(getter);
  if (isTopLevelStatic(getter, options)) {
    sink.topLevel.push(
      ...docs(getter),
      jsAnnotation(`${options.ownerJsPath}.${unquote(jsName(getter))}`),
      `external ${type} get ${options.ownerDartName}_${name};`,
    );
    return;
  }
  const target = isRenamed(getter) ? sink.extension : sink.body;
  target.push(
    ...docs(getter, "  "),
    ...memberAnnotation(getter),
    `  external ${getter.isStatic ? "static " : ""}${type} get ${name};`,
  );
}

function emitSetter(setter: IRSetAccessor, sink: MemberSink, options: MemberOptions): void {
  if (isComputed(setter)) {
    sink.body.push(computedComment(setter));
    return;
  }
  const parameterType = overrideValueType(
    setter,
    setter.parameter.type,
    emitType(setter.parameter.type, options.context),
    options,
  );
  const parameter = `${covariantPrefix(setter, options)}${parameterType} ${parameterName(setter.parameter)}`;
  const name = dartName(setter);
  if (isTopLevelStatic(setter, options)) {
    sink.topLevel.push(
      jsAnnotation(`${options.ownerJsPath}.${unquote(jsName(setter))}`),
      `external set ${options.ownerDartName}_${name}(${parameter});`,
    );
    return;
  }
  const target = isRenamed(setter) ? sink.extension : sink.body;
  target.push(
    ...memberAnnotation(setter),
    `  external ${setter.isStatic ? "static " : ""}set ${name}(${parameter});`,
  );
}

function indexKey(type: IRType): "String" | "num" | "Object" {
  if (type.kind === TypeKind.String) return "String";
  if (type.kind === TypeKind.Number) return "num";
  return "Object";
}

/** Index signatures with their real key/value types (`E-14`, `E-34`). */
function emitIndexSignatures(
  signatures: readonly IRIndexSignatures[],
  sink: MemberSink,
  context: EmitContext,
): void {
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

interface MemberSet {
  properties: readonly IRProperties[];
  methods: readonly IRMethod[];
  getAccessors: readonly IRGetAccessor[];
  setAccessors: readonly IRSetAccessor[];
}

function emitMembers(members: MemberSet, sink: MemberSink, options: MemberOptions): void {
  for (const property of members.properties) emitProperty(property, sink, contextFor(property, options));
  for (const method of members.methods) emitMethod(method, sink, contextFor(method, options));
  for (const getter of members.getAccessors) emitGetter(getter, sink, contextFor(getter, options));
  for (const setter of members.setAccessors) emitSetter(setter, sink, contextFor(setter, options));
}

/** A context mapping a declaration's type parameters to `dynamic`. */
function staticContextOf(
  typeParams: readonly { name: string }[],
  context: EmitContext,
): EmitContext | undefined {
  if (typeParams.length === 0) return undefined;
  const scope = new Map(context.scope);
  for (const parameter of typeParams) scope.set(parameter.name, "dynamic");
  return { ...context, scope };
}

// ---------------------------------------------------------------------------
// Heritage

interface Heritage {
  extendsClause?: string;
  implementsClauses: string[];
  dropped: string[];
  /** Project interfaces/classes whose members a concrete class must restate. */
  implemented: (IRInterface | IRClass)[];
}

function heritageTarget(type: IRType, context: EmitContext) {
  const fqn = type.reference?.resolvedFQN;
  const target = fqn ? context.index.typeTarget(fqn) : undefined;
  return target?.kind === "type" ? target : undefined;
}

/** Whether a heritage type lowers to something Dart can `implement`. */
function implementable(type: IRType, context: EmitContext): boolean {
  const target = heritageTarget(type, context);
  if (target) {
    const ir = target.facet.ir;
    if (ir.kind === IRDeclKind.Class) return true;
    return (
      ir.kind === IRDeclKind.Interface &&
      !(isCallableOnly(ir as IRInterface, target.facet) && !typedefCycle(target.facet, context))
    );
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

/** Marks everything an implemented supertype (transitively) supplies. */
function provideDeep(
  declaration: IRClass | IRInterface,
  provide: (owner: IRClass | IRInterface) => void,
  context: EmitContext,
  seen = new Set<IRClass | IRInterface>(),
): void {
  if (seen.has(declaration)) return;
  seen.add(declaration);
  provide(declaration);
  for (const parent of parentsOf(declaration)) {
    const ir = heritageTarget(parent, context)?.facet.ir;
    if (ir && (ir.kind === IRDeclKind.Class || ir.kind === IRDeclKind.Interface)) {
      provideDeep(ir as IRClass | IRInterface, provide, context, seen);
    }
  }
}

/**
 * Whether a typedef-emitting declaration (alias or callable interface) refers
 * back to itself through other typedef-emitting declarations. Dart rejects
 * every such cycle (`TYPE_ALIAS_CANNOT_REFERENCE_ITSELF`).
 */
export function typedefCycle(facet: SymbolFacet, context: EmitContext): boolean {
  const start = facet;
  const seen = new Set<SymbolFacet>();
  const stack: SymbolFacet[] = [facet];
  while (stack.length > 0) {
    const current = stack.pop()!;
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

function emitsTypedef(facet: SymbolFacet): boolean {
  if (facet.ir.kind === IRDeclKind.TypeAlias) return true;
  return facet.ir.kind === IRDeclKind.Interface && isCallableOnly(facet.ir as IRInterface, facet);
}

function typedefReferences(facet: SymbolFacet): string[] {
  const types: IRType[] = [];
  if (facet.ir.kind === IRDeclKind.TypeAlias) types.push((facet.ir as IRTypeAlias).type);
  else if (facet.ir.kind === IRDeclKind.Interface) {
    for (const signature of (facet.ir as IRInterface).callSignatures) {
      types.push(signature.returnType, ...signature.parameters.map((parameter) => parameter.type));
    }
  }
  const result: string[] = [];
  const visit = (type: IRType | undefined) => {
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

function originalOf(type: IRType): string {
  return type.originalText ?? type.name;
}

function computeHeritage(
  extendsTypes: readonly IRType[],
  implementsTypes: readonly IRType[],
  context: EmitContext,
  isConcreteClass: boolean,
): Heritage {
  const heritage: Heritage = { implementsClauses: [], dropped: [], implemented: [] };
  for (const type of extendsTypes) {
    const target = heritageTarget(type, context);
    const extendable =
      target &&
      isConcreteClass !== undefined &&
      (target.facet.ir.kind === IRDeclKind.Class ||
        (target.facet.ir.kind === IRDeclKind.Interface &&
          (target.facet.ir as IRInterface).constructSignatures.length === 0 &&
          target.facet.namespace !== "both"));
    if (extendable && !heritage.extendsClause && target.facet.ir.kind === IRDeclKind.Class) {
      heritage.extendsClause = emitType(type, context);
    } else if (implementable(type, context) && (!isConcreteClass || target)) {
      heritage.implementsClauses.push(emitType(type, context));
      if (target && isConcreteClass) {
        heritage.implemented.push(target.facet.ir as IRInterface | IRClass);
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
        heritage.implemented.push(target.facet.ir as IRInterface | IRClass);
      }
    } else {
      heritage.dropped.push(`implements ${originalOf(type)}`);
    }
  }
  heritage.implementsClauses = [...new Set(heritage.implementsClauses)];
  return heritage;
}

function heritageText(heritage: Heritage): string {
  let text = "";
  if (heritage.extendsClause) text += ` extends ${heritage.extendsClause}`;
  if (heritage.implementsClauses.length > 0) {
    text += ` implements ${heritage.implementsClauses.join(", ")}`;
  }
  return text;
}

function droppedHeritageComment(heritage: Heritage): string[] {
  return heritage.dropped.length > 0
    ? [`// Heritage with no Dart class to inherit from: ${heritage.dropped.join(", ")}`]
    : [];
}

/** Instance member keys a declaration (and its project supertypes) provides. */
function instanceMemberKeys(
  declaration: IRClass | IRInterface,
  context: EmitContext,
  seen = new Set<IRClass | IRInterface>(),
  keyOf: (member: IRBindingName) => string = jsName,
  includeStatic = false,
): Set<string> {
  const keys = new Set<string>();
  if (seen.has(declaration)) return keys;
  seen.add(declaration);
  const add = (members: readonly (IRBindingName & { isStatic?: boolean })[]) => {
    for (const member of members) {
      if (includeStatic || !member.isStatic) keys.add(keyOf(member));
    }
  };
  add(declaration.properties);
  add(declaration.methods);
  add(declaration.getAccessors);
  add(declaration.setAccessors);
  const parents =
    declaration.kind === IRDeclKind.Class
      ? [declaration.extends, ...declaration.implements].filter((t): t is IRType => !!t)
      : declaration.extends;
  for (const parent of parents) {
    const target = heritageTarget(parent, context);
    if (!target) continue;
    const ir = target.facet.ir;
    if (ir.kind === IRDeclKind.Class || ir.kind === IRDeclKind.Interface) {
      for (const key of instanceMemberKeys(ir as IRClass | IRInterface, context, seen, keyOf, includeStatic)) {
        keys.add(key);
      }
    }
  }
  return keys;
}

function parentsOf(declaration: IRClass | IRInterface): IRType[] {
  return declaration.kind === IRDeclKind.Class
    ? [declaration.extends, ...declaration.implements].filter((t): t is IRType => !!t)
    : declaration.extends;
}

/**
 * Inherited JavaScript member names (for `covariant`) and every member Dart
 * name visible in the class body (for type-name shadowing).
 */
function inheritedMembers(
  declaration: IRClass | IRInterface,
  context: EmitContext,
): Map<string, InheritedMember[]> {
  const result = new Map<string, InheritedMember[]>();
  const seen = new Set<IRClass | IRInterface>([declaration]);
  const visit = (owner: IRClass | IRInterface, ownerContext: EmitContext) => {
    for (const parent of parentsOf(owner)) {
      const target = heritageTarget(parent, ownerContext);
      const ir = target?.facet.ir;
      if (!ir || (ir.kind !== IRDeclKind.Class && ir.kind !== IRDeclKind.Interface)) continue;
      const parentIR = ir as IRClass | IRInterface;
      if (seen.has(parentIR)) continue;
      seen.add(parentIR);
      const parentContext = withSubstitution(
        { ...ownerContext, scope: new Map(ownerContext.scope) },
        parentIR.typeParams,
        parent.genericArgs,
        ownerContext,
      );
      const add = (
        members: readonly (IRProperties | IRMethod | IRGetAccessor | IRSetAccessor)[],
        kind: InheritedMember["kind"],
      ) => {
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

function memberContext(
  declaration: IRClass | IRInterface,
  context: EmitContext,
): { context: EmitContext; inherited: Map<string, InheritedMember[]> } {
  const shadowed = instanceMemberKeys(declaration, context, new Set(), dartName, true);
  return {
    context: { ...context, shadowed },
    inherited: inheritedMembers(declaration, context),
  };
}

// ---------------------------------------------------------------------------
// Constructors

function constructorLines(
  name: string,
  signatures: readonly IRConstructSignature[],
  context: EmitContext,
  generative: boolean,
): string[] {
  const lines: string[] = [];
  signatures.forEach((signature, index) => {
    const ctorName = index === 0 ? name : `${name}.overload${index + 1}`;
    const keyword = index === 0 && generative ? "" : "factory ";
    lines.push(
      ...docs(signature, "  "),
      `  external ${keyword}${ctorName}(${formatParameters(signature.parameters, context)});`,
    );
  });
  return lines;
}

/** Constructor signatures a subclass inherits when it declares none. */
function inheritedConstructors(
  declaration: IRClass,
  context: EmitContext,
  seen = new Set<IRClass>(),
): IRConstructSignature[] {
  if (seen.has(declaration)) return [];
  seen.add(declaration);
  const own = declaration.constructors.filter((ctor) => ctor.visibility !== "private");
  if (declaration.constructors.length > 0) return own;
  if (!declaration.extends) return [];
  const target = heritageTarget(declaration.extends, context);
  if (target?.facet.ir.kind !== IRDeclKind.Class) return [];
  return inheritedConstructors(target.facet.ir as IRClass, context, seen);
}

// ---------------------------------------------------------------------------
// Declarations

export function emitClass(
  facet: SymbolFacet,
  context: EmitContext,
): EmittedDeclaration {
  const declaration = facet.ir as IRClass;
  const name = dartName(declaration);
  const path = jsPath(facet);
  const inner = withTypeParams(context, declaration.typeParams);
  const typeParams = emitTypeParams(declaration.typeParams, inner);
  const typeArgs = typeArguments(declaration.typeParams);
  const heritage = computeHeritage(
    declaration.extends ? [declaration.extends] : [],
    declaration.implements,
    inner,
    true,
  );

  const sink: MemberSink = { body: [], extension: [], topLevel: [] };
  const scoped = memberContext(declaration, inner);
  const constructors = inheritedConstructors(declaration, inner);
  if (constructors.length > 0) {
    sink.body.push(...constructorLines(name, constructors, scoped.context, true));
  } else if (declaration.constructors.length === 0) {
    sink.body.push(`  external ${name}();`);
  }
  const options: MemberOptions = {
    ownerDartName: name,
    ownerJsPath: path,
    context: scoped.context,
    inherited: scoped.inherited,
    staticContext: staticContextOf(declaration.typeParams, scoped.context),
  };
  emitMembers(declaration, sink, options);

  if (heritage.implemented.length > 0) {
    // A concrete Dart class must restate what it `implements`. Members the
    // class declares, or inherits through `extends`, are already present.
    // Keyed by role: a declared getter does not supply the setter an
    // implemented property requires.
    const provided = new Set<string>();
    const provide = (owner: IRClass | IRInterface) => {
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
    let superclass = declaration.extends ? heritageTarget(declaration.extends, inner) : undefined;
    const seenSuper = new Set<string>();
    while (superclass?.facet.ir.kind === IRDeclKind.Class && !seenSuper.has(superclass.fqn)) {
      seenSuper.add(superclass.fqn);
      const superIR = superclass.facet.ir as IRClass;
      provide(superIR);
      // A superclass restates what it implements, so those count as provided.
      for (const parent of superIR.implements) {
        const implemented = heritageTarget(parent, inner)?.facet.ir;
        if (implemented && (implemented.kind === IRDeclKind.Interface || implemented.kind === IRDeclKind.Class)) {
          provideDeep(implemented as IRClass | IRInterface, provide, inner);
        }
      }
      superclass = superIR.extends ? heritageTarget(superIR.extends, inner) : undefined;
    }
    for (const [key, chain] of options.inherited) {
      // The nearest declaration of each role: a getter and a setter of the
      // same name are separate chain entries.
      const roles = new Map<InheritedMember["kind"], InheritedMember>();
      for (const entry of chain) if (!roles.has(entry.kind)) roles.set(entry.kind, entry);
      for (const inherited of roles.values()) {
      if (isComputed(inherited.member)) continue;
      const restated: MemberOptions = {
        ...options,
        context: { ...inherited.context, shadowed: scoped.context.shadowed },
        inherited: new Map(),
      };
      const set: MemberSet = { properties: [], methods: [], getAccessors: [], setAccessors: [] };
      if (inherited.kind === "property") {
        const property = inherited.member as IRProperties;
        const needGet = !provided.has(`get:${key}`);
        const needSet = !property.isReadonly && !provided.has(`set:${key}`);
        if (needGet && needSet) set.properties = [property];
        else if (needGet) set.properties = [{ ...property, isReadonly: true }];
        else if (needSet) {
          set.setAccessors = [{
            name: property.name,
            ...(property.dartName ? { dartName: property.dartName } : {}),
            ...(property.jsName ? { jsName: property.jsName } : {}),
            parameter: {
              name: "value",
              type: property.isOptional ? { ...property.type, isNullable: true } : property.type,
              isOptional: false,
              isRest: false,
            },
            isStatic: false,
            isAbstract: false,
          }];
        }
      }
      if (inherited.kind === "method" && !provided.has(`method:${key}`)) {
        set.methods = [inherited.member as IRMethod];
      }
      if (inherited.kind === "getter" && !provided.has(`get:${key}`)) {
        set.getAccessors = [inherited.member as IRGetAccessor];
      }
      if (inherited.kind === "setter" && !provided.has(`set:${key}`)) {
        set.setAccessors = [inherited.member as IRSetAccessor];
      }
      emitMembers(set, sink, restated);
      provide({
        properties: set.properties,
        methods: set.methods,
        getAccessors: set.getAccessors,
        setAccessors: set.setAccessors,
      } as unknown as IRClass);
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
    "}",
  ];
  appendExtension(lines, name, typeParams, typeArgs, sink.extension);
  lines.push(...sink.topLevel);
  return {
    lines,
    diagnostics: heritage.dropped.map((text) => ({
      code: "HERITAGE_DROPPED" as const,
      name,
      message: `${name}: ${text} has no Dart class to inherit from`,
    })),
  };
}

function typeArguments(typeParams: IRClass["typeParams"]): string {
  return typeParams.length > 0
    ? `<${typeParams.map((parameter) => dartName(parameter)).join(", ")}>`
    : "";
}

function appendExtension(
  lines: string[],
  name: string,
  typeParams: string,
  typeArgs: string,
  members: string[],
): void {
  if (members.length === 0) return;
  lines.push(`extension ${name}Extension${typeParams} on ${name}${typeArgs} {`, ...members, "}");
}

/** Whether an interface is only a call signature: a Dart function typedef. */
function isCallableOnly(declaration: IRInterface, facet: SymbolFacet): boolean {
  return (
    facet.namespace !== "both" &&
    declaration.callSignatures.length > 0 &&
    declaration.properties.length === 0 &&
    declaration.methods.length === 0 &&
    declaration.getAccessors.length === 0 &&
    declaration.setAccessors.length === 0 &&
    declaration.constructSignatures.length === 0 &&
    declaration.indexSignatures.length === 0
  );
}

interface BagField {
  name: string;
  type: string;
  required: boolean;
}

/**
 * Named parameters of the `@anonymous` object-literal factory (js_facade_gen
 * §3.3/§3.5, `E-07`), own properties first then inherited ones. Returns
 * undefined when the interface is not a property bag. Renamed and computed
 * properties are omitted: the factory's parameter names become JavaScript
 * keys, so they must be the exact spelling.
 */
function propertyBag(
  declaration: IRInterface,
  context: EmitContext,
  seen = new Set<IRInterface>(),
): { fields: BagField[]; omitted: string[] } | undefined {
  if (seen.has(declaration)) return { fields: [], omitted: [] };
  seen.add(declaration);
  if (
    declaration.methods.some((method) => !method.isStatic) ||
    declaration.callSignatures.length > 0 ||
    declaration.constructSignatures.length > 0
  ) {
    return undefined;
  }
  const fields: BagField[] = [];
  const omitted: string[] = [];
  for (const property of declaration.properties) {
    if (property.isStatic) continue;
    if (isComputed(property) || isRenamed(property)) {
      omitted.push(jsName(property));
      continue;
    }
    fields.push({
      name: dartName(property),
      type: property.isOptional
        ? nullableType(property.type, context)
        : emitType(property.type, context),
      required: !property.isOptional,
    });
  }
  for (const parent of declaration.extends) {
    const target = heritageTarget(parent, context);
    if (!target || target.facet.ir.kind !== IRDeclKind.Interface) continue;
    const parentIR = target.facet.ir as IRInterface;
    const inherited = propertyBag(
      parentIR,
      withSubstitution(context, parentIR.typeParams, parent.genericArgs, context),
      seen,
    );
    if (!inherited) return undefined;
    for (const field of inherited.fields) {
      if (!fields.some((existing) => existing.name === field.name)) fields.push(field);
    }
    omitted.push(...inherited.omitted);
  }
  return { fields, omitted };
}

export function emitInterface(
  facet: SymbolFacet,
  context: EmitContext,
): EmittedDeclaration {
  const declaration = facet.ir as IRInterface;
  const name = dartName(declaration);
  const inner = withTypeParams(context, declaration.typeParams);
  const typeParams = emitTypeParams(declaration.typeParams, inner);
  const typeArgs = typeArguments(declaration.typeParams);
  const hasRuntimeBinding = facet.namespace === "both";

  // §3.6/§3.7: a callable interface is a function typedef — unless it refers
  // to itself, which no Dart typedef may; then it stays a class with `call`.
  if (isCallableOnly(declaration, facet) && !typedefCycle(facet, context)) {
    const signatures = declaration.callSignatures;
    if (signatures.length === 1) {
      const signature = signatures[0];
      const fnContext = withTypeParams(inner, signature.typeParams);
      return {
        lines: [
          ...docs(declaration),
          `typedef ${name}${typeParams} = ${emitType(signature.returnType, fnContext)} Function${emitTypeParams(signature.typeParams, fnContext)}(${formatParameters(signature.parameters, fnContext)});`,
        ],
        diagnostics: [],
      };
    }
    return {
      lines: [
        ...docs(declaration),
        `/// Overloaded TypeScript call signatures; Dart function types cannot overload.`,
        `typedef ${name}${typeParams} = Function;`,
      ],
      diagnostics: [],
    };
  }

  const path = jsPath(facet);
  const heritage = computeHeritage(declaration.extends, [], inner, false);
  const sink: MemberSink = { body: [], extension: [], topLevel: [] };
  const scoped = memberContext(declaration, inner);

  if (hasRuntimeBinding) {
    sink.body.push(...constructorLines(name, declaration.constructSignatures, scoped.context, false));
  } else {
    const bag = propertyBag(declaration, scoped.context);
    if (bag) {
      const params = bag.fields.map(
        (field) => `${field.required ? "required " : ""}${field.type} ${field.name}`,
      );
      if (bag.omitted.length > 0) {
        sink.body.push(`  // Not settable through the factory: ${bag.omitted.join(", ")}`);
      }
      sink.body.push(
        `  external factory ${name}(${params.length > 0 ? `{${params.join(", ")}}` : ""});`,
      );
    }
  }
  const options: MemberOptions = {
    ownerDartName: name,
    ownerJsPath: path,
    context: scoped.context,
    inherited: scoped.inherited,
    staticContext: staticContextOf(declaration.typeParams, scoped.context),
  };
  emitMembers(declaration, sink, options);
  // §3.8: a call signature alongside members becomes a `call` method. Dart
  // cannot overload, so only the first is bound.
  const [firstCall, ...otherCalls] = declaration.callSignatures;
  const hasCallMember = scoped.context.shadowed?.has("call");
  if (firstCall && !hasCallMember) {
    const fnContext = withTypeParams(scoped.context, firstCall.typeParams);
    sink.body.push(
      `  external ${emitType(firstCall.returnType, fnContext)} call${emitTypeParams(firstCall.typeParams, fnContext)}(${formatParameters(firstCall.parameters, fnContext)});`,
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
    ...(sink.body.length === 0 ? [`${opening} {}`] : [`${opening} {`, ...sink.body, "}"]),
  ];
  appendExtension(lines, name, typeParams, typeArgs, sink.extension);
  lines.push(...sink.topLevel);
  return {
    lines,
    diagnostics: heritage.dropped.map((text) => ({
      code: "HERITAGE_DROPPED" as const,
      name,
      message: `${name}: ${text} has no Dart class to inherit from`,
    })),
  };
}

export function emitFunction(facet: SymbolFacet, context: EmitContext): EmittedDeclaration {
  const declaration = facet.ir as IRFunction;
  const inner = withTypeParams(context, declaration.typeParams);
  return {
    lines: [
      ...docs(declaration),
      jsAnnotation(jsPath(facet)),
      `external ${emitType(declaration.returnType, inner)} ${dartName(declaration)}${emitTypeParams(declaration.typeParams, inner)}(${formatParameters(declaration.parameters, inner)});`,
    ],
    diagnostics: [],
  };
}

/** Variables as getter/setter pairs; getter only for `const` (§1, `E-05`). */
export function emitVariable(facet: SymbolFacet, context: EmitContext): EmittedDeclaration {
  const declaration = facet.ir as IRVariable;
  const name = dartName(declaration);
  const type = emitType(declaration.type, context);
  const annotation = jsAnnotation(jsPath(facet));
  const lines = [...docs(declaration), annotation, `external ${type} get ${name};`];
  if (!declaration.isConst && declaration.declarationKind !== "const") {
    lines.push(annotation, `external set ${name}(${type} value);`);
  }
  return { lines, diagnostics: [] };
}

export function emitTypeAlias(facet: SymbolFacet, context: EmitContext): EmittedDeclaration {
  const declaration = facet.ir as IRTypeAlias;
  const name = dartName(declaration);
  const inner = withTypeParams(context, declaration.typeParams);
  const typeParams = emitTypeParams(declaration.typeParams, inner);
  if (declaration.type.kind === TypeKind.Unsupported) {
    const original = declaration.type.originalText;
    return {
      lines: [
        ...docs(declaration),
        ...(original ? [`/// Unrepresentable in Dart: ${codeSpan(original)}`] : []),
        `typedef ${name}${typeParams} = dynamic;`,
      ],
      diagnostics: [],
    };
  }
  // A typedef may not refer to itself, directly or through other typedefs;
  // TypeScript's recursive aliases have no Dart spelling.
  if (typedefCycle(facet, context)) {
    const original = declaration.type.originalText ?? declaration.name;
    return {
      lines: [
        ...docs(declaration),
        `/// Recursive TypeScript alias ${codeSpan(original)}; Dart typedefs cannot refer to themselves.`,
        `typedef ${name}${typeParams} = dynamic;`,
      ],
      diagnostics: [],
    };
  }
  const unionDisplay = aliasUnionDisplay(declaration.type, inner);
  if (unionDisplay) {
    return {
      lines: [
        ...docs(declaration),
        `/// A JavaScript union of ${codeSpan(unionDisplay)}; Dart has no union types.`,
        `typedef ${name}${typeParams} = dynamic;`,
      ],
      diagnostics: [],
    };
  }
  const target = emitType(declaration.type, inner);
  return {
    lines: [...docs(declaration), `typedef ${name}${typeParams} = ${target};`],
    diagnostics: [],
  };
}

function enumMemberValue(member: IREnumMember): string | number | undefined {
  const initializer = member.initializer;
  if (initializer.kind === "number" || initializer.kind === "string") return initializer.value;
  return initializer.computedValue;
}

function dartLiteral(value: string | number): string | undefined {
  if (typeof value === "string") return dartString(value);
  if (!Number.isFinite(value)) return undefined;
  return Object.is(value, -0) ? "0" : String(value);
}

/**
 * Runtime enums are uninstantiable classes of static getters with one value
 * type (§7, `E-06`). Const enums have no runtime object, so their members are
 * compile-time constants instead (`P-16`).
 */
export function emitEnum(facet: SymbolFacet, context: EmitContext): EmittedDeclaration {
  const declaration = facet.ir as IREnum;
  const name = dartName(declaration);
  const valueType = enumValueType(declaration);
  const diagnostics: EmitDiagnostic[] = [];
  const body: string[] = [];
  const topLevel: string[] = [];
  const path = jsPath(facet);

  if (declaration.isConst) {
    for (const member of declaration.members) {
      const value = enumMemberValue(member);
      const literal = value === undefined ? undefined : dartLiteral(value);
      if (literal === undefined) {
        body.push(`  // ${jsName(member)}: no compile-time value`);
        diagnostics.push({
          code: "CONST_ENUM_MEMBER_WITHOUT_VALUE",
          name,
          message: `${name}.${jsName(member)} has no compile-time value and is omitted`,
        });
        continue;
      }
      body.push(...docs(member, "  "), `  static const ${valueType} ${dartName(member)} = ${literal};`);
    }
    return {
      lines: [
        ...docs(declaration),
        "/// A TypeScript `const enum`: inlined at compile time, with no JavaScript object.",
        ...(body.length === 0 ? [`abstract class ${name} {}`] : [`abstract class ${name} {`, ...body, "}"]),
      ],
      diagnostics,
    };
  }

  for (const member of declaration.members) {
    if (isRenamed(member)) {
      topLevel.push(
        jsAnnotation(`${path}.${unquote(jsName(member))}`),
        `external ${valueType} get ${name}_${dartName(member)};`,
      );
      continue;
    }
    body.push(...docs(member, "  "), `  external static ${valueType} get ${dartName(member)};`);
  }
  return {
    lines: [
      ...docs(declaration),
      jsAnnotation(path),
      ...(body.length === 0 ? [`abstract class ${name} {}`] : [`abstract class ${name} {`, ...body, "}"]),
      ...topLevel,
    ],
    diagnostics,
  };
}

export function emitAnonymousDefault(facet: SymbolFacet): EmittedDeclaration {
  const kind = facet.ir.kind === IRDeclKind.Class ? "class" : "function";
  return {
    lines: [
      `// Skipped: anonymous default-exported ${kind}. It has no JavaScript name a package:js binding could address.`,
    ],
    diagnostics: [
      {
        code: "ANONYMOUS_DEFAULT_NOT_BOUND",
        name: "default",
        message: `Anonymous default-exported ${kind} is not addressable through package:js`,
      },
    ],
  };
}
