import 'package:dc/privatector/privatector.dart';
void main() {
  try { final s = Singleton(); print('Singleton() constructed from Dart: ${s.runtimeType}'); } catch (e) { print('Singleton() threw: $e'); }
}
