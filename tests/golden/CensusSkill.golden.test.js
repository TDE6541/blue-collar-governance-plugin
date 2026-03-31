"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { CensusSkill, SKILL_ROUTES } = require("../../src/CensusSkill");

function expectValidationError(action, code, message) {
  try {
    action();
    assert.fail("Expected validation error, but no error was thrown");
  } catch (error) {
    assert.equal(error.name, "ValidationError");
    assert.equal(error.code, code);
    assert.equal(error.message, `${code}: ${message}`);
  }
}

function sampleInput() {
  return {
    repoSnapshot: {
      repoIdentity: {
        repoRoot: "C:/dev/bcg-runtime",
        branchName: "main",
        remoteNames: [],
      },
      localGitPosture: {
        stagedCount: 0,
        modifiedCount: 0,
        untrackedCount: 1,
        untrackedFiles: ["WaveFiveMasterPlanReference.txt"],
      },
      shippedInventory: {
        wave5bBlockA: true,
        wave5bBlockB: true,
        wave5bBlockC: true,
        wave5bBlockD: true,
        wave5bBlockE1: true,
        controlRodsSlice: true,
        fireBreakSlice: true,
      },
      artifactCounts: {
        specCount: 30,
        skillCount: 16,
        srcCount: 27,
        goldenTestCount: 27,
      },
      keySurfacePresence: {
        readme: true,
        claude: true,
        repoIndex: true,
        docsIndex: true,
        whereToChange: true,
        wave5Product: true,
        block0Gate: true,
        migrations: true,
      },
    },
  };
}

test("CensusSkill keeps locked route list", () => {
  assert.deepEqual([...SKILL_ROUTES], ["/census"]);
});

test("/census renders deterministic repo snapshot and keeps input unchanged", () => {
  const skill = new CensusSkill();
  const input = sampleInput();
  const snapshot = JSON.parse(JSON.stringify(input));

  const viewA = skill.renderCensus(input);
  const viewB = skill.renderCensus(input);

  assert.deepEqual(input, snapshot);
  assert.deepEqual(viewA, viewB);
  assert.equal(viewA.route, "/census");
  assert.equal(viewA.repoIdentity.branchName, "main");
  assert.equal(viewA.localGitPosture.untrackedCount, 1);
  assert.equal(viewA.artifactCounts.specCount, 30);
  assert.equal(viewA.snapshot.remoteConfigured, false);
  assert.equal(viewA.snapshot.shippedSliceCount, 7);
  assert.equal(viewA.snapshot.keySurfaceCount, 8);
  assert.deepEqual(viewA.snapshot.missingShippedSlices, []);
  assert.deepEqual(viewA.snapshot.missingKeySurfaces, []);
});

test("/census requires repoSnapshot", () => {
  const skill = new CensusSkill();

  expectValidationError(
    () => skill.renderCensus({}),
    "ERR_INVALID_INPUT",
    "'repoSnapshot' is required"
  );
});

test("CensusSkill method list stays render only", () => {
  const methodNames = Object.getOwnPropertyNames(CensusSkill.prototype).sort();

  assert.deepEqual(methodNames, ["constructor", "renderCensus"]);
});
