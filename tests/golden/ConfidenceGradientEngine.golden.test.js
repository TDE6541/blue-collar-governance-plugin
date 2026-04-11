"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ConfidenceGradientEngine,
  MARKER_FAMILY,
  REQUIRED_COVERAGE_MISSING_CODE,
  REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT,
  REQUIRED_COVERAGE_POLICY_MODE,
  REQUIRED_COVERAGE_POLICY_VERSION,
  RESERVED_MARKER_FAMILY,
  SCAN_FENCE,
  TIER_DEFINITIONS,
  TIER_ORDER,
  UNCLASSIFIED_DOMAIN,
} = require("../../src/ConfidenceGradientEngine");

function buildFile(filePath, content) {
  return {
    filePath,
    content,
  };
}

function buildPolicy(targets, version = REQUIRED_COVERAGE_POLICY_VERSION) {
  return {
    version,
    targets,
  };
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

test("ConfidenceGradientEngine locks marker family, reserved family, tier ladder, and scan fence", () => {
  assert.equal(MARKER_FAMILY, "slash");
  assert.equal(RESERVED_MARKER_FAMILY, "semicolon");
  assert.deepEqual([...TIER_ORDER], ["WATCH", "GAP", "HOLD", "KILL"]);
  assert.deepEqual(
    TIER_DEFINITIONS.map((definition) => ({
      tier: definition.tier,
      marker: definition.marker,
      slashCount: definition.slashCount,
    })),
    [
      { tier: "WATCH", marker: "///", slashCount: 3 },
      { tier: "GAP", marker: "////", slashCount: 4 },
      { tier: "HOLD", marker: "/////", slashCount: 5 },
      { tier: "KILL", marker: "//////", slashCount: 6 },
    ]
  );
  assert.deepEqual(SCAN_FENCE, {
    roots: ["src", "hooks", "scripts", ".claude"],
    extension: ".js",
  });
});

test("ConfidenceGradientEngine detects WATCH markers deterministically", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([buildFile("src/watch.js", "/// watch\n")]);

  assert.equal(report.totals.markerCount, 1);
  assert.equal(report.totals.tierTotals.WATCH, 1);
  assert.equal(report.files[0].markers[0].tier, "WATCH");
  assert.equal(report.files[0].markers[0].marker, "///");
});

test("ConfidenceGradientEngine detects GAP markers deterministically", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([buildFile("src/gap.js", "//// gap\n")]);

  assert.equal(report.totals.markerCount, 1);
  assert.equal(report.totals.tierTotals.GAP, 1);
  assert.equal(report.files[0].markers[0].tier, "GAP");
  assert.equal(report.files[0].markers[0].marker, "////");
});

test("ConfidenceGradientEngine detects HOLD markers deterministically", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([buildFile("src/hold.js", "///// hold\n")]);

  assert.equal(report.totals.markerCount, 1);
  assert.equal(report.totals.tierTotals.HOLD, 1);
  assert.equal(report.files[0].markers[0].tier, "HOLD");
  assert.equal(report.files[0].markers[0].marker, "/////");
});

test("ConfidenceGradientEngine detects KILL markers deterministically", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([buildFile("src/kill.js", "////// kill\n")]);

  assert.equal(report.totals.markerCount, 1);
  assert.equal(report.totals.tierTotals.KILL, 1);
  assert.equal(report.files[0].markers[0].tier, "KILL");
  assert.equal(report.files[0].markers[0].marker, "//////");
});

test("ConfidenceGradientEngine treats exact two slashes as a non-marker", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([buildFile("src/nope.js", "// not a marker\n")]);

  assert.equal(report.totals.markerCount, 0);
  assert.deepEqual(report.files, []);
});

test("ConfidenceGradientEngine treats seven-or-more slashes as a divider non-marker", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([
    buildFile("src/divider.js", "/////// divider\n//////// still a divider\n"),
  ]);

  assert.equal(report.totals.markerCount, 0);
  assert.deepEqual(report.files, []);
});

test("ConfidenceGradientEngine rejects malformed slash runs without delimiter", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([buildFile("src/malformed.js", "///foo\n////bar\n")]);

  assert.equal(report.totals.markerCount, 0);
  assert.deepEqual(report.files, []);
});

test("ConfidenceGradientEngine ignores mid-line slash runs", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([
    buildFile("src/midline.js", "const x = 1; ///// not line leading\n"),
  ]);

  assert.equal(report.totals.markerCount, 0);
  assert.deepEqual(report.files, []);
});

test("ConfidenceGradientEngine accepts optional indentation and exact delimiter handling", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([
    buildFile(
      "src/indented.js",
      "\t///\twatch\n  //// gap\n\t\t///// hold\n//////\n"
    ),
  ]);

  assert.equal(report.totals.markerCount, 4);
  assert.deepEqual(
    report.files[0].markers.map((marker) => ({
      lineNumber: marker.lineNumber,
      tier: marker.tier,
      marker: marker.marker,
    })),
    [
      { lineNumber: 1, tier: "WATCH", marker: "///" },
      { lineNumber: 2, tier: "GAP", marker: "////" },
      { lineNumber: 3, tier: "HOLD", marker: "/////" },
      { lineNumber: 4, tier: "KILL", marker: "//////" },
    ]
  );
});

test("ConfidenceGradientEngine returns an empty deterministic report for empty input", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([]);

  assert.equal(report.markerFamily, "slash");
  assert.equal(report.totals.scannedFileCount, 0);
  assert.equal(report.totals.markerFileCount, 0);
  assert.equal(report.totals.markerCount, 0);
  assert.deepEqual(report.totals.tierTotals, {
    WATCH: 0,
    GAP: 0,
    HOLD: 0,
    KILL: 0,
  });
  assert.deepEqual(report.files, []);
  assert.deepEqual(report.domainGroups, []);
});

test("ConfidenceGradientEngine is deterministic, stateless, and keeps input unchanged", () => {
  const engine = new ConfidenceGradientEngine();
  const input = [
    buildFile("src/repeat.js", "///// first\n////// second\n"),
  ];
  const snapshot = cloneValue(input);

  const first = engine.scan(input);
  first.files[0].markers[0].tier = "WATCH";
  first.domainGroups[0].filePaths[0] = "mutated";

  const second = engine.scan(input);
  const third = engine.scan(input);

  assert.deepEqual(input, snapshot);
  assert.equal(second.files[0].markers[0].tier, "HOLD");
  assert.equal(second.domainGroups[0].filePaths[0], "src/repeat.js");
  assert.deepEqual(second, third);
});

test("ConfidenceGradientEngine enforces the Phase 1 scan fence", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([
    buildFile("docs/specs/not-scanned.js", "///// docs\n"),
    buildFile("tests/golden/not-scanned.js", "///// tests\n"),
    buildFile("skills/not-scanned.js", "///// skills\n"),
    buildFile("raw/not-scanned.js", "///// raw\n"),
    buildFile(".git/not-scanned.js", "///// git\n"),
    buildFile("node_modules/not-scanned.js", "///// modules\n"),
    buildFile("src/not-scanned.md", "///// markdown\n"),
    buildFile("hooks/scanned.js", "///// hook marker\n"),
  ]);

  assert.equal(report.totals.scannedFileCount, 1);
  assert.equal(report.totals.markerFileCount, 1);
  assert.equal(report.files.length, 1);
  assert.equal(report.files[0].filePath, "hooks/scanned.js");
});

test("ConfidenceGradientEngine groups marker files by ControlRodMode path-specific domains", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([
    buildFile("scripts/quote-builder.js", "//// quote risk\n"),
    buildFile("src/security-audit.js", "/// auth watch\n"),
  ]);

  assert.deepEqual(
    report.files.map((file) => ({
      filePath: file.filePath,
      domainId: file.domain.domainId,
    })),
    [
      { filePath: "scripts/quote-builder.js", domainId: "pricing_quote_logic" },
      { filePath: "src/security-audit.js", domainId: "auth_security_surfaces" },
    ]
  );
  assert.deepEqual(
    report.domainGroups.map((group) => group.domainId),
    ["pricing_quote_logic", "auth_security_surfaces"]
  );
});

test("ConfidenceGradientEngine routes unmatched marker files to the unclassified fallback", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([
    buildFile("src/ConfidenceGradientEngine.js", "///// unclassified hold\n"),
  ]);

  assert.equal(report.files[0].domain.domainId, UNCLASSIFIED_DOMAIN.domainId);
  assert.equal(report.files[0].domain.label, UNCLASSIFIED_DOMAIN.label);
  assert.equal(report.domainGroups[0].domainId, UNCLASSIFIED_DOMAIN.domainId);
});

test("ConfidenceGradientEngine keeps .claude-rooted paths anchored under .claude during normalization", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([
    buildFile(
      "C:\\dev\\Blue Collar Governance Plugin\\.claude\\hooks\\run-governance-hook.js",
      "///// anchored under .claude\n"
    ),
  ]);

  assert.equal(report.totals.scannedFileCount, 1);
  assert.equal(report.files[0].filePath, ".claude/hooks/run-governance-hook.js");
});

test("ConfidenceGradientEngine required coverage passes when an opted-in file has one slash-family marker", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [buildFile("src/HookRuntime.js", "/// covered\n")],
    buildPolicy([{ id: "hook-runtime-core", filePath: "src/HookRuntime.js" }])
  );

  assert.deepEqual(report, {
    policyMode: REQUIRED_COVERAGE_POLICY_MODE,
    markerFamily: MARKER_FAMILY,
    targetCount: 1,
    evaluatedTargetCount: 1,
    findings: [],
    policyErrors: [],
  });
});

test("ConfidenceGradientEngine required coverage emits REQUIRED_COVERAGE_MISSING when an opted-in file has zero slash-family markers", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [buildFile("src/HookRuntime.js", "const runtime = true;\n")],
    buildPolicy([{ id: "hook-runtime-core", filePath: "src/HookRuntime.js" }])
  );

  assert.deepEqual(report.findings, [
    {
      code: REQUIRED_COVERAGE_MISSING_CODE,
      policyTargetId: "hook-runtime-core",
      filePath: "src/HookRuntime.js",
      domain: UNCLASSIFIED_DOMAIN,
      markerCount: 0,
      minimumMarkerCount: REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT,
    },
  ]);
  assert.deepEqual(report.policyErrors, []);
});

test("ConfidenceGradientEngine required coverage ignores non-opted files with zero slash-family markers", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [
      buildFile("src/HookRuntime.js", "/// covered\n"),
      buildFile("src/not-opted.js", "const runtime = true;\n"),
    ],
    buildPolicy([{ id: "hook-runtime-core", filePath: "src/HookRuntime.js" }])
  );

  assert.equal(report.evaluatedTargetCount, 1);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.policyErrors, []);
});

test("ConfidenceGradientEngine required coverage emits POLICY_TARGET_OUTSIDE_SCAN_FENCE for targets outside the scan fence", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [buildFile("src/HookRuntime.js", "/// covered\n")],
    buildPolicy([
      { id: "docs-spec", filePath: "docs/specs/CONFIDENCE_REQUIRED_COVERAGE.md" },
    ])
  );

  assert.equal(report.evaluatedTargetCount, 0);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.policyErrors, [
    {
      code: "POLICY_TARGET_OUTSIDE_SCAN_FENCE",
      policyTargetId: "docs-spec",
      filePath: "docs/specs/CONFIDENCE_REQUIRED_COVERAGE.md",
    },
  ]);
});

test("ConfidenceGradientEngine required coverage emits POLICY_TARGET_NOT_IN_SCAN_INPUT for valid targets missing from the scan input", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [buildFile("src/other.js", "/// covered\n")],
    buildPolicy([{ id: "hook-runtime-core", filePath: "src/HookRuntime.js" }])
  );

  assert.equal(report.evaluatedTargetCount, 0);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.policyErrors, [
    {
      code: "POLICY_TARGET_NOT_IN_SCAN_INPUT",
      policyTargetId: "hook-runtime-core",
      filePath: "src/HookRuntime.js",
    },
  ]);
});

test("ConfidenceGradientEngine required coverage emits POLICY_TARGET_DUPLICATE for duplicate target ids", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [buildFile("src/one.js", "/// covered\n")],
    buildPolicy([
      { id: "dup", filePath: "src/one.js" },
      { id: "dup", filePath: "src/two.js" },
    ])
  );

  assert.equal(report.evaluatedTargetCount, 1);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.policyErrors, [
    {
      code: "POLICY_TARGET_DUPLICATE",
      policyTargetId: "dup",
      filePath: "src/two.js",
    },
  ]);
});

test("ConfidenceGradientEngine required coverage emits POLICY_TARGET_DUPLICATE for duplicate normalized file paths", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [buildFile("src/dup.js", "/// covered\n")],
    buildPolicy([
      {
        id: "first",
        filePath: "C:\\dev\\Blue Collar Governance Plugin\\src\\dup.js",
      },
      { id: "second", filePath: "src/dup.js" },
    ])
  );

  assert.equal(report.evaluatedTargetCount, 1);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.policyErrors, [
    {
      code: "POLICY_TARGET_DUPLICATE",
      policyTargetId: "second",
      filePath: "src/dup.js",
    },
  ]);
});

test("ConfidenceGradientEngine required coverage treats semicolon-only content as missing coverage", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [buildFile("src/HookRuntime.js", ";;;; reserved\n")],
    buildPolicy([{ id: "hook-runtime-core", filePath: "src/HookRuntime.js" }])
  );

  assert.equal(report.evaluatedTargetCount, 1);
  assert.deepEqual(report.findings, [
    {
      code: REQUIRED_COVERAGE_MISSING_CODE,
      policyTargetId: "hook-runtime-core",
      filePath: "src/HookRuntime.js",
      domain: UNCLASSIFIED_DOMAIN,
      markerCount: 0,
      minimumMarkerCount: REQUIRED_COVERAGE_MINIMUM_MARKER_COUNT,
    },
  ]);
});

test("ConfidenceGradientEngine required coverage validates policy version deterministically", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [buildFile("src/HookRuntime.js", "/// covered\n")],
    buildPolicy([{ id: "hook-runtime-core", filePath: "src/HookRuntime.js" }], 2)
  );

  assert.equal(report.targetCount, 1);
  assert.equal(report.evaluatedTargetCount, 0);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.policyErrors, [
    {
      code: "POLICY_TARGET_INVALID",
      policyTargetId: null,
      filePath: null,
    },
  ]);
});

test("ConfidenceGradientEngine required coverage validates malformed policy targets deterministically", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [buildFile("src/HookRuntime.js", "/// covered\n")],
    buildPolicy([{ id: "", filePath: "src/HookRuntime.js" }])
  );

  assert.equal(report.targetCount, 1);
  assert.equal(report.evaluatedTargetCount, 0);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.policyErrors, [
    {
      code: "POLICY_TARGET_INVALID",
      policyTargetId: null,
      filePath: "src/HookRuntime.js",
    },
  ]);
});

test("ConfidenceGradientEngine required coverage keeps Windows and .claude normalization coherent with Phase 1", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.evaluateRequiredCoverage(
    [
      buildFile(
        "C:\\dev\\Blue Collar Governance Plugin\\.claude\\hooks\\run-governance-hook.js",
        "///// covered\n"
      ),
    ],
    buildPolicy([
      {
        id: "claude-hook",
        filePath:
          "C:\\dev\\Blue Collar Governance Plugin\\.claude\\hooks\\run-governance-hook.js",
      },
    ])
  );

  assert.equal(report.evaluatedTargetCount, 1);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.policyErrors, []);
});

test("ConfidenceGradientEngine required coverage is additive and does not change scan(files) results for existing callers", () => {
  const engine = new ConfidenceGradientEngine();
  const files = [buildFile("src/repeat.js", "///// hold\n")];

  const firstScan = engine.scan(files);
  const requiredCoverage = engine.evaluateRequiredCoverage(
    files,
    buildPolicy([{ id: "repeat-core", filePath: "src/repeat.js" }])
  );
  const secondScan = engine.scan(files);

  assert.deepEqual(requiredCoverage.findings, []);
  assert.deepEqual(requiredCoverage.policyErrors, []);
  assert.deepEqual(firstScan, secondScan);
});

test("ConfidenceGradientEngine ignores semicolon-family markers in Phase 1", () => {
  const engine = new ConfidenceGradientEngine();
  const report = engine.scan([
    buildFile("src/semicolon.js", ";;;; not shipped\n"),
  ]);

  assert.equal(report.totals.markerCount, 0);
  assert.deepEqual(report.files, []);
});

