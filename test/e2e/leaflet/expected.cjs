// Ground truth for main.dart, computed directly with leaflet.
require("./setup.cjs");
const L = globalThis.L;
const paris = L.latLng(48.8566, 2.3522);
const london = L.latLng(51.5074, -0.1278);
const p = L.point(3, 4);
const b = L.bounds(L.point(0, 0), L.point(10, 10));
const ll = L.latLngBounds(L.latLng(0, 0), L.latLng(10, 10));
console.log([
  paris.lat,
  Math.round(paris.distanceTo(london) / 1000),
  paris.equals(L.latLng(48.8566, 2.3522)),
  p.add(L.point(1, 1)).x,
  p.distanceTo(L.point(0, 0)),
  b.contains(L.point(5, 5)),
  Math.round(L.CRS.EPSG3857.project(paris).x),
  ll.getCenter().lat,
  ll.contains(L.latLng(5, 5)),
].join("\n"));
