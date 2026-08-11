import { resolve } from "path";
import { describe, expect, test } from "vitest";
import { transpilerContext } from "../../src/context";
import { IRDeclKind } from "../../src/ir/declaration";
import { IREnumInitializer } from "../../src/ir/enum";
import { Transpiler } from "../../src/transpiler";

const ENABLED = process.env.DARTIFY_S3_CORPUS === "1";

interface FidelityCensus {
  declarations: number;
  declarationsMissingLocation: number;
  parsedTypes: number;
  parsedTypesMissingLocation: number;
  typeParameters: number;
  parameters: number;
  callSignatures: number;
  constructSignatures: number;
  indexSignatures: number;
  jsDocs: number;
  enumInitializers: Record<IREnumInitializer["kind"], number>;
  variableKinds: Record<"var" | "let" | "const", number>;
}

function emptyCensus(): FidelityCensus {
  return {
    declarations: 0,
    declarationsMissingLocation: 0,
    parsedTypes: 0,
    parsedTypesMissingLocation: 0,
    typeParameters: 0,
    parameters: 0,
    callSignatures: 0,
    constructSignatures: 0,
    indexSignatures: 0,
    jsDocs: 0,
    enumInitializers: { implicit: 0, number: 0, string: 0, computed: 0 },
    variableKinds: { var: 0, let: 0, const: 0 },
  };
}

function censusDeclaration(
  declaration: Record<string, unknown>,
  census: FidelityCensus,
): void {
  census.declarations++;
  if (!declaration.loc) census.declarationsMissingLocation++;

  const seen = new Set<object>();
  function walk(node: unknown): void {
    if (!node || typeof node !== "object" || seen.has(node as object)) return;
    seen.add(node as object);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const record = node as Record<string, unknown>;
    if (typeof record.jsDoc === "string") census.jsDocs++;
    if (typeof record.originalText === "string") {
      census.parsedTypes++;
      if (!record.loc) census.parsedTypesMissingLocation++;
    }
    if (
      record.initializer &&
      typeof record.initializer === "object" &&
      "kind" in record.initializer
    ) {
      const kind = (record.initializer as IREnumInitializer).kind;
      census.enumInitializers[kind]++;
    }
    if (
      record.kind === IRDeclKind.Variable &&
      (record.declarationKind === "var" ||
        record.declarationKind === "let" ||
        record.declarationKind === "const")
    ) {
      census.variableKinds[record.declarationKind]++;
    }

    for (const [key, value] of Object.entries(record)) {
      if (key === "typeParams" && Array.isArray(value)) {
        census.typeParameters += value.length;
      } else if (key === "parameters" && Array.isArray(value)) {
        census.parameters += value.length;
      } else if (key === "callSignatures" && Array.isArray(value)) {
        census.callSignatures += value.length;
      } else if (key === "constructSignatures" && Array.isArray(value)) {
        census.constructSignatures += value.length;
      } else if (key === "indexSignatures" && Array.isArray(value)) {
        census.indexSignatures += value.length;
      }
      walk(value);
    }
  }

  walk(declaration);
}

describe.skipIf(!ENABLED)("S3 declaration fidelity corpus census", () => {
  test("retains the Stage 3 contract across representative declaration corpora", async () => {
    const inputSets = [
      ["def_files/synthetic/s3-complete.d.ts"],
      ["def_files/h3/h3.d.ts"],
      ["def_files/leaflet/leaflet.d.ts", "def_files/leaflet/geojson.d.ts"],
      ["def_files/three/src/Three.Core.d.ts"],
    ].map((files) => files.map((file) => resolve(file)));
    const census = emptyCensus();
    let inputDeclarations = 0;

    for (const files of inputSets) {
      const analysis = await new Transpiler({ files }).analyze();
      inputDeclarations += analysis.link.semantic.inputDeclarations;
      for (const group of transpilerContext.symbolTable.getSymbolTable().values()) {
        for (const symbol of group) {
          if (symbol.minted) continue;
          for (const facet of symbol.facets) {
            censusDeclaration(
              facet.ir as unknown as Record<string, unknown>,
              census,
            );
          }
        }
      }
    }

    console.info(`[S3 census] ${JSON.stringify(census)}`);

    expect(inputDeclarations).toBe(2_530);
    expect(census.declarations).toBeGreaterThan(0);
    expect(census.declarationsMissingLocation).toBe(0);
    expect(census.parsedTypes).toBeGreaterThan(0);
    expect(census.parsedTypesMissingLocation).toBe(0);
    expect(census.typeParameters).toBeGreaterThan(0);
    expect(census.parameters).toBeGreaterThan(0);
    expect(census.callSignatures).toBeGreaterThan(0);
    expect(census.constructSignatures).toBeGreaterThan(0);
    expect(census.indexSignatures).toBeGreaterThan(0);
    expect(census.jsDocs).toBeGreaterThan(0);
    expect(Object.values(census.enumInitializers).every((count) => count > 0)).toBe(
      true,
    );
    expect(Object.values(census.variableKinds).every((count) => count > 0)).toBe(
      true,
    );
  }, 60_000);
});
