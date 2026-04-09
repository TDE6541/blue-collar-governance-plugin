"use strict";

// B' Phase 1 Live Proof (untracked)
//
// Goal: exercise the 5.4 structural lane end-to-end against real source engines
// (`OmissionCoverageEngine`, `ForensicChain`, `OpenItemsBoard`) and prove that
// verified continuity-linked restoration records reach the Board's
// `Resolved this session` group while walk-only, manual-only, and unverified
// records stay off Board projection.
//
// This script does not edit, commit, merge, or push anything.
// It validates working-tree truth, not committed canon.
//
// Verification states proved: UNVERIFIED, VERIFIED.
// PARTIAL is explicitly deferred (HOLD-1 closed by Architect decision).

const path = require("node:path");
const { ForensicChain } = require(path.join("..", "..", "src", "ForensicChain"));
const { OmissionCoverageEngine } = require(path.join(
  "..",
  "..",
  "src",
  "OmissionCoverageEngine"
));
const { OpenItemsBoard } = require(path.join("..", "..", "src", "OpenItemsBoard"));
const {
  RestorationEngine,
  VERIFICATION_STATES,
  FINDING_SOURCE_TYPES,
  RESTORATION_OUTCOMES,
} = require(path.join("..", "..", "src", "RestorationEngine"));
const {
  getProjectionEligibility,
  projectResolvedOutcomes,
  PROJECTION_REASONS,
} = require(path.join("..", "..", "src", "RestorationProjectionAdapter"));
const { recordResolve } = require(path.join("..", "..", "src", "ResolveSkill"));
const { RestorationSkill } = require(path.join("..", "..", "src", "RestorationSkill"));

const SESSION_ID = "b_prime_phase1_live_proof";
const CHAIN_ID = "b_prime_phase1_proof_chain";
const CONTINUITY_ENTRY_ID = "continuity_entry_pricing_exclusions_001";

const steps = [];
let failed = 0;

function record(label, condition, evidence) {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) {
    failed += 1;
  }
  steps.push({ label, status, evidence });
  console.log(`[${status}] ${label}`);
  if (evidence !== undefined) {
    const rendered =
      typeof evidence === "string" ? evidence : JSON.stringify(evidence);
    console.log(`       ${rendered}`);
  }
}

function emit(message) {
  console.log(message);
}

// ---------------------------------------------------------------------------
// Structural sanity check on shipped verification states
// ---------------------------------------------------------------------------

emit("\n=== B' Phase 1 Live Proof (untracked) ===");
emit(`Session id: ${SESSION_ID}`);
emit(`Chain id:   ${CHAIN_ID}`);
emit("");

record(
  "VERIFICATION_STATES shipped as exactly [UNVERIFIED, VERIFIED]",
  Array.isArray(VERIFICATION_STATES) &&
    VERIFICATION_STATES.length === 2 &&
    VERIFICATION_STATES.includes("UNVERIFIED") &&
    VERIFICATION_STATES.includes("VERIFIED") &&
    !VERIFICATION_STATES.includes("PARTIAL"),
  VERIFICATION_STATES
);

record(
  "FINDING_SOURCE_TYPES shipped as exactly [standing_risk, omission, foremans_walk, manual]",
  Array.isArray(FINDING_SOURCE_TYPES) &&
    FINDING_SOURCE_TYPES.length === 4 &&
    FINDING_SOURCE_TYPES.includes("standing_risk") &&
    FINDING_SOURCE_TYPES.includes("omission") &&
    FINDING_SOURCE_TYPES.includes("foremans_walk") &&
    FINDING_SOURCE_TYPES.includes("manual"),
  FINDING_SOURCE_TYPES
);

record(
  "RESTORATION_OUTCOMES shipped as exactly [resolve, dismiss, explicitly_accept]",
  Array.isArray(RESTORATION_OUTCOMES) &&
    RESTORATION_OUTCOMES.length === 3 &&
    RESTORATION_OUTCOMES.includes("resolve") &&
    RESTORATION_OUTCOMES.includes("dismiss") &&
    RESTORATION_OUTCOMES.includes("explicitly_accept"),
  RESTORATION_OUTCOMES
);

record(
  "PROJECTION_REASONS shipped as exactly [READY_FOR_BOARD, NO_CONTINUITY_LINK, NOT_VERIFIED]",
  Array.isArray(PROJECTION_REASONS) &&
    PROJECTION_REASONS.length === 3 &&
    PROJECTION_REASONS.includes("READY_FOR_BOARD") &&
    PROJECTION_REASONS.includes("NO_CONTINUITY_LINK") &&
    PROJECTION_REASONS.includes("NOT_VERIFIED"),
  PROJECTION_REASONS
);

// ---------------------------------------------------------------------------
// Step 1 — real non-synthetic omission finding
// ---------------------------------------------------------------------------

emit("\n--- Step 1: Non-synthetic omission finding ---");

const omissionEngine = new OmissionCoverageEngine();
const omissionResult = omissionEngine.evaluate({
  profilePack: "pricing_quote_change",
  sessionId: SESSION_ID,
  observedExpectedItems: ["REQUEST_CAPTURED", "QUOTE_CHANGE_APPLIED"],
  observationRefs: ["proof:pricing-change-ticket-42", "proof:receipt-scan"],
});

record(
  "OmissionCoverageEngine produced at least one real finding",
  Array.isArray(omissionResult.findings) && omissionResult.findings.length > 0,
  { findingCount: omissionResult.findings.length }
);

const omissionFinding =
  omissionResult.findings.find(
    (finding) => finding.missingItemCode === "MISSING_EXCLUSIONS_STATEMENT"
  ) || omissionResult.findings[0];

record(
  "Omission finding carries the published ingredients required by the truth lock",
  typeof omissionFinding.profilePack === "string" &&
    typeof omissionFinding.missingItemCode === "string" &&
    Array.isArray(omissionFinding.evidenceRefs),
  {
    profilePack: omissionFinding.profilePack,
    missingItemCode: omissionFinding.missingItemCode,
    evidenceRefs: omissionFinding.evidenceRefs,
  }
);

// ---------------------------------------------------------------------------
// Step 2 — real ForensicChain instance + append adapter
// ---------------------------------------------------------------------------

emit("\n--- Step 2: Real ForensicChain instance ---");

const chain = new ForensicChain(CHAIN_ID);
let chainCounter = 0;

function appendChainEntry(state, spec) {
  chainCounter += 1;
  const entryId = `b_prime_proof_${String(chainCounter).padStart(4, "0")}`;
  return chain.appendEntry({
    entryId,
    entryType: spec.entryType,
    recordedAt: spec.recordedAt,
    sessionId: spec.sessionId,
    sourceArtifact: spec.sourceArtifact,
    sourceLocation: spec.sourceLocation,
    payload: spec.payload,
    linkedEntryRefs: [],
  });
}

record(
  "Real ForensicChain instantiated with chain id",
  chain.getChainId() === CHAIN_ID,
  chain.getChainId()
);

// ---------------------------------------------------------------------------
// Step 3 — /resolve UNVERIFIED, no continuity link, with chain append
// ---------------------------------------------------------------------------

emit("\n--- Step 3: /resolve (omission, UNVERIFIED, no continuity link) ---");

const omissionFindingInput = {
  sourceType: "omission",
  sessionId: SESSION_ID,
  profilePack: omissionFinding.profilePack,
  missingItemCode: omissionFinding.missingItemCode,
};

const unverifiedResolveResult = recordResolve(
  {
    finding: omissionFindingInput,
    outcome: "resolve",
    summary:
      "Exclusions statement missing; resolved by linking the existing exclusions paragraph.",
    sessionId: SESSION_ID,
    recordedAt: "2026-04-09T10:00:00Z",
    recordedBy: "architect",
    sourceRefs: [
      "proof:pricing-change-ticket-42",
      `omission:${SESSION_ID}:${omissionFinding.profilePack}:${omissionFinding.missingItemCode}`,
    ],
    evidenceRefs: ["proof:manual-note"],
  },
  {},
  appendChainEntry
);

record(
  "/resolve returned route=/resolve and action=recorded",
  unverifiedResolveResult.route === "/resolve" &&
    unverifiedResolveResult.action === "recorded",
  { route: unverifiedResolveResult.route, action: unverifiedResolveResult.action }
);

record(
  "/resolve UNVERIFIED + no continuity link produced NO_CONTINUITY_LINK eligibility",
  unverifiedResolveResult.projectionEligibility.eligible === false &&
    unverifiedResolveResult.projectionEligibility.reason === "NO_CONTINUITY_LINK",
  unverifiedResolveResult.projectionEligibility
);

record(
  "/resolve appended a chain entry and returned its id",
  typeof unverifiedResolveResult.chainEntryId === "string" &&
    unverifiedResolveResult.chainEntryId.length > 0,
  unverifiedResolveResult.chainEntryId
);

record(
  "Chain now contains exactly one OPERATOR_ACTION/restoration_recorded entry",
  chain.listEntries().filter(
    (entry) =>
      entry.entryType === "OPERATOR_ACTION" &&
      entry.payload &&
      entry.payload.action === "restoration_recorded"
  ).length === 1,
  { entriesSoFar: chain.listEntries().length }
);

record(
  "Recorded findingRef follows the locked omission format",
  unverifiedResolveResult.record.findingRef ===
    `omission:${SESSION_ID}:${omissionFinding.profilePack}:${omissionFinding.missingItemCode}`,
  unverifiedResolveResult.record.findingRef
);

// ---------------------------------------------------------------------------
// Step 4 — /resolve VERIFIED + continuity-linked
// ---------------------------------------------------------------------------

emit("\n--- Step 4: /resolve (omission, VERIFIED, continuity-linked) ---");

const verifiedResolveResult = recordResolve(
  {
    finding: omissionFindingInput,
    outcome: "resolve",
    summary:
      "Exclusions statement added and verified against the committed pricing addendum.",
    sessionId: SESSION_ID,
    recordedAt: "2026-04-09T10:05:00Z",
    recordedBy: "architect",
    sourceRefs: [
      "proof:pricing-change-ticket-42",
      `omission:${SESSION_ID}:${omissionFinding.profilePack}:${omissionFinding.missingItemCode}`,
    ],
    evidenceRefs: ["proof:pricing-addendum.md"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: [
      "proof:commit-sha-beefcafe",
      "proof:manual-review-sign-off",
    ],
    continuityEntryId: CONTINUITY_ENTRY_ID,
  },
  {},
  appendChainEntry
);

record(
  "/resolve VERIFIED + continuity link produced READY_FOR_BOARD eligibility",
  verifiedResolveResult.projectionEligibility.eligible === true &&
    verifiedResolveResult.projectionEligibility.reason === "READY_FOR_BOARD",
  verifiedResolveResult.projectionEligibility
);

record(
  "/resolve recorded the continuity link exactly as supplied",
  verifiedResolveResult.record.continuityEntryId === CONTINUITY_ENTRY_ID,
  verifiedResolveResult.record.continuityEntryId
);

record(
  "/resolve recorded verification evidence references without loss",
  Array.isArray(verifiedResolveResult.record.verificationEvidenceRefs) &&
    verifiedResolveResult.record.verificationEvidenceRefs.length === 2,
  verifiedResolveResult.record.verificationEvidenceRefs
);

// ---------------------------------------------------------------------------
// Step 5 — chain-compatible persistence check
// ---------------------------------------------------------------------------

emit("\n--- Step 5: Chain-compatible persistence shape ---");

const chainEntries = chain.listEntries();
const firstRestoration = chainEntries.find(
  (entry) =>
    entry.payload &&
    entry.payload.action === "restoration_recorded" &&
    entry.payload.record &&
    entry.payload.record.findingRef ===
      unverifiedResolveResult.record.findingRef &&
    entry.payload.record.verificationState === "UNVERIFIED"
);

record(
  "Chain entry 1 uses OPERATOR_ACTION (no new entry family)",
  firstRestoration && firstRestoration.entryType === "OPERATOR_ACTION",
  firstRestoration && firstRestoration.entryType
);

record(
  "Chain entry 1 carries the restoration record under payload.record",
  firstRestoration &&
    firstRestoration.payload &&
    firstRestoration.payload.action === "restoration_recorded" &&
    typeof firstRestoration.payload.record === "object",
  firstRestoration && firstRestoration.payload && firstRestoration.payload.action
);

record(
  "Chain entry 1 sourceArtifact is skill:resolve (no new family label)",
  firstRestoration && firstRestoration.sourceArtifact === "skill:resolve",
  firstRestoration && firstRestoration.sourceArtifact
);

// ---------------------------------------------------------------------------
// Step 6 — negative: manual-only VERIFIED stays off Board projection
// ---------------------------------------------------------------------------

emit("\n--- Step 6: /resolve (manual, VERIFIED, NO continuity link) ---");

const manualResolveResult = recordResolve(
  {
    finding: {
      sourceType: "manual",
      manualFindingKey: "pricing-change-kickoff-gap",
      findingType: "OPERATOR_NOTED_GAP",
      sourceArtifact: "ticket:pricing-change-42",
      sourceLocation: "ticket#comment-3",
    },
    outcome: "resolve",
    summary:
      "Operator noted the pricing change lacked a stated exclusions clause and closed the note.",
    sessionId: SESSION_ID,
    recordedAt: "2026-04-09T10:10:00Z",
    recordedBy: "architect",
    sourceRefs: ["proof:ticket-42-comment-3"],
    evidenceRefs: ["proof:operator-note.txt"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["proof:operator-sign-off"],
    // no continuityEntryId
  },
  {},
  appendChainEntry
);

record(
  "Manual-only VERIFIED without continuity link is NO_CONTINUITY_LINK",
  manualResolveResult.projectionEligibility.eligible === false &&
    manualResolveResult.projectionEligibility.reason === "NO_CONTINUITY_LINK",
  manualResolveResult.projectionEligibility
);

record(
  "Manual identity was derived from explicit ingredients (no summary fallback)",
  manualResolveResult.record.findingRef.startsWith("manual:pricing-change-kickoff-gap:"),
  manualResolveResult.record.findingRef
);

// ---------------------------------------------------------------------------
// Step 7 — negative: walk-only VERIFIED stays off Board projection
// ---------------------------------------------------------------------------

emit("\n--- Step 7: /resolve (foremans_walk, VERIFIED, NO continuity link) ---");

const walkResolveResult = recordResolve(
  {
    finding: {
      sourceType: "foremans_walk",
      sessionOfRecordRef: "receipt:session-42",
      issueRef: "walk:INCOMPLETE:pricing-exclusions",
    },
    outcome: "resolve",
    summary:
      "Walk called out incomplete exclusions coverage; operator reconciled it in-session without a continuity link.",
    sessionId: SESSION_ID,
    recordedAt: "2026-04-09T10:15:00Z",
    recordedBy: "architect",
    sourceRefs: ["proof:walk-finding-ref"],
    evidenceRefs: ["proof:walk-context"],
    verificationState: "VERIFIED",
    verificationEvidenceRefs: ["proof:walk-followup-signoff"],
    // no continuityEntryId
  },
  {},
  appendChainEntry
);

record(
  "Walk-only VERIFIED without continuity link is NO_CONTINUITY_LINK",
  walkResolveResult.projectionEligibility.eligible === false &&
    walkResolveResult.projectionEligibility.reason === "NO_CONTINUITY_LINK",
  walkResolveResult.projectionEligibility
);

record(
  "Walk findingRef follows the locked foremans-walk format",
  walkResolveResult.record.findingRef ===
    "foremans-walk:receipt%3Asession-42:walk%3AINCOMPLETE%3Apricing-exclusions",
  walkResolveResult.record.findingRef
);

// ---------------------------------------------------------------------------
// Step 8 — negative: unverified continuity-linked stays off Board projection
// ---------------------------------------------------------------------------

emit("\n--- Step 8: /resolve (omission, UNVERIFIED, continuity-linked) ---");

const unverifiedLinkedResolveResult = recordResolve(
  {
    finding: {
      sourceType: "standing_risk",
      entryId: "standing_risk_entry_pricing_exclusions_001",
    },
    outcome: "resolve",
    summary:
      "Standing-risk entry has a proposed fix but verification evidence is not yet attached.",
    sessionId: SESSION_ID,
    recordedAt: "2026-04-09T10:20:00Z",
    recordedBy: "architect",
    sourceRefs: ["proof:standing-risk-entry-ref"],
    evidenceRefs: ["proof:proposed-fix.md"],
    continuityEntryId: "continuity_entry_standing_risk_001",
    // verificationState omitted -> defaults to UNVERIFIED
  },
  {},
  appendChainEntry
);

record(
  "Unverified continuity-linked record is NOT_VERIFIED (not eligible)",
  unverifiedLinkedResolveResult.projectionEligibility.eligible === false &&
    unverifiedLinkedResolveResult.projectionEligibility.reason === "NOT_VERIFIED",
  unverifiedLinkedResolveResult.projectionEligibility
);

record(
  "Standing-risk findingRef follows the locked standing-risk format",
  unverifiedLinkedResolveResult.record.findingRef ===
    "standing-risk:standing_risk_entry_pricing_exclusions_001",
  unverifiedLinkedResolveResult.record.findingRef
);

// ---------------------------------------------------------------------------
// Step 9 — /restoration render
// ---------------------------------------------------------------------------

emit("\n--- Step 9: /restoration render over the real chain ---");

const restorationSkill = new RestorationSkill();
const renderedView = restorationSkill.renderRestoration({
  chainView: {
    chainId: chain.getChainId(),
    entries: chain.listEntries(),
  },
});

record(
  "/restoration route and chainId echo correctly",
  renderedView.route === "/restoration" && renderedView.chainId === CHAIN_ID,
  { route: renderedView.route, chainId: renderedView.chainId }
);

record(
  "/restoration returned recordCount=5 (steps 3,4,6,7,8)",
  renderedView.recordCount === 5,
  renderedView.recordCount
);

record(
  "/restoration returned verifiedCount=3 (steps 4,6,7)",
  renderedView.verifiedCount === 3,
  renderedView.verifiedCount
);

record(
  "/restoration returned boardProjectionCount=1 (only step 4)",
  renderedView.boardProjectionCount === 1,
  renderedView.boardProjectionCount
);

record(
  "/restoration boardResolvedOutcomes contains exactly the VERIFIED+continuity-linked record",
  Array.isArray(renderedView.boardResolvedOutcomes) &&
    renderedView.boardResolvedOutcomes.length === 1 &&
    renderedView.boardResolvedOutcomes[0].entryId === CONTINUITY_ENTRY_ID &&
    renderedView.boardResolvedOutcomes[0].outcome === "resolve",
  renderedView.boardResolvedOutcomes
);

record(
  "/restoration boardResolvedOutcomes shape matches ResolvedOutcomeInput contract",
  (() => {
    const outcome = renderedView.boardResolvedOutcomes[0];
    if (!outcome) return false;
    return (
      typeof outcome.entryId === "string" &&
      typeof outcome.summary === "string" &&
      typeof outcome.outcome === "string" &&
      Array.isArray(outcome.sourceRefs) &&
      Array.isArray(outcome.evidenceRefs)
    );
  })(),
  Object.keys(renderedView.boardResolvedOutcomes[0] || {})
);

const eligibilityByFindingRef = new Map();
for (const r of renderedView.records) {
  eligibilityByFindingRef.set(r.findingRef, r.projectionEligibility);
}

record(
  "/restoration records carry per-record projection eligibility",
  renderedView.records.every(
    (r) => r.projectionEligibility && typeof r.projectionEligibility.reason === "string"
  ),
  [...eligibilityByFindingRef.values()].map((e) => e.reason)
);

record(
  "Walk-only record is present in /restoration records but excluded from boardResolvedOutcomes",
  renderedView.records.some(
    (r) => r.findingIdentity.sourceType === "foremans_walk"
  ) &&
    !renderedView.boardResolvedOutcomes.some((o) =>
      o.sourceRefs.includes("proof:walk-finding-ref")
    ),
  {
    walkInRecords: renderedView.records.filter(
      (r) => r.findingIdentity.sourceType === "foremans_walk"
    ).length,
    walkInBoard: renderedView.boardResolvedOutcomes.filter((o) =>
      o.sourceRefs.includes("proof:walk-finding-ref")
    ).length,
  }
);

record(
  "Manual-only record is present in /restoration records but excluded from boardResolvedOutcomes",
  renderedView.records.some(
    (r) => r.findingIdentity.sourceType === "manual"
  ) &&
    !renderedView.boardResolvedOutcomes.some((o) =>
      o.sourceRefs.includes("proof:ticket-42-comment-3")
    ),
  {
    manualInRecords: renderedView.records.filter(
      (r) => r.findingIdentity.sourceType === "manual"
    ).length,
    manualInBoard: renderedView.boardResolvedOutcomes.filter((o) =>
      o.sourceRefs.includes("proof:ticket-42-comment-3")
    ).length,
  }
);

// ---------------------------------------------------------------------------
// Step 10 — real OpenItemsBoard projection
// ---------------------------------------------------------------------------

emit("\n--- Step 10: real OpenItemsBoard.projectBoard projection ---");

const board = new OpenItemsBoard();
const boardView = board.projectBoard({
  sessionId: SESSION_ID,
  omissionFindings: [],
  continuityEntries: [
    {
      entryId: CONTINUITY_ENTRY_ID,
      summary:
        "Pricing exclusions statement omitted in the original pricing change package.",
      sourceRefs: ["proof:pricing-change-ticket-42"],
      evidenceRefs: ["proof:pricing-addendum.md"],
    },
  ],
  standingRiskView: [],
  currentSessionResolvedOutcomes: renderedView.boardResolvedOutcomes,
});

record(
  "OpenItemsBoard returned a single Open Items Board projection",
  boardView.boardLabel === "Open Items Board",
  boardView.boardLabel
);

record(
  "Resolved this session group contains exactly one item with the continuity entry id",
  Array.isArray(boardView.groups["Resolved this session"]) &&
    boardView.groups["Resolved this session"].length === 1 &&
    boardView.groups["Resolved this session"][0].itemId === CONTINUITY_ENTRY_ID,
  boardView.groups["Resolved this session"]
);

record(
  "Missing now, Still unresolved, Aging into risk are all empty",
  boardView.groups["Missing now"].length === 0 &&
    boardView.groups["Still unresolved"].length === 0 &&
    boardView.groups["Aging into risk"].length === 0,
  {
    missingNow: boardView.groups["Missing now"].length,
    stillUnresolved: boardView.groups["Still unresolved"].length,
    agingIntoRisk: boardView.groups["Aging into risk"].length,
  }
);

record(
  "Precedence order is preserved",
  Array.isArray(boardView.precedence) &&
    boardView.precedence[0] === "Resolved this session",
  boardView.precedence
);

// ---------------------------------------------------------------------------
// Step 11 — blast radius sanity: re-run a minimal slice of source engines
// ---------------------------------------------------------------------------

emit("\n--- Step 11: blast radius sanity (source engines unchanged after live proof) ---");

const postOmission = omissionEngine.evaluate({
  profilePack: "pricing_quote_change",
  sessionId: SESSION_ID,
  observedExpectedItems: ["REQUEST_CAPTURED", "QUOTE_CHANGE_APPLIED"],
  observationRefs: ["proof:pricing-change-ticket-42", "proof:receipt-scan"],
});

record(
  "OmissionCoverageEngine output is deterministic after the live proof run",
  Array.isArray(postOmission.findings) &&
    postOmission.findings.length === omissionResult.findings.length &&
    postOmission.findings.every(
      (finding, index) =>
        finding.missingItemCode === omissionResult.findings[index].missingItemCode
    ),
  {
    before: omissionResult.findings.map((f) => f.missingItemCode),
    after: postOmission.findings.map((f) => f.missingItemCode),
  }
);

const postBoard = board.projectBoard({
  sessionId: SESSION_ID,
  omissionFindings: [],
  continuityEntries: [
    {
      entryId: CONTINUITY_ENTRY_ID,
      summary:
        "Pricing exclusions statement omitted in the original pricing change package.",
      sourceRefs: ["proof:pricing-change-ticket-42"],
      evidenceRefs: ["proof:pricing-addendum.md"],
    },
  ],
  standingRiskView: [],
  currentSessionResolvedOutcomes: renderedView.boardResolvedOutcomes,
});

record(
  "OpenItemsBoard.projectBoard is deterministic under identical input",
  JSON.stringify(postBoard) === JSON.stringify(boardView),
  "stable"
);

const postRestoration = restorationSkill.renderRestoration({
  chainView: {
    chainId: chain.getChainId(),
    entries: chain.listEntries(),
  },
});

record(
  "RestorationSkill.renderRestoration is deterministic under identical input",
  JSON.stringify(postRestoration) === JSON.stringify(renderedView),
  "stable"
);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

emit("\n=== Summary ===");
emit(`Total steps:  ${steps.length}`);
emit(`Passed:       ${steps.length - failed}`);
emit(`Failed:       ${failed}`);

if (failed > 0) {
  emit("\nFAILURES:");
  for (const step of steps) {
    if (step.status === "FAIL") {
      emit(` - ${step.label}`);
    }
  }
  process.exitCode = 1;
} else {
  emit("\nB' PHASE 1 LIVE PROOF: PASS");
  process.exitCode = 0;
}
