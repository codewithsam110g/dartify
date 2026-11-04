import 'package:dc/ambient/ambient.dart' as ambient;
void main() {
  try { print('ambient make(): ${ambient.make()}'); } catch (e) { print('ambient make() threw: ${e.runtimeType}'); }
}
