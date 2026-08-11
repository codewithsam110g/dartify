import { Symbol } from "./index";

export type SymbolTableChange =
  | {
      kind: "replace";
      fqn: string;
      symbols: readonly Symbol[];
    }
  | {
      kind: "unregister";
      fqn: string;
    };

/**
 * Owns the mutable symbol groups used by generation and semantic linking.
 * Readers receive structural snapshots; mutations go through validated APIs.
 */
export class SymbolTable {
  private symbols = new Map<string, Symbol[]>();

  public register(fqn: string, symbol: Symbol): void {
    this.assertSymbolMatches(fqn, symbol);
    this.symbols.set(fqn, [...(this.symbols.get(fqn) ?? []), symbol]);
  }

  public replace(fqn: string, symbols: readonly Symbol[]): void {
    const replacements = this.validatedGroup(fqn, symbols);
    this.symbols.set(fqn, replacements);
  }

  public unregister(fqn: string): readonly Symbol[] {
    const removed = [...(this.symbols.get(fqn) ?? [])];
    this.symbols.delete(fqn);
    return removed;
  }

  /**
   * Applies a semantic rewrite as one transaction. Validation happens against
   * a detached draft, so an invalid later change cannot expose earlier ones.
   */
  public apply(changes: readonly SymbolTableChange[]): void {
    const draft = this.copyTable(this.symbols);
    const changedFQNs = new Set<string>();

    for (const change of changes) {
      if (changedFQNs.has(change.fqn)) {
        throw new Error(
          `Symbol table mutation contains duplicate target '${change.fqn}'`,
        );
      }
      changedFQNs.add(change.fqn);

      if (change.kind === "unregister") {
        draft.delete(change.fqn);
      } else {
        draft.set(
          change.fqn,
          this.validatedGroup(change.fqn, change.symbols),
        );
      }
    }

    this.symbols = draft;
  }

  public lookup(fqn: string): readonly Symbol[] | undefined {
    const group = this.symbols.get(fqn);
    return group ? [...group] : undefined;
  }

  public has(fqn: string): boolean {
    return this.symbols.has(fqn);
  }

  public getAll(): readonly Symbol[] {
    return [...this.symbols.values()].flat();
  }

  /** Returns a detached map/array snapshot, not the table's backing storage. */
  public getSymbolTable(): ReadonlyMap<string, readonly Symbol[]> {
    return this.copyTable(this.symbols);
  }

  public clear(): void {
    this.symbols.clear();
  }

  private validatedGroup(
    fqn: string,
    symbols: readonly Symbol[],
  ): Symbol[] {
    if (symbols.length === 0) {
      throw new Error(
        `Cannot replace '${fqn}' with an empty group; unregister it instead`,
      );
    }
    for (const symbol of symbols) this.assertSymbolMatches(fqn, symbol);
    return [...symbols];
  }

  private assertSymbolMatches(fqn: string, symbol: Symbol): void {
    if (symbol.fqn !== fqn) {
      throw new Error(
        `Symbol FQN '${symbol.fqn}' does not match table key '${fqn}'`,
      );
    }
  }

  private copyTable(
    table: ReadonlyMap<string, readonly Symbol[]>,
  ): Map<string, Symbol[]> {
    return new Map(
      [...table].map(([fqn, symbols]) => [fqn, [...symbols]]),
    );
  }
}
