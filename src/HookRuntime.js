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
  "Edit(/**/*auth*.*)",
  "Edit(/**/*security*.*)",
]);

const KNOWN_HOOK_EVENTS = new Set([
  "SessionStart",
  "PreCompact",
  "PreToolUse",
  "PermissionRequest",
  "Stop",
]);

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
    stopGate: {
      lastBlockedSignature: null,
      lastBlockedAt: null,
    },
    lastWalk: null,
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

function resolveNow(options) {
  return (options && options.now) || new Date().toISOString();
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
      recordBlockedAttempt(state, fingerprint, classification, now);
      saveSessionState(config, input.session_id, state);

      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Control Rod HARD_STOP: ${describeAction(
            classification,
            config.profile
          )}`,
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

function buildWalkEvaluationFromState(state, config) {
  const allowedActions = state.observedActions.filter((action) =>
    ["pretool_full_auto", "permission_full_auto_allow", "permission_user_review"].includes(
      action.approvalState
    )
  );

  const completedWork = allowedActions.map((action) => action.workItem);
  const performedActions = allowedActions.map((action, index) => ({
    actionId: `hook_action_${index + 1}`,
    workItem: action.workItem,
    domainId: action.domainId,
    operationType: action.operationType,
    hardStopAuthorized: action.autonomyLevel === "HARD_STOP" ? false : undefined,
  }));

  const walk = new ForemansWalk();
  return walk.evaluate({
    sessionBrief: {
      briefId: `hook_brief_${state.sessionId}`,
      inScope: [],
      outOfScope: [],
      controlRodProfile: config.profile,
    },
    sessionReceipt: {
      receiptId: `hook_receipt_${state.sessionId}`,
      completedWork,
      holdsRaised: [],
    },
    performedActions,
    forensicEntries: [],
  });
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
    const walkEvaluation = buildWalkEvaluationFromState(state, config);
    const blockingFindings = walkEvaluation.findings.filter((finding) =>
      config.blockingSeverities.has(finding.severity)
    );
    const signature =
      blockingFindings.length > 0 ? buildBlockingFindingSignature(blockingFindings) : null;

    state.lastWalk = {
      evaluatedAt: resolveNow(options),
      findingSummary: walkEvaluation.findingSummary,
      findings: walkEvaluation.findings,
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
    state.stopGate.lastBlockedAt = resolveNow(options);
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
    case "PermissionRequest":
      return handlePermissionRequest(input, config, options);
    case "Stop":
      return handleStop(input, config, options);
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
  resolveRuntimeConfig,
  runHookEvent,
  saveSessionState,
};