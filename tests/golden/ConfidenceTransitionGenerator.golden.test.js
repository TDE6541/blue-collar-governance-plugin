"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  COMPARISON_VERSION,
  MATCHED_STATUS,
  NEWLY_OBSERVED_STATUS,
  NO_LONGER_OBSERVED_STATUS,
} = require("../../src/MarkerContinuityEngine");
const {
  NEWLY_OBSERVED_CLASS,
  NO_LONGER_OBSERVED_CLASS,
  RETIERED_CLASS,
  TRANSITION_CLASSES,
  TRANSITION_ENTRY_TYPE,
  generateConfidenceTransitionEntries,
} = require("../../src/ConfidenceTransitionGenerator");

const RECORDED_AT = "2026-04-10T11:00:00Z";
const SESSION_ID = "wave6_packet6_s01";

const MARKER_BY_TIER = Object.freeze({
  WATCH: "///",
  GAP: "////",
  HOLD: "/////",
  KILL: "//////",
});

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildMarker({
  lineNumber,
  tier,
  trailingText,
}) {
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
      comparisonVersion: COMPARISON_VERSION,
      markerFamily: "slash",
      continuityChanges: [],
      ambiguousCases: [],
      ...(markerContinuityOverrides || {}),
    },
    sessionId: SESSION_ID,
    recordedAt: RECORDED_AT,
    entryIdPrefix: "transition_pkt6",
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

test("ConfidenceTransitionGenerator locks transition classes and entry type", () => {
  assert.deepEqual([...TRANSITION_CLASSES], [
    "NEWLY_OBSERVED",
    "NO_LONGER_OBSERVED",
    "RETIERED",
  ]);
  assert.equal(NEWLY_OBSERVED_CLASS, "NEWLY_OBSERVED");
  assert.equal(NO_LONGER_OBSERVED_CLASS, "NO_LONGER_OBSERVED");
  assert.equal(RETIERED_CLASS, "RETIERED");
  assert.equal(TRANSITION_ENTRY_TYPE, "FINDING");
});

test("NEWLY_OBSERVED generates one append-ready FINDING entry", () => {
  const entries = generateConfidenceTransitionEntries(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: NEWLY_OBSERVED_STATUS,
            filePath: "src/newly.js",
            currentMarker: buildMarker({
              lineNumber: 12,
              tier: "HOLD",
              trailingText: "newly observed hold",
            }),
          }),
        ],
      },
    })
  );

  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    entryId: "transition_pkt6_001",
    entryType: "FINDING",
    recordedAt: RECORDED_AT,
    sessionId: SESSION_ID,
    sourceArtifact: "skill:confidence-transitions",
    sourceLocation: "transition:NEWLY_OBSERVED:src/newly.js:12:HOLD",
    payload: {
      transitionClass: "NEWLY_OBSERVED",
      filePath: "src/newly.js",
      currentMarker: {
        lineNumber: 12,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
        trailingText: "newly observed hold",
      },
    },
    linkedEntryRefs: [],
  });
});

test("NO_LONGER_OBSERVED generates one append-ready FINDING entry", () => {
  const entries = generateConfidenceTransitionEntries(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: NO_LONGER_OBSERVED_STATUS,
            filePath: "src/gone.js",
            previousMarker: buildMarker({
              lineNumber: 4,
              tier: "GAP",
              trailingText: "no longer observed gap",
            }),
          }),
        ],
      },
    })
  );

  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    entryId: "transition_pkt6_001",
    entryType: "FINDING",
    recordedAt: RECORDED_AT,
    sessionId: SESSION_ID,
    sourceArtifact: "skill:confidence-transitions",
    sourceLocation: "transition:NO_LONGER_OBSERVED:src/gone.js:4:GAP",
    payload: {
      transitionClass: "NO_LONGER_OBSERVED",
      filePath: "src/gone.js",
      previousMarker: {
        lineNumber: 4,
        tier: "GAP",
        marker: "////",
        slashCount: 4,
        trailingText: "no longer observed gap",
      },
    },
    linkedEntryRefs: [],
  });
});

test("RETIERED generates one append-ready FINDING with neutral previous/current tier capture", () => {
  const entries = generateConfidenceTransitionEntries(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: MATCHED_STATUS,
            filePath: "src/retiered.js",
            flags: ["retiered"],
            previousMarker: buildMarker({
              lineNumber: 30,
              tier: "HOLD",
              trailingText: "same anchor old tier",
            }),
            currentMarker: buildMarker({
              lineNumber: 30,
              tier: "KILL",
              trailingText: "same anchor new tier",
            }),
          }),
        ],
      },
    })
  );

  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    entryId: "transition_pkt6_001",
    entryType: "FINDING",
    recordedAt: RECORDED_AT,
    sessionId: SESSION_ID,
    sourceArtifact: "skill:confidence-transitions",
    sourceLocation: "transition:RETIERED:src/retiered.js:30:KILL",
    payload: {
      transitionClass: "RETIERED",
      filePath: "src/retiered.js",
      previousMarker: {
        lineNumber: 30,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
        trailingText: "same anchor old tier",
      },
      currentMarker: {
        lineNumber: 30,
        tier: "KILL",
        marker: "//////",
        slashCount: 6,
        trailingText: "same anchor new tier",
      },
      previousTier: "HOLD",
      currentTier: "KILL",
    },
    linkedEntryRefs: [],
  });
});

test("MATCHED without retiered flag generates nothing", () => {
  const entries = generateConfidenceTransitionEntries(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: MATCHED_STATUS,
            filePath: "src/moved-only.js",
            flags: ["moved"],
            previousMarker: buildMarker({
              lineNumber: 7,
              tier: "HOLD",
              trailingText: "moved same tier",
            }),
            currentMarker: buildMarker({
              lineNumber: 9,
              tier: "HOLD",
              trailingText: "moved same tier",
            }),
          }),
        ],
      },
    })
  );

  assert.deepEqual(entries, []);
});

test("AMBIGUOUS cases generate nothing", () => {
  const entries = generateConfidenceTransitionEntries(
    buildInput({
      markerContinuityView: {
        continuityChanges: [],
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

  assert.deepEqual(entries, []);
});

test("mixed comparison output generates only NEWLY_OBSERVED, NO_LONGER_OBSERVED, and RETIERED in deterministic order", () => {
  const entries = generateConfidenceTransitionEntries(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: MATCHED_STATUS,
            filePath: "src/a.js",
            flags: [],
            previousMarker: buildMarker({
              lineNumber: 1,
              tier: "HOLD",
              trailingText: "matched",
            }),
            currentMarker: buildMarker({
              lineNumber: 1,
              tier: "HOLD",
              trailingText: "matched",
            }),
          }),
          buildChange({
            status: MATCHED_STATUS,
            filePath: "src/b.js",
            flags: ["moved", "retiered"],
            previousMarker: buildMarker({
              lineNumber: 2,
              tier: "GAP",
              trailingText: "retiered",
            }),
            currentMarker: buildMarker({
              lineNumber: 4,
              tier: "HOLD",
              trailingText: "retiered",
            }),
          }),
          buildChange({
            status: NEWLY_OBSERVED_STATUS,
            filePath: "src/c.js",
            currentMarker: buildMarker({
              lineNumber: 8,
              tier: "WATCH",
              trailingText: "new marker",
            }),
          }),
          buildChange({
            status: NO_LONGER_OBSERVED_STATUS,
            filePath: "src/d.js",
            previousMarker: buildMarker({
              lineNumber: 9,
              tier: "KILL",
              trailingText: "gone marker",
            }),
          }),
        ],
        ambiguousCases: [
          {
            status: "AMBIGUOUS",
            filePath: "src/e.js",
            previousCandidates: [buildMarker({ lineNumber: 1, tier: "HOLD", trailingText: "dup" })],
            currentCandidates: [buildMarker({ lineNumber: 2, tier: "HOLD", trailingText: "dup" })],
          },
        ],
      },
    })
  );

  assert.equal(entries.length, 3);
  assert.deepEqual(
    entries.map((entry) => ({
      entryId: entry.entryId,
      transitionClass: entry.payload.transitionClass,
      filePath: entry.payload.filePath,
    })),
    [
      {
        entryId: "transition_pkt6_001",
        transitionClass: "RETIERED",
        filePath: "src/b.js",
      },
      {
        entryId: "transition_pkt6_002",
        transitionClass: "NEWLY_OBSERVED",
        filePath: "src/c.js",
      },
      {
        entryId: "transition_pkt6_003",
        transitionClass: "NO_LONGER_OBSERVED",
        filePath: "src/d.js",
      },
    ]
  );
});

test("generated entries are append-ready ForensicChain shapes with no linked history refs", () => {
  const entries = generateConfidenceTransitionEntries(
    buildInput({
      markerContinuityView: {
        continuityChanges: [
          buildChange({
            status: NEWLY_OBSERVED_STATUS,
            filePath: "src/new.js",
            currentMarker: buildMarker({
              lineNumber: 5,
              tier: "GAP",
              trailingText: "newly observed",
            }),
          }),
          buildChange({
            status: NO_LONGER_OBSERVED_STATUS,
            filePath: "src/old.js",
            previousMarker: buildMarker({
              lineNumber: 3,
              tier: "HOLD",
              trailingText: "no longer observed",
            }),
          }),
        ],
      },
    })
  );

  for (const entry of entries) {
    assert.equal(entry.entryType, "FINDING");
    assert.equal(typeof entry.entryId, "string");
    assert.equal(typeof entry.recordedAt, "string");
    assert.equal(typeof entry.sessionId, "string");
    assert.equal(typeof entry.sourceArtifact, "string");
    assert.equal(typeof entry.sourceLocation, "string");
    assert.equal(Array.isArray(entry.linkedEntryRefs), true);
    assert.deepEqual(entry.linkedEntryRefs, []);
    assert.equal(typeof entry.payload, "object");
    assert.equal(
      Object.prototype.hasOwnProperty.call(entry, "chainId"),
      false
    );
  }
});

test("generator output is deterministic and input compare view remains unchanged", () => {
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

  const first = generateConfidenceTransitionEntries(input);
  first[0].payload.transitionClass = "MUTATED";
  const second = generateConfidenceTransitionEntries(input);
  const third = generateConfidenceTransitionEntries(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(second, third);
  assert.equal(second[0].payload.transitionClass, "RETIERED");
});

test("generator rejects missing markerContinuityView", () => {
  expectValidationError(
    () =>
      generateConfidenceTransitionEntries({
        sessionId: SESSION_ID,
        recordedAt: RECORDED_AT,
      }),
    "ERR_INVALID_INPUT",
    "'markerContinuityView' is required"
  );
});

test("generator rejects non-slash marker family", () => {
  expectValidationError(
    () =>
      generateConfidenceTransitionEntries(
        buildInput({
          markerContinuityView: {
            markerFamily: "semicolon",
          },
        })
      ),
    "ERR_INVALID_INPUT",
    "'markerContinuityView.markerFamily' must be 'slash'"
  );
});

test("generator rejects retiered flags without an actual tier transition", () => {
  expectValidationError(
    () =>
      generateConfidenceTransitionEntries(
        buildInput({
          markerContinuityView: {
            continuityChanges: [
              buildChange({
                status: MATCHED_STATUS,
                filePath: "src/bad.js",
                flags: ["retiered"],
                previousMarker: buildMarker({
                  lineNumber: 1,
                  tier: "HOLD",
                  trailingText: "same tier",
                }),
                currentMarker: buildMarker({
                  lineNumber: 1,
                  tier: "HOLD",
                  trailingText: "same tier",
                }),
              }),
            ],
          },
        })
      ),
    "ERR_INVALID_INPUT",
    "retiered transitions must include different previous and current tiers"
  );
});
