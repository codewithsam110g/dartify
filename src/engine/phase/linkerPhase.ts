/**
 * Phase 2 (Linker): Overload resolution, declaration augmentation,
 * and pseudo-FQN → real FQN dependency resolution.
 *
 * Currently a stub. Future work:
 * - Merge overloaded function signatures (same FQN, multiple Symbol[] entries)
 * - Augment interface+variable combinations
 * - Resolve pseudo-FQN deps (e.g. "file::TypeName") to precise FQNs
 * - Package symbols into per-file LinkedModules ready for Phase 3
 */

import { transpilerContext } from "@/context";

export async function runLinker(debug: boolean): Promise<void> {
    if (debug) {
        console.log("\n🔗 Linker phase (stub) — no transformations applied yet");

        const table = transpilerContext.symbolTable.getSymbolTable();
        let totalDeps = 0;
        let symbolsWithDeps = 0;

        for (const [, symbols] of table) {
            for (const symbol of symbols) {
                if (symbol.deps.length > 0) {
                    symbolsWithDeps++;
                    totalDeps += symbol.deps.length;

                    // Extract just the declaration name from the FQN for readability
                    const fqnParts = symbol.fqn.split("::");
                    const declName = fqnParts[1] || symbol.fqn;

                    console.log(`  📦 ${declName} (${symbol.deps.length} deps)`);
                    console.log(`     FQN: ${symbol.fqn}`);
                    for (const dep of symbol.deps) {
                        console.log(`     ↳ ${dep}`);
                    }
                }
            }
        }

        console.log(
            `\n  📊 Summary: ${symbolsWithDeps} symbols have deps (${totalDeps} total dep references)`,
        );
    }
}
