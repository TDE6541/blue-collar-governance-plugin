"use strict";

const { RestorationEngine } = require("./RestorationEngine");
const { getProjectionEligibility } = require("./RestorationProjectionAdapter");

const SKILL_ROUTES = Object.freeze(["/resolve"]);

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function recordResolve(input, state = {}, appendChainEntryFn) {
  const engine = new RestorationEngine();
  const record = engine.createRecord(input);
  const projectionEligibility = getProjectionEligibility(record);

  let chainEntryId = null;
  if (typeof appendChainEntryFn === "function") {
    const entry = appendChainEntryFn(state, {
      eventType: "restoration_recorded",
      entryType: "OPERATOR_ACTION",
      sourceArtifact: "skill:resolve",
      sourceLocation: `finding:${record.findingRef}`,
      payload: {
        action: "restoration_recorded",
        record: cloneValue(record),
      },
      sessionId: record.sessionId,
      recordedAt: record.recordedAt,
    });

    if (entry && typeof entry.entryId === "string") {
      chainEntryId = entry.entryId;
    }
  }

  return {
    route: "/resolve",
    action: "recorded",
    record: cloneValue(record),
    projectionEligibility,
    chainEntryId,
  };
}

module.exports = {
  SKILL_ROUTES,
  recordResolve,
};
