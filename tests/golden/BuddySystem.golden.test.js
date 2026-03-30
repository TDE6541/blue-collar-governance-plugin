"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { ForensicChain } = require("../../src/ForensicChain");
const {
  BuddySystem,
  BUDDY_CALLOUT_TYPES,
  BUDDY_URGENCY_LEVELS,
  DEFAULT_DEAD_MAN_TIMEOUT_MINUTES,
} = require("../../src/BuddySystem");

const T0 = "2026-03-30T23:00:00Z";
const T1 = "2026-03-30T23:05:00Z";
const T2 = "2026-03-30T23:20:00Z";

function createBuddy(overrides = {}) {
  const chain = overrides.chain || new ForensicChain("forensic_chain_wave4_buddy");
  return new BuddySystem({
    buddyId: "buddy_wave4_v1",
    sessionId: "wave4_s01",
    startedAt: T0,
    chain,
    policy: overrides.policy,
  });
}

test("BuddySystem v1 locks callout types, urgency levels, and default dead-man timeout", () => {
  assert.deepEqual([...BUDDY_CALLOUT_TYPES], [
    "DRIFT",
    "VIOLATION",
    "PHANTOM",
    "PRESENCE_TIMEOUT",
    "ESCALATION",
  ]);
  assert.deepEqual([...BUDDY_URGENCY_LEVELS], ["HALT", "WARN", "INFORM"]);
  assert.equal(DEFAULT_DEAD_MAN_TIMEOUT_MINUTES, 15);
});

test("BuddySystem emits live DRIFT callout and writes to forensic chain", () => {
  const chain = new ForensicChain("forensic_chain_wave4_buddy_drift");
  const buddy = createBuddy({ chain });

  const callout = buddy.detectDrift({
    summary: "Scope drift detected on active file set.",
    detectedAt: T1,
    sourceRefs: ["scope_guard:eval_001"],
    evidenceRefs: ["receipt:wave4_s01"],
  });

  assert.equal(callout.calloutType, "DRIFT");
  assert.equal(callout.urgency, "WARN");
  assert.equal(typeof callout.chainEntryRef, "string");

  const chainEntry = chain.getEntry(callout.chainEntryRef);
  assert.ok(chainEntry);
  assert.equal(chainEntry.entryType, "FINDING");
  assert.equal(chainEntry.payload.origin, "BUDDY");
  assert.equal(chainEntry.payload.calloutType, "DRIFT");
});

test("BuddySystem emits live VIOLATION callout with HALT urgency semantics", () => {
  const chain = new ForensicChain("forensic_chain_wave4_buddy_violation");
  const buddy = createBuddy({ chain });

  const callout = buddy.detectViolation({
    summary: "HARD_STOP domain action attempted without permit.",
    detectedAt: T1,
    sourceRefs: ["control_rod:gate_001"],
    evidenceRefs: ["chain:permit_denied_001"],
  });

  assert.equal(callout.calloutType, "VIOLATION");
  assert.equal(callout.urgency, "HALT");
});

test("BuddySystem emits live PHANTOM callout with WARN urgency semantics", () => {
  const chain = new ForensicChain("forensic_chain_wave4_buddy_phantom");
  const buddy = createBuddy({ chain });

  const callout = buddy.detectPhantom({
    summary: "Claim observed without evidence linkage.",
    detectedAt: T1,
    sourceRefs: ["forensic:claim_001"],
    evidenceRefs: ["forensic:missing_evidence"],
  });

  assert.equal(callout.calloutType, "PHANTOM");
  assert.equal(callout.urgency, "WARN");
});

test("BuddySystem Dead Man's Switch pauses session and emits PRESENCE_TIMEOUT callout", () => {
  const chain = new ForensicChain("forensic_chain_wave4_buddy_presence");
  const buddy = createBuddy({ chain });

  const status = buddy.checkPresence(T2);

  assert.equal(status.timedOut, true);
  assert.equal(status.sessionPaused, true);
  assert.equal(status.timeoutMinutes, 15);
  assert.ok(status.elapsedMinutes >= 20);
  assert.ok(status.callout);
  assert.equal(status.callout.calloutType, "PRESENCE_TIMEOUT");
  assert.equal(status.callout.urgency, "HALT");
});

test("Buddy-authored forensic entries remain immutable", () => {
  const chain = new ForensicChain("forensic_chain_wave4_buddy_immutable");
  const buddy = createBuddy({ chain });

  const callout = buddy.detectDrift({
    summary: "Drift for immutability proof.",
    detectedAt: T1,
    sourceRefs: ["scope_guard:eval_immutability"],
    evidenceRefs: ["receipt:wave4_s01"],
  });

  const entry = chain.getEntry(callout.chainEntryRef);
  assert.ok(entry);

  assert.throws(
    () => {
      entry.payload.summary = "mutated";
    },
    TypeError
  );

  assert.throws(
    () => {
      entry.linkedEntryRefs.push("new_ref");
    },
    TypeError
  );
});

test("Negative control: BuddySystem exposes watcher-only behavior with no fix/revert interfaces", () => {
  const buddy = createBuddy({});
  const methodNames = Object.getOwnPropertyNames(BuddySystem.prototype).sort();

  assert.deepEqual(methodNames, [
    "checkPresence",
    "constructor",
    "createCallout",
    "detectDrift",
    "detectPhantom",
    "detectViolation",
    "getPolicy",
    "listCallouts",
    "registerOperatorInteraction",
  ]);
  assert.equal(typeof buddy.fix, "undefined");
  assert.equal(typeof buddy.revert, "undefined");
  assert.equal(typeof buddy.suggestFix, "undefined");
  assert.equal(typeof buddy.build, "undefined");
});
