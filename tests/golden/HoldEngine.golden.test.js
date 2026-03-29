"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { HoldEngine } = require("../../src/HoldEngine");

const CREATED_AT = "2026-03-29T12:00:00Z";
const UPDATED_AT = "2026-03-29T12:05:00Z";
const RESOLVED_AT = "2026-03-29T12:10:00Z";

function buildHold(overrides = {}) {
  return {
    holdId: "hold_wave1_001",
    summary: "Need explicit approval before touching protected files",
    blocking: true,
    reason: "Requested change targets a protected canon surface",
    evidence: [
      "README.md is a sync-blocking front-door surface.",
      "Approved scope does not include that file.",
    ],
    impact: "Unauthorized drift if we proceed without explicit approval.",
    options: [
      "Narrow change to approved files.",
      "Request scope expansion from Architect.",
    ],
    resolutionPath: "Architect approval or scope reduction",
    createdBy: "ai",
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function expectValidationError(run, code, message) {
  let error;
  try {
    run();
  } catch (caught) {
    error = caught;
  }

  if (!error) {
    assert.fail("Expected validation error, but no error was thrown");
  }

  assert.equal(error.name, "ValidationError");
  assert.equal(error.code, code);
  assert.equal(error.message, `${code}: ${message}`);
}

test("HoldEngine.createHold stores a valid proposed hold", () => {
  const engine = new HoldEngine();
  const hold = engine.createHold(buildHold());

  assert.equal(hold.status, "proposed");
  assert.equal(hold.holdId, "hold_wave1_001");
  assert.deepEqual(hold.evidence, [
    "README.md is a sync-blocking front-door surface.",
    "Approved scope does not include that file.",
  ]);
});

test("HoldEngine.createHold rejects missing required fields with deterministic text", () => {
  const engine = new HoldEngine();

  expectValidationError(
    () => engine.createHold(buildHold({ summary: "" })),
    "INVALID_FIELD",
    "'summary' must be a non-empty string"
  );

  expectValidationError(
    () => engine.createHold(buildHold({ summary: "" })),
    "INVALID_FIELD",
    "'summary' must be a non-empty string"
  );
});

test("HoldEngine lifecycle: proposed -> active -> resolved", () => {
  const engine = new HoldEngine();
  engine.createHold(buildHold());

  const active = engine.transitionHold("hold_wave1_001", "active", {
    updatedAt: UPDATED_AT,
  });
  assert.equal(active.status, "active");
  assert.equal(active.updatedAt, UPDATED_AT);

  const resolved = engine.transitionHold("hold_wave1_001", "resolved", {
    resolutionKind: "new_evidence",
    resolvedAt: RESOLVED_AT,
    resolutionNotes: "Architect confirmed approved file boundary.",
    resolvedBy: "architect",
    updatedAt: RESOLVED_AT,
  });

  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.resolvedAt, RESOLVED_AT);
  assert.equal(
    resolved.resolutionNotes,
    "Architect confirmed approved file boundary."
  );
  assert.equal(resolved.resolvedBy, "architect");
});

test("HoldEngine blocks invalid transitions", () => {
  const engine = new HoldEngine();
  engine.createHold(buildHold());

  expectValidationError(
    () =>
      engine.transitionHold("hold_wave1_001", "resolved", {
        resolutionKind: "new_evidence",
        resolvedAt: RESOLVED_AT,
        resolutionNotes: "Tried to skip active state.",
      }),
    "INVALID_LIFECYCLE",
    "cannot transition hold 'hold_wave1_001' from 'proposed' to 'resolved'"
  );
});

test("HoldEngine enforces explicit operator acceptance for accepted status", () => {
  const engine = new HoldEngine();
  engine.createHold(buildHold());
  engine.transitionHold("hold_wave1_001", "active", { updatedAt: UPDATED_AT });

  expectValidationError(
    () =>
      engine.transitionHold("hold_wave1_001", "accepted", {
        resolvedAt: RESOLVED_AT,
        resolutionNotes: "Risk accepted without explicit signal.",
      }),
    "INVALID_LIFECYCLE",
    "transition to 'accepted' requires explicit operator acceptance"
  );

  const accepted = engine.transitionHold("hold_wave1_001", "accepted", {
    operatorAccepted: true,
    resolvedAt: RESOLVED_AT,
    resolutionNotes: "Architect explicitly accepted remaining uncertainty.",
    resolvedBy: "architect",
  });

  assert.equal(accepted.status, "accepted");
});

test("HoldEngine terminal statuses require terminal metadata", () => {
  const engine = new HoldEngine();
  engine.createHold(buildHold());
  engine.transitionHold("hold_wave1_001", "active", { updatedAt: UPDATED_AT });

  expectValidationError(
    () =>
      engine.transitionHold("hold_wave1_001", "dismissed", {
        resolutionNotes: "No longer applicable.",
      }),
    "INVALID_LIFECYCLE",
    "terminal status 'dismissed' requires 'resolvedAt' as ISO 8601"
  );

  expectValidationError(
    () =>
      engine.transitionHold("hold_wave1_001", "dismissed", {
        resolvedAt: RESOLVED_AT,
      }),
    "INVALID_LIFECYCLE",
    "terminal status 'dismissed' requires non-empty 'resolutionNotes'"
  );
});

test("HoldEngine preserves original reason and evidence across transitions", () => {
  const engine = new HoldEngine();
  engine.createHold(buildHold());

  engine.transitionHold("hold_wave1_001", "active", { updatedAt: UPDATED_AT });
  const accepted = engine.transitionHold("hold_wave1_001", "accepted", {
    operatorAccepted: true,
    resolvedAt: RESOLVED_AT,
    resolutionNotes: "Architect accepted risk for current wave.",
    resolvedBy: "architect",
  });

  assert.equal(
    accepted.reason,
    "Requested change targets a protected canon surface"
  );
  assert.deepEqual(accepted.evidence, [
    "README.md is a sync-blocking front-door surface.",
    "Approved scope does not include that file.",
  ]);
});

