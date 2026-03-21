import { Symbol } from "./index";

/**
 * SymbolTable manages the resolution and registration of symbols across
 * multiple files. Encapsulating this in a class allows us to cleanly 
 * hook in features like overload resolution, shadowing, or namespacing later.
 */
export class SymbolTable {
    // Using FQN (Fully Qualified Name) or simple name as the key
    // Array of symbols allows for function overloads or multiple declarations
    private symbols: Map<string, Symbol[]>;

    constructor() {
        this.symbols = new Map();
    }

    /**
     * Registers a new symbol into the table.
     * Future: Add overload merging or collision detection here.
     */
    public register(name: string, symbol: Symbol): void {
        const existing = this.symbols.get(name) || [];
        existing.push(symbol);
        this.symbols.set(name, existing);
    }

    /**
     * Looks up a symbol by its given name.
     */
    public lookup(name: string): Symbol[] | undefined {
        return this.symbols.get(name);
    }

    /**
     * Checks if a symbol exists in the table.
     */
    public has(name: string): boolean {
        return this.symbols.has(name);
    }

    /**
     * Returns all registered symbols.
     */
    public getAll(): Symbol[] {
        return Array.from(this.symbols.values()).flat();
    }
  
    public getSymbolTable(): Map<string, Symbol[]>{
      return this.symbols;
    }

    /**
     * Clears the table (useful between tests or independent transpilation runs).
     */
    public clear(): void {
        this.symbols.clear();
    }
}
