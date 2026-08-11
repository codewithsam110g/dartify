import { IRReferenceTarget } from "@ir/type";
import { Symbol } from "./index";
import {
  FQN_SEPARATOR,
  logicalNameOfFQN,
  sourceFileOfFQN,
  terminalNameOfFQN,
} from "./fqn";

export type ResolutionStrategy =
  | "checker"
  | "exact"
  | "namespaceAlias"
  | "sameFile"
  | "uniqueGlobal";

export type ResolutionResult =
  | {
      kind: "resolved";
      fqn: string;
      strategy: ResolutionStrategy;
    }
  | { kind: "missing"; lookupFQN: string }
  | { kind: "ambiguous"; lookupFQN: string; candidates: string[] };

function resolved(fqn: string, strategy: ResolutionStrategy): ResolutionResult {
  return { kind: "resolved", fqn, strategy };
}

function uniqueOrAmbiguous(
  lookupFQN: string,
  candidates: string[],
  strategy: ResolutionStrategy,
): ResolutionResult | null {
  const unique = [...new Set(candidates)].sort();
  if (unique.length === 0) return null;
  if (unique.length === 1) return resolved(unique[0], strategy);
  return { kind: "ambiguous", lookupFQN, candidates: unique };
}

/** Resolves one concrete IR reference without ever choosing arbitrarily. */
export function resolveReference(
  reference: IRReferenceTarget,
  table: ReadonlyMap<string, readonly Symbol[]>,
  namespaceExports: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): ResolutionResult {
  if (reference.lookup.kind === "checker") {
    const present = reference.lookup.candidates.filter((candidate) =>
      table.has(candidate),
    );
    const result = uniqueOrAmbiguous(
      reference.writtenName,
      present,
      "checker",
    );
    if (result) return result;

    return {
      kind: "missing",
      lookupFQN:
        reference.lookup.candidates.length === 1
          ? reference.lookup.candidates[0]
          : reference.lookup.candidates.join(" | "),
    };
  }

  const pseudoFQN = reference.lookup.pseudoFQN;
  if (table.has(pseudoFQN)) return resolved(pseudoFQN, "exact");

  const separator = pseudoFQN.indexOf(FQN_SEPARATOR);
  if (separator === -1) return { kind: "missing", lookupFQN: pseudoFQN };

  const filePath = pseudoFQN.substring(0, separator);
  const rawName = pseudoFQN.substring(separator + FQN_SEPARATOR.length);
  if (!rawName) return { kind: "missing", lookupFQN: pseudoFQN };

  let logicalName = rawName;
  let usedNamespaceAlias = false;
  const firstDot = logicalName.indexOf(".");
  if (firstDot !== -1) {
    const prefix = logicalName.substring(0, firstDot);
    if (namespaceExports.get(filePath)?.has(prefix)) {
      logicalName = logicalName.substring(firstDot + 1);
      usedNamespaceAlias = true;
    }
  }

  logicalName = logicalName.split(".").join("|");
  const normalizedFQN = `${filePath}${FQN_SEPARATOR}${logicalName}`;
  if (table.has(normalizedFQN)) {
    return resolved(
      normalizedFQN,
      usedNamespaceAlias ? "namespaceAlias" : "exact",
    );
  }

  const sameFile = [...table.keys()].filter(
    (candidate) =>
      sourceFileOfFQN(candidate) === filePath &&
      (logicalNameOfFQN(candidate) === logicalName ||
        logicalNameOfFQN(candidate).endsWith(`|${logicalName}`)),
  );
  const sameFileResult = uniqueOrAmbiguous(
    normalizedFQN,
    sameFile,
    usedNamespaceAlias ? "namespaceAlias" : "sameFile",
  );
  if (sameFileResult) return sameFileResult;

  // A qualified name carries scope information. If that exact/suffix scope did
  // not resolve, dropping to the terminal segment would silently bind
  // `Wrong.Control.Attribution` to an unrelated `Attribution`.
  if (logicalName.includes("|")) {
    return { kind: "missing", lookupFQN: normalizedFQN };
  }

  const logicalParts = logicalName.split("|");
  const terminalName = logicalParts[logicalParts.length - 1] ?? logicalName;
  const globalMatches = [...table.keys()].filter(
    (candidate) => terminalNameOfFQN(candidate) === terminalName,
  );
  const globalResult = uniqueOrAmbiguous(
    normalizedFQN,
    globalMatches,
    "uniqueGlobal",
  );
  return globalResult ?? { kind: "missing", lookupFQN: normalizedFQN };
}
