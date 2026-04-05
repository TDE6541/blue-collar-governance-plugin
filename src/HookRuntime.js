"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { ControlRodMode } = require("./ControlRodMode");
const { ForemansWalk } = require("./ForemansWalk");
const {
  getCompactionStateFilePath,
  handlePreCompactSlice,
  handleSessionStartSlice,
} = require("./HookRuntimeSlice2");

const HOOK_RUNTIME_VERSION = 1;
const DEFAULT_PROFILE_ID = "conservative";
const DEFAULT_STATE_DIRECTORY = ".claude/runtime";
const DEFAULT_MATCHED_TOOLS = Object.freeze(["Bash", "Write", "Edit"]);
const DEFAULT_BLOCKING_SEVERITIES = Object.freeze(["CRITICAL", "HIGH"]);
const WALK_COMPLETED_APPROVAL_STATES = Object.freeze([
  "pretool_full_auto",
  "permission_full_auto_allow",
  "permission_user_review",
  "permitted_hard_stop",
]);
const FIRE_BREAK_BOARD_LABEL = "Open Items Board";
const FIRE_BREAK_GROUP_LABELS = Object.freeze({
  MISSING_NOW: "Missing now",
  STILL_UNRESOLVED: "Still unresolved",
  AGING_INTO_RISK: "Aging into risk",
  RESOLVED_THIS_SESSION: "Resolved this session",
});
const FIRE_BREAK_PRECEDENCE = Object.freeze([
  FIRE_BREAK_GROUP_LABELS.RESOLVED_THIS_SESSION,
  FIRE_BREAK_GROUP_LABELS.AGING_INTO_RISK,
  FIRE_BREAK_GROUP_LABELS.STILL_UNRESOLVED,
  FIRE_BREAK_GROUP_LABELS.MISSING_NOW,
]);
const FIRE_BREAK_STATE_LABELS = Object.freeze({
  MISSING_NOW: "Blocked HARD_STOP",
  RESOLVED_THIS_SESSION: "Hook-runtime governance passage",
});

const PROJECT_HARD_STOP_DENY_RULES = Object.freeze([
  "Bash(rm *)",
  "Bash(del *)",
  "Bash(rd *)",
  "Bash(rmdir *)",
  "Bash(Remove-Item *)",
  "Bash(git clean *)",
  "Bash(git reset --hard *)",
  "Edit(/**/*pricing*.*)",
  "Edit(/**/*quote*.*)",
  "Edit(/**/*customer*.*)",
  "Edit(/**/*pii*.*)",
  "Edit(/**/*schema*.*)",
  "Edit(/migrations/**)",
  "Edit(/**/auth.*)",
  "Edit(/**/auth-*.*)",
  "Edit(/**/auth_*.*)",
  "Edit(/**/*-auth.*)",
  "Edit(/**/*_auth.*)",
  "Edit(/**/*.auth.*)",
  "Edit(/**/*oauth*.*)",
  "Edit(/**/*authent*.*)",
  "Edit(/**/*authoriz*.*)",
  "Edit(/**/*authz*.*)",
  "Edit(/**/*security*.*)",
]);

const KNOWN_HOOK_EVENTS = new Set([
  "SessionStart",
  "PreCompact",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "Stop",
  "ConfigChange",
  "CwdChanged",
  "FileChanged",
  "InstructionsLoaded",
]);

const MAX_CHAIN_ENTRIES = 128;
const MAX_LOADED_INSTRUCTIONS = 64;

const AUTONOMY_PRIORITY = Object.freeze({
  HARD_STOP: 3,
  SUPERVISED: 2,
  FULL_AUTO: 1,
});

const DOMAIN_PRIORITY = Object.freeze({
  protected_destructive_ops: 100,
  pricing_quote_logic: 95,
  customer_data_pii: 95,
  database_schema: 95,
  auth_security_surfaces: 95,
  documentation_comments: 60,
  test_files: 60,
  ui_styling_content: 60,
  existing_file_modification: 20,
  new_file_creation: 20,
});

const BASH_HARD_STOP_MATCHERS = Object.freeze([
  {
    domainId: "protected_destructive_ops",
    operationType: "delete",
    pattern: /(^|\s)(rm|del|rd|rmdir)\b|Remove-Item\b/i,
  },
  {
    domainId: "protected_destructive_ops",
    operationType: "destructive_operation",
    pattern: /git\s+clean\b|git\s+reset\s+--hard\b/i,
  },
  {
    domainId: "database_schema",
    operationType: "migration_change",
    pattern: /\bmigration\b|\bmigrate\b/i,
  },
  {
    domainId: "database_schema",
    operationType: "ddl_change",
    pattern: /\bschema\b|\bddl\b/i,
  },
  {
    domainId: "auth_security_surfaces",
    operationType: "auth_change",
    pattern: /\bauth\b/i,
  },
  {
    domainId: "auth_security_surfaces",
    operationType: "security_change",
    pattern: /\bsecurity\b/i,
  },
  {
    domainId: "pricing_quote_logic",
    operationType: "change_rules",
    pattern: /\bpricing\b|\bquote\b/i,
  },
]);

const GLOB_REGEX_CACHE = new Map();

function stableStringify(value) {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).filter((key) => value[key] !== undefined).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function sha1(value) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

function ensurePlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function normalizeToolInputForHash(toolInput) {
  if (!toolInput || typeof toolInput !== "object" || Array.isArray(toolInput)) {
    return {};
  }

  const normalized = {};
  for (const key of Object.keys(toolInput).sort()) {
    normalized[key] = toolInput[key];
  }
  return normalized;
}

function createToolFingerprint(toolName, toolInput) {
  return sha1(
    stableStringify({
      toolName,
      toolInput: normalizeToolInputForHash(toolInput),
    })
  );
}

function patternSpecificity(pattern) {
  return pattern.replace(/[*?]/g, "").length;
}

function globToRegExp(glob) {
  if (GLOB_REGEX_CACHE.has(glob)) {
    return GLOB_REGEX_CACHE.get(glob);
  }

  let normalized = toPosixPath(glob).replace(/^\.\//, "");
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }

  let source = "^";
  for (let index = 0; index < normalized.length; ) {
    const current = normalized[index];

    if (current === "*") {
      const next = normalized[index + 1];
      if (next === "*") {
        const after = normalized[index + 2];
        if (after === "/") {
          source += "(?:.*/)?";
          index += 3;
          continue;
        }

        source += ".*";
        index += 2;
        continue;
      }

      source += "[^/]*";
      index += 1;
      continue;
    }

    if (current === "?") {
      source += "[^/]";
      index += 1;
      continue;
    }

    source += current.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    index += 1;
  }

  source += "$";

  const regex = new RegExp(source, "i");
  GLOB_REGEX_CACHE.set(glob, regex);
  return regex;
}

function matchesGlob(pattern, relativePath) {
  return globToRegExp(pattern).test(relativePath);
}

function resolveProjectDir(input, options) {
  if (options && typeof options.projectDir === "string" && options.projectDir.trim() !== "") {
    return path.resolve(options.projectDir);
  }

  const env = (options && options.env) || process.env;
  if (typeof env.CLAUDE_PROJECT_DIR === "string" && env.CLAUDE_PROJECT_DIR.trim() !== "") {
    return path.resolve(env.CLAUDE_PROJECT_DIR);
  }

  if (input && typeof input.cwd === "string" && input.cwd.trim() !== "") {
    return path.resolve(input.cwd);
  }

  return path.resolve(process.cwd());
}

function loadProjectSettings(projectDir) {
  const settingsPath = path.join(projectDir, ".claude", "settings.json");
  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  return readJsonFile(settingsPath);
}

function resolveRuntimeConfig(projectDir) {
  const settings = loadProjectSettings(projectDir);
  const hookSettings =
    settings.blueCollarGovernance &&
    settings.blueCollarGovernance.hookRuntime &&
    typeof settings.blueCollarGovernance.hookRuntime === "object"
      ? settings.blueCollarGovernance.hookRuntime
      : {};

  const mode = new ControlRodMode();
  const profile = mode.resolveProfile(hookSettings.profileId || DEFAULT_PROFILE_ID);

  return {
    projectDir,
    settings,
    profile,
    stateDirectory:
      typeof hookSettings.stateDirectory === "string" &&
      hookSettings.stateDirectory.trim() !== ""
        ? hookSettings.stateDirectory
        : DEFAULT_STATE_DIRECTORY,
    matchedTools: Array.isArray(hookSettings.matchedTools)
      ? [...hookSettings.matchedTools]
      : [...DEFAULT_MATCHED_TOOLS],
    blockingSeverities: new Set(
      Array.isArray(hookSettings.blockingSeverities)
        ? hookSettings.blockingSeverities
        : DEFAULT_BLOCKING_SEVERITIES
    ),
  };
}

function getStateFilePath(config, sessionId) {
  return path.join(config.projectDir, config.stateDirectory, `${sessionId}.json`);
}

function createEmptySessionState(sessionId, profile) {
  return {
    version: HOOK_RUNTIME_VERSION,
    sessionId,
    profileId: profile.profileId,
    observedActions: [],
    blockedAttempts: [],
    chainEntries: [],
    nextChainCounter: 1,
    activePermits: [],
    activeAuthorizations: [],
    loadedInstructions: [],
    stopGate: {
      lastBlockedSignature: null,
      lastBlockedAt: null,
    },
    persistedBrief: null,
    persistedReceipt: null,
    lastWalk: null,
    lastFireBreak: null,
  };
}

function loadSessionState(config, sessionId) {
  const statePath = getStateFilePath(config, sessionId);
  if (!fs.existsSync(statePath)) {
    return createEmptySessionState(sessionId, config.profile);
  }

  const state = readJsonFile(statePath);
  ensurePlainObject(state, "Hook runtime state");

  if (state.version !== HOOK_RUNTIME_VERSION) {
    throw new Error(
      `Hook runtime state version '${state.version}' does not match '${HOOK_RUNTIME_VERSION}'.`
    );
  }

  return state;
}

function saveSessionState(config, sessionId, state) {
  writeJsonFile(getStateFilePath(config, sessionId), state);
}

function toProjectRelativePath(filePath, projectDir) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    return null;
  }

  const absolutePath = path.resolve(filePath);
  const relativePath = path.relative(projectDir, absolutePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return toPosixPath(relativePath);
}

function resolveFileOperationType(domainId, context) {
  switch (domainId) {
    case "pricing_quote_logic":
      return "change_rules";
    case "customer_data_pii":
      return "write_data";
    case "database_schema":
      return context.relativePath.startsWith("migrations/") ? "migration_change" : "ddl_change";
    case "auth_security_surfaces":
      return /\bauth\b/i.test(context.relativePath) ? "auth_change" : "security_change";
    case "existing_file_modification":
      return context.fileExisted ? "modify_existing_file" : null;
    case "new_file_creation":
      return context.fileExisted ? null : "create_new_file";
    case "ui_styling_content":
      return /\.(css|html)$/i.test(context.relativePath) || /(^|[\/_-])(ui|style)([\/_\-.]|$)/i.test(context.relativePath)
        ? "ui_change"
        : null;
    case "documentation_comments":
      return "documentation_change";
    case "test_files":
      return context.fileExisted ? "test_change" : "test_creation";
    default:
      return null;
  }
}

function selectBestCandidate(candidates) {
  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort((left, right) => {
    const domainDelta =
      (DOMAIN_PRIORITY[right.domainId] || 0) - (DOMAIN_PRIORITY[left.domainId] || 0);
    if (domainDelta !== 0) {
      return domainDelta;
    }

    const autonomyDelta =
      (AUTONOMY_PRIORITY[right.autonomyLevel] || 0) -
      (AUTONOMY_PRIORITY[left.autonomyLevel] || 0);
    if (autonomyDelta !== 0) {
      return autonomyDelta;
    }

    const specificityDelta = right.patternSpecificity - left.patternSpecificity;
    if (specificityDelta !== 0) {
      return specificityDelta;
    }

    return left.domainId.localeCompare(right.domainId);
  });

  return sorted[0];
}

function classifyFileToolAction(toolName, toolInput, config) {
  ensurePlainObject(toolInput, "tool_input");

  if (typeof toolInput.file_path !== "string" || toolInput.file_path.trim() === "") {
    return null;
  }

  const relativePath = toProjectRelativePath(toolInput.file_path, config.projectDir);
  if (!relativePath) {
    return null;
  }

  const fileExisted = toolName === "Edit" ? true : fs.existsSync(toolInput.file_path);
  const context = {
    relativePath,
    fileExisted,
  };

  const candidates = [];
  for (const rule of config.profile.domainRules) {
    const matchingPattern = rule.filePatterns.find((pattern) =>
      matchesGlob(pattern, relativePath)
    );
    if (!matchingPattern) {
      continue;
    }

    const operationType = resolveFileOperationType(rule.domainId, context);
    if (!operationType || !rule.operationTypes.includes(operationType)) {
      continue;
    }

    candidates.push({
      domainId: rule.domainId,
      domainLabel: rule.label,
      autonomyLevel: rule.autonomyLevel,
      justification: rule.justification,
      operationType,
      patternSpecificity: patternSpecificity(matchingPattern),
      workItem: `${toolName} ${relativePath}`,
      relativePath,
    });
  }

  const candidate = selectBestCandidate(candidates);
  if (!candidate) {
    return null;
  }

  return {
    toolName,
    ...candidate,
    command: undefined,
  };
}

function classifyBashToolAction(toolInput, config) {
  ensurePlainObject(toolInput, "tool_input");

  if (typeof toolInput.command !== "string" || toolInput.command.trim() === "") {
    return null;
  }

  const command = toolInput.command.trim();
  const matched = BASH_HARD_STOP_MATCHERS.find((matcher) => matcher.pattern.test(command));
  if (!matched) {
    return null;
  }

  const rule = config.profile.domainRules.find((entry) => entry.domainId === matched.domainId);
  if (!rule) {
    return null;
  }

  return {
    toolName: "Bash",
    domainId: rule.domainId,
    domainLabel: rule.label,
    autonomyLevel: rule.autonomyLevel,
    justification: rule.justification,
    operationType: matched.operationType,
    patternSpecificity: 1,
    workItem: `Bash ${command}`,
    relativePath: undefined,
    command,
  };
}

function classifyToolAction(toolName, toolInput, config) {
  if (!config.matchedTools.includes(toolName)) {
    return null;
  }

  if (toolName === "Bash") {
    return classifyBashToolAction(toolInput, config);
  }

  if (toolName === "Write" || toolName === "Edit") {
    return classifyFileToolAction(toolName, toolInput, config);
  }

  return null;
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

function describeAction(classification, profile) {
  return `${classification.domainLabel} is ${classification.autonomyLevel} under '${profile.profileId}'. ${classification.justification}`;
}

function recordObservedAction(state, fingerprint, classification, approvalState, observedAt) {
  upsertByFingerprint(state.observedActions, fingerprint, {
    fingerprint,
    toolName: classification.toolName,
    workItem: classification.workItem,
    domainId: classification.domainId,
    domainLabel: classification.domainLabel,
    autonomyLevel: classification.autonomyLevel,
    operationType: classification.operationType,
    relativePath: classification.relativePath,
    command: classification.command,
    approvalState,
    firstObservedAt: observedAt,
    lastObservedAt: observedAt,
  });
}

function recordBlockedAttempt(state, fingerprint, classification, blockedAt) {
  upsertByFingerprint(state.blockedAttempts, fingerprint, {
    fingerprint,
    toolName: classification.toolName,
    workItem: classification.workItem,
    domainId: classification.domainId,
    domainLabel: classification.domainLabel,
    autonomyLevel: classification.autonomyLevel,
    operationType: classification.operationType,
    relativePath: classification.relativePath,
    command: classification.command,
    blockedAt,
  });
}

function appendChainEntry(state, { eventType, entryType, sourceArtifact, sourceLocation, payload, sessionId, recordedAt }) {
  if (!Array.isArray(state.chainEntries)) {
    state.chainEntries = [];
  }

  if (typeof state.nextChainCounter !== "number") {
    state.nextChainCounter = 1;
  }

  const counter = state.nextChainCounter;
  state.nextChainCounter = counter + 1;

  const entryId = `hook_${eventType}_${sessionId}_${String(counter).padStart(4, "0")}`;

  if (state.chainEntries.some((entry) => entry.entryId === entryId)) {
    return null;
  }

  const entry = {
    chainId: `hook_chain_${sessionId}`,
    entryId,
    entryType,
    recordedAt,
    sessionId,
    sourceArtifact,
    sourceLocation,
    payload: payload && typeof payload === "object" ? { ...payload } : {},
    linkedEntryRefs: [],
  };

  state.chainEntries.push(entry);

  if (state.chainEntries.length > MAX_CHAIN_ENTRIES) {
    state.chainEntries = state.chainEntries.slice(
      state.chainEntries.length - MAX_CHAIN_ENTRIES
    );
  }

  return entry;
}

function resolveNow(options) {
  return (options && options.now) || new Date().toISOString();
}

function findMatchingAuthorization(state, domainId, sessionId, evaluatedAt) {
  if (!Array.isArray(state.activeAuthorizations)) {
    return null;
  }

  return state.activeAuthorizations.find((auth) => {
    if (!auth || typeof auth !== "object" || auth.domainId !== domainId) {
      return false;
    }

    if (!auth.scope || typeof auth.scope !== "object") {
      return false;
    }

    if (auth.scope.scopeType === "SESSION") {
      return auth.scope.sessionId === sessionId;
    }

    if (auth.scope.scopeType === "EXPIRY") {
      return (
        typeof auth.scope.expiresAt === "string" &&
        Date.parse(evaluatedAt) <= Date.parse(auth.scope.expiresAt)
      );
    }

    return false;
  }) || null;
}

function findMatchingPermit(state, domainId, sessionId) {
  if (!Array.isArray(state.activePermits)) {
    return null;
  }

  return state.activePermits.find((permit) => {
    if (!permit || typeof permit !== "object") {
      return false;
    }

    if (permit.sessionId !== sessionId) {
      return false;
    }

    if (!Array.isArray(permit.requestedDomains)) {
      return false;
    }

    return permit.requestedDomains.includes(domainId);
  }) || null;
}

function evaluatePermitGate(config, classification, state, sessionId, now) {
  const authorization = findMatchingAuthorization(
    state,
    classification.domainId,
    sessionId,
    now
  );

  if (!authorization) {
    return null;
  }

  const permit = findMatchingPermit(state, classification.domainId, sessionId);
  if (!permit) {
    return null;
  }

  const mode = new ControlRodMode();
  try {
    return mode.evaluateHardStopGate({
      profile: config.profile,
      domainId: classification.domainId,
      sessionId,
      evaluatedAt: now,
      authorization,
      permit,
    });
  } catch (_error) {
    return null;
  }
}

function handlePreToolUse(input, config, options) {
  try {
    const fingerprint = createToolFingerprint(input.tool_name, input.tool_input);
    const classification = classifyToolAction(input.tool_name, input.tool_input, config);
    if (!classification) {
      return {};
    }

    const state = loadSessionState(config, input.session_id);
    const now = resolveNow(options);

    if (classification.autonomyLevel === "HARD_STOP") {
      const gateResult = evaluatePermitGate(config, classification, state, input.session_id, now);

      if (gateResult && gateResult.mayProceed) {
        recordObservedAction(state, fingerprint, classification, "permitted_hard_stop", now);
        appendChainEntry(state, {
          eventType: "permitted",
          entryType: "OPERATOR_ACTION",
          sourceArtifact: "hook:PreToolUse",
          sourceLocation: `domain:${classification.domainId}`,
          payload: {
            action: "permitted",
            toolName: classification.toolName,
            workItem: classification.workItem,
            autonomyLevel: classification.autonomyLevel,
            statusCode: gateResult.statusCode,
            permitRef: gateResult.permitRef,
            authorizationRef: gateResult.authorizationRef,
            constrained: gateResult.constrained || false,
            conditions: gateResult.conditions || [],
          },
          sessionId: input.session_id,
          recordedAt: now,
        });
        saveSessionState(config, input.session_id, state);
        return {};
      }

      recordBlockedAttempt(state, fingerprint, classification, now);
      appendChainEntry(state, {
        eventType: "blocked",
        entryType: "OPERATOR_ACTION",
        sourceArtifact: "hook:PreToolUse",
        sourceLocation: `domain:${classification.domainId}`,
        payload: {
          action: "blocked",
          toolName: classification.toolName,
          workItem: classification.workItem,
          autonomyLevel: classification.autonomyLevel,
          reason: describeAction(classification, config.profile),
          gateStatusCode: gateResult ? gateResult.statusCode : undefined,
        },
        sessionId: input.session_id,
        recordedAt: now,
      });
      saveSessionState(config, input.session_id, state);

      const denyReason = gateResult
        ? `Control Rod HARD_STOP (${gateResult.statusCode}): ${gateResult.summary}`
        : `Control Rod HARD_STOP: ${describeAction(classification, config.profile)}`;

      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: denyReason,
        },
      };
    }

    if (classification.autonomyLevel === "SUPERVISED") {
      recordObservedAction(state, fingerprint, classification, "pretool_supervised", now);
      saveSessionState(config, input.session_id, state);

      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason: `Control Rod SUPERVISED: ${describeAction(
            classification,
            config.profile
          )}`,
        },
      };
    }

    recordObservedAction(state, fingerprint, classification, "pretool_full_auto", now);
    saveSessionState(config, input.session_id, state);
    return {};
  } catch (error) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `FAIL_CLOSED: PreToolUse internal error: ${
          error && typeof error.message === "string" ? error.message : "unknown"
        }`,
      },
    };
  }
}

function handlePermissionRequest(input, config, options) {
  try {
    const fingerprint = createToolFingerprint(input.tool_name, input.tool_input);
    const classification = classifyToolAction(input.tool_name, input.tool_input, config);
    if (!classification) {
      return {};
    }

    const state = loadSessionState(config, input.session_id);
    const now = resolveNow(options);

    if (classification.autonomyLevel === "HARD_STOP") {
      const gateResult = evaluatePermitGate(config, classification, state, input.session_id, now);

      if (gateResult && gateResult.mayProceed) {
        recordObservedAction(state, fingerprint, classification, "permitted_hard_stop", now);
        saveSessionState(config, input.session_id, state);
        return {};
      }

      recordBlockedAttempt(state, fingerprint, classification, now);
      saveSessionState(config, input.session_id, state);

      return {
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: {
            behavior: "deny",
            message: `Control Rod HARD_STOP: ${describeAction(classification, config.profile)}`,
            interrupt: false,
          },
        },
      };
    }

    if (classification.autonomyLevel === "FULL_AUTO") {
      recordObservedAction(state, fingerprint, classification, "permission_full_auto_allow", now);
      saveSessionState(config, input.session_id, state);

      return {
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: {
            behavior: "allow",
          },
        },
      };
    }

    recordObservedAction(state, fingerprint, classification, "permission_user_review", now);
    saveSessionState(config, input.session_id, state);
    return {};
  } catch (error) {
    return {
      hookSpecificOutput: {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "deny",
          message: `FAIL_CLOSED: PermissionRequest internal error: ${
            error && typeof error.message === "string" ? error.message : "unknown"
          }`,
          interrupt: false,
        },
      },
    };
  }
}

function createHookDerivedBriefSnapshot(sessionId, controlRodProfile, createdAt) {
  return {
    briefId: `hook_brief_${sessionId}`,
    inScope: [],
    outOfScope: [],
    controlRodProfile: JSON.parse(JSON.stringify(controlRodProfile)),
    source: "hook_runtime",
    createdAt,
  };
}

function ensurePersistedBrief(state, config, createdAt) {
  if (state.persistedBrief && typeof state.persistedBrief === "object" && !Array.isArray(state.persistedBrief)) {
    return state.persistedBrief;
  }

  state.persistedBrief = createHookDerivedBriefSnapshot(
    state.sessionId,
    config.profile,
    createdAt
  );
  return state.persistedBrief;
}

function isWalkCompletedObservedAction(action) {
  return (
    action &&
    typeof action === "object" &&
    DEFAULT_MATCHED_TOOLS.includes(action.toolName) &&
    WALK_COMPLETED_APPROVAL_STATES.includes(action.approvalState)
  );
}

function isRecoveryHoldObservedAction(action) {
  return (
    action &&
    typeof action === "object" &&
    action.toolName === "SessionStart" &&
    action.domainId === "protected_destructive_ops" &&
    action.approvalState === "permission_user_review" &&
    typeof action.recoveryDetail === "string"
  );
}

function dedupeWorkItems(items) {
  const uniqueItems = [];
  const seen = new Set();

  for (const item of items) {
    if (typeof item !== "string" || item.trim() === "" || seen.has(item)) {
      continue;
    }

    seen.add(item);
    uniqueItems.push(item);
  }

  return uniqueItems;
}

function getWalkCompletedObservedActions(state) {
  if (!Array.isArray(state.observedActions)) {
    return [];
  }

  return state.observedActions.filter((action) => isWalkCompletedObservedAction(action));
}

function getWalkPerformedObservedActions(state) {
  if (!Array.isArray(state.observedActions)) {
    return [];
  }

  return state.observedActions.filter(
    (action) => isWalkCompletedObservedAction(action) || isRecoveryHoldObservedAction(action)
  );
}

function buildPersistedReceiptFromState(state, createdAt) {
  const existingReceipt =
    state.persistedReceipt &&
    typeof state.persistedReceipt === "object" &&
    !Array.isArray(state.persistedReceipt)
      ? state.persistedReceipt
      : null;

  const completedWork = dedupeWorkItems(
    getWalkCompletedObservedActions(state).map((action) => action.workItem)
  );
  const holdsRaised = dedupeWorkItems(
    (Array.isArray(state.blockedAttempts) ? state.blockedAttempts : []).map(
      (attempt) => attempt && attempt.workItem
    )
  );

  return {
    receiptId:
      existingReceipt &&
      typeof existingReceipt.receiptId === "string" &&
      existingReceipt.receiptId.trim() !== ""
        ? existingReceipt.receiptId
        : `hook_receipt_${state.sessionId}`,
    completedWork,
    holdsRaised,
    source: "hook_runtime",
    createdAt:
      existingReceipt &&
      typeof existingReceipt.createdAt === "string" &&
      existingReceipt.createdAt.trim() !== ""
        ? existingReceipt.createdAt
        : createdAt,
  };
}

function buildPerformedActionsFromState(state) {
  return getWalkPerformedObservedActions(state).map((action, index) => ({
    actionId: `hook_action_${index + 1}`,
    workItem: action.workItem,
    domainId: action.domainId,
    operationType: action.operationType,
    hardStopAuthorized: action.approvalState === "permitted_hard_stop" ? true : undefined,
  }));
}

function buildWalkEvaluationFromState(state) {
  ensurePlainObject(state.persistedBrief, "Persisted Walk input 'persistedBrief'");
  ensurePlainObject(state.persistedReceipt, "Persisted Walk input 'persistedReceipt'");

  const walk = new ForemansWalk();
  return walk.evaluate({
    sessionBrief: state.persistedBrief,
    sessionReceipt: state.persistedReceipt,
    performedActions: buildPerformedActionsFromState(state),
    forensicEntries: [],
  });
}

function isPermittedHardStopObservedAction(action) {
  return (
    action &&
    typeof action === "object" &&
    action.approvalState === "permitted_hard_stop" &&
    typeof action.fingerprint === "string" &&
    action.fingerprint.trim() !== "" &&
    typeof action.workItem === "string" &&
    action.workItem.trim() !== "" &&
    typeof action.toolName === "string" &&
    action.toolName.trim() !== "" &&
    typeof action.domainId === "string" &&
    action.domainId.trim() !== ""
  );
}

function getFireBreakMatchingChainEntries(state, actionName, reference) {
  if (!Array.isArray(state.chainEntries)) {
    return [];
  }

  return state.chainEntries.filter((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }

    if (!entry.payload || typeof entry.payload !== "object" || Array.isArray(entry.payload)) {
      return false;
    }

    return (
      entry.payload.action === actionName &&
      entry.payload.toolName === reference.toolName &&
      entry.payload.workItem === reference.workItem &&
      entry.sourceLocation === `domain:${reference.domainId}`
    );
  });
}

function hasCompletedPermitClearedAction(state, observedAction) {
  return getFireBreakMatchingChainEntries(state, "completed", observedAction).length > 0;
}

function compareFireBreakCandidates(left, right) {
  const leftTime = Date.parse(left.sortAt || "");
  const rightTime = Date.parse(right.sortAt || "");

  const leftValid = Number.isFinite(leftTime);
  const rightValid = Number.isFinite(rightTime);
  if (leftValid && rightValid && leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  const leftText = typeof left.sortAt === "string" ? left.sortAt : "";
  const rightText = typeof right.sortAt === "string" ? right.sortAt : "";
  if (leftText !== rightText) {
    return leftText.localeCompare(rightText);
  }

  return left.fingerprint.localeCompare(right.fingerprint);
}

function buildFireBreakResolvedItem(state, observedAction) {
  const permittedEntries = getFireBreakMatchingChainEntries(state, "permitted", observedAction);
  const completedEntries = getFireBreakMatchingChainEntries(state, "completed", observedAction);
  const sourceRefs = dedupeWorkItems([
    `hook_runtime:observedAction:${observedAction.fingerprint}`,
    ...permittedEntries.map((entry) => entry.entryId),
  ]);
  const evidenceRefs = dedupeWorkItems(
    [
      ...completedEntries.map((entry) => entry.entryId),
      ...permittedEntries.flatMap((entry) => [
        entry.payload && typeof entry.payload.permitRef === "string" ? entry.payload.permitRef : null,
        entry.payload && typeof entry.payload.authorizationRef === "string"
          ? entry.payload.authorizationRef
          : null,
      ]),
    ].filter(Boolean)
  );

  return {
    itemId: `hook_firebreak_resolved_${observedAction.fingerprint.slice(0, 12)}`,
    summary: `${observedAction.workItem} completed after permit-cleared HARD_STOP governance passage in this session.`,
    stateLabel: FIRE_BREAK_STATE_LABELS.RESOLVED_THIS_SESSION,
    sourceRefs,
    evidenceRefs,
  };
}

function buildFireBreakMissingItem(state, blockedAttempt) {
  const blockedEntries = getFireBreakMatchingChainEntries(state, "blocked", blockedAttempt);

  return {
    itemId: `hook_firebreak_missing_${blockedAttempt.fingerprint.slice(0, 12)}`,
    summary: `${blockedAttempt.workItem} is blocked in hook-runtime governance and was not later permit-cleared and completed in this session.`,
    stateLabel: FIRE_BREAK_STATE_LABELS.MISSING_NOW,
    sourceRefs: dedupeWorkItems([
      `hook_runtime:blockedAttempt:${blockedAttempt.fingerprint}`,
      ...blockedEntries.map((entry) => entry.entryId),
    ]),
    evidenceRefs: [],
  };
}

function buildFireBreakSnapshotFromState(state, createdAt) {
  const groups = {
    [FIRE_BREAK_GROUP_LABELS.MISSING_NOW]: [],
    [FIRE_BREAK_GROUP_LABELS.STILL_UNRESOLVED]: [],
    [FIRE_BREAK_GROUP_LABELS.AGING_INTO_RISK]: [],
    [FIRE_BREAK_GROUP_LABELS.RESOLVED_THIS_SESSION]: [],
  };

  const resolvedCandidates = [];
  const missingCandidates = [];
  const resolvedFingerprints = new Set();

  for (const observedAction of Array.isArray(state.observedActions) ? state.observedActions : []) {
    if (!isPermittedHardStopObservedAction(observedAction)) {
      continue;
    }

    if (resolvedFingerprints.has(observedAction.fingerprint)) {
      continue;
    }

    if (!hasCompletedPermitClearedAction(state, observedAction)) {
      continue;
    }

    resolvedCandidates.push({
      fingerprint: observedAction.fingerprint,
      sortAt: observedAction.lastObservedAt || observedAction.firstObservedAt || createdAt,
      item: buildFireBreakResolvedItem(state, observedAction),
    });
    resolvedFingerprints.add(observedAction.fingerprint);
  }

  const missingFingerprints = new Set();
  for (const blockedAttempt of Array.isArray(state.blockedAttempts) ? state.blockedAttempts : []) {
    if (!blockedAttempt || typeof blockedAttempt !== "object" || Array.isArray(blockedAttempt)) {
      continue;
    }

    if (typeof blockedAttempt.fingerprint !== "string" || blockedAttempt.fingerprint.trim() === "") {
      continue;
    }

    if (resolvedFingerprints.has(blockedAttempt.fingerprint) || missingFingerprints.has(blockedAttempt.fingerprint)) {
      continue;
    }

    missingCandidates.push({
      fingerprint: blockedAttempt.fingerprint,
      sortAt: blockedAttempt.blockedAt || createdAt,
      item: buildFireBreakMissingItem(state, blockedAttempt),
    });
    missingFingerprints.add(blockedAttempt.fingerprint);
  }

  resolvedCandidates.sort(compareFireBreakCandidates);
  missingCandidates.sort(compareFireBreakCandidates);

  groups[FIRE_BREAK_GROUP_LABELS.RESOLVED_THIS_SESSION] = resolvedCandidates.map((candidate) => candidate.item);
  groups[FIRE_BREAK_GROUP_LABELS.MISSING_NOW] = missingCandidates.map((candidate) => candidate.item);

  return {
    boardLabel: FIRE_BREAK_BOARD_LABEL,
    sessionId: state.sessionId,
    precedence: [...FIRE_BREAK_PRECEDENCE],
    groups,
    source: "hook_runtime",
    projectionType: "hook_runtime_governance_health_snapshot",
    projectionNote:
      "Hook-derived governance-health snapshot for /fire-break; not canonical OpenItemsBoard.projectBoard output.",
    derivedAt: createdAt,
  };
}

function buildBlockingFindingSignature(findings) {
  return sha1(
    stableStringify(
      findings.map((finding) => ({
        issueRef: finding.issueRef,
        findingType: finding.findingType,
        severity: finding.severity,
        summary: finding.summary,
      }))
    )
  );
}

function buildStopReason(blockingFindings) {
  const finding = blockingFindings[0];
  const suffix =
    blockingFindings.length > 1 ? ` plus ${blockingFindings.length - 1} more.` : ".";
  return `Foreman's Walk gate blocked closeout: ${finding.findingType}/${finding.severity} - ${finding.summary}${suffix}`;
}

function handleStop(input, config, options) {
  try {
    const state = loadSessionState(config, input.session_id);
    const now = resolveNow(options);
    ensurePersistedBrief(state, config, now);
    state.persistedReceipt = buildPersistedReceiptFromState(state, now);
    // Route-compatible hook snapshot only; this is not the canonical Open Items Board projection.
    state.lastFireBreak = buildFireBreakSnapshotFromState(state, now);

    const walkEvaluation = buildWalkEvaluationFromState(state);
    const blockingFindings = walkEvaluation.findings.filter((finding) =>
      config.blockingSeverities.has(finding.severity)
    );
    const signature =
      blockingFindings.length > 0 ? buildBlockingFindingSignature(blockingFindings) : null;

    state.lastWalk = {
      evaluatedAt: now,
      ...walkEvaluation,
    };

    if (blockingFindings.length === 0) {
      state.stopGate.lastBlockedSignature = null;
      state.stopGate.lastBlockedAt = null;
      saveSessionState(config, input.session_id, state);
      return {};
    }

    if (input.stop_hook_active === true && signature === state.stopGate.lastBlockedSignature) {
      saveSessionState(config, input.session_id, state);
      return {};
    }

    state.stopGate.lastBlockedSignature = signature;
    state.stopGate.lastBlockedAt = now;
    saveSessionState(config, input.session_id, state);

    return {
      decision: "block",
      reason: buildStopReason(blockingFindings),
    };
  } catch (error) {
    return {
      decision: "block",
      reason: `FAIL_CLOSED: Stop internal error: ${
        error && typeof error.message === "string" ? error.message : "unknown"
      }`,
    };
  }
}

function handlePostToolUse(input, config, options) {
  try {
    const classification = classifyToolAction(input.tool_name, input.tool_input, config);
    if (!classification) {
      return {};
    }

    const state = loadSessionState(config, input.session_id);
    const now = resolveNow(options);

    appendChainEntry(state, {
      eventType: "completed",
      entryType: "EVIDENCE",
      sourceArtifact: "hook:PostToolUse",
      sourceLocation: `domain:${classification.domainId}`,
      payload: {
        action: "completed",
        toolName: classification.toolName,
        workItem: classification.workItem,
        autonomyLevel: classification.autonomyLevel,
        operationType: classification.operationType,
      },
      sessionId: input.session_id,
      recordedAt: now,
    });

    saveSessionState(config, input.session_id, state);
    return {};
  } catch (error) {
    return {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `FAIL_CLOSED: PostToolUse internal error: ${
          error && typeof error.message === "string" ? error.message : "unknown"
        }`,
      },
    };
  }
}

function handlePostToolUseFailure(input, config, options) {
  try {
    const classification = classifyToolAction(input.tool_name, input.tool_input, config);
    if (!classification) {
      return {};
    }

    const state = loadSessionState(config, input.session_id);
    const now = resolveNow(options);

    const errorSummary =
      typeof input.error === "string" && input.error.trim() !== ""
        ? input.error.slice(0, 200)
        : "unknown";

    appendChainEntry(state, {
      eventType: "failed",
      entryType: "EVIDENCE",
      sourceArtifact: "hook:PostToolUseFailure",
      sourceLocation: `domain:${classification.domainId}`,
      payload: {
        action: "failed",
        toolName: classification.toolName,
        workItem: classification.workItem,
        autonomyLevel: classification.autonomyLevel,
        operationType: classification.operationType,
        errorSummary,
      },
      sessionId: input.session_id,
      recordedAt: now,
    });

    saveSessionState(config, input.session_id, state);
    return {};
  } catch (error) {
    return {
      hookSpecificOutput: {
        hookEventName: "PostToolUseFailure",
        additionalContext: `FAIL_CLOSED: PostToolUseFailure internal error: ${
          error && typeof error.message === "string" ? error.message : "unknown"
        }`,
      },
    };
  }
}

function handleConfigChange(input, config, options) {
  try {
    const state = loadSessionState(config, input.session_id);
    const now = resolveNow(options);

    const source =
      typeof input.source === "string" && input.source.trim() !== ""
        ? input.source
        : "unknown";

    const fingerprint = createToolFingerprint("ConfigChange", {
      source,
      detectedAt: now,
    });

    upsertByFingerprint(state.observedActions, fingerprint, {
      fingerprint,
      toolName: "ConfigChange",
      workItem: `ConfigChange source=${source}`,
      domainId: "auth_security_surfaces",
      domainLabel: "Auth / security surfaces",
      autonomyLevel: "SUPERVISED",
      operationType: "config_change",
      relativePath: undefined,
      command: undefined,
      approvalState: "config_change_detected",
      firstObservedAt: now,
      lastObservedAt: now,
    });

    appendChainEntry(state, {
      eventType: "config_change",
      entryType: "OPERATOR_ACTION",
      sourceArtifact: "hook:ConfigChange",
      sourceLocation: `source:${source}`,
      payload: { action: "config_change_detected", source },
      sessionId: input.session_id,
      recordedAt: now,
    });

    saveSessionState(config, input.session_id, state);

    return {
      hookSpecificOutput: {
        hookEventName: "ConfigChange",
        additionalContext: `Governance config change detected (source=${source}). Profile=${config.profile.profileId}. Enforcement continues under active posture.`,
      },
    };
  } catch (error) {
    return {
      hookSpecificOutput: {
        hookEventName: "ConfigChange",
        additionalContext: `FAIL_CLOSED: ConfigChange internal error: ${
          error && typeof error.message === "string" ? error.message : "unknown"
        }`,
      },
    };
  }
}

function handleCwdChanged(input, config, options) {
  try {
    const state = loadSessionState(config, input.session_id);
    const now = resolveNow(options);

    const newCwd =
      typeof input.cwd === "string" && input.cwd.trim() !== ""
        ? input.cwd
        : "unknown";

    const previousCwd =
      state.lastCwdChange && typeof state.lastCwdChange.to === "string"
        ? state.lastCwdChange.to
        : config.projectDir;

    state.lastCwdChange = {
      from: previousCwd,
      to: newCwd,
      changedAt: now,
    };

    saveSessionState(config, input.session_id, state);

    const outsideProject =
      newCwd !== "unknown" &&
      !path.resolve(newCwd).startsWith(path.resolve(config.projectDir));

    const advisory = outsideProject
      ? `Working directory changed to ${newCwd} (outside project root). Governance enforcement continues under active profile but domain classification may not apply to external paths.`
      : `Working directory changed. Governance enforcement continues under active profile.`;

    return {
      hookSpecificOutput: {
        hookEventName: "CwdChanged",
        additionalContext: advisory,
      },
    };
  } catch (error) {
    return {
      hookSpecificOutput: {
        hookEventName: "CwdChanged",
        additionalContext: `FAIL_CLOSED: CwdChanged internal error: ${
          error && typeof error.message === "string" ? error.message : "unknown"
        }`,
      },
    };
  }
}

function handleFileChanged(input, config, options) {
  try {
    const state = loadSessionState(config, input.session_id);
    const now = resolveNow(options);

    const source =
      typeof input.source === "string" && input.source.trim() !== ""
        ? input.source
        : "unknown";

    const fingerprint = createToolFingerprint("FileChanged", {
      source,
      detectedAt: now,
    });

    upsertByFingerprint(state.observedActions, fingerprint, {
      fingerprint,
      toolName: "FileChanged",
      workItem: `FileChanged source=${source}`,
      domainId: "auth_security_surfaces",
      domainLabel: "Auth / security surfaces",
      autonomyLevel: "SUPERVISED",
      operationType: "external_file_change",
      relativePath: undefined,
      command: undefined,
      approvalState: "file_change_detected",
      firstObservedAt: now,
      lastObservedAt: now,
    });

    appendChainEntry(state, {
      eventType: "file_change",
      entryType: "OPERATOR_ACTION",
      sourceArtifact: "hook:FileChanged",
      sourceLocation: `source:${source}`,
      payload: { action: "external_file_change_detected", source },
      sessionId: input.session_id,
      recordedAt: now,
    });

    saveSessionState(config, input.session_id, state);

    return {
      hookSpecificOutput: {
        hookEventName: "FileChanged",
        additionalContext: `Governance-relevant file changed externally (source=${source}). Profile=${config.profile.profileId}. Review config posture if unexpected.`,
      },
    };
  } catch (error) {
    return {
      hookSpecificOutput: {
        hookEventName: "FileChanged",
        additionalContext: `FAIL_CLOSED: FileChanged internal error: ${
          error && typeof error.message === "string" ? error.message : "unknown"
        }`,
      },
    };
  }
}

function handleInstructionsLoaded(input, config, options) {
  try {
    const state = loadSessionState(config, input.session_id);
    const now = resolveNow(options);

    const filePath =
      typeof input.file_path === "string" && input.file_path.trim() !== ""
        ? input.file_path
        : "unknown";

    const memoryType =
      typeof input.memory_type === "string" && input.memory_type.trim() !== ""
        ? input.memory_type
        : "unknown";

    const loadReason =
      typeof input.load_reason === "string" && input.load_reason.trim() !== ""
        ? input.load_reason
        : "unknown";

    if (!Array.isArray(state.loadedInstructions)) {
      state.loadedInstructions = [];
    }

    state.loadedInstructions.push({
      filePath,
      memoryType,
      loadReason,
      recordedAt: now,
    });

    if (state.loadedInstructions.length > MAX_LOADED_INSTRUCTIONS) {
      state.loadedInstructions = state.loadedInstructions.slice(
        state.loadedInstructions.length - MAX_LOADED_INSTRUCTIONS
      );
    }

    appendChainEntry(state, {
      eventType: "instruction_loaded",
      entryType: "OPERATOR_ACTION",
      sourceArtifact: "hook:InstructionsLoaded",
      sourceLocation: `file:${filePath}`,
      payload: {
        action: "instruction_loaded",
        filePath,
        memoryType,
        loadReason,
      },
      sessionId: input.session_id,
      recordedAt: now,
    });

    saveSessionState(config, input.session_id, state);

    return {
      hookSpecificOutput: {
        hookEventName: "InstructionsLoaded",
        additionalContext: `Instruction file loaded: ${filePath} (type=${memoryType}, reason=${loadReason}).`,
      },
    };
  } catch (error) {
    return {
      hookSpecificOutput: {
        hookEventName: "InstructionsLoaded",
        additionalContext: `FAIL_CLOSED: InstructionsLoaded internal error: ${
          error && typeof error.message === "string" ? error.message : "unknown"
        }`,
      },
    };
  }
}

function runHookEvent(eventName, input, options = {}) {
  if (typeof eventName !== "string" || eventName.trim() === "") {
    throw new Error("Hook event name is required.");
  }

  ensurePlainObject(input, "Hook input");

  if (typeof input.session_id !== "string" || input.session_id.trim() === "") {
    throw new Error("Hook input is missing 'session_id'.");
  }

  const config = resolveRuntimeConfig(resolveProjectDir(input, options));

  if (!KNOWN_HOOK_EVENTS.has(eventName)) {
    throw new Error(
      `FAIL_CLOSED: Unknown hook event '${eventName}'. Governance runtime does not handle this event.`
    );
  }

  switch (eventName) {
    case "SessionStart":
      return handleSessionStartSlice({
        input,
        config,
        options,
        createEmptySessionState,
        createToolFingerprint,
        loadSessionState,
        resolveNow,
        saveSessionState,
      });
    case "PreCompact":
      return handlePreCompactSlice({
        input,
        config,
        options,
        loadSessionState,
        resolveNow,
      });
    case "PreToolUse":
      return handlePreToolUse(input, config, options);
    case "PostToolUse":
      return handlePostToolUse(input, config, options);
    case "PostToolUseFailure":
      return handlePostToolUseFailure(input, config, options);
    case "PermissionRequest":
      return handlePermissionRequest(input, config, options);
    case "Stop":
      return handleStop(input, config, options);
    case "ConfigChange":
      return handleConfigChange(input, config, options);
    case "CwdChanged":
      return handleCwdChanged(input, config, options);
    case "FileChanged":
      return handleFileChanged(input, config, options);
    case "InstructionsLoaded":
      return handleInstructionsLoaded(input, config, options);
  }
}

module.exports = {
  HOOK_RUNTIME_VERSION,
  DEFAULT_PROFILE_ID,
  DEFAULT_STATE_DIRECTORY,
  DEFAULT_MATCHED_TOOLS,
  DEFAULT_BLOCKING_SEVERITIES,
  KNOWN_HOOK_EVENTS,
  PROJECT_HARD_STOP_DENY_RULES,
  buildWalkEvaluationFromState,
  classifyToolAction,
  createEmptySessionState,
  createToolFingerprint,
  getCompactionStateFilePath,
  getStateFilePath,
  loadSessionState,
  appendChainEntry,
  resolveRuntimeConfig,
  runHookEvent,
  saveSessionState,
};