// End-to-end: the generated Leaflet bindings against the real leaflet package
// (UMD global `L`, `export as namespace L`).
import 'package:e2e/leaflet/leaflet.dart';

void main() {
  final paris = LatLng(48.8566, 2.3522);
  final london = latLng_1(51.5074, -0.1278);
  print(paris.lat);
  print((paris.distanceTo(london) / 1000).round());
  print(paris.equals(LatLng(48.8566, 2.3522)));
  final p = point_1(3, 4);
  print(p.add(Point(1, 1)).x);
  print(p.distanceTo(Point(0, 0)));
  final b = bounds_1(Point(0, 0), Point(10, 10));
  print(b.contains(Point(5, 5)));
  final projected = EPSG3857.project(paris);
  print(projected.x.round());
  final ll = latLngBounds_1(LatLng(0, 0), LatLng(10, 10));
  print(ll.getCenter().lat);
  print(ll.contains(LatLng(5, 5)));
}
