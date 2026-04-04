"use strict";

const fs = require("fs");
const path = require("path");

const SUPPORTED_ROUTES = ["chain", "walk", "fire-break", "prevention-record"];
const RUNTIME_DIR = path.join(process.cwd(), ".claude", "runtime");

function findMostRecentSessionFile() {
  if (!fs.existsSync(RUNTIME_DIR)) {
    return null;
  }

  const files = fs.readdirSync(RUNTIME_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    return null;
  }

  let newest = null;
  let newestMtime = 0;

  for (const file of files) {
    const filePath = path.join(RUNTIME_DIR, file);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs > newestMtime) {
      newestMtime = stat.mtimeMs;
      newest = filePath;
    }
  }

  return newest;
}

function loadSessionState(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function holdResult(route, sessionSource, reason, availableInputs, missingInputs) {
  return {
    route,
    sessionSource,
    status: "hold",
    hold: {
      reason,
      availableInputs,
      missingInputs,
    },
  };
}

function renderChain(state, sessionSource) {
  const chainEntries = state.chainEntries || [];

  if (chainEntries.length === 0) {
    return holdResult(
      "chain",
      sessionSource,
      "no chain entries in persisted session state",
      [],
      ["chainEntries"]
    );
  }

  const { CompressedHistoryTrustSkills } = require(
    path.join(__dirname, "..", "src", "CompressedHistoryTrustSkills.js")
  );

  const chainId = chainEntries[0].chainId;
  const skills = new CompressedHistoryTrustSkills();
  const rendered = skills.renderChain({ chainId, entries: chainEntries });

  return {
    route: "chain",
    sessionSource,
    status: "ok",
    rendered,
  };
}

function renderWalk(_state, sessionSource) {
  return holdResult(
    "walk",
    sessionSource,
    "sessionBrief and sessionReceipt are not persisted by the hook runtime; " +
      "valid Walk input cannot be constructed without inventing conversation-scope data",
    ["chainEntries", "observedActions", "blockedActions"],
    ["sessionBrief.inScope", "sessionBrief.outOfScope", "sessionReceipt.completedWork", "sessionReceipt.holdsRaised"]
  );
}

function renderFireBreak(_state, sessionSource) {
  return holdResult(
    "fire-break",
    sessionSource,
    "OpenItemsBoard projection requires continuity, standing-risk, and omission inputs " +
      "not persisted by the hook runtime",
    ["chainEntries", "observedActions"],
    ["continuityEntries", "standingRiskItems", "omissionFindings", "boardProjection"]
  );
}

function renderPreventionRecord(state, sessionSource) {
  const chainEntries = state.chainEntries || [];

  if (chainEntries.length === 0) {
    return holdResult(
      "prevention-record",
      sessionSource,
      "no forensic entries in persisted session state",
      [],
      ["forensicEntries"]
    );
  }

  const { CompressedGovernanceHealthSkills } = require(
    path.join(__dirname, "..", "src", "CompressedGovernanceHealthSkills.js")
  );

  const sessionId = chainEntries[0].sessionId;
  const skills = new CompressedGovernanceHealthSkills();
  const rendered = skills.renderPreventionRecord({
    sessionId,
    forensicEntries: chainEntries,
  });

  return {
    route: "prevention-record",
    sessionSource,
    status: "ok",
    rendered,
  };
}

function main() {
  const route = process.argv[2];

  if (!route || !SUPPORTED_ROUTES.includes(route)) {
    console.error(
      `Usage: node scripts/render-skill.js <route>\nSupported routes: ${SUPPORTED_ROUTES.join(", ")}`
    );
    process.exit(1);
  }

  const sessionFile = findMostRecentSessionFile();
  if (!sessionFile) {
    console.log(
      JSON.stringify(
        holdResult(route, null, "no session state files found in .claude/runtime/", [], ["sessionState"]),
        null,
        2
      )
    );
    process.exit(0);
  }

  const sessionSource = path.relative(path.join(__dirname, ".."), sessionFile).replace(/\\/g, "/");

  let state;
  try {
    state = loadSessionState(sessionFile);
  } catch (error) {
    console.log(
      JSON.stringify(
        holdResult(route, sessionSource, `failed to parse session state: ${error.message}`, [], ["sessionState"]),
        null,
        2
      )
    );
    process.exit(0);
  }

  let result;
  try {
    switch (route) {
      case "chain":
        result = renderChain(state, sessionSource);
        break;
      case "walk":
        result = renderWalk(state, sessionSource);
        break;
      case "fire-break":
        result = renderFireBreak(state, sessionSource);
        break;
      case "prevention-record":
        result = renderPreventionRecord(state, sessionSource);
        break;
      default:
        result = holdResult(route, sessionSource, "unsupported route", [], []);
    }
  } catch (error) {
    result = {
      route,
      sessionSource,
      status: "error",
      error: error.message || "unknown render error",
    };
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
