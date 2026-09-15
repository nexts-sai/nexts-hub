import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defaultDataDirectory } from "./candidate-store.mjs";

export const defaultProfile = {
  job: { title: "AI 产品经理", salary: "面议", city: "北京", experience: "" },
  company: { name: "", description: "" },
  requirements: { must_have: ["产品经理经验"], nice_to_have: ["AI/大模型/SaaS 产品经验"] },
  filter: { max_age: 35, max_salary_k: 40, exclude_status: ["暂不考虑"] },
  keywords: ["AI产品经理"],
  scoring: { domain_keywords: ["教育", "学术", "科研"], tech_keywords: ["大模型", "llm", "rag", "agent", "aigc"], bonus_keywords: ["0-1", "从0到1"] },
};

export function loadProfile() {
  if (process.env.BOSS_ZHIPIN_PROFILE_JSON) return mergeProfile(JSON.parse(process.env.BOSS_ZHIPIN_PROFILE_JSON));
  const path = resolve(process.env.BOSS_ZHIPIN_PROFILE_PATH ?? join(defaultDataDirectory(), "search_profile.yaml"));
  if (!existsSync(path)) return structuredClone(defaultProfile);
  const text = readFileSync(path, "utf8");
  return mergeProfile(text.trim().startsWith("{") ? JSON.parse(text) : parseSimpleYaml(text));
}

export function formatDefaultJobRequirements(profile) {
  const job = profile.job ?? {};
  const requirements = profile.requirements ?? {};
  return [`岗位：${job.title ?? ""}`, `公司：${profile.company?.name ?? ""}`, "要求：", ...(requirements.must_have ?? []).map((value) => `- ${value}`), "加分项：", ...(requirements.nice_to_have ?? []).map((value) => `- ${value}`), `薪资：${job.salary ?? ""}`, `工作地：${job.city ?? ""}`].join("\n");
}

function mergeProfile(value) {
  const profile = value && typeof value === "object" ? value : {};
  return {
    ...structuredClone(defaultProfile), ...profile,
    job: { ...defaultProfile.job, ...(profile.job ?? {}) },
    company: { ...defaultProfile.company, ...(profile.company ?? {}) },
    requirements: { ...defaultProfile.requirements, ...(profile.requirements ?? {}) },
    filter: { ...defaultProfile.filter, ...(profile.filter ?? {}) },
    scoring: { ...defaultProfile.scoring, ...(profile.scoring ?? {}) },
  };
}

function parseSimpleYaml(text) {
  const root = {};
  let section = null;
  let activeList = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "");
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const top = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (top && !line.startsWith(" ")) {
      section = top[1]; activeList = null;
      root[section] = top[2] ? scalar(top[2]) : {};
      continue;
    }
    const nested = /^\s{2}([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (nested && section) {
      const [, key, value] = nested;
      if (!value) { root[section][key] = []; activeList = key; }
      else { root[section][key] = scalar(value); activeList = null; }
      continue;
    }
    const listItem = /^\s+(?:-\s+)(.+)$/.exec(line);
    if (listItem && section) {
      if (Array.isArray(root[section])) root[section].push(scalar(listItem[1]));
      else if (activeList) root[section][activeList].push(scalar(listItem[1]));
      else if (root[section] && Object.keys(root[section]).length === 0) root[section] = [scalar(listItem[1])];
    }
  }
  return root;
}

function scalar(value) {
  const text = value.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  if (text.startsWith("[") && text.endsWith("]")) return text.slice(1, -1).split(",").map((item) => scalar(item)).filter((item) => item !== "");
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  if (/^(?:true|false)$/i.test(text)) return text.toLowerCase() === "true";
  return text;
}
