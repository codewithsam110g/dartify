import { IRClass } from "@ir/class";
import { IRDeclKind, IRDeclarationUnion } from "@ir/declaration";
import { IREnum } from "@ir/enum";
import { IRFunction } from "@ir/function";
import {
  IRGetAccessor,
  IRInterface,
  IRMethod,
  IRProperties,
  IRSetAccessor,
} from "@ir/interface";
import { IRBindingName } from "@ir/node";
import {
  IRCallSignature,
  IRConstructSignature,
  IRParameter,
  IRTypeParam,
} from "@ir/signature";
import { IRTypeAlias } from "@ir/typealias";
import { forEachIRType } from "@ir/visit";
import { Symbol, SymbolFacet } from "@/symbol";
import { sourceFileOfFQN } from "@/symbol/fqn";
import { legalDartName } from "./keywords";
import { SemanticReport } from "./types";

export function assignSemanticNames(
  draft: ReadonlyMap<string, readonly Symbol[]>,
  report: SemanticReport,
): void {
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

function renameOverloads(
  draft: ReadonlyMap<string, readonly Symbol[]>,
  report: SemanticReport,
): void {
  for (const group of draft.values()) {
    const symbol = group[0];
    const functions = symbol.facets.filter(
      (facet) => facet.ir.kind === IRDeclKind.Function,
    );
    if (functions.length > 1) {
      const ordered = [...functions].sort(bySourceOrder);
      ordered.forEach((facet, index) => {
        const declaration = facet.ir as IRFunction;
        declaration.dartName = `${declaration.name}_${index + 1}`;
        declaration.jsName = declaration.name;
      });
      report.overloadGroupsRenamed++;
      report.overloadsRenamed += ordered.length;
    }

    for (const facet of symbol.facets) {
      if (
        facet.ir.kind !== IRDeclKind.Class &&
        facet.ir.kind !== IRDeclKind.Interface
      ) {
        continue;
      }
      const declaration = facet.ir as IRClass | IRInterface;
      const groups = new Map<string, IRMethod[]>();
      for (const method of declaration.methods) {
        const key = `${method.isStatic ? "static" : "instance"}\u0000${method.name}`;
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

interface TopLevelEntry {
  facet: SymbolFacet;
  forcedDualValue: boolean;
  preferred: string;
  scopeSegments: string[];
}

function allocateTopLevelNames(
  draft: ReadonlyMap<string, readonly Symbol[]>,
  report: SemanticReport,
): void {
  const byFile = new Map<string, TopLevelEntry[]>();
  for (const [fqn, group] of draft) {
    const symbol = group[0];
    const hasSeparateType = symbol.facets.some(
      (facet) => facet.namespace === "type",
    );
    const hasSeparateValue = symbol.facets.some(
      (facet) => facet.namespace === "value",
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
      const preferred = forcedDualValue
        ? withJSPrefix(preassigned ?? escaped)
        : preassigned ?? escaped;
      const entry: TopLevelEntry = {
        facet,
        forcedDualValue,
        preferred,
        scopeSegments: dartScopeSegments(facet),
      };
      const file = sourceFileOfFQN(fqn);
      const entries = byFile.get(file) ?? [];
      entries.push(entry);
      byFile.set(file, entries);
    }
  }

  for (const entries of byFile.values()) {
    const used = new Set<string>();
    entries.sort((a, b) => {
      const aScoped = a.scopeSegments.length > 0 ? 1 : 0;
      const bScoped = b.scopeSegments.length > 0 ? 1 : 0;
      return aScoped - bScoped || bySourceOrder(a.facet, b.facet);
    });
    for (const entry of entries) {
      const allocated = allocateName(
        entry.preferred,
        entry.scopeSegments,
        used,
        (candidate) =>
          generatedCompanionNames(entry.facet, candidate).every(
            (name) => !used.has(name),
          ),
      );
      entry.facet.ir.dartName = allocated;
      entry.facet.ir.jsName = entry.facet.ir.name;
      if (entry.forcedDualValue) report.dualFacetRenames++;
      if (
        allocated !== entry.preferred &&
        entry.scopeSegments.length > 0 &&
        !allocated.match(/_\d+$/)
      ) {
        report.namespaceRenames++;
      }
      used.add(allocated);
      for (const companion of generatedCompanionNames(entry.facet, allocated)) {
        used.add(companion);
      }
    }
  }
}

function allocateName(
  preferred: string,
  scopeSegments: readonly string[],
  used: ReadonlySet<string>,
  additionalAvailability: (candidate: string) => boolean = () => true,
): string {
  const available = (candidate: string) =>
    !used.has(candidate) && additionalAvailability(candidate);
  if (available(preferred)) return preferred;
  for (let count = 1; count <= scopeSegments.length; count++) {
    const prefix = scopeSegments.slice(-count).join("_");
    const candidate = `${prefix}_${preferred}`;
    if (available(candidate)) return candidate;
  }
  let suffix = 2;
  while (!available(`${preferred}_${suffix}`)) suffix++;
  return `${preferred}_${suffix}`;
}

function generatedCompanionNames(
  facet: SymbolFacet,
  declarationName: string,
): string[] {
  if (facet.ir.kind === IRDeclKind.Interface) {
    return [`${declarationName}Extension`];
  }
  if (facet.ir.kind === IRDeclKind.Enum) {
    return [`${declarationName}Enum`];
  }
  if (facet.ir.kind === IRDeclKind.Class) {
    const declaration = facet.ir as IRClass;
    const generated = classNeedsInteropExtension(declaration)
      ? [`${declarationName}Extension`]
      : [];
    for (const member of [
      ...declaration.properties,
      ...declaration.methods,
      ...declaration.getAccessors,
      ...declaration.setAccessors,
    ]) {
      if (
        member.isStatic &&
        !isComputedMemberName(member.name) &&
        (member.dartName ?? member.name) !== (member.jsName ?? member.name)
      ) {
        generated.push(
          `${declarationName}_${member.dartName ?? member.name}`,
        );
      }
    }
    return [...new Set(generated)];
  }
  return [];
}

function classNeedsInteropExtension(declaration: IRClass): boolean {
  return [
    ...declaration.properties,
    ...declaration.methods,
    ...declaration.getAccessors,
    ...declaration.setAccessors,
  ].some(
    (member) =>
      !member.isStatic &&
      !isComputedMemberName(member.name) &&
      (member.dartName ?? member.name) !== (member.jsName ?? member.name),
  );
}

function dartScopeSegments(facet: SymbolFacet): string[] {
  return facet.origin.scopes.flatMap((scope) => {
    if (scope.kind === "global") return [];
    const raw =
      scope.kind === "namespace" ? scope.jsSegments : [scope.specifier];
    return raw
      .flatMap((segment) => segment.split(/[./\\]+/))
      .map((segment) => segment.replace(/[^A-Za-z0-9_$]/g, "_"))
      .filter(Boolean);
  });
}

function withJSPrefix(name: string): string {
  return name.startsWith("JS$") ? name : `JS$${name}`;
}

function assignMemberNames(
  ownerFQN: string,
  declaration: IRDeclarationUnion,
  report: SemanticReport,
): void {
  if (declaration.kind === IRDeclKind.Enum) {
    allocateMemberGroups(
      ownerFQN,
      (declaration as IREnum).members.map((member) => [member]),
      report,
    );
    return;
  }
  if (
    declaration.kind !== IRDeclKind.Class &&
    declaration.kind !== IRDeclKind.Interface
  ) {
    return;
  }

  const owner = declaration as IRClass | IRInterface;
  const groups: IRBindingName[][] = [
    ...owner.properties.map((property) => [property]),
    ...owner.methods.map((method) => [method]),
  ];
  const accessors = new Map<string, IRBindingName[]>();
  for (const accessor of [...owner.getAccessors, ...owner.setAccessors]) {
    const key = `${accessor.isStatic ? "static" : "instance"}\u0000${accessor.name}`;
    const values = accessors.get(key) ?? [];
    values.push(accessor);
    accessors.set(key, values);
  }
  groups.push(...accessors.values());
  allocateMemberGroups(ownerFQN, groups, report);
}

function allocateMemberGroups(
  ownerFQN: string,
  groups: readonly IRBindingName[][],
  report: SemanticReport,
): void {
  const used = new Set<string>();
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
        `Computed member '${sourceName}' is preserved in IR but not emitted by the package:js backend`,
      );
    }
  }
}

function isComputedMemberName(name: string): boolean {
  return name.startsWith("[") && name.endsWith("]");
}

function addMemberDiagnostic(
  report: SemanticReport,
  code: "UNSUPPORTED_COMPUTED_MEMBER",
  ownerFQN: string,
  message: string,
): void {
  if (
    report.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === code &&
        diagnostic.ownerFQN === ownerFQN &&
        diagnostic.message === message,
    )
  ) {
    return;
  }
  report.diagnostics.push({
    code,
    ownerFQN,
    action: "preservedUnsupported",
    message,
  });
}

function assignNestedNames(
  declaration: IRDeclarationUnion,
  report: SemanticReport,
): void {
  const seen = new Set<object>();
  const renameTypeParams = (parameters: readonly IRTypeParam[]) => {
    for (const parameter of parameters) {
      if (seen.has(parameter)) continue;
      seen.add(parameter);
      const name = legalDartName(parameter.name, "type");
      if (name !== parameter.name) report.keywordRenames++;
      parameter.dartName = name;
      parameter.jsName = parameter.name;
    }
  };
  const renameParameters = (parameters: readonly IRParameter[]) => {
    const used = new Set<string>();
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
  const renameSignatures = (
    signatures: readonly (IRCallSignature | IRConstructSignature)[],
  ) => {
    for (const signature of signatures) {
      renameTypeParams(signature.typeParams);
      renameParameters(signature.parameters);
    }
  };

  if (declaration.kind === IRDeclKind.Function) {
    const value = declaration as IRFunction;
    renameTypeParams(value.typeParams);
    renameParameters(value.parameters);
  } else if (
    declaration.kind === IRDeclKind.Class ||
    declaration.kind === IRDeclKind.Interface
  ) {
    const value = declaration as IRClass | IRInterface;
    renameTypeParams(value.typeParams);
    for (const method of value.methods) {
      renameTypeParams(method.typeParams);
      renameParameters(method.parameters);
    }
    if (declaration.kind === IRDeclKind.Class) {
      renameSignatures((value as IRClass).constructors);
    } else {
      const interfaceValue = value as IRInterface;
      renameSignatures(interfaceValue.callSignatures);
      renameSignatures(interfaceValue.constructSignatures);
    }
    for (const setter of value.setAccessors) {
      renameParameters([setter.parameter]);
    }
  } else if (declaration.kind === IRDeclKind.TypeAlias) {
    renameTypeParams((declaration as IRTypeAlias).typeParams);
  }

  forEachIRType(declaration, (type) => {
    renameTypeParams(type.typeParams ?? []);
    renameParameters(type.parameters ?? []);
  });
}

function bySourceOrder(a: SymbolFacet, b: SymbolFacet): number {
  return a.origin.sourceOrder - b.origin.sourceOrder;
}
