import { SymbolTable } from "./symbol/table";

class TranspilerContext {
  private static instance: TranspilerContext;
  private isLogging: boolean;
  public currentFQN: string;
  public currentDeps: Set<string>;
  public readonly symbolTable: SymbolTable;

  private constructor() {
    this.isLogging = false;
    this.symbolTable = new SymbolTable();
    this.currentFQN = "";
    this.currentDeps = new Set();
  }

  /**
   * Clears the deps bucket. Call before parsing each declaration.
   */
  public clearDeps(): void {
    this.currentDeps.clear();
  }

  /**
   * Returns context-owned state to its initial condition.
   *
   * Prefer `resetTranspilerState()` from `@/reset`, which is the single reset
   * seam every entry point calls.
   */
  public reset(): void {
    this.symbolTable.clear();
    this.currentFQN = "";
    this.currentDeps.clear();
  }

  public static getInstance(): TranspilerContext {
    if (!TranspilerContext.instance) {
      TranspilerContext.instance = new TranspilerContext();
    }
    return TranspilerContext.instance;
  }

  public getIsLogging(): boolean {
    return this.isLogging;
  }

  public setIsLogging(val: boolean) {
    this.isLogging = val;
  }
}

// Global cached instance for frequent access
const transpilerContext = TranspilerContext.getInstance();

export default TranspilerContext;
export { transpilerContext };
