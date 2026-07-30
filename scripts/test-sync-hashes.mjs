#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApplicationsCatalog, canonicalHashPath, hashPaths } from "./sync.mjs";

const directory = mkdtempSync(join(tmpdir(), "nexts-hub-hash-"));
try {
  const textPath = join(directory, "script.py");
  writeFileSync(textPath, "{\r\n  \"id\": \"gmail\"\r\n}\r\n", "utf8");
  const windowsHash = hashPaths(directory, ["manifest.json"]);
  writeFileSync(textPath, "{\n  \"id\": \"gmail\"\n}\n", "utf8");
  const linuxHash = hashPaths(directory, ["manifest.json"]);
  assert.equal(windowsHash, linuxHash, "text hashes must be identical for CRLF and LF checkouts");
  assert.equal(canonicalHashPath("skills\\example\\SKILL.md"), "skills/example/SKILL.md");

  const catalogDirectory = join(directory, "mcp", "_adapters", "catalog", "apps");
  mkdirSync(catalogDirectory, { recursive: true });
  writeFileSync(join(catalogDirectory, "github.json"), JSON.stringify({
    service: "github",
    displayName: "GitHub",
    categories: ["Developer Tools"],
    authTypes: ["oauth2"],
    homepageUrl: "https://github.com",
    auth: [],
    actions: [{
      id: "github.create_issue",
      description: "Create an issue.",
      access: "write",
      inputSchema: { type: "object", required: ["title"] }
    }]
  }), "utf8");
  const marketplace = JSON.parse(buildApplicationsCatalog(directory).content);
  assert.equal(marketplace.applications.length, 1);
  assert.deepEqual(marketplace.applications[0].actions, [{
    id: "github.create_issue",
    description: "Create an issue.",
    access: "write"
  }]);
  process.stdout.write("Cross-platform content hash test passed.\n");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
