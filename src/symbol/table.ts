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

/** A deeply detached, mutable copy of the table handed to a transaction. */
export type SymbolTableDraft = Map<string, Symbol[]>;

/**
 * Owns the symbol groups of exactly one compiler run.
 *
 * Ownership is deep (`L-10`): symbols are cloned on the way in and every read
 * returns a detached copy, so no consumer can reach live table state through a
 * nested facet, IR node or dependency. Mutation happens either through the
 * validated single-group APIs or through `transaction`, which hands the caller
 * a complete draft and commits it only after the whole draft validates.
 *
 * There is no process-global table. Each `Transpiler` invocation constructs its
 * own (`R-14`, task 4.11).
 */
export class SymbolTable {
  private symbols = new Map<string, Symbol[]>();

  public register(fqn: string, symbol: Symbol): void {
    this.assertSymbolMatches(fqn, symbol);
    this.symbols.set(fqn, [
      ...(this.symbols.get(fqn) ?? []),
      structuredClone(symbol),
    ]);
  }

  public replace(fqn: string, symbols: readonly Symbol[]): void {
    this.symbols.set(fqn, structuredClone(this.validatedGroup(fqn, symbols)));
  }

  public unregister(fqn: string): readonly Symbol[] {
    const removed = this.symbols.get(fqn) ?? [];
    this.symbols.delete(fqn);
    return removed;
  }

  /**
   * Runs a rewrite against a deep draft of the whole table and commits it
   * atomically. If `mutate` throws or the draft fails validation, the table is
   * unchanged.
   */
  public transaction<T>(mutate: (draft: SymbolTableDraft) => T): T {
    const draft = this.deepCopy(this.symbols);
    const result = mutate(draft);
    const validated = new Map<string, Symbol[]>();
    for (const [fqn, group] of draft) {
      validated.set(fqn, this.validatedGroup(fqn, group));
    }
    this.symbols = validated;
    return result;
  }

  /**
   * Applies a semantic rewrite as one transaction. Validation happens against
   * a detached draft, so an invalid later change cannot expose earlier ones.
   */
  public apply(changes: readonly SymbolTableChange[]): void {
    const changedFQNs = new Set<string>();
    this.transaction((draft) => {
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
            structuredClone(this.validatedGroup(change.fqn, change.symbols)),
          );
        }
      }
    });
  }

  public lookup(fqn: string): readonly Symbol[] | undefined {
    const group = this.symbols.get(fqn);
    return group ? structuredClone(group) : undefined;
  }

  public has(fqn: string): boolean {
    return this.symbols.has(fqn);
  }

  public getAll(): readonly Symbol[] {
    return structuredClone([...this.symbols.values()].flat());
  }

  /** Returns a deeply detached snapshot, not the table's backing storage. */
  public getSymbolTable(): ReadonlyMap<string, readonly Symbol[]> {
    return this.deepCopy(this.symbols);
  }

  public get size(): number {
    return this.symbols.size;
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

  private deepCopy(
    table: ReadonlyMap<string, readonly Symbol[]>,
  ): Map<string, Symbol[]> {
    return structuredClone(new Map(table)) as Map<string, Symbol[]>;
  }
}
