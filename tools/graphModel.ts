import { basename } from "path";
import {
  LinkReport,
  LinkState,
} from "@engine/phase/linkerPhase";
import { logicalNameOfFQN, sourceFileOfFQN } from "@/symbol/fqn";

function dot(value: string): string {
  return JSON.stringify(value);
}

function nodeLabel(fqn: string): string {
  return `${basename(sourceFileOfFQN(fqn))}\n${logicalNameOfFQN(fqn)}`;
}

function fillFor(report: LinkReport, fqn: string): string {
  const result = report.results.get(fqn);
  if (
    result?.state !== LinkState.NotLinkedDirect &&
    result?.state !== LinkState.NotLinkedIndirect
  ) {
    return "lightblue";
  }
  return result.failure.kind === "ambiguous" ? "khaki" : "lightcoral";
}

/** Pure DOT renderer over persisted linker output. */
export function buildDot(report: LinkReport): string {
  const lines = [
    "digraph Dependencies {",
    "  rankdir=LR;",
    '  node [shape=box, style=filled, fillcolor=lightblue, fontname="Helvetica", fontsize=10];',
    "  edge [color=gray, arrowsize=0.5];",
  ];

  for (const fqn of [...report.results.keys()].sort()) {
    lines.push(
      `  ${dot(fqn)} [label=${dot(nodeLabel(fqn))}, fillcolor=${fillFor(report, fqn)}];`,
    );
  }

  const declaredFailures = new Set<string>();
  const declaredEdges = new Set<string>();
  for (const edge of report.edges) {
    if (edge.resolution.kind === "resolved") {
      const rendered = `  ${dot(edge.from)} -> ${dot(edge.resolution.fqn)};`;
      if (!declaredEdges.has(rendered)) {
        declaredEdges.add(rendered);
        lines.push(rendered);
      }
      continue;
    }

    const lookup = edge.resolution.lookupFQN;
    const failureId = `failure:${edge.from}:${edge.resolution.kind}:${lookup}`;
    if (!declaredFailures.has(failureId)) {
      declaredFailures.add(failureId);
      const ambiguous = edge.resolution.kind === "ambiguous";
      const label = `${ambiguous ? "AMBIGUOUS" : "MISSING"}\n${lookup.split("::").pop() ?? lookup}`;
      lines.push(
        `  ${dot(failureId)} [label=${dot(label)}, fillcolor=${ambiguous ? "khaki" : "lightcoral"}];`,
      );
    }
    const rendered = `  ${dot(edge.from)} -> ${dot(failureId)} [color=${edge.resolution.kind === "ambiguous" ? "orange" : "red"}, style=${edge.resolution.kind === "ambiguous" ? "dotted" : "dashed"}];`;
    if (!declaredEdges.has(rendered)) {
      declaredEdges.add(rendered);
      lines.push(rendered);
    }
  }

  lines.push("}");
  return `${lines.join("\n")}\n`;
}
