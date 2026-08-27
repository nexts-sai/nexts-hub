#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { packageDirectory } from "./package-extension.mjs";
import { apiBaseUrl, authenticatePublisher, parseEnvFile, responseJson } from "./package-plugins.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "apps", "apps");
const defaultOutput = join(root, "dist", "extend", "apps");

async function discover() {
  const apps = [];
  for (const entry of (await readdir(sourceRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const definition = JSON.parse(await readFile(join(sourceRoot, entry.name), "utf8"));
    apps.push({ id: definition.service, applicationId: `cc.nexts.connector.${definition.service}`, version: definition.version || "1.0.0" });
  }
  return apps;
}

function buildRuntime(item, outputDirectory) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [join(root, "scripts", "build-mcp-adapter.mjs"), "--service", item.id, "--version", item.version, "--output-dir", outputDirectory], { cwd: root, stdio: "inherit" });
    child.once("error", rejectPromise);
    child.once("exit", (code) => code === 0 ? resolvePromise() : rejectPromise(new Error(`Runtime build failed for ${item.id} (${code})`)));
  });
}

async function publish(item, apiBase, token) {
  const form = new FormData();
  form.set("version", item.version);
  form.set("package", new Blob([await readFile(item.packagePath)], { type: "application/zip" }), basename(item.packagePath));
  return responseJson(await fetch(`${apiBase}/admin/connected-apps/catalog/${encodeURIComponent(item.applicationId)}/package`, {
    method: "POST", headers: { authorization: `Bearer ${token}` }, body: form
  }), `Publish ${item.id}`);
}

export async function run(argv = process.argv.slice(2)) {
  const publishPackages = argv.includes("--publish");
  const requested = argv.flatMap((value, index) => value === "--app" ? [argv[index + 1]] : []).filter(Boolean);
  const envIndex = argv.indexOf("--env-file");
  const apiIndex = argv.indexOf("--api-base");
  const outputIndex = argv.indexOf("--out");
  const concurrencyIndex = argv.indexOf("--concurrency");
  const concurrency = concurrencyIndex >= 0 ? Number.parseInt(argv[concurrencyIndex + 1], 10) : 4;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16) throw new Error("--concurrency must be between 1 and 16.");
  const output = outputIndex >= 0 ? resolve(argv[outputIndex + 1]) : defaultOutput;
  const discovered = await discover();
  const selected = discovered.filter((item) => requested.length === 0 || requested.includes(item.id));
  const missing = requested.filter((id) => !discovered.some((item) => item.id === id));
  if (missing.length) throw new Error(`Unknown application(s): ${missing.join(", ")}`);
  if (!selected.length) throw new Error("No applications were selected.");
  let nextIndex = 0;
  async function packageNext() {
    while (nextIndex < selected.length) {
      const item = selected[nextIndex++];
      const runtimeDirectory = join(root, ".runtime", "packages", item.id, item.version);
      await buildRuntime(item, runtimeDirectory);
      item.packagePath = join(output, item.id, item.version, `${item.id}-${item.version}.zip`);
      item.sizeBytes = await packageDirectory(runtimeDirectory, item.packagePath);
      console.log(`Packaged ${item.id}@${item.version} (${item.sizeBytes} bytes)`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, () => packageNext()));
  if (publishPackages) {
    const fileValues = envIndex >= 0 ? parseEnvFile(await readFile(resolve(argv[envIndex + 1]), "utf8")) : {};
    const values = { ...fileValues, ...process.env };
    const apiBase = apiBaseUrl(values, apiIndex >= 0 ? argv[apiIndex + 1] : null);
    const token = await authenticatePublisher({ apiBase, values });
    for (const item of selected) { await publish(item, apiBase, token); console.log(`Published ${item.id}@${item.version}`); }
  }
  return selected;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
