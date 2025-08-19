#!/usr/bin/env bun
import { render } from 'ink';
import React from 'react';
import { parseArgs } from 'util';
import App from './src/App.tsx';
import InteractiveMode from './src/components/InteractiveMode.tsx';

// Check if this is a 'line' command to allow unknown options
const rawArgs = Bun.argv.slice(2);
const isLineCommand = rawArgs[0] === 'line';

const args = parseArgs({
  args: rawArgs,
  options: {
    help: {
      type: 'boolean',
      short: 'h',
    },
    version: {
      type: 'boolean',
      short: 'v',
    },
    interactive: {
      type: 'boolean',
      short: 'i',
    },
    json: {
      type: 'boolean',
      short: 'j',
    },
    'mcp-server': {
      type: 'boolean',
    },
  },
  allowPositionals: true,
  strict: !isLineCommand, // Allow unknown options for line commands
});

if (args.values.help) {
  console.log(`
line - Universal project management CLI

Usage:
  line                 Start interactive mode (default)
  line <command>       Run command directly

Commands:
  issues               List all issues
  issue <id>           Show issue details
  create               Create new issue
  search <query>       Search issues and comments
  teams                List teams
  projects             List projects
  me                   Show my assigned issues
  setup                Configure backend integration
  sync                 Sync data from configured backends

Line Task Management (Native):
  line                 Show all Line tasks (default: line list)
  line create <title>  Create new Line task
  line list            List Line tasks
  line show <id>       Show Line task details
  line update <id>     Update Line task
  line delete <id>     Delete Line task
  line me              Show my Line tasks
  line depend <id>     Add task dependency
  line stats           Show task statistics

Options:
  -h, --help          Show help
  -v, --version       Show version
  -i, --interactive   Force interactive mode (default behavior)
  -j, --json          Output in JSON format (for programmatic use)
      --mcp-server    Start MCP server for Claude Code integration

Storage:
  SQLite Database      Fast, offline-first local storage (~/.line/data.db)
  
MCP Integration:
  Claude Code          Install: claude mcp add line npx @linecli/mcp@latest

Examples:
  line                 # Interactive mode (default)
  line issues          # Show issues and exit
  line search "auth"   # Search across issues and comments
  line --json issues   # Output issues as JSON
  line issue ABC-123   # Show specific issue details

Line Task Examples:
  line create "Fix authentication bug" --type=issue --priority=high
  line list --status=todo
  line show LINE-001
  line update LINE-001 --status=in_progress
  line delete LINE-001
  line depend LINE-002 --on=LINE-001
  `);
  process.exit(0);
}

if (args.values.version) {
  const packageJson = await import('./package.json');
  console.log(`line v${packageJson.version}`);
  process.exit(0);
}

// MCP Server Mode
if (args.values['mcp-server']) {
  // Import and start MCP server
  const { startMCPServer } = await import('./src/mcp-server.ts');
  startMCPServer();
  // MCP server will handle its own lifecycle, so we return here
  // and don't continue to UI rendering
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

let app;

// Determine if we should run in interactive mode or command mode
const hasCommand = args.positionals.length > 0;
const forceInteractive = args.values.interactive;
const useInteractiveMode = !hasCommand || forceInteractive;

if (useInteractiveMode && !args.values.json) {
  // Start interactive mode (default when no command provided)
  app = render(React.createElement(InteractiveMode));
} else {
  // Start in single command mode
  const command = args.positionals[0] || 'dashboard';
  let subArgs: string[];
  
  if (command === 'line') {
    // For line commands, pass the raw arguments (excluding the first 'line' command)
    // This preserves flags like --priority=high that parseArgs strips out
    subArgs = rawArgs.slice(1);
  } else {
    subArgs = args.positionals.slice(1);
  }
  
  app = render(React.createElement(App, { 
    command, 
    args: subArgs, 
    jsonOutput: args.values.json 
  }));
}

// Graceful exit handling
process.on('SIGINT', () => {
  app.unmount();
  process.stdout.write('\x1B[?25h'); // Show cursor
  process.exit(0);
});

process.on('SIGTERM', () => {
  app.unmount();
  process.stdout.write('\x1B[?25h'); // Show cursor
  process.exit(0);
});

// Ensure cursor is restored on exit
process.on('exit', () => {
  process.stdout.write('\x1B[?25h'); // Show cursor
});