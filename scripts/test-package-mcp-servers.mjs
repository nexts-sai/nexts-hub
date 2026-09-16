#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { publishMcpPackage } from "./package-mcp-servers.mjs";

test("publishes an MCP archive to the connected-app package endpoint", async () => {
  const root = await mkdtemp(join(tmpdir(), "nexts-mcp-publish-test-"));
  try {
    const packagePath = join(root, "boss-zhipin-0.2.0.zip");
    await writeFile(packagePath, Buffer.from("PK\x03\x04boss-zhipin"));
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({
        application: {
          applicationId: "cc.nexts.connector.boss-zhipin",
          latestRelease: { version: "0.2.0", sha256: "a".repeat(64) },
        },
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const result = await publishMcpPackage(
      { id: "boss-zhipin", version: "0.2.0", packagePath },
      { apiBase: "https://nexts.test/api/v1", accessToken: "secret", fetchImpl },
    );

    assert.equal(request.url, "https://nexts.test/api/v1/admin/connected-apps/catalog/cc.nexts.connector.boss-zhipin/package");
    assert.equal(request.init.method, "POST");
    assert.equal(request.init.headers.authorization, "Bearer secret");
    assert.equal(request.init.body.get("version"), "0.2.0");
    assert.equal(request.init.body.get("package").name, "boss-zhipin-0.2.0.zip");
    assert.equal(result.application.latestRelease.sha256, "a".repeat(64));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
