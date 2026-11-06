// Imports each barrel and uses the TypeScript public names it promises: a name
// followed through a chain, renamed names, an imported binding. Barrel syntax
// alone is not proof (`UNDEFINED_CLASS` only shows up in a consumer).
import '../barrels/a.dart' as ns;
import '../barrels/chain.dart' as chain;
import '../barrels/import.dart' as imported;
import '../barrels/rename.dart' as rename;

chain.Box<chain.A> viaChain(chain.A value) => chain.Box.of(value);

rename.Crate<rename.Shape> viaRename(rename.Shape shape) {
  final rename.Crate<rename.Shape> crate = rename.Crate(shape);
  return rename.Crate.of(crate.value);
}

rename.Shape madeViaRename() => rename.create();

bool enabledViaRename() => rename.enabled;

imported.A viaImport() => imported.makeA();

// `export * as ns from './a'` points at this spelling.
ns.A viaNamespace() => ns.makeA();
