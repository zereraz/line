import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { dbQueries, type Issue, type Team, type Project, type Label, type Comment } from './utils/database.ts';

// Mock LineMCPServer for testing
class TestLineMCPServer {
  private testDb: Database;
  private testQueries: any;

  constructor() {
    this.testDb = new Database(':memory:');
    this.setupDatabase();
    this.testQueries = this.createTestQueries();
  }

  private setupDatabase() {
    this.testDb.exec(`
      CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        state_name TEXT,
        assignee_name TEXT,
        team_name TEXT,
        priority INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        key TEXT,
        description TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT,
        team_name TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS labels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        description TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS issue_labels (
        issue_id TEXT NOT NULL,
        label_id TEXT NOT NULL,
        PRIMARY KEY (issue_id, label_id),
        FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        parent_id TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_comments_issue_id ON comments(issue_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
    `);
  }

  private createTestQueries() {
    return {
      getAllIssues: () => {
        const issues = this.testDb.query<Issue, []>('SELECT * FROM issues ORDER BY updated_at DESC').all();
        return issues.map(issue => ({ ...issue, labels: this.getIssueLabels(issue.id) }));
      },
      getMyIssues: (assigneeName: string) => {
        const issues = this.testDb.query<Issue, [string]>('SELECT * FROM issues WHERE assignee_name = ? ORDER BY updated_at DESC').all(assigneeName);
        return issues.map(issue => ({ ...issue, labels: this.getIssueLabels(issue.id) }));
      },
      getIssueById: (id: string) => {
        const issue = this.testDb.query<Issue, [string]>('SELECT * FROM issues WHERE id = ?').get(id);
        if (issue) {
          issue.labels = this.getIssueLabels(issue.id);
        }
        return issue;
      },
      searchIssues: (query: string) => {
        const issues = this.testDb.query<Issue, [string, string]>('SELECT * FROM issues WHERE title LIKE ? OR description LIKE ? ORDER BY updated_at DESC').all(`%${query}%`, `%${query}%`);
        return issues.map(issue => ({ ...issue, labels: this.getIssueLabels(issue.id) }));
      },
      getAllTeams: () => this.testDb.query<Team, []>('SELECT * FROM teams ORDER BY name').all(),
      getTeamById: (id: string) => this.testDb.query<Team, [string]>('SELECT * FROM teams WHERE id = ?').get(id),
      getAllProjects: () => this.testDb.query<Project, []>('SELECT * FROM projects ORDER BY name').all(),
      getProjectById: (id: string) => this.testDb.query<Project, [string]>('SELECT * FROM projects WHERE id = ?').get(id),
      getAllLabels: () => this.testDb.query<Label, []>('SELECT * FROM labels ORDER BY name').all(),
      getLabelById: (id: string) => this.testDb.query<Label, [string]>('SELECT * FROM labels WHERE id = ?').get(id),
      getIssueLabels: this.getIssueLabels.bind(this),
      getCommentsByIssueId: (issueId: string) => this.testDb.query<Comment, [string]>('SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC').all(issueId),
      getCommentById: (id: string) => this.testDb.query<Comment, [string]>('SELECT * FROM comments WHERE id = ?').get(id),
      upsertIssue: (issue: Issue) => {
        const stmt = this.testDb.prepare(`
          INSERT OR REPLACE INTO issues 
          (id, title, description, state_name, assignee_name, team_name, priority, created_at, updated_at, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        stmt.run(issue.id, issue.title, issue.description, issue.state_name, 
                 issue.assignee_name, issue.team_name, issue.priority, 
                 issue.created_at, issue.updated_at);
      },
      upsertLabel: (label: Label) => {
        const stmt = this.testDb.prepare(`
          INSERT OR REPLACE INTO labels 
          (id, name, color, description, synced_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        stmt.run(label.id, label.name, label.color, label.description);
      },
      setIssueLabels: (issueId: string, labelIds: string[]) => {
        const deleteStmt = this.testDb.prepare('DELETE FROM issue_labels WHERE issue_id = ?');
        deleteStmt.run(issueId);
        
        const insertStmt = this.testDb.prepare('INSERT INTO issue_labels (issue_id, label_id) VALUES (?, ?)');
        for (const labelId of labelIds) {
          insertStmt.run(issueId, labelId);
        }
      },
      upsertComment: (comment: Comment) => {
        const stmt = this.testDb.prepare(`
          INSERT OR REPLACE INTO comments 
          (id, issue_id, author, content, created_at, updated_at, parent_id, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        stmt.run(comment.id, comment.issue_id, comment.author, comment.content, 
                 comment.created_at, comment.updated_at, comment.parent_id);
      }
    };
  }

  private getIssueLabels(issueId: string) {
    return this.testDb.query<Label, [string]>(`
      SELECT l.* FROM labels l 
      JOIN issue_labels il ON l.id = il.label_id 
      WHERE il.issue_id = ? 
      ORDER BY l.name
    `).all(issueId);
  }

  async handleRequest(request: any) {
    switch (request.method) {
      case "initialize":
        return {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "line", version: "0.0.1" }
        };
      
      case "tools/list":
        return {
          tools: [
            { name: "mcp__linear_server__list_issues", description: "List issues from line's local database" },
            { name: "mcp__linear_server__get_issue", description: "Get specific issue by ID" },
            { name: "mcp__linear_server__list_my_issues", description: "List issues assigned to current user" },
            { name: "mcp__linear_server__list_teams", description: "List all teams" },
            { name: "mcp__linear_server__get_team", description: "Get specific team by ID or key" },
            { name: "mcp__linear_server__list_projects", description: "List all projects" },
            { name: "mcp__linear_server__get_project", description: "Get specific project by ID" },
            { name: "mcp__linear_server__search_issues", description: "Search issues by query" },
            { name: "mcp__linear_server__list_labels", description: "List all labels" },
            { name: "mcp__linear_server__get_label", description: "Get specific label by ID" },
            { name: "mcp__linear_server__list_comments", description: "List comments for a specific issue" },
            { name: "mcp__linear_server__get_comment", description: "Get specific comment by ID" },
            { name: "mcp__linear_server__add_comment", description: "Add a new comment to an issue" }
          ]
        };
      
      case "tools/call":
        return await this.handleToolCall(request.params);
      
      default:
        throw new Error(`Unknown method: ${request.method}`);
    }
  }

  private async handleToolCall(params: any) {
    const { name, arguments: args } = params;

    switch (name) {
      case "mcp__linear_server__list_issues":
        return this.listIssues(args);
      case "mcp__linear_server__get_issue":
        return this.getIssue(args);
      case "mcp__linear_server__list_my_issues":
        return this.listMyIssues(args);
      case "mcp__linear_server__list_teams":
        return this.listTeams(args);
      case "mcp__linear_server__get_team":
        return this.getTeam(args);
      case "mcp__linear_server__list_projects":
        return this.listProjects(args);
      case "mcp__linear_server__get_project":
        return this.getProject(args);
      case "mcp__linear_server__search_issues":
        return this.searchIssues(args);
      case "mcp__linear_server__list_labels":
        return this.listLabels(args);
      case "mcp__linear_server__get_label":
        return this.getLabel(args);
      case "mcp__linear_server__list_comments":
        return this.listComments(args);
      case "mcp__linear_server__get_comment":
        return this.getComment(args);
      case "mcp__linear_server__add_comment":
        return this.addComment(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private listIssues(args: any = {}) {
    let issues = this.testQueries.getAllIssues();
    
    if (args.assigneeId && args.assigneeId !== 'current') {
      issues = issues.filter((issue: Issue) => issue.assignee_name === args.assigneeId);
    }
    
    if (args.teamId) {
      issues = issues.filter((issue: Issue) => issue.team_name === args.teamId);
    }
    
    if (args.query) {
      issues = this.testQueries.searchIssues(args.query);
    }
    
    const limit = args.limit || 50;
    issues = issues.slice(0, limit);

    return { content: [{ type: "text", text: JSON.stringify(issues) }] };
  }

  private getIssue(args: any) {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    const issue = this.testQueries.getIssueById(args.id);
    if (!issue) {
      throw new Error(`Issue not found: ${args.id}`);
    }

    return { content: [{ type: "text", text: JSON.stringify(issue) }] };
  }

  private listMyIssues(args: any = {}) {
    const issues = this.testQueries.getMyIssues('You');
    const limit = args.limit || 50;
    
    return { content: [{ type: "text", text: JSON.stringify(issues.slice(0, limit)) }] };
  }

  private listTeams(args: any = {}) {
    const teams = this.testQueries.getAllTeams();
    const limit = args.limit || 50;
    
    return { content: [{ type: "text", text: JSON.stringify(teams.slice(0, limit)) }] };
  }

  private getTeam(args: any) {
    if (!args.query) {
      throw new Error("Missing required parameter: query");
    }

    const team = this.testQueries.getTeamById(args.query);
    if (!team) {
      throw new Error(`Team not found: ${args.query}`);
    }

    return { content: [{ type: "text", text: JSON.stringify(team) }] };
  }

  private listProjects(args: any = {}) {
    const projects = this.testQueries.getAllProjects();
    const limit = args.limit || 50;
    
    return { content: [{ type: "text", text: JSON.stringify(projects.slice(0, limit)) }] };
  }

  private getProject(args: any) {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    const project = this.testQueries.getProjectById(args.id);
    if (!project) {
      throw new Error(`Project not found: ${args.id}`);
    }

    return { content: [{ type: "text", text: JSON.stringify(project) }] };
  }

  private searchIssues(args: any) {
    if (!args.query) {
      throw new Error("Missing required parameter: query");
    }

    const issues = this.testQueries.searchIssues(args.query);
    const limit = args.limit || 25;
    
    return { content: [{ type: "text", text: JSON.stringify(issues.slice(0, limit)) }] };
  }

  private listLabels(args: any = {}) {
    const labels = this.testQueries.getAllLabels();
    const limit = args.limit || 50;
    
    return { content: [{ type: "text", text: JSON.stringify(labels.slice(0, limit)) }] };
  }

  private getLabel(args: any) {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    const label = this.testQueries.getLabelById(args.id);
    if (!label) {
      throw new Error(`Label not found: ${args.id}`);
    }

    return { content: [{ type: "text", text: JSON.stringify(label) }] };
  }

  private listComments(args: any) {
    if (!args.issueId) {
      throw new Error("Missing required parameter: issueId");
    }

    const comments = this.testQueries.getCommentsByIssueId(args.issueId);
    
    return { content: [{ type: "text", text: JSON.stringify(comments) }] };
  }

  private getComment(args: any) {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    const comment = this.testQueries.getCommentById(args.id);
    if (!comment) {
      throw new Error(`Comment not found: ${args.id}`);
    }

    return { content: [{ type: "text", text: JSON.stringify(comment) }] };
  }

  private addComment(args: any) {
    if (!args.issueId || !args.content) {
      throw new Error("Missing required parameters: issueId and content");
    }

    const now = new Date().toISOString();
    const comment = {
      id: `comment_${args.issueId}_${Date.now()}`,
      issue_id: args.issueId,
      author: 'You',
      content: args.content,
      created_at: now,
      updated_at: now,
      parent_id: args.parentId
    };

    this.testQueries.upsertComment(comment);

    return { content: [{ type: "text", text: JSON.stringify(comment) }] };
  }

  close() {
    this.testDb.close();
  }
}

describe('MCP Server Protocol', () => {
  let server: TestLineMCPServer;

  beforeEach(() => {
    server = new TestLineMCPServer();
  });

  afterEach(() => {
    server.close();
  });

  test('should handle initialization', async () => {
    const response = await server.handleRequest({ method: "initialize" });
    
    expect(response.protocolVersion).toBe("2024-11-05");
    expect(response.capabilities).toEqual({ tools: {} });
    expect(response.serverInfo.name).toBe("line");
    expect(response.serverInfo.version).toBe("0.0.1");
  });

  test('should list available tools', async () => {
    const response = await server.handleRequest({ method: "tools/list" });
    
    expect(response.tools).toBeDefined();
    expect(Array.isArray(response.tools)).toBe(true);
    expect(response.tools.length).toBeGreaterThan(0);
    
    // Check for label-specific tools
    const toolNames = response.tools.map((tool: any) => tool.name);
    expect(toolNames).toContain("mcp__linear_server__list_labels");
    expect(toolNames).toContain("mcp__linear_server__get_label");
  });

  test('should throw error for unknown method', async () => {
    await expect(server.handleRequest({ method: "unknown_method" })).rejects.toThrow("Unknown method: unknown_method");
  });

  test('should throw error for unknown tool', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "unknown_tool",
        arguments: {}
      }
    };
    
    await expect(server.handleRequest(request)).rejects.toThrow("Unknown tool: unknown_tool");
  });
});

describe('MCP Label Tools', () => {
  let server: TestLineMCPServer;

  beforeEach(() => {
    server = new TestLineMCPServer();
    
    // Setup test data
    const testLabels: Label[] = [
      { id: 'bug', name: 'bug', color: '#d73a49', description: 'Something isn\'t working' },
      { id: 'feature', name: 'feature', color: '#28a745', description: 'New feature request' },
      { id: 'urgent', name: 'urgent', color: '#dc2626', description: 'Needs immediate attention' },
      { id: 'frontend', name: 'frontend', color: '#007bff', description: 'Frontend related work' }
    ];
    
    testLabels.forEach(label => {
      server['testQueries'].upsertLabel(label);
    });
  });

  afterEach(() => {
    server.close();
  });

  test('should list all labels', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__list_labels",
        arguments: {}
      }
    };
    
    const response = await server.handleRequest(request);
    
    expect(response.content).toBeDefined();
    expect(response.content[0].type).toBe("text");
    
    const labels = JSON.parse(response.content[0].text);
    expect(Array.isArray(labels)).toBe(true);
    expect(labels.length).toBe(4);
    
    // Should be sorted by name
    expect(labels[0].name).toBe('bug');
    expect(labels[1].name).toBe('feature');
    expect(labels[2].name).toBe('frontend');
    expect(labels[3].name).toBe('urgent');
  });

  test('should respect limit parameter', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__list_labels",
        arguments: { limit: 2 }
      }
    };
    
    const response = await server.handleRequest(request);
    const labels = JSON.parse(response.content[0].text);
    
    expect(labels.length).toBe(2);
  });

  test('should get specific label by ID', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__get_label",
        arguments: { id: 'bug' }
      }
    };
    
    const response = await server.handleRequest(request);
    const label = JSON.parse(response.content[0].text);
    
    expect(label.id).toBe('bug');
    expect(label.name).toBe('bug');
    expect(label.color).toBe('#d73a49');
    expect(label.description).toBe('Something isn\'t working');
  });

  test('should throw error for non-existent label', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__get_label",
        arguments: { id: 'non-existent' }
      }
    };
    
    await expect(server.handleRequest(request)).rejects.toThrow("Label not found: non-existent");
  });

  test('should throw error when missing required parameter', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__get_label",
        arguments: {}
      }
    };
    
    await expect(server.handleRequest(request)).rejects.toThrow("Missing required parameter: id");
  });
});

describe('MCP Issue Tools with Labels', () => {
  let server: TestLineMCPServer;

  beforeEach(() => {
    server = new TestLineMCPServer();
    
    // Setup test labels
    const testLabels: Label[] = [
      { id: 'bug', name: 'bug', color: '#d73a49', description: 'Something isn\'t working' },
      { id: 'urgent', name: 'urgent', color: '#dc2626', description: 'Needs immediate attention' }
    ];
    
    testLabels.forEach(label => {
      server['testQueries'].upsertLabel(label);
    });
    
    // Setup test issue with labels
    const testIssue: Issue = {
      id: 'TEST-123',
      title: 'Test Issue with Labels',
      description: 'This is a test issue',
      state_name: 'In Progress',
      assignee_name: 'You',
      team_name: 'Engineering',
      priority: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    };
    
    server['testQueries'].upsertIssue(testIssue);
    server['testQueries'].setIssueLabels('TEST-123', ['bug', 'urgent']);
  });

  afterEach(() => {
    server.close();
  });

  test('should include labels when listing issues', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__list_issues",
        arguments: {}
      }
    };
    
    const response = await server.handleRequest(request);
    const issues = JSON.parse(response.content[0].text);
    
    expect(issues.length).toBe(1);
    expect(issues[0].labels).toBeDefined();
    expect(issues[0].labels.length).toBe(2);
    expect(issues[0].labels[0].name).toBe('bug');
    expect(issues[0].labels[1].name).toBe('urgent');
  });

  test('should include labels when getting specific issue', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__get_issue",
        arguments: { id: 'TEST-123' }
      }
    };
    
    const response = await server.handleRequest(request);
    const issue = JSON.parse(response.content[0].text);
    
    expect(issue.id).toBe('TEST-123');
    expect(issue.labels).toBeDefined();
    expect(issue.labels.length).toBe(2);
    expect(issue.labels[0].name).toBe('bug');
    expect(issue.labels[1].name).toBe('urgent');
  });

  test('should include labels when listing my issues', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__list_my_issues",
        arguments: {}
      }
    };
    
    const response = await server.handleRequest(request);
    const issues = JSON.parse(response.content[0].text);
    
    expect(issues.length).toBe(1);
    expect(issues[0].labels).toBeDefined();
    expect(issues[0].labels.length).toBe(2);
  });

  test('should include labels when searching issues', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__search_issues",
        arguments: { query: 'Test' }
      }
    };
    
    const response = await server.handleRequest(request);
    const issues = JSON.parse(response.content[0].text);
    
    expect(issues.length).toBe(1);
    expect(issues[0].labels).toBeDefined();
    expect(issues[0].labels.length).toBe(2);
  });
});

describe('MCP Comment Tools', () => {
  let server: TestLineMCPServer;

  beforeEach(() => {
    server = new TestLineMCPServer();
    
    // Setup test issue
    const testIssue: Issue = {
      id: 'TEST-123',
      title: 'Test Issue',
      description: 'Test issue for comments',
      state_name: 'In Progress',
      assignee_name: 'You',
      team_name: 'Engineering',
      priority: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    };
    
    server['testQueries'].upsertIssue(testIssue);
    
    // Setup test comments
    const testComments: Comment[] = [
      {
        id: 'comment-1',
        issue_id: 'TEST-123',
        author: 'Alice',
        content: 'First comment',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      },
      {
        id: 'comment-2',
        issue_id: 'TEST-123',
        author: 'Bob',
        content: 'Second comment',
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:00:00Z'
      }
    ];
    
    testComments.forEach(comment => {
      server['testQueries'].upsertComment(comment);
    });
  });

  afterEach(() => {
    server.close();
  });

  test('should list comments for an issue', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__list_comments",
        arguments: { issueId: 'TEST-123' }
      }
    };
    
    const response = await server.handleRequest(request);
    const comments = JSON.parse(response.content[0].text);
    
    expect(comments.length).toBe(2);
    expect(comments[0].content).toBe('First comment');
    expect(comments[1].content).toBe('Second comment');
  });

  test('should get specific comment by ID', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__get_comment",
        arguments: { id: 'comment-1' }
      }
    };
    
    const response = await server.handleRequest(request);
    const comment = JSON.parse(response.content[0].text);
    
    expect(comment.id).toBe('comment-1');
    expect(comment.content).toBe('First comment');
    expect(comment.author).toBe('Alice');
  });

  test('should add new comment', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__add_comment",
        arguments: { 
          issueId: 'TEST-123',
          content: 'New test comment'
        }
      }
    };
    
    const response = await server.handleRequest(request);
    const comment = JSON.parse(response.content[0].text);
    
    expect(comment.issue_id).toBe('TEST-123');
    expect(comment.content).toBe('New test comment');
    expect(comment.author).toBe('You');
    expect(comment.id).toBeTruthy();
  });

  test('should add reply comment', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__add_comment",
        arguments: { 
          issueId: 'TEST-123',
          content: 'Reply comment',
          parentId: 'comment-1'
        }
      }
    };
    
    const response = await server.handleRequest(request);
    const comment = JSON.parse(response.content[0].text);
    
    expect(comment.parent_id).toBe('comment-1');
    expect(comment.content).toBe('Reply comment');
  });

  test('should throw error for missing parameters in add comment', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__add_comment",
        arguments: { issueId: 'TEST-123' } // Missing content
      }
    };
    
    await expect(server.handleRequest(request)).rejects.toThrow("Missing required parameters: issueId and content");
  });

  test('should throw error for non-existent comment', async () => {
    const request = {
      method: "tools/call",
      params: {
        name: "mcp__linear_server__get_comment",
        arguments: { id: 'non-existent' }
      }
    };
    
    await expect(server.handleRequest(request)).rejects.toThrow("Comment not found: non-existent");
  });
});

describe('Line Native Task MCP Tools - Integration', () => {
  test('should include Line native task tools in tool list', async () => {
    // Import the actual LineMCPServer to test the real implementation
    const { LineMCPServer } = await import('./mcp-server.ts');
    const server = new LineMCPServer();
    
    const response = await server.handleRequest({ method: "tools/list" });
    const toolNames = response.tools.map((tool: any) => tool.name);
    
    // Check for Line native task tools
    expect(toolNames).toContain("mcp__line-server__create_task");
    expect(toolNames).toContain("mcp__line-server__update_task");
    expect(toolNames).toContain("mcp__line-server__get_task");
    expect(toolNames).toContain("mcp__line-server__delete_task");
    expect(toolNames).toContain("mcp__line-server__list_tasks");
    expect(toolNames).toContain("mcp__line-server__assign_task");
    expect(toolNames).toContain("mcp__line-server__set_priority");
    expect(toolNames).toContain("mcp__line-server__add_dependency");
    
    // Also verify we still have Linear tools
    expect(toolNames).toContain("mcp__linear_server__list_issues");
    expect(toolNames).toContain("mcp__linear_server__get_issue");
  });
});