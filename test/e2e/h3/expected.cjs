// Ground truth for main.dart, computed directly with h3-js.
const h3 = require("h3-js");
const cell = h3.latLngToCell(37.3615593, -122.0553238, 7);
const out = [
  cell,
  h3.getResolution(cell),
  h3.isValidCell(cell),
  h3.isValidCell("not-a-cell"),
  h3.cellToLatLng(cell).length,
  h3.cellToLatLng(cell)[0].toFixed(4),
  h3.cellToParent(cell, 5),
  h3.gridDisk(cell, 1).length,
  h3.gridDistance(cell, h3.gridDisk(cell, 2).at(-1)),
  h3.cellToBoundary(cell).length,
  h3.cellToBoundary(cell, true)[0].length,
  h3.getHexagonAreaAvg(7, h3.UNITS.km2).toFixed(3),
  h3.isPentagon(cell),
  h3.getBaseCellNumber(cell),
];
console.log(out.join("\n"));
