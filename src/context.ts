import { IRType } from "./ir/type";

class TranspilerContext {
  private static instance: TranspilerContext;
  private parseLiterals: boolean;
  private hoistedLiterals: Map<string, string>;
  private anonInterfaceCount: number;
  private constructor() {
    this.parseLiterals = true;
    this.anonInterfaceCount = 0;
    this.hoistedLiterals = new Map<string, string>();
  }

  public static getInstance(): TranspilerContext {
    if (!TranspilerContext.instance) {
      TranspilerContext.instance = new TranspilerContext();
    }
    return TranspilerContext.instance;
  }

  public setParseLiterals(val: boolean) {
    this.parseLiterals = val;
  }

  public getParseLiterals(): boolean {
    return this.parseLiterals;
  }

  public getAnonInterfaceCount(): number {
    return this.anonInterfaceCount;
  }
  public setAnonInterfaceCount(val: number) {
    this.anonInterfaceCount = val;
  }

  // Full access to hoistedLiterals map
  public getHoistedLiterals(): Map<string, string> {
    return this.hoistedLiterals;
  }

  public setHoistedLiteral(key: string, value: string): void {
    this.hoistedLiterals.set(key, value);
  }

  public getHoistedLiteral(key: string): string | undefined {
    return this.hoistedLiterals.get(key);
  }

  public hasHoistedLiteral(key: string): boolean {
    return this.hoistedLiterals.has(key);
  }

  public deleteHoistedLiteral(key: string): boolean {
    return this.hoistedLiterals.delete(key);
  }

  public clearHoistedLiterals(): void {
    this.hoistedLiterals.clear();
  }

  public getHoistedLiteralsSize(): number {
    return this.hoistedLiterals.size;
  }

  public getHoistedLiteralsKeys(): IterableIterator<string> {
    return this.hoistedLiterals.keys();
  }

  public getHoistedLiteralsValues(): IterableIterator<string> {
    return this.hoistedLiterals.values();
  }

  public getHoistedLiteralsEntries(): IterableIterator<[string, string]> {
    return this.hoistedLiterals.entries();
  }

  public forEachHoistedLiteral(
    callback: (value: string, key: string, map: Map<string, string>) => void,
  ): void {
    this.hoistedLiterals.forEach(callback);
  }
}

// Global cached instance for frequent access
const transpilerContext = TranspilerContext.getInstance();

export default TranspilerContext;
export { transpilerContext };
