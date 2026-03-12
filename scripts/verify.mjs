import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDemoWorkspace } from "../app/src/demo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function mustExist(relativePath) {
  await access(path.join(rootDir, relativePath));
}

const requiredFiles = [
  "app/index.html",
  "app/styles.css",
  "app/src/main.js",
  "app/src/planner.js",
  "tests/planner.test.js",
  "tests/exporter.test.js",
  "README.md",
  "docs/index.html"
];

for (const file of requiredFiles) {
  await mustExist(file);
}

const packageJson = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
for (const scriptName of ["dev", "test", "build", "verify"]) {
  assert.ok(packageJson.scripts?.[scriptName], `Missing package script: ${scriptName}`);
}

const readme = await readFile(path.join(rootDir, "README.md"), "utf8");
for (const expectedSnippet of ["ReliefSignal", "local-first", "npm run build", "npm run verify"]) {
  assert.match(readme, new RegExp(expectedSnippet), `README is missing "${expectedSnippet}"`);
}

const docsIndex = await readFile(path.join(rootDir, "docs", "index.html"), "utf8");
assert.match(docsIndex, /ReliefSignal/, "Built docs/index.html does not contain the app shell");

const tests = await readdir(path.join(rootDir, "tests"));
assert.ok(tests.length >= 2, "Expected at least two automated tests");

const seed = createDemoWorkspace(new Date("2026-03-11T10:00:00-08:00"));
assert.ok(seed.tasks.length >= 6, "Demo workspace should generate at least six signals");
assert.ok(seed.briefPreview.includes("Response Brief"), "Response brief preview should be generated");

console.log("Verification passed");
console.log(`- signals in demo workspace: ${seed.tasks.length}`);
console.log(`- generated output: docs/`);
