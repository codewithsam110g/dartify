import {
  ResolutionResult,
  resolveReference,
} from "@/symbol/resolve";
import {
  runSemanticPassOnDraft,
  SemanticPassResult,
} from "@engine/semantic/run";
import { SemanticReport } from "@engine/semantic/types";
import { Symbol } from "@/symbol";
import { SymbolTable } from "@/symbol/table";
import { NamespaceExports } from "./symbolGeneration";
import {
  LinkedModuleExports,
  linkModuleExports,
  ModuleExportDiagnostic,
  ModuleExportTable,
} from "@/symbol/exports";

export enum LinkState {
  LinkedIndependent = "LinkedIndependent",
  LinkedResolved = "LinkedResolved",
  NotLinkedDirect = "NotLinkedDirect",
  NotLinkedIndirect = "NotLinkedIndirect",
}

export type LinkFailure =
  | { kind: "missing"; reference: string; lookupFQN: string }
  | {
      kind: "ambiguous";
      reference: string;
      lookupFQN: string;
      candidates: string[];
    };

export type LinkResult =
  | { state: LinkState.LinkedIndependent }
  | { state: LinkState.LinkedResolved }
  | { state: LinkState.NotLinkedDirect; failure: LinkFailure }
  | {
      state: LinkState.NotLinkedIndirect;
      failure: LinkFailure;
      viaChain: string[];
    };

export interface LinkEdge {
  from: string;
  writtenName: string;
  resolution: ResolutionResult;
}

export interface LinkDiagnostic {
  code: "REFERENCE_CHECKER_FALLBACK";
  ownerFQN: string;
  writtenName: string;
  message: string;
}

export interface LinkReport {
  semantic: SemanticReport;
  results: Map<string, LinkResult>;
  edges: LinkEdge[];
  diagnostics: LinkDiagnostic[];
  /** Unresolved module export records; filled after reference linking. */
  moduleExportDiagnostics: ModuleExportDiagnostic[];
  valid: number;
  broken: number;
  aliasesMinted: number;
  aliasUseSites: number;
}

function failureOf(edge: LinkEdge): LinkFailure | null {
  if (edge.resolution.kind === "missing") {
    return {
      kind: "missing",
      reference: edge.writtenName,
      lookupFQN: edge.resolution.lookupFQN,
    };
  }
  if (edge.resolution.kind === "ambiguous") {
    return {
      kind: "ambiguous",
      reference: edge.writtenName,
      lookupFQN: edge.resolution.lookupFQN,
      candidates: edge.resolution.candidates,
    };
  }
  return null;
}

function edgeSortKey(edge: LinkEdge): string {
  const target =
    edge.resolution.kind === "resolved"
      ? edge.resolution.fqn
      : edge.resolution.lookupFQN;
  return `${edge.from}\u0000${edge.writtenName}\u0000${target}`;
}

/**
 * The linked, semantically normalized output of phases 1–2.
 *
 * Owned by the caller: `symbols` and `namespaceExports` are deeply detached
 * from the run's `SymbolTable`, so emitters and later backends consume an
 * immutable value rather than ambient table state (task 4.11). Both the S5
 * `package:js` backend and the planned v2 `dart:js_interop` backend read this
 * contract.
 */
export interface LinkedProgram {
  readonly symbols: ReadonlyMap<string, readonly Symbol[]>;
  readonly namespaceExports: ReadonlyMap<string, ReadonlySet<string>>;
  /** Resolved `export =`, default, list and re-export records (`P-17`). */
  readonly moduleExports: LinkedModuleExports;
  readonly report: LinkReport;
}

export async function runLinker(
  symbolTable: SymbolTable,
  namespaceExports: NamespaceExports,
  moduleExports: ModuleExportTable = new Map(),
): Promise<LinkedProgram> {
  // The run's table is consumed here: the linker takes ownership instead of
  // copying, and the result becomes the caller's `LinkedProgram`.
  const symbols = symbolTable.release();
  const semantic = runSemanticPassOnDraft(symbols);
  const report = linkDraft(symbols, namespaceExports, semantic);
  const linkedExports = linkModuleExports(
    structuredClone(moduleExports),
    symbols.keys(),
  );
  report.moduleExportDiagnostics = [...linkedExports.diagnostics];
  return {
    symbols,
    namespaceExports: structuredClone(namespaceExports),
    moduleExports: linkedExports,
    report,
  };
}

function linkDraft(
  table: Map<string, Symbol[]>,
  namespaceExports: NamespaceExports,
  semantic: SemanticPassResult,
): LinkReport {
  const linked = linkReferences(table, table, namespaceExports);
  return summarizeLinks(linked.edgesByFQN, linked.diagnostics, table.keys(), semantic);
}

export interface LinkedReferences {
  edgesByFQN: Map<string, LinkEdge[]>;
  diagnostics: LinkDiagnostic[];
}

/**
 * Resolves every reference owned by `groups` against `table`, writing
 * `resolvedFQN`/`resolvedDartName`/`resolvedDeps` in place. `groups` may be a
 * subset of `table`: watch mode re-links only the files a change can affect.
 */
export function linkReferences(
  groups: ReadonlyMap<string, readonly Symbol[]>,
  table: ReadonlyMap<string, readonly Symbol[]>,
  namespaceExports: ReadonlyMap<string, ReadonlySet<string>>,
): LinkedReferences {
  const diagnostics: LinkDiagnostic[] = [];
  const edgesByFQN = new Map<string, LinkEdge[]>();

  for (const fqn of [...groups.keys()].sort()) {
    const groupEdges: LinkEdge[] = [];
    for (const symbol of groups.get(fqn) ?? []) {
      const resolvedDeps = new Set<string>();
      for (const dependency of symbol.deps) {
        if (
          dependency.lookup.kind === "syntax" &&
          dependency.lookup.checkerError
        ) {
          diagnostics.push({
            code: "REFERENCE_CHECKER_FALLBACK",
            ownerFQN: fqn,
            writtenName: dependency.writtenName,
            message: dependency.lookup.checkerError,
          });
        }

        const resolution = resolveReference(
          dependency,
          table,
          namespaceExports,
        );
        if (resolution.kind === "resolved") {
          dependency.resolvedFQN = resolution.fqn;
          dependency.resolvedDartName = resolvedTypeName(
            table.get(resolution.fqn) ?? [],
          );
          resolvedDeps.add(resolution.fqn);
        } else {
          delete dependency.resolvedFQN;
          delete dependency.resolvedDartName;
        }

        const edge: LinkEdge = {
          from: fqn,
          writtenName: dependency.writtenName,
          resolution,
        };
        groupEdges.push(edge);
      }
      symbol.resolvedDeps = [...resolvedDeps].sort();
    }
    edgesByFQN.set(
      fqn,
      groupEdges.sort((a, b) =>
        edgeSortKey(a).localeCompare(edgeSortKey(b)),
      ),
    );
  }
  return { edgesByFQN, diagnostics };
}

/** Builds the whole-program `LinkReport` from per-symbol edges. */
export function summarizeLinks(
  edgesByFQN: ReadonlyMap<string, readonly LinkEdge[]>,
  linkDiagnostics: readonly LinkDiagnostic[],
  symbolFQNs: Iterable<string>,
  semantic: SemanticPassResult,
): LinkReport {
  const fqns = [...symbolFQNs].sort();
  const edges = fqns.flatMap((fqn) => edgesByFQN.get(fqn) ?? []);
  const diagnostics = [...linkDiagnostics];
  edges.sort((a, b) => edgeSortKey(a).localeCompare(edgeSortKey(b)));
  diagnostics.sort((a, b) =>
    `${a.ownerFQN}\u0000${a.writtenName}`.localeCompare(
      `${b.ownerFQN}\u0000${b.writtenName}`,
    ),
  );

  const finalStates = computeLinkResults(fqns, edgesByFQN);
  const results = new Map<string, LinkResult>();
  let valid = 0;
  let broken = 0;
  for (const fqn of fqns) {
    const result = finalStates.get(fqn)!;
    results.set(fqn, result);
    if (
      result.state === LinkState.NotLinkedDirect ||
      result.state === LinkState.NotLinkedIndirect
    ) {
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
    aliasUseSites: semantic.aliasUseSites,
  };
}

type BrokenResult = Extract<
  LinkResult,
  { state: LinkState.NotLinkedDirect | LinkState.NotLinkedIndirect }
>;

function isBroken(result: LinkResult | undefined): result is BrokenResult {
  return (
    result?.state === LinkState.NotLinkedDirect ||
    result?.state === LinkState.NotLinkedIndirect
  );
}

function indirectThrough(target: string, dependency: BrokenResult): LinkResult {
  return {
    state: LinkState.NotLinkedIndirect,
    failure: dependency.failure,
    viaChain: [
      target,
      ...(dependency.state === LinkState.NotLinkedIndirect
        ? dependency.viaChain
        : []),
    ],
  };
}

/**
 * Link states of every symbol, final and independent of declaration order.
 *
 * A symbol is broken when it, or anything it reaches through resolved edges,
 * has a missing or ambiguous reference. The reference graph has cycles, and a
 * state taken while a cycle member is still being explored is provisional, so
 * states are computed per strongly connected component, dependencies first
 * (Tarjan emits components in that order): all members of a component reach
 * each other, hence the component is broken exactly when some member has a bad
 * edge that leaves it.
 *
 * Outside cycles a symbol's state comes from its first bad edge in edge
 * order, as it always has. Inside a broken component, members with a bad
 * edge of their own report it, and every other member reports the shortest
 * path to one of them (the first such edge in edge order on ties), so the
 * result does not depend on where the traversal started.
 */
function computeLinkResults(
  fqns: readonly string[],
  edgesByFQN: ReadonlyMap<string, readonly LinkEdge[]>,
): Map<string, LinkResult> {
  const edgesOf = (fqn: string): readonly LinkEdge[] => edgesByFQN.get(fqn) ?? [];
  const targetsOf = (fqn: string): string[] =>
    edgesOf(fqn).flatMap((edge) =>
      edge.resolution.kind === "resolved" ? [edge.resolution.fqn] : [],
    );

  // Components, dependencies first. Iterative: dependency chains in large
  // corpora are deep enough to make recursion a stack-size risk.
  const components: string[][] = [];
  const order = new Map<string, number>();
  const lowest = new Map<string, number>();
  const open: string[] = [];
  const onOpen = new Set<string>();
  for (const start of fqns) {
    if (order.has(start)) continue;
    const frames: { node: string; targets: string[]; next: number }[] = [];
    const enter = (node: string): void => {
      order.set(node, order.size);
      lowest.set(node, order.get(node)!);
      open.push(node);
      onOpen.add(node);
      frames.push({ node, targets: targetsOf(node), next: 0 });
    };
    enter(start);
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (frame.next < frame.targets.length) {
        const target = frame.targets[frame.next++];
        if (!order.has(target)) enter(target);
        else if (onOpen.has(target)) {
          lowest.set(frame.node, Math.min(lowest.get(frame.node)!, order.get(target)!));
        }
        continue;
      }
      frames.pop();
      if (lowest.get(frame.node) === order.get(frame.node)) {
        const members: string[] = [];
        let member: string;
        do {
          member = open.pop()!;
          onOpen.delete(member);
          members.push(member);
        } while (member !== frame.node);
        components.push(members);
      }
      const parent = frames[frames.length - 1];
      if (parent) {
        lowest.set(parent.node, Math.min(lowest.get(parent.node)!, lowest.get(frame.node)!));
      }
    }
  }

  const states = new Map<string, LinkResult>();
  for (const members of components) {
    const inside = new Set(members);

    // A bad edge that leaves the component (or a missing/ambiguous reference):
    // the first one in edge order, exactly as for a symbol outside any cycle.
    const own = new Map<string, LinkResult>();
    for (const member of members) {
      for (const edge of edgesOf(member)) {
        const failure = failureOf(edge);
        if (failure) {
          own.set(member, { state: LinkState.NotLinkedDirect, failure });
          break;
        }
        if (edge.resolution.kind !== "resolved") {
          throw new Error("Unreachable unresolved edge without a link failure");
        }
        const target = edge.resolution.fqn;
        if (inside.has(target)) continue;
        const dependency = states.get(target);
        if (isBroken(dependency)) {
          own.set(member, indirectThrough(target, dependency));
          break;
        }
      }
    }

    if (own.size === 0) {
      for (const member of members) {
        states.set(
          member,
          edgesOf(member).length === 0
            ? { state: LinkState.LinkedIndependent }
            : { state: LinkState.LinkedResolved },
        );
      }
      continue;
    }

    // Breadth-first from the members that fail on their own, over the
    // component's edges taken backwards, one distance at a time.
    const dependents = new Map<string, Set<string>>();
    for (const member of members) {
      for (const target of targetsOf(member)) {
        if (!inside.has(target)) continue;
        const set = dependents.get(target) ?? new Set<string>();
        set.add(member);
        dependents.set(target, set);
      }
    }
    for (const [member, result] of own) states.set(member, result);
    let frontier = [...own.keys()];
    while (frontier.length > 0) {
      const level = new Set(frontier);
      const reached = new Set<string>();
      for (const node of frontier) {
        for (const member of dependents.get(node) ?? []) {
          if (!states.has(member)) reached.add(member);
        }
      }
      for (const member of reached) {
        const via = targetsOf(member).find((target) => level.has(target))!;
        states.set(member, indirectThrough(via, states.get(via) as BrokenResult));
      }
      frontier = [...reached];
    }
  }
  return states;
}

function resolvedTypeName(
  symbols: readonly Symbol[],
): string | undefined {
  for (const symbol of symbols) {
    const facet = symbol.facets.find(
      (candidate) =>
        candidate.namespace === "type" || candidate.namespace === "both",
    );
    if (facet) return facet.ir.dartName ?? facet.ir.name;
  }
  return undefined;
}
