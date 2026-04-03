"use strict";

const fs = require("node:fs");
const path = require("node:path");

const COMPACTION_STATE_VERSION = 1;
const COMPACTION_STATE_FILE = "_compaction-preserved.json";
const MAX_OBSERVED_ACTIONS = 128;
const MAX_BLOCKED_ATTEMPTS = 128;
const MAX_CHAIN_ENTRIES = 128;
const SESSION_START_SOURCES = new Set(["startup", "resume", "clear", "compact"]);
const RECOVERY_SOURCES = new Set(["compact", "resume"]);

function ensurePlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function capTail(items, maxLength) {
  if (!Array.isArray(items)) {
    return [];
  }

  if (items.length <= maxLength) {
    return cloneJsonValue(items);
  }

  return cloneJsonValue(items.slice(items.length - maxLength));
}

function normalizeStopGate(stopGate) {
  if (!stopGate || typeof stopGate !== "object" || Array.isArray(stopGate)) {
    return {
      lastBlockedSignature: null,
      lastBlockedAt: null,
    };
  }

  return {
    lastBlockedSignature:
      typeof stopGate.lastBlockedSignature === "string" ? stopGate.lastBlockedSignature : null,
    lastBlockedAt: typeof stopGate.lastBlockedAt === "string" ? stopGate.lastBlockedAt : null,
  };
}

function createFallbackEmptyState(sessionId, profile) {
  const profileId =
    profile && typeof profile.profileId === "string" && profile.profileId.trim() !== ""
      ? profile.profileId
      : "conservative";

  return {
    version: 1,
    sessionId,
    profileId,
    observedActions: [],
    blockedAttempts: [],
    chainEntries: [],
    nextChainCounter: 1,
    activePermits: [],
    activeAuthorizations: [],
    stopGate: {
      lastBlockedSignature: null,
      lastBlockedAt: null,
    },
    lastWalk: null,
  };
}

function ensureSessionStateShape(state, sessionId, profile, createEmptySessionState) {
  const base =
    typeof createEmptySessionState === "function"
      ? createEmptySessionState(sessionId, profile)
      : createFallbackEmptyState(sessionId, profile);

  const sourceState =
    state && typeof state === "object" && !Array.isArray(state) ? state : {};

  base.sessionId =
    typeof sourceState.sessionId === "string" && sourceState.sessionId.trim() !== ""
      ? sourceState.sessionId
      : sessionId;
  base.profileId =
    typeof sourceState.profileId === "string" && sourceState.profileId.trim() !== ""
      ? sourceState.profileId
      : base.profileId;
  base.observedActions = capTail(sourceState.observedActions, MAX_OBSERVED_ACTIONS);
  base.blockedAttempts = capTail(sourceState.blockedAttempts, MAX_BLOCKED_ATTEMPTS);
  base.chainEntries = capTail(sourceState.chainEntries, MAX_CHAIN_ENTRIES);
  base.nextChainCounter =
    typeof sourceState.nextChainCounter === "number" && sourceState.nextChainCounter >= 1
      ? sourceState.nextChainCounter
      : (base.chainEntries.length || 0) + 1;
  base.activePermits = Array.isArray(sourceState.activePermits)
    ? cloneJsonValue(sourceState.activePermits)
    : [];
  base.activeAuthorizations = Array.isArray(sourceState.activeAuthorizations)
    ? cloneJsonValue(sourceState.activeAuthorizations)
    : [];
  base.stopGate = normalizeStopGate(sourceState.stopGate);
  base.lastWalk =
    sourceState.lastWalk && typeof sourceState.lastWalk === "object" && !Array.isArray(sourceState.lastWalk)
      ? cloneJsonValue(sourceState.lastWalk)
      : null;

  if (
    sourceState.sessionStart &&
    typeof sourceState.sessionStart === "object" &&
    !Array.isArray(sourceState.sessionStart)
  ) {
    base.sessionStart = {
      source:
        typeof sourceState.sessionStart.source === "string"
          ? sourceState.sessionStart.source
          : "startup",
      startedAt:
        typeof sourceState.sessionStart.startedAt === "string"
          ? sourceState.sessionStart.startedAt
          : null,
    };
  } else {
    base.sessionStart = null;
  }

  if (
    sourceState.recovery &&
    typeof sourceState.recovery === "object" &&
    !Array.isArray(sourceState.recovery)
  ) {
    base.recovery = {
      status:
        typeof sourceState.recovery.status === "string"
          ? sourceState.recovery.status
          : "not_required",
      detail:
        typeof sourceState.recovery.detail === "string"
          ? sourceState.recovery.detail
          : null,
      source:
        typeof sourceState.recovery.source === "string"
          ? sourceState.recovery.source
          : null,
      checkedAt:
        typeof sourceState.recovery.checkedAt === "string"
          ? sourceState.recovery.checkedAt
          : null,
    };
  } else {
    base.recovery = {
      status: "not_required",
      detail: null,
      source: null,
      checkedAt: null,
    };
  }

  return base;
}

function getCompactionStateFilePath(config) {
  return path.join(
    config.projectDir,
    config.stateDirectory || ".claude/runtime",
    COMPACTION_STATE_FILE
  );
}

function resolveSessionStartSource(input) {
  if (typeof input.source === "string" && SESSION_START_SOURCES.has(input.source)) {
    return input.source;
  }

  return "startup";
}

function isRecoverySource(source) {
  return RECOVERY_SOURCES.has(source);
}

function upsertByFingerprint(items, fingerprint, nextItem) {
  const existingIndex = items.findIndex((item) => item.fingerprint === fingerprint);
  if (existingIndex >= 0) {
    items[existingIndex] = {
      ...items[existingIndex],
      ...nextItem,
      firstObservedAt: items[existingIndex].firstObservedAt || nextItem.firstObservedAt,
    };
    return;
  }

  items.push(nextItem);
}

function summarizeBlockingFindings(lastWalk, blockingSeverities) {
  if (
    !lastWalk ||
    typeof lastWalk !== "object" ||
    Array.isArray(lastWalk) ||
    !Array.isArray(lastWalk.findings)
  ) {
    return {
      count: 0,
      topSummary: "none",
    };
  }

  const blocking = lastWalk.findings.filter(
    (finding) =>
      finding &&
      typeof finding === "object" &&
      typeof finding.severity === "string" &&
      blockingSeverities.has(finding.severity)
  );

  if (blocking.length === 0) {
    return {
      count: 0,
      topSummary: "none",
    };
  }

  const first = blocking[0];
  const findingType =
    typeof first.findingType === "string" && first.findingType.trim() !== ""
      ? first.findingType
      : "UNSPECIFIED";
  const severity =
    typeof first.severity === "string" && first.severity.trim() !== ""
      ? first.severity
      : "UNSPECIFIED";

  return {
    count: blocking.length,
    topSummary: `${findingType}/${severity}`,
  };
}

function buildSessionStateSummary(state, blockingSeverities) {
  const blocking = summarizeBlockingFindings(state.lastWalk, blockingSeverities);
  return {
    observedActionCount: Array.isArray(state.observedActions) ? state.observedActions.length : 0,
    blockedAttemptCount: Array.isArray(state.blockedAttempts) ? state.blockedAttempts.length : 0,
    lastBlockedAt:
      state.stopGate && typeof state.stopGate.lastBlockedAt === "string"
        ? state.stopGate.lastBlockedAt
        : "none",
    blockingFindingCount: blocking.count,
    topBlockingFinding: blocking.topSummary,
  };
}

function buildSessionStartAdditionalContext(state, config, recoveryMeta) {
  const summary = buildSessionStateSummary(state, config.blockingSeverities);
  const source = state.sessionStart ? state.sessionStart.source : "startup";

  const parts = [
    `Governed hook runtime active. Source=${source}.`,
    `Profile=${state.profileId || config.profile.profileId}.`,
    `ObservedActions=${summary.observedActionCount}.`,
    `BlockedAttempts=${summary.blockedAttemptCount}.`,
    `LastBlockedAt=${summary.lastBlockedAt}.`,
    `BlockingWalkFindings=${summary.blockingFindingCount} (${summary.topBlockingFinding}).`,
  ];

  if (recoveryMeta.status === "ok") {
    parts.push(`Recovery=${recoveryMeta.detail}`);
  }

  if (recoveryMeta.status === "missing" || recoveryMeta.status === "malformed") {
    parts.push(
      `RecoveryHOLD=${recoveryMeta.status}; Stop closeout remains blocked until governance state is preserved and rehydrated.`
    );
  }

  return parts.join(" ");
}

function readCompactionState(config, profile, createEmptySessionState) {
  const snapshotPath = getCompactionStateFilePath(config);
  if (!fs.existsSync(snapshotPath)) {
    return {
      status: "missing",
      detail: `No preserved compaction state at ${snapshotPath}.`,
    };
  }

  let raw;
  try {
    raw = readJsonFile(snapshotPath);
  } catch (error) {
    return {
      status: "malformed",
      detail:
        error && typeof error.message === "string"
          ? `Compaction state parse error: ${error.message}`
          : "Compaction state parse error.",
    };
  }

  try {
    ensurePlainObject(raw, "Compaction state");
    if (raw.version !== COMPACTION_STATE_VERSION) {
      throw new Error(
        `Compaction state version '${raw.version}' does not match '${COMPACTION_STATE_VERSION}'.`
      );
    }

    ensurePlainObject(raw.rehydration, "Compaction state rehydration");

    const fromSessionId =
      typeof raw.fromSessionId === "string" && raw.fromSessionId.trim() !== ""
        ? raw.fromSessionId
        : "unknown";

    const normalized = ensureSessionStateShape(
      {
        ...raw.rehydration,
        sessionId: fromSessionId,
        profileId:
          typeof raw.profileId === "string" && raw.profileId.trim() !== ""
            ? raw.profileId
            : profile.profileId,
      },
      fromSessionId,
      profile,
      createEmptySessionState
    );

    return {
      status: "ok",
      snapshot: {
        fromSessionId,
        savedAt: typeof raw.savedAt === "string" ? raw.savedAt : "unknown",
        trigger: typeof raw.trigger === "string" ? raw.trigger : "unknown",
      },
      state: normalized,
    };
  } catch (error) {
    return {
      status: "malformed",
      detail:
        error && typeof error.message === "string"
          ? `Compaction state shape error: ${error.message}`
          : "Compaction state shape error.",
    };
  }
}

function makeRecoveryHoldAction({ fingerprint, source, status, detail, now }) {
  return {
    fingerprint,
    toolName: "SessionStart",
    workItem: `Recovery HOLD for ${source}: ${status}`,
    domainId: "protected_destructive_ops",
    domainLabel: "Protected / destructive ops",
    autonomyLevel: "HARD_STOP",
    operationType: "destructive_operation",
    relativePath: undefined,
    command: undefined,
    approvalState: "permission_user_review",
    firstObservedAt: now,
    lastObservedAt: now,
    recoveryDetail: detail,
  };
}

function applyRecoveredState(state, recoveredState) {
  state.observedActions = capTail(recoveredState.observedActions, MAX_OBSERVED_ACTIONS);
  state.blockedAttempts = capTail(recoveredState.blockedAttempts, MAX_BLOCKED_ATTEMPTS);
  state.chainEntries = capTail(recoveredState.chainEntries, MAX_CHAIN_ENTRIES);
  state.nextChainCounter =
    typeof recoveredState.nextChainCounter === "number" && recoveredState.nextChainCounter >= 1
      ? recoveredState.nextChainCounter
      : (Array.isArray(state.chainEntries) ? state.chainEntries.length : 0) + 1;
  state.activePermits = Array.isArray(recoveredState.activePermits)
    ? cloneJsonValue(recoveredState.activePermits)
    : [];
  state.activeAuthorizations = Array.isArray(recoveredState.activeAuthorizations)
    ? cloneJsonValue(recoveredState.activeAuthorizations)
    : [];
  state.stopGate = normalizeStopGate(recoveredState.stopGate);
  state.lastWalk =
    recoveredState.lastWalk &&
    typeof recoveredState.lastWalk === "object" &&
    !Array.isArray(recoveredState.lastWalk)
      ? cloneJsonValue(recoveredState.lastWalk)
      : null;
  state.profileId = recoveredState.profileId || state.profileId;
}

function hasMeaningfulSessionState(state) {
  return (
    (Array.isArray(state.observedActions) && state.observedActions.length > 0) ||
    (Array.isArray(state.blockedAttempts) && state.blockedAttempts.length > 0) ||
    (Array.isArray(state.chainEntries) && state.chainEntries.length > 0) ||
    (state.lastWalk && typeof state.lastWalk === "object")
  );
}

function handleSessionStartSlice({
  input,
  config,
  options,
  createEmptySessionState,
  createToolFingerprint,
  loadSessionState,
  resolveNow,
  saveSessionState,
}) {
  const now = resolveNow(options);
  const source = resolveSessionStartSource(input);

  let state = loadSessionState(config, input.session_id);
  state = ensureSessionStateShape(state, input.session_id, config.profile, createEmptySessionState);

  state.sessionStart = {
    source,
    startedAt: now,
  };

  let recoveryMeta = {
    status: "not_required",
    detail: "No compaction recovery required for this startup source.",
  };

  if (isRecoverySource(source)) {
    if (hasMeaningfulSessionState(state)) {
      recoveryMeta = {
        status: "ok",
        detail: "Existing session-local governance state present.",
      };
    } else {
      const readResult = readCompactionState(config, config.profile, createEmptySessionState);
      if (readResult.status === "ok") {
        applyRecoveredState(state, readResult.state);
        recoveryMeta = {
          status: "ok",
          detail: `Rehydrated from session ${readResult.snapshot.fromSessionId} saved at ${readResult.snapshot.savedAt} (${readResult.snapshot.trigger}).`,
        };
      } else {
        recoveryMeta = {
          status: readResult.status,
          detail: readResult.detail,
        };

        const holdFingerprint = createToolFingerprint("RecoveryHold", {
          source,
          status: recoveryMeta.status,
          detail: recoveryMeta.detail,
        });

        upsertByFingerprint(
          state.observedActions,
          holdFingerprint,
          makeRecoveryHoldAction({
            fingerprint: holdFingerprint,
            source,
            status: recoveryMeta.status,
            detail: recoveryMeta.detail,
            now,
          })
        );

        state.observedActions = capTail(state.observedActions, MAX_OBSERVED_ACTIONS);
      }
    }
  }

  state.recovery = {
    status: recoveryMeta.status,
    detail: recoveryMeta.detail,
    source,
    checkedAt: now,
  };

  saveSessionState(config, input.session_id, state);

  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: buildSessionStartAdditionalContext(state, config, recoveryMeta),
    },
  };
}

function handlePreCompactSlice({ input, config, options, loadSessionState, resolveNow }) {
  const now = resolveNow(options);
  const currentState = loadSessionState(config, input.session_id);
  const state = ensureSessionStateShape(currentState, input.session_id, config.profile);

  const snapshot = {
    version: COMPACTION_STATE_VERSION,
    savedAt: now,
    fromSessionId: input.session_id,
    trigger: typeof input.trigger === "string" ? input.trigger : "unknown",
    profileId: state.profileId,
    summary: buildSessionStateSummary(state, config.blockingSeverities),
    rehydration: {
      observedActions: capTail(state.observedActions, MAX_OBSERVED_ACTIONS),
      blockedAttempts: capTail(state.blockedAttempts, MAX_BLOCKED_ATTEMPTS),
      chainEntries: capTail(state.chainEntries, MAX_CHAIN_ENTRIES),
      nextChainCounter:
        typeof state.nextChainCounter === "number" && state.nextChainCounter >= 1
          ? state.nextChainCounter
          : (Array.isArray(state.chainEntries) ? state.chainEntries.length : 0) + 1,
      activePermits: Array.isArray(state.activePermits)
        ? cloneJsonValue(state.activePermits)
        : [],
      activeAuthorizations: Array.isArray(state.activeAuthorizations)
        ? cloneJsonValue(state.activeAuthorizations)
        : [],
      stopGate: normalizeStopGate(state.stopGate),
      lastWalk:
        state.lastWalk && typeof state.lastWalk === "object" && !Array.isArray(state.lastWalk)
          ? cloneJsonValue(state.lastWalk)
          : null,
    },
  };

  writeJsonFile(getCompactionStateFilePath(config), snapshot);
  return {};
}

module.exports = {
  getCompactionStateFilePath,
  handlePreCompactSlice,
  handleSessionStartSlice,
};

