#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import {
  defaultOutputRoot,
  discoverPlugins,
  packagePlugin,
  parseEnvFile,
  publishPlugin,
  sanitizePublishedManifest,
} from "./package-plugins.mjs";

test("writes extension packages under the extend/plugins namespace", () => {
  assert.match(defaultOutputRoot.replaceAll("\\", "/"), /\/dist\/extend\/plugins$/);
});

function zipEntryNames(buffer) {
  const signature = 0x02014b50;
  const names = [];
  for (let offset = 0; offset <= buffer.length - 46;) {
    if (buffer.readUInt32LE(offset) !== signature) {
      offset += 1;
      continue;
    }
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    names.push(buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

test("packages one plugin with the manifest at the archive root", async () => {
  const root = await mkdtemp(join(tmpdir(), "nexts-plugin-package-test-"));
  try {
    const pluginsRoot = join(root, "plugins");
    const pluginRoot = join(pluginsRoot, "demo");
    await mkdir(join(pluginRoot, ".nexts-plugin"), { recursive: true });
    await mkdir(join(pluginRoot, "skills", "demo"), { recursive: true });
    await writeFile(join(pluginRoot, ".nexts-plugin", "plugin.json"), JSON.stringify({ name: "demo", version: "1.2.3" }));
    await writeFile(join(pluginRoot, "skills", "demo", "SKILL.md"), "demo");
    const [plugin] = await discoverPlugins(pluginsRoot);
    const first = await packagePlugin(plugin, join(root, "out-a"));
    const second = await packagePlugin(plugin, join(root, "out-b"));
    const firstBytes = await readFile(first.packagePath);
    const secondBytes = await readFile(second.packagePath);
    assert.deepEqual(zipEntryNames(firstBytes), [".nexts-plugin/plugin.json", "skills/demo/SKILL.md"]);
    assert.deepEqual(firstBytes, secondBytes);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("published manifests omit Git source metadata", () => {
  assert.deepEqual(sanitizePublishedManifest({ name: "demo", version: "1.0.0", source: { locator: "https://example.test/repo.git" } }), {
    name: "demo",
    version: "1.0.0",
  });
});

test("environment files are parsed without exposing values", () => {
  assert.deepEqual(parseEnvFile("A=one\nB=\"two words\"\n# comment\n"), { A: "one", B: "two words" });
});

test("publishes a package without a signature field", async () => {
  const root = await mkdtemp(join(tmpdir(), "nexts-plugin-publish-test-"));
  try {
    const packagePath = join(root, "demo.zip");
    await writeFile(packagePath, Buffer.from("PK\x03\x04demo"));
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ plugin: { pluginId: "demo", latestRelease: { version: "1.0.0" } } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    await publishPlugin(
      { id: "demo", version: "1.0.0", packagePath, manifest: { name: "demo", version: "1.0.0" } },
      { apiBase: "https://nexts.test/api/v1", accessToken: "secret", fetchImpl },
    );
    assert.equal(request.url, "https://nexts.test/api/v1/admin/plugins/catalog/demo/package");
    assert.equal(request.init.body.has("package"), true);
    assert.equal(request.init.body.has("signature"), false);
    assert.equal(JSON.parse(request.init.body.get("manifest")).source, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
