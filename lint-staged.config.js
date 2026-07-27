/**
 * Pre-commit checks via lint-staged.
 * A line-length check (max 80 chars) runs on staged source/style files; when
 * a line is too long it auto-runs Prettier to reformat, and only fails if a
 * line still exceeds the limit afterwards. ESLint runs only on staged client
 * files; typecheck runs once per package whenever any of that package's
 * TypeScript files are staged.
 */
export default {
  "*.{ts,tsx,js,jsx,mjs,cjs,css,scss}": (files) =>
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
