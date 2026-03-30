"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { ForemansWalk, FINDING_TYPES } = require("../../src/ForemansWalk");
const { ControlRodMode } = require("../../src/ControlRodMode");

function buildBrief(overrides = {}) {
  const controlRodMode = new ControlRodMode();
  return {
    briefId: "brief_wave3_c1_001",
    inScope: ["Task A", "Task B"],
    outOfScope: ["Forbidden task"],
    controlRodProfile: controlRodMode.resolveProfile("conservative"),
    ...overrides,
  };
}

function buildReceipt(overrides = {}) {
  return {
    receiptId: "receipt_wave3_c1_001",
    completedWork: ["Task A", "Task B"],
    holdsRaised: [],
    ...overrides,
  };
}

function findByType(findings, findingType) {
  return findings.find((finding) => finding.findingType === findingType);
}

function buildForensicEntry(overrides = {}) {
  return {
    entryId: "claim_001",
    entryType: "CLAIM",
    linkedEntryRefs: [],
    payload: { domainId: "documentation_comments" },
    ...overrides,
  };
}

test("ForemansWalk clean session yields zero findings and all-matched as-built", () => {
  const walk = new ForemansWalk();

  const result = walk.evaluate({
    sessionBrief: buildBrief(),
    sessionReceipt: buildReceipt(),
    performedActions: [
      { actionId: "a1", workItem: "Task A", domainId: "documentation_comments" },
      { actionId: "a2", workItem: "Task B", domainId: "documentation_comments" },
    ],
    forensicEntries: [
      buildForensicEntry({
        entryId: "evidence_001",
        entryType: "EVIDENCE",
        linkedEntryRefs: [],
      }),
      buildForensicEntry({
        entryId: "claim_001",
        entryType: "CLAIM",
        linkedEntryRefs: ["evidence_001"],
      }),
    ],
  });

  assert.equal(result.findings.length, 0);
  assert.deepEqual(result.asBuilt.statusCounts, {
    MATCHED: 2,
    MODIFIED: 0,
    ADDED: 0,
    DEFERRED: 0,
    HELD: 0,
  });
});

test("ForemansWalk routes out-of-scope action to DRIFT", () => {
  const walk = new ForemansWalk();

  const result = walk.evaluate({
    sessionBrief: buildBrief(),
    sessionReceipt: buildReceipt({ completedWork: ["Task A", "Task B", "Forbidden task"] }),
    performedActions: [
      { actionId: "a1", workItem: "Task A", domainId: "documentation_comments" },
      { actionId: "a2", workItem: "Task B", domainId: "documentation_comments" },
      { actionId: "a3", workItem: "Forbidden task", domainId: "documentation_comments" },
    ],
  });

  const drift = findByType(result.findings, "DRIFT");
  assert.ok(drift);
  assert.equal(drift.severity, "MEDIUM");
});

test("ForemansWalk routes unauthorized HARD_STOP action to VIOLATION", () => {
  const walk = new ForemansWalk();

  const result = walk.evaluate({
    sessionBrief: buildBrief({
      inScope: ["Adjust pricing"],
      outOfScope: [],
    }),
    sessionReceipt: buildReceipt({
      completedWork: ["Adjust pricing"],
    }),
    performedActions: [
      {
        actionId: "pricing_1",
        workItem: "Adjust pricing",
        domainId: "pricing_quote_logic",
        operationType: "change_rules",
        hardStopAuthorized: false,
      },
    ],
  });

  const violation = findByType(result.findings, "VIOLATION");
  assert.ok(violation);
  assert.equal(violation.severity, "CRITICAL");
});

test("ForemansWalk routes claim without evidence to PHANTOM", () => {
  const walk = new ForemansWalk();
  const result = walk.evaluate({
    sessionBrief: buildBrief(),
    sessionReceipt: buildReceipt(),
    forensicEntries: [
      buildForensicEntry({
        entryId: "claim_no_evidence",
        entryType: "CLAIM",
        linkedEntryRefs: [],
      }),
    ],
  });

  const phantom = findByType(result.findings, "PHANTOM");
  assert.ok(phantom);
  assert.equal(phantom.severity, "HIGH");
});

test("ForemansWalk routes evidence without claim to GHOST", () => {
  const walk = new ForemansWalk();
  const result = walk.evaluate({
    sessionBrief: buildBrief(),
    sessionReceipt: buildReceipt(),
    forensicEntries: [
      buildForensicEntry({
        entryId: "evidence_unclaimed",
        entryType: "EVIDENCE",
        linkedEntryRefs: [],
      }),
    ],
  });

  const ghost = findByType(result.findings, "GHOST");
  assert.ok(ghost);
  assert.equal(ghost.severity, "HIGH");
});

test("ForemansWalk routes missing scoped work to INCOMPLETE without requiring omission enrichment", () => {
  const walk = new ForemansWalk();

  const result = walk.evaluate({
    sessionBrief: buildBrief({ inScope: ["Task A", "Task B"], outOfScope: [] }),
    sessionReceipt: buildReceipt({ completedWork: ["Task A"] }),
  });

  const incomplete = findByType(result.findings, "INCOMPLETE");
  assert.ok(incomplete);
  assert.equal(incomplete.severity, "MEDIUM");
  assert.equal(incomplete.pass, "Completeness");
});

test("ForemansWalk routes missing forensic linkage target to EVIDENCE_GAP", () => {
  const walk = new ForemansWalk();
  const result = walk.evaluate({
    sessionBrief: buildBrief(),
    sessionReceipt: buildReceipt(),
    forensicEntries: [
      buildForensicEntry({
        entryId: "evidence_001",
        entryType: "EVIDENCE",
        linkedEntryRefs: [],
      }),
      buildForensicEntry({
        entryId: "claim_with_broken_ref",
        entryType: "CLAIM",
        linkedEntryRefs: ["evidence_001", "missing_evidence_404"],
      }),
    ],
  });

  const evidenceGap = findByType(result.findings, "EVIDENCE_GAP");
  assert.ok(evidenceGap);
  assert.equal(evidenceGap.severity, "MEDIUM");
});

test("ForemansWalk routes partial claim support to PARTIAL_VERIFICATION", () => {
  const walk = new ForemansWalk();
  const result = walk.evaluate({
    sessionBrief: buildBrief(),
    sessionReceipt: buildReceipt(),
    forensicEntries: [
      buildForensicEntry({
        entryId: "evidence_001",
        entryType: "EVIDENCE",
        linkedEntryRefs: [],
      }),
      buildForensicEntry({
        entryId: "gap_001",
        entryType: "GAP",
        linkedEntryRefs: [],
      }),
      buildForensicEntry({
        entryId: "claim_partial_001",
        entryType: "CLAIM",
        linkedEntryRefs: ["evidence_001", "gap_001"],
      }),
    ],
  });

  const partial = findByType(result.findings, "PARTIAL_VERIFICATION");
  assert.ok(partial);
  assert.equal(partial.severity, "LOW");
});

test("ForemansWalk escalates severity by one level in SUPERVISED domain", () => {
  const controlRodMode = new ControlRodMode();
  const walk = new ForemansWalk();

  const result = walk.evaluate({
    sessionBrief: buildBrief({
      outOfScope: ["Forbidden pricing tweak"],
      controlRodProfile: controlRodMode.resolveProfile("balanced"),
    }),
    sessionReceipt: buildReceipt({ completedWork: ["Task A", "Task B", "Forbidden pricing tweak"] }),
    performedActions: [
      {
        actionId: "a_supervised_1",
        workItem: "Forbidden pricing tweak",
        domainId: "pricing_quote_logic",
        operationType: "change_rules",
      },
    ],
  });

  const drift = findByType(result.findings, "DRIFT");
  assert.ok(drift);
  assert.equal(drift.severity, "HIGH");
});

test("ForemansWalk precedence keeps one primary finding for one issue", () => {
  const walk = new ForemansWalk();

  const result = walk.evaluate({
    sessionBrief: buildBrief({
      inScope: ["Task A"],
      outOfScope: ["Forbidden pricing change"],
    }),
    sessionReceipt: buildReceipt({
      completedWork: ["Task A", "Forbidden pricing change"],
    }),
    performedActions: [
      {
        actionId: "a_overlap_1",
        workItem: "Forbidden pricing change",
        domainId: "pricing_quote_logic",
        operationType: "change_rules",
        hardStopAuthorized: false,
      },
    ],
  });

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].findingType, "VIOLATION");
  assert.equal(result.findings[0].issueRef, "action:a_overlap_1");
});

test("ForemansWalk As-Built status counts are deterministic", () => {
  const walk = new ForemansWalk();

  const result = walk.evaluate({
    sessionBrief: buildBrief({
      inScope: ["Task Match", "Task Modify", "Task Defer", "Task Hold"],
      outOfScope: [],
    }),
    sessionReceipt: buildReceipt({
      completedWork: ["Task Match", "MODIFIED::change::Task Modify", "Extra Added"],
      holdsRaised: ["Task Hold"],
    }),
  });

  assert.deepEqual(result.asBuilt.statusCounts, {
    MATCHED: 1,
    MODIFIED: 1,
    ADDED: 1,
    DEFERRED: 1,
    HELD: 1,
  });
});

test("ForemansWalk uses one locked finding schema and excludes CLEAN type", () => {
  assert.deepEqual([...FINDING_TYPES].sort(), [
    "DRIFT",
    "EVIDENCE_GAP",
    "GHOST",
    "INCOMPLETE",
    "PARTIAL_VERIFICATION",
    "PHANTOM",
    "VIOLATION",
  ]);
  assert.equal(FINDING_TYPES.includes("CLEAN"), false);
});
