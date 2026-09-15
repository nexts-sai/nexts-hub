#!/usr/bin/env node

import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { packageDirectory } from "./package-extension.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(root, "mcp");
const defaultOutput = join(root, "dist", "extend", "mcp");

async function discover() {
  const items = [];
  for (const entry of await readdir(sourceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name === "templates") continue;
    const directory = join(sourceRoot, entry.name);
    let definition;
    try {
      definition = JSON.parse(await readFile(join(directory, "mcp.json"), "utf8"));
      await readFile(join(directory, "server.mjs"));
    } catch {
      continue;
    }
    if (definition.distribution_type === "nexts_hub") items.push({ id: definition.id, version: definition.version, definition, directory });
  }
  return items.sort((left, right) => left.id.localeCompare(right.id));
}

export async function run(argv = process.argv.slice(2)) {
  const requested = argv.flatMap((value, index) => value === "--mcp" ? [argv[index + 1]] : []).filter(Boolean);
  const outputIndex = argv.indexOf("--out");
  const output = outputIndex >= 0 ? resolve(argv[outputIndex + 1]) : defaultOutput;
  const discovered = await discover();
  const selected = discovered.filter((item) => requested.length === 0 || requested.includes(item.id));
  const missing = requested.filter((id) => !discovered.some((item) => item.id === id));
  if (missing.length) throw new Error(`Unknown self-contained MCP server(s): ${missing.join(", ")}`);
  if (!selected.length) throw new Error("No self-contained NEXTS MCP servers were selected.");

  for (const item of selected) {
    const runtimeDirectory = join(root, ".runtime", "mcp", item.id, item.version);
    await rm(runtimeDirectory, { recursive: true, force: true });
    await mkdir(runtimeDirectory, { recursive: true });
    const runtimeFiles = (await readdir(item.directory)).filter((filename) => filename.endsWith(".mjs") || filename.endsWith(".yaml"));
    for (const filename of runtimeFiles) await copyFile(join(item.directory, filename), join(runtimeDirectory, filename));
    await writeFile(join(runtimeDirectory, "runtime.json"), `${JSON.stringify({
      service: item.id,
      version: item.version,
      entrypoint: "server.mjs",
      configurationFields: item.definition.configuration_fields.map((field) => ({
        key: field.key,
        label: field.label,
        target: field.target,
        targetKey: field.target_key,
        required: field.required,
        secret: field.secret,
        placeholder: field.placeholder,
        description: field.description,
      })),
    }, null, 2)}\n`, "utf8");
    const packagePath = join(output, item.id, item.version, `${item.id}-${item.version}.zip`);
    const sizeBytes = await packageDirectory(runtimeDirectory, packagePath);
    console.log(`Packaged ${item.id}@${item.version} (${sizeBytes} bytes): ${packagePath}`);
  }
  return selected;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
