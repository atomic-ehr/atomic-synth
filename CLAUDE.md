---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Follow this flow:
* there is ./tasks/ folder with tasks to be done
* Wait for user to set the task to work on; task will be a file in tasks folder
* You working only on one task in a time - read the task file description in folder, document plan and progress back into task file. When task is completed, set it to [completed] status in a title.
* Use ./docs as your memory bank - read current summary of project keep it up-to-date, when you are changing the project


Official website: https://ucum.org/
* Use: bun mcp and lsp mcp
* Use ast-grep to search for code, refactoring and linting in the project
* Use context7 mcp to get docs about libraries
* Use ./refs/ucum/ as official UCUM specification
* Use bun mcp test tool or `bun test` to run tests
* Use ./tmp folder for temporal files and scripts
* Use ./scripts folder to write typescript scripts and run with bun
* All tests are in ./test folder

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.
