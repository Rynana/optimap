import { describe, it, expect } from "vitest";
import { haversineKm, bearingDeg, boundingBox } from "./geo";

// R = 6371 km (IUGG mean radius used throughout).
const R = 6371;

/** Assert actual is within 0.1 % of ref (per the T-004 AC). */
function within01pct(actual: number, ref: number): void {
  if (ref === 0) {
    expect(actual).toBe(0);
    return;
  }
  expect(Math.abs(actual - ref) / ref).toBeLessThanOrEqual(0.001);
}

// ---------------------------------------------------------------------------
// haversineKm — 9 fixtures
// ---------------------------------------------------------------------------

describe("haversineKm", () => {
  it("same point returns 0", () => {
    within01pct(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0);
    within01pct(haversineKm({ lat: -33.87, lng: 151.21 }, { lat: -33.87, lng: 151.21 }), 0);
  });

  it("equator quarter (0,0)→(0,90) = R·π/2", () => {
    // Analytical: Δlng=90°, a=sin²(45°)=0.5, c=π/2
    const expected = R * (Math.PI / 2); // 10 007.543 km
    within01pct(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 90 }), expected);
  });

  it("from equator to north pole = R·π/2", () => {
    const expected = R * (Math.PI / 2);
    within01pct(haversineKm({ lat: 0, lng: 0 }, { lat: 90, lng: 0 }), expected);
  });

  it("from equator to south pole = R·π/2", () => {
    const expected = R * (Math.PI / 2);
    within01pct(haversineKm({ lat: 0, lng: 0 }, { lat: -90, lng: 0 }), expected);
  });

  it("north pole to south pole = R·π (half-circumference)", () => {
    const expected = R * Math.PI; // 20 015.087 km
    within01pct(haversineKm({ lat: 90, lng: 0 }, { lat: -90, lng: 0 }), expected);
  });

  it("antimeridian crossing: (0,179)→(0,-179) equals 2° of longitude at equator", () => {
    // Shortest path crosses 180°: only 2° apart.
    // 2° at equator: 2 × R × asin(sin(π/180)) ≈ 2 × R × π/180
    const expected = 2 * R * Math.asin(Math.sin(Math.PI / 180)); // ~222.4 km
    within01pct(haversineKm({ lat: 0, lng: 179 }, { lat: 0, lng: -179 }), expected);
  });

  it("southern hemisphere: Sydney → Melbourne ~713 km", () => {
    // Reference computed with the Haversine formula (R=6371 km).
    const sydney = { lat: -33.8688, lng: 151.2093 };
    const melbourne = { lat: -37.8136, lng: 144.9631 };
    const d = haversineKm(sydney, melbourne);
    expect(d).toBeGreaterThan(700);
    expect(d).toBeLessThan(730);
    // Check against precomputed reference (Haversine, R=6371): 713.84 km
    within01pct(d, 713.84);
  });

  it("northern hemisphere: London → Paris ~344 km", () => {
    const london = { lat: 51.5074, lng: -0.1278 };
    const paris = { lat: 48.8566, lng: 2.3522 };
    const d = haversineKm(london, paris);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(360);
    // Reference (Haversine, R=6371): 343.86 km
    within01pct(d, 343.86);
  });

  it("short distance (0.1° apart) ≈ R·0.1·π/180", () => {
    // Analytical for a purely latitudinal step: d = R × θ_rad
    const expected = (R * (0.1 * Math.PI)) / 180; // ~11.119 km
    within01pct(haversineKm({ lat: 0, lng: 0 }, { lat: 0.1, lng: 0 }), expected);
  });

  it("symmetry: d(a,b) === d(b,a)", () => {
    const a = { lat: -33.8688, lng: 151.2093 };
    const b = { lat: 51.5074, lng: -0.1278 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
  });
});

// ---------------------------------------------------------------------------
// bearingDeg — 5 cardinal + 1 real-world fixture
// ---------------------------------------------------------------------------

describe("bearingDeg", () => {
  it("due north (lat increases, same lng) → 0°", () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(0, 1);
  });

  it("due east (lng increases, same lat) → 90°", () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(90, 1);
  });

  it("due south (lat decreases, same lng) → 180°", () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: -1, lng: 0 })).toBeCloseTo(180, 1);
  });

  it("due west (lng decreases, same lat) → 270°", () => {
    expect(bearingDeg({ lat: 0, lng: 0 }, { lat: 0, lng: -1 })).toBeCloseTo(270, 1);
  });

  it("Sydney → Melbourne is south-west (bearing ~225°–235°)", () => {
    const bearing = bearingDeg({ lat: -33.8688, lng: 151.2093 }, { lat: -37.8136, lng: 144.9631 });
    expect(bearing).toBeGreaterThan(220);
    expect(bearing).toBeLessThan(240);
  });

  it("bearing is in [0, 360)", () => {
    const cases: Array<[{ lat: number; lng: number }, { lat: number; lng: number }]> = [
      [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
      ],
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
      ],
      [
        { lat: 0, lng: 0 },
        { lat: -1, lng: 0 },
      ],
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: -1 },
      ],
      [
        { lat: -33.8688, lng: 151.2093 },
        { lat: 51.5074, lng: -0.1278 },
      ],
    ];
    for (const [a, b] of cases) {
      const b_ = bearingDeg(a, b);
      expect(b_).toBeGreaterThanOrEqual(0);
      expect(b_).toBeLessThan(360);
    }
  });
});

// ---------------------------------------------------------------------------
// boundingBox
// ---------------------------------------------------------------------------

describe("boundingBox", () => {
  it("100 km radius around Sydney produces a sensible box", () => {
    const sydney = { lat: -33.8688, lng: 151.2093 };
    const box = boundingBox(sydney, 100);

    // ~0.9° per 100 km of latitude
    expect(box.minLat).toBeCloseTo(sydney.lat - 0.8993, 1);
    expect(box.maxLat).toBeCloseTo(sydney.lat + 0.8993, 1);

    // Longitude span is wider because cos(lat) < 1
    expect(box.minLng).toBeLessThan(sydney.lng);
    expect(box.maxLng).toBeGreaterThan(sydney.lng);

    // All corners are within 100 km of the centre (i.e. it is conservative)
    expect(haversineKm(sydney, { lat: box.minLat, lng: sydney.lng })).toBeCloseTo(100, 0);
    expect(haversineKm(sydney, { lat: box.maxLat, lng: sydney.lng })).toBeCloseTo(100, 0);
  });

  it("near-pole point clamps longitude span to ±180°", () => {
    const nearPole = { lat: 89.9, lng: 0 };
    const box = boundingBox(nearPole, 500);
    expect(box.minLng).toBeGreaterThanOrEqual(-180);
    expect(box.maxLng).toBeLessThanOrEqual(180);
  });

  it("latitude is clamped to [-90, 90]", () => {
    const nearPole = { lat: 89, lng: 0 };
    const box = boundingBox(nearPole, 200);
    expect(box.maxLat).toBeLessThanOrEqual(90);
  });

  it("any point inside the radius is within the bounding box", () => {
    const centre = { lat: -33.8688, lng: 151.2093 };
    const radiusKm = 50;
    const box = boundingBox(centre, radiusKm);

    // Points just inside the radius on cardinal axes must be within the box.
    const north = { lat: centre.lat + 0.44, lng: centre.lng }; // ~49 km north
    const east = { lat: centre.lat, lng: centre.lng + 0.53 }; // ~49 km east

    expect(north.lat).toBeGreaterThan(box.minLat);
    expect(north.lat).toBeLessThan(box.maxLat);
    expect(east.lng).toBeGreaterThan(box.minLng);
    expect(east.lng).toBeLessThan(box.maxLng);

    expect(haversineKm(centre, north)).toBeLessThan(radiusKm);
    expect(haversineKm(centre, east)).toBeLessThan(radiusKm);
  });
});
