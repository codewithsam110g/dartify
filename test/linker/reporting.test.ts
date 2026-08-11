import { describe, expect, test } from "vitest";
import {
  LinkReport,
  LinkState,
} from "../../src/engine/phase/linkerPhase";
import {
  formatSemanticWarning,
  formatVerboseLinkReport,
} from "../../src/reporting/linker";
import { emptySemanticReport } from "../../src/engine/semantic/types";

describe("verbose linker reporting", () => {
  test("renders structured strategies, edge outcomes and failure chains", () => {
    const semantic = emptySemanticReport();
    Object.assign(semantic, {
      inputDeclarations: 5,
      outputSymbols: 3,
      outputFacets: 4,
      declarationGroupsMerged: 1,
      overloadsRenamed: 2,
      externalAugmentationsSuppressed: 1,
      redirects: [
        {
          fromFQN: "/a.d.ts::Old",
          toFQN: "/a.d.ts::New",
          reason: "constructorCompanion" as const,
        },
      ],
      suppressedAugmentations: [
        {
          ownerFQN: '/augment.d.ts::"./target"|Target',
          moduleSpecifier: "./target",
          canonicalTarget: "./target",
          declarationKinds: ["interface"],
        },
      ],
      diagnostics: [
        {
          code: "EXTERNAL_MODULE_AUGMENTATION_SUPPRESSED" as const,
          ownerFQN: '/augment.d.ts::"./target"|Target',
          action: "suppressed" as const,
          message: "not emitted",
        },
      ],
    });
    const report: LinkReport = {
      semantic,
      results: new Map([
        ["/a.d.ts::A", { state: LinkState.LinkedResolved }],
        [
          "/b.d.ts::B",
          {
            state: LinkState.NotLinkedDirect,
            failure: {
              kind: "missing",
              reference: "Missing",
              lookupFQN: "/b.d.ts::Missing",
            },
          },
        ],
        [
          "/c.d.ts::C",
          {
            state: LinkState.NotLinkedIndirect,
            failure: {
              kind: "missing",
              reference: "Missing",
              lookupFQN: "/b.d.ts::Missing",
            },
            viaChain: ["/b.d.ts::B"],
          },
        ],
      ]),
      edges: [
        {
          from: "/a.d.ts::A",
          writtenName: "Renamed",
          resolution: {
            kind: "resolved",
            fqn: "/base.d.ts::Original",
            strategy: "checker",
          },
        },
        {
          from: "/b.d.ts::B",
          writtenName: "Missing",
          resolution: {
            kind: "missing",
            lookupFQN: "/b.d.ts::Missing",
          },
        },
        {
          from: "/c.d.ts::C",
          writtenName: "Options",
          resolution: {
            kind: "ambiguous",
            lookupFQN: "/c.d.ts::Options",
            candidates: ["/one.d.ts::Options", "/two.d.ts::Options"],
          },
        },
      ],
      diagnostics: [
        {
          code: "REFERENCE_CHECKER_FALLBACK",
          ownerFQN: "/c.d.ts::C",
          writtenName: "Options",
          message: "checker unavailable",
        },
      ],
      valid: 1,
      broken: 2,
      aliasesMinted: 0,
      aliasUseSites: 0,
    };

    const output = formatVerboseLinkReport(report);

    expect(output).toContain("Symbols: 3 total, 1 valid, 2 broken");
    expect(output).toContain("Edges: 3 total, 1 resolved, 1 missing, 1 ambiguous");
    expect(output).toContain("Resolution strategies: checker=1");
    expect(output).toContain(
      "✓ /a.d.ts::A --Renamed--> /base.d.ts::Original [checker]",
    );
    expect(output).toContain(
      "✗ /b.d.ts::B --Missing--> /b.d.ts::Missing [missing]",
    );
    expect(output).toContain(
      "? /c.d.ts::C --Options--> /c.d.ts::Options [ambiguous: /one.d.ts::Options, /two.d.ts::Options]",
    );
    expect(output).toContain("via /b.d.ts::B");
    expect(output).toContain("checker unavailable");
    expect(output).toContain(
      "Semantic bindings: 5 input declarations, 3 output symbols, 4 output facets",
    );
    expect(output).toContain("merges=1");
    expect(output).toContain(
      "↪ /a.d.ts::Old -> /a.d.ts::New [constructorCompanion]",
    );
    expect(output).toContain("./target -> ./target [interface]");
    expect(output).toContain("EXTERNAL_MODULE_AUGMENTATION_SUPPRESSED");
    expect(formatSemanticWarning(report)).toContain("1 diagnostic(s)");
  });

  test("omits the normal semantic warning when no diagnostics exist", () => {
    const report = {
      semantic: emptySemanticReport(),
    } as LinkReport;
    expect(formatSemanticWarning(report)).toBeNull();
  });
});
