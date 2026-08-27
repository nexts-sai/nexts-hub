#!/usr/bin/env node

import { ZipArchive } from "archiver";
import { createReadStream, createWriteStream } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const hubRoot = resolve(scriptDir, "..");
export const defaultPluginsRoot = join(hubRoot, "plugins", "plugins");
export const defaultOutputRoot = join(hubRoot, "dist", "extend", "plugins");
const fixedArchiveDate = new Date("2000-01-01T00:00:00.000Z");

export async function discoverPlugins(pluginsRoot = defaultPluginsRoot) {
  const entries = await readdir(pluginsRoot, { withFileTypes: true });
  const plugins = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) continue;
    const directory = join(pluginsRoot, entry.name);
    const manifestPath = join(directory, ".nexts-plugin", "plugin.json");
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (error) {
      throw new Error(`Invalid plugin manifest at ${manifestPath}: ${error.message}`);
    }
    if (typeof manifest.name !== "string" || manifest.name.trim() !== entry.name) {
      throw new Error(`Plugin folder '${entry.name}' must match manifest name '${manifest.name ?? ""}'.`);
    }
    if (typeof manifest.version !== "string" || manifest.version.trim() === "") {
      throw new Error(`Plugin '${entry.name}' must declare a version.`);
    }
    plugins.push({
      id: manifest.name.trim(),
      version: manifest.version.trim(),
      directory,
      manifest: sanitizePublishedManifest(manifest),
    });
  }
  return plugins;
}

export function sanitizePublishedManifest(manifest) {
  const sanitized = structuredClone(manifest);
  delete sanitized.source;
  return sanitized;
}

async function listPackageFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const absolutePath = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`Plugin packages cannot contain symbolic links: ${absolutePath}`);
      }
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile()) {
        const archivePath = relative(root, absolutePath).split(sep).join("/");
        if (!archivePath || archivePath.startsWith("../")) {
          throw new Error(`Plugin file escaped its package root: ${absolutePath}`);
        }
        files.push({ absolutePath, archivePath });
      }
    }
  }
  await visit(root);
  return files;
}

export async function packagePlugin(plugin, outputRoot = defaultOutputRoot) {
  const targetDirectory = join(outputRoot, plugin.id, plugin.version);
  const targetPath = join(targetDirectory, `${plugin.id}-${plugin.version}.zip`);
  const temporaryPath = `${targetPath}.tmp`;
  await mkdir(targetDirectory, { recursive: true });
  await rm(temporaryPath, { force: true });
  const files = await listPackageFiles(plugin.directory);
  if (!files.some((file) => file.archivePath === ".nexts-plugin/plugin.json")) {
    throw new Error(`Plugin '${plugin.id}' package is missing .nexts-plugin/plugin.json.`);
  }

  await new Promise((resolvePromise, rejectPromise) => {
    const output = createWriteStream(temporaryPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const fail = (error) => rejectPromise(error);
    output.once("close", resolvePromise);
    output.once("error", fail);
    archive.once("error", fail);
    archive.on("warning", fail);
    archive.pipe(output);
    for (const file of files) {
      archive.append(createReadStream(file.absolutePath), {
        name: file.archivePath,
        date: fixedArchiveDate,
        mode: 0o644,
      });
    }
    void archive.finalize();
  });
  await rename(temporaryPath, targetPath);
  const packageStat = await stat(targetPath);
  return { ...plugin, packagePath: targetPath, sizeBytes: packageStat.size };
}

export function parseEnvFile(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export function apiBaseUrl(values, override) {
  const configured = override || values.NEXTS_ACCOUNT_API_BASE_URL || values.ACCOUNT_PUBLIC_BASE_URL || "https://nexts.ai";
  const normalized = configured.replace(/\/+$/, "");
  return normalized.endsWith("/api/v1") ? normalized : `${normalized}/api/v1`;
}

export async function responseJson(response, label) {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `${response.status} ${response.statusText}`;
    throw new Error(`${label} failed: ${message}`);
  }
  return payload;
}

export async function authenticatePublisher({ apiBase, values, fetchImpl = fetch }) {
  if (values.NEXTS_ADMIN_ACCESS_TOKEN) return values.NEXTS_ADMIN_ACCESS_TOKEN;
  const email = values.NEXTS_ADMIN_EMAIL || values.ADMIN_BOOTSTRAP_EMAIL;
  const password = values.NEXTS_ADMIN_PASSWORD || values.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) {
    throw new Error("Publishing requires NEXTS_ADMIN_ACCESS_TOKEN or admin email/password environment variables.");
  }
  const response = await fetchImpl(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await responseJson(response, "Admin login");
  if (!payload?.accessToken) throw new Error("Admin login did not return an access token.");
  return payload.accessToken;
}

export async function publishPlugin(plugin, { apiBase, accessToken, fetchImpl = fetch }) {
  const packageBytes = await readFile(plugin.packagePath);
  const permissions = Array.isArray(plugin.manifest.permissions)
    ? plugin.manifest.permissions.filter((permission) => typeof permission === "string" && permission.trim() !== "")
    : [];
  const form = new FormData();
  form.set("version", plugin.version);
  form.set("permissions", JSON.stringify(permissions));
  form.set("manifest", JSON.stringify(plugin.manifest));
  form.set("package", new Blob([packageBytes], { type: "application/zip" }), basename(plugin.packagePath));
  const response = await fetchImpl(`${apiBase}/admin/plugins/catalog/${encodeURIComponent(plugin.id)}/package`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const payload = await responseJson(response, `Publish ${plugin.id}`);
  return payload.plugin;
}

function parseArguments(argv) {
  const options = { pluginIds: [], publish: false, outputRoot: defaultOutputRoot, envFile: null, apiBase: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--publish") options.publish = true;
    else if (argument === "--plugin") options.pluginIds.push(argv[++index]);
    else if (argument === "--out") options.outputRoot = resolve(argv[++index]);
    else if (argument === "--env-file") options.envFile = resolve(argv[++index]);
    else if (argument === "--api-base") options.apiBase = argv[++index];
    else if (argument === "--all") continue;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (options.pluginIds.some((value) => !value)) throw new Error("--plugin requires a plugin name.");
  return options;
}

export async function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const discovered = await discoverPlugins();
  const requested = new Set(options.pluginIds);
  const selected = requested.size === 0 ? discovered : discovered.filter((plugin) => requested.has(plugin.id));
  const missing = [...requested].filter((id) => !selected.some((plugin) => plugin.id === id));
  if (missing.length > 0) throw new Error(`Unknown plugin(s): ${missing.join(", ")}`);
  if (selected.length === 0) throw new Error("No plugins were selected.");

  const packaged = [];
  for (const plugin of selected) {
    const result = await packagePlugin(plugin, options.outputRoot);
    packaged.push(result);
    console.log(`Packaged ${result.id}@${result.version} (${result.sizeBytes} bytes)`);
  }
  if (!options.publish) {
    console.log(`Created ${packaged.length} plugin package(s) under ${options.outputRoot}`);
    return packaged;
  }

  const fileValues = options.envFile ? parseEnvFile(await readFile(options.envFile, "utf8")) : {};
  const values = { ...fileValues, ...process.env };
  const apiBase = apiBaseUrl(values, options.apiBase);
  const accessToken = await authenticatePublisher({ apiBase, values });
  for (const plugin of packaged) {
    const published = await publishPlugin(plugin, { apiBase, accessToken });
    console.log(`Published ${published.pluginId}@${published.latestRelease?.version ?? plugin.version}`);
  }
  return packaged;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
