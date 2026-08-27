#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { packageDirectory } from "./package-extension.mjs";
import { apiBaseUrl, authenticatePublisher, parseEnvFile, responseJson } from "./package-plugins.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "skills", "skills");
const defaultOutput = join(root, "dist", "extend", "skills");

function frontmatter(markdown, key) {
  const block = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  return block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
}

async function discover() {
  const skills = [];
  for (const entry of (await readdir(sourceRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const directory = join(sourceRoot, entry.name);
    const markdown = await readFile(join(directory, "SKILL.md"), "utf8");
    skills.push({ id: entry.name, version: frontmatter(markdown, "version") || "1.0.0", directory });
  }
  return skills;
}

async function publish(item, apiBase, token) {
  const form = new FormData();
  form.set("version", item.version);
  form.set("package", new Blob([await readFile(item.packagePath)], { type: "application/zip" }), basename(item.packagePath));
  return responseJson(await fetch(`${apiBase}/admin/capabilities/catalog/skill/${encodeURIComponent(item.id)}/package`, {
    method: "POST", headers: { authorization: `Bearer ${token}` }, body: form
  }), `Publish ${item.id}`);
}

export async function run(argv = process.argv.slice(2)) {
  const publishPackages = argv.includes("--publish");
  const requested = argv.flatMap((value, index) => value === "--skill" ? [argv[index + 1]] : []).filter(Boolean);
  const envIndex = argv.indexOf("--env-file");
  const apiIndex = argv.indexOf("--api-base");
  const outputIndex = argv.indexOf("--out");
  const output = outputIndex >= 0 ? resolve(argv[outputIndex + 1]) : defaultOutput;
  const discovered = await discover();
  const selected = discovered.filter((item) => requested.length === 0 || requested.includes(item.id));
  const missing = requested.filter((id) => !discovered.some((item) => item.id === id));
  if (missing.length) throw new Error(`Unknown skill(s): ${missing.join(", ")}`);
  if (!selected.length) throw new Error("No skills were selected.");
  for (const item of selected) {
    item.packagePath = join(output, item.id, item.version, `${item.id}-${item.version}.zip`);
    item.sizeBytes = await packageDirectory(item.directory, item.packagePath);
    console.log(`Packaged ${item.id}@${item.version} (${item.sizeBytes} bytes)`);
  }
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
