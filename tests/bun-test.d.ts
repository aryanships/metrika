declare module "bun:test" {
  export interface Matchers {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toContain(expected: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeCloseTo(expected: number, digits?: number): void;
    toBeGreaterThan(n: number): void;
    toBeLessThan(n: number): void;
    toMatch(regex: RegExp): void;
    toThrow(message?: string): void;
    toHaveLength(n: number): void;
  }

  export interface Expect {
    (value: unknown): Matchers & { not: Matchers; rejects: { toThrow(message?: string): Promise<void> } };
  }

  export const expect: Expect;
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
}
