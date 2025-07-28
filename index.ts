#!/usr/bin/env bun
import { render } from 'ink';
import React from 'react';
import { parseArgs } from 'util';
import App from './src/App.tsx';
import InteractiveMode from './src/components/InteractiveMode.tsx';

const args = parseArgs({
  args: Bun.argv.slice(2),
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
    'mcp-server': {
      type: 'boolean',
    },
  },
  allowPositionals: true,
});

if (args.values.help) {
  console.log(`
line - Linear-inspired project management CLI

Usage:
  line [command] [options]

Commands:
  issues               List all issues
  issue <id>           Show issue details
  create               Create new issue
  teams                List teams
  projects             List projects
  me                   Show my assigned issues
  search <query>       Search issues
  setup                Setup line as Claude Code MCP server
  sync                 Sync data from Linear (API or MCP)
  
Interactive Mode:
  line -i              Start interactive mode
  line --interactive   Start interactive mode

MCP Server Mode:
  line --mcp-server    Start MCP server for Claude Code integration
  
Options:
  -h, --help          Show help
  -v, --version       Show version
  -i, --interactive   Start interactive mode
      --mcp-server    Start MCP server mode
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

if (args.values.interactive) {
  // Start interactive mode only when explicitly requested
  app = render(React.createElement(InteractiveMode));
} else {
  // Start in single command mode (default)
  const command = args.positionals[0] || 'dashboard';
  const subArgs = args.positionals.slice(1);
  app = render(React.createElement(App, { command, args: subArgs }));
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