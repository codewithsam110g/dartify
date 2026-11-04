import 'datelib.dart';
void main() {
  try {
    final d = now();
    print('now().year = ${d.year}');
  } catch (e) {
    print('now().year threw: ${e.runtimeType}');
  }
  try {
    print('yearOf(DateTime.utc(2030)) = ${yearOf(DateTime.utc(2030))}');
  } catch (e) {
    print('yearOf threw: ${e.runtimeType}');
  }
}
