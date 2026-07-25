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
 * - **Collision avoidance.** A derived name can land on a real declaration —
 *   `Attributes[K]` derives near `Attributes`, and an author is free to have
 *   declared `IndexedAttributesK` themselves. Shadowing a real type with a
 *   `dynamic` typedef would be a silent miscompile, which is exactly what
 *   design principle 1 forbids.
 *
 * Disambiguation appends a hash of the source text rather than a counter, so a
 * name does not change when an unrelated declaration is added to the file.
 */
export class AliasRegistry {
  private readonly byText = new Map<string, MintedAlias>();
  private readonly byName = new Map<string, MintedAlias>();

  /**
   * @param isTaken reports names already claimed outside this registry —
   *   normally the symbol table for the file being emitted.
   */
  constructor(private readonly isTaken: (name: string) => boolean = () => false) {}

  /**
   * Returns the alias for `originalText`, minting one on first sight.
   * Idempotent: calling it per use site is the intended usage, and is how
   * `useCount` gets filled in.
   */
  mint(originalText: string, reason: UnsupportedReason): MintedAlias {
    const existing = this.byText.get(originalText);
    if (existing) {
      existing.useCount++;
      return existing;
    }

    const alias: MintedAlias = {
      name: this.uniqueName(originalText, reason),
      originalText,
      reason,
      useCount: 1,
    };
    this.byText.set(originalText, alias);
    this.byName.set(alias.name, alias);
    return alias;
  }

  /** The alias already minted for this text, if any. Does not mint. */
  lookup(originalText: string): MintedAlias | undefined {
    return this.byText.get(originalText);
  }

  /**
   * Every alias minted, in first-seen order. The emitter decides how to sort
   * or group the type-definitions section (`E-16`); this only guarantees the
   * order is deterministic.
   */
  all(): MintedAlias[] {
    return [...this.byText.values()];
  }

  get size(): number {
    return this.byText.size;
  }

  private uniqueName(originalText: string, reason: UnsupportedReason): string {
    const base = deriveAliasName(originalText, reason);
    if (!this.claimed(base)) return base;

    const hashed = `${base}_${textHash(originalText)}`;
    if (!this.claimed(hashed)) return hashed;

    // Two distinct texts hashing identically *and* colliding on the base name.
    // Not expected to happen; still cheaper than reasoning about whether it
    // can't.
    for (let n = 2; ; n++) {
      const candidate = `${hashed}_${n}`;
      if (!this.claimed(candidate)) return candidate;
    }
  }

  private claimed(name: string): boolean {
    return this.byName.has(name) || this.isTaken(name);
  }
}
