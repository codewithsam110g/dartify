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
  private readonly ownershipByFile = new Map<
    string,
    { owned: Map<string, SymbolFacet>; aliases: Set<SymbolFacet> }
  >();
  private filesIndex?: Map<string, (readonly Symbol[])[]>;
  private shapeList?: { fqn: string; facet: SymbolFacet }[];

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

  /** Every structural-shape interface in the program, computed once. */
  shapes(): { fqn: string; facet: SymbolFacet }[] {
    if (!this.shapeList) {
      this.shapeList = [];
      for (const [fqn, group] of this.symbols) {
        for (const symbol of group) {
          for (const facet of symbol.facets) {
            if (isShapeCandidate(facet)) this.shapeList.push({ fqn, facet });
          }
        }
      }
      this.shapeList.sort((a, b) => a.fqn.localeCompare(b.fqn));
    }
    return this.shapeList;
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
    return this.ownership(sourceFileOfFQN(anonymousFQN)).owned.get(anonymousFQN);
  }

  /** Whether an alias facet is replaced by the class it names. */
  isOwningAlias(facet: SymbolFacet): boolean {
    return this.ownership(facet.origin.filePath).aliases.has(facet);
  }

  /**
   * Ownership is decided per file and lazily: an anonymous hoisted type can
   * only be referenced from its own file, so counting that file's uses is
   * enough, and incremental renders never walk unaffected files.
   */
  private ownership(file: string): { owned: Map<string, SymbolFacet>; aliases: Set<SymbolFacet> } {
    let entry = this.ownershipByFile.get(file);
    if (entry) return entry;
    entry = { owned: new Map(), aliases: new Set() };
    this.ownershipByFile.set(file, entry);
    const groups = this.groupsOfFile(file);
    const uses = new Map<string, number>();
    for (const group of groups) {
      for (const symbol of group) {
        for (const facet of symbol.facets) {
          forEachIRType(facet.ir, (type) => {
            const target = type.reference?.resolvedFQN;
            if (target) uses.set(target, (uses.get(target) ?? 0) + 1);
          });
        }
      }
    }
    for (const group of groups) {
      for (const symbol of group) {
        for (const facet of symbol.facets) {
          if (!facet.emit || facet.ir.kind !== IRDeclKind.TypeAlias) continue;
          const alias = facet.ir as IRTypeAlias;
          if (alias.typeParams.length > 0) continue;
          if (alias.type.kind !== TypeKind.TypeReference || alias.type.isNullable) continue;
          const target = alias.type.reference?.resolvedFQN;
          if (!target || uses.get(target) !== 1) continue;
          if (sourceFileOfFQN(target) !== file) continue;
          const anonymous = this.typeFacet(target);
          if (anonymous?.synthetic !== "anonymousType") continue;
          if (anonymous.ir.kind !== IRDeclKind.Interface) continue;
          entry.owned.set(target, facet);
          entry.aliases.add(facet);
        }
      }
    }
    return entry;
  }

  private groupsOfFile(file: string): (readonly Symbol[])[] {
    if (!this.filesIndex) {
      this.filesIndex = new Map();
      for (const [fqn, group] of this.symbols) {
        const owner = sourceFileOfFQN(fqn);
        const list = this.filesIndex.get(owner) ?? [];
        list.push(group);
        this.filesIndex.set(owner, list);
      }
    }
    return this.filesIndex.get(file) ?? [];
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

/**
 * A named, non-generic, property-only object shape (an `@anonymous`
 * interface): TypeScript accepts any value with those properties, so classes
 * that structurally provide them are emitted as implementing it (structural
 * conformance, `E-43`).
 */
export function isShapeCandidate(facet: SymbolFacet): boolean {
  if (!facet.emit || facet.synthetic || facet.namespace !== "type") return false;
  if (facet.ir.kind !== IRDeclKind.Interface) return false;
  const shape = facet.ir as IRInterface;
  if (shape.typeParams.length > 0) return false;
  if (shape.methods.length > 0 || shape.callSignatures.length > 0) return false;
  if (shape.constructSignatures.length > 0 || shape.indexSignatures.length > 0) return false;
  if (shape.setAccessors.length > 0) return false;
  const members = [...shape.properties, ...shape.getAccessors].filter((member) => !member.isStatic);
  return members.length >= 2 && members.length === shape.properties.length + shape.getAccessors.length;
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
