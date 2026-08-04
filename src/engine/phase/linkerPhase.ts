import { transpilerContext } from "@/context";
import {
  ResolutionResult,
  resolveReference,
} from "@/symbol/resolve";
import { registerAliasSymbols } from "@engine/alias/register";

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
  results: Map<string, LinkResult>;
  edges: LinkEdge[];
  diagnostics: LinkDiagnostic[];
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

export async function runLinker(debug: boolean): Promise<LinkReport> {
  const table = transpilerContext.symbolTable.getSymbolTable();
  const aliases = registerAliasSymbols(table);
  const edges: LinkEdge[] = [];
  const diagnostics: LinkDiagnostic[] = [];
  const edgesByFQN = new Map<string, LinkEdge[]>();

  for (const fqn of [...table.keys()].sort()) {
    const groupEdges: LinkEdge[] = [];
    for (const symbol of table.get(fqn) ?? []) {
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
          transpilerContext.namespaceExports,
        );
        if (resolution.kind === "resolved") {
          dependency.resolvedFQN = resolution.fqn;
          resolvedDeps.add(resolution.fqn);
        } else {
          delete dependency.resolvedFQN;
        }

        const edge: LinkEdge = {
          from: fqn,
          writtenName: dependency.writtenName,
          resolution,
        };
        groupEdges.push(edge);
        edges.push(edge);
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
  for (const fqn of [...table.keys()].sort()) {
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

  if (debug) {
    console.log(
      `\n  ✅ Graph Verification Complete: ${valid} valid, ${broken} broken.`,
    );
    if (diagnostics.length > 0) {
      console.log(`  ⚠️  ${diagnostics.length} checker fallback diagnostic(s).`);
    }
  }

  return {
    results,
    edges,
    diagnostics,
    valid,
    broken,
    aliasesMinted: aliases.total,
    aliasUseSites: aliases.useSites,
  };
}
