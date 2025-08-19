# AI Assistant Guide for Line CLI

This guide teaches AI assistants how to effectively use the Line CLI tool for universal project management.

## Overview

Line is a universal CLI tool that supports multiple backends (Linear via MCP, GitHub Issues, standalone), providing offline-first project management with SQLite caching. AI assistants can use this tool to:

- Manage issues and projects
- Track team workflows
- Search and organize tasks
- Create and update items across backends

## Available Commands for AI Assistants

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

Line supports two backend systems through MCP:

#### Linear Backend (External Issues)
When using Linear backend, Line automatically uses these MCP commands:

| CLI Command | MCP Command Used | Purpose |
|-------------|------------------|---------|
| `line issues` | `mcp__linear_server__list_issues` | List all issues |
| `line me` | `mcp__linear_server__list_my_issues` | Get assigned issues |
| `line issue <id>` | `mcp__linear_server__get_issue` | Get issue details |
| `line teams` | `mcp__linear_server__list_teams` | List teams |
| `line projects` | `mcp__linear_server__list_projects` | List projects |
| `line search <query>` | Local SQLite + `mcp__linear_server__list_issues` | Search functionality |

#### Line Native Tasks (Internal Task Management)
Line also provides comprehensive native task management through MCP:

| MCP Command | Purpose | Parameters |
|-------------|---------|------------|
| `mcp__line_server__create_task` | Create new Line task | `title*`, `description`, `type`, `priority`, `assignee`, `due_date`, `parent_id`, `labels` |
| `mcp__line_server__update_task` | Update existing task | `id*`, `title`, `description`, `type`, `status`, `priority`, `assignee`, `time_tracked`, `progress`, `due_date`, `parent_id` |
| `mcp__line_server__get_task` | Get specific task | `id*` |
| `mcp__line_server__delete_task` | Delete task | `id*` |
| `mcp__line_server__list_tasks` | List tasks with filters | `status`, `type`, `assignee`, `parent_only` |
| `mcp__line_server__assign_task` | Assign task to user | `id*`, `assignee*` |
| `mcp__line_server__set_priority` | Set task priority | `id*`, `priority*` (urgent/high/normal/low) |
| `mcp__line_server__add_dependency` | Add task dependency | `task_id*`, `depends_on_id*` |

*Required parameters

#### Task Types and Statuses
- **Types**: `issue`, `goal`, `habit`, `learning`
- **Statuses**: `todo`, `in_progress`, `review`, `done`  
- **Priorities**: `urgent`, `high`, `normal`, `low`

## AI Assistant Workflows

### 1. Project Status Check

```bash
# Start with dashboard overview
line

# Get detailed issue list
line issues

# Check specific team's work
line teams
```

**Output Parsing**: Line provides structured, colored output that AI assistants can easily parse:
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

## Advanced AI Integration

### Using Line in AI Assistant Sessions

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

Line provides consistent, structured output that AI assistants can parse:

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

### Linear Backend Commands

```typescript
// These MCP commands are automatically used by Line for Linear integration:

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

### Line Native Task Commands

```typescript
// Claude Code can directly use these MCP commands for Line task management:

// Create new task
mcp__line_server__create_task({
  title: string,                    // Required
  description?: string,
  type?: 'issue' | 'goal' | 'habit' | 'learning',
  priority?: 'urgent' | 'high' | 'normal' | 'low',
  assignee?: string,
  due_date?: string,               // ISO string
  parent_id?: string,              // For subtasks
  labels?: string[]                // Label IDs
})

// Update existing task
mcp__line_server__update_task({
  id: string,                      // Required
  title?: string,
  description?: string,
  type?: 'issue' | 'goal' | 'habit' | 'learning',
  status?: 'todo' | 'in_progress' | 'review' | 'done',
  priority?: 'urgent' | 'high' | 'normal' | 'low',
  assignee?: string,
  time_tracked?: number,           // Minutes
  progress?: number,               // 0-100
  due_date?: string,
  parent_id?: string
})

// Get task details
mcp__line_server__get_task({
  id: string                       // Required (LINE-001, LINE-002, etc.)
})

// List tasks with filtering
mcp__line_server__list_tasks({
  status?: 'todo' | 'in_progress' | 'review' | 'done',
  type?: 'issue' | 'goal' | 'habit' | 'learning',
  assignee?: string,
  parent_only?: boolean            // Only top-level tasks
})

// Quick assignment
mcp__line_server__assign_task({
  id: string,                      // Required
  assignee: string                 // Required
})

// Set priority
mcp__line_server__set_priority({
  id: string,                      // Required
  priority: 'urgent' | 'high' | 'normal' | 'low'  // Required
})

// Add dependency
mcp__line_server__add_dependency({
  task_id: string,                 // Task that depends on another
  depends_on_id: string            // Task that is depended upon
})

// Delete task
mcp__line_server__delete_task({
  id: string                       // Required
})
```

### Example Task Management Workflow

```typescript
// 1. Create a new feature task
const featureTask = await mcp__line_server__create_task({
  title: "Implement user authentication",
  description: "Add JWT-based authentication to the API",
  type: "issue",
  priority: "high",
  assignee: "Claude"
})

// 2. Create subtasks
const subTask1 = await mcp__line_server__create_task({
  title: "Design authentication schema",
  type: "issue",
  priority: "high",
  parent_id: featureTask.id,
  assignee: "Claude"
})

const subTask2 = await mcp__line_server__create_task({
  title: "Implement JWT middleware",
  type: "issue", 
  priority: "normal",
  parent_id: featureTask.id,
  assignee: "Claude"
})

// 3. Add dependency (JWT middleware depends on schema)
await mcp__line_server__add_dependency({
  task_id: subTask2.id,
  depends_on_id: subTask1.id
})

// 4. Start working on the first task
await mcp__line_server__update_task({
  id: subTask1.id,
  status: "in_progress"
})

// 5. Track progress
await mcp__line_server__update_task({
  id: subTask1.id,
  progress: 75,
  time_tracked: 120  // 2 hours in minutes
})

// 6. Complete the task
await mcp__line_server__update_task({
  id: subTask1.id,
  status: "done",
  progress: 100
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

## Best Practices for AI Assistants

1. **Always start with `line` or `line me`** for context
2. **Use search liberally** - Line's search is fast and comprehensive
3. **Parse issue IDs** for follow-up commands
4. **Check team structure** with `line teams` for collaboration
5. **Use project view** for high-level planning
6. **Leverage caching** - repeated commands are very fast

## Testing and Validation

Line includes comprehensive tests that AI assistants can reference:

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

Planned features that will expand AI assistant integration:

- Issue creation: `line create --title "Bug fix" --team Engineering`
- Issue editing: `line edit LIN-123 --status "In Progress"`
- Comment management: `line comment LIN-123 "Updated the fix"`
- Custom views: `line view my-sprint`
- Real-time sync: Live updates from Linear
- Bulk operations: `line assign @me LIN-123 LIN-124`

## Summary

Line provides AI assistants with a powerful, tested, offline-first interface to universal project management. The tool supports multiple backends while providing rich, parseable output and comprehensive functionality for project coordination and issue management.