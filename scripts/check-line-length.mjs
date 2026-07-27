#!/usr/bin/env node
/**
 * Pre-commit check: fail if any staged file has a line longer than the
 * allowed maximum (80 characters). File paths are passed as CLI args by
 * lint-staged. Reports every offending file:line so they can be fixed.
 */
import { readFileSync } from "node:fs";

const MAX = 80;
const files = process.argv.slice(2);
const violations = [];

for (const file of files) {
  let contents;
  try {
    contents = readFileSync(file, "utf8");
  } catch {
    // Skip files that were deleted/renamed out from under us.
    continue;
  }
  const lines = contents.split("\n");
  lines.forEach((line, index) => {
    // Count Unicode code points, not UTF-16 units, so wide chars count once.
    const length = [...line].length;
    if (length > MAX) {
      violations.push({ file, line: index + 1, length });
    }
  });
}

if (violations.length > 0) {
  console.error(
    `\nLine length check failed: ${violations.length} line(s) exceed ` +
      `${MAX} characters.\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} (${v.length} chars)`);
  }
  console.error("");
  process.exit(1);
}
