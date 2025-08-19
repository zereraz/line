# @linecli/mcp

Line CLI MCP Server - Provides project management tools for Claude Code via Model Context Protocol.

## Installation

```bash
claude mcp add line npx @linecli/mcp@latest
```

## Features

- **Issue Management**: List, search, and manage issues
- **Task Management**: Create and track Line native tasks  
- **Comments**: Add and view threaded comments
- **Search**: Advanced search across issues and comments
- **Teams & Projects**: Organize work by teams and projects

## Clean Tool Names

All tools use the `line__*` naming convention:

- `line__list_issues` - List all issues
- `line__search_issues` - Search issues by query
- `line__create_task` - Create new Line tasks
- `line__list_tasks` - List all tasks
- `line__advanced_search` - Advanced search with filtering

## Local Database

Uses SQLite database at `~/.line/data.db` for offline-first operation.

## License

MIT