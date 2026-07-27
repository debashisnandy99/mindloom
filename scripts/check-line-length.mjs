#!/usr/bin/env node
/**
 * Pre-commit check: enforce a maximum line length (80 characters).
 *
 * File paths are passed as CLI args by lint-staged. For any file that has a
 * line over the limit we auto-run Prettier (printWidth 80) to reformat it,
 * then re-check. lint-staged re-stages files modified here, so the formatted
 * version is what gets committed. We only fail the commit if lines still
 * exceed the limit afterwards (e.g. long string literals or URLs that
 * Prettier cannot wrap) — those must be fixed by hand.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MAX = 80;
const files = process.argv.slice(2);

/** Return the 1-based line numbers in `file` that exceed MAX code points. */
function longLines(file) {
  let contents;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    // File was deleted/renamed out from under us; nothing to check.
    return [];
  }
  const bad = [];
  contents.split("\n").forEach((line, index) => {
    // Count Unicode code points, not UTF-16 units, so wide chars count once.
    if ([...line].length > MAX) {
      bad.push({ line: index + 1, length: [...line].length });
    }
  });
  return bad;
}

// First pass: which files have any over-long line?
const toFormat = files.filter((file) => longLines(file).length > 0);

if (toFormat.length > 0) {
  console.error(
    `Reformatting ${toFormat.length} file(s) with Prettier ` +
      `(lines over ${MAX} chars)...`,
  );
  // --ignore-unknown skips files Prettier has no parser for (lock files, etc).
  const result = spawnSync(
    "bunx",
    ["prettier", "--write", "--ignore-unknown", ...toFormat],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    console.error("\nPrettier failed to run; aborting commit.");
    process.exit(1);
  }
}

// Second pass: report anything Prettier could not fix.
const violations = [];
for (const file of files) {
  for (const { line, length } of longLines(file)) {
    violations.push({ file, line, length });
  }
}

if (violations.length > 0) {
  console.error(
    `\nLine length check failed: ${violations.length} line(s) still ` +
      `exceed ${MAX} characters after formatting. Fix these by hand:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} (${v.length} chars)`);
  }
  console.error("");
  process.exit(1);
}
