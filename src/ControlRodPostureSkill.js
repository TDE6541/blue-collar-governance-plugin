"use strict";

const {
  ControlRodMode,
  normalizeControlRodProfileInput,
} = require("./ControlRodMode");

const SKILL_ROUTES = Object.freeze(["/control-rods"]);

function makeValidationError(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.name = "ValidationError";
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneTextList(values) {
  return values.map((value) => `${value}`);
}

function cloneDomainRule(rule) {
  return {
    domainId: rule.domainId,
    label: rule.label,
    autonomyLevel: rule.autonomyLevel,
    justification: rule.justification,
  };
}

class ControlRodPostureSkill {
  renderControlRods(input = {}) {
    if (!isPlainObject(input)) {
      throw makeValidationError("ERR_INVALID_INPUT", "'input' must be an object");
    }

    if (input.controlRodProfile === undefined) {
      throw makeValidationError(
        "ERR_INVALID_INPUT",
        "'controlRodProfile' is required"
      );
    }

    const mode = new ControlRodMode();
    const starterProfileIds = mode.listStarterProfileIds();
    const profile = normalizeControlRodProfileInput(input.controlRodProfile);

    const hardStopCount = profile.domainRules.filter(
      (rule) => rule.autonomyLevel === "HARD_STOP"
    ).length;

    const supervisedCount = profile.domainRules.filter(
      (rule) => rule.autonomyLevel === "SUPERVISED"
    ).length;

    const fullAutoCount = profile.domainRules.filter(
      (rule) => rule.autonomyLevel === "FULL_AUTO"
    ).length;

    return {
      route: "/control-rods",
      starterProfileIds: cloneTextList(starterProfileIds),
      profile: {
        profileId: profile.profileId,
        profileLabel: profile.profileLabel,
      },
      summary: {
        domainCount: profile.domainRules.length,
        hardStopCount,
        supervisedCount,
        fullAutoCount,
      },
      domains: profile.domainRules.map(cloneDomainRule),
    };
  }
}

module.exports = {
  ControlRodPostureSkill,
  SKILL_ROUTES,
};
