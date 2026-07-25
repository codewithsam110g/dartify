import { transpilerContext } from "@/context";
import { resolveRealFQN } from "@/symbol/resolve";

// 1. The clean interfaces describing all possible link states
export enum LinkState {
  LinkedIndependent = "LinkedIndependent", // Has no dependencies
  LinkedResolved = "LinkedResolved", // Dependencies exist and are fully resolved
  NotLinkedDirect = "NotLinkedDirect", // A direct dependency is completely missing from the table
  NotLinkedIndirect = "NotLinkedIndirect", // A dependency of a dependency is missing
}

export type LinkResult =
  | { state: LinkState.LinkedIndependent }
  | { state: LinkState.LinkedResolved }
  | { state: LinkState.NotLinkedDirect; missingDep: string }
  | {
      state: LinkState.NotLinkedIndirect;
      missingDep: string;
      viaChain: string[];
    };

/**
 * The linker's output. Consumers — the emitter, the graph tool, diagnostics —
 * read this rather than re-deriving the graph (`L-07`, `L-08`).
 */
export interface LinkReport {
  /** Link state per real (resolved) FQN */
  results: Map<string, LinkResult>;
  valid: number;
  broken: number;
}

export async function runLinker(debug: boolean): Promise<LinkReport> {
  const table = transpilerContext.symbolTable.getSymbolTable();

  if (debug) {
    console.log("\n🔗 Linker phase: Dependency Graph Verification");
    // ... your existing summary logging can stay here ...
  }

  // 2. The Cache (LUT) to prevent re-checking symbols we already verified
  const linkCache = new Map<string, LinkResult>();

  // 3. Cycle Detection: Keeps track of nodes currently being explored in the current stack
  const resolvingStack = new Set<string>();

  // Fuzzy FQN matcher lives in @/symbol/resolve — shared with tools/graph.ts
  const onAmbiguous = (pseudoFqn: string, matches: string[]) => {
    if (!debug) return;
    console.log(
      `\n  ⚠️ AMBIGUOUS LINK: Found multiple matches for '${pseudoFqn}'`,
    );
    matches.forEach((m) => console.log(`     ↳ ${m}`));
    console.log(`     (Defaulting to first match: ${matches[0]})`);
  };

  // CORE: The recursive DFS Linker
  function checkDeps(pseudoFqn: string): LinkResult {
    // 1. Resolve the Pseudo-FQN to the Real FQN first!
    const fqn = resolveRealFQN(pseudoFqn, table, onAmbiguous);

    if (!fqn) {
      // It couldn't be resolved even with fuzzy matching. It's a true missing dep!
      return { state: LinkState.NotLinkedDirect, missingDep: pseudoFqn };
    }

    // 2. Return cached result if we've already processed this symbol completely
    if (linkCache.has(fqn)) {
      return linkCache.get(fqn)!;
    }

    // 3. CYCLE DETECTION: Circular dependency check (A -> B -> A).
    if (resolvingStack.has(fqn)) {
      return { state: LinkState.LinkedResolved };
    }

    resolvingStack.add(fqn); // Mark as currently exploring

    // Get the actual symbol(s) from the table
    const symbols = table.get(fqn)!; // We know it exists because resolveRealFQN succeeded

    // 4. Combine deps across all overloads/augmentations of this FQN
    const allDeps = new Set<string>();
    for (const sym of symbols) {
      if (sym.deps) {
        sym.deps.forEach((dep: string) => allDeps.add(dep));
      }
    }

    // 5. Base Case: No dependencies
    if (allDeps.size === 0) {
      resolvingStack.delete(fqn);
      const result: LinkResult = { state: LinkState.LinkedIndependent };
      linkCache.set(fqn, result);
      return result;
    }

    // 6. Recursive Step: Check all dependencies
    for (const depPseudoFqn of allDeps) {
      const depResult = checkDeps(depPseudoFqn);

      // If ANY dependency fails, this symbol fails.
      if (depResult.state === LinkState.NotLinkedDirect) {
        resolvingStack.delete(fqn);
        const result: LinkResult = {
          state: LinkState.NotLinkedIndirect,
          missingDep: depResult.missingDep,
          viaChain: [depPseudoFqn],
        };
        linkCache.set(fqn, result);
        return result;
      } else if (depResult.state === LinkState.NotLinkedIndirect) {
        resolvingStack.delete(fqn);
        const result: LinkResult = {
          state: LinkState.NotLinkedIndirect,
          missingDep: depResult.missingDep,
          viaChain: [depPseudoFqn, ...depResult.viaChain],
        };
        linkCache.set(fqn, result);
        return result;
      }
    }

    // 7. If we made it here, all dependencies are fully resolved!
    resolvingStack.delete(fqn);
    const result: LinkResult = { state: LinkState.LinkedResolved };
    linkCache.set(fqn, result);
    return result;
  }

  // 5. Execution: Heuristic Pre-Sort Optimization (Bottom-Up Topological Sort)
  if (debug) console.log("\n  🔍 Verifying Dependency Graph (Optimized)...");

  let validCount = 0;
  let invalidCount = 0;
  const results = new Map<string, LinkResult>();

  // Sort entries so symbols with fewest dependencies are processed and cached first
  // This drastically reduces recursive depth by populating the cache with leaf nodes.
  const sortedEntries = Array.from(table.entries()).sort((a, b) => {
    const aDeps = a[1][0]?.deps?.length || 0;
    const bDeps = b[1][0]?.deps?.length || 0;
    return aDeps - bDeps;
  });

  for (const [fqn] of sortedEntries) {
    const result = checkDeps(fqn);
    results.set(fqn, result);

    if (
      result.state === LinkState.NotLinkedDirect ||
      result.state === LinkState.NotLinkedIndirect
    ) {
      invalidCount++;
      if (debug) {
        console.log(`  ❌ Broken Link: ${fqn}`);
        if (result.state === LinkState.NotLinkedIndirect) {
          console.log(
            `     Reason: Missing '${result.missingDep}' via [${result.viaChain.join(" -> ")}]`,
          );
        } else {
          console.log(
            `     Reason: Direct dependency '${result.missingDep}' is missing.`,
          );
        }
      }
    } else {
      validCount++;
    }
  }

  if (debug) {
    console.log(
      `\n  ✅ Graph Verification Complete: ${validCount} valid, ${invalidCount} broken.\n`,
    );
  }

  // The graph visualiser is NOT called from here. It is a consumer of this
  // report, not a step inside the pipeline — see tools/graph.ts (`L-07`).
  // Importing it here dragged @viz-js/viz (a devDependency) into the shipped
  // bundle, where it accounted for ~70% of dist/cli.js (`D-07`).
  return { results, valid: validCount, broken: invalidCount };
}
