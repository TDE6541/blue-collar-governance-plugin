"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ConfidenceGradientEngine,
} = require("../../src/ConfidenceGradientEngine");
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
  });

  const forbiddenFields = ["score", "trendLine", "healthPercentage", "reviewedClean"];
  for (const field of forbiddenFields) {
    assert.equal(Object.prototype.hasOwnProperty.call(rendered, field), false);
  }
  assert.equal(
    Object.prototype.hasOwnProperty.call(rendered.requiredCoverage, "reviewedClean"),
    false
  );

  const methodNames = Object.getOwnPropertyNames(ConfidenceSkill.prototype).sort();
  assert.deepEqual(methodNames, ["constructor", "renderConfidence"]);
  assert.equal(typeof skill.write, "undefined");
  assert.equal(typeof skill.persist, "undefined");
  assert.equal(typeof skill.mutate, "undefined");
});
