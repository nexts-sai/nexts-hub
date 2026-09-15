import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const persistedFields = ["expectId", "name", "age", "experience", "education", "salary", "company", "title", "school", "major", "skills", "jobStatus", "expectCity", "fullText", "geekId", "lid", "jid"];

export function defaultDataDirectory() {
  if (process.env.BOSS_ZHIPIN_DATA_DIR) return resolve(process.env.BOSS_ZHIPIN_DATA_DIR);
  if (process.platform === "win32" && process.env.LOCALAPPDATA) return join(process.env.LOCALAPPDATA, "Nexts", "boss-zhipin-mcp");
  return resolve(process.cwd(), ".nexts", "boss-zhipin-mcp");
}

export class CandidateStore {
  constructor(filePath = join(defaultDataDirectory(), "candidates_db.json")) {
    this.filePath = filePath;
    this.data = { version: 2, candidates: {} };
    this.reload();
  }

  reload() {
    if (existsSync(this.filePath)) {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8"));
      if (!parsed || typeof parsed !== "object" || typeof parsed.candidates !== "object") throw new Error("Invalid candidate database");
      this.data = parsed;
    }
    return this;
  }

  save() {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(this.data, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, this.filePath);
  }

  has(expectId) { return Boolean(expectId) && Object.hasOwn(this.data.candidates, String(expectId)); }

  add(candidate, sourceKeyword = "") {
    const expectId = String(candidate.expectId ?? "").trim();
    if (!expectId || this.has(expectId)) return false;
    const now = new Date();
    const entry = { status: "new", source_keyword: sourceKeyword, first_seen: localDate(now), last_updated: now.toISOString(), share_url: "" };
    for (const field of persistedFields) if (candidate[field] !== undefined) entry[field] = candidate[field];
    this.data.candidates[expectId] = entry;
    return true;
  }

  update(expectId, fields) {
    const entry = this.data.candidates[String(expectId)];
    if (!entry) return false;
    for (const [key, value] of Object.entries(fields)) if (value !== undefined && value !== null) entry[key] = value;
    entry.last_updated = new Date().toISOString();
    this.save();
    return true;
  }

  get(expectId) { return this.data.candidates[String(expectId)] ?? null; }

  query(filters = {}) {
    const limit = boundedInteger(filters.limit ?? 50, 1, 10_000, "limit");
    const output = [];
    for (const candidate of Object.values(this.data.candidates)) {
      if (filters.status && candidate.status !== filters.status) continue;
      if (filters.hasShareUrl === true && !candidate.share_url) continue;
      if (filters.hasShareUrl === false && candidate.share_url) continue;
      if (filters.keyword && candidate.source_keyword !== filters.keyword) continue;
      if (filters.dateFrom && String(candidate.first_seen ?? "") < filters.dateFrom) continue;
      output.push(structuredClone(candidate));
      if (output.length >= limit) break;
    }
    return output;
  }

  remove({ expectIds, status, beforeDate } = {}) {
    const ids = expectIds?.length
      ? expectIds.map(String)
      : Object.entries(this.data.candidates).filter(([, candidate]) => status ? candidate.status === status : beforeDate ? String(candidate.first_seen ?? "9999") < beforeDate : true).map(([id]) => id);
    let removed = 0;
    for (const id of ids) if (Object.hasOwn(this.data.candidates, id)) { delete this.data.candidates[id]; removed += 1; }
    if (removed || (!expectIds?.length && !status && !beforeDate)) this.save();
    return removed;
  }

  stats() {
    const candidates = Object.values(this.data.candidates);
    const byStatus = {};
    for (const candidate of candidates) byStatus[candidate.status ?? "unknown"] = (byStatus[candidate.status ?? "unknown"] ?? 0) + 1;
    const today = localDate(new Date());
    return {
      total: candidates.length,
      by_status: byStatus,
      without_share_url: candidates.filter((candidate) => !candidate.share_url).length,
      today_new: candidates.filter((candidate) => candidate.first_seen === today).length,
      database_path: this.filePath,
    };
  }
}

function localDate(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function boundedInteger(value, minimum, maximum, name) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  return value;
}
