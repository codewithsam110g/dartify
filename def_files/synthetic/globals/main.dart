// Dart side of the cross-file global probe. Expected output: main.expected.
import 'dart:html' show window;
import 'package:js/js_util.dart' as js_util;
import 'package:dc/globals_augment/a_window.dart';
import 'package:dc/globals_companion/window.dart' as companion;
import 'package:dc/globals_core/a_core.dart';
import 'package:dc/globals_core/b_use.dart';
import 'package:dc/globals_redeclared/one.dart';
import 'package:dc/globals_split/a_counter.dart' as split_counter;
import 'package:dc/globals_split/c_window.dart' as split_window;
import 'package:dc/globals_merge/part1.dart';
import 'package:dc/globals_merge/part2.dart';
import 'package:dc/globals_merge/part3.dart';

void main() {
  // One Settings class holds the members of all three declarations.
  final settings = Settings(theme: 'dark', size: 3, locale: 'en', extra: true);
  configure(settings);
  print(describeSettings(settings));
  print(settings.locale);

  // The extension on dart:html's Window: read, write, call.
  print(window.myProp);
  window.myProp = 'changed';
  print(window.myProp);
  print(window.version);
  print(window.ping(2, 'x'));
  print(window.ping(2));
  print(window.ping());
  print(window.add(2, 3));
  // Declared in the second file (`declare global`), owned by the first.
  print(window.other);
  window.other = false;
  print(window.other);

  // Lib types the core lowering maps to SDK types (HD-23): extensions on them.
  final fruit = <String>['apple', 'fig', 'kiwi'];
  print(fruit.firstOr('none'));
  print(<String>[].firstOr('none'));
  print(fruit.chunks(2));
  print(fruit.chunks(2)[1].first);
  // Collection-typed members arrive as typed lists, not failed casts.
  print(fruit.labels);
  print(fruit.labels.first.length);
  print(fruit.maybeLabels);
  print(<String>[].maybeLabels);
  print(fruit.words());
  print(fruit.numbers().first + 1);
  print(fruit.boxes().last.value);
  print(fruit.box().value);
  fruit.labels = fruit.words();
  fruit.maybeLabels = null;
  print(<num>[1, 2, 3].second());
  print('abc'.shout());
  print('education'.vowels);
  print(21.twice());
  print(true.flip());
  print(Object().who());
  print(js_util.getProperty<Function>(js_util.globalThis, 'jsFn').tag());
  // The lib types stay the SDK's in other declarations, and what the
  // extensions return is a real array when handed back to JavaScript.
  print(joinAll(fruit.words(), <num>[1, 2]));
  print(shoutAll(fruit));
  print(describe('text'));

  // Interface and value companion in one file: the extension, no class.
  print(companion.WindowAugment(window).companionProp);

  // The identical redeclarations are one binding each.
  print(shared);
  print(same(3));
  print(useShared());

  // An interface and its constructor-shaped value in different files: one class.
  final counter = split_counter.Counter(5);
  print(counter.value);
  print(split_counter.Counter.zero().value);
  print(split_counter.Counter.DEFAULT);
  print(split_window.WindowAugment(window).splitProp);
}
