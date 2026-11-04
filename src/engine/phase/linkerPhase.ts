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

  const cache = new Map<string, LinkResult>();
  const resolving = new Set<string>();

  function checkDeps(fqn: string): LinkResult {
    const cached = cache.get(fqn);
    if (cached) return cached;
    if (resolving.has(fqn)) return { state: LinkState.LinkedResolved };

    resolving.add(fqn);
    const directEdges = edgesByFQN.get(fqn) ?? [];
    if (directEdges.length === 0) {
      resolving.delete(fqn);
      const result: LinkResult = { state: LinkState.LinkedIndependent };
      cache.set(fqn, result);
      return result;
    }

    for (const edge of directEdges) {
      const failure = failureOf(edge);
      if (failure) {
        resolving.delete(fqn);
        const result: LinkResult = {
          state: LinkState.NotLinkedDirect,
          failure,
        };
        cache.set(fqn, result);
        return result;
      }

      if (edge.resolution.kind !== "resolved") {
        throw new Error("Unreachable unresolved edge without a link failure");
      }
      const target = edge.resolution.fqn;
      const dependencyResult = checkDeps(target);
      if (
        dependencyResult.state === LinkState.NotLinkedDirect ||
        dependencyResult.state === LinkState.NotLinkedIndirect
      ) {
        resolving.delete(fqn);
        const result: LinkResult = {
          state: LinkState.NotLinkedIndirect,
          failure: dependencyResult.failure,
          viaChain: [
            target,
            ...(dependencyResult.state === LinkState.NotLinkedIndirect
              ? dependencyResult.viaChain
              : []),
          ],
        };
        cache.set(fqn, result);
        return result;
      }
    }

    resolving.delete(fqn);
    const result: LinkResult = { state: LinkState.LinkedResolved };
    cache.set(fqn, result);
    return result;
  }

  const results = new Map<string, LinkResult>();
  let valid = 0;
  let broken = 0;
  for (const fqn of fqns) {
    const result = checkDeps(fqn);
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
