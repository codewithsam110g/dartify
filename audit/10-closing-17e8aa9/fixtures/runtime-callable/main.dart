import 'package:dc/callable/callable.dart';
void main() {
  final counter = makeCounter();
  try {
    final viaCall = counter.call(5);
    print('counter.call(5) = $viaCall; total = ${counter.total}');
  } catch (e) {
    print('counter.call(5) threw: ${e.runtimeType}');
  }
  try {
    final viaInvoke = counter(7);
    print('counter(7) = $viaInvoke; total = ${counter.total}');
  } catch (e) {
    print('counter(7) threw: ${e.runtimeType}');
  }
}
