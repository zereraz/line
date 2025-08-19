# Line CLI

```
┬  ┬┌┐┌┌─┐
│  ││││├┤ 
┴─┘┴┘└┘└─┘
```

Universal project management CLI designed for AI orchestration and terminal-first workflows.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/zereraz/line/main/install.sh | bash
```

Supports: Linux (x64/arm64), macOS (x64/arm64), Windows (x64)

## Quick Start

```bash
line                 # Dashboard with your assigned issues
line issues          # List all issues  
line -i              # Interactive mode with keyboard navigation
line --help          # Show all commands
```

## Features

- **Native Task Management**: Built-in task management with dependencies, labels, and progress tracking
- **AI-Optimized**: Built for Claude Code and other AI assistants  
- **MCP Integration**: Standalone `@linecli/mcp` package for seamless Claude Code integration
- **Initially inspired by Linear**: Started as Linear integration, evolved into standalone solution
- **Advanced Search**: Full-text search with SQLite FTS5, filters, and ranking
- **Fast & Offline-first**: SQLite caching with smart sync (5-minute refresh)
- **Professional UI**: Clean terminal interface built with Ink
- **Interactive Mode**: Keyboard navigation and menu system
- **Cross-platform**: Standalone binaries, no dependencies
- **Fully Tested**: 173 tests ensuring reliability

## Architecture

### CLI Application (Root Level)
- **Terminal Interface**: React Ink-based UI for interactive and command-line usage
- **Local Database**: SQLite for offline-first operation and caching
- **Service Layer**: Clean architecture with modular design
- **Native Tasks**: Line's own task management system with advanced features

### MCP Package (`packages/mcp/`)
- **Standalone Package**: `@linecli/mcp` published to npm
- **Claude Code Integration**: Simple one-command setup: `claude mcp add line npx @linecli/mcp@latest`
- **Clean Tool Names**: Simplified `line__*` naming convention (no more `mcp__line_server__*`)
- **Self-contained**: No external dependencies, works independently

Perfect for teams using AI assistants like Claude Code, providing fast, offline-first project management with a clean terminal interface.

## Commands

| Command | Description |
|---------|-------------|
| `line` | Show dashboard |
| `line issues` | List all issues |
| `line issue <id>` | Show issue details |
| `line me` | Show my assigned issues |
| `line search <query>` | Advanced search with filters and ranking |
| `line teams` | List teams |
| `line projects` | List projects |
| `line setup` | Configure backend integration |
| `line sync` | Sync with external backends |

## Advanced Search

Line includes powerful full-text search capabilities powered by SQLite FTS5, providing fast and intelligent search across all your project data.

### Basic Search

```bash
line search "authentication bug"    # Search all content
line search login                   # Single term search
line search status:todo             # Filter by status
```

### Search Types

```bash
line search "bug fix" --type=issues         # Search only issues
line search "service restart" --type=comments   # Search only comments  
line search "auth solution" --type=line_tasks   # Search only Line tasks
line search "database" --type=issues,comments   # Search multiple types
```

### Advanced Filters

```bash
# Status and priority filtering
line search "bug" --status=todo,in_progress --priority=high,urgent

# Assignee and team filtering  
line search "dashboard" --assignee=alice --team=frontend

# Date range filtering
line search "migration" --after=2024-01-01 --before=2024-12-31

# Label filtering
line search "feature" --labels=enhancement,frontend

# Comment-specific filtering
line search "error" --author=bob --issue=LIN-123
```

### Query Syntax

```bash
# Exact phrases
line search '"authentication error"'

# Boolean operators
line search 'auth AND bug'
line search 'login OR signin'  
line search 'database NOT migration'

# Inline filters (parsed automatically)
line search 'status:todo priority:high assignee:alice bug'

# Prefix matching
line search 'auth*'  # Matches authentication, authorize, etc.
```

### Result Options

```bash
# Limit and pagination
line search "bug" --limit=50
line search "feature" --limit=25 --sort=date --order=desc

# Include/exclude snippets
line search "error" --snippets=true    # Show highlighted snippets
line search "bug" --snippets=false     # Hide snippets for faster results

# Sort options
line search "task" --sort=relevance    # Sort by search relevance (default)
line search "issue" --sort=date        # Sort by creation/update date
line search "bug" --sort=priority      # Sort by priority level
```

### Interactive Features

- **Auto-suggestions**: Get search suggestions as you type
- **Highlighted results**: Search terms highlighted in results
- **Relevance scoring**: Results ranked by relevance and recency  
- **Pagination**: Navigate large result sets with arrow keys
- **Result snippets**: See highlighted excerpts from matching content

## MCP Integration for Claude Code

Install Line for Claude Code with one simple command:

```bash
claude mcp add line npx @linecli/mcp@latest
```

### Clean Tool Names

Line uses simplified tool names for Claude Code integration:

```javascript
// List and search issues
line__list_issues({ limit: 50 })
line__search_issues({ query: "authentication bug" })

// Advanced search with filters
line__advanced_search({
  query: "authentication bug",
  types: ["issues", "comments"],
  filters: {
    status: ["In Progress", "Todo"],
    priority: ["high", "urgent"],
    assignee: ["alice"]
  },
  limit: 25,
  sortBy: "relevance"
})

// Line native task management
line__create_task({ title: "Fix auth bug", priority: "high" })
line__list_tasks({ status: "todo" })
line__update_task({ id: "LINE-001", status: "in_progress" })

// Comments and collaboration
line__list_comments({ issueId: "LIN-123" })
line__add_comment({ issueId: "LIN-123", content: "Working on this" })
```

### Key Features for AI Assistants

- **Offline-first**: Works without internet connectivity
- **Fast search**: SQLite-powered full-text search
- **Native tasks**: Create and manage Line tasks directly
- **Comments**: Add threaded comments to issues
- **Clean API**: Simple, consistent tool naming

## Development

```bash
git clone https://github.com/zereraz/line.git
cd line
bun install

# Run tests
bun test                    # Run CLI tests (157 tests)
cd packages/mcp && bun test # Run MCP package tests (16 tests)

# Build
bun run build:all          # Build CLI for all platforms

# Test MCP package
cd packages/mcp
bun run dev                 # Start MCP server in development
```

### Repository Structure

```
line/
├── src/                    # CLI application source
├── packages/mcp/           # Standalone MCP package
│   ├── src/index.ts       # Self-contained MCP server
│   ├── package.json       # Published as @linecli/mcp
│   └── README.md          # MCP-specific documentation
├── install.sh             # Cross-platform installer
└── README.md              # This file
```

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/zereraz/line/main/install.sh | bash -s -- --uninstall
```

---

Built with [Bun](https://bun.sh) • [Ink](https://github.com/vadimdemedes/ink) • SQLite