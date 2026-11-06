// Dart side of the cross-file global probe. Expected output: main.expected.
import 'dart:html' show window;
import 'package:dc/globals_augment/a_window.dart';
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
}
