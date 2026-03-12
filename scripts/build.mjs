import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "app");
const outDir = path.join(rootDir, "docs");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(sourceDir, outDir, { recursive: true });
await writeFile(path.join(outDir, ".nojekyll"), "", "utf8");

console.log(`Built ReliefSignal to ${path.relative(rootDir, outDir)}`);
