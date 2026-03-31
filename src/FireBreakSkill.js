"use strict";

const SKILL_ROUTES = Object.freeze(["/fire-break"]);
const OPEN_ITEMS_BOARD_LABEL = "Open Items Board";
const FIXED_PRECEDENCE = Object.freeze([
  "Resolved this session",
  "Aging into risk",
  "Still unresolved",
  "Missing now",
]);
const REQUIRED_GROUP_LABELS = Object.freeze([
  "Missing now",
  "Still unresolved",
  "Aging into risk",
  "Resolved this session",
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

function assertStringList(value, fieldName, { allowEmpty = true } = {}) {
  if (!Array.isArray(value)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of strings`
    );
  }

  if (!allowEmpty && value.length === 0) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be a non-empty array of strings`
    );
  }

  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }
}

function cloneTextList(values) {
  return values.map((value) => `${value}`);
}

function cloneGroupItem(item) {
  const cloned = {
    itemId: item.itemId,
    summary: item.summary,
    sourceRefs: cloneTextList(item.sourceRefs),
    evidenceRefs: cloneTextList(item.evidenceRefs),
  };

  if (item.stateLabel !== undefined) {
    cloned.stateLabel = item.stateLabel;
  }

  if (item.missingItemCode !== undefined) {
    cloned.missingItemCode = item.missingItemCode;
  }

  if (item.profilePack !== undefined) {
    cloned.profilePack = item.profilePack;
  }

  return cloned;
}

function normalizeGroupItem(input, parentName) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${parentName}' must be an object`
    );
  }

  assertRequiredString(input, "itemId", parentName);
  assertRequiredString(input, "summary", parentName);
  assertStringList(input.sourceRefs || [], `${parentName}.sourceRefs`);
  assertStringList(input.evidenceRefs || [], `${parentName}.evidenceRefs`);

  if (input.stateLabel !== undefined) {
    assertRequiredString(input, "stateLabel", parentName);
  }

  if (input.missingItemCode !== undefined) {
    assertRequiredString(input, "missingItemCode", parentName);
  }

  if (input.profilePack !== undefined) {
    assertRequiredString(input, "profilePack", parentName);
  }

  return cloneGroupItem({
    itemId: input.itemId,
    summary: input.summary,
    sourceRefs: input.sourceRefs || [],
    evidenceRefs: input.evidenceRefs || [],
    stateLabel: input.stateLabel,
    missingItemCode: input.missingItemCode,
    profilePack: input.profilePack,
  });
}

function normalizeGroups(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'openItemsBoardView.groups' must be an object"
    );
  }

  const normalized = {};

  for (const groupLabel of REQUIRED_GROUP_LABELS) {
    const groupItems = input[groupLabel];
    if (!Array.isArray(groupItems)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        `'openItemsBoardView.groups.${groupLabel}' must be an array`
      );
    }

    normalized[groupLabel] = groupItems.map((item, index) =>
      normalizeGroupItem(item, `openItemsBoardView.groups.${groupLabel}[${index}]`)
    );
  }

  return normalized;
}

function assertFixedPrecedence(input) {
  assertStringList(input, "openItemsBoardView.precedence", { allowEmpty: false });

  if (input.length !== FIXED_PRECEDENCE.length) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'openItemsBoardView.precedence' must match fixed Open Items Board precedence"
    );
  }

  for (let index = 0; index < FIXED_PRECEDENCE.length; index += 1) {
    if (input[index] !== FIXED_PRECEDENCE[index]) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'openItemsBoardView.precedence' must match fixed Open Items Board precedence"
      );
    }
  }
}

function normalizeBoardView(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'openItemsBoardView' must be an object"
    );
  }

  assertRequiredString(input, "boardLabel", "openItemsBoardView");
  assertRequiredString(input, "sessionId", "openItemsBoardView");

  if (input.boardLabel !== OPEN_ITEMS_BOARD_LABEL) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      "'openItemsBoardView.boardLabel' must be 'Open Items Board'"
    );
  }

  assertFixedPrecedence(input.precedence);

  return {
    boardLabel: input.boardLabel,
    sessionId: input.sessionId,
    precedence: cloneTextList(input.precedence),
    groups: normalizeGroups(input.groups),
  };
}

function buildSnapshot(groups) {
  const missingNowCount = groups["Missing now"].length;
  const stillUnresolvedCount = groups["Still unresolved"].length;
  const agingIntoRiskCount = groups["Aging into risk"].length;
  const resolvedThisSessionCount = groups["Resolved this session"].length;

  return {
    missingNowCount,
    stillUnresolvedCount,
    agingIntoRiskCount,
    resolvedThisSessionCount,
    totalItems:
      missingNowCount +
      stillUnresolvedCount +
      agingIntoRiskCount +
      resolvedThisSessionCount,
  };
}

class FireBreakSkill {
  renderFireBreak(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.openItemsBoardView === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'openItemsBoardView' is required"
      );
    }

    const boardView = normalizeBoardView(input.openItemsBoardView);

    return {
      route: "/fire-break",
      boardLabel: boardView.boardLabel,
      sessionId: boardView.sessionId,
      precedence: boardView.precedence,
      groups: boardView.groups,
      snapshot: buildSnapshot(boardView.groups),
    };
  }
}

module.exports = {
  FireBreakSkill,
  SKILL_ROUTES,
};

