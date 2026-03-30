"use strict";

const CHANGE_ORDER_STATUSES = Object.freeze(["APPROVED", "REJECTED", "DEFERRED"]);
const CHANGE_ORDER_STATUS_SET = new Set(CHANGE_ORDER_STATUSES);
const ACTORS = new Set(["architect", "ai", "operator"]);

const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isIso8601Timestamp(value) {
  if (typeof value !== "string" || !ISO_8601_PATTERN.test(value)) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function assertRequiredString(input, fieldName) {
  if (typeof input[fieldName] !== "string" || input[fieldName].trim() === "") {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty string`
    );
  }
}

function assertRequiredStringArray(input, fieldName) {
  const value = input[fieldName];
  if (!Array.isArray(value) || value.length === 0) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty array of strings`
    );
  }

  if (value.some((entry) => typeof entry !== "string" || entry.trim() === "")) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be a non-empty array of strings`
    );
  }
}

function assertOptionalStringArray(input, fieldName) {
  if (input[fieldName] === undefined) {
    return;
  }

  if (
    !Array.isArray(input[fieldName]) ||
    input[fieldName].some((entry) => typeof entry !== "string" || entry.trim() === "")
  ) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be an array of non-empty strings when provided`
    );
  }
}

function uniqueStrings(values) {
  return [...new Set(values)];
}

function assertActor(value, fieldName) {
  if (!ACTORS.has(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'${fieldName}' must be one of: ${[...ACTORS].join(", ")}`
    );
  }
}

function assertStatus(value) {
  if (!CHANGE_ORDER_STATUS_SET.has(value)) {
    throw makeValidationError(
      "INVALID_FIELD",
      `'status' must be one of: ${CHANGE_ORDER_STATUSES.join(", ")}`
    );
  }
}

function cloneChangeOrder(changeOrder) {
  return {
    ...changeOrder,
    sourceRefs: [...changeOrder.sourceRefs],
    evidenceRefs: [...changeOrder.evidenceRefs],
  };
}

function normalizeDriftPayload(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "drift payload must be an object"
    );
  }

  assertRequiredString(input, "changeOrderId");
  assertRequiredString(input, "sessionId");
  assertRequiredString(input, "calloutType");
  assertRequiredString(input, "calloutRef");
  assertRequiredString(input, "summary");
  assertRequiredString(input, "requestedChange");
  assertRequiredString(input, "scopeBoundary");
  assertRequiredString(input, "impactStatement");
  assertRequiredStringArray(input, "sourceRefs");
  assertRequiredStringArray(input, "evidenceRefs");
  assertRequiredString(input, "createdBy");
  assertRequiredString(input, "createdAt");
  assertOptionalStringArray(input, "notes");

  if (input.calloutType !== "DRIFT") {
    throw makeValidationError(
      "INVALID_FIELD",
      "Change orders can only be generated from DRIFT callouts"
    );
  }

  assertActor(input.createdBy, "createdBy");

  if (!isIso8601Timestamp(input.createdAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'createdAt' must be an ISO 8601 timestamp"
    );
  }

  return {
    changeOrderId: input.changeOrderId,
    sessionId: input.sessionId,
    calloutType: input.calloutType,
    calloutRef: input.calloutRef,
    summary: input.summary,
    requestedChange: input.requestedChange,
    scopeBoundary: input.scopeBoundary,
    impactStatement: input.impactStatement,
    sourceRefs: uniqueStrings(input.sourceRefs),
    evidenceRefs: uniqueStrings(input.evidenceRefs),
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    notes: input.notes ? uniqueStrings(input.notes) : [],
  };
}

function normalizeDecisionInput(input) {
  if (!isPlainObject(input)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "decision input must be an object"
    );
  }

  assertRequiredString(input, "status");
  assertRequiredString(input, "decisionReason");
  assertRequiredString(input, "decisionBy");
  assertRequiredString(input, "decidedAt");

  assertStatus(input.status);
  assertActor(input.decisionBy, "decisionBy");

  if (!isIso8601Timestamp(input.decidedAt)) {
    throw makeValidationError(
      "INVALID_FIELD",
      "'decidedAt' must be an ISO 8601 timestamp"
    );
  }

  return {
    status: input.status,
    decisionReason: input.decisionReason,
    decisionBy: input.decisionBy,
    decidedAt: input.decidedAt,
  };
}

function mapDeferredToContinuity(changeOrder) {
  return {
    entryId: `co_deferred_${changeOrder.changeOrderId}`,
    entryType: "operator_deferred_decision",
    summary: `Deferred change order: ${changeOrder.summary}`,
    originSessionId: changeOrder.sessionId,
    lastSeenSessionId: changeOrder.sessionId,
    sourceRefs: uniqueStrings([
      ...changeOrder.sourceRefs,
      `change_order:${changeOrder.changeOrderId}`,
      `callout:${changeOrder.calloutRef}`,
    ]),
    evidenceRefs: uniqueStrings([...changeOrder.evidenceRefs]),
    createdBy: changeOrder.decisionBy,
    createdAt: changeOrder.decidedAt,
    notes: `Deferred Change Order promoted through continuity path (${changeOrder.changeOrderId}).`,
  };
}

function mapExecutionOutcome(changeOrder) {
  if (changeOrder.status === "APPROVED") {
    return {
      workMayContinue: true,
      driftPathState: "APPROVED_CONTINUE",
      autoRevert: false,
      continuityPromotion: null,
    };
  }

  if (changeOrder.status === "REJECTED") {
    return {
      workMayContinue: false,
      driftPathState: "REJECTED_HALT",
      autoRevert: false,
      continuityPromotion: null,
    };
  }

  return {
    workMayContinue: false,
    driftPathState: "DEFERRED_PAUSE",
    autoRevert: false,
    continuityPromotion: mapDeferredToContinuity(changeOrder),
  };
}

class ChangeOrderEngine {
  constructor(initialChangeOrders = []) {
    if (!Array.isArray(initialChangeOrders)) {
      throw makeValidationError(
        "INVALID_FIELD",
        "initial change orders must be an array"
      );
    }

    this._ordersById = new Map();

    for (const order of initialChangeOrders) {
      if (!isPlainObject(order) || typeof order.changeOrderId !== "string") {
        throw makeValidationError(
          "INVALID_FIELD",
          "initial change orders must be normalized objects"
        );
      }

      this._ordersById.set(order.changeOrderId, cloneChangeOrder(order));
    }
  }

  createFromDrift(driftPayload) {
    const normalized = normalizeDriftPayload(driftPayload);

    if (this._ordersById.has(normalized.changeOrderId)) {
      throw makeValidationError(
        "DUPLICATE_CHANGE_ORDER",
        `changeOrderId '${normalized.changeOrderId}' already exists`
      );
    }

    const changeOrder = {
      ...normalized,
      status: "DEFERRED",
      decisionReason: "Awaiting operator decision.",
      decisionBy: normalized.createdBy,
      decidedAt: normalized.createdAt,
    };

    this._ordersById.set(changeOrder.changeOrderId, changeOrder);

    return {
      changeOrder: cloneChangeOrder(changeOrder),
      executionOutcome: mapExecutionOutcome(changeOrder),
    };
  }

  decide(changeOrderId, decisionInput) {
    if (typeof changeOrderId !== "string" || changeOrderId.trim() === "") {
      throw makeValidationError(
        "INVALID_FIELD",
        "'changeOrderId' must be a non-empty string"
      );
    }

    const changeOrder = this._ordersById.get(changeOrderId);

    if (!changeOrder) {
      throw makeValidationError(
        "CHANGE_ORDER_NOT_FOUND",
        `changeOrderId '${changeOrderId}' was not found`
      );
    }

    const decision = normalizeDecisionInput(decisionInput);

    changeOrder.status = decision.status;
    changeOrder.decisionReason = decision.decisionReason;
    changeOrder.decisionBy = decision.decisionBy;
    changeOrder.decidedAt = decision.decidedAt;

    return {
      changeOrder: cloneChangeOrder(changeOrder),
      executionOutcome: mapExecutionOutcome(changeOrder),
    };
  }

  getChangeOrder(changeOrderId) {
    const changeOrder = this._ordersById.get(changeOrderId);
    return changeOrder ? cloneChangeOrder(changeOrder) : null;
  }

  listChangeOrders() {
    return Array.from(this._ordersById.values(), cloneChangeOrder);
  }
}

module.exports = {
  ChangeOrderEngine,
  CHANGE_ORDER_STATUSES,
};

