import { IRParameter, IRTypeParam } from "@ir/signature";
import { IRHostTypeIdentity, IRType, TypeKind } from "@ir/type";
import { IRTypeAlias } from "@ir/typealias";
import { BROWSER_TYPES } from "./browserTypes";
import { LibraryPlan, isSupportToken, supportBase } from "./library";
import { ProgramIndex } from "./program";
import { codeSpan, dartString } from "./text";

/**
 * Everything type emission needs, passed explicitly. `scope` maps lexical
 * TypeScript type-parameter names to their Dart spellings.
 */
export interface EmitContext {
  plan: LibraryPlan;
  index: ProgramIndex;
  file: string;
  /** TypeScript type-parameter name → Dart text (a name or a substitution). */
  scope: ReadonlyMap<string, string>;
  /**
   * Member names in scope inside the class being emitted. A same-library type
   * with one of these names would resolve to the member, so it is qualified
   * through a self-import instead.
   */
  shadowed?: ReadonlySet<string>;
  /** This library's own output path, for self-qualified references. */
  outputPath?: string;
  /**
   * The shared support library for multi-library runs (`E-40`); `used`
   * collects the support names this library referenced.
   */
  shared?: { path: string; used: Set<string> };
  /** The `export as namespace` global this library's module is reached through. */
  jsRoot?: string;
  /** FQN of the declaration being emitted. */
  currentFQN?: string;
}

/** A use of a name from the shared support library, if there is one. */
function sharedName(context: EmitContext, name: string): string | undefined {
  if (!context.shared) return undefined;
  context.shared.used.add(name);
  return context.plan.siblingName(context.shared.path, name);
}

/** A context whose scope substitutes `typeParams` with emitted `args`. */
export function withSubstitution(
  context: EmitContext,
  typeParams: readonly IRTypeParam[] | undefined,
  args: readonly IRType[] | undefined,
  argContext: EmitContext,
): EmitContext {
  if (!typeParams || typeParams.length === 0) return context;
  const scope = new Map(context.scope);
  typeParams.forEach((parameter, index) => {
    const arg = args?.[index] ?? parameter.default;
    scope.set(parameter.name, arg ? emit(arg, argContext).text : "dynamic");
  });
  return { ...context, scope };
}

interface Emitted {
  text: string;
  /** `dynamic`, `void`, `Null` and dynamic typedefs take no `?`. */
  admitsNull: boolean;
}

/** Extends a scope with a declaration's type parameters. */
export function withTypeParams(
  context: EmitContext,
  typeParams: readonly IRTypeParam[] | undefined,
): EmitContext {
  if (!typeParams || typeParams.length === 0) return context;
  const scope = new Map(context.scope);
  for (const parameter of typeParams) {
    scope.set(parameter.name, parameter.dartName ?? parameter.name);
  }
  return { ...context, scope };
}

/**
 * `<T extends Bound, U>`. TypeScript default type arguments have no Dart
 * spelling; they are applied at use sites instead (see `padTypeArguments`).
 * A bound that does not lower to a usable Dart type is kept as a comment.
 */
export function emitTypeParams(
  typeParams: readonly IRTypeParam[] | undefined,
  context: EmitContext,
): string {
  if (!typeParams || typeParams.length === 0) return "";
  const parts = typeParams.map((parameter) => {
    const name = parameter.dartName ?? parameter.name;
    if (!parameter.constraint) return name;
    const bound = emit(parameter.constraint, context);
    // Only class-like bounds are kept. Primitive and degraded bounds add
    // nothing an interop binding can enforce, and keeping them makes
    // otherwise-valid instantiations fail Dart's bound check.
    const classLike =
      !bound.admitsNull && parameter.constraint.reference?.resolvedFQN !== undefined;
    if (!classLike) {
      const original = parameter.constraint.originalText ?? bound.text;
      return `${name} /* extends ${original.replace(/\*\//g, "* /")} */`;
    }
    return `${name} extends ${bound.text}`;
  });
  return `<${parts.join(", ")}>`;
}

export function emitType(type: IRType, context: EmitContext): string {
  return emit(type, context).text;
}

/** Whether an emitted type string already admits null. */
export function typeAdmitsNull(type: IRType, context: EmitContext): boolean {
  return emit(type, context).admitsNull;
}

/**
 * A dart:core type name, qualified through `dart:core` when a member of the
 * class being emitted shadows it (a JavaScript property named `bool`).
 */
function core(name: string, context: EmitContext): string {
  return context.shadowed?.has(name) ? context.plan.importName("dart:core", name) : name;
}

function nullable(base: Emitted, isNullable: boolean): Emitted {
  if (!isNullable || base.admitsNull) return base;
  return { text: `${base.text}?`, admitsNull: true };
}

function plain(text: string): Emitted {
  return { text, admitsNull: false };
}

/** Start character of a support-typedef token (see `LibraryPlan`). */
const SUPPORT_MARK = "\uE003";

const DYNAMIC: Emitted = { text: "dynamic", admitsNull: true };

function emit(type: IRType, context: EmitContext): Emitted {
  switch (type.kind) {
    case TypeKind.Any:
    case TypeKind.Unknown:
      return DYNAMIC;
    case TypeKind.Never:
      return type.isNullable ? { text: "Null", admitsNull: true } : plain("Never");
    case TypeKind.Null:
    case TypeKind.Undefined:
      return { text: "Null", admitsNull: true };
    case TypeKind.Void:
      return { text: "void", admitsNull: true };
    case TypeKind.String:
    case TypeKind.StringLiteral:
      return nullable(plain(core("String", context)), type.isNullable);
    case TypeKind.Number:
    case TypeKind.NumberLiteral:
      return nullable(plain(core("num", context)), type.isNullable);
    case TypeKind.Boolean:
    case TypeKind.BooleanLiteral:
      return nullable(plain(core("bool", context)), type.isNullable);
    case TypeKind.BigInt:
      return nullable(bigIntSupport(context), type.isNullable);
    case TypeKind.Object:
      return nullable(plain(core("Object", context)), type.isNullable);
    case TypeKind.Array:
      return nullable(
        plain(`${core("List", context)}<${emit(type.elementType!, context).text}>`),
        type.isNullable,
      );
    case TypeKind.Tuple:
      return nullable(tuple(type, context), type.isNullable);
    case TypeKind.Function:
      return nullable(functionType(type, context), type.isNullable);
    case TypeKind.Union:
      return union(type, context);
    case TypeKind.Intersection:
      return intersection(type, context);
    case TypeKind.TypeReference:
      return reference(type, context);
    case TypeKind.Unsupported:
      if (type.aliasName) return { text: type.aliasName, admitsNull: true };
      return fallback(
        context,
        "Unrepresentable",
        type.originalText ?? type.unsupportedReason ?? "unknown",
        `Unrepresentable in Dart: ${codeSpan(type.originalText ?? "unknown")}`,
      );
    default:
      return fallback(
        context,
        "Unrepresentable",
        type.originalText ?? type.kind,
        `Unrepresentable in Dart: ${codeSpan(type.originalText ?? type.kind)}`,
      );
  }
}

function tuple(type: IRType, context: EmitContext): Emitted {
  const members = (type.tupleTypes ?? []).map((member) => emit(member, context));
  const unique = [...new Set(members.map((member) => member.text))];
  const list = core("List", context);
  if (unique.length === 1) return plain(`${list}<${unique[0]}>`);
  if (unique.length === 0) return plain(`${list}<dynamic>`);
  return plain(`${list}<${core("Object", context)}?>`);
}

/** `R Function(A, [B])`, generic when the TypeScript signature is. */
function functionType(type: IRType, context: EmitContext): Emitted {
  const inner = withTypeParams(context, type.typeParams);
  const returnType = type.returnType ? emit(type.returnType, inner).text : "void";
  const required: string[] = [];
  const optional: string[] = [];
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

/**
 * How many optional positional parameters stand in for a rest parameter.
 * js_facade_gen §6.4 uses five; package:js omits unpassed optionals, so
 * JavaScript sees exactly the arguments given (`E-31`).
 */
export const REST_ARITY = 5;

export function restElement(parameter: IRParameter, context: EmitContext): string {
  const type = parameter.type;
  if (type.kind === TypeKind.Array && type.elementType) {
    return emit(type.elementType, context).text;
  }
  if (
    type.kind === TypeKind.TypeReference &&
    (type.name === "Array" || type.name === "ReadonlyArray") &&
    type.genericArgs?.length === 1
  ) {
    return emit(type.genericArgs[0], context).text;
  }
  return "dynamic";
}

function arrayElement(type: IRType): IRType | undefined {
  if (type.kind === TypeKind.Array) return type.elementType;
  if (
    type.kind === TypeKind.TypeReference &&
    (type.host?.qualifiedName === "Array" || type.host?.qualifiedName === "ReadonlyArray")
  ) {
    return type.genericArgs?.[0];
  }
  return undefined;
}

/** `List<lub>` when every member is an array, else undefined. */
function listUpperBound(members: readonly IRType[], context: EmitContext): string | undefined {
  if (members.length < 2) return undefined;
  const elements = members.map(arrayElement);
  if (elements.some((element) => !element)) return undefined;
  const list = core("List", context);
  const texts = [...new Set(elements.map((element) => emit(element!, context).text))];
  if (texts.length === 1) return `${list}<${texts[0]}>`;
  const inner = listUpperBound(elements as IRType[], context);
  return `${list}<${inner ?? "dynamic"}>`;
}

type UnionShape =
  | { kind: "single"; emitted: Emitted }
  | { kind: "degraded"; members: string[]; display: string };

function unionShape(type: IRType, context: EmitContext): UnionShape {
  const members = type.unionTypes ?? [];
  const hasVoid = members.some((member) => member.kind === TypeKind.Void);
  const concrete = members.filter((member) => member.kind !== TypeKind.Void);
  if (concrete.length === 0) return { kind: "single", emitted: { text: "void", admitsNull: true } };

  const emitted = concrete.map((member) => emit(member, context));
  const isNullable = type.isNullable || hasVoid || emitted.some((member) => member.admitsNull);
  const unique = [...new Set(emitted.map((member) => stripNullable(member.text)))];
  if (unique.length === 1) {
    const only = emitted.find((member) => stripNullable(member.text) === unique[0])!;
    if (only.admitsNull && !only.text.endsWith("?")) return { kind: "single", emitted: only };
    return { kind: "single", emitted: nullable(plain(unique[0]), isNullable) };
  }
  if (unique.includes("dynamic")) return { kind: "single", emitted: DYNAMIC };
  // A union of lists is a list of the members' least upper bound
  // (`number[][] | number[][][]` → `List<List<dynamic>>`), as js_facade_gen
  // computes; more precise than degrading the whole union.
  const listBound = listUpperBound(concrete, context);
  if (listBound) return { kind: "single", emitted: nullable(plain(listBound), isNullable) };
  // Members that are themselves support typedefs are described by their
  // TypeScript spelling; their Dart names are not allocated yet.
  const described = unique.map((text) => {
    if (!text.includes(SUPPORT_MARK)) return plainText(text);
    const member = concrete.find((_, index) => stripNullable(emitted[index].text) === text);
    return member?.originalText ?? member?.name ?? plainText(text);
  });
  return { kind: "degraded", members: described, display: described.join(" | ") };
}

/**
 * When an author's alias is itself a degraded union, the alias is the named
 * degradation; returns the doc text for it instead of minting a second name.
 */
export function aliasUnionDisplay(type: IRType, context: EmitContext): string | undefined {
  if (type.kind !== TypeKind.Union) return undefined;
  const shape = unionShape(type, context);
  return shape.kind === "degraded" ? shape.display : undefined;
}

function union(type: IRType, context: EmitContext): Emitted {
  const shape = unionShape(type, context);
  if (shape.kind === "single") return shape.emitted;
  // A multi-member union is a named degradation, stated once (`E-18`,
  // design principle 2). It is deliberately not generic: the typedef is
  // `dynamic`, so arguments would carry no meaning.
  const token = context.plan.support({
    key: `union:${shape.display}`,
    base: unionBase(shape.members),
    dynamicLike: true,
    render: (name) => [
      `/// A JavaScript union of ${codeSpan(shape.display)}; Dart has no union types.`,
      `typedef ${name} = dynamic;`,
    ],
  });
  return { text: token, admitsNull: true };
}

function unionBase(members: readonly string[]): string {
  const words = members.map((member) => supportBase("", member));
  const joined = words.join("Or");
  return joined.length > 60 ? `${words[0]}OrOther` : joined || "Union";
}

/** Emitted text with placeholder tokens reduced to bare names, for docs/keys. */
function plainText(text: string): string {
  return text
    .replace(/\uE000\d+\uE001([^\uE002]+)\uE002/g, "$1")
    .replace(/\uE003\d+\uE004/g, "…");
}

function stripNullable(text: string): string {
  return text.endsWith("?") ? text.slice(0, -1) : text;
}

/**
 * `A & B` is an `A`, so the first member is a real supertype and more useful
 * than any degradation (js_facade_gen §5.3). The discarded members stay on
 * record in a comment.
 */
function intersection(type: IRType, context: EmitContext): Emitted {
  const members = (type.intersectionTypes ?? []).map((member) => emit(member, context));
  const unique = [...new Set(members.map((member) => member.text))];
  const first = members[0] ?? DYNAMIC;
  const base = nullable(first, type.isNullable);
  if (unique.length <= 1) return base;
  const comment = [
    ...new Set(
      (type.intersectionTypes ?? []).map((member, index) =>
        members[index].text.includes(SUPPORT_MARK)
          ? member.originalText ?? member.name
          : plainText(members[index].text),
      ),
    ),
  ].join("&");
  return { text: `${base.text} /* ${comment.replace(/\*\//g, "* /")} */`, admitsNull: base.admitsNull };
}

function reference(type: IRType, context: EmitContext): Emitted {
  // 1. Lexical type parameter.
  if (!type.reference && !type.host) {
    const scoped = context.scope.get(type.name);
    if (scoped) {
      // A substitution may already admit null (`dynamic`, `String?`, a
      // degradation typedef).
      const admits =
        scoped === "dynamic" || scoped.endsWith("?") || isSupportToken(scoped) || scoped === "void";
      return admits ? { text: scoped, admitsNull: true } : nullable(plain(scoped), type.isNullable);
    }
  }

  // 2. Linked project declaration.
  const target = type.reference?.resolvedFQN
    ? context.index.typeTarget(type.reference.resolvedFQN)
    : undefined;
  if (target?.kind === "enumValue") return nullable(plain(target.dartType), type.isNullable);
  if (target?.kind === "type") {
    const name =
      target.file !== context.file
        ? context.plan.siblingName(
            context.index.outputPathOfFile.get(target.file)!,
            target.dartName,
          )
        : context.shadowed?.has(target.dartName) && context.outputPath
          ? context.plan.siblingName(context.outputPath, target.dartName)
          : target.dartName;
    const args = padTypeArguments(type.genericArgs ?? [], target.typeParams, context);
    const aliasNullable =
      target.facet.ir.kind === "typeAlias" &&
      irAdmitsNull((target.facet.ir as IRTypeAlias).type, context, new Set([target.fqn]));
    // A `dynamic` alias ignores its arguments, and instantiating one with a
    // generic function's own type parameter crashes the Dart 3.13 analyzer.
    if (aliasNullable) return { text: name, admitsNull: true };
    return nullable(plain(`${name}${args}`), type.isNullable);
  }

  // 3. Host environment type, matched by checker identity.
  if (type.host) return host(type, type.host, context);

  // 4. A project reference the linker could not resolve.
  const written = type.reference?.writtenName ?? type.name;
  return fallback(
    context,
    "",
    written,
    `Unresolved TypeScript reference ${codeSpan(type.originalText ?? written)}; its declaration is not part of this build.`,
  );
}

/**
 * Whether a type alias's right-hand side lowers to something that already
 * admits null (`dynamic`, a nullable type, a degradation). Decided on the IR so
 * that asking does not register imports or support declarations. A bound
 * naming such an alias is kept as a comment; `T extends <dynamic alias>`
 * crashes the Dart 3.13 analyzer.
 */
function irAdmitsNull(type: IRType, context: EmitContext, seen: Set<string>): boolean {
  if (type.isNullable) return true;
  switch (type.kind) {
    case TypeKind.Any:
    case TypeKind.Unknown:
    case TypeKind.Void:
    case TypeKind.Null:
    case TypeKind.Undefined:
    case TypeKind.Unsupported:
      return true;
    case TypeKind.Union: {
      const members = (type.unionTypes ?? []).filter((member) => member.kind !== TypeKind.Void);
      if ((type.unionTypes ?? []).some((member) => member.kind === TypeKind.Void)) return true;
      if (members.some((member) => irAdmitsNull(member, context, seen))) return true;
      const kinds = new Set(members.map((member) => scalarKind(member) ?? JSON.stringify(member.reference?.resolvedFQN ?? member.originalText)));
      return kinds.size > 1;
    }
    case TypeKind.TypeReference: {
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
      return irAdmitsNull((target.facet.ir as IRTypeAlias).type, context, seen);
    }
    default:
      return false;
  }
}

function scalarKind(type: IRType): string | undefined {
  switch (type.kind) {
    case TypeKind.String:
    case TypeKind.StringLiteral:
      return "String";
    case TypeKind.Number:
    case TypeKind.NumberLiteral:
      return "num";
    case TypeKind.Boolean:
    case TypeKind.BooleanLiteral:
      return "bool";
    default:
      return undefined;
  }
}

/**
 * Applies TypeScript default type arguments, which Dart cannot declare, at
 * the use site (`E-03` policy): a reference written with fewer arguments has
 * its missing trailing arguments filled from the target's defaults, or
 * `dynamic` when it has none; surplus arguments are dropped. A reference
 * written with none stays raw, so Dart instantiates it to bounds rather than
 * pinning a default that may violate another declaration's bound.
 */
function padTypeArguments(
  args: readonly IRType[],
  typeParams: readonly IRTypeParam[],
  context: EmitContext,
): string {
  if (typeParams.length === 0) return "";
  const emitted = typeParams.map((parameter, index) => {
    const arg = args[index] ?? parameter.default;
    return arg ? emit(arg, context).text : "dynamic";
  });
  if (args.length === 0) return "";
  return `<${emitted.join(", ")}>`;
}

/** `typedef` used for `bigint`, which has no faithful package:js type. */
function bigIntSupport(context: EmitContext): Emitted {
  const shared = sharedName(context, "JSBigInt");
  if (shared) return plain(shared);
  const token = context.plan.support({
    key: "host:bigint",
    base: "JSBigInt",
    dynamicLike: false,
    render: (name) => [
      "/// A JavaScript `bigint`. Dart's `BigInt` is a different runtime type.",
      `typedef ${name} = Object;`,
    ],
  });
  return plain(token);
}

const DOM_LIBRARY = /^lib\.(dom|webworker)/;
const ES_LIBRARY = /^lib\.(es|dom)/;

/** Whether a host identity maps to a Dart SDK platform class. */
export function isPlatformType(identity: IRHostTypeIdentity): boolean {
  return platformMapping(identity) !== undefined;
}

function platformMapping(
  identity: IRHostTypeIdentity,
): { library: string; name: string } | undefined {
  if (identity.family !== "typescript") return undefined;
  for (const [library, names] of Object.entries(BROWSER_TYPES)) {
    const dartName = names[identity.qualifiedName];
    if (!dartName) continue;
    const pattern =
      library === "dart:typed_data" || library === "dart:math" ? ES_LIBRARY : DOM_LIBRARY;
    if (identity.libraries.some((file) => pattern.test(file))) {
      return { library, name: dartName };
    }
  }
  return undefined;
}

function host(type: IRType, identity: IRHostTypeIdentity, context: EmitContext): Emitted {
  const args = type.genericArgs ?? [];
  const arg = (index: number) => (args[index] ? emit(args[index], context).text : "dynamic");
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
        type.isNullable,
      );
    }
  }
  const written = type.originalText ?? identity.qualifiedName;
  return fallback(
    context,
    "",
    written,
    `TypeScript host type ${codeSpan(written)} (${identity.libraries[0] ?? identity.family}) has no Dart mapping.`,
  );
}

/** The per-library `Promise<T>` interop class (js_facade_gen §2.16). */
function promiseSupport(context: EmitContext): string {
  const shared = sharedName(context, "Promise");
  if (shared) return shared;
  const promiseToFuture = context.plan.importName(
    "package:js/js_util.dart",
    "promiseToFuture",
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
      "}",
    ],
  });
}

/**
 * A named `dynamic` typedef stated once per library (design principle 2):
 * unresolved references, unmapped host types and unrepresentable syntax.
 */
function fallback(
  context: EmitContext,
  prefix: string,
  text: string,
  doc: string,
): Emitted {
  const token = context.plan.support({
    key: `fallback:${text}`,
    base: supportBase(prefix, text),
    dynamicLike: true,
    render: (name) => [`/// ${doc}`, `typedef ${name} = dynamic;`],
  });
  return { text: token, admitsNull: true };
}

export { isSupportToken };
