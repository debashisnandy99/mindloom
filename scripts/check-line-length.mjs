#!/usr/bin/env node
/**
 * Pre-commit check: enforce a maximum line length (80 characters).
 *
 * File paths are passed as CLI args by lint-staged. For any file that has a
 * line over the limit we auto-run Prettier (printWidth 80) to reformat it,
 * then re-check. lint-staged re-stages files modified here, so the formatted
 * version is what gets committed.
 *
 * The commit only fails on lines whose length comes from *code*. String
 * literals, template literals (including multi-line ones), comments, URLs and
 * SVG paths are excluded — Prettier cannot break them and they must not block a
 * commit. In practice Prettier wraps everything else, so commits proceed
 * automatically rather than erroring out.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MAX = 80;
const files = process.argv.slice(2);

function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    // File was deleted/renamed out from under us; nothing to check.
    return null;
  }
}

/** Count Unicode code points (wide chars count once), not UTF-16 units. */
function width(str) {
  return [...str].length;
}

/**
 * Scan the whole file once and return, per line, the number of code-point
 * characters that are *code* — i.e. outside strings, template literals and
 * comments. State (template literal / block comment) carries across lines so
 * the inner lines of a multi-line prompt or comment count as zero code.
 *
 * This is a heuristic lexer: when in doubt (e.g. backticks inside a regex) it
 * errs toward treating text as string content, which only ever excludes a line
 * from the check — it never produces a false failure.
 */
function codeWidthPerLine(text) {
  const widths = [];
  let code = 0;
  let state = "CODE"; // CODE | LINE_COMMENT | BLOCK_COMMENT | SQ | DQ | TMPL
  const chars = [...text];

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];

    if (c === "\n") {
      if (state === "LINE_COMMENT" || state === "SQ" || state === "DQ") {
        state = "CODE"; // these never legally span a line
      }
      widths.push(code);
      code = 0;
      continue;
    }

    switch (state) {
      case "CODE":
        if (c === "/" && next === "/") {
          state = "LINE_COMMENT";
          i++;
        } else if (c === "/" && next === "*") {
          state = "BLOCK_COMMENT";
          i++;
        } else if (c === "'") {
          state = "SQ";
        } else if (c === '"') {
          state = "DQ";
        } else if (c === "`") {
          state = "TMPL";
        } else {
          code++;
        }
        break;
      case "LINE_COMMENT":
        break;
      case "BLOCK_COMMENT":
        if (c === "*" && next === "/") {
          state = "CODE";
          i++;
        }
        break;
      case "SQ":
        if (c === "\\") i++;
        else if (c === "'") state = "CODE";
        break;
      case "DQ":
        if (c === "\\") i++;
        else if (c === '"') state = "CODE";
        break;
      case "TMPL":
        if (c === "\\") i++;
        else if (c === "`") state = "CODE";
        break;
    }
  }
  widths.push(code); // final line (no trailing newline)
  return widths;
}

/** Lines over MAX whose *code* also exceeds MAX (strings/comments excluded). */
function codeViolations(text) {
  const lines = text.split("\n");
  const codeWidths = codeWidthPerLine(text);
  const bad = [];
  lines.forEach((line, i) => {
    if (width(line) <= MAX) return;
    if ((codeWidths[i] ?? 0) <= MAX) return;
    bad.push({ line: i + 1, length: width(line) });
  });
  return bad;
}

// First pass: hand any file with an over-long line to Prettier.
const toFormat = files.filter((file) => {
  const text = readText(file);
  return text !== null && text.split("\n").some((l) => width(l) > MAX);
});

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

// Second pass: report only real code lines Prettier could not shorten.
const violations = [];
for (const file of files) {
  const text = readText(file);
  if (text === null) continue;
  for (const { line, length } of codeViolations(text)) {
    violations.push({ file, line, length });
  }
}

if (violations.length > 0) {
  console.error(
    `\nLine length check failed: ${violations.length} code line(s) still ` +
      `exceed ${MAX} characters after formatting. Fix these by hand:\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} (${v.length} chars)`);
  }
  console.error("");
  process.exit(1);
}
