"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CompressedSafetyPostureSkills,
  SKILL_ROUTES,
} = require("../../src/CompressedSafetyPostureSkills");

const T0 = "2026-03-31T10:00:00Z";
const T1 = "2026-03-31T10:05:00Z";

function buildConstraintsRules(overrides = {}) {
  return {
    rules: [
      {
        ruleId: "rule_001",
        label: "Never bypass protected canon surfaces",
        instruction: "Do not modify protected canon surfaces outside approved scope.",
        status: "active",
        enforcementClass: "hard_block",
        severity: "critical",
        rationale: "Protected canon truth must remain stable.",
        evidence: ["charter:surface_sync"],
        appliesTo: ["README.md"],
        createdBy: "architect",
        createdAt: T0,
      },
      {
        ruleId: "rule_002",
        label: "Explicit confirmation for risky scope",
        instruction: "Require explicit confirmation for risky scope changes.",
        status: "active",
        enforcementClass: "requires_confirmation",
        severity: "high",
        rationale: "Operator confirmation is required for this class.",
        evidence: ["doctrine:confirm"],
        appliesTo: ["src/**"],
        createdBy: "ai",
        createdAt: T0,
        updatedAt: T1,
      },
      {
        ruleId: "rule_003",
        label: "Protected paths remain restricted",
        instruction: "Treat protected paths as restricted unless approved.",
        status: "disabled",
        enforcementClass: "protected_asset",
        severity: "high",
        rationale: "Protected-path intent remains visible when disabled.",
        evidence: ["policy:protected"],
        appliesTo: ["docs/**"],
        exceptions: ["approved_exception"],
        createdBy: "architect",
        createdAt: T0,
      },
      {
        ruleId: "rule_004",
        label: "Archive old scope guardrail",
        instruction: "Legacy scope guardrail is archived.",
        status: "archived",
        enforcementClass: "scope_limit",
        severity: "standard",
        rationale: "History only.",
        evidence: ["archive:001"],
        appliesTo: ["legacy/**"],
        createdBy: "ai",
        createdAt: T0,
      },
    ],
    ...overrides,
  }.rules;
}

function buildSafetyInterlocks(overrides = {}) {
  return {
    interlocks: [
      {
        interlockId: "interlock_001",
        actionCategory: "destructive_change",
        defaultOutcome: "stop",
        requiresExplicitAuthorization: false,
        protectedTargets: ["src/**"],
        operatorPrompt: "Destructive change is blocked.",
        rationale: "Destructive actions require stop posture.",
        evidence: ["safety:destructive"],
        createdBy: "architect",
        createdAt: T0,
      },
      {
        interlockId: "interlock_002",
        actionCategory: "protected_surface_change",
        defaultOutcome: "require_authorization",
        requiresExplicitAuthorization: true,
        protectedTargets: ["README.md", "CLAUDE.md"],
        operatorPrompt: "Protected surface requires authorization.",
        rationale: "Protected surfaces require explicit authorization.",
        evidence: ["safety:protected"],
        createdBy: "ai",
        createdAt: T0,
      },
      {
        interlockId: "interlock_003",
        actionCategory: "external_side_effect",
        defaultOutcome: "allow_with_receipt",
        requiresExplicitAuthorization: false,
        operatorPrompt: "External side effect may proceed with receipt.",
        rationale: "Receipt capture is required.",
        evidence: ["safety:receipt"],
        createdBy: "architect",
        createdAt: T0,
      },
    ],
    ...overrides,
  }.interlocks;
}

function buildControlRodProfile(overrides = {}) {
  return {
    profileId: "balanced",
    profileLabel: "Balanced",
    domainRules: [
      {
        domainId: "database_schema",
        label: "Database schema",
        filePatterns: ["migrations/**"],
        operationTypes: ["ddl_change"],
        autonomyLevel: "HARD_STOP",
        justification: "Schema changes require hard stop.",
      },
      {
        domainId: "existing_file_modification",
        label: "Existing file modification",
        filePatterns: ["**/*"],
        operationTypes: ["modify_existing_file"],
        autonomyLevel: "SUPERVISED",
        justification: "Existing file updates require supervision.",
      },
      {
        domainId: "documentation_comments",
        label: "Documentation and comments",
        filePatterns: ["docs/**"],
        operationTypes: ["documentation_change"],
        autonomyLevel: "FULL_AUTO",
        justification: "Documentation path is full auto.",
      },
    ],
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

test("CompressedSafetyPostureSkills exposes the locked route set", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/constraints", "/silence-map"]);
});

test("/constraints renders deterministic posture visibility and does not mutate input", () => {
  const skills = new CompressedSafetyPostureSkills();
  const rules = buildConstraintsRules();

  const viewA = skills.renderConstraints(rules);
  assert.equal(viewA.route, "/constraints");
  assert.equal(viewA.ruleCount, 4);
  assert.equal(viewA.maintainedCount, 3);
  assert.deepEqual(viewA.statusSummary, {
    proposed: 0,
    active: 2,
    disabled: 1,
    archived: 1,
  });
  assert.deepEqual(viewA.enforcementSummary, {
    hard_block: 1,
    protected_asset: 1,
    requires_confirmation: 1,
    scope_limit: 1,
  });

  viewA.rules[0].appliesTo.push("forbidden_mutation");
  const viewB = skills.renderConstraints(rules);
  assert.equal(viewB.rules[0].appliesTo.includes("forbidden_mutation"), false);
  assert.equal(rules[0].appliesTo.includes("forbidden_mutation"), false);
});

test("/silence-map renders blocked, restricted, and guarded posture as read-only composite view", () => {
  const skills = new CompressedSafetyPostureSkills();

  const view = skills.renderSilenceMap({
    constraintsRules: buildConstraintsRules(),
    safetyInterlocks: buildSafetyInterlocks(),
    controlRodProfile: buildControlRodProfile(),
  });

  assert.equal(view.route, "/silence-map");
  assert.equal(view.profile.profileId, "balanced");

  assert.deepEqual(view.summary.constraint, {
    activeCount: 2,
    blockedCount: 1,
    restrictedCount: 0,
    guardedCount: 1,
  });

  assert.deepEqual(view.summary.safetyInterlock, {
    totalCount: 3,
    blockedCount: 1,
    guardedCount: 1,
  });

  assert.deepEqual(view.summary.controlRod, {
    hardStopCount: 1,
    supervisedCount: 1,
    fullAutoCount: 1,
  });

  assert.equal(view.blocked.constraints[0].ruleId, "rule_001");
  assert.equal(view.blocked.safetyInterlocks[0].interlockId, "interlock_001");
  assert.equal(view.blocked.controlRodDomains[0].domainId, "database_schema");
  assert.equal(view.guarded.constraints[0].ruleId, "rule_002");
  assert.equal(view.guarded.controlRodDomains[0].domainId, "existing_file_modification");
});

test("CompressedSafetyPostureSkills validates control rod autonomy vocabulary", () => {
  const skills = new CompressedSafetyPostureSkills();

  expectValidationError(
    () =>
      skills.renderSilenceMap({
        constraintsRules: buildConstraintsRules(),
        safetyInterlocks: buildSafetyInterlocks(),
        controlRodProfile: buildControlRodProfile({
          domainRules: [
            {
              domainId: "bad_domain",
              label: "Bad domain",
              filePatterns: ["**/*"],
              operationTypes: ["change"],
              autonomyLevel: "AUTO",
              justification: "Invalid autonomy level for negative test.",
            },
          ],
        }),
      }),
    "INVALID_FIELD",
    "'controlRodProfile.domainRules[0].autonomyLevel' must be one of: FULL_AUTO, SUPERVISED, HARD_STOP"
  );
});

test("CompressedSafetyPostureSkills exposes no persistence or gamification surfaces", () => {
  const skills = new CompressedSafetyPostureSkills();

  const views = [
    skills.renderConstraints(buildConstraintsRules()),
    skills.renderSilenceMap({
      constraintsRules: buildConstraintsRules(),
      safetyInterlocks: buildSafetyInterlocks(),
      controlRodProfile: buildControlRodProfile(),
    }),
  ];

  const forbiddenFields = [
    "score",
    "points",
    "badge",
    "badges",
    "rank",
    "leaderboard",
    "usageAnalytics",
    "engagementState",
  ];

  for (const view of views) {
    for (const field of forbiddenFields) {
      assert.equal(Object.prototype.hasOwnProperty.call(view, field), false);
    }
  }

  const methodNames = Object.getOwnPropertyNames(CompressedSafetyPostureSkills.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderConstraints", "renderSilenceMap"]);
});
