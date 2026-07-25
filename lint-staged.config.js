/**
 * Pre-commit checks via lint-staged.
 * ESLint runs only on staged client files; typecheck runs once per package
 * whenever any of that package's TypeScript files are staged.
 */
export default {
  "client/**/*.{ts,tsx}": (files) => [
    `bunx eslint --max-warnings=0 --config client/eslint.config.js ${files.map(quote).join(" ")}`,
    "bun run --filter mindloom typecheck",
  ],
  "server/**/*.{ts,tsx}": () => "bun run --filter mindloom-server typecheck",
};

function quote(file) {
  return `"${file.replace(/"/g, '\\"')}"`;
}
