"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { SessionBrief } = require("../../src/SessionBrief");

const CREATED_AT = "2026-03-29T14:00:00Z";

function buildBrief(overrides = {}) {
  return {
    briefId: "brief_wave1_001",
    goal: "Execute Block C runtime only.",
    inScope: [
      "Implement SessionBrief runtime.",
      "Implement SessionReceipt runtime.",
    ],
    outOfScope: [
      "Block D integration flow.",
      "Packaging/publishing surfaces.",
    ],
    protectedAssets: ["README.md", "CLAUDE.md"],
    activeConstraints: ["No widening beyond Block C."],
    hazards: ["Stale canon claims would break operator trust."],
    riskMode: "strict",
    expectedOutputs: [
      "SessionBrief runtime + tests",
      "SessionReceipt runtime + tests",
    ],
    truthSources: [
      "README.md",
      "docs/specs/SESSION_BRIEF.md",
      "docs/specs/SESSION_RECEIPT.md",
    ],
    createdBy: "architect",
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

test("SessionBrief.createBrief stores a valid pre-session contract surface", () => {
  const briefs = new SessionBrief();
  const brief = briefs.createBrief(buildBrief());

  assert.equal(brief.briefId, "brief_wave1_001");
  assert.equal(brief.riskMode, "strict");
  assert.deepEqual(brief.outOfScope, [
    "Block D integration flow.",
    "Packaging/publishing surfaces.",
  ]);
});

test("SessionBrief deterministic validation for invalid riskMode", () => {
  const briefs = new SessionBrief();

  expectValidationError(
    () => briefs.createBrief(buildBrief({ riskMode: "default" })),
    "INVALID_FIELD",
    "'riskMode' must be one of: strict, guarded, permitted"
  );

  expectValidationError(
    () => briefs.createBrief(buildBrief({ riskMode: "default" })),
    "INVALID_FIELD",
    "'riskMode' must be one of: strict, guarded, permitted"
  );
});

test("SessionBrief rejects reference-only truth sources", () => {
  const briefs = new SessionBrief();

  expectValidationError(
    () => briefs.createBrief(buildBrief({ truthSources: ["raw/governed-workflow/WHY_THIS_KIT.md"] })),
    "INVALID_TRUTH_SOURCE",
    "'truthSources' must reference canon surfaces and must not point to raw/ reference-only material"
  );
});

test("SessionBrief requires explicit outOfScope list", () => {
  const briefs = new SessionBrief();

  expectValidationError(
    () => briefs.createBrief(buildBrief({ outOfScope: [] })),
    "INVALID_FIELD",
    "'outOfScope' must include at least one item"
  );
});

test("SessionBrief.evaluateSessionStartReadiness returns ready for explicit brief", () => {
  const briefs = new SessionBrief();
  briefs.createBrief(
    buildBrief({
      approvalsNeeded: ["Architect signoff before touching sync-blocking docs."],
    })
  );

  const readiness = briefs.evaluateSessionStartReadiness("brief_wave1_001");
  assert.equal(readiness.ready, true);
  assert.equal(readiness.riskMode, "strict");
  assert.equal(readiness.hasApprovalsNeeded, true);
  assert.equal(
    readiness.summary,
    "Session brief is explicit and ready for governed start."
  );
});
