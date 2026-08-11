import { IRClass } from "@ir/class";
import { IRDeclKind } from "@ir/declaration";
import {
  IRGetAccessor,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/interface";
import { IRConstructSignature, IRTypeParam } from "@ir/signature";
import { IRType, TypeKind } from "@ir/type";
import { IRVariable } from "@ir/variable";
import {
  namespaceOfSymbolType,
  Symbol,
  SymbolFacet,
  SymbolType,
} from "@/symbol";
import { terminalNameOfFQN } from "@/symbol/fqn";
import { semanticKey } from "./shape";
import { SemanticReport } from "./types";

export function mergeDeclarationGroups(
  draft: Map<string, Symbol[]>,
  report: SemanticReport,
  redirects: Map<string, string>,
): void {
  mergeSameFQNTypeDeclarations(draft, report);
  mergeConstructorCompanions(draft, report, redirects);
  mergeDefaultInterfaceValues(draft, report, redirects);
  diagnoseUnsupportedGroups(draft, report);
}

function mergeSameFQNTypeDeclarations(
  draft: Map<string, Symbol[]>,
  report: SemanticReport,
): void {
  for (const [fqn, group] of draft) {
    const symbol = group[0];
    const interfaces = symbol.facets.filter(
      (facet) => facet.ir.kind === IRDeclKind.Interface,
    );
    const classes = symbol.facets.filter(
      (facet) => facet.ir.kind === IRDeclKind.Class,
    );

    if (interfaces.length > 1) {
      const merged = mergeInterfaces(fqn, interfaces, report);
      if (merged) {
        symbol.facets = [
          ...symbol.facets.filter(
            (facet) => facet.ir.kind !== IRDeclKind.Interface,
          ),
          merged,
        ].sort(bySourceOrder);
        report.declarationGroupsMerged++;
      }
    }

    const currentInterfaces = symbol.facets.filter(
      (facet) => facet.ir.kind === IRDeclKind.Interface,
    );
    const currentClasses = symbol.facets.filter(
      (facet) => facet.ir.kind === IRDeclKind.Class,
    );
    if (currentClasses.length === 1 && currentInterfaces.length === 1) {
      const merged = mergeClassInterface(
        fqn,
        currentClasses[0],
        currentInterfaces[0],
        report,
      );
      if (merged) {
        symbol.facets = [
          ...symbol.facets.filter(
            (facet) =>
              facet.ir.kind !== IRDeclKind.Class &&
              facet.ir.kind !== IRDeclKind.Interface,
          ),
          merged,
        ].sort(bySourceOrder);
        report.declarationGroupsMerged++;
      }
    } else if (classes.length > 1 || currentClasses.length > 1) {
      diagnoseConflict(
        report,
        fqn,
        "Multiple class declarations cannot be merged safely",
      );
    }
  }
}

function mergeInterfaces(
  fqn: string,
  facets: readonly SymbolFacet[],
  report: SemanticReport,
): SymbolFacet | undefined {
  const declarations = facets.map(
    (facet) => facet.ir as IRInterface,
  );
  if (!compatibleTypeParameters(declarations.map((value) => value.typeParams))) {
    diagnoseConflict(report, fqn, "Interface type parameters are incompatible");
    return undefined;
  }

  const properties = mergeNamedMembers(
    declarations.flatMap((value) => value.properties),
  );
  const getters = mergeNamedMembers(
    declarations.flatMap((value) => value.getAccessors),
  );
  const setters = mergeNamedMembers(
    declarations.flatMap((value) => value.setAccessors),
  );
  if (!properties || !getters || !setters) {
    diagnoseConflict(
      report,
      fqn,
      "Interface declarations contain conflicting non-overload members",
    );
    return undefined;
  }

  const canonical = structuredClone(declarations[0]);
  canonical.jsDoc = combinedDocs(declarations);
  canonical.extends = uniqueSemantic(
    declarations.flatMap((value) => value.extends),
  );
  canonical.properties = properties as IRProperties[];
  canonical.methods = uniqueSemantic(
    declarations.flatMap((value) => value.methods),
  );
  canonical.callSignatures = uniqueSemantic(
    declarations.flatMap((value) => value.callSignatures),
  );
  canonical.constructSignatures = uniqueSemantic(
    declarations.flatMap((value) => value.constructSignatures),
  );
  canonical.getAccessors = getters as IRGetAccessor[];
  canonical.setAccessors = setters as IRSetAccessor[];
  canonical.indexSignatures = uniqueSemantic(
    declarations.flatMap((value) => value.indexSignatures),
  );

  return combinedFacet(facets, SymbolType.INTERFACE, canonical, "type");
}

function mergeClassInterface(
  fqn: string,
  classFacet: SymbolFacet,
  interfaceFacet: SymbolFacet,
  report: SemanticReport,
): SymbolFacet | undefined {
  const classDeclaration = classFacet.ir as IRClass;
  const interfaceDeclaration = interfaceFacet.ir as IRInterface;
  if (
    !compatibleTypeParameters([
      classDeclaration.typeParams,
      interfaceDeclaration.typeParams,
    ])
  ) {
    diagnoseConflict(report, fqn, "Class/interface type parameters are incompatible");
    return undefined;
  }
  if (
    interfaceDeclaration.callSignatures.length > 0 ||
    interfaceDeclaration.constructSignatures.length > 0
  ) {
    diagnoseConflict(
      report,
      fqn,
      "Callable or constructable interface facets cannot be folded into IRClass",
    );
    return undefined;
  }

  const properties = mergeNamedMembers([
    ...classDeclaration.properties,
    ...interfaceDeclaration.properties,
  ]);
  const getters = mergeNamedMembers([
    ...classDeclaration.getAccessors,
    ...interfaceDeclaration.getAccessors,
  ]);
  const setters = mergeNamedMembers([
    ...classDeclaration.setAccessors,
    ...interfaceDeclaration.setAccessors,
  ]);
  if (!properties || !getters || !setters) {
    diagnoseConflict(
      report,
      fqn,
      "Class/interface declarations contain conflicting non-overload members",
    );
    return undefined;
  }

  const merged = structuredClone(classDeclaration);
  merged.jsDoc = combinedDocs([classDeclaration, interfaceDeclaration]);
  merged.implements = uniqueSemantic([
    ...merged.implements,
    ...interfaceDeclaration.extends,
  ]);
  merged.properties = properties as IRProperties[];
  merged.methods = uniqueSemantic([
    ...merged.methods,
    ...interfaceDeclaration.methods,
  ]);
  merged.getAccessors = getters as IRGetAccessor[];
  merged.setAccessors = setters as IRSetAccessor[];
  merged.indexSignatures = uniqueSemantic([
    ...merged.indexSignatures,
    ...interfaceDeclaration.indexSignatures,
  ]);
  return combinedFacet(
    [classFacet, interfaceFacet],
    SymbolType.CLASS,
    merged,
    "both",
  );
}

function mergeConstructorCompanions(
  draft: Map<string, Symbol[]>,
  report: SemanticReport,
  redirects: Map<string, string>,
): void {
  const variables = [...draft.entries()].flatMap(([fqn, group]) =>
    group[0].facets
      .filter((facet) => facet.ir.kind === IRDeclKind.Variable)
      .map((facet) => ({ fqn, facet })),
  );

  for (const { fqn: variableFQN, facet: variableFacet } of variables) {
    const shape = anonymousValueShape(variableFacet, draft);
    if (!shape) continue;
    const target = constructorTarget(shape.facet.ir as IRInterface);
    if (target.kind === "none") continue;
    if (target.kind === "ambiguous") {
      report.diagnostics.push({
        code: "AMBIGUOUS_CONSTRUCTOR_COMPANION",
        ownerFQN: variableFQN,
        action: "preservedUnmerged",
        message: `Constructor companion targets disagree: ${target.candidates.join(", ")}`,
      });
      continue;
    }

    const targetGroup = draft.get(target.fqn);
    const targetFacet = targetGroup?.[0].facets.find(
      (facet) => facet.ir.kind === IRDeclKind.Interface,
    );
    if (!targetFacet) {
      diagnoseConflict(
        report,
        variableFQN,
        `Constructor target '${target.fqn}' is not an interface binding`,
      );
      continue;
    }

    const synthesized = synthesizeClass(
      variableFacet,
      targetFacet,
      shape.facet,
    );
    const variableGroup = draft.get(variableFQN)![0];
    const unrelatedVariableFacets = variableGroup.facets.filter(
      (facet) => facet !== variableFacet && facet !== targetFacet,
    );
    variableGroup.facets = [...unrelatedVariableFacets, synthesized].sort(
      bySourceOrder,
    );

    draft.delete(shape.fqn);
    redirects.set(shape.fqn, variableFQN);
    report.redirects.push({
      fromFQN: shape.fqn,
      toFQN: variableFQN,
      reason: "constructorCompanion",
    });
    if (target.fqn !== variableFQN) {
      draft.delete(target.fqn);
      redirects.set(target.fqn, variableFQN);
      report.redirects.push({
        fromFQN: target.fqn,
        toFQN: variableFQN,
        reason: "constructorCompanion",
      });
    }
    report.declarationGroupsMerged++;
  }
}

function mergeDefaultInterfaceValues(
  draft: Map<string, Symbol[]>,
  report: SemanticReport,
  redirects: Map<string, string>,
): void {
  for (const [fqn, group] of [...draft]) {
    const symbol = group[0];
    const interfaceFacet = symbol.facets.find(
      (facet) => facet.ir.kind === IRDeclKind.Interface,
    );
    const variableFacet = symbol.facets.find(
      (facet) => facet.ir.kind === IRDeclKind.Variable,
    );
    if (!interfaceFacet || !variableFacet) continue;

    const shape = anonymousValueShape(variableFacet, draft);
    if (!shape) continue;
    const shapeIR = shape.facet.ir as IRInterface;
    if (
      constructorTarget(shapeIR).kind !== "none" ||
      shapeIR.callSignatures.length > 0
    ) {
      continue;
    }

    const base = interfaceFacet.ir as IRInterface;
    const merged = structuredClone(base);
    merged.jsDoc = combinedDocs([base, variableFacet.ir]);
    merged.properties = [
      ...merged.properties,
      ...shapeIR.properties.map(asStaticProperty),
    ];
    merged.methods = [
      ...merged.methods,
      ...shapeIR.methods.map(asStaticMethod),
    ];
    merged.getAccessors = [
      ...merged.getAccessors,
      ...shapeIR.getAccessors.map((value) => ({ ...value, isStatic: true })),
    ];
    merged.setAccessors = [
      ...merged.setAccessors,
      ...shapeIR.setAccessors.map((value) => ({ ...value, isStatic: true })),
    ];

    const combined = combinedFacet(
      [interfaceFacet, variableFacet, shape.facet],
      SymbolType.INTERFACE,
      merged,
      "both",
    );
    symbol.facets = [
      ...symbol.facets.filter(
        (facet) => facet !== interfaceFacet && facet !== variableFacet,
      ),
      combined,
    ].sort(bySourceOrder);
    draft.delete(shape.fqn);
    redirects.set(shape.fqn, fqn);
    report.redirects.push({
      fromFQN: shape.fqn,
      toFQN: fqn,
      reason: "constructorCompanion",
    });
    report.declarationGroupsMerged++;
  }
}

function anonymousValueShape(
  variableFacet: SymbolFacet,
  draft: ReadonlyMap<string, readonly Symbol[]>,
): { fqn: string; facet: SymbolFacet } | undefined {
  const variable = variableFacet.ir as IRVariable;
  if (
    variable.type.kind !== TypeKind.TypeReference ||
    variable.type.reference?.lookup.kind !== "checker" ||
    variable.type.reference.lookup.candidates.length !== 1
  ) {
    return undefined;
  }
  const fqn = variable.type.reference.lookup.candidates[0];
  if (!terminalNameOfFQN(fqn).startsWith("Anon_")) return undefined;
  const facet = draft
    .get(fqn)?.[0]
    .facets.find((candidate) => candidate.ir.kind === IRDeclKind.Interface);
  return facet ? { fqn, facet } : undefined;
}

type ConstructorTarget =
  | { kind: "none" }
  | { kind: "resolved"; fqn: string }
  | { kind: "ambiguous"; candidates: string[] };

function constructorTarget(shape: IRInterface): ConstructorTarget {
  const candidates: string[] = [];
  const prototype = shape.properties.find(
    (property) => property.name === "prototype",
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

function referenceCandidates(type: IRType): string[] {
  return type.reference?.lookup.kind === "checker"
    ? type.reference.lookup.candidates
    : [];
}

function synthesizeClass(
  variableFacet: SymbolFacet,
  targetFacet: SymbolFacet,
  shapeFacet: SymbolFacet,
): SymbolFacet {
  const variable = variableFacet.ir as IRVariable;
  const target = targetFacet.ir as IRInterface;
  const shape = shapeFacet.ir as IRInterface;
  const declaration: IRClass = {
    kind: IRDeclKind.Class,
    name: variable.name,
    modifiers: variable.modifiers,
    loc: variable.loc,
    jsDoc: combinedDocs([target, variable]),
    extends: undefined,
    implements: structuredClone(target.extends),
    isAbstract: false,
    typeParams: structuredClone(target.typeParams),
    constructors: shape.constructSignatures.map(withoutReturnType),
    properties: [
      ...structuredClone(target.properties),
      ...shape.properties
        .filter((property) => property.name !== "prototype")
        .map(asStaticProperty),
    ],
    methods: [
      ...structuredClone(target.methods),
      ...shape.methods.map(asStaticMethod),
    ],
    getAccessors: [
      ...structuredClone(target.getAccessors),
      ...shape.getAccessors.map((value) => ({ ...value, isStatic: true })),
    ],
    setAccessors: [
      ...structuredClone(target.setAccessors),
      ...shape.setAccessors.map((value) => ({ ...value, isStatic: true })),
    ],
    indexSignatures: structuredClone(target.indexSignatures),
  };
  return combinedFacet(
    [variableFacet, targetFacet, shapeFacet],
    SymbolType.CLASS,
    declaration,
    "both",
  );
}

function withoutReturnType(
  signature: IRConstructSignature,
): IRConstructSignature {
  const clone = structuredClone(signature);
  delete clone.returnType;
  return clone;
}

function asStaticProperty(property: IRProperties): IRProperties {
  return { ...structuredClone(property), isStatic: true };
}

function asStaticMethod(method: IRMethod): IRMethod {
  return { ...structuredClone(method), isStatic: true };
}

function combinedFacet(
  facets: readonly SymbolFacet[],
  type: SymbolType,
  ir: SymbolFacet["ir"],
  namespace: SymbolFacet["namespace"],
): SymbolFacet {
  const sorted = [...facets].sort(bySourceOrder);
  return {
    type,
    namespace,
    ir,
    origin: structuredClone(sorted[0].origin),
    emit: sorted.some((facet) => facet.emit),
    provenance: sorted.flatMap((facet) => facet.provenance),
  };
}

function compatibleTypeParameters(
  lists: readonly IRTypeParam[][],
): boolean {
  const first = semanticKey(lists[0] ?? []);
  return lists.every((list) => semanticKey(list) === first);
}

function mergeNamedMembers<T extends { name: string }>(
  members: readonly T[],
): T[] | undefined {
  const result: T[] = [];
  const byName = new Map<string, T>();
  for (const member of members) {
    const previous = byName.get(member.name);
    if (!previous) {
      const clone = structuredClone(member);
      byName.set(member.name, clone);
      result.push(clone);
      continue;
    }
    if (semanticKey(previous) !== semanticKey(member)) return undefined;
  }
  return result;
}

function uniqueSemantic<T>(values: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = semanticKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(structuredClone(value));
  }
  return result;
}

function combinedDocs(
  declarations: readonly { jsDoc?: string }[],
): string | undefined {
  const docs = [
    ...new Set(
      declarations
        .map((declaration) => declaration.jsDoc?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  return docs.length > 0 ? docs.join("\n\n") : undefined;
}

function diagnoseUnsupportedGroups(
  draft: ReadonlyMap<string, readonly Symbol[]>,
  report: SemanticReport,
): void {
  for (const [fqn, group] of draft) {
    const facets = group[0].facets;
    if (facets.length < 2) continue;
    const kinds = facets.map((facet) => facet.ir.kind);
    const allFunctions = kinds.every((kind) => kind === IRDeclKind.Function);
    const typeValuePair =
      facets.some((facet) => facet.namespace === "type") &&
      facets.some((facet) => facet.namespace === "value");
    if (allFunctions || typeValuePair) continue;
    report.diagnostics.push({
      code: "UNSUPPORTED_DECLARATION_GROUP",
      ownerFQN: fqn,
      action: "preservedUnmerged",
      message: `Declaration group is preserved without merging: ${kinds.join(", ")}`,
    });
  }
}

function diagnoseConflict(
  report: SemanticReport,
  fqn: string,
  message: string,
): void {
  if (
    report.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "DECLARATION_MERGE_CONFLICT" &&
        diagnostic.ownerFQN === fqn &&
        diagnostic.message === message,
    )
  ) {
    return;
  }
  report.diagnostics.push({
    code: "DECLARATION_MERGE_CONFLICT",
    ownerFQN: fqn,
    action: "preservedUnmerged",
    message,
  });
}

function bySourceOrder(a: SymbolFacet, b: SymbolFacet): number {
  return a.origin.sourceOrder - b.origin.sourceOrder;
}
