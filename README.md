# Line CLI

```
┬  ┬┌┐┌┌─┐
│  ││││├┤ 
┴─┘┴┘└┘└─┘
```

Professional Linear project management from your terminal.

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

- **Fast & Offline-first**: SQLite caching with smart sync
- **Professional UI**: Clean terminal interface built with Ink
- **Interactive Mode**: Keyboard navigation and menu system
- **Linear Integration**: Connects via MCP commands
- **Cross-platform**: Standalone binaries, no dependencies
- **Fully Tested**: 46+ tests ensuring reliability

## Commands

| Command | Description |
|---------|-------------|
| `line` | Show dashboard |
| `line issues` | List all issues |
| `line issue <id>` | Show issue details |
| `line me` | Show my assigned issues |
| `line search <query>` | Search issues |
| `line teams` | List teams |
| `line projects` | List projects |

## Development

```bash
git clone https://github.com/zereraz/line.git
cd line
bun install
bun test           # Run 46 tests
bun run build:all  # Build for all platforms
```

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/zereraz/line/main/install.sh | bash -s -- --uninstall
```

---

Built with [Bun](https://bun.sh) • [Ink](https://github.com/vadimdemedes/ink) • SQLite