/**
 * Pure recommendation scoring math, extracted so it can be unit-tested without
 * a database. See modules/scheduling/server/service.ts for the DB wiring.
 */

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

export function distanceBetween(
  aLat: string | null,
  aLng: string | null,
  bLat: string | null,
  bLng: string | null,
): number | null {
  if (!aLat || !aLng || !bLat || !bLng) return null;
  return haversineKm(Number(aLat), Number(aLng), Number(bLat), Number(bLng));
}

export interface ScoreInput {
  distanceKm: number | null;
  openWorkOrders: number;
  hasConflict: boolean;
}

export interface ScoreBreakdown {
  distanceScore: number;
  workloadScore: number;
  availabilityScore: number;
  totalScore: number;
}

export function scoreBreakdown(input: ScoreInput): ScoreBreakdown {
  const distance = input.distanceKm === null ? 50 : clamp(100 - input.distanceKm * 5, 0, 100);
  const workload = clamp(100 - input.openWorkOrders * 10, 0, 100);
  const availability = input.hasConflict ? 0 : 100;
  const total = Math.round((0.5 * distance + 0.3 * workload + 0.2 * availability) * 10) / 10;
  return {
    distanceScore: distance,
    workloadScore: workload,
    availabilityScore: availability,
    totalScore: total,
  };
}
