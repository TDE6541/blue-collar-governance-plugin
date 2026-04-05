"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { PROJECT_HARD_STOP_DENY_RULES } = require("../src/HookRuntime");

const SUCCESS_EXIT_CODE = 0;
const VERIFY_FAILURE_EXIT_CODE = 1;
const HARD_ERROR_EXIT_CODE = 2;
const PROJECT_RULE_SOURCE = "src/HookRuntime.js:PROJECT_HARD_STOP_DENY_RULES";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureCanonicalRules() {
  if (!Array.isArray(PROJECT_HARD_STOP_DENY_RULES) || PROJECT_HARD_STOP_DENY_RULES.length === 0) {
    throw new Error("Canonical deny rules are unavailable from src/HookRuntime.js.");
  }

  for (const rule of PROJECT_HARD_STOP_DENY_RULES) {
    if (typeof rule !== "string" || rule.trim() === "") {
      throw new Error("Canonical deny rules must be a non-empty array of strings.");
    }
  }

  return [...PROJECT_HARD_STOP_DENY_RULES];
}

function normalizeArgs(argv) {
  const options = {
    targetDirArg: null,
    dryRun: false,
    verify: false,
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--verify") {
      options.verify = true;
      continue;
    }

    if (typeof arg === "string" && arg.startsWith("--")) {
      throw new Error(`Unknown flag '${arg}'. Supported flags: --dry-run, --verify.`);
    }

    if (options.targetDirArg !== null) {
      throw new Error("Exactly one <target-dir> argument is required.");
    }

    options.targetDirArg = arg;
  }

  if (typeof options.targetDirArg !== "string" || options.targetDirArg.trim() === "") {
    throw new Error("Usage: node scripts/apply-deny-posture.js <target-dir> [--dry-run] [--verify]");
  }

  return options;
}

function resolveTargetDir(targetDirArg, cwd) {
  const targetDir = path.resolve(cwd || process.cwd(), targetDirArg);
  let stat;

  try {
    stat = fs.statSync(targetDir);
  } catch (_error) {
    throw new Error(`Target directory does not exist: ${targetDir}`);
  }

  if (!stat.isDirectory()) {
    throw new Error(`Target path is not a directory: ${targetDir}`);
  }

  return targetDir;
}

function getSettingsPath(targetDir) {
  return path.join(targetDir, ".claude", "settings.json");
}

function readSettingsOrEmpty(settingsPath) {
  if (!fs.existsSync(settingsPath)) {
    return {
      exists: false,
      settings: {},
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to parse ${settingsPath}: ${error.message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`Settings file must contain a JSON object: ${settingsPath}`);
  }

  return {
    exists: true,
    settings: parsed,
  };
}

function getExistingDenyRules(settings, settingsPath) {
  if (settings.permissions === undefined) {
    return [];
  }

  if (!isPlainObject(settings.permissions)) {
    throw new Error(`'permissions' must be an object in ${settingsPath}`);
  }

  if (settings.permissions.deny === undefined) {
    return [];
  }

  if (!Array.isArray(settings.permissions.deny)) {
    throw new Error(`'permissions.deny' must be an array in ${settingsPath}`);
  }

  for (const entry of settings.permissions.deny) {
    if (typeof entry !== "string" || entry.trim() === "") {
      throw new Error(`'permissions.deny' must contain only non-empty strings in ${settingsPath}`);
    }
  }

  return [...settings.permissions.deny];
}

function buildMergeReport(settings, settingsPath, canonicalRules) {
  const nextSettings = cloneJsonValue(settings);
  const existingDenyRules = getExistingDenyRules(nextSettings, settingsPath);
  const existingSet = new Set(existingDenyRules);
  const addedRules = [];
  const alreadyPresentRules = [];
  const pluginRuleSet = new Set(canonicalRules);

  for (const rule of canonicalRules) {
    if (existingSet.has(rule)) {
      alreadyPresentRules.push(rule);
      continue;
    }

    existingDenyRules.push(rule);
    existingSet.add(rule);
    addedRules.push(rule);
  }

  if (nextSettings.permissions === undefined) {
    nextSettings.permissions = {};
  }

  nextSettings.permissions.deny = existingDenyRules;

  return {
    nextSettings,
    addedRules,
    alreadyPresentRules,
    preservedNonPluginRules: existingDenyRules.filter((rule) => !pluginRuleSet.has(rule)),
  };
}

function verifyDenyRules(settings, settingsPath, canonicalRules) {
  const existingDenyRules = getExistingDenyRules(settings, settingsPath);
  const existingSet = new Set(existingDenyRules);
  const presentRules = [];
  const missingRules = [];

  for (const rule of canonicalRules) {
    if (existingSet.has(rule)) {
      presentRules.push(rule);
    } else {
      missingRules.push(rule);
    }
  }

  return {
    presentRules,
    missingRules,
    existingDenyRules,
  };
}

function writeSettings(settingsPath, nextSettings) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(nextSettings, null, 2)}\n`, "utf8");
}

function emitJson(stream, payload) {
  stream.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function runCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const cwd = io.cwd || process.cwd();

  try {
    const args = normalizeArgs(argv);
    const canonicalRules = ensureCanonicalRules();
    const targetDir = resolveTargetDir(args.targetDirArg, cwd);
    const settingsPath = getSettingsPath(targetDir);
    const readResult = readSettingsOrEmpty(settingsPath);
    const mode = args.verify ? "verify" : args.dryRun ? "dry-run" : "apply";

    if (args.verify) {
      const verification = verifyDenyRules(readResult.settings, settingsPath, canonicalRules);
      const payload = {
        mode,
        targetDir,
        settingsPath,
        settingsExists: readResult.exists,
        ruleSource: PROJECT_RULE_SOURCE,
        canonicalRuleCount: canonicalRules.length,
        presentRules: verification.presentRules,
        missingRules: verification.missingRules,
        status: verification.missingRules.length === 0 ? "ok" : "verification_failed",
      };
      emitJson(stdout, payload);
      return verification.missingRules.length === 0 ? SUCCESS_EXIT_CODE : VERIFY_FAILURE_EXIT_CODE;
    }

    const mergeReport = buildMergeReport(readResult.settings, settingsPath, canonicalRules);
    const changed = mergeReport.addedRules.length > 0 || !readResult.exists;
    const payload = {
      mode,
      targetDir,
      settingsPath,
      settingsExists: readResult.exists,
      ruleSource: PROJECT_RULE_SOURCE,
      canonicalRuleCount: canonicalRules.length,
      addedRules: mergeReport.addedRules,
      alreadyPresentRules: mergeReport.alreadyPresentRules,
      preservedNonPluginRules: mergeReport.preservedNonPluginRules,
      changed,
      writePerformed: false,
    };

    // This is an operator-invoked delivery utility, not live runtime config mutation.
    if (!args.dryRun) {
      writeSettings(settingsPath, mergeReport.nextSettings);
      payload.writePerformed = true;
    }

    emitJson(stdout, payload);
    return SUCCESS_EXIT_CODE;
  } catch (error) {
    emitJson(stderr, {
      mode: "error",
      status: "error",
      error: error && typeof error.message === "string" ? error.message : "unknown error",
    });
    return HARD_ERROR_EXIT_CODE;
  }
}

if (require.main === module) {
  process.exitCode = runCli(process.argv.slice(2));
}

module.exports = {
  HARD_ERROR_EXIT_CODE,
  PROJECT_RULE_SOURCE,
  SUCCESS_EXIT_CODE,
  VERIFY_FAILURE_EXIT_CODE,
  buildMergeReport,
  getSettingsPath,
  readSettingsOrEmpty,
  runCli,
  verifyDenyRules,
};
