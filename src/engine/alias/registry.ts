import { UnsupportedReason } from "@ir/type";
import { deriveAliasName, textHash } from "./name";

/**
 * A typedef dartify invented to stand in for a TypeScript construct it cannot
 * represent.
 */
export interface MintedAlias {
  /** The Dart identifier. Unique within the registry's scope. */
  name: string;
  /** Source text this stands for — the body of the `///` comment (`E-16`). */
  originalText: string;
  /** What kind of construct was lost. Lets the emitter group the section. */
  reason: UnsupportedReason;
  /** How many use sites resolved to this alias. Diagnostics only. */
  useCount: number;
}

/**
 * Mints unique alias names for one emission scope (one file).
 *
 * Two responsibilities the pure derivation cannot have:
 *
 * - **Dedup.** `keyof Box<string>` written in ten places is one typedef with
 *   ten use sites, not ten typedefs (`L-05`). Keyed on source text, so the
 *   dedup is exact rather than name-collision-shaped.
 * - **Collision avoidance.** A derived name can land on a real declaration or
 *   on another alias's derived name. Shadowing a real type with a `dynamic`
 *   typedef would be a silent miscompile (design principle 1).
 *
 * Names are allocated over the *set* of minted texts, never in minting order
 * (`E-29`). A text keeps its readable base name only when no other minted text
 * derives the same base and no declaration holds it; every member of a
 * colliding group gets `base_<hash>`, with the hash lengthened deterministically
 * if two hashes coincide. Reversing traversal order, or inserting an unrelated
 * declaration, therefore cannot change any alias name.
 */
export class AliasRegistry {
  private readonly byText = new Map<string, MintedAlias>();
  private allocated = true;

  /**
   * @param isTaken reports names already claimed outside this registry —
   *   normally the symbol table for the file being emitted.
   */
  constructor(private readonly isTaken: (name: string) => boolean = () => false) {}

  /**
   * Returns the alias for `originalText`, minting one on first sight.
   * Idempotent: calling it per use site is the intended usage, and is how
   * `useCount` gets filled in. The returned alias's `name` is final once every
   * text has been minted; reading it earlier allocates over the texts seen so
   * far and is recomputed after further mints.
   */
  mint(originalText: string, reason: UnsupportedReason): MintedAlias {
    const existing = this.byText.get(originalText);
    if (existing) {
      existing.useCount++;
      return existing;
    }

    let name = "";
    const registry = this;
    const alias: MintedAlias = {
      get name() {
        registry.allocate();
        return name;
      },
      set name(value: string) {
        name = value;
      },
      originalText,
      reason,
      useCount: 1,
    };
    this.byText.set(originalText, alias);
    this.allocated = false;
    return alias;
  }

  /** The alias already minted for this text, if any. Does not mint. */
  lookup(originalText: string): MintedAlias | undefined {
    return this.byText.get(originalText);
  }

  /** Every alias minted, sorted by allocated name. */
  all(): MintedAlias[] {
    this.allocate();
    return [...this.byText.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  get size(): number {
    return this.byText.size;
  }

  private allocate(): void {
    if (this.allocated) return;
    this.allocated = true;

    const groups = new Map<string, MintedAlias[]>();
    for (const alias of this.byText.values()) {
      const base = deriveAliasName(alias.originalText, alias.reason);
      let group = groups.get(base);
      if (!group) groups.set(base, (group = []));
      group.push(alias);
    }

    const used = new Set<string>();
    for (const base of [...groups.keys()].sort()) {
      const group = groups
        .get(base)!
        .sort((a, b) => a.originalText.localeCompare(b.originalText));
      if (group.length === 1 && !this.isTaken(base) && !used.has(base)) {
        group[0].name = base;
        used.add(base);
        continue;
      }
      for (const alias of group) {
        let chosen: string | undefined;
        for (let length = 6; length <= 8 && !chosen; length++) {
          const candidate = `${base}_${textHash(alias.originalText, length)}`;
          if (!used.has(candidate) && !this.isTaken(candidate)) chosen = candidate;
        }
        // Two distinct texts with identical 32-bit hashes. Texts are sorted,
        // so the suffix is still deterministic.
        for (let n = 2; !chosen; n++) {
          const candidate = `${base}_${textHash(alias.originalText, 8)}_${n}`;
          if (!used.has(candidate) && !this.isTaken(candidate)) chosen = candidate;
        }
        alias.name = chosen;
        used.add(chosen);
      }
    }
  }
}
