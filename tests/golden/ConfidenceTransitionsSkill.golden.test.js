"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  MATCHED_STATUS,
  NEWLY_OBSERVED_STATUS,
  NO_LONGER_OBSERVED_STATUS,
} = require("../../src/MarkerContinuityEngine");
const { ForensicChain } = require("../../src/ForensicChain");
const {
  ConfidenceTransitionsSkill,
  SKILL_ROUTES,
} = require("../../src/ConfidenceTransitionsSkill");

const SESSION_ID = "wave6_packet6_s02";
const RECORDED_AT = "2026-04-10T12:00:00Z";

const MARKER_BY_TIER = Object.freeze({
  WATCH: "///",
  GAP: "////",
  HOLD: "/////",
  KILL: "//////",
});

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildMarker({ lineNumber, tier, trailingText }) {
  return {
    lineNumber,
    tier,
    marker: MARKER_BY_TIER[tier],
    slashCount: MARKER_BY_TIER[tier].length,
    trailingText,
  };
}

function buildChange({
  status,
  filePath,
  flags,
  previousMarker,
  currentMarker,
}) {
  return {
    status,
    filePath,
    ...(flags === undefined ? {} : { flags }),
    ...(previousMarker === undefined ? {} : { previousMarker }),
    ...(currentMarker === undefined ? {} : { currentMarker }),
  };
}

function buildInput(overrides = {}) {
  const {
    markerContinuityView: markerContinuityOverrides,
    ...otherOverrides
  } = overrides;

  return {
    markerContinuityView: {
      comparisonVersion: 1,
      markerFamily: "slash",
      continuityChanges: [],
      ambiguousCases: [],
      ...(markerContinuityOverrides || {}),
    },
    sessionId: SESSION_ID,
    recordedAt: RECORDED_AT,
    entryIdPrefix: "transition_skill",
    sourceArtifact: "skill:confidence-transitions",
    sourceLocationPrefix: "transition",
    ...otherOverrides,
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

test("ConfidenceTransitionsSkill keeps route list locked", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/confidence-transitions"]);
});

test("/confidence-transitions defaults to preview and returns generated append-ready entries", () => {
  const skill = new ConfidenceTransitionsSkill();

  const view = skill.renderConfidenceTransitions(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: NEWLY_OBSERVED_STATUS,
            filePath: "src/new.js",
            currentMarker: buildMarker({
              lineNumber: 11,
              tier: "HOLD",
              trailingText: "new hold",
            }),
          }),
          buildChange({
            status: NO_LONGER_OBSERVED_STATUS,
            filePath: "src/old.js",
            previousMarker: buildMarker({
              lineNumber: 6,
              tier: "GAP",
              trailingText: "old gap",
            }),
          }),
        ],
      },
    })
  );

  assert.equal(view.route, "/confidence-transitions");
  assert.equal(view.action, "preview");
  assert.equal(view.appendRequested, false);
  assert.equal(view.generatedCount, 2);
  assert.equal(view.appendedCount, 0);
  assert.deepEqual(view.appendedEntryIds, []);
  assert.deepEqual(
    view.generatedEntries.map((entry) => entry.payload.transitionClass),
    ["NEWLY_OBSERVED", "NO_LONGER_OBSERVED"]
  );
});

test("/confidence-transitions preview path does not append even when chain is supplied", () => {
  const skill = new ConfidenceTransitionsSkill();
  const chain = new ForensicChain("forensic_chain_packet6_preview_no_append");

  const view = skill.renderConfidenceTransitions(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: NEWLY_OBSERVED_STATUS,
            filePath: "src/new.js",
            currentMarker: buildMarker({
              lineNumber: 3,
              tier: "HOLD",
              trailingText: "new",
            }),
          }),
        ],
      },
      chain,
    })
  );

  assert.equal(view.action, "preview");
  assert.equal(view.generatedCount, 1);
  assert.equal(chain.listEntries().length, 0);
});

test("/confidence-transitions append path appends through existing ForensicChain API only when explicitly requested", () => {
  const skill = new ConfidenceTransitionsSkill();
  const chain = new ForensicChain("forensic_chain_packet6_append");

  const result = skill.renderConfidenceTransitions(
    buildInput({
      append: true,
      chain,
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: MATCHED_STATUS,
            filePath: "src/retiered.js",
            flags: ["retiered"],
            previousMarker: buildMarker({
              lineNumber: 10,
              tier: "GAP",
              trailingText: "same anchor",
            }),
            currentMarker: buildMarker({
              lineNumber: 10,
              tier: "HOLD",
              trailingText: "same anchor",
            }),
          }),
        ],
      },
    })
  );

  assert.equal(result.route, "/confidence-transitions");
  assert.equal(result.action, "append");
  assert.equal(result.appendRequested, true);
  assert.equal(result.generatedCount, 1);
  assert.equal(result.appendedCount, 1);
  assert.equal(result.appendedEntryIds.length, 1);

  const appended = chain.getEntry(result.appendedEntryIds[0]);
  assert.ok(appended);
  assert.equal(appended.entryType, "FINDING");
  assert.equal(appended.payload.transitionClass, "RETIERED");
  assert.deepEqual(appended.linkedEntryRefs, []);
});

test("/confidence-transitions append path with no generated transitions appends nothing", () => {
  const skill = new ConfidenceTransitionsSkill();
  const chain = new ForensicChain("forensic_chain_packet6_append_empty");

  const result = skill.renderConfidenceTransitions(
    buildInput({
      append: true,
      chain,
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: MATCHED_STATUS,
            filePath: "src/matched.js",
            flags: [],
            previousMarker: buildMarker({
              lineNumber: 1,
              tier: "HOLD",
              trailingText: "same",
            }),
            currentMarker: buildMarker({
              lineNumber: 1,
              tier: "HOLD",
              trailingText: "same",
            }),
          }),
        ],
      },
    })
  );

  assert.equal(result.generatedCount, 0);
  assert.equal(result.appendedCount, 0);
  assert.deepEqual(result.appendedEntryIds, []);
  assert.equal(chain.listEntries().length, 0);
});

test("/confidence-transitions does not emit entries for MATCHED without retiered and for AMBIGUOUS", () => {
  const skill = new ConfidenceTransitionsSkill();

  const result = skill.renderConfidenceTransitions(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: MATCHED_STATUS,
            filePath: "src/matched.js",
            flags: ["moved"],
            previousMarker: buildMarker({
              lineNumber: 1,
              tier: "HOLD",
              trailingText: "same",
            }),
            currentMarker: buildMarker({
              lineNumber: 2,
              tier: "HOLD",
              trailingText: "same",
            }),
          }),
        ],
        ambiguousCases: [
          {
            status: "AMBIGUOUS",
            filePath: "src/ambiguous.js",
            previousCandidates: [buildMarker({ lineNumber: 1, tier: "HOLD", trailingText: "dup" })],
            currentCandidates: [buildMarker({ lineNumber: 3, tier: "HOLD", trailingText: "dup" })],
          },
        ],
      },
    })
  );

  assert.equal(result.generatedCount, 0);
  assert.deepEqual(result.generatedEntries, []);
});

test("/confidence-transitions generated entries remain FINDING-only and include no linkedEntryRefs", () => {
  const skill = new ConfidenceTransitionsSkill();
  const result = skill.renderConfidenceTransitions(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: NEWLY_OBSERVED_STATUS,
            filePath: "src/a.js",
            currentMarker: buildMarker({
              lineNumber: 5,
              tier: "WATCH",
              trailingText: "a",
            }),
          }),
          buildChange({
            status: NO_LONGER_OBSERVED_STATUS,
            filePath: "src/b.js",
            previousMarker: buildMarker({
              lineNumber: 7,
              tier: "KILL",
              trailingText: "b",
            }),
          }),
        ],
      },
    })
  );

  for (const entry of result.generatedEntries) {
    assert.equal(entry.entryType, "FINDING");
    assert.deepEqual(entry.linkedEntryRefs, []);
    assert.equal(
      Object.prototype.hasOwnProperty.call(entry, "chainId"),
      false
    );
  }
});

test("/confidence-transitions output is deterministic and input is unchanged", () => {
  const skill = new ConfidenceTransitionsSkill();
  const input = buildInput({
    markerContinuityView: {
      continuityChanges: [
        buildChange({
          status: MATCHED_STATUS,
          filePath: "src/retiered.js",
          flags: ["retiered"],
          previousMarker: buildMarker({
            lineNumber: 2,
            tier: "GAP",
            trailingText: "x",
          }),
          currentMarker: buildMarker({
            lineNumber: 2,
            tier: "HOLD",
            trailingText: "x",
          }),
        }),
      ],
    },
  });
  const snapshot = cloneValue(input);

  const first = skill.renderConfidenceTransitions(input);
  first.generatedEntries[0].payload.transitionClass = "MUTATED";
  const second = skill.renderConfidenceTransitions(input);
  const third = skill.renderConfidenceTransitions(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(second, third);
  assert.equal(second.generatedEntries[0].payload.transitionClass, "RETIERED");
});

test("/confidence-transitions requires chain when append is explicitly requested", () => {
  const skill = new ConfidenceTransitionsSkill();

  expectValidationError(
    () =>
      skill.renderConfidenceTransitions(
        buildInput({
          append: true,
          chain: undefined,
        })
      ),
    "ERR_INVALID_INPUT",
    "'chain' must be a ForensicChain-like object when append is requested"
  );
});

test("/confidence-transitions requires chain.appendEntry when append is explicitly requested", () => {
  const skill = new ConfidenceTransitionsSkill();

  expectValidationError(
    () =>
      skill.renderConfidenceTransitions(
        buildInput({
          append: true,
          chain: {},
        })
      ),
    "ERR_INVALID_INPUT",
    "'chain' must expose appendEntry when append is requested"
  );
});

test("/confidence-transitions rejects non-boolean append values", () => {
  const skill = new ConfidenceTransitionsSkill();

  expectValidationError(
    () =>
      skill.renderConfidenceTransitions(
        buildInput({
          append: "yes",
        })
      ),
    "ERR_INVALID_INPUT",
    "'append' must be a boolean when provided"
  );
});

test("/confidence-transitions keeps a minimal method surface", () => {
  const skill = new ConfidenceTransitionsSkill();
  const methodNames = Object.getOwnPropertyNames(
    ConfidenceTransitionsSkill.prototype
  ).sort();

  assert.deepEqual(methodNames, ["constructor", "renderConfidenceTransitions"]);
  assert.equal(typeof skill.preview, "undefined");
  assert.equal(typeof skill.autoAppend, "undefined");
  assert.equal(typeof skill.resolve, "undefined");
});
