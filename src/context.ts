class TranspilerContext {
  private static instance: TranspilerContext;
  private isLogging: boolean;
  private currentFileName: string;

  private constructor() {
    this.isLogging = false;
    this.currentFileName = "";
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

  public getCurrentFileName(): string {
    return this.currentFileName;
  }
  public setCurrentFileName(val: string) {
    this.currentFileName = val;
  }

}

// Global cached instance for frequent access
const transpilerContext = TranspilerContext.getInstance();

export default TranspilerContext;
export { transpilerContext };
