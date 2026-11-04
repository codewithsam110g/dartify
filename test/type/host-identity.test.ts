import { describe, expect, test } from "vitest";
import { Transpiler } from "../../src/transpiler";
import { IRFunction } from "../../src/ir/function";
import { IRType } from "../../src/ir/type";

async function params(source: string, fileName: string): Promise<IRType[]> {
  const { program } = await Transpiler.transpileFromString(source, { fileName });
  const fn = program!.symbols.get(`${fileName}::f`)![0].facets[0].ir as IRFunction;
  return fn.parameters.map((parameter) => parameter.type);
}

describe("4.17 host type provenance (I-15)", () => {
  test("records checker-confirmed host identity for platform and stdlib types", async () => {
    const [element, bytes, record, promise] = await params(
      "declare function f(a: HTMLElement, b: Uint8Array, c: Record<string, number>, d: Promise<void>): void;",
      "/host.d.ts",
    );
    expect(element.host).toMatchObject({
      family: "typescript",
      qualifiedName: "HTMLElement",
    });
    expect(element.host!.libraries).toContain("lib.dom.d.ts");
    expect(bytes.host).toMatchObject({ qualifiedName: "Uint8Array" });
    expect(record.host).toMatchObject({ qualifiedName: "Record" });
    expect(promise.host).toMatchObject({ qualifiedName: "Promise" });
    for (const type of [element, bytes, record, promise]) {
      expect(type.reference).toBeUndefined();
    }
  });

  test("a lexical type parameter with a host spelling has no host identity", async () => {
    const [param] = await params(
      "declare function f<HTMLElement>(a: HTMLElement): void;",
      "/lexical.d.ts",
    );
    expect(param.host).toBeUndefined();
    expect(param.reference).toBeUndefined();
  });

  test("a project declaration with a host spelling links to the project", async () => {
    const [param] = await params(
      "export interface HTMLElement { mine: true; }\nexport declare function f(a: HTMLElement): void;",
      "/shadow.d.ts",
    );
    expect(param.host).toBeUndefined();
    expect(param.reference?.lookup).toMatchObject({ kind: "checker" });
  });

  test("host identities never become link edges", async () => {
    const { program } = await Transpiler.transpileFromString(
      "declare function f(a: HTMLElement): void;",
      { fileName: "/edges.d.ts" },
    );
    expect(program!.report.edges).toEqual([]);
  });
});
