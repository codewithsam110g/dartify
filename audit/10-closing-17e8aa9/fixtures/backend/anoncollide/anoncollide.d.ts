// Two different inline object types whose hoisting scopes differ only by `$`.
export interface A { x: { p: string } }
export interface A$ { x: { q: number } }
