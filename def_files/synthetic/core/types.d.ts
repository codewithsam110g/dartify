// 1. Basic interface for import testing
export interface RequestConfig {
    url: string;
    timeout?: number;
}

// 2. Homogeneous Overloads (Same name, different params)
export interface Logger {
    log(message: string): void;
    log(error: Error, code: number): void;
    log(data: Record<string, any>): void;
}

// 3. The "Ghost" Dependency (Testing the Linker's Safety Net)
// Phase 2 MUST catch that `MissingThirdPartyType` doesn't exist
// and gracefully map it to `JSAny` or `dynamic`.
export type GhostAlias = MissingThirdPartyType;

// 4. Standalone function overloads
export function createId(): string;
export function createId(prefix: string): string;