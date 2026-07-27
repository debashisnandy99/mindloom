/**
 * Pre-commit checks via lint-staged.
 * A line-length check (max 80 chars) runs on every staged file. ESLint runs
 * only on staged client files; typecheck runs once per package whenever any
 * of that package's TypeScript files are staged.
 */
export default {
  "*": (files) =>
    `node scripts/check-line-length.mjs ${files.map(quote).join(" ")}`,
  "client/**/*.{ts,tsx}": (files) => [
    `bunx eslint --max-warnings=0 --config client/eslint.config.js ` +
      files.map(quote).join(" "),
    "bun run --filter mindloom typecheck",
  ],
  "server/**/*.{ts,tsx}": () => "bun run --filter mindloom-server typecheck",
};

function quote(file) {
  return `"${file.replace(/"/g, '\\"')}"`;
}
