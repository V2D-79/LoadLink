/**
 * src/engine/geo.ts
 *
 * Geographic primitives for the matching engine.
 *
 * - Haversine great-circle distance
 * - 0.5° grid cell key (for RTDB spatial index)
 * - Point-to-segment corridor check (driver route corridor)
 * - Bounding-box cell enumeration for radius queries
 */

const EARTH_RADIUS_KM = 6371;

export interface LatLng {
  lat: number;
  lng: number;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance between two points in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Compute the 0.5° grid cell key for a coordinate.
 * Format: "lat_<signed_floor>_lng_<signed_floor>"
 * Example: (18.52, 73.85) → "lat_37_lng_147" (floor of lat×2, lng×2)
 */
export function cellKey(point: LatLng): string {
  const latCell = Math.floor(point.lat * 2); // 0.5° → multiply by 2
  const lngCell = Math.floor(point.lng * 2);
  return `lat_${latCell}_lng_${lngCell}`;
}

/**
 * Return all cell keys within a bounding box around a point.
 * radiusKm is approximate — we add 1° of padding to guarantee coverage.
 */
export function cellsInRadius(center: LatLng, radiusKm: number): string[] {
  // 1° latitude ≈ 111 km; 0.5° cell ≈ 55 km
  const degPad = radiusKm / 111 + 0.5; // at least one extra cell
  const latMin = Math.floor((center.lat - degPad) * 2);
  const latMax = Math.floor((center.lat + degPad) * 2);
  const lngMin = Math.floor((center.lng - degPad) * 2);
  const lngMax = Math.floor((center.lng + degPad) * 2);

  const keys: string[] = [];
  for (let la = latMin; la <= latMax; la++) {
    for (let lo = lngMin; lo <= lngMax; lo++) {
      keys.push(`lat_${la}_lng_${lo}`);
    }
  }
  return keys;
}

/**
 * Perpendicular distance (km) from point P to the line segment A→B.
 * Returns the shorter of: perpendicular to segment interior, or
 * distance to nearest endpoint.
 */
export function pointToSegmentKm(p: LatLng, a: LatLng, b: LatLng): number {
  // Use equirectangular approximation (good enough for <500 km segments)
  const midLat = (a.lat + b.lat) / 2;
  const cosLat = Math.cos(toRad(midLat));

  const px = (p.lng - a.lng) * cosLat;
  const py = p.lat - a.lat;
  const bx = (b.lng - a.lng) * cosLat;
  const by = b.lat - a.lat;

  const bLenSq = bx * bx + by * by;
  if (bLenSq < 1e-12) {
    // Segment is a point
    return haversineKm(p, a);
  }

  const t = Math.max(0, Math.min(1, (px * bx + py * by) / bLenSq));
  const closestLng = a.lng + (t * (b.lng - a.lng));
  const closestLat = a.lat + (t * (b.lat - a.lat));

  return haversineKm(p, { lat: closestLat, lng: closestLng });
}

/**
 * True if point P is within corridorKm of ANY segment of the polyline.
 * polyline: array of [lat, lng] pairs.
 */
export function isNearRoute(
  p: LatLng,
  polyline: [number, number][],
  corridorKm: number,
): boolean {
  if (polyline.length < 2) {
    // Single point route — just check distance
    const pt = polyline[0];
    if (!pt) return false;
    return haversineKm(p, { lat: pt[0], lng: pt[1] }) <= corridorKm;
  }
  for (let i = 0; i < polyline.length - 1; i++) {
    const segA = polyline[i];
    const segB = polyline[i + 1];
    if (!segA || !segB) continue;
    const a: LatLng = { lat: segA[0], lng: segA[1] };
    const b: LatLng = { lat: segB[0], lng: segB[1] };
    if (pointToSegmentKm(p, a, b) <= corridorKm) return true;
  }
  return false;
}

/**
 * Estimated straight-line detour added by diverting from A→B to A→P→B.
 * delta = dist(A,P) + dist(P,B) - dist(A,B)
 */
export function detourKm(via: LatLng, from: LatLng, to: LatLng): number {
  return haversineKm(from, via) + haversineKm(via, to) - haversineKm(from, to);
}
