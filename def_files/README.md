# Third-Party Type Definitions for Testing

The `.d.ts` files contained within this directory (`def_files/`) and its subdirectories are **not part of the `dart_bindgen` source code** and are **not distributed** when this package is published to npm.

They are strictly used for internal compiler validation, snapshot testing, and benchmarking the `dart_bindgen` transpilation pipeline against real-world, complex TypeScript scenarios.

## Licensing Notice

All type definitions included in this folder belong to their respective authors and projects (such as `DefinitelyTyped`, Microsoft, and individual library authors). They are included here solely for testing under the principles of fair use and are bound by their original respective open-source licenses (typically MIT or Apache 2.0).

By keeping these files in the repository, it ensures the test suite and snapshot pipelines can be reliably reproduced by contributors without requiring external network requests to continually fetch massive `.d.ts` dependency trees.

**Do not modify these files directly** unless you are intentionally creating a synthetic bug case for the compiler tests.
