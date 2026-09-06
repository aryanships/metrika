import { describe, test, expect } from "bun:test";
import {
  canTransition,
  findTransition,
  assertTransition,
  TERMINAL_STATUSES,
  TRANSITIONS,
} from "../../modules/applications/server/state-machine";

describe("canTransition", () => {
  test("allows legal owner transitions", () => {
    expect(canTransition("DRAFT", "SUBMITTED", "OWNER")).toBe(true);
    expect(canTransition("DOCUMENTS_REQUIRED", "SUBMITTED", "OWNER")).toBe(true);
  });

  test("allows legal admin transitions", () => {
    expect(canTransition("SUBMITTED", "UNDER_REVIEW", "ADMIN")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "APPROVED", "ADMIN")).toBe(true);
  });

  test("allows field transitions", () => {
    expect(canTransition("SCHEDULED", "VERIFICATION_IN_PROGRESS", "FIELD")).toBe(true);
    expect(canTransition("VERIFICATION_IN_PROGRESS", "PASSED", "FIELD")).toBe(true);
  });

  test("rejects wrong-actor and illegal transitions", () => {
    expect(canTransition("DRAFT", "APPROVED", "OWNER")).toBe(false);
    expect(canTransition("SUBMITTED", "APPROVED", "ADMIN")).toBe(false); // must go via UNDER_REVIEW
    expect(canTransition("SCHEDULED", "VERIFICATION_IN_PROGRESS", "ADMIN")).toBe(false);
    expect(canTransition("PASSED", "PASSED", "SYSTEM")).toBe(false);
  });

  test("every transition is unique", () => {
    const seen = new Set(TRANSITIONS.map((t) => `${t.from}->${t.to}:${t.actor}`));
    expect(seen.size).toBe(TRANSITIONS.length);
  });
});

describe("findTransition", () => {
  test("returns the transition definition when present", () => {
    const t = findTransition("UNDER_REVIEW", "REJECTED", "ADMIN");
    expect(t?.reasonRequired).toBe(true);
  });

  test("returns undefined when absent", () => {
    expect(findTransition("DRAFT", "APPROVED", "OWNER")).toBeUndefined();
  });
});

describe("assertTransition", () => {
  test("does not throw for legal transitions", () => {
    expect(() => assertTransition("DRAFT", "SUBMITTED", "OWNER")).not.toThrow();
  });

  test("throws for illegal transitions", () => {
    expect(() => assertTransition("DRAFT", "APPROVED", "OWNER")).toThrow();
  });

  test("throws when a reason is required but missing", () => {
    expect(() => assertTransition("UNDER_REVIEW", "REJECTED", "ADMIN")).toThrow();
    expect(() => assertTransition("UNDER_REVIEW", "REJECTED", "ADMIN", "wrong district")).not.toThrow();
  });
});

describe("TERMINAL_STATUSES", () => {
  test("marks the terminal states", () => {
    expect(TERMINAL_STATUSES).toContain("REJECTED");
    expect(TERMINAL_STATUSES).toContain("CANCELLED");
    expect(TERMINAL_STATUSES).toContain("FAILED");
    expect(TERMINAL_STATUSES).toContain("CERTIFICATE_GENERATED");
    expect(TERMINAL_STATUSES).not.toContain("SUBMITTED");
  });
});
