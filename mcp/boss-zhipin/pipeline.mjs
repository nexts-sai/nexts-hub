import { formatDefaultJobRequirements } from "./profile.mjs";

export function evaluateCandidate(resume, jobRequirements, profile) {
  const text = formatResume(resume).toLowerCase();
  const requirements = (jobRequirements || formatDefaultJobRequirements(profile)).toLowerCase();
  const configured = [...(profile.requirements?.must_have ?? []), ...(profile.requirements?.nice_to_have ?? [])]
    .flatMap((line) => String(line).toLowerCase().split(/[\s,/，、]+/)).filter((word) => word.length >= 2);
  const positive = [...new Set(["产品经理", "ai", "大模型", "saas", "b端", "需求分析", "prd", "数据分析", ...configured])];
  const negative = ["应届", "实习", "兼职"];
  let score = 50;
  const strengths = [];
  const weaknesses = [];
  for (const keyword of positive) if (text.includes(keyword)) { score += 5; strengths.push(`包含关键词: ${keyword}`); }
  for (const keyword of negative) if (text.includes(keyword)) { score -= 10; weaknesses.push(`包含风险词: ${keyword}`); }
  const requirementHits = configured.filter((keyword) => requirements.includes(keyword) && text.includes(keyword));
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    strengths: strengths.length ? strengths : ["需要人工评估"],
    weaknesses: weaknesses.length ? weaknesses : ["无明显风险"],
    requirement_hits: requirementHits,
    recommendation: score >= 70 ? "yes" : score >= 50 ? "maybe" : "no",
    summary: `关键词匹配分数 ${score}/100（简易评估，建议由工作流中的模型继续审核）`,
  };
}

export function filterAndScore(store, profile, topN = 20) {
  const filter = profile.filter ?? {};
  const scoring = profile.scoring ?? {};
  const candidates = store.query({ limit: 10_000 }).filter((candidate) => candidate.status !== "legacy");
  const filteredOut = { age: 0, salary: 0, status: 0 };
  const passed = [];
  for (const candidate of candidates) {
    const age = firstNumber(candidate.age, 99);
    if (age > (filter.max_age ?? 35)) { filteredOut.age += 1; continue; }
    const salary = maxNumber(candidate.salary);
    if (salary > (filter.max_salary_k ?? 40) && salary !== 0) { filteredOut.salary += 1; continue; }
    if ((filter.exclude_status ?? []).some((value) => String(candidate.jobStatus ?? "").includes(value))) { filteredOut.status += 1; continue; }
    passed.push({ ...candidate, ...scoreCandidate(candidate, scoring) });
  }
  passed.sort((left, right) => right._score - left._score);
  const top = passed.slice(0, topN);
  for (const candidate of top) store.update(candidate.expectId, { status: "shortlisted", score: candidate._score });
  return [{ _stats: true, total_candidates: candidates.length, filtered_out: filteredOut, passed_filter: passed.length, shortlisted: top.length }, ...top.map((candidate, index) => ({
    rank: index + 1,
    expectId: candidate.expectId ?? "", name: candidate.name ?? "", age: candidate.age ?? "", experience: candidate.experience ?? "",
    education: candidate.education ?? "", salary: candidate.salary ?? "", company: candidate.company ?? "", title: candidate.title ?? "",
    school: candidate.school ?? "", jobStatus: candidate.jobStatus ?? "", score: candidate._score,
    domain_hits: candidate._domainHits, tech_hits: candidate._techHits, share_url: candidate.share_url ?? "", fullText: String(candidate.fullText ?? "").slice(0, 300),
  }))];
}

export function exportReport(store, profile, topN = 10, includeDetail = true) {
  const top = store.query({ status: "shortlisted", limit: 200 }).sort((left, right) => (right.score ?? 0) - (left.score ?? 0)).slice(0, topN);
  if (!top.length) return "没有 shortlisted 状态的候选人。请先运行 boss_filter_and_score。";
  const job = profile.job ?? {};
  const lines = [`# ${job.city ?? ""} ${job.title ?? "候选人"}候选人`, "", `> 来源：BOSS 直聘搜索（${localDate()}）`, `> 岗位：${job.title ?? ""} | ${job.salary ?? ""} | ${job.city ?? ""}`, `> 搜索总量：${store.stats().total} 人 → 精筛 Top ${top.length}`, "", `## Top ${top.length} 候选人`, "", "| # | 姓名 | 分数 | 年龄 | 经验 | 学历 | 公司 | 薪资 | 状态 | 院校 | BOSS链接 | 核心优势 |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"];
  top.forEach((candidate, index) => lines.push(`| ${index + 1} | **${cell(candidate.name)}** | ${cell(candidate.score)} | ${cell(candidate.age)} | ${cell(candidate.experience)} | ${cell(candidate.education)} | ${cell(candidate.company)} | ${cell(candidate.salary)} | ${cell(candidate.jobStatus)} | ${cell(candidate.school)} | ${candidate.share_url ? `[链接](${candidate.share_url})` : "待获取"} | ${cell(String(candidate.fullText ?? "").slice(0, 120))} |`));
  lines.push("", "## 跟进状态", "", "| 姓名 | 分数 | BOSS链接 | 沟通 | 简历 | 一面 | 二面 | 备注 |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
  top.forEach((candidate) => lines.push(`| ${cell(candidate.name)} | ${cell(candidate.score)} | ${candidate.share_url ? `[链接](${candidate.share_url})` : "待获取"} | - | - | - | - | ${cell(candidate.notes ?? "")} |`));
  if (includeDetail) {
    lines.push("", "---", "", "## 候选人详情", "");
    top.forEach((candidate, index) => lines.push(`### ${index + 1}. ${candidate.name ?? "?"}（${candidate.company ?? "?"}）${candidate.score ?? "?"}分`, "", candidate.share_url ? `> BOSS 链接：${candidate.share_url}` : "", "", `**${candidate.age ?? "?"} | ${candidate.experience ?? "?"} | ${candidate.education ?? "?"} | ${candidate.jobStatus ?? "?"} | ${candidate.salary ?? "?"} | ${candidate.school ?? "?"}**`, "", String(candidate.fullText ?? "").slice(0, 400), "", "---", ""));
  }
  return lines.join("\n");
}

function scoreCandidate(candidate, scoring) {
  const text = `${candidate.fullText ?? ""} ${(candidate.skills ?? []).join(" ")}`.toLowerCase();
  const domainHits = (scoring.domain_keywords ?? []).filter((keyword) => text.includes(String(keyword).toLowerCase()));
  const techHits = (scoring.tech_keywords ?? []).filter((keyword) => text.includes(String(keyword).toLowerCase()));
  const bonusHits = (scoring.bonus_keywords ?? []).filter((keyword) => text.includes(String(keyword).toLowerCase()));
  let score = 50 + Math.min(domainHits.length * 8, 24) + Math.min(techHits.length * 6, 24) + (bonusHits.length ? 10 : 0);
  if (String(candidate.education).includes("博士")) score += 8; else if (String(candidate.education).includes("硕士")) score += 4;
  const salary = maxNumber(candidate.salary); if (salary > 0 && salary <= 25) score += 6; else if (salary > 25 && salary <= 30) score += 3; else if (salary > 35) score -= 5;
  const years = firstNumber(candidate.experience, 0); if (years >= 3 && years <= 7) score += 5; else if (years > 0 && years < 2) score -= 5;
  if (String(candidate.jobStatus).includes("离职")) score += 4; else if (String(candidate.jobStatus).includes("月内")) score += 2;
  return { _score: score, _domainHits: domainHits, _techHits: techHits };
}

function formatResume(resume) {
  return Object.entries(resume ?? {}).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value}`).join("\n");
}
function firstNumber(value, fallback) { const match = String(value ?? "").match(/\d+/); return match ? Number(match[0]) : fallback; }
function maxNumber(value) { const numbers = [...String(value ?? "").matchAll(/\d+/g)].map((match) => Number(match[0])); return numbers.length ? Math.max(...numbers) : 0; }
function cell(value) { return String(value ?? "?").replace(/\r?\n/g, " ").replace(/\|/g, "/"); }
function localDate() { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); }
