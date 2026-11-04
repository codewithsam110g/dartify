// End-to-end: the generated h3 bindings against the real h3-js library.
import 'package:e2e/h3/h3.dart';

void main() {
  final cell = latLngToCell(37.3615593, -122.0553238, 7);
  print(cell);
  print(getResolution(cell));
  print(isValidCell(cell));
  print(isValidCell('not-a-cell'));
  final center = cellToLatLng(cell);
  print(center.length);
  print(center[0].toStringAsFixed(4));
  print(cellToParent(cell, 5));
  print(gridDisk(cell, 1).length);
  print(gridDistance(cell, gridDisk(cell, 2).last));
  print(cellToBoundary(cell).length);
  print(cellToBoundary(cell, true).first.length);
  print(getHexagonAreaAvg(7, km2).toStringAsFixed(3));
  print(isPentagon(cell));
  print(getBaseCellNumber(cell));
}
