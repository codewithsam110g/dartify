// 1. Cross-file Imports (Testing Phase 1's ImportMap and Phase 2's validation)
import { RequestConfig, Logger } from "../core/types";

export class ApiClient {
    // Should resolve to `core/types.d.ts::Logger`
    constructor(logger: Logger);

    // 2. Stdlib & DOM Mapping Tests
    // Linker must map `Promise` -> `Future`, `Record` -> `Map`, `HTMLElement` -> `web.HTMLElement`
    fetchData(config: RequestConfig): Promise<Record<string, any>>;
    attachTo(element: HTMLElement): void;

    // 3. Overloads with Inline Anonymous Interfaces
    // This tests the FQN stack AND the overload resolver simultaneously.
    send(data: string): boolean;
    send(data: { id: number; payload: string }): boolean;

    // 4. Complex Union returning a standard library type
    getCache(): Array<string> | null;
}