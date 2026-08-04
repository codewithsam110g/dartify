import {
  LinkReport,
  LinkResult,
  LinkState,
} from "../engine/phase/linkerPhase";

function countBy<T extends string>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function formatCounts<T extends string>(counts: Map<T, number>): string {
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => `${name}=${count}`)
    .join(", ");
}

function formatFailure(fqn: string, result: LinkResult): string | null {
  if (
    result.state !== LinkState.NotLinkedDirect &&
    result.state !== LinkState.NotLinkedIndirect
  ) {
    return null;
  }

  const failure =
    result.failure.kind === "missing"
      ? `missing ${result.failure.lookupFQN}`
      : `ambiguous ${result.failure.lookupFQN} (${result.failure.candidates.join(", ")})`;
  const via =
    result.state === LinkState.NotLinkedIndirect
      ? ` via ${result.viaChain.join(" -> ")}`
      : "";
  return `  ! ${fqn}: ${result.state} — ${failure}${via}`;
}

/** Formats the structured S2 link report for the CLI's verbose mode. */
export function formatVerboseLinkReport(report: LinkReport): string {
  const resolvedEdges = report.edges.filter(
    (edge) => edge.resolution.kind === "resolved",
  );
  const missingEdges = report.edges.filter(
    (edge) => edge.resolution.kind === "missing",
  );
  const ambiguousEdges = report.edges.filter(
    (edge) => edge.resolution.kind === "ambiguous",
  );
  const states = countBy(
    [...report.results.values()].map((result) => result.state),
  );
  const strategies = countBy(
    resolvedEdges.map((edge) => {
      if (edge.resolution.kind !== "resolved") {
        throw new Error("Resolved-edge filter invariant failed");
      }
      return edge.resolution.strategy;
    }),
  );

  const lines = [
    "\n🔎 Verbose linker report",
    `  Symbols: ${report.results.size} total, ${report.valid} valid, ${report.broken} broken`,
    `  States: ${formatCounts(states) || "none"}`,
    `  Edges: ${report.edges.length} total, ${resolvedEdges.length} resolved, ${missingEdges.length} missing, ${ambiguousEdges.length} ambiguous`,
    `  Resolution strategies: ${formatCounts(strategies) || "none"}`,
  ];

  if (report.edges.length > 0) {
    lines.push("  Edges:");
    for (const edge of report.edges) {
      if (edge.resolution.kind === "resolved") {
        lines.push(
          `  ✓ ${edge.from} --${edge.writtenName}--> ${edge.resolution.fqn} [${edge.resolution.strategy}]`,
        );
      } else if (edge.resolution.kind === "missing") {
        lines.push(
          `  ✗ ${edge.from} --${edge.writtenName}--> ${edge.resolution.lookupFQN} [missing]`,
        );
      } else {
        lines.push(
          `  ? ${edge.from} --${edge.writtenName}--> ${edge.resolution.lookupFQN} [ambiguous: ${edge.resolution.candidates.join(", ")}]`,
        );
      }
    }
  }

  const failures = [...report.results.entries()]
    .map(([fqn, result]) => formatFailure(fqn, result))
    .filter((line): line is string => line !== null);
  if (failures.length > 0) {
    lines.push("  Broken symbols:", ...failures);
  }

  if (report.diagnostics.length > 0) {
    lines.push("  Checker fallbacks:");
    for (const diagnostic of report.diagnostics) {
      lines.push(
        `  ⚠ ${diagnostic.ownerFQN} --${diagnostic.writtenName}: ${diagnostic.message}`,
      );
    }
  }

  return lines.join("\n");
}
