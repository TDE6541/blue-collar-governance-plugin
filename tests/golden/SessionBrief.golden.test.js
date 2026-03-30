"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { SessionBrief } = require("../../src/SessionBrief");
const { ControlRodMode, STARTER_DOMAIN_IDS } = require("../../src/ControlRodMode");

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

function buildExplicitControlRodProfile() {
  const mode = new ControlRodMode();
  const profile = mode.resolveProfile("balanced");
  profile.profileId = "custom_balanced_snapshot";
  profile.profileLabel = "Custom Balanced Snapshot";
  return profile;
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

test("SessionBrief.createBrief stores valid pre-session contract surface without controlRodProfile", () => {
  const briefs = new SessionBrief();
  const brief = briefs.createBrief(buildBrief());

  assert.equal(brief.briefId, "brief_wave1_001");
  assert.equal(brief.riskMode, "strict");
  assert.equal(brief.controlRodProfile, undefined);
  assert.deepEqual(brief.outOfScope, [
    "Block D integration flow.",
    "Packaging/publishing surfaces.",
  ]);
});

test("SessionBrief stores normalized controlRodProfile snapshot when preset id is provided", () => {
  const briefs = new SessionBrief();
  const brief = briefs.createBrief(buildBrief({ controlRodProfile: "conservative" }));

  assert.ok(brief.controlRodProfile);
  assert.equal(brief.controlRodProfile.profileId, "conservative");
  assert.equal(typeof brief.controlRodProfile.profileLabel, "string");
  assert.deepEqual(
    brief.controlRodProfile.domainRules.map((rule) => rule.domainId),
    [...STARTER_DOMAIN_IDS]
  );
});

test("SessionBrief stores normalized controlRodProfile snapshot when explicit profile object is provided", () => {
  const briefs = new SessionBrief();
  const explicitProfile = buildExplicitControlRodProfile();
  const brief = briefs.createBrief(
    buildBrief({
      briefId: "brief_wave1_002",
      controlRodProfile: explicitProfile,
    })
  );

  assert.ok(brief.controlRodProfile);
  assert.equal(brief.controlRodProfile.profileId, "custom_balanced_snapshot");
  assert.equal(brief.controlRodProfile.profileLabel, "Custom Balanced Snapshot");
  assert.notEqual(brief.controlRodProfile, explicitProfile);

  const readA = briefs.getBrief("brief_wave1_002");
  readA.controlRodProfile.domainRules[0].autonomyLevel = "FULL_AUTO";
  const readB = briefs.getBrief("brief_wave1_002");
  assert.notEqual(readB.controlRodProfile.domainRules[0].autonomyLevel, "FULL_AUTO");
});

test("SessionBrief deterministic validation for invalid controlRodProfile preset id", () => {
  const briefs = new SessionBrief();

  expectValidationError(
    () => briefs.createBrief(buildBrief({ controlRodProfile: "aggressive" })),
    "INVALID_FIELD",
    "'controlRodProfile' preset id must be one of: conservative, balanced, velocity"
  );

  expectValidationError(
    () => briefs.createBrief(buildBrief({ controlRodProfile: "aggressive" })),
    "INVALID_FIELD",
    "'controlRodProfile' preset id must be one of: conservative, balanced, velocity"
  );
});

test("SessionBrief rejects malformed explicit controlRodProfile object deterministically", () => {
  const briefs = new SessionBrief();

  expectValidationError(
    () =>
      briefs.createBrief(
        buildBrief({
          controlRodProfile: {
            profileId: "custom_profile",
            profileLabel: "Custom Profile",
          },
        })
      ),
    "INVALID_FIELD",
    "'domainRules' must be a non-empty array"
  );
});

test("SessionBrief rejects invalid autonomy level in explicit controlRodProfile", () => {
  const briefs = new SessionBrief();
  const explicitProfile = buildExplicitControlRodProfile();
  explicitProfile.domainRules[0] = {
    ...explicitProfile.domainRules[0],
    autonomyLevel: "AUTO",
  };

  expectValidationError(
    () => briefs.createBrief(buildBrief({ controlRodProfile: explicitProfile })),
    "INVALID_FIELD",
    "'autonomyLevel' must be one of: FULL_AUTO, SUPERVISED, HARD_STOP"
  );
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

test("SessionBrief keeps HARD_STOP authorization in session scope and introduces no second authorization field", () => {
  const briefs = new SessionBrief();
  const brief = briefs.createBrief(
    buildBrief({
      briefId: "brief_wave1_003",
      inScope: [
        "Implement SessionBrief runtime.",
        "Include HARD_STOP domains explicitly in this session scope.",
      ],
      controlRodProfile: "balanced",
    })
  );

  assert.equal(Object.prototype.hasOwnProperty.call(brief, "hardStopAuthorization"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(brief, "authorization"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(brief, "authorizationPolicy"), false);
  assert.equal(
    brief.inScope.includes("Include HARD_STOP domains explicitly in this session scope."),
    true
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
