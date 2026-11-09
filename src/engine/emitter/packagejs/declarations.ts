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
import { BROWSER_TYPES } from "./browserTypes";
import { codeSpan, dartDocLines, dartString } from "./text";
import {
  core as coreName,
  EmitContext,
  emitType,
  emitTypeParams,
  listElementOf,
  REST_ARITY,
  restElement,
  sdkMapping,
  typeAdmitsNull,
  withSubstitution,
  withTypeParams,
} from "./types";

/** A backend-level fact about one declaration, returned with its code. */
export interface EmitDiagnostic {
  code:
    | "ANONYMOUS_DEFAULT_NOT_BOUND"
    | "AUGMENTATION_MEMBER_UNSUPPORTED"
    | "CONST_ENUM_MEMBER_WITHOUT_VALUE"
    | "HERITAGE_DROPPED"
    | "NATIVE_NAME_CONFLICT";
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

/** `a`, `a.b`: a specifier JavaScript can address as a property path. */
export function isJsPropertyPath(specifier: string): boolean {
  return /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(specifier);
}

/**
 * The JavaScript object path of a top-level facet.
 *
 * Under a root the path an input file exports the declaration under decides
 * (HD-17); a declaration none exports keeps `<root>.<local name>`. Without a
 * root a module's declarations bind bare globals — except an ambient module
 * whose specifier is itself a valid path (`h3`), which prefixes it as before;
 * any other specifier (`@scope/pkg`) cannot appear in an `@JS` string
 * (dart2js crashes on it), so those bind bare globals too (HD-20).
 */
export function jsPath(facet: SymbolFacet, context?: EmitContext): string {
  if (context?.pathOverride) return context.pathOverride;
  const routed = context?.currentFQN ? context.routes?.routed(context.currentFQN) : undefined;
  if (routed) return routed;

  const scopes = facet.origin.scopes;
  // A module that declares `export as namespace L` is reached at runtime
  // through the global `L` (UMD), so its declarations bind `L.<name>`
  // (`E-42`). `declare global` declarations stay global.
  const isGlobal = scopes.some((scope) => scope.kind === "global");
  const isAmbientModule = scopes[0]?.kind === "externalModule";
  const root = isGlobal ? undefined : isAmbientModule || facet.origin.fileIsModule ? context?.jsRoot : undefined;
  const segments = scopes.flatMap((scope) => {
    if (scope.kind === "global") return [];
    if (scope.kind === "namespace") return scope.jsSegments.map(unquote);
    return root === undefined && isJsPropertyPath(scope.specifier) ? [scope.specifier] : [];
  });
  return [...(root ? [root] : []), ...segments, unquote(jsName(facet.ir))].join(".");
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
  if (parameter.bindingPattern) {
    // `{p = null, d = false}` → `p_d` (js_facade_gen §12.1).
    const names = [
      ...parameter.bindingPattern.text.matchAll(/(?:^|[{,[])\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)/g),
    ].map((match) => match[1]);
    const joined = names.join("_").replace(/^_+/, "");
    if (joined && /^[A-Za-z$][\w$]*$/.test(joined)) return joined;
  }
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
  const identity =
    type.host ??
    (type.reference?.resolvedFQN ? context.index.augmentedHost(type.reference.resolvedFQN) : undefined);
  if (identity) {
    switch (identity.qualifiedName) {
      case "Array":
      case "ReadonlyArray":
        return true;
      case "Partial":
      case "Required":
      case "Readonly":
        return !!type.genericArgs?.[0] && implementable(type.genericArgs[0], context);
    }
    return isPlatformType(identity);
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

const NATIVE_NAMES: ReadonlySet<string> = new Set(
  Object.values(BROWSER_TYPES).flatMap((names) => Object.keys(names)),
);

/**
 * dart2js rejects a non-static interop class bound to the same JavaScript
 * name as a class it implements natively (`AudioContext`, `WebGLProgram`).
 * That happens when a module library's exports are addressed as bare
 * globals; `--js-root` (for example `THREE`) qualifies them.
 */
function nativeConflict(path: string, name: string): EmitDiagnostic[] {
  return !path.includes(".") && NATIVE_NAMES.has(path)
    ? [{
        code: "NATIVE_NAME_CONFLICT",
        name,
        message: `${name} binds the bare global '${path}', which dart2js reserves for its native class; generate with --js-root <global> for module libraries`,
      }]
    : [];
}

interface ProvidedProperty {
  type: IRType;
  context: EmitContext;
  optional: boolean;
  readonly: boolean;
}

/** Instance properties and getters a declaration has, own first, then inherited. */
function providedProperties(
  declaration: IRClass | IRInterface,
  context: EmitContext,
  into = new Map<string, ProvidedProperty>(),
  seen = new Set<IRClass | IRInterface>(),
): Map<string, ProvidedProperty> {
  if (seen.has(declaration)) return into;
  seen.add(declaration);
  const setters = new Set(declaration.setAccessors.filter((s) => !s.isStatic).map((s) => jsName(s)));
  for (const property of declaration.properties) {
    if (property.isStatic || into.has(jsName(property))) continue;
    into.set(jsName(property), {
      type: property.type,
      context,
      optional: property.isOptional,
      readonly: property.isReadonly,
    });
  }
  for (const getter of declaration.getAccessors) {
    if (getter.isStatic || into.has(jsName(getter))) continue;
    into.set(jsName(getter), { type: getter.type, context, optional: false, readonly: !setters.has(jsName(getter)) });
  }
  for (const parent of parentsOf(declaration)) {
    const target = heritageTarget(parent, context);
    const ir = target?.facet.ir;
    if (!ir || (ir.kind !== IRDeclKind.Class && ir.kind !== IRDeclKind.Interface)) continue;
    const parentIR = ir as IRClass | IRInterface;
    providedProperties(
      parentIR,
      withSubstitution({ ...context, scope: new Map(context.scope) }, parentIR.typeParams, parent.genericArgs, context),
      into,
      seen,
    );
  }
  return into;
}

/**
 * Structural conformance (`E-43`): TypeScript accepts a `Vector3` wherever a
 * `Vector3Like` (`{ x; y; z }`) is expected; Dart needs the class to declare
 * it. Returns the shape interfaces this declaration provably satisfies and
 * does not already inherit: every shape property is present, no less
 * optional, writable when the shape's is, and of a provably compatible type,
 * and the shape has strictly fewer properties than the declaration provides.
 */
function structuralConformances(
  declaration: IRClass | IRInterface,
  context: EmitContext,
): IRType[] {
  const self = context.currentFQN;
  if (!self) return [];
  const provided = providedProperties(declaration, context);
  if (provided.size < 2) return [];
  const result: IRType[] = [];
  for (const shape of context.index.shapes()) {
    if (shape.fqn === self) continue;
    if (reachesSupertype(self, shape.fqn, context) || reachesSupertype(shape.fqn, self, context)) continue;
    const ir = shape.facet.ir as IRInterface;
    // The shape's full property set, inherited included, on both sides.
    const required = [...providedProperties(ir, context)].map(([name, property]) => ({
      name,
      type: property.type,
      context: property.context,
      optional: property.optional,
      readonly: property.readonly,
    }));
    // Strict subset by name: conformance edges always go from more members to
    // fewer, so they can never form a cycle (equal shapes stay unrelated).
    if (required.length >= provided.size) continue;
    const fits = required.every((member) => {
      const own = provided.get(member.name);
      if (!own) return false;
      if (own.optional && !member.optional) return false;
      if (own.readonly && !member.readonly) return false;
      // A writable shape property would need a `covariant` setter for any
      // narrowing; require the identical type instead.
      if (!member.readonly) {
        return emitType(own.type, own.context) === emitType(member.type, member.context);
      }
      return provableSubtype(own.type, own.context, member.type, member.context);
    });
    if (!fits) continue;
    const name = ir.dartName ?? ir.name;
    result.push({
      kind: TypeKind.TypeReference,
      name,
      isNullable: false,
      originalText: name,
      reference: {
        writtenName: name,
        lookup: { kind: "checker", candidates: [shape.fqn] },
        resolvedFQN: shape.fqn,
        resolvedDartName: name,
      },
    });
  }
  return result;
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
    // Only a class extends, and only a class: an interface inherits through
    // `implements`, which needs no superclass constructor.
    if (isConcreteClass && target?.facet.ir.kind === IRDeclKind.Class && !heritage.extendsClause) {
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
  const path = jsPath(facet, context);
  const inner = withTypeParams(context, declaration.typeParams);
  const typeParams = emitTypeParams(declaration.typeParams, inner);
  const typeArgs = typeArguments(declaration.typeParams);
  const heritage = computeHeritage(
    declaration.extends ? [declaration.extends] : [],
    [...declaration.implements, ...structuralConformances(declaration, inner)],
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
    diagnostics: [
      ...heritage.dropped.map((text) => ({
        code: "HERITAGE_DROPPED" as const,
        name,
        message: `${name}: ${text} has no Dart class to inherit from`,
      })),
      ...(true ? nativeConflict(path, name) : []),
    ],
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
    // A host or unresolved parent (`extends Array<T>`) is not an object
    // literal, so a literal factory would construct the wrong thing (§14.5).
    if (!target || target.facet.ir.kind !== IRDeclKind.Interface) return undefined;
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

  const path = jsPath(facet, context);
  const heritage = computeHeritage(
    declaration.extends,
    structuralConformances(declaration, inner),
    inner,
    false,
  );
  const sink: MemberSink = { body: [], extension: [], topLevel: [] };
  const scoped = memberContext(declaration, inner);

  if (hasRuntimeBinding) {
    sink.body.push(...constructorLines(name, declaration.constructSignatures, scoped.context, false));
  } else {
    const bag = propertyBag(declaration, scoped.context);
    // An empty interface has nothing to construct (§3.1).
    if (bag && bag.fields.length + bag.omitted.length > 0) {
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
    diagnostics: [
      ...heritage.dropped.map((text) => ({
        code: "HERITAGE_DROPPED" as const,
        name,
        message: `${name}: ${text} has no Dart class to inherit from`,
      })),
      ...(hasRuntimeBinding ? nativeConflict(path, name) : []),
    ],
  };
}

/** The element type of a rest parameter (`...parts: string[]`), `any` when unknown. */
function restOf(parameter: IRParameter): IRType {
  const type = parameter.type;
  if (type.kind === TypeKind.Array && type.elementType) return type.elementType;
  if (
    type.kind === TypeKind.TypeReference &&
    (type.name === "Array" || type.name === "ReadonlyArray") &&
    type.genericArgs?.length === 1
  ) {
    return type.genericArgs[0];
  }
  return { kind: TypeKind.Any, name: "any", isNullable: false };
}

/** A local variable name that no parameter of the member uses. */
function freshName(base: string, taken: ReadonlySet<string>): string {
  let name = base;
  for (let suffix = 2; taken.has(name); suffix++) name = `${base}${suffix}`;
  return name;
}

/**
 * Builds a typed Dart list from the JavaScript array `js_util` returns, or is
 * undefined when `type` needs none (not a list, or a list of `dynamic`).
 *
 * Why: an array that comes from JavaScript is a `List<dynamic>` to dart2js, and
 * `getProperty<List<String>>` on it fails the cast at run time (HD-23). The
 * array is requested as `List<dynamic>` and copied with `List<E>.from`, which
 * checks each element and yields a real, correctly typed JavaScript array: a
 * `List.cast` view would also read, but it is not a JavaScript array, so
 * handing it back to JavaScript (an argument, a setter) would pass an opaque
 * Dart object. The price is that the list is a snapshot, not the live array.
 * Nested lists are converted level by level.
 */
function typedList(
  type: IRType,
  context: EmitContext,
  taken: ReadonlySet<string>,
): ((expression: string) => string) | undefined {
  const shape = listElementOf(type, context);
  if (!shape) return undefined;
  const elementText = emitType(shape.element, shape.context);
  if (isTopLike(elementText, shape.context)) return undefined;
  const list = coreName("List", context);
  const item = freshName("item", taken);
  const inner = typedList(shape.element, shape.context, new Set([...taken, item]));
  if (!inner) return (expression) => `${list}<${elementText}>.from(${expression})`;
  const guarded = typeAdmitsNull(shape.element, shape.context) ? `${item} == null ? null : ` : "";
  return (expression) =>
    `<${elementText}>[for (final ${item} in ${expression}) ${guarded}${inner(item)}]`;
}

/**
 * A read of a member through `js_util`: `call(requested)` is the call asking
 * for `requested`. Lists are requested as `List<dynamic>` and converted
 * (`typedList`); everything else is requested as the member's own type.
 */
function typedRead(
  type: IRType,
  text: string,
  context: EmitContext,
  call: (requested: string) => string,
  taken: ReadonlySet<string>,
): { expression: string } | { statements: string[] } {
  const convert = typedList(type, context, taken);
  if (!convert) return { expression: call(text) };
  const requested = `${coreName("List", context)}<dynamic>`;
  if (!text.endsWith("?") && !typeAdmitsNull(type, context)) {
    return { expression: convert(call(requested)) };
  }
  const raw = freshName("raw", taken);
  return {
    statements: [
      `final ${raw} = ${call(`${requested}?`)};`,
      `return ${raw} == null ? null : ${convert(raw)};`,
    ],
  };
}

/** What every Dart object declares: an extension cannot declare a member of these names. */
const OBJECT_MEMBERS: ReadonlySet<string> = new Set(["hashCode", "noSuchMethod", "runtimeType", "toString"]);

/** The `js_util` functions an augmentation body calls by their bare names. */
const JS_UTIL_FUNCTIONS = ["callMethod", "getProperty", "setProperty"] as const;

/**
 * A global declaration that adds members to a lib type the backend lowers to a
 * Dart SDK type (HD-22, HD-23):
 *
 *     interface Window { myProp: string; ping(n?: number): boolean }
 *     interface Array<T> { second(): T }
 *
 * merges with the host library's declaration in TypeScript. Dart cannot reopen
 * an SDK class, so the members become an extension on it (`extension
 * ArrayAugment<T> on List<T>`), reaching the JavaScript object through
 * `js_util` because an SDK type is not an interop class. The type itself stays
 * the SDK's everywhere (`ProgramIndex`). The declaration is an interface, or
 * the class the semantic pass made from the interface and its value companion
 * (`declare var Window: { new (): Window; … }`), whose static members and
 * constructors are reported with the rest. What an extension cannot carry
 * (call, construct and index signatures, statics, heritage, computed names) is
 * reported, one diagnostic each.
 */
export function emitAugmentation(facet: SymbolFacet, context: EmitContext): EmittedDeclaration {
  const declaration = facet.ir as IRInterface | IRClass;
  const mapped = sdkMapping(declaration.hostAugmentation!)!;
  const name = `${dartName(declaration)}Augment`;
  const diagnostics: EmitDiagnostic[] = [];
  const unsupported = (what: string) =>
    diagnostics.push({
      code: "AUGMENTATION_MEMBER_UNSUPPORTED",
      name: declaration.name,
      message: `${declaration.name}: ${what} cannot be added to ${mapped.name} (${mapped.library}) and is not bound`,
    });

  // The extension's own members are in scope in its body, so a member named
  // like a dart:core type, or like a `js_util` function the body calls, must
  // not capture its uses there. An extension also cannot declare what every
  // Dart object already does (`toString`), so those members are reported.
  const memberNames = new Set<string>();
  const members = [
    ...declaration.properties,
    ...declaration.getAccessors,
    ...declaration.setAccessors,
    ...declaration.methods,
  ].filter((member) => !isComputed(member) && !member.isStatic);
  const ofObject = (member: IRBindingName) => OBJECT_MEMBERS.has(dartName(member));
  for (const member of members) if (!ofObject(member)) memberNames.add(dartName(member));
  for (const name of JS_UTIL_FUNCTIONS) if (memberNames.has(name)) context.plan.declare(name);
  const scope: EmitContext = { ...withTypeParams(context, declaration.typeParams), shadowed: memberNames };

  // The SDK type's own type arguments are the leading type parameters of the
  // lib type (`Array<T>` → `List<T>`); a platform class has none, and then the
  // type parameters only serve the members' signatures.
  const typeArguments = Array.from({ length: mapped.typeArgs }, (_, index) => {
    const parameter = declaration.typeParams[index];
    return parameter ? (parameter.dartName ?? parameter.name) : "dynamic";
  });
  const sdkType =
    mapped.library === "dart:core" ? coreName(mapped.name, context) : context.plan.importName(mapped.library, mapped.name);
  const receiver = typeArguments.length > 0 ? `${sdkType}<${typeArguments.join(", ")}>` : sdkType;

  const getProperty = context.plan.importName("package:js/js_util.dart", "getProperty");
  const setProperty = context.plan.importName("package:js/js_util.dart", "setProperty");
  const callMethod = context.plan.importName("package:js/js_util.dart", "callMethod");
  const literal = (binding: IRBindingName) => dartString(unquote(jsName(binding)));

  const body: string[] = [];
  const getter = (binding: IRBindingName, type: IRType, text: string, doc: { jsDoc?: string }) => {
    body.push(...docs(doc, "  "));
    const read = typedRead(
      type,
      text,
      scope,
      (requested) => `${getProperty}<${requested}>(this, ${literal(binding)})`,
      new Set(),
    );
    const header = `  ${text} get ${dartName(binding)}`;
    if ("expression" in read) body.push(`${header} => ${read.expression};`);
    else body.push(`${header} {`, ...read.statements.map((line) => `    ${line}`), "  }");
  };
  const setter = (binding: IRBindingName, type: string, parameter: string) => {
    body.push(`  set ${dartName(binding)}(${type} ${parameter}) => ${setProperty}(this, ${literal(binding)}, ${parameter});`);
  };

  const declaredByObject = (member: IRBindingName) => {
    if (!ofObject(member)) return false;
    unsupported(`member ${jsName(member)}, which every Dart object declares,`);
    return true;
  };
  for (const property of declaration.properties) {
    if (isComputed(property)) {
      unsupported(`computed member ${jsName(property)}`);
      continue;
    }
    if (property.isStatic) {
      unsupported(`static member ${jsName(property)}`);
      continue;
    }
    if (declaredByObject(property)) continue;
    const type = propertyType(property, scope);
    getter(property, property.type, type, property);
    if (!property.isReadonly) setter(property, type, "value");
  }
  for (const accessor of declaration.getAccessors) {
    if (isComputed(accessor) || accessor.isStatic) {
      unsupported(`${accessor.isStatic ? "static " : "computed "}accessor ${jsName(accessor)}`);
      continue;
    }
    if (declaredByObject(accessor)) continue;
    getter(accessor, accessor.type, emitType(accessor.type, scope), accessor);
  }
  for (const accessor of declaration.setAccessors) {
    if (isComputed(accessor) || accessor.isStatic) {
      unsupported(`${accessor.isStatic ? "static " : "computed "}accessor ${jsName(accessor)}`);
      continue;
    }
    if (declaredByObject(accessor)) continue;
    setter(accessor, emitType(accessor.parameter.type, scope), parameterName(accessor.parameter));
  }
  for (const method of declaration.methods) {
    if (isComputed(method) || method.isStatic) {
      unsupported(`${method.isStatic ? "static " : "computed "}method ${jsName(method)}`);
      continue;
    }
    if (declaredByObject(method)) continue;
    const inner = withTypeParams(scope, method.typeParams);
    const returnType = emitType(method.returnType, inner);
    // Rest parameters are polyfilled as optional positionals (`E-31`); the
    // arguments are collected in order and trailing unset optionals dropped,
    // because JavaScript must see exactly the arguments given. The method has
    // a body here, so an optional parameter must admit null.
    const requiredParameters: string[] = [];
    const optionalParameters: string[] = [];
    const names: string[] = [];
    for (const parameter of method.parameters) {
      if (parameter.isRest) {
        const element = restOf(parameter);
        for (let index = 1; index <= REST_ARITY; index++) {
          names.push(`${parameterName(parameter)}${index}`);
          optionalParameters.push(`${nullableType(element, inner)} ${names[names.length - 1]}`);
        }
        continue;
      }
      names.push(parameterName(parameter));
      if (parameter.isOptional || optionalParameters.length > 0) {
        optionalParameters.push(`${nullableType(parameter.type, inner)} ${parameterName(parameter)}`);
      } else {
        requiredParameters.push(`${emitType(parameter.type, inner)} ${parameterName(parameter)}`);
      }
    }
    const required = requiredParameters.length;
    const parameters = [
      ...(required > 0 ? [requiredParameters.join(", ")] : []),
      ...(optionalParameters.length > 0 ? [`[${optionalParameters.join(", ")}]`] : []),
    ].join(", ");
    const signature = `${returnType} ${dartName(method)}${emitTypeParams(method.typeParams, inner)}(${parameters})`;
    const returns = method.returnType.kind === TypeKind.Void ? "" : "return ";
    const call = (requested: string) => `${callMethod}<${requested}>(this, ${literal(method)}, `;
    const taken = new Set([...names, "args"]);
    body.push(...docs(method, "  "));
    if (required === names.length) {
      const read = typedRead(
        method.returnType,
        returnType,
        inner,
        (requested) => `${call(requested)}[${names.join(", ")}])`,
        taken,
      );
      if ("expression" in read) body.push(`  ${signature} => ${read.expression};`);
      else body.push(`  ${signature} {`, ...read.statements.map((line) => `    ${line}`), "  }");
    } else {
      const read = typedRead(method.returnType, returnType, inner, (requested) => `${call(requested)}args)`, taken);
      body.push(
        `  ${signature} {`,
        `    final args = <Object?>[${names.join(", ")}];`,
        `    while (args.length > ${required} && args.last == null) {`,
        `      args.removeLast();`,
        `    }`,
        ...("expression" in read
          ? [`    ${returns}${read.expression};`]
          : read.statements.map((line) => `    ${line}`)),
        `  }`,
      );
    }
  }
  if (declaration.kind === IRDeclKind.Class) {
    for (const constructor of declaration.constructors) {
      void constructor;
      unsupported("a construct signature");
    }
  } else {
    for (const signature of declaration.callSignatures) {
      void signature;
      unsupported("a call signature");
    }
    for (const signature of declaration.constructSignatures) {
      void signature;
      unsupported("a construct signature");
    }
  }
  for (const signature of declaration.indexSignatures) {
    void signature;
    unsupported("an index signature");
  }
  const heritage =
    declaration.kind === IRDeclKind.Class
      ? [declaration.extends, ...declaration.implements].filter((type): type is IRType => type !== undefined)
      : declaration.extends;
  if (heritage.length > 0) unsupported("an extends clause");

  const lines =
    body.length === 0
      ? [`// ${declaration.name} adds nothing Dart can express to ${mapped.name} (${mapped.library}).`]
      : [
          `/// Members this project adds to \`${mapped.name}\` (${mapped.library}), which TypeScript merges into the host type.`,
          `extension ${name}${emitTypeParams(declaration.typeParams, scope)} on ${receiver} {`,
          ...body,
          "}",
        ];
  return { lines, diagnostics };
}

export function emitFunction(facet: SymbolFacet, context: EmitContext): EmittedDeclaration {
  const declaration = facet.ir as IRFunction;
  const inner = withTypeParams(context, declaration.typeParams);
  return {
    lines: [
      ...docs(declaration),
      jsAnnotation(jsPath(facet, context)),
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
  const annotation = jsAnnotation(jsPath(facet, context));
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
  if (declaration.type.kind === TypeKind.Function) {
    // A named function typedef keeps parameter names (§5.12).
    const fn = declaration.type;
    const fnContext = withTypeParams(inner, fn.typeParams);
    return {
      lines: [
        ...docs(declaration),
        `typedef ${name}${typeParams} = ${fn.returnType ? emitType(fn.returnType, fnContext) : "void"} Function${emitTypeParams(fn.typeParams, fnContext)}(${formatParameters(fn.parameters ?? [], fnContext)});`,
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
  const path = jsPath(facet, context);

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
