"use strict";

const SKILL_ROUTES = Object.freeze(["/change-order"]);
const CHANGE_ORDER_STATUSES = Object.freeze(["APPROVED", "REJECTED", "DEFERRED"]);
const CHANGE_ORDER_STATUS_SET = new Set(CHANGE_ORDER_STATUSES);

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

function assertStringList(value, fieldName) {
  if (!Array.isArray(value)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of strings`
    );
  }

  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be an array of non-empty strings`
    );
  }
}

function assertStatus(value, fieldName) {
  if (!CHANGE_ORDER_STATUS_SET.has(value)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldName}' must be one of: ${CHANGE_ORDER_STATUSES.join(", ")}`
    );
  }
}

function cloneTextList(values) {
  return values.map((value) => `${value}`);
}

function normalizeChangeOrder(input, index) {
  const fieldBase = `changeOrders[${index}]`;

  if (!isPlainObject(input)) {
    throw makeValidationError(
      "ERR_INVALID_INPUT",
      `'${fieldBase}' must be an object`
    );
  }

  assertRequiredString(input, "changeOrderId", fieldBase);
  assertRequiredString(input, "status", fieldBase);
  assertRequiredString(input, "decisionReason", fieldBase);
  assertRequiredString(input, "decisionBy", fieldBase);
  assertRequiredString(input, "decidedAt", fieldBase);
  assertStringList(input.sourceRefs, `${fieldBase}.sourceRefs`);
  assertStringList(input.evidenceRefs, `${fieldBase}.evidenceRefs`);
  assertStatus(input.status, `${fieldBase}.status`);

  return {
    changeOrderId: input.changeOrderId,
    status: input.status,
    decisionReason: input.decisionReason,
    decisionBy: input.decisionBy,
    decidedAt: input.decidedAt,
    sourceRefs: cloneTextList(input.sourceRefs),
    evidenceRefs: cloneTextList(input.evidenceRefs),
  };
}

class ChangeOrderSkill {
  renderChangeOrder(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.changeOrders === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'changeOrders' is required"
      );
    }

    if (!Array.isArray(input.changeOrders)) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'changeOrders' must be an array"
      );
    }

    const changeOrders = input.changeOrders.map((entry, index) => normalizeChangeOrder(entry, index));

    return {
      route: "/change-order",
      changeOrderCount: changeOrders.length,
      changeOrders,
      snapshotState:
        changeOrders.length === 0
          ? "no change orders in current snapshot"
          : "change orders present in current snapshot",
      renderNote:
        "rendered from existing change-order snapshot and deterministic status truth",
    };
  }
}

module.exports = {
  ChangeOrderSkill,
  SKILL_ROUTES,
};
