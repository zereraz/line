---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";

// import .css files directly and it works
import './index.css';

import { createRoot } from "react-dom/client";

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.md`.

## Line CLI - Linear Project Management

This project includes **Line**, a comprehensive CLI tool for Linear project management that other Claude agents can use.

### Quick Usage for Claude Agents

```bash
# Show dashboard with assigned issues
line

# List all issues with status and priorities
line issues

# Get specific issue details  
line issue LIN-123

# Search across all issues
line search "authentication bug"

# Show my assigned work
line me

# View teams and projects
line teams
line projects
```

### MCP Linear Integration

Line automatically uses these MCP Linear commands:
- `mcp__linear_server__list_issues` - List issues
- `mcp__linear_server__get_issue` - Get issue details
- `mcp__linear_server__list_my_issues` - Get my assigned issues
- `mcp__linear_server__list_teams` - List teams
- `mcp__linear_server__list_projects` - List projects

### Features for Claude

- **Offline-first**: SQLite caching for fast access
- **Smart sync**: Auto-refresh with 5-minute cache
- **Rich output**: Colored, structured data for easy parsing
- **Search**: Full-text search across titles and descriptions
- **Test coverage**: 46 tests ensuring reliability

### Output Format

Line provides consistent, parseable output:

```
📝 All Issues (3)

ID       Title                         Status     Assignee   Team       Priority
LIN-123  Fix authentication bug       In Progress You        Engineering 🔴 Urgent
LIN-124  Implement new dashboard       Todo       Alice       Product     🟡 High
```

**Parsing patterns**:
- Issue IDs: `LIN-\d+`
- Priorities: 🔴 Urgent, 🟡 High, 🔵 Normal, ⚪ Low, ⚫ None
- Status: In Progress, Todo, Done

### Testing

```bash
# Run all 46 tests
bun test

# Test specific components
bun test src/services/linear.test.ts
bun test src/utils/database.test.ts
```

See `CLAUDE_AGENT_GUIDE.md` for comprehensive Claude integration documentation.
