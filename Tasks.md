# Pending Tasks

## Type System & Parser
- [ ] Emit new JS types from js_interop (e.g., `JSAny`, `JSObject`, `JSString`)
- [ ] Process Nightmare types (`intersection`, `templates`, `index of`, `key of`, `partial`)
- [ ] Write better emitter for types using more in depth data

## Parser Advanced
- [ ] Fix ambient declarations using an encapsulatory class for each module
- [ ] Merge Interface + variable combination (Declaration Augmentation)
- [ ] Find a way to merge type-alias + variable combination
- [ ] Parse `this` keyword properly in method returns
- [ ] Implement a global symbol lookup table
- [ ] Implement Multi-file based import and export system
- [ ] Implement barrel imports and exports
- [ ] Parse all import type statements from `.d.ts`

## Code Generation
- [ ] Escape Dart keywords (e.g., `default`, `factory`, `new`)
- [ ] Generalize overload resolution to constructors, getters, setters
- [ ] Implement callable interfaces (deferred)
- [ ] Proper `operator []`/`[]=` support for index signatures
- [ ] Implement Interfaces with raw quoted properties as Index Signatures
- [ ] Hook dom/es types, classes and functions using `package:web` and `js_interop`
- [ ] Fix nested `TypeLiteral` hoisting from within unions, arrays, and generics
- [ ] Emit JSDoc Comments to final output
- [ ] Preserve Statement/Member in module/class/interface
- [ ] (v2.0) Emit New `js_interop` code rather than old `package:js` code

## Project Structure
- [ ] Generate per-module files with `part` and `export` structure

## Testing & Validation
- [ ] Run web integration test with `leaflet`
- [ ] Run web integration test with `axios`
- [ ] Test `lib.dom.d.ts` runtime output
- [ ] Check output for compile-time errors
- [ ] Integrate `ts.TypeChecker` for advanced TS feature tests

## Output Formats & Docs
- [ ] Document annotation logic and mapping rules
