import { describe, expect, test } from "vitest";
import { IRDeclKind } from "../../src/ir/declaration";
import { IRInterface } from "../../src/ir/interface";
import { Symbol, SymbolType } from "../../src/symbol";
import {
  SymbolTable,
  SymbolTableChange,
} from "../../src/symbol/table";

function symbol(fqn: string, name?: string): Symbol {
  const fqnParts = fqn.split("::");
  const declarationName = name ?? fqnParts[fqnParts.length - 1] ?? fqn;
  const ir: IRInterface = {
    kind: IRDeclKind.Interface,
    name: declarationName,
    modifiers: {
      exportKind: "none",
      isDeclare: true,
      isAmbient: true,
    },
    typeParams: [],
    extends: [],
    properties: [],
    methods: [],
    callSignatures: [],
    constructSignatures: [],
    getAccessors: [],
    setAccessors: [],
    indexSignatures: [],
  };

  return {
    fqn,
    facets: [
      {
        type: SymbolType.INTERFACE,
        namespace: "type",
        ir,
        origin: { filePath: "/a.d.ts", scopes: [], sourceOrder: 0 },
        emit: true,
        provenance: [{ fqn, type: SymbolType.INTERFACE }],
      },
    ],
    deps: [],
    resolvedDeps: [],
  };
}

describe("SymbolTable semantic mutation contract", () => {
  test("returns structural snapshots instead of its live map and arrays", () => {
    const table = new SymbolTable();
    const first = symbol("/a.d.ts::A", "A");
    table.register(first.fqn, first);

    const snapshot = table.getSymbolTable();
    (snapshot as Map<string, readonly Symbol[]>).set("/a.d.ts::Injected", []);
    (snapshot.get(first.fqn) as Symbol[]).push(symbol(first.fqn, "Other"));

    expect(table.has("/a.d.ts::Injected")).toBe(false);
    expect(table.lookup(first.fqn)).toEqual([first]);
  });

  test("replaces and unregisters groups through explicit APIs", () => {
    const table = new SymbolTable();
    const first = symbol("/a.d.ts::A", "A");
    const replacement = symbol(first.fqn, "Replacement");
    table.register(first.fqn, first);

    table.replace(first.fqn, [replacement]);
    expect(table.lookup(first.fqn)).toEqual([replacement]);
    expect(table.unregister(first.fqn)).toEqual([replacement]);
    expect(table.has(first.fqn)).toBe(false);
  });

  test("validates a mutation batch before committing any change", () => {
    const table = new SymbolTable();
    const first = symbol("/a.d.ts::A", "A");
    table.register(first.fqn, first);

    const changes: SymbolTableChange[] = [
      { kind: "unregister", fqn: first.fqn },
      {
        kind: "replace",
        fqn: "/a.d.ts::B",
        symbols: [symbol("/a.d.ts::Wrong", "Wrong")],
      },
    ];

    expect(() => table.apply(changes)).toThrow(/does not match table key/);
    expect(table.lookup(first.fqn)).toEqual([first]);
    expect(table.has("/a.d.ts::B")).toBe(false);
  });
});
