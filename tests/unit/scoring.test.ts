import { describe, test, expect } from "bun:test";
import { clamp, distanceBetween, haversineKm, scoreBreakdown } from "../../modules/scheduling/server/scoring";

describe("clamp", () => {
  test("clamps below and above", () => {
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(50, 0, 100)).toBe(50);
  });
});

describe("haversineKm", () => {
  test("Pune to Mumbai is roughly 120 km", () => {
    const km = haversineKm(18.5204, 73.8567, 19.076, 72.8777);
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(130);
  });

  test("identical points are 0 km", () => {
    expect(haversineKm(18.5, 73.8, 18.5, 73.8)).toBe(0);
  });
});

describe("distanceBetween", () => {
  test("returns null when either coordinate is missing", () => {
    expect(distanceBetween(null, null, "18.5", "73.8")).toBeNull();
    expect(distanceBetween("18.5", "73.8", null, "73.8")).toBeNull();
  });

  test("returns km otherwise", () => {
    expect(distanceBetween("18.5", "73.8", "19.0", "72.8")).toBeGreaterThan(0);
  });
});

describe("scoreBreakdown", () => {
  test("missing distance scores a neutral 50", () => {
    const s = scoreBreakdown({ distanceKm: null, openWorkOrders: 0, hasConflict: false });
    expect(s.distanceScore).toBe(50);
  });

  test("nearby, unloaded, no conflict scores high", () => {
    const s = scoreBreakdown({ distanceKm: 1, openWorkOrders: 0, hasConflict: false });
    expect(s.distanceScore).toBe(95);
    expect(s.workloadScore).toBe(100);
    expect(s.availabilityScore).toBe(100);
    expect(s.totalScore).toBeCloseTo(0.5 * 95 + 0.3 * 100 + 0.2 * 100, 1);
  });

  test("far distance clamps to 0", () => {
    const s = scoreBreakdown({ distanceKm: 50, openWorkOrders: 0, hasConflict: false });
    expect(s.distanceScore).toBe(0);
  });

  test("heavy workload clamps to 0", () => {
    const s = scoreBreakdown({ distanceKm: 1, openWorkOrders: 20, hasConflict: false });
    expect(s.workloadScore).toBe(0);
  });

  test("conflict zeroes availability", () => {
    const s = scoreBreakdown({ distanceKm: 1, openWorkOrders: 0, hasConflict: true });
    expect(s.availabilityScore).toBe(0);
  });
});
