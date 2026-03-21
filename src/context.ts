import { SymbolTable } from "./symbol/table";

class TranspilerContext {
  private static instance: TranspilerContext;
  private isLogging: boolean;
  public readonly symbolTable: SymbolTable;

  private constructor() {
    this.isLogging = false;
    this.symbolTable = new SymbolTable();
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
