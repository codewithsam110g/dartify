// Uses every public name the package entry promises, the way an application
// would: types, constructors, static members and function calls. Analyzed with
// the generated libraries by `pnpm test:dart`.
import '../exports/entry.dart' as entry;
// `export * as geometry from './geometry'` is written by the consumer in Dart.
import '../exports/geometry.dart' as geometry;
import '../exports/callable.dart' as callable;

num useEveryPublicName() {
  final entry.Counter counter = entry.Counter(1);
  final entry.Counter zero = entry.Counter.zero();
  final entry.Gadget gadget = entry.Gadget('g');
  final entry.Gadget made = entry.Gadget.make('m');
  final entry.Stamp stamp = entry.Stamp();
  return counter.next() +
      zero.value +
      entry.tally(1, 2) +
      entry.VERSION.length +
      gadget.label().length +
      made.label().length +
      stamp.mark().length +
      entry.util('x').length +
      entry.Tool(2) +
      entry.publicName(3) +
      entry.run(1) +
      geometry.area(2, 3) +
      geometry.Point(1, 2).x +
      callable.callable(1) +
      callable.member(2) +
      callable.LEVEL.length;
}
