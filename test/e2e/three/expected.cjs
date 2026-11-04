// Ground truth for main.dart, computed directly with three.
const THREE = require("three");
const v = new THREE.Vector3(1, 2, 3).add(new THREE.Vector3(1, 1, 1));
const copy = v.clone().set(0, 0, 0);
const moved = new THREE.Vector3(1, 1, 1).applyMatrix4(new THREE.Matrix4().makeTranslation(10, 0, 0));
const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));
const parent = new THREE.Object3D();
parent.add(new THREE.Object3D(), new THREE.Object3D());
parent.position.set(4, 5, 6);
console.log([
  `${v.x} ${v.y} ${v.z}`,
  v.length().toFixed(4),
  new THREE.Vector3(1, 0, 0).dot(new THREE.Vector3(0, 1, 0)),
  `${v.x} ${copy.x}`,
  `${moved.x} ${moved.y}`,
  box.containsPoint(new THREE.Vector3(0.5, 0.5, 0.5)),
  box.containsPoint(new THREE.Vector3(2, 0, 0)),
  parent.children.length,
  parent.position.y,
  new THREE.Color(0xff0000).getHexString(),
].join("\n"));
