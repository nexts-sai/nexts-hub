import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { discoverSkills } from "./package-skills.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "nexts-skill-packages-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "unrelated-incomplete"));
  await mkdir(join(root, "record-skill"));
  await writeFile(join(root, "record-skill", "SKILL.md"), "---\nname: record-skill\ndescription: Record a workflow.\n---\n");
  return root;
}

test("selected skills can be packaged when an unrelated skill lacks its entrypoint", async (t) => {
  const root = await fixture(t);
  const items = await discoverSkills(root, ["record-skill"]);
  assert.deepEqual(items, [{ id: "record-skill", version: "1.0.0", directory: join(root, "record-skill") }]);
  await writeFile(join(root, "record-skill", "SKILL.md"), "---\nname: record-skill\nversion: 1.2.3\ndescription: Record a workflow.\n---\n");
  assert.equal((await discoverSkills(root, ["record-skill"]))[0].version, "1.2.3");
});

test("all-skills and explicitly selected incomplete skills still fail validation", async (t) => {
  const root = await fixture(t);
  await assert.rejects(discoverSkills(root), { code: "ENOENT" });
  await assert.rejects(discoverSkills(root, ["unrelated-incomplete"]), { code: "ENOENT" });
  assert.deepEqual(await discoverSkills(root, ["unknown-skill"]), []);
});
