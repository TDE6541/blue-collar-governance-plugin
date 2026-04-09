"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { RestorationEngine } = require("../../src/RestorationEngine");
const {
  PROJECTION_REASONS,
  getProjectionEligibility,
  projectResolvedOutcomes,
} = require("../../src/RestorationProjectionAdapter");

function buildRecord(overrides = {}) {
  const engine = new RestorationEngine();
  return engine.createRecord({
    finding: {
      sourceType: "standing_risk",
      entryId: "continuity_hold_001",
    },
    outcome: "resolve",
    summary: "Operator restored the standing hold.",
    sessionId: "wave7_s01",
    recordedAt: "2026-04-09T12:20:00Z",
    recordedBy: "operator.tim",
    continuityEntryId: "continuity_hold_001",
    sourceRefs: ["receipt:wave7_s01", "chain:continuity_hold_001"],
    evidenceRefs: ["evidence:repair_photo_001"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["evidence:verify_001"],
    ...overrides,
  });
}

test("RestorationProjectionAdapter keeps its projection reasons locked", () => {
  assert.deepEqual([...PROJECTION_REASONS], [
    "READY_FOR_BOARD",
    "NO_CONTINUITY_LINK",
    "NOT_VERIFIED",
  ]);
});

test("RestorationProjectionAdapter maps verified continuity-linked records into board resolved outcomes", () => {
  const record = buildRecord({
    evidenceRefs: ["evidence:repair_photo_001", "evidence:shared_001"],
    verificationEvidenceRefs: ["evidence:shared_001", "evidence:verify_001"],
  });

  const eligibility = getProjectionEligibility(record);
  const outcomes = projectResolvedOutcomes([record]);

  assert.deepEqual(eligibility, {
    eligible: true,
    reason: "READY_FOR_BOARD",
  });
  assert.deepEqual(outcomes, [
    {
      entryId: "continuity_hold_001",
      summary: "Operator restored the standing hold.",
      outcome: "resolve",
      sourceRefs: ["receipt:wave7_s01", "chain:continuity_hold_001"],
      evidenceRefs: [
        "evidence:repair_photo_001",
        "evidence:shared_001",
        "evidence:verify_001",
      ],
    },
  ]);
});

test("RestorationProjectionAdapter excludes walk-only and manual-only records from board projection", () => {
  const engine = new RestorationEngine();
  const walkRecord = engine.createRecord({
    finding: {
      sourceType: "foremans_walk",
      sessionOfRecordRef: "wave7_walk_001",
      issueRef: "issue_walk_001",
    },
    outcome: "resolve",
    summary: "Walk issue was corrected in the field.",
    sessionId: "wave7_s01",
    recordedAt: "2026-04-09T12:21:00Z",
    recordedBy: "operator.tim",
    sourceRefs: ["walk:wave7_walk_001"],
    evidenceRefs: ["evidence:walk_photo_001"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["evidence:verify_walk_001"],
  });
  const manualRecord = engine.createRecord({
    finding: {
      sourceType: "manual",
      manualFindingKey: "manual_find_002",
      findingType: "operator_gap",
      sourceArtifact: "notes/manual.md",
      sourceLocation: "line 7",
    },
    outcome: "resolve",
    summary: "Manual issue was restored from explicit coordinates.",
    sessionId: "wave7_s01",
    recordedAt: "2026-04-09T12:22:00Z",
    recordedBy: "operator.tim",
    sourceRefs: ["notes:manual"],
    evidenceRefs: ["evidence:manual_photo_001"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["evidence:verify_manual_001"],
  });

  assert.deepEqual(getProjectionEligibility(walkRecord), {
    eligible: false,
    reason: "NO_CONTINUITY_LINK",
  });
  assert.deepEqual(getProjectionEligibility(manualRecord), {
    eligible: false,
    reason: "NO_CONTINUITY_LINK",
  });
  assert.deepEqual(projectResolvedOutcomes([walkRecord, manualRecord]), []);
});

test("RestorationProjectionAdapter excludes unverified continuity-linked records from board projection", () => {
  const record = buildRecord({
    recordedAt: "2026-04-09T12:23:00Z",
    verificationState: "UNVERIFIED",
    verificationEvidenceRefs: [],
  });

  assert.deepEqual(getProjectionEligibility(record), {
    eligible: false,
    reason: "NOT_VERIFIED",
  });
  assert.deepEqual(projectResolvedOutcomes([record]), []);
});

test("RestorationProjectionAdapter keeps only the latest verified record for each continuity entry", () => {
  const earlier = buildRecord({
    summary: "Earlier verified resolution note.",
    recordedAt: "2026-04-09T12:24:00Z",
    verificationEvidenceRefs: ["evidence:verify_earlier_001"],
  });
  const later = buildRecord({
    summary: "Later verified resolution note.",
    outcome: "explicitly_accept",
    recordedAt: "2026-04-09T12:25:00Z",
    verificationEvidenceRefs: ["evidence:verify_later_001"],
  });

  const outcomes = projectResolvedOutcomes([later, earlier]);

  assert.deepEqual(outcomes, [
    {
      entryId: "continuity_hold_001",
      summary: "Later verified resolution note.",
      outcome: "explicitly_accept",
      sourceRefs: ["receipt:wave7_s01", "chain:continuity_hold_001"],
      evidenceRefs: [
        "evidence:repair_photo_001",
        "evidence:verify_later_001",
      ],
    },
  ]);
});
