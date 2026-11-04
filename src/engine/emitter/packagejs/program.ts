import { Symbol, SymbolFacet } from "@/symbol";
import { sourceFileOfFQN } from "@/symbol/fqn";
import { IRDeclKind } from "@ir/declaration";
import { IREnum } from "@ir/enum";
import { IRTypeParam } from "@ir/signature";
import { IRClass } from "@ir/class";
import { IRInterface } from "@ir/interface";
import { IRTypeAlias } from "@ir/typealias";
import { TypeKind } from "@ir/type";
import { forEachIRType } from "@ir/visit";

/** What a resolved reference denotes on the Dart side. */
export type TypeTarget =
  | {
      kind: "type";
      fqn: string;
      file: string;
      dartName: string;
      typeParams: readonly IRTypeParam[];
      facet: SymbolFacet;
    }
  | {
      /** TypeScript enums are numbers/strings at runtime; uses lower to that. */
      kind: "enumValue";
      dartType: "num" | "String" | "Object";
    };

/**
 * Read-only lookups over the linked program shared by every library the
 * backend renders. Built once per render from the owned `LinkedProgram`.
 */
export class ProgramIndex {
  private readonly targets = new Map<string, TypeTarget | null>();
  private ownedAnonymous?: Map<string, SymbolFacet>;
  private ownedAliases?: Set<SymbolFacet>;

  constructor(
    public readonly symbols: ReadonlyMap<string, readonly Symbol[]>,
    public readonly outputPathOfFile: ReadonlyMap<string, string>,
  ) {}

  /** The emitted Dart type a resolved FQN names, if it emits one. */
  typeTarget(fqn: string): TypeTarget | undefined {
    if (this.targets.has(fqn)) return this.targets.get(fqn) ?? undefined;
    const target = this.computeTarget(fqn);
    this.targets.set(fqn, target ?? null);
    return target;
  }

  /** The emitted type facet for an FQN: class, interface, enum or alias. */
  typeFacet(fqn: string): SymbolFacet | undefined {
    for (const symbol of this.symbols.get(fqn) ?? []) {
      const facet = symbol.facets.find(
        (candidate) =>
          candidate.emit &&
          (candidate.namespace === "type" || candidate.namespace === "both"),
      );
      if (facet) return facet;
    }
    return undefined;
  }

  /**
   * `type EventParameters = { … }` hoists the literal as an anonymous
   * interface. When that alias is the literal's only user, the class is
   * emitted under the alias's name and the alias itself is not (js_facade_gen
   * §5.11). Returns the owning alias facet for such an anonymous FQN.
   */
  aliasOwnerOf(anonymousFQN: string): SymbolFacet | undefined {
    this.computeOwnership();
    return this.ownedAnonymous!.get(anonymousFQN);
  }

  /** Whether an alias facet is replaced by the class it names. */
  isOwningAlias(facet: SymbolFacet): boolean {
    this.computeOwnership();
    return this.ownedAliases!.has(facet);
  }

  private computeOwnership(): void {
    if (this.ownedAnonymous) return;
    this.ownedAnonymous = new Map();
    this.ownedAliases = new Set();
    const uses = new Map<string, number>();
    for (const group of this.symbols.values()) {
      for (const symbol of group) {
        for (const facet of symbol.facets) {
          forEachIRType(facet.ir, (type) => {
            const target = type.reference?.resolvedFQN;
            if (target) uses.set(target, (uses.get(target) ?? 0) + 1);
          });
        }
      }
    }
    for (const group of this.symbols.values()) {
      for (const symbol of group) {
        for (const facet of symbol.facets) {
          if (!facet.emit || facet.ir.kind !== IRDeclKind.TypeAlias) continue;
          const alias = facet.ir as IRTypeAlias;
          if (alias.typeParams.length > 0) continue;
          if (alias.type.kind !== TypeKind.TypeReference || alias.type.isNullable) continue;
          const target = alias.type.reference?.resolvedFQN;
          if (!target || uses.get(target) !== 1) continue;
          if (sourceFileOfFQN(target) !== sourceFileOfFQN(symbol.fqn)) continue;
          const anonymous = this.typeFacet(target);
          if (anonymous?.synthetic !== "anonymousType") continue;
          if (anonymous.ir.kind !== IRDeclKind.Interface) continue;
          this.ownedAnonymous.set(target, facet);
          this.ownedAliases.add(facet);
        }
      }
    }
  }

  private computeTarget(fqn: string): TypeTarget | undefined {
    const facet = this.typeFacet(fqn);
    if (!facet) return undefined;
    if (facet.ir.kind === IRDeclKind.Enum) {
      return { kind: "enumValue", dartType: enumValueType(facet.ir as IREnum) };
    }
    const file = sourceFileOfFQN(fqn);
    if (!this.outputPathOfFile.has(file)) return undefined;
    const declaration = facet.ir as IRClass | IRInterface | IRTypeAlias;
    const owner = this.aliasOwnerOf(fqn);
    return {
      kind: "type",
      fqn,
      file,
      dartName: owner ? owner.ir.dartName ?? owner.ir.name : declaration.dartName ?? declaration.name,
      typeParams: declaration.typeParams ?? [],
      facet,
    };
  }
}

export function enumValueType(declaration: IREnum): "num" | "String" | "Object" {
  const kinds = new Set(
    declaration.members.map((member) => {
      const initializer = member.initializer;
      const value =
        initializer.kind === "number" || initializer.kind === "string"
          ? initializer.value
          : initializer.computedValue;
      if (typeof value === "string") return "String";
      if (typeof value === "number" || initializer.kind === "implicit") return "num";
      return "Object";
    }),
  );
  if (kinds.size === 0) return "num";
  if (kinds.size === 1) return [...kinds][0] as "num" | "String" | "Object";
  return "Object";
}
