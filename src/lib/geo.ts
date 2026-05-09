export type LatLng = { lat: number; lng: number };
export type BBox = { minLat: number; maxLat: number; minLng: number; maxLng: number };

const R_KM = 6371; // Earth mean radius, km (IUGG)

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two points using the Haversine formula.
 * Accurate for all distances including near-zero and antipodal.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}

/**
 * Initial bearing from a to b, in degrees [0, 360).
 * 0° = north, 90° = east, 180° = south, 270° = west.
 */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Conservative axis-aligned bounding box for all points within radiusKm of centre.
 * Near-polar points are clamped to ±90° lat / ±180° lng rather than wrapping.
 * Use haversineKm for exact filtering after the bbox pre-filter.
 */
export function boundingBox(centre: LatLng, radiusKm: number): BBox {
  const deltaLat = (radiusKm / R_KM) * (180 / Math.PI);
  const cosLat = Math.cos(toRad(centre.lat));
  // Guard against division by zero at the poles.
  const deltaLng = cosLat < 1e-10 ? 180 : (radiusKm / (R_KM * cosLat)) * (180 / Math.PI);

  return {
    minLat: Math.max(-90, centre.lat - deltaLat),
    maxLat: Math.min(90, centre.lat + deltaLat),
    minLng: Math.max(-180, centre.lng - deltaLng),
    maxLng: Math.min(180, centre.lng + deltaLng),
  };
}
