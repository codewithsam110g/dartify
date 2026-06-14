import { transpilerContext } from "../context";
import { instance } from "@viz-js/viz";
import { writeFile } from "fs/promises";
import { basename } from "path";

export async function generateDependencyGraphSVG(outputPath: string): Promise<void> {
  const table = transpilerContext.symbolTable.getSymbolTable();
  if (table.size === 0) return;

  let dotGraph = "digraph Dependencies {\n";
  dotGraph += "  rankdir=LR;\n";
  dotGraph += "  node [shape=box, style=filled, fillcolor=lightblue, fontname=\"Helvetica\", fontsize=10];\n";
  dotGraph += "  edge [color=gray, arrowsize=0.5];\n";

  // Shared fuzzy matcher to ensure consistency with linkerPhase
  function resolveRealFQN(pseudoFqn: string): string | null {
    if (table.has(pseudoFqn)) return pseudoFqn;
    const parts = pseudoFqn.split("::");
    if (parts.length < 2) return null;
    const [filePath, rawSymbolName] = parts;
    const matches: string[] = [];
    for (const key of table.keys()) {
      const tableSymbolName = key.split("::")[1];
      if (!tableSymbolName) continue;
      const nameParts = tableSymbolName.split("|");
      const actualName = nameParts[nameParts.length - 1];
      if (actualName === rawSymbolName) matches.push(key);
    }
    if (matches.length > 0) {
      const sameFileMatch = matches.find(m => m.startsWith(`${filePath}::`));
      if (sameFileMatch) return sameFileMatch;
      const primaryMatch = matches.find(m => {
        const tableSymbolName = m.split("::")[1];
        return !tableSymbolName.includes("|") && tableSymbolName === rawSymbolName;
      });
      if (primaryMatch) return primaryMatch;
      return matches[0];
    }
    return null;
  }

  function cleanNodeName(fqn: string): string {
    const parts = fqn.split("::");
    const file = basename(parts[0]);
    // Handle special characters for graphviz
    const name = parts[1] || "";
    return `${file}\\n${name}`.replace(/[^a-zA-Z0-9_\\n|]/g, "_");
  }

  const edges = new Set<string>();
  const validNodes = new Set<string>();

  for (const [fqn, symbols] of table.entries()) {
    const nodeA = cleanNodeName(fqn);
    validNodes.add(nodeA);
    console.log("orignal name", fqn);
    console.log("clean name", nodeA);
    dotGraph += `  "${nodeA}" [label="${cleanNodeName(fqn)}"];\n`;

    const allDeps = new Set<string>();
    for (const sym of symbols) {
      if (sym.deps) sym.deps.forEach((dep: string) => allDeps.add(dep));
    }

    for (const depPseudo of allDeps) {
      const resolved = resolveRealFQN(depPseudo);
      if (resolved) {
        const nodeB = cleanNodeName(resolved);
        const edge = `  "${nodeA}" -> "${nodeB}";`;
        if (!edges.has(edge)) {
          edges.add(edge);
          dotGraph += edge + "\n";
        }
      } else {
        const nodeB = `MISSING\\n${depPseudo.split("::")[1] || depPseudo}`.replace(/[^a-zA-Z0-9_\\n|]/g, "_");
        if (!validNodes.has(nodeB)) {
          dotGraph += `  "${nodeB}" [fillcolor=lightcoral];\n`;
          validNodes.add(nodeB);
        }
        const edge = `  "${nodeA}" -> "${nodeB}" [color=red, style=dashed];\n`;
        if (!edges.has(edge)) {
          edges.add(edge);
          dotGraph += edge;
        }
      }
    }
  }
  dotGraph += "}\n";

  try {
    const viz = await instance();
    const svg = viz.renderString(dotGraph, { format: "svg" });
    await writeFile(outputPath, svg);
    console.log(`\n  📈 Dependency Graph generated at: ${outputPath}`);
  } catch (err) {
    console.error("Failed to generate SVG:", err);
  }
}
