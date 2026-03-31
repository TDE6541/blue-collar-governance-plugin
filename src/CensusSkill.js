"use strict";

const SKILL_ROUTES = Object.freeze(["/census"]);

const REQUIRED_INVENTORY_KEYS = Object.freeze([
  "wave5bBlockA",
  "wave5bBlockB",
  "wave5bBlockC",
  "wave5bBlockD",
  "wave5bBlockE1",
  "controlRodsSlice",
  "fireBreakSlice",
]);

const REQUIRED_KEY_SURFACE_KEYS = Object.freeze([
  "readme",
  "claude",
  "repoIndex",
  "docsIndex",
  "whereToChange",
  "wave5Product",
  "block0Gate",
  "migrations",
]);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRequiredString(input, fieldName, parentName = "input") {
  const value = input[fieldName];
  if (typeof value !== "string" || value.trim() === "") {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-empty string`
    );
  }
}

function assertNonNegativeInteger(input, fieldName, parentName = "input") {
  const value = input[fieldName];
  if (!Number.isInteger(value) || value < 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}.${fieldName}' must be a non-negative integer`
    );
  }
}

function assertStringArray(value, fieldName) {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }
}

function cloneStringArray(values) {
  return values.map((value) => `${value}`);
}

function normalizeRepoIdentity(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'repoSnapshot.repoIdentity' must be an object"
    );
  }

  assertRequiredString(input, "repoRoot", "repoSnapshot.repoIdentity");
  assertRequiredString(input, "branchName", "repoSnapshot.repoIdentity");
  assertStringArray(input.remoteNames, "repoSnapshot.repoIdentity.remoteNames");

  return {
    repoRoot: input.repoRoot,
    branchName: input.branchName,
    remoteNames: cloneStringArray(input.remoteNames),
  };
}

function normalizeLocalGitPosture(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'repoSnapshot.localGitPosture' must be an object"
    );
  }

  assertNonNegativeInteger(input, "stagedCount", "repoSnapshot.localGitPosture");
  assertNonNegativeInteger(input, "modifiedCount", "repoSnapshot.localGitPosture");
  assertNonNegativeInteger(input, "untrackedCount", "repoSnapshot.localGitPosture");
  assertStringArray(input.untrackedFiles, "repoSnapshot.localGitPosture.untrackedFiles");

  return {
    stagedCount: input.stagedCount,
    modifiedCount: input.modifiedCount,
    untrackedCount: input.untrackedCount,
    untrackedFiles: cloneStringArray(input.untrackedFiles),
  };
}

function normalizeShippedInventory(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'repoSnapshot.shippedInventory' must be an object"
    );
  }

  const normalized = {};

  for (const key of REQUIRED_INVENTORY_KEYS) {
    if (typeof input[key] !== "boolean") {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'repoSnapshot.shippedInventory.${key}' must be a boolean`
      );
    }

    normalized[key] = input[key];
  }

  return normalized;
}

function normalizeArtifactCounts(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'repoSnapshot.artifactCounts' must be an object"
    );
  }

  assertNonNegativeInteger(input, "specCount", "repoSnapshot.artifactCounts");
  assertNonNegativeInteger(input, "skillCount", "repoSnapshot.artifactCounts");
  assertNonNegativeInteger(input, "srcCount", "repoSnapshot.artifactCounts");
  assertNonNegativeInteger(input, "goldenTestCount", "repoSnapshot.artifactCounts");

  return {
    specCount: input.specCount,
    skillCount: input.skillCount,
    srcCount: input.srcCount,
    goldenTestCount: input.goldenTestCount,
  };
}

function normalizeKeySurfacePresence(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'repoSnapshot.keySurfacePresence' must be an object"
    );
  }

  const normalized = {};

  for (const key of REQUIRED_KEY_SURFACE_KEYS) {
    if (typeof input[key] !== "boolean") {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'repoSnapshot.keySurfacePresence.${key}' must be a boolean`
      );
    }

    normalized[key] = input[key];
  }

  return normalized;
}

function buildSnapshot(repoIdentity, shippedInventory, keySurfacePresence) {
  const missingShippedSlices = REQUIRED_INVENTORY_KEYS.filter(
    (key) => !shippedInventory[key]
  );
  const missingKeySurfaces = REQUIRED_KEY_SURFACE_KEYS.filter(
    (key) => !keySurfacePresence[key]
  );

  return {
    remoteConfigured: repoIdentity.remoteNames.length > 0,
    shippedSliceCount: REQUIRED_INVENTORY_KEYS.length - missingShippedSlices.length,
    missingShippedSlices,
    keySurfaceCount: REQUIRED_KEY_SURFACE_KEYS.length - missingKeySurfaces.length,
    missingKeySurfaces,
  };
}

class CensusSkill {
  renderCensus(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.repoSnapshot === undefined) {
      throw makeValidationError("ERR_INVALID_INPUT", "'repoSnapshot' is required");
    }

    if (!isPlainObject(input.repoSnapshot)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'repoSnapshot' must be an object"
      );
    }

    const repoIdentity = normalizeRepoIdentity(input.repoSnapshot.repoIdentity);
    const localGitPosture = normalizeLocalGitPosture(
      input.repoSnapshot.localGitPosture
    );
    const shippedInventory = normalizeShippedInventory(
      input.repoSnapshot.shippedInventory
    );
    const artifactCounts = normalizeArtifactCounts(
      input.repoSnapshot.artifactCounts
    );
    const keySurfacePresence = normalizeKeySurfacePresence(
      input.repoSnapshot.keySurfacePresence
    );

    return {
      route: "/census",
      repoIdentity,
      localGitPosture,
      shippedInventory,
      artifactCounts,
      keySurfacePresence,
      snapshot: buildSnapshot(repoIdentity, shippedInventory, keySurfacePresence),
    };
  }
}

module.exports = {
  CensusSkill,
  SKILL_ROUTES,
};
