// Dart side of the export dispatch probe. Expected output: main.expected.
import 'package:dc/ambient/ambient.dart' as bare;
import 'package:dc/ambient_rooted/ambient.dart' as rooted;
import 'package:dc/exports/callable.dart' as callable;
import 'package:dc/exports/entry.dart' as entry;
import 'package:dc/exports/geometry.dart' as geometry;

void main() {
  final counter = entry.Counter(5);
  print(counter.next());
  print(entry.Counter.zero().value);
  print(entry.tally(2, 3));
  print(entry.VERSION);
  print(entry.Gadget('g').label());
  print(entry.Gadget.make('m').label());
  print(entry.util('x'));
  print(entry.Tool(4));
  print(entry.Stamp().mark());
  print(entry.publicName(1));
  print(entry.run(1));
  print(geometry.area(2, 3));
  print(geometry.Point(1, 2).y);
  print(callable.callable(2));
  print(callable.member(2));
  print(callable.LEVEL);
  print(bare.Widget('w').label());
  print(bare.make().label());
  print(rooted.Widget('w').label());
  print(rooted.make().label());
}
