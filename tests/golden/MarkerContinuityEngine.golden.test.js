"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ConfidenceGradientEngine,
} = require("../../src/ConfidenceGradientEngine");
const {
  AMBIGUOUS_STATUS,
  COMPARISON_VERSION,
  MATCHED_STATUS,
  MATCH_FLAGS,
  MarkerContinuityEngine,
  NEWLY_OBSERVED_STATUS,
  NO_LONGER_OBSERVED_STATUS,
} = require("../../src/MarkerContinuityEngine");

function buildFile(filePath, content) {
  return {
    filePath,
    content,
  };
}

function buildSnapshot(files) {
  const engine = new ConfidenceGradientEngine();
  return engine.buildSnapshot(files);
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
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

test("MarkerContinuityEngine locks comparison version, statuses, and match flags", () => {
  assert.equal(COMPARISON_VERSION, 1);
  assert.equal(MATCHED_STATUS, "MATCHED");
  assert.equal(NEWLY_OBSERVED_STATUS, "NEWLY_OBSERVED");
  assert.equal(NO_LONGER_OBSERVED_STATUS, "NO_LONGER_OBSERVED");
  assert.equal(AMBIGUOUS_STATUS, "AMBIGUOUS");
  assert.deepEqual(MATCH_FLAGS, ["moved", "retiered"]);
});

test("MarkerContinuityEngine returns bootstrap-only empty comparison truth when no previous snapshot is supplied", () => {
  const engine = new MarkerContinuityEngine();
  const currentSnapshot = buildSnapshot([
    buildFile("src/current.js", "///// current hold\n"),
  ]);

  const report = engine.compare(null, currentSnapshot);

  assert.deepEqual(report, {
    comparisonVersion: COMPARISON_VERSION,
    markerFamily: "slash",
    previousSnapshotVersion: null,
    currentSnapshotVersion: 1,
    continuityChanges: [],
    ambiguousCases: [],
  });
});

test("MarkerContinuityEngine matches identical snapshots with no flags", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile(
      "src/sample.js",
      "function sample() {\n  ///// stable hold\n  return true;\n}\n"
    ),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile(
      "src/sample.js",
      "function sample() {\n  ///// stable hold\n  return true;\n}\n"
    ),
  ]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(report.continuityChanges, [
    {
      status: "MATCHED",
      filePath: "src/sample.js",
      flags: [],
      previousMarker: {
        lineNumber: 2,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
        trailingText: "stable hold",
      },
      currentMarker: {
        lineNumber: 2,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
        trailingText: "stable hold",
      },
    },
  ]);
  assert.deepEqual(report.ambiguousCases, []);
});

test("MarkerContinuityEngine marks same anchor at a different line in the same file as moved", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile(
      "src/moved.js",
      "function sample() {\n  const alpha = 1;\n  ///// stable hold\n  return alpha;\n}\n"
    ),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile(
      "src/moved.js",
      "function sample() {\n  const alpha = 1;\n\n  ///// stable hold\n  return alpha;\n}\n"
    ),
  ]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(report.continuityChanges[0], {
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
  });
});

test("MarkerContinuityEngine marks same anchor with a different tier as retiered", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile(
      "src/retiered.js",
      "function sample() {\n  ///// stable hold\n  return true;\n}\n"
    ),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile(
      "src/retiered.js",
      "function sample() {\n  //// stable hold\n  return true;\n}\n"
    ),
  ]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(report.continuityChanges[0].flags, ["retiered"]);
  assert.equal(report.continuityChanges[0].previousMarker.tier, "HOLD");
  assert.equal(report.continuityChanges[0].currentMarker.tier, "GAP");
});

test("MarkerContinuityEngine marks same anchor with movement and retiering together when both changes occur", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile(
      "src/both.js",
      "function sample() {\n  const alpha = 1;\n  ///// stable hold\n  return alpha;\n}\n"
    ),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile(
      "src/both.js",
      "function sample() {\n  const alpha = 1;\n\n  //// stable hold\n  return alpha;\n}\n"
    ),
  ]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(report.continuityChanges[0].flags, ["moved", "retiered"]);
});

test("MarkerContinuityEngine reports current-only markers as newly observed", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([]);
  const currentSnapshot = buildSnapshot([
    buildFile("src/current-only.js", "///// observed now\n"),
  ]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(report.continuityChanges, [
    {
      status: "NEWLY_OBSERVED",
      filePath: "src/current-only.js",
      currentMarker: {
        lineNumber: 1,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
        trailingText: "observed now",
      },
    },
  ]);
  assert.deepEqual(report.ambiguousCases, []);
});

test("MarkerContinuityEngine reports previous-only markers as no longer observed", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile("src/previous-only.js", "///// observed before\n"),
  ]);
  const currentSnapshot = buildSnapshot([]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(report.continuityChanges, [
    {
      status: "NO_LONGER_OBSERVED",
      filePath: "src/previous-only.js",
      previousMarker: {
        lineNumber: 1,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
        trailingText: "observed before",
      },
    },
  ]);
  assert.deepEqual(report.ambiguousCases, []);
});

test("MarkerContinuityEngine preserves ambiguity when one previous marker has two plausible current candidates", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile("src/ambiguous-current.js", "///// duplicate\n"),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile("src/ambiguous-current.js", "///// duplicate\n\n///// duplicate\n"),
  ]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(report.continuityChanges, []);
  assert.deepEqual(report.ambiguousCases, [
    {
      status: "AMBIGUOUS",
      filePath: "src/ambiguous-current.js",
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

test("MarkerContinuityEngine preserves ambiguity when one current marker has two plausible previous candidates", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile("src/ambiguous-previous.js", "///// duplicate\n\n///// duplicate\n"),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile("src/ambiguous-previous.js", "///// duplicate\n"),
  ]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(report.continuityChanges, []);
  assert.deepEqual(report.ambiguousCases, [
    {
      status: "AMBIGUOUS",
      filePath: "src/ambiguous-previous.js",
      previousCandidates: [
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
      currentCandidates: [
        {
          lineNumber: 1,
          tier: "HOLD",
          marker: "/////",
          slashCount: 5,
          trailingText: "duplicate",
        },
      ],
    },
  ]);
});

test("MarkerContinuityEngine treats path changes as file-local disappearance plus new observation", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile("src/old-path.js", "///// stable hold\n"),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile("src/new-path.js", "///// stable hold\n"),
  ]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(report.continuityChanges, [
    {
      status: "NEWLY_OBSERVED",
      filePath: "src/new-path.js",
      currentMarker: {
        lineNumber: 1,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
        trailingText: "stable hold",
      },
    },
    {
      status: "NO_LONGER_OBSERVED",
      filePath: "src/old-path.js",
      previousMarker: {
        lineNumber: 1,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
        trailingText: "stable hold",
      },
    },
  ]);
});

test("MarkerContinuityEngine uses trailing text as optional support when the primary fingerprint collides", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile("src/text-support.js", "///// first\n\n///// second\n"),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile("src/text-support.js", "///// second\n\n///// first\n"),
  ]);

  const report = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(
    report.continuityChanges
      .map((change) => ({
        status: change.status,
        previousText: change.previousMarker.trailingText,
        currentText: change.currentMarker.trailingText,
      }))
      .sort((left, right) => left.previousText.localeCompare(right.previousText)),
    [
      { status: "MATCHED", previousText: "first", currentText: "first" },
      { status: "MATCHED", previousText: "second", currentText: "second" },
    ]
  );
  assert.deepEqual(report.ambiguousCases, []);
});

test("MarkerContinuityEngine keeps comparison output deterministic and leaves inputs unchanged", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile("src/repeat.js", "///// stable hold\n"),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile("src/repeat.js", "//// stable hold\n"),
  ]);
  const previousClone = cloneValue(previousSnapshot);
  const currentClone = cloneValue(currentSnapshot);

  const first = engine.compare(previousSnapshot, currentSnapshot);
  first.continuityChanges[0].flags[0] = "mutated";
  const second = engine.compare(previousSnapshot, currentSnapshot);
  const third = engine.compare(previousSnapshot, currentSnapshot);

  assert.deepEqual(previousSnapshot, previousClone);
  assert.deepEqual(currentSnapshot, currentClone);
  assert.deepEqual(second, third);
  assert.deepEqual(second.continuityChanges[0].flags, ["retiered"]);
});

test("MarkerContinuityEngine rejects marker-family mismatch fail-closed", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile("src/sample.js", "///// stable hold\n"),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile("src/sample.js", "///// stable hold\n"),
  ]);
  previousSnapshot.markerFamily = "semicolon";

  expectValidationError(
    () => engine.compare(previousSnapshot, currentSnapshot),
    "ERR_INVALID_INPUT",
    "'previousSnapshot.markerFamily' must be 'slash'"
  );
});

test("MarkerContinuityEngine rejects malformed snapshot versions fail-closed", () => {
  const engine = new MarkerContinuityEngine();
  const previousSnapshot = buildSnapshot([
    buildFile("src/sample.js", "///// stable hold\n"),
  ]);
  const currentSnapshot = buildSnapshot([
    buildFile("src/sample.js", "///// stable hold\n"),
  ]);
  currentSnapshot.snapshotVersion = 2;

  expectValidationError(
    () => engine.compare(previousSnapshot, currentSnapshot),
    "ERR_INVALID_INPUT",
    "'currentSnapshot.snapshotVersion' must be 1"
  );
});
