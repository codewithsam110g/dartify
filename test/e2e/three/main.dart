// End-to-end: the generated three.js bindings against the real three package.
import 'package:e2e/three/Three.Core.dart';

void main() {
  final v = Vector3(1, 2, 3);
  v.add(Vector3(1, 1, 1));
  print('${v.x} ${v.y} ${v.z}');
  print(v.length().toStringAsFixed(4));
  print(Vector3(1, 0, 0).dot(Vector3(0, 1, 0)));
  final copy = v.clone();
  copy.set(0, 0, 0);
  print('${v.x} ${copy.x}');
  final m = Matrix4().makeTranslation_2(10, 0, 0);
  final moved = Vector3(1, 1, 1).applyMatrix4(m);
  print('${moved.x} ${moved.y}');
  final box = Box3(Vector3(0, 0, 0), Vector3(1, 1, 1));
  print(box.containsPoint(Vector3(0.5, 0.5, 0.5)));
  print(box.containsPoint(Vector3(2, 0, 0)));
  final parent = Object3D();
  parent.add(Object3D(), Object3D());
  print(parent.children.length);
  parent.position.set(4, 5, 6);
  print(parent.position.y);
  print(Color(0xff0000).getHexString());
}
