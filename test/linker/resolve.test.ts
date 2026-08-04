import { describe, expect, test } from "vitest";
import { IRReferenceTarget } from "../../src/ir/type";
import { Symbol, SymbolType } from "../../src/symbol";
import { resolveReference } from "../../src/symbol/resolve";

function symbol(fqn: string): Symbol {
  return {
    type: SymbolType.INTERFACE,
    fqn,
    ir: {
      kind: "interface",
      name: fqn.split("::").pop()!,
      extends: [],
      properties: [],
      methods: [],
      constructors: [],
      getAccessors: [],
      setAccessors: [],
      indexSignatures: [],
    } as never,
    deps: [],
    resolvedDeps: [],
  };
}

function table(...fqns: string[]): Map<string, Symbol[]> {
  return new Map(fqns.map((fqn) => [fqn, [symbol(fqn)]]));
}

describe("S2 reference resolver", () => {
  test("normalises a declared global namespace alias", () => {
    const file = "/types/leaflet.d.ts";
    const target = `${file}::Control|Attribution`;
    const reference: IRReferenceTarget = {
      writtenName: "L.Control.Attribution",
      lookup: {
        kind: "syntax",
        pseudoFQN: `${file}::L.Control.Attribution`,
      },
    };

    expect(
      resolveReference(
        reference,
        table(target),
        new Map([[file, new Set(["L"])]]),
      ),
    ).toEqual({
      kind: "resolved",
      fqn: target,
      strategy: "namespaceAlias",
    });
  });

  test("does not strip an undeclared leading namespace", () => {
    const file = "/types/leaflet.d.ts";
    const reference: IRReferenceTarget = {
      writtenName: "Wrong.Control.Attribution",
      lookup: {
        kind: "syntax",
        pseudoFQN: `${file}::Wrong.Control.Attribution`,
      },
    };
    expect(
      resolveReference(reference, table(`${file}::Control|Attribution`)),
    ).toEqual({
      kind: "missing",
      lookupFQN: `${file}::Wrong|Control|Attribution`,
    });
  });

  test("never fuzzy-matches when an exact checker target is absent", () => {
    const reference: IRReferenceTarget = {
      writtenName: "Foo",
      lookup: {
        kind: "checker",
        candidates: ["/intended/base.d.ts::Foo"],
      },
    };
    expect(
      resolveReference(reference, table("/unrelated/other.d.ts::Foo")),
    ).toEqual({
      kind: "missing",
      lookupFQN: "/intended/base.d.ts::Foo",
    });
  });
});
