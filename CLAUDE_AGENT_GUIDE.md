# Claude Agent Guide for Line CLI

This guide teaches Claude agents how to effectively use the Line CLI tool for Linear project management.

## Overview

Line is a CLI tool that connects to Linear via MCP commands, providing offline-first project management with SQLite caching. Claude agents can use this tool to:

- Manage issues and projects
- Track team workflows
- Search and organize tasks
- Create and update Linear items

## Available Commands for Claude Agents

### Basic Usage Patterns

```bash
# Check what's assigned to you
line me

# Get overview of all work
line issues

# Find specific issues
line search "authentication bug"
line search "database migration"

# Get issue details
line issue LIN-123

# View team structure
line teams

# Check project status
line projects
```

### MCP Integration Commands

The Line CLI automatically uses these MCP Linear commands:

| CLI Command | MCP Command Used | Purpose |
|-------------|------------------|---------|
| `line issues` | `mcp__linear_server__list_issues` | List all issues |
| `line me` | `mcp__linear_server__list_my_issues` | Get assigned issues |
| `line issue <id>` | `mcp__linear_server__get_issue` | Get issue details |
| `line teams` | `mcp__linear_server__list_teams` | List teams |
| `line projects` | `mcp__linear_server__list_projects` | List projects |
| `line search <query>` | Local SQLite + `mcp__linear_server__list_issues` | Search functionality |

## Claude Agent Workflows

### 1. Project Status Check

```bash
# Start with dashboard overview
line

# Get detailed issue list
line issues

# Check specific team's work
line teams
```

**Output Parsing**: Line provides structured, colored output that Claude can easily parse:
- Issue IDs (e.g., LIN-123)
- Status indicators (In Progress, Todo, Done)
- Priority levels (🔴 Urgent, 🟡 High, 🔵 Normal, ⚪ Low)
- Team assignments

### 2. Issue Investigation

```bash
# Search for related issues
line search "authentication"

# Get specific issue details
line issue LIN-123

# Check who's working on what
line me
```

### 3. Team Coordination

```bash
# View all teams
line teams

# Check project progress
line projects

# Find issues by team/project
line search "Engineering team"
```

## Advanced Claude Integration

### Using Line in Claude Code Sessions

1. **Project Analysis**:
   ```bash
   # Get current sprint status
   line issues | grep "In Progress"
   
   # Find blockers
   line search "blocked" 
   ```

2. **Task Planning**:
   ```bash
   # Check available capacity
   line me
   
   # Review upcoming work
   line issues | grep "Todo"
   ```

3. **Status Reporting**:
   ```bash
   # Generate status update
   line me > my_current_work.txt
   line projects > project_status.txt
   ```

### Parsing Line Output

Line provides consistent, structured output that Claude can parse:

```
📝 All Issues (3)

ID       Title                         Status     Assignee   Team       Priority
LIN-123  Fix authentication bug       In Progress You        Engineering 🔴 Urgent
LIN-124  Implement new dashboard       Todo       Alice       Product     🟡 High
```

**Key parsing patterns**:
- Issue IDs: `LIN-\d+`
- Status: `In Progress`, `Todo`, `Done`
- Priority emojis: 🔴🟡🔵⚪⚫
- Team names: Engineering, Product, Design

## MCP Command Reference

### Core Issue Management

```typescript
// These MCP commands are automatically used by Line:

// List issues with filtering
mcp__linear_server__list_issues({
  assigneeId?: string,
  teamId?: string,
  stateId?: string,
  query?: string,
  limit?: number
})

// Get specific issue
mcp__linear_server__get_issue({
  id: string
})

// Get my assigned issues  
mcp__linear_server__list_my_issues({
  limit?: number
})
```

### Team and Project Data

```typescript
// List teams
mcp__linear_server__list_teams({
  query?: string,
  limit?: number
})

// List projects
mcp__linear_server__list_projects({
  teamId?: string,
  includeArchived?: boolean
})

// Get team details
mcp__linear_server__get_team({
  query: string // ID, key, or name
})
```

### Future Commands (Roadmap)

```typescript
// Create new issue
mcp__linear_server__create_issue({
  title: string,
  teamId: string,
  description?: string,
  assigneeId?: string,
  priority?: number,
  stateId?: string
})

// Update existing issue
mcp__linear_server__update_issue({
  id: string,
  title?: string,
  description?: string,
  assigneeId?: string,
  stateId?: string,
  priority?: number
})
```

## Offline Capabilities

Line provides offline-first functionality:

1. **SQLite Cache**: All data cached locally for fast access
2. **Smart Sync**: Automatic background sync with configurable intervals
3. **Offline Mode**: Works without internet after initial sync
4. **Cache Strategy**:
   - Issues: 5-minute cache
   - Teams: 1-hour cache  
   - Projects: 30-minute cache

## Error Handling

Line gracefully handles common scenarios:

```bash
# Network issues - falls back to cache
line issues  # Shows cached data if Linear unavailable

# Invalid commands
line invalid-command  # Shows help message

# Missing arguments
line issue  # Shows error: "Issue ID required"
line search  # Shows error: "Search query required"
```

## Integration Examples

### 1. Sprint Planning Assistant

```bash
#!/bin/bash
echo "=== Sprint Planning Report ==="
echo "Current Team Capacity:"
line me

echo -e "\n=== Available Work ==="
line issues | grep "Todo"

echo -e "\n=== In Progress ==="  
line issues | grep "In Progress"

echo -e "\n=== Team Overview ==="
line teams
```

### 2. Daily Standup Helper

```bash
#!/bin/bash
echo "=== My Work ==="
line me

echo -e "\n=== Blockers ==="
line search "blocked"

echo -e "\n=== Urgent Items ==="
line issues | grep "🔴 Urgent"
```

### 3. Project Health Check

```bash
#!/bin/bash
echo "=== Project Status ==="
line projects

echo -e "\n=== Team Workload ==="
line teams

echo -e "\n=== Critical Issues ==="
line search "critical"
```

## Best Practices for Claude Agents

1. **Always start with `line` or `line me`** for context
2. **Use search liberally** - Line's search is fast and comprehensive
3. **Parse issue IDs** for follow-up commands
4. **Check team structure** with `line teams` for collaboration
5. **Use project view** for high-level planning
6. **Leverage caching** - repeated commands are very fast

## Testing and Validation

Line includes comprehensive tests that Claude can reference:

```bash
# Run all tests to verify functionality
cd ~/Code/Zereraz/line
bun test

# Test specific components
bun test src/services/linear.test.ts  # MCP integration tests
bun test src/utils/database.test.ts   # SQLite functionality
bun test src/cli.test.ts              # CLI argument parsing
```

## Configuration

Line automatically configures itself:
- Database: `~/.line/data.db`
- No configuration files needed
- MCP Linear commands detected automatically
- Smart sync based on data age

## Troubleshooting

Common issues and solutions:

```bash
# Database issues
rm ~/.line/data.db  # Reset local cache

# Permission errors  
chmod +x ~/Code/Zereraz/line/index.ts

# Dependency issues
cd ~/Code/Zereraz/line && bun install

# Test MCP connection
line issues --force-sync  # Force fresh data from Linear
```

## Future Enhancements

Planned features that will expand Claude integration:

- Issue creation: `line create --title "Bug fix" --team Engineering`
- Issue editing: `line edit LIN-123 --status "In Progress"`
- Comment management: `line comment LIN-123 "Updated the fix"`
- Custom views: `line view my-sprint`
- Real-time sync: Live updates from Linear
- Bulk operations: `line assign @me LIN-123 LIN-124`

## Summary

Line provides Claude agents with a powerful, tested, offline-first interface to Linear project management. The tool abstracts MCP complexity while providing rich, parseable output and comprehensive functionality for project coordination and issue management.