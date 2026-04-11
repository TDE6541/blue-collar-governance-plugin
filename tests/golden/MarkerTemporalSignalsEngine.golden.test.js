"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ConfidenceGradientEngine,
} = require("../../src/ConfidenceGradientEngine");
const {
  MarkerTemporalSignalsEngine,
  STALE_HOLD_CODE,
  TEMPORAL_LINEAGE_AMBIGUOUS_CODE,
  TEMPORAL_SIGNALS_VERSION,
  TIMELINE_MARKER_FAMILY_MISMATCH_CODE,
  TIMELINE_ORDER_INVALID_CODE,
  TIMELINE_SCAN_FENCE_MISMATCH_CODE,
  TIMELINE_TIMESTAMP_INVALID_CODE,
  TIMELINE_TOO_SHORT_CODE,
  UNRESOLVED_KILL_CODE,
} = require("../../src/MarkerTemporalSignalsEngine");

function buildFile(filePath, content) {
  return {
    filePath,
    content,
  };
}

function buildSnapshot(files) {
  return new ConfidenceGradientEngine().buildSnapshot(files);
}

function buildTimelineEntry(observedAt, files) {
  return {
    observedAt,
    snapshot: buildSnapshot(files),
  };
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildTemporalReport(timelineEntries, options) {
  return new MarkerTemporalSignalsEngine().evaluateTimeline(timelineEntries, options);
}

test("MarkerTemporalSignalsEngine locks version and bounded temporal vocabulary", () => {
  assert.equal(TEMPORAL_SIGNALS_VERSION, 1);
  assert.equal(STALE_HOLD_CODE, "STALE_HOLD");
  assert.equal(UNRESOLVED_KILL_CODE, "UNRESOLVED_KILL");
  assert.equal(TIMELINE_TOO_SHORT_CODE, "TIMELINE_TOO_SHORT");
  assert.equal(TIMELINE_TIMESTAMP_INVALID_CODE, "TIMELINE_TIMESTAMP_INVALID");
  assert.equal(TIMELINE_ORDER_INVALID_CODE, "TIMELINE_ORDER_INVALID");
  assert.equal(
    TIMELINE_MARKER_FAMILY_MISMATCH_CODE,
    "TIMELINE_MARKER_FAMILY_MISMATCH"
  );
  assert.equal(
    TIMELINE_SCAN_FENCE_MISMATCH_CODE,
    "TIMELINE_SCAN_FENCE_MISMATCH"
  );
  assert.equal(TEMPORAL_LINEAGE_AMBIGUOUS_CODE, "TEMPORAL_LINEAGE_AMBIGUOUS");
});

test("MarkerTemporalSignalsEngine emits TIMELINE_TOO_SHORT for fewer than two timeline entries", () => {
  const report = buildTemporalReport(
    [buildTimelineEntry("2026-04-01T00:00:00Z", [buildFile("src/hold.js", "///// hold\n")])],
    { staleHoldDays: 3, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.errors, [
    {
      code: "TIMELINE_TOO_SHORT",
      details: {},
    },
  ]);
  assert.deepEqual(report.findings, []);
  assert.equal(report.timeline.entryCount, 1);
  assert.equal(report.trendSummary, null);
});

test("MarkerTemporalSignalsEngine emits TIMELINE_TIMESTAMP_INVALID for invalid observedAt values", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", []),
      buildTimelineEntry("2026-02-30T00:00:00Z", []),
    ],
    { staleHoldDays: 3, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.errors, [
    {
      code: "TIMELINE_TIMESTAMP_INVALID",
      details: {
        timelineIndex: 1,
        observedAt: "2026-02-30T00:00:00Z",
      },
    },
  ]);
  assert.equal(report.timeline.earliestObservedAt, null);
  assert.equal(report.timeline.latestObservedAt, null);
});

test("MarkerTemporalSignalsEngine emits TIMELINE_ORDER_INVALID for non-monotonic timelines", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-03T00:00:00Z", []),
      buildTimelineEntry("2026-04-01T00:00:00Z", []),
    ],
    { staleHoldDays: 3, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.errors, [
    {
      code: "TIMELINE_ORDER_INVALID",
      details: {
        timelineIndex: 1,
        previousObservedAt: "2026-04-03T00:00:00Z",
        currentObservedAt: "2026-04-01T00:00:00Z",
      },
    },
  ]);
  assert.equal(report.trendSummary, null);
});

test("MarkerTemporalSignalsEngine emits TIMELINE_MARKER_FAMILY_MISMATCH for non-slash snapshots", () => {
  const secondEntry = buildTimelineEntry("2026-04-02T00:00:00Z", []);
  secondEntry.snapshot.markerFamily = "semicolon";

  const report = buildTemporalReport(
    [buildTimelineEntry("2026-04-01T00:00:00Z", []), secondEntry],
    { staleHoldDays: 3, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.errors, [
    {
      code: "TIMELINE_MARKER_FAMILY_MISMATCH",
      details: {
        timelineIndex: 1,
        markerFamily: "semicolon",
      },
    },
  ]);
  assert.equal(report.trendSummary, null);
});

test("MarkerTemporalSignalsEngine emits TIMELINE_SCAN_FENCE_MISMATCH for scan fence drift", () => {
  const secondEntry = buildTimelineEntry("2026-04-02T00:00:00Z", []);
  secondEntry.snapshot.scanFence.roots = ["src", "hooks", "scripts"];

  const report = buildTemporalReport(
    [buildTimelineEntry("2026-04-01T00:00:00Z", []), secondEntry],
    { staleHoldDays: 3, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.errors, [
    {
      code: "TIMELINE_SCAN_FENCE_MISMATCH",
      details: {
        timelineIndex: 1,
      },
    },
  ]);
  assert.equal(report.trendSummary, null);
});

test("MarkerTemporalSignalsEngine emits STALE_HOLD for a continuous current HOLD lineage beyond threshold", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", [
        buildFile("src/hold.js", "///// stable hold\n"),
      ]),
      buildTimelineEntry("2026-04-06T00:00:00Z", [
        buildFile("src/hold.js", "///// stable hold\n"),
      ]),
    ],
    { staleHoldDays: 3, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.findings, [
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
  ]);
  assert.deepEqual(report.errors, []);
});

test("MarkerTemporalSignalsEngine preserves same-tier movement when evaluating HOLD age", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", [
        buildFile(
          "src/moved.js",
          "function sample() {\n  const alpha = 1;\n  ///// stable hold\n  return alpha;\n}\n"
        ),
      ]),
      buildTimelineEntry("2026-04-05T00:00:00Z", [
        buildFile(
          "src/moved.js",
          "function sample() {\n  const alpha = 1;\n\n  ///// stable hold\n  return alpha;\n}\n"
        ),
      ]),
    ],
    { staleHoldDays: 2, unresolvedKillDays: 1 }
  );

  assert.equal(report.findings[0].code, "STALE_HOLD");
  assert.equal(report.findings[0].currentTierEnteredAt, "2026-04-01T00:00:00Z");
  assert.equal(report.trendSummary.continuityCounts.moved, 1);
});

test("MarkerTemporalSignalsEngine emits UNRESOLVED_KILL for a continuous current KILL lineage beyond threshold", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", [
        buildFile("src/kill.js", "////// persistent kill\n"),
      ]),
      buildTimelineEntry("2026-04-04T00:00:00Z", [
        buildFile("src/kill.js", "////// persistent kill\n"),
      ]),
    ],
    { staleHoldDays: 3, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.findings, [
    {
      code: "UNRESOLVED_KILL",
      filePath: "src/kill.js",
      currentMarker: {
        lineNumber: 1,
        tier: "KILL",
        marker: "//////",
        slashCount: 6,
        trailingText: "persistent kill",
      },
      currentTierEnteredAt: "2026-04-01T00:00:00Z",
      observedAt: "2026-04-04T00:00:00Z",
      ageDays: 3,
      thresholdDays: 1,
    },
  ]);
});

test("MarkerTemporalSignalsEngine does not emit UNRESOLVED_KILL for a newly observed current KILL", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", []),
      buildTimelineEntry("2026-04-02T00:00:00Z", [
        buildFile("src/kill.js", "////// kill now\n"),
      ]),
    ],
    { staleHoldDays: 3, unresolvedKillDays: 0 }
  );

  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.errors, []);
});

test("MarkerTemporalSignalsEngine resets current-tier KILL age when a HOLD retiers to KILL", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", [
        buildFile("src/retier.js", "///// same concern\n"),
      ]),
      buildTimelineEntry("2026-04-05T00:00:00Z", [
        buildFile("src/retier.js", "////// same concern\n"),
      ]),
    ],
    { staleHoldDays: 3, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.findings, []);
  assert.equal(report.trendSummary.continuityCounts.retiered, 1);
});

test("MarkerTemporalSignalsEngine emits UNRESOLVED_KILL from the current KILL entry after retiering and later persistence", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", [
        buildFile("src/retier.js", "///// same concern\n"),
      ]),
      buildTimelineEntry("2026-04-03T00:00:00Z", [
        buildFile("src/retier.js", "////// same concern\n"),
      ]),
      buildTimelineEntry("2026-04-06T00:00:00Z", [
        buildFile("src/retier.js", "////// same concern\n"),
      ]),
    ],
    { staleHoldDays: 3, unresolvedKillDays: 2 }
  );

  assert.deepEqual(report.findings, [
    {
      code: "UNRESOLVED_KILL",
      filePath: "src/retier.js",
      currentMarker: {
        lineNumber: 1,
        tier: "KILL",
        marker: "//////",
        slashCount: 6,
        trailingText: "same concern",
      },
      currentTierEnteredAt: "2026-04-03T00:00:00Z",
      observedAt: "2026-04-06T00:00:00Z",
      ageDays: 3,
      thresholdDays: 2,
    },
  ]);
});

test("MarkerTemporalSignalsEngine starts HOLD age when the lineage last entered HOLD", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", [
        buildFile("src/hold.js", "/// same concern\n"),
      ]),
      buildTimelineEntry("2026-04-03T00:00:00Z", [
        buildFile("src/hold.js", "///// same concern\n"),
      ]),
      buildTimelineEntry("2026-04-06T00:00:00Z", [
        buildFile("src/hold.js", "///// same concern\n"),
      ]),
    ],
    { staleHoldDays: 2, unresolvedKillDays: 1 }
  );

  assert.equal(report.findings[0].code, "STALE_HOLD");
  assert.equal(report.findings[0].currentTierEnteredAt, "2026-04-03T00:00:00Z");
  assert.equal(report.findings[0].ageDays, 3);
});

test("MarkerTemporalSignalsEngine suppresses stronger claims when the lineage is ambiguous", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", [
        buildFile("src/ambiguous.js", "///// duplicate\n"),
      ]),
      buildTimelineEntry("2026-04-06T00:00:00Z", [
        buildFile("src/ambiguous.js", "///// duplicate\n\n///// duplicate\n"),
      ]),
    ],
    { staleHoldDays: 2, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.errors, [
    {
      code: "TEMPORAL_LINEAGE_AMBIGUOUS",
      details: {
        filePath: "src/ambiguous.js",
        currentMarker: {
          lineNumber: 1,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "duplicate",
        },
      },
    },
    {
      code: "TEMPORAL_LINEAGE_AMBIGUOUS",
      details: {
        filePath: "src/ambiguous.js",
        currentMarker: {
          lineNumber: 3,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "duplicate",
        },
      },
    },
  ]);
});

test("MarkerTemporalSignalsEngine keeps no-longer-observed markers in trend summary only", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", [
        buildFile("src/gone.js", "///// old hold\n"),
      ]),
      buildTimelineEntry("2026-04-03T00:00:00Z", []),
    ],
    { staleHoldDays: 3, unresolvedKillDays: 1 }
  );

  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.errors, []);
  assert.equal(report.trendSummary.continuityCounts.noLongerObserved, 1);
  assert.equal(report.trendSummary.netTierDeltas.HOLD, -1);
});

test("MarkerTemporalSignalsEngine reports bounded trend counts and earliest-vs-latest deltas only", () => {
  const report = buildTemporalReport(
    [
      buildTimelineEntry("2026-04-01T00:00:00Z", [
        buildFile(
          "src/moved.js",
          "function sample() {\n  const alpha = 1;\n  ///// stable hold\n  return alpha;\n}\n"
        ),
        buildFile("src/old.js", "///// old hold\n"),
        buildFile("src/retier.js", "///// stable concern\n"),
      ]),
      buildTimelineEntry("2026-04-03T00:00:00Z", [
        buildFile(
          "src/moved.js",
          "function sample() {\n  const alpha = 1;\n\n  ///// stable hold\n  return alpha;\n}\n"
        ),
        buildFile("src/new.js", "//// newly observed\n"),
        buildFile("src/retier.js", "////// stable concern\n"),
      ]),
    ],
    { staleHoldDays: 10, unresolvedKillDays: 10 }
  );

  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.trendSummary, {
    earliestObservedAt: "2026-04-01T00:00:00Z",
    latestObservedAt: "2026-04-03T00:00:00Z",
    earliestTierTotals: {
      WATCH: 0,
      GAP: 0,
      HOLD: 3,
      KILL: 0,
    },
    latestTierTotals: {
      WATCH: 0,
      GAP: 1,
      HOLD: 1,
      KILL: 1,
    },
    netTierDeltas: {
      WATCH: 0,
      GAP: 1,
      HOLD: -2,
      KILL: 1,
    },
    continuityCounts: {
      matched: 2,
      newlyObserved: 1,
      noLongerObserved: 1,
      moved: 1,
      retiered: 1,
      ambiguous: 0,
    },
  });
});

test("MarkerTemporalSignalsEngine is deterministic, stateless, and keeps input unchanged", () => {
  const timelineEntries = [
    buildTimelineEntry("2026-04-01T00:00:00Z", [
      buildFile("src/hold.js", "///// stable hold\n"),
    ]),
    buildTimelineEntry("2026-04-04T00:00:00Z", [
      buildFile("src/hold.js", "///// stable hold\n"),
    ]),
  ];
  const snapshot = cloneValue(timelineEntries);

  const first = buildTemporalReport(timelineEntries, {
    staleHoldDays: 2,
    unresolvedKillDays: 1,
  });
  first.findings[0].code = "mutated";
  first.trendSummary.continuityCounts.matched = 0;

  const second = buildTemporalReport(timelineEntries, {
    staleHoldDays: 2,
    unresolvedKillDays: 1,
  });
  const third = buildTemporalReport(timelineEntries, {
    staleHoldDays: 2,
    unresolvedKillDays: 1,
  });

  assert.deepEqual(timelineEntries, snapshot);
  assert.equal(second.findings[0].code, "STALE_HOLD");
  assert.equal(second.trendSummary.continuityCounts.matched, 1);
  assert.deepEqual(second, third);
});
