"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { runHookEvent } = require("../../src/HookRuntime");

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function main() {
  const rawInput = readStdin().trim();
  const input = rawInput === "" ? {} : JSON.parse(rawInput);
  const eventName = input.hook_event_name;

  if (typeof eventName !== "string" || eventName.trim() === "") {
    throw new Error("Hook input is missing 'hook_event_name'.");
  }

  const result = runHookEvent(eventName, input, {
    env: process.env,
    projectDir:
      process.env.CLAUDE_PROJECT_DIR || input.cwd || path.resolve(process.cwd()),
  });

  if (result && Object.keys(result).length > 0) {
    process.stdout.write(JSON.stringify(result));
  }
}

try {
  main();
  process.exit(0);
} catch (error) {
  const message =
    error && typeof error.message === "string"
      ? error.message
      : "Unclassified governance hook failure.";
  process.stderr.write(`HOOK_RUNTIME_FAIL_CLOSED: ${message}\n`);
  process.exit(2);
}
