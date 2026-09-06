import { describe, test, expect } from "bun:test";
import { computeMeasurement, computeResult } from "../../modules/inspections/server/rules-engine";

describe("computeMeasurement", () => {
  test("zero error is within limit", () => {
    const result = computeMeasurement("0.000", "0.000", "0.010");
    expect(result.observedError).toBe("0.000");
    expect(result.withinLimit).toBe(true);
  });

  test("positive error within tolerance", () => {
    const result = computeMeasurement("10.0", "10.05", "0.1");
    expect(result.observedError).toBe("0.05");
    expect(result.withinLimit).toBe(true);
  });

  test("error beyond tolerance fails", () => {
    const result = computeMeasurement("10.0", "10.2", "0.1");
    expect(result.withinLimit).toBe(false);
  });

  test("decimal-safe arithmetic (no float drift)", () => {
    // 0.3 - 0.1 must be exactly 0.2, not 0.19999999999999998
    const result = computeMeasurement("0.1", "0.3", "0.01");
    expect(result.observedError).toBe("0.2");
    expect(result.withinLimit).toBe(false);
  });

  test("negative error is allowed within tolerance", () => {
    const result = computeMeasurement("10.0", "9.95", "0.1");
    expect(result.observedError).toBe("-0.05");
    expect(result.withinLimit).toBe(true);
  });
});

describe("computeResult", () => {
  test("all within limit passes", () => {
    expect(computeResult([{ withinLimit: true }, { withinLimit: true }])).toBe("PASS");
  });

  test("any out of limit fails", () => {
    expect(computeResult([{ withinLimit: true }, { withinLimit: false }])).toBe("FAIL");
  });

  test("empty measurements passes (vacuous truth)", () => {
    expect(computeResult([])).toBe("PASS");
  });
});
