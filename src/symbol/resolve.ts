import { Symbol } from "./index";

/**
 * Resolves a pseudo-FQN emitted by the parsers to a real key in the symbol
 * table.
 *
 * Parsers record dependencies as `<file>::<Name>` using the file the reference
 * was *seen* in and the bare written name. The symbol table keys on
 * `<file>::<scope|segments|>Name` using the file the symbol was *declared* in.
 * The two disagree for anything imported or namespaced, so a direct lookup
 * misses and this fuzzy fallback runs.
 *
 * NOTE: this matcher is a workaround, not the design. It currently masks `L-01`
 * (deps naming the importing file rather than the declaring file) by finding
 * the right symbol for the wrong reason, which is why three.js reports "0
 * broken links" while every dep FQN is wrong. S2 fixes the FQNs at the source;
 * this stays only as a fallback for genuinely ambiguous cases.
 *
 * Extracted from the two near-identical copies that lived in `linkerPhase` and
 * `visualizeGraph` (`L-06`). Behaviour is preserved exactly.
 */
export function resolveRealFQN(
  pseudoFqn: string,
  table: Map<string, Symbol[]>,
  onAmbiguous?: (pseudoFqn: string, matches: string[]) => void,
): string | null {
  // 1. The happy path: direct match
  if (table.has(pseudoFqn)) {
    return pseudoFqn;
  }

  // 2. The pseudo-path fallback
  const [filePath, rawSymbolName] = pseudoFqn.split("::");
  if (!filePath || !rawSymbolName) return null;

  // Track ALL matches instead of returning immediately
  const matches: string[] = [];

  for (const key of table.keys()) {
    const tableSymbolName = key.split("::")[1];
    if (!tableSymbolName) continue;

    const nameParts = tableSymbolName.split("|");
    const actualName = nameParts[nameParts.length - 1];

    if (actualName === rawSymbolName) {
      matches.push(key);
    }
  }

  if (matches.length > 0) {
    // 3. Collision resolution.
    // Prefer a match in the same file, to avoid ambiguity when the same name
    // exists in several files.
    const sameFileMatch = matches.find((m) => m.startsWith(`${filePath}::`));
    if (sameFileMatch) {
      return sameFileMatch;
    }

    // Prefer the primary definition over module augmentations (keys with "|").
    const primaryMatch = matches.find((m) => {
      const tableSymbolName = m.split("::")[1];
      return (
        !tableSymbolName.includes("|") && tableSymbolName === rawSymbolName
      );
    });
    if (primaryMatch) {
      return primaryMatch;
    }
  }

  // 4. Genuinely ambiguous: several matches, none in this file, none primary.
  if (matches.length > 1) {
    onAmbiguous?.(pseudoFqn, matches);
  }

  return matches.length > 0 ? matches[0] : null;
}
