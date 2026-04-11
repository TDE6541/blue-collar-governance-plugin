"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ConfidenceGradientEngine,
} = require("../../src/ConfidenceGradientEngine");
const {
  MarkerContinuityEngine,
} = require("../../src/MarkerContinuityEngine");
const {
  MarkerTemporalSignalsEngine,
} = require("../../src/MarkerTemporalSignalsEngine");
const {
  ConfidenceSkill,
  SKILL_ROUTES,
} = require("../../src/ConfidenceSkill");

function buildFile(filePath, content) {
  return {
    filePath,
    content,
  };
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildConfidenceGradientView(files) {
  const engine = new ConfidenceGradientEngine();
  return engine.scan(files);
}

function buildPolicy(targets) {
  return {
    version: 1,
    targets,
  };
}

function buildRequiredCoverageView(files, policy) {
  const engine = new ConfidenceGradientEngine();
  return engine.evaluateRequiredCoverage(files, policy);
}

function buildSnapshot(files) {
  const engine = new ConfidenceGradientEngine();
  return engine.buildSnapshot(files);
}

function buildMarkerContinuityView(previousFiles, currentFiles) {
  const engine = new MarkerContinuityEngine();
  return engine.compare(
    previousFiles === null ? null : buildSnapshot(previousFiles),
    buildSnapshot(currentFiles)
  );
}

function buildMarkerTemporalSignalsView(timelineEntries, options) {
  const engine = new MarkerTemporalSignalsEngine();
  return engine.evaluateTimeline(timelineEntries, options);
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

test("ConfidenceSkill keeps the /confidence route locked", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/confidence"]);
});

test("/confidence renders deterministically and keeps input unchanged", () => {
  const skill = new ConfidenceSkill();
  const input = {
    confidenceGradientView: buildConfidenceGradientView([
      buildFile("src/sample.js", "/// watch\n///// hold\n"),
    ]),
  };
  const snapshot = cloneValue(input);

  const first = skill.renderConfidence(input);
  const second = skill.renderConfidence(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(first, second);
  assert.equal(first.route, "/confidence");
  assert.equal(first.markerFamily, "slash");
});

test("/confidence keeps the exact Packet 1 route shape when no required coverage input is supplied", () => {
  const skill = new ConfidenceSkill();
  const rendered = skill.renderConfidence({
    confidenceGradientView: buildConfidenceGradientView([
      buildFile("src/sample.js", "/// watch\n"),
    ]),
  });

  assert.deepEqual(Object.keys(rendered).sort(), [
    "domainGrouping",
    "fileMarkerMap",
    "markerFamily",
    "route",
    "tierTotals",
    "topHoldKillLocations",
  ]);
  assert.equal(Object.prototype.hasOwnProperty.call(rendered, "requiredCoverage"), false);
});

test("/confidence surfaces exact tier totals from engine truth", () => {
  const skill = new ConfidenceSkill();
  const view = buildConfidenceGradientView([
    buildFile("src/one.js", "/// watch\n//// gap\n"),
    buildFile("hooks/two.js", "///// hold\n////// kill\n"),
  ]);

  const rendered = skill.renderConfidence({
    confidenceGradientView: view,
  });

  assert.deepEqual(rendered.tierTotals, {
    WATCH: 1,
    GAP: 1,
    HOLD: 1,
    KILL: 1,
  });
});

test("/confidence returns the file-by-file marker map", () => {
  const skill = new ConfidenceSkill();
  const view = buildConfidenceGradientView([
    buildFile("scripts/quote-builder.js", "//// gap\n///// hold\n"),
    buildFile("src/neutral.js", "/// watch\n"),
  ]);

  const rendered = skill.renderConfidence({
    confidenceGradientView: view,
  });

  assert.deepEqual(
    rendered.fileMarkerMap.map((file) => ({
      filePath: file.filePath,
      domainId: file.domain.domainId,
      markerCount: file.markerCount,
      tiers: file.markers.map((marker) => marker.tier),
    })),
    [
      {
        filePath: "scripts/quote-builder.js",
        domainId: "pricing_quote_logic",
        markerCount: 2,
        tiers: ["GAP", "HOLD"],
      },
      {
        filePath: "src/neutral.js",
        domainId: "unclassified",
        markerCount: 1,
        tiers: ["WATCH"],
      },
    ]
  );
});

test("/confidence returns domain grouping from engine truth", () => {
  const skill = new ConfidenceSkill();
  const view = buildConfidenceGradientView([
    buildFile("scripts/quote-builder.js", "//// gap\n"),
    buildFile("src/security-audit.js", "///// hold\n"),
    buildFile("src/neutral.js", "/// watch\n"),
  ]);

  const rendered = skill.renderConfidence({
    confidenceGradientView: view,
  });

  assert.deepEqual(
    rendered.domainGrouping.map((group) => ({
      domainId: group.domainId,
      markerCount: group.markerCount,
    })),
    [
      { domainId: "pricing_quote_logic", markerCount: 1 },
      { domainId: "auth_security_surfaces", markerCount: 1 },
      { domainId: "unclassified", markerCount: 1 },
    ]
  );
});

test("/confidence composes required coverage additively and preserves observed marker fields", () => {
  const skill = new ConfidenceSkill();
  const files = [
    buildFile("src/HookRuntime.js", "/// covered\n"),
    buildFile("src/neutral.js", "///// hold\n"),
  ];
  const confidenceGradientView = buildConfidenceGradientView(files);
  const baseRendered = skill.renderConfidence({
    confidenceGradientView,
  });
  const composed = skill.renderConfidence({
    confidenceGradientView,
    requiredCoverageView: buildRequiredCoverageView(
      files,
      buildPolicy([{ id: "hook-runtime-core", filePath: "src/HookRuntime.js" }])
    ),
  });

  assert.deepEqual(composed.route, baseRendered.route);
  assert.deepEqual(composed.markerFamily, baseRendered.markerFamily);
  assert.deepEqual(composed.tierTotals, baseRendered.tierTotals);
  assert.deepEqual(composed.fileMarkerMap, baseRendered.fileMarkerMap);
  assert.deepEqual(composed.domainGrouping, baseRendered.domainGrouping);
  assert.deepEqual(composed.topHoldKillLocations, baseRendered.topHoldKillLocations);
  assert.deepEqual(composed.requiredCoverage, {
    policyMode: "explicit_opt_in",
    markerFamily: "slash",
    targetCount: 1,
    evaluatedTargetCount: 1,
    findings: [],
    policyErrors: [],
  });
});

test("/confidence keeps required coverage findings and policy errors separate from observed marker truth", () => {
  const skill = new ConfidenceSkill();
  const files = [
    buildFile("src/HookRuntime.js", "const runtime = true;\n"),
    buildFile("src/observed.js", "///// observed hold\n"),
  ];
  const rendered = skill.renderConfidence({
    confidenceGradientView: buildConfidenceGradientView(files),
    requiredCoverageView: buildRequiredCoverageView(
      files,
      buildPolicy([
        { id: "hook-runtime-core", filePath: "src/HookRuntime.js" },
        { id: "docs-spec", filePath: "docs/specs/not-scanned.js" },
      ])
    ),
  });

  assert.deepEqual(
    rendered.fileMarkerMap.map((file) => file.filePath),
    ["src/observed.js"]
  );
  assert.deepEqual(rendered.requiredCoverage.findings, [
    {
      code: "REQUIRED_COVERAGE_MISSING",
      policyTargetId: "hook-runtime-core",
      filePath: "src/HookRuntime.js",
      domain: {
        domainId: "unclassified",
        label: "Unclassified",
      },
      markerCount: 0,
      minimumMarkerCount: 1,
    },
  ]);
  assert.deepEqual(rendered.requiredCoverage.policyErrors, [
    {
      code: "POLICY_TARGET_OUTSIDE_SCAN_FENCE",
      policyTargetId: "docs-spec",
      filePath: "docs/specs/not-scanned.js",
    },
  ]);
});

test("/confidence composes marker continuity additively and preserves the current scan surface", () => {
  const skill = new ConfidenceSkill();
  const currentFiles = [
    buildFile(
      "src/moved.js",
      "function sample() {\n  const alpha = 1;\n\n  ///// stable hold\n  return alpha;\n}\n"
    ),
    buildFile("src/new.js", "//// newly observed\n"),
  ];
  const confidenceGradientView = buildConfidenceGradientView(currentFiles);
  const baseRendered = skill.renderConfidence({
    confidenceGradientView,
  });
  const rendered = skill.renderConfidence({
    confidenceGradientView,
    markerContinuityView: buildMarkerContinuityView(
      [
        buildFile(
          "src/moved.js",
          "function sample() {\n  const alpha = 1;\n  ///// stable hold\n  return alpha;\n}\n"
        ),
        buildFile("src/old.js", "///// no longer observed\n"),
      ],
      currentFiles
    ),
  });

  assert.deepEqual(rendered.route, baseRendered.route);
  assert.deepEqual(rendered.markerFamily, baseRendered.markerFamily);
  assert.deepEqual(rendered.tierTotals, baseRendered.tierTotals);
  assert.deepEqual(rendered.fileMarkerMap, baseRendered.fileMarkerMap);
  assert.deepEqual(rendered.domainGrouping, baseRendered.domainGrouping);
  assert.deepEqual(rendered.topHoldKillLocations, baseRendered.topHoldKillLocations);
  assert.deepEqual(rendered.markerContinuity, {
    comparisonVersion: 1,
    markerFamily: "slash",
    previousSnapshotVersion: 1,
    currentSnapshotVersion: 1,
    continuityChanges: [
      {
        status: "MATCHED",
        filePath: "src/moved.js",
        flags: ["moved"],
        previousMarker: {
          lineNumber: 3,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "stable hold",
        },
        currentMarker: {
          lineNumber: 4,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "stable hold",
        },
      },
      {
        status: "NEWLY_OBSERVED",
        filePath: "src/new.js",
        currentMarker: {
          lineNumber: 1,
          tier: "GAP",
          marker: "////",
          slashCount: 4,
          trailingText: "newly observed",
        },
      },
      {
        status: "NO_LONGER_OBSERVED",
        filePath: "src/old.js",
        previousMarker: {
          lineNumber: 1,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "no longer observed",
        },
      },
    ],
    ambiguousCases: [],
  });
});

test("/confidence keeps continuity changes and ambiguous cases in separate additive sections", () => {
  const skill = new ConfidenceSkill();
  const currentFiles = [
    buildFile("src/ambiguous.js", "///// duplicate\n\n///// duplicate\n"),
  ];
  const rendered = skill.renderConfidence({
    confidenceGradientView: buildConfidenceGradientView(currentFiles),
    markerContinuityView: buildMarkerContinuityView(
      [buildFile("src/ambiguous.js", "///// duplicate\n")],
      currentFiles
    ),
  });

  assert.deepEqual(rendered.markerContinuity.continuityChanges, []);
  assert.deepEqual(rendered.markerContinuity.ambiguousCases, [
    {
      status: "AMBIGUOUS",
      filePath: "src/ambiguous.js",
      previousCandidates: [
        {
          lineNumber: 1,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "duplicate",
        },
      ],
      currentCandidates: [
        {
          lineNumber: 1,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "duplicate",
        },
        {
          lineNumber: 3,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "duplicate",
        },
      ],
    },
  ]);
});

test("/confidence accepts bootstrap comparison truth without making continuity claims", () => {
  const skill = new ConfidenceSkill();
  const currentFiles = [
    buildFile("src/bootstrap.js", "///// current hold\n"),
  ];
  const rendered = skill.renderConfidence({
    confidenceGradientView: buildConfidenceGradientView(currentFiles),
    markerContinuityView: buildMarkerContinuityView(null, currentFiles),
  });

  assert.deepEqual(rendered.markerContinuity, {
    comparisonVersion: 1,
    markerFamily: "slash",
    previousSnapshotVersion: null,
    currentSnapshotVersion: 1,
    continuityChanges: [],
    ambiguousCases: [],
  });
});

test("/confidence composes marker temporal signals additively and preserves the current scan surface", () => {
  const skill = new ConfidenceSkill();
  const timelineEntries = [
    {
      observedAt: "2026-04-01T00:00:00Z",
      snapshot: buildSnapshot([buildFile("src/hold.js", "///// stable hold\n")]),
    },
    {
      observedAt: "2026-04-06T00:00:00Z",
      snapshot: buildSnapshot([buildFile("src/hold.js", "///// stable hold\n")]),
    },
  ];
  const confidenceGradientView = buildConfidenceGradientView([
    buildFile("src/hold.js", "///// stable hold\n"),
  ]);
  const baseRendered = skill.renderConfidence({
    confidenceGradientView,
  });
  const rendered = skill.renderConfidence({
    confidenceGradientView,
    markerTemporalSignalsView: buildMarkerTemporalSignalsView(timelineEntries, {
      staleHoldDays: 3,
      unresolvedKillDays: 1,
    }),
  });

  assert.deepEqual(rendered.route, baseRendered.route);
  assert.deepEqual(rendered.markerFamily, baseRendered.markerFamily);
  assert.deepEqual(rendered.tierTotals, baseRendered.tierTotals);
  assert.deepEqual(rendered.fileMarkerMap, baseRendered.fileMarkerMap);
  assert.deepEqual(rendered.domainGrouping, baseRendered.domainGrouping);
  assert.deepEqual(rendered.topHoldKillLocations, baseRendered.topHoldKillLocations);
  assert.deepEqual(rendered.markerTemporalSignals, {
    temporalVersion: 1,
    markerFamily: "slash",
    thresholds: {
      staleHoldDays: 3,
      unresolvedKillDays: 1,
    },
    timeline: {
      entryCount: 2,
      earliestObservedAt: "2026-04-01T00:00:00Z",
      latestObservedAt: "2026-04-06T00:00:00Z",
    },
    findings: [
      {
        code: "STALE_HOLD",
        filePath: "src/hold.js",
        currentMarker: {
          lineNumber: 1,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "stable hold",
        },
        currentTierEnteredAt: "2026-04-01T00:00:00Z",
        observedAt: "2026-04-06T00:00:00Z",
        ageDays: 5,
        thresholdDays: 3,
      },
    ],
    errors: [],
    trendSummary: {
      earliestObservedAt: "2026-04-01T00:00:00Z",
      latestObservedAt: "2026-04-06T00:00:00Z",
      earliestTierTotals: {
        WATCH: 0,
        GAP: 0,
        HOLD: 1,
        KILL: 0,
      },
      latestTierTotals: {
        WATCH: 0,
        GAP: 0,
        HOLD: 1,
        KILL: 0,
      },
      netTierDeltas: {
        WATCH: 0,
        GAP: 0,
        HOLD: 0,
        KILL: 0,
      },
      continuityCounts: {
        matched: 1,
        newlyObserved: 0,
        noLongerObserved: 0,
        moved: 0,
        retiered: 0,
        ambiguous: 0,
      },
    },
  });
});

test("/confidence keeps temporal, required coverage, and marker continuity sections separate", () => {
  const skill = new ConfidenceSkill();
  const files = [
    buildFile("src/HookRuntime.js", "const runtime = true;\n"),
    buildFile("src/observed.js", "///// observed hold\n"),
  ];
  const rendered = skill.renderConfidence({
    confidenceGradientView: buildConfidenceGradientView(files),
    requiredCoverageView: buildRequiredCoverageView(
      files,
      buildPolicy([{ id: "hook-runtime-core", filePath: "src/HookRuntime.js" }])
    ),
    markerContinuityView: buildMarkerContinuityView(
      [buildFile("src/observed.js", "/// observed hold\n")],
      [buildFile("src/observed.js", "///// observed hold\n")]
    ),
    markerTemporalSignalsView: buildMarkerTemporalSignalsView(
      [
        {
          observedAt: "2026-04-01T00:00:00Z",
          snapshot: buildSnapshot([buildFile("src/observed.js", "/// observed hold\n")]),
        },
        {
          observedAt: "2026-04-03T00:00:00Z",
          snapshot: buildSnapshot([
            buildFile("src/observed.js", "///// observed hold\n"),
          ]),
        },
        {
          observedAt: "2026-04-06T00:00:00Z",
          snapshot: buildSnapshot([
            buildFile("src/observed.js", "///// observed hold\n"),
          ]),
        },
      ],
      {
        staleHoldDays: 2,
        unresolvedKillDays: 1,
      }
    ),
  });

  assert.equal(rendered.requiredCoverage.findings.length, 1);
  assert.equal(rendered.markerContinuity.continuityChanges.length, 1);
  assert.equal(rendered.markerTemporalSignals.findings.length, 1);
  assert.equal(rendered.markerTemporalSignals.findings[0].code, "STALE_HOLD");
});

test("/confidence accepts temporal error reports without changing the current scan surface", () => {
  const skill = new ConfidenceSkill();
  const rendered = skill.renderConfidence({
    confidenceGradientView: buildConfidenceGradientView([
      buildFile("src/sample.js", "///// hold\n"),
    ]),
    markerTemporalSignalsView: buildMarkerTemporalSignalsView(
      [
        {
          observedAt: "2026-04-01T00:00:00Z",
          snapshot: buildSnapshot([buildFile("src/sample.js", "///// hold\n")]),
        },
      ],
      {
        staleHoldDays: 2,
        unresolvedKillDays: 1,
      }
    ),
  });

  assert.deepEqual(rendered.markerTemporalSignals.findings, []);
  assert.deepEqual(rendered.markerTemporalSignals.errors, [
    {
      code: "TIMELINE_TOO_SHORT",
      details: {},
    },
  ]);
  assert.equal(rendered.markerTemporalSignals.trendSummary, null);
});

test("/confidence returns top HOLD and KILL locations in deterministic order", () => {
  const skill = new ConfidenceSkill();
  const view = buildConfidenceGradientView([
    buildFile("src/alpha.js", "///// hold alpha\n"),
    buildFile("hooks/beta.js", "////// kill beta\n"),
    buildFile("src/gamma.js", "///// hold gamma\n"),
  ]);

  const rendered = skill.renderConfidence({
    confidenceGradientView: view,
  });

  assert.deepEqual(rendered.topHoldKillLocations, [
    {
      filePath: "hooks/beta.js",
      lineNumber: 1,
      tier: "KILL",
      marker: "//////",
      domainId: "unclassified",
      domainLabel: "Unclassified",
    },
    {
      filePath: "src/alpha.js",
      lineNumber: 1,
      tier: "HOLD",
      marker: "/////",
      domainId: "unclassified",
      domainLabel: "Unclassified",
    },
    {
      filePath: "src/gamma.js",
      lineNumber: 1,
      tier: "HOLD",
      marker: "/////",
      domainId: "unclassified",
      domainLabel: "Unclassified",
    },
  ]);
});

test("/confidence returns an empty high-severity list when no HOLD or KILL markers exist", () => {
  const skill = new ConfidenceSkill();
  const view = buildConfidenceGradientView([
    buildFile("src/watch.js", "/// watch\n//// gap\n"),
  ]);

  const rendered = skill.renderConfidence({
    confidenceGradientView: view,
  });

  assert.deepEqual(rendered.topHoldKillLocations, []);
});

test("/confidence requires confidenceGradientView", () => {
  const skill = new ConfidenceSkill();

  expectValidationError(
    () => skill.renderConfidence({}),
    "ERR_INVALID_INPUT",
    "'confidenceGradientView' is required"
  );
});

test("/confidence rejects non-slash marker families", () => {
  const skill = new ConfidenceSkill();
  const badView = buildConfidenceGradientView([
    buildFile("src/sample.js", "///// hold\n"),
  ]);
  badView.markerFamily = "semicolon";

  expectValidationError(
    () =>
      skill.renderConfidence({
        confidenceGradientView: badView,
      }),
    "ERR_INVALID_INPUT",
    "'confidenceGradientView.markerFamily' must be 'slash'"
  );
});

test("/confidence rejects non-slash marker families in required coverage input", () => {
  const skill = new ConfidenceSkill();
  const badRequiredCoverageView = buildRequiredCoverageView(
    [buildFile("src/sample.js", "///// hold\n")],
    buildPolicy([{ id: "sample-core", filePath: "src/sample.js" }])
  );
  badRequiredCoverageView.markerFamily = "semicolon";

  expectValidationError(
    () =>
      skill.renderConfidence({
        confidenceGradientView: buildConfidenceGradientView([
          buildFile("src/sample.js", "///// hold\n"),
        ]),
        requiredCoverageView: badRequiredCoverageView,
      }),
    "ERR_INVALID_INPUT",
    "'requiredCoverageView.markerFamily' must be 'slash'"
  );
});

test("/confidence rejects non-slash marker families in marker continuity input", () => {
  const skill = new ConfidenceSkill();
  const badMarkerContinuityView = buildMarkerContinuityView(
    [buildFile("src/sample.js", "///// hold\n")],
    [buildFile("src/sample.js", "///// hold\n")]
  );
  badMarkerContinuityView.markerFamily = "semicolon";

  expectValidationError(
    () =>
      skill.renderConfidence({
        confidenceGradientView: buildConfidenceGradientView([
          buildFile("src/sample.js", "///// hold\n"),
        ]),
        markerContinuityView: badMarkerContinuityView,
      }),
    "ERR_INVALID_INPUT",
    "'markerContinuityView.markerFamily' must be 'slash'"
  );
});

test("/confidence rejects invalid continuity vocabulary that would force stronger claims", () => {
  const skill = new ConfidenceSkill();
  const badMarkerContinuityView = buildMarkerContinuityView(
    [buildFile("src/sample.js", "///// hold\n")],
    [buildFile("src/sample.js", "///// hold\n")]
  );
  badMarkerContinuityView.continuityChanges[0].status = "RESOLVED";

  expectValidationError(
    () =>
      skill.renderConfidence({
        confidenceGradientView: buildConfidenceGradientView([
          buildFile("src/sample.js", "///// hold\n"),
        ]),
        markerContinuityView: badMarkerContinuityView,
      }),
    "ERR_INVALID_INPUT",
    "'markerContinuityView.continuityChanges[0].status' must be one of: MATCHED, NEWLY_OBSERVED, NO_LONGER_OBSERVED"
  );
});

test("/confidence rejects non-slash marker families in temporal input", () => {
  const skill = new ConfidenceSkill();
  const badMarkerTemporalSignalsView = buildMarkerTemporalSignalsView(
    [
      {
        observedAt: "2026-04-01T00:00:00Z",
        snapshot: buildSnapshot([buildFile("src/sample.js", "///// hold\n")]),
      },
      {
        observedAt: "2026-04-03T00:00:00Z",
        snapshot: buildSnapshot([buildFile("src/sample.js", "///// hold\n")]),
      },
    ],
    {
      staleHoldDays: 2,
      unresolvedKillDays: 1,
    }
  );
  badMarkerTemporalSignalsView.markerFamily = "semicolon";

  expectValidationError(
    () =>
      skill.renderConfidence({
        confidenceGradientView: buildConfidenceGradientView([
          buildFile("src/sample.js", "///// hold\n"),
        ]),
        markerTemporalSignalsView: badMarkerTemporalSignalsView,
      }),
    "ERR_INVALID_INPUT",
    "'markerTemporalSignalsView.markerFamily' must be 'slash'"
  );
});

test("/confidence rejects invalid temporal finding vocabulary that would force stronger claims", () => {
  const skill = new ConfidenceSkill();
  const badMarkerTemporalSignalsView = buildMarkerTemporalSignalsView(
    [
      {
        observedAt: "2026-04-01T00:00:00Z",
        snapshot: buildSnapshot([buildFile("src/sample.js", "///// hold\n")]),
      },
      {
        observedAt: "2026-04-04T00:00:00Z",
        snapshot: buildSnapshot([buildFile("src/sample.js", "///// hold\n")]),
      },
    ],
    {
      staleHoldDays: 2,
      unresolvedKillDays: 1,
    }
  );
  badMarkerTemporalSignalsView.findings[0].code = "RESOLVED";

  expectValidationError(
    () =>
      skill.renderConfidence({
        confidenceGradientView: buildConfidenceGradientView([
          buildFile("src/sample.js", "///// hold\n"),
        ]),
        markerTemporalSignalsView: badMarkerTemporalSignalsView,
      }),
    "ERR_INVALID_INPUT",
    "'markerTemporalSignalsView.findings[0].code' must be one of: STALE_HOLD, UNRESOLVED_KILL"
  );
});

test("/confidence exposes no score, trend, or health-percentage fields and keeps a read-only method surface", () => {
  const skill = new ConfidenceSkill();
  const rendered = skill.renderConfidence({
    confidenceGradientView: buildConfidenceGradientView([
      buildFile("src/sample.js", "///// hold\n"),
    ]),
    requiredCoverageView: buildRequiredCoverageView(
      [buildFile("src/sample.js", "///// hold\n")],
      buildPolicy([{ id: "sample-core", filePath: "src/sample.js" }])
    ),
    markerContinuityView: buildMarkerContinuityView(
      [buildFile("src/sample.js", "///// hold\n")],
      [buildFile("src/sample.js", "//// hold\n")]
    ),
    markerTemporalSignalsView: buildMarkerTemporalSignalsView(
      [
        {
          observedAt: "2026-04-01T00:00:00Z",
          snapshot: buildSnapshot([buildFile("src/sample.js", "///// hold\n")]),
        },
        {
          observedAt: "2026-04-04T00:00:00Z",
          snapshot: buildSnapshot([buildFile("src/sample.js", "///// hold\n")]),
        },
      ],
      {
        staleHoldDays: 2,
        unresolvedKillDays: 1,
      }
    ),
  });

  const forbiddenFields = [
    "score",
    "trendLine",
    "healthPercentage",
    "reviewedClean",
    "resolved",
  ];
  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(rendered, field), false);
  }
  assert.equal(
    Object.prototype.hasOwnProperty.call(rendered.requiredCoverage, "reviewedClean"),
    false
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(rendered.markerContinuity, "reviewedClean"),
    false
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(rendered.markerTemporalSignals, "reviewedClean"),
    false
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(rendered.markerTemporalSignals, "score"),
    false
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(rendered.markerTemporalSignals, "priority"),
    false
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(rendered.markerTemporalSignals, "resolved"),
    false
  );

  const methodNames = Object.getOwnPropertyNames(ConfidenceSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderConfidence"]);
  assert.equal(typeof skill.write, "undefined");
  assert.equal(typeof skill.persist, "undefined");
  assert.equal(typeof skill.mutate, "undefined");
});
