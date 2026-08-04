import { describe, expect, test } from "vitest";
import { LinkReport, LinkState } from "../../src/engine/phase/linkerPhase";
import { buildDot } from "../../tools/graphModel";

describe("S2 graph model", () => {
  test("uses full FQNs as IDs when basenames and scopes collide", () => {
    const first = "/project/core/Uniform.d.ts::Uniform";
    const second = "/project/renderers/common/Uniform.d.ts::Uniform";
    const report: LinkReport = {
      results: new Map([
        [first, { state: LinkState.LinkedIndependent }],
        [second, { state: LinkState.LinkedIndependent }],
      ]),
      edges: [],
      diagnostics: [],
      valid: 2,
      broken: 0,
      aliasesMinted: 0,
      aliasUseSites: 0,
    };

    const dot = buildDot(report);
    expect(dot).toContain(JSON.stringify(first));
    expect(dot).toContain(JSON.stringify(second));
    expect(dot.match(/Uniform\.d\.ts\\nUniform/g)).toHaveLength(2);
  });
});
