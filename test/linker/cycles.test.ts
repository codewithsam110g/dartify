import { describe, expect, test } from "vitest";
import {
  LinkEdge,
  LinkReport,
  LinkResult,
  LinkState,
  summarizeLinks,
} from "../../src/engine/phase/linkerPhase";
import { emptySemanticReport } from "../../src/engine/semantic/types";
import { withTestProject } from "./test-project";

/**
 * The link report is the honest measure of what resolved. A reference cycle
 * must not make a symbol look valid when it reaches a missing declaration,
 * whichever member the traversal happens to enter first.
 */

async function linkOf(source: string): Promise<{ results: Map<string, LinkResult>; report: LinkReport; file: string }> {
  return withTestProject({ "cycle.d.ts": source }, ({ analysis, files }) => ({
    results: analysis.link.results,
    report: analysis.link,
    file: files.get("cycle.d.ts")!,
  }));
}

function stateOf(link: { results: Map<string, LinkResult>; file: string }, name: string): LinkResult {
  const result = link.results.get(`${link.file}::${name}`);
  if (!result) throw new Error(`no link result for ${name}`);
  return result;
}

function expectDirect(result: LinkResult, lookup: string): void {
  expect(result).toMatchObject({ state: LinkState.NotLinkedDirect, failure: { kind: "missing" } });
  expect((result as { failure: { reference: string } }).failure.reference).toBe(lookup);
}

function expectIndirect(link: { file: string }, result: LinkResult, via: string[]): void {
  expect(result.state).toBe(LinkState.NotLinkedIndirect);
  expect((result as { viaChain: string[] }).viaChain).toEqual(via.map((name) => `${link.file}::${name}`));
}

describe("two-member cycle with a missing dependency", () => {
  // The traversal visits symbols in name order, so the broken member is
  // entered first in the first two cases and second in the last two.
  test.each([
    ["A first in the file", "export interface A { b: B; z: Missing }\nexport interface B { a: A }\n"],
    ["B first in the file", "export interface B { a: A }\nexport interface A { b: B; z: Missing }\n"],
  ])("A -> Missing, %s: B is broken through A", async (_label, source) => {
    const link = await linkOf(source);
    expectDirect(stateOf(link, "A"), "Missing");
    expectIndirect(link, stateOf(link, "B"), ["A"]);
    expect(link.report.broken).toBe(2);
    expect(link.report.valid).toBe(0);
  });

  test.each([
    ["Y first in the file", "export interface Y { x: X; z: Missing }\nexport interface X { y: Y }\n"],
    ["X first in the file", "export interface X { y: Y }\nexport interface Y { x: X; z: Missing }\n"],
  ])("Y -> Missing, %s (broken member entered second): X is broken through Y", async (_label, source) => {
    const link = await linkOf(source);
    expectDirect(stateOf(link, "Y"), "Missing");
    expectIndirect(link, stateOf(link, "X"), ["Y"]);
    expect(link.report.broken).toBe(2);
  });
});

describe("larger cycles", () => {
  test("a 3-cycle whose broken member is entered first: everyone reports the shortest path to it", async () => {
    const link = await linkOf(
      "export interface A { b: B; z: Missing }\nexport interface B { c: C }\nexport interface C { a: A }\n",
    );
    expectDirect(stateOf(link, "A"), "Missing");
    expectIndirect(link, stateOf(link, "C"), ["A"]);
    expectIndirect(link, stateOf(link, "B"), ["C", "A"]);
    expect(link.report.broken).toBe(3);
  });

  test("a 3-cycle whose broken member is entered last", async () => {
    const link = await linkOf(
      "export interface A { b: B }\nexport interface B { c: C }\nexport interface C { a: A; z: Missing }\n",
    );
    expectDirect(stateOf(link, "C"), "Missing");
    expectIndirect(link, stateOf(link, "B"), ["C"]);
    expectIndirect(link, stateOf(link, "A"), ["B", "C"]);
    expect(link.report.broken).toBe(3);
  });

  test("a cycle that depends on a broken symbol outside it is broken as a whole", async () => {
    const link = await linkOf(
      "export interface A { b: B; c: C }\nexport interface B { a: A }\nexport interface C { z: Missing }\n",
    );
    expectDirect(stateOf(link, "C"), "Missing");
    expectIndirect(link, stateOf(link, "A"), ["C"]);
    expectIndirect(link, stateOf(link, "B"), ["A", "C"]);
    expect(link.report.broken).toBe(3);
  });

  test("a clean cycle, and a self-reference, stay fully resolved", async () => {
    const link = await linkOf(
      "export interface A { b: B }\nexport interface B { a: A; c: C }\nexport interface C { b: B }\nexport interface Node { next: Node }\n",
    );
    for (const name of ["A", "B", "C", "Node"]) {
      expect(stateOf(link, name).state, name).toBe(LinkState.LinkedResolved);
    }
    expect(link.report.broken).toBe(0);
    expect(link.report.valid).toBe(4);
  });
});

describe("outside cycles the first bad edge still decides", () => {
  test("a symbol with a broken dependency before its own missing reference is indirect", async () => {
    // Edges are ordered by written name: `B` comes before `Missing`.
    const link = await linkOf(
      "export interface A { x: B; y: Missing }\nexport interface B { c: AlsoMissing }\n",
    );
    expectDirect(stateOf(link, "B"), "AlsoMissing");
    expectIndirect(link, stateOf(link, "A"), ["B"]);
  });
});

describe("deep dependency chains", () => {
  // A chain this long overflows a recursive traversal's stack.
  test("a 50,000-symbol dependency chain is linked without exhausting the stack", () => {
    const length = 50_000;
    const edges = new Map<string, LinkEdge[]>();
    const fqns: string[] = [];
    for (let index = 0; index < length; index++) {
      const fqn = `/chain.d.ts::S${String(index).padStart(6, "0")}`;
      fqns.push(fqn);
      if (index === length - 1) continue;
      const next = `/chain.d.ts::S${String(index + 1).padStart(6, "0")}`;
      edges.set(fqn, [
        { from: fqn, writtenName: "next", resolution: { kind: "resolved", fqn: next, strategy: "sameFile" } as never },
      ]);
    }
    const report = summarizeLinks(edges, [], fqns, {
      report: emptySemanticReport(),
      aliasesMinted: 0,
      aliasUseSites: 0,
    });
    expect(report.broken).toBe(0);
    expect(report.valid).toBe(length);
    expect(report.results.get(fqns[0])!.state).toBe(LinkState.LinkedResolved);
    expect(report.results.get(fqns[length - 1])!.state).toBe(LinkState.LinkedIndependent);
  });
});
