"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { ConstraintsRegistry } = require("../../src/ConstraintsRegistry");

const CREATED_AT = "2026-03-29T12:00:00Z";
const UPDATED_AT = "2026-03-29T12:05:00Z";

function buildRule(overrides = {}) {
  return {
    ruleId: "rule_wave1_001",
    label: "Never edit protected canon surfaces without approval",
    instruction: "Do not modify sync-blocking canon files outside approved wave.",
    enforcementClass: "protected_asset",
    severity: "critical",
    rationale: "Front-door truth must remain synchronized for non-technical operators.",
    evidence: [
      "CLAUDE.md marks stale front-door truth as a ship blocker.",
      "Approved wave limits file-touch scope.",
    ],
    appliesTo: [
      "README.md",
      "CLAUDE.md",
      "REPO_INDEX.md",
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

test("ConstraintsRegistry.createRule stores proposed rule by default", () => {
  const registry = new ConstraintsRegistry();
  const rule = registry.createRule(buildRule());

  assert.equal(rule.status, "proposed");
  assert.equal(rule.ruleId, "rule_wave1_001");
});

test("ConstraintsRegistry.createRule has deterministic validation messages", () => {
  const registry = new ConstraintsRegistry();

  expectValidationError(
    () => registry.createRule(buildRule({ enforcementClass: "block_now" })),
    "INVALID_FIELD",
    "'enforcementClass' must be one of: hard_block, protected_asset, requires_confirmation, scope_limit"
  );

  expectValidationError(
    () => registry.createRule(buildRule({ enforcementClass: "block_now" })),
    "INVALID_FIELD",
    "'enforcementClass' must be one of: hard_block, protected_asset, requires_confirmation, scope_limit"
  );
});

test("ConstraintsRegistry status updates preserve instruction, rationale, and evidence", () => {
  const registry = new ConstraintsRegistry();
  registry.createRule(buildRule());

  const updated = registry.setRuleStatus("rule_wave1_001", "active", {
    updatedAt: UPDATED_AT,
    notes: "Activated for current wave.",
  });

  assert.equal(updated.status, "active");
  assert.equal(updated.instruction, "Do not modify sync-blocking canon files outside approved wave.");
  assert.equal(
    updated.rationale,
    "Front-door truth must remain synchronized for non-technical operators."
  );
  assert.deepEqual(updated.evidence, [
    "CLAUDE.md marks stale front-door truth as a ship blocker.",
    "Approved wave limits file-touch scope.",
  ]);
});

test("ConstraintsRegistry precedence: hard_block outranks all other classes", () => {
  const registry = new ConstraintsRegistry();

  registry.createRule(buildRule({ ruleId: "rule_hard", enforcementClass: "hard_block" }));
  registry.createRule(buildRule({ ruleId: "rule_protected", enforcementClass: "protected_asset" }));
  registry.createRule(buildRule({ ruleId: "rule_confirm", enforcementClass: "requires_confirmation" }));
  registry.createRule(buildRule({ ruleId: "rule_scope", enforcementClass: "scope_limit" }));

  registry.setRuleStatus("rule_hard", "active");
  registry.setRuleStatus("rule_protected", "active");
  registry.setRuleStatus("rule_confirm", "active");
  registry.setRuleStatus("rule_scope", "active");

  const decision = registry.resolvePrecedence(
    ["rule_hard", "rule_protected", "rule_confirm", "rule_scope"],
    { protectedTargetInvolved: true }
  );

  assert.equal(decision.effectiveClass, "hard_block");
  assert.deepEqual(decision.effectiveRuleIds, ["rule_hard"]);
});

test("ConstraintsRegistry precedence: protected_asset outranks requires_confirmation and scope_limit when protected target involved", () => {
  const registry = new ConstraintsRegistry();

  registry.createRule(buildRule({ ruleId: "rule_protected", enforcementClass: "protected_asset" }));
  registry.createRule(buildRule({ ruleId: "rule_confirm", enforcementClass: "requires_confirmation" }));
  registry.createRule(buildRule({ ruleId: "rule_scope", enforcementClass: "scope_limit" }));

  registry.setRuleStatus("rule_protected", "active");
  registry.setRuleStatus("rule_confirm", "active");
  registry.setRuleStatus("rule_scope", "active");

  const withProtectedTarget = registry.resolvePrecedence(
    ["rule_protected", "rule_confirm", "rule_scope"],
    { protectedTargetInvolved: true }
  );

  assert.equal(withProtectedTarget.effectiveClass, "protected_asset");
  assert.deepEqual(withProtectedTarget.effectiveRuleIds, ["rule_protected"]);

  const withoutProtectedTarget = registry.resolvePrecedence(
    ["rule_protected", "rule_confirm", "rule_scope"],
    { protectedTargetInvolved: false }
  );

  assert.equal(withoutProtectedTarget.effectiveClass, "requires_confirmation");
  assert.deepEqual(withoutProtectedTarget.effectiveRuleIds, ["rule_confirm"]);
});

test("ConstraintsRegistry precedence: requires_confirmation outranks scope_limit", () => {
  const registry = new ConstraintsRegistry();

  registry.createRule(buildRule({ ruleId: "rule_confirm", enforcementClass: "requires_confirmation" }));
  registry.createRule(buildRule({ ruleId: "rule_scope", enforcementClass: "scope_limit" }));
  registry.setRuleStatus("rule_confirm", "active");
  registry.setRuleStatus("rule_scope", "active");

  const decision = registry.resolvePrecedence(["rule_confirm", "rule_scope"], {
    protectedTargetInvolved: false,
  });

  assert.equal(decision.effectiveClass, "requires_confirmation");
  assert.deepEqual(decision.effectiveRuleIds, ["rule_confirm"]);
});

test("ConstraintsRegistry exceptions narrow only the matching rule", () => {
  const registry = new ConstraintsRegistry();

  registry.createRule(
    buildRule({
      ruleId: "rule_protected",
      enforcementClass: "protected_asset",
      exceptions: ["approved_exception"],
    })
  );
  registry.createRule(buildRule({ ruleId: "rule_confirm", enforcementClass: "requires_confirmation" }));

  registry.setRuleStatus("rule_protected", "active");
  registry.setRuleStatus("rule_confirm", "active");

  const decision = registry.resolvePrecedence(["rule_protected", "rule_confirm"], {
    protectedTargetInvolved: true,
    exceptionContext: ["approved_exception"],
  });

  assert.equal(decision.effectiveClass, "requires_confirmation");
  assert.deepEqual(decision.effectiveRuleIds, ["rule_confirm"]);
  assert.deepEqual(decision.consideredRuleIds, ["rule_confirm"]);
});

test("ConstraintsRegistry resolvePrecedence validates ruleIds input", () => {
  const registry = new ConstraintsRegistry();

  expectValidationError(
    () => registry.resolvePrecedence("rule_1"),
    "INVALID_FIELD",
    "'ruleIds' must be an array of ruleId strings"
  );
});

