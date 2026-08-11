import { describe, expect, test } from "vitest";
import { IRClass } from "../../src/ir/class";
import { IRType, TypeKind } from "../../src/ir/type";
import { forEachIRType } from "../../src/ir/visit";
import { LinkState } from "../../src/engine/phase/linkerPhase";
import { withTestProject } from "./test-project";

function references(ir: object): IRType[] {
  const result: IRType[] = [];
  forEachIRType(ir as never, (type) => {
    if (type.reference) result.push(type);
  });
  return result;
}

describe("S2 linker", () => {
  test("renamed imports retain spelling and link to the target declaration", async () => {
    await withTestProject(
      {
        "base.d.ts": "export interface Foo {}",
        "derived.d.ts":
          'import { Foo as Bar } from "./base"; export interface Uses { value: Bar }',
      },
      ({ analysis, symbols, files }) => {
        expect(analysis.resolution.unresolved).toEqual([]);
        expect(analysis.link.broken).toBe(0);

        const usesFQN = `${files.get("derived.d.ts")}::Uses`;
        const fooFQN = `${files.get("base.d.ts")}::Foo`;
        const symbol = symbols.get(usesFQN)![0];
        const reference = references(symbol.facets[0].ir).find(
          (type) => type.name === "Bar",
        )!.reference!;

        expect(reference.writtenName).toBe("Bar");
        expect(reference.lookup).toEqual({
          kind: "checker",
          candidates: [fooFQN],
        });
        expect(reference.resolvedFQN).toBe(fooFQN);
        expect(symbol.resolvedDeps).toEqual([fooFQN]);
      },
    );
  });

  test("generic heritage is represented and linked", async () => {
    await withTestProject(
      {
        "base.d.ts": "export class Base<T> {} export interface Named {}",
        "derived.d.ts":
          'import { Base, Named } from "./base"; export class Box<T> extends Base<T> implements Named {}',
      },
      ({ analysis, symbols, files }) => {
        expect(analysis.link.broken).toBe(0);
        const box = symbols.get(`${files.get("derived.d.ts")}::Box`)![0];
        const ir = box.facets[0].ir as IRClass;

        expect(ir.extends?.kind).toBe(TypeKind.TypeReference);
        expect(ir.extends?.name).toBe("Base");
        expect(ir.extends?.genericArgs?.[0].name).toBe("T");
        expect(ir.implements.map((type) => type.name)).toEqual(["Named"]);
        expect(box.resolvedDeps).toEqual([
          `${files.get("base.d.ts")}::Base`,
          `${files.get("base.d.ts")}::Named`,
        ]);
      },
    );
  });

  test("classifies immediate and transitive misses truthfully", async () => {
    await withTestProject(
      {
        "types.d.ts":
          "interface A { b: B } interface B { missing: Missing }",
      },
      ({ analysis, files }) => {
        const file = files.get("types.d.ts");
        const a = analysis.link.results.get(`${file}::A`)!;
        const b = analysis.link.results.get(`${file}::B`)!;

        expect(b.state).toBe(LinkState.NotLinkedDirect);
        expect(a.state).toBe(LinkState.NotLinkedIndirect);
        if (a.state === LinkState.NotLinkedIndirect) {
          expect(a.failure.kind).toBe("missing");
          expect(a.viaChain).toEqual([`${file}::B`]);
        }
      },
    );
  });

  test("keeps cycles linked", async () => {
    await withTestProject(
      { "cycle.d.ts": "interface A { b: B } interface B { a: A }" },
      ({ analysis }) => {
        expect(analysis.link.broken).toBe(0);
        expect(
          [...analysis.link.results.values()].every(
            (result) => result.state === LinkState.LinkedResolved,
          ),
        ).toBe(true);
      },
    );
  });

  test("reports syntax-only repeated global names as ambiguous", async () => {
    await withTestProject(
      {
        "a.d.ts": "export interface Options {}",
        "b.d.ts": "export interface Options {}",
        "use.d.ts": "export interface Uses { options: Options }",
      },
      ({ analysis, files }) => {
        const result = analysis.link.results.get(
          `${files.get("use.d.ts")}::Uses`,
        )!;
        expect(result.state).toBe(LinkState.NotLinkedDirect);
        if (result.state === LinkState.NotLinkedDirect) {
          expect(result.failure.kind).toBe("ambiguous");
          if (result.failure.kind === "ambiguous") {
            expect(result.failure.candidates).toHaveLength(2);
          }
        }
      },
    );
  });

  test("assigns dependencies to each variable instead of the whole statement", async () => {
    await withTestProject(
      {
        "vars.d.ts":
          "interface A {} interface B {} declare var a: A, b: B;",
      },
      ({ symbols, files }) => {
        const file = files.get("vars.d.ts");
        expect(symbols.get(`${file}::a`)![0].resolvedDeps).toEqual([
          `${file}::A`,
        ]);
        expect(symbols.get(`${file}::b`)![0].resolvedDeps).toEqual([
          `${file}::B`,
        ]);
      },
    );
  });
});
