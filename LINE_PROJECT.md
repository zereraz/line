# Line CLI Development Project

```
┬  ┬┌┐┌┌─┐
│  ││││├┤ 
┴─┘┴┘└┘└─┘
```

## Project Vision
Transform Line CLI from a Linear client into a powerful, independent project management and AI orchestration system.

## Current Sprint: v0.1.0 - Foundation & Rebranding

### 🔴 Critical Path
- [ ] **LINE-001**: Complete cleanup and release v0.0.1 baseline
  - [x] Unicode icons + colors implemented
  - [ ] Commit cleanup changes  
  - [ ] Release v0.0.1 tag
  
- [ ] **LINE-002**: Rebrand from Linear to Line (independent system)
  - [ ] Update README and docs to reflect Line (not Linear CLI)
  - [ ] Remove Linear references from code comments
  - [ ] Create Line-native task ID system (LINE-xxx)

### 🟡 High Priority Features
- [ ] **LINE-003**: Implement btop-inspired visual design
  - [ ] Progress bars with gradients
  - [ ] Smooth animations and transitions
  - [ ] Rich box drawing layouts
  - [ ] Information density optimization

- [ ] **LINE-004**: Build Claude Code fleet orchestration
  - [ ] Multi-instance management
  - [ ] Task delegation system
  - [ ] Approval workflow for AI decisions
  - [ ] Instance health monitoring

- [ ] **LINE-005**: Create native Line task management
  - [ ] LINE-xxx ID generation
  - [ ] Task creation, editing, status updates
  - [ ] Dependency tracking
  - [ ] Time tracking integration

### 🔵 Medium Priority Enhancements
- [ ] **LINE-006**: Add life management features
  - [ ] Personal goals tracking
  - [ ] Habit monitoring
  - [ ] Learning progress visualization
  - [ ] Work-life balance metrics

- [ ] **LINE-007**: JSON output mode for programmatic use
  - [ ] `--json` flag for all commands
  - [ ] Claude Code integration helpers
  - [ ] Bulk operations support

- [ ] **LINE-008**: Persistent interactive mode
  - [ ] Vim-like keybindings (hjkl, /, :)
  - [ ] Modal interface design
  - [ ] Real-time updates
  - [ ] Multi-pane layouts

- [ ] **LINE-009**: Optional MCP integrations
  - [ ] Plugin system architecture
  - [ ] Linear sync plugin
  - [ ] GitHub Issues plugin
  - [ ] Notion plugin

## Future Sprints

### v0.2.0 - AI Orchestration
- Advanced Claude Code integration
- Task automation workflows
- Smart assignment algorithms

### v0.3.0 - Life Management
- Personal goal tracking
- Learning modules
- Habit formation tools

### v0.4.0 - Team Collaboration
- Real-time sync between team members
- Advanced dependency management
- Sprint planning tools

## Architecture Notes

### Core Philosophy
1. **Line-first**: Own task system, external integrations are optional
2. **AI-native**: Built for Claude Code orchestration from the ground up
3. **Terminal-first**: Beautiful, functional CLI interface
4. **Life-integrated**: Work, learning, personal goals in one system

### Technical Stack
- **Runtime**: Bun
- **UI**: Ink (React for terminal)
- **Database**: SQLite (offline-first)
- **Integrations**: MCP plugins (optional)
- **Testing**: Comprehensive test suite

---

**Next Action**: Complete v0.0.1 release, then start LINE-002 rebranding effort.