import type { InspectionResult } from "../schema";

/**
 * Pure, decimal-safe tolerance engine. Values are decimal strings (Prisma 8
 * Decimal columns), so all arithmetic is done on scaled integers to avoid
 * floating-point drift (e.g. 0.1 + 0.2).
 */

function decimalPlaces(value: string): number {
  const [, fraction = ""] = value.trim().split(".");
  return fraction.length;
}

export interface MeasurementCalculation {
  observedError: string;
  withinLimit: boolean;
}

export function computeMeasurement(
  standardValue: string,
  observedValue: string,
  permissibleError: string,
): MeasurementCalculation {
  const scale = 10 ** Math.max(decimalPlaces(standardValue), decimalPlaces(observedValue), decimalPlaces(permissibleError));
  const standard = Math.round(Number(standardValue) * scale);
  const observed = Math.round(Number(observedValue) * scale);
  const permitted = Math.round(Number(permissibleError) * scale);
  const error = observed - standard;
  const places = Math.max(decimalPlaces(standardValue), decimalPlaces(observedValue));

  return {
    observedError: (error / scale).toFixed(places),
    withinLimit: Math.abs(error) <= permitted,
  };
}

export function computeResult(measurements: readonly { withinLimit: boolean }[]): InspectionResult {
  return measurements.every((m) => m.withinLimit) ? "PASS" : "FAIL";
}
