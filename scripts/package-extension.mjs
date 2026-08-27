import { ZipArchive } from "archiver";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, relative, sep } from "node:path";

const fixedArchiveDate = new Date("2000-01-01T00:00:00.000Z");

async function filesUnder(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = `${directory}${sep}${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Extension packages cannot contain symbolic links: ${absolutePath}`);
      if (entry.isDirectory()) await visit(absolutePath);
      else if (entry.isFile()) files.push({ absolutePath, archivePath: relative(root, absolutePath).split(sep).join("/") });
    }
  }
  await visit(root);
  return files;
}

export async function packageDirectory(sourceDirectory, targetPath) {
  const temporaryPath = `${targetPath}.tmp`;
  await mkdir(dirname(targetPath), { recursive: true });
  await rm(temporaryPath, { force: true });
  const files = await filesUnder(sourceDirectory);
  if (files.length === 0) throw new Error(`Extension package source is empty: ${sourceDirectory}`);
  await new Promise((resolve, reject) => {
    const output = createWriteStream(temporaryPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.once("close", resolve);
    output.once("error", reject);
    archive.once("error", reject);
    archive.on("warning", reject);
    archive.pipe(output);
    for (const file of files) archive.append(createReadStream(file.absolutePath), { name: file.archivePath, date: fixedArchiveDate, mode: 0o644 });
    void archive.finalize();
  });
  await rename(temporaryPath, targetPath);
  return (await stat(targetPath)).size;
}
