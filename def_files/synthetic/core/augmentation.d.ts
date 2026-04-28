// 1. Interface Merging (TypeScript allows this, Dart hates it)
// Phase 2 must squash these two into a single `UserModule` IR object.
export interface UserModule {
    init(): void;
}
export interface UserModule {
    version: string;
    shutdown(): void;
}

// 2. Hybrid Augmentation (Variable + Interface)
// Very common in JS libraries to have a callable object with static properties.
export interface AppRunner {
    (config: string): void; // The call signature
    defaultPort: number;    // The static property
}
export declare var AppRunner: AppRunner;

// 3. Namespace Merging
export namespace Database {
    export interface Connection { id: string; }
}
export namespace Database {
    export function connect(): Connection;
}