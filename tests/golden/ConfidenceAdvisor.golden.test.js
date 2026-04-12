"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { buildConfidenceAdvisory } = require("../../src/ConfidenceAdvisor");

function normalizeFilePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function makeTempProject() {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "bcgp-confidence-advisor-"));
  fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "docs"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, ".claude"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "hooks"), { recursive: true });
  fs.mkdirSync(path.join(projectDir, "scripts"), { recursive: true });
  return projectDir;
}

function writeProjectFile(projectDir, relativePath, content) {
  const fullPath = path.join(projectDir, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
  return fullPath;
}

function expectEmptyAdvisory(advisory, filePath) {
  assert.deepEqual(advisory, {
    markerFamily: "slash",
    filePath: normalizeFilePath(filePath),
    present: false,
    tierTotals: {
      HOLD: 0,
      KILL: 0,
    },
    markers: [],
    summary: "",
  });
}

test("ConfidenceAdvisor returns empty advisory for empty and missing files", () => {
  const projectDir = makeTempProject();
  const emptyFilePath = writeProjectFile(projectDir, "src/empty.js", "");
  const missingFilePath = path.join(projectDir, "src", "missing.js");

  expectEmptyAdvisory(buildConfidenceAdvisory(emptyFilePath), emptyFilePath);
  expectEmptyAdvisory(buildConfidenceAdvisory(missingFilePath), missingFilePath);
});

test("ConfidenceAdvisor returns empty advisory for unreadable files", () => {
  const projectDir = makeTempProject();
  const filePath = writeProjectFile(projectDir, "src/unreadable.js", "///// hold\n");
  const originalReadFileSync = fs.readFileSync;

  fs.readFileSync = function patchedReadFileSync(targetPath, encoding) {
    if (normalizeFilePath(String(targetPath)) === normalizeFilePath(filePath)) {
      const error = new Error("access denied");
      error.code = "EACCES";
      throw error;
    }

    return originalReadFileSync.call(this, targetPath, encoding);
  };

  try {
    expectEmptyAdvisory(buildConfidenceAdvisory(filePath), filePath);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test("ConfidenceAdvisor returns empty advisory for out-of-fence files without reading them", () => {
  const projectDir = makeTempProject();
  const filePath = writeProjectFile(projectDir, "docs/note.md", "////// kill\n");
  const originalReadFileSync = fs.readFileSync;
  let readAttempted = false;

  fs.readFileSync = function patchedReadFileSync(targetPath, encoding) {
    if (normalizeFilePath(String(targetPath)) === normalizeFilePath(filePath)) {
      readAttempted = true;
    }

    return originalReadFileSync.call(this, targetPath, encoding);
  };

  try {
    expectEmptyAdvisory(buildConfidenceAdvisory(filePath), filePath);
    assert.equal(readAttempted, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test("ConfidenceAdvisor keeps WATCH and GAP markers advisory-silent", () => {
  const projectDir = makeTempProject();
  const filePath = writeProjectFile(
    projectDir,
    "src/watch-gap.js",
    "/// watch\n//// gap\nmodule.exports = {};\n"
  );

  expectEmptyAdvisory(buildConfidenceAdvisory(filePath), filePath);
});

test("ConfidenceAdvisor surfaces a single HOLD marker", () => {
  const projectDir = makeTempProject();
  const filePath = writeProjectFile(
    projectDir,
    "src/hold.js",
    "///// hold\nmodule.exports = {};\n"
  );

  assert.deepEqual(buildConfidenceAdvisory(filePath), {
    markerFamily: "slash",
    filePath: normalizeFilePath(filePath),
    present: true,
    tierTotals: {
      HOLD: 1,
      KILL: 0,
    },
    markers: [
      {
        lineNumber: 1,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
      },
    ],
    summary: "Advisory: existing on-disk confidence markers present (HOLD at line 1).",
  });
});

test("ConfidenceAdvisor surfaces a single KILL marker", () => {
  const projectDir = makeTempProject();
  const filePath = writeProjectFile(
    projectDir,
    "src/kill.js",
    "module.exports = {};\n////// kill\n"
  );

  assert.deepEqual(buildConfidenceAdvisory(filePath), {
    markerFamily: "slash",
    filePath: normalizeFilePath(filePath),
    present: true,
    tierTotals: {
      HOLD: 0,
      KILL: 1,
    },
    markers: [
      {
        lineNumber: 2,
        tier: "KILL",
        marker: "//////",
        slashCount: 6,
      },
    ],
    summary: "Advisory: existing on-disk confidence markers present (KILL at line 2).",
  });
});

test("ConfidenceAdvisor mentions both HOLD and KILL when both are present", () => {
  const projectDir = makeTempProject();
  const filePath = writeProjectFile(
    projectDir,
    "src/mixed.js",
    "///// hold\nmodule.exports = {};\n////// kill\n"
  );

  assert.deepEqual(buildConfidenceAdvisory(filePath), {
    markerFamily: "slash",
    filePath: normalizeFilePath(filePath),
    present: true,
    tierTotals: {
      HOLD: 1,
      KILL: 1,
    },
    markers: [
      {
        lineNumber: 1,
        tier: "HOLD",
        marker: "/////",
        slashCount: 5,
      },
      {
        lineNumber: 3,
        tier: "KILL",
        marker: "//////",
        slashCount: 6,
      },
    ],
    summary:
      "Advisory: existing on-disk confidence markers present (KILL at line 3; HOLD at line 1).",
  });
});

test("ConfidenceAdvisor returns empty advisory on internal read failure", () => {
  const projectDir = makeTempProject();
  const filePath = writeProjectFile(projectDir, "src/io-failure.js", "///// hold\n");
  const originalReadFileSync = fs.readFileSync;

  fs.readFileSync = function patchedReadFileSync(targetPath, encoding) {
    if (normalizeFilePath(String(targetPath)) === normalizeFilePath(filePath)) {
      const error = new Error("disk error");
      error.code = "EIO";
      throw error;
    }

    return originalReadFileSync.call(this, targetPath, encoding);
  };

  try {
    expectEmptyAdvisory(buildConfidenceAdvisory(filePath), filePath);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});
