import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const failures = [];
for (const file of files) {
  if (!/\.(?:ts|js|mjs|md|json|ya?ml)$/.test(file) && file !== "LICENSE")
    continue;
  const content = readFileSync(file, "utf8");
  if (/[\u2013\u2014]/u.test(content)) failures.push(`${file}: long dash`);
  if (file.endsWith(".ts") && /\/\*/u.test(content)) {
    failures.push(`${file}: block comment`);
  }
}
assert.equal(failures.length, 0, failures.join("\n"));
console.log("Source comments and punctuation checks passed.");
