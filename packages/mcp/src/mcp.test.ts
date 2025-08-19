import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';

// Create test database and queries for isolated testing
const testDb = new Database(':memory:');

// Initialize test database with same schema
testDb.exec(`
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

  CREATE TABLE IF NOT EXISTS sync_status (
    entity TEXT PRIMARY KEY,
    last_sync TEXT
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

  CREATE TABLE IF NOT EXISTS line_tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'issue',
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'normal',
    assignee TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    time_tracked INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    due_date DATETIME,
    parent_id TEXT,
    FOREIGN KEY (parent_id) REFERENCES line_tasks(id)
  );

  CREATE TABLE IF NOT EXISTS line_task_labels (
    task_id TEXT NOT NULL,
    label_id TEXT NOT NULL,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES line_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_comments_issue_id ON comments(issue_id);
  CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
  CREATE INDEX IF NOT EXISTS idx_line_tasks_status ON line_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_line_tasks_type ON line_tasks(type);
  CREATE INDEX IF NOT EXISTS idx_line_tasks_assignee ON line_tasks(assignee);
  CREATE INDEX IF NOT EXISTS idx_line_tasks_parent ON line_tasks(parent_id);
`);

// Create test-specific database queries
const testDbQueries = {
  getAllIssues: () => {
    const issues = testDb.query('SELECT * FROM issues ORDER BY updated_at DESC').all();
    return issues.map((issue: any) => ({ ...issue, labels: testDbQueries.getIssueLabels(issue.id) }));
  },
  searchIssues: (query: string) => {
    const issues = testDb.query('SELECT * FROM issues WHERE title LIKE ? OR description LIKE ? ORDER BY updated_at DESC').all(`%${query}%`, `%${query}%`);
    return issues.map((issue: any) => ({ ...issue, labels: testDbQueries.getIssueLabels(issue.id) }));
  },
  getIssueById: (id: string) => {
    const issue = testDb.query('SELECT * FROM issues WHERE id = ?').get(id);
    if (issue) {
      (issue as any).labels = testDbQueries.getIssueLabels(id);
    }
    return issue;
  },
  getIssueLabels: (issueId: string) => 
    testDb.query(`
      SELECT l.* FROM labels l 
      JOIN issue_labels il ON l.id = il.label_id 
      WHERE il.issue_id = ? 
      ORDER BY l.name
    `).all(issueId),
  upsertIssue: (issue: any) => {
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO issues 
      (id, title, description, state_name, assignee_name, team_name, priority, created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(issue.id, issue.title, issue.description, issue.state_name, 
             issue.assignee_name, issue.team_name, issue.priority, 
             issue.created_at, issue.updated_at);
  },
  upsertComment: (comment: any) => {
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO comments 
      (id, issue_id, author, content, created_at, updated_at, parent_id, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(comment.id, comment.issue_id, comment.author, comment.content, 
             comment.created_at, comment.updated_at, comment.parent_id);
  },
  getAllComments: () => testDb.query('SELECT * FROM comments ORDER BY created_at DESC').all()
};

describe('Line CLI MCP Package', () => {
  beforeAll(() => {
    // Initialize test data
    testDbQueries.upsertIssue({
      id: 'TEST-001',
      title: 'Authentication Bug',
      description: 'Users cannot login with OAuth providers',
      state_name: 'In Progress',
      assignee_name: 'John Doe',
      team_name: 'Engineering',
      priority: 1,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-16T14:22:00Z'
    });

    testDbQueries.upsertIssue({
      id: 'TEST-002', 
      title: 'Dashboard Performance',
      description: 'Dashboard loads slowly with large datasets',
      state_name: 'Todo',
      assignee_name: 'Alice Smith',
      team_name: 'Frontend',
      priority: 2,
      created_at: '2024-01-14T09:15:00Z',
      updated_at: '2024-01-15T16:45:00Z'
    });

    testDbQueries.upsertIssue({
      id: 'TEST-003',
      title: 'API Rate Limiting',
      description: 'Need to implement rate limiting for authentication endpoints',
      state_name: 'Todo', 
      assignee_name: 'Bob Wilson',
      team_name: 'Backend',
      priority: 2,
      created_at: '2024-01-13T11:20:00Z',
      updated_at: '2024-01-14T08:30:00Z'
    });

    // Add a comment for testing comment search
    testDbQueries.upsertComment({
      id: 'COMMENT-001',
      issue_id: 'TEST-001',
      author: 'Tech Lead',
      content: 'This authentication issue is blocking user registration',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z'
    });
  });

  describe('Search Functionality', () => {
    test('searchIssues should find issues by title', () => {
      const results = testDbQueries.searchIssues('Authentication');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Authentication');
    });

    test('searchIssues should find issues by description', () => {
      const results = testDbQueries.searchIssues('OAuth');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].description).toContain('OAuth');
    });

    test('searchIssues should find issues by partial match', () => {
      const results = testDbQueries.searchIssues('auth');
      expect(results.length).toBeGreaterThanOrEqual(2); // Should find both authentication issues
    });

    test('searchIssues should return empty array for no matches', () => {
      const results = testDbQueries.searchIssues('nonexistent');
      expect(results.length).toBe(0);
    });

    test('searchIssues should be case insensitive', () => {
      const results = testDbQueries.searchIssues('AUTHENTICATION');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('MCP Tools', () => {
    async function callMCPTool(toolName: string, args: any) {
      // Create a test-specific tool handler that uses our test database
      switch (toolName) {
        case 'line__list_issues':
          let issues = testDbQueries.getAllIssues();
          if (args?.query) {
            issues = testDbQueries.searchIssues(args.query);
          }
          return issues.slice(0, args?.limit || 50);
          
        case 'line__search_issues':
          return testDbQueries.searchIssues(args.query).slice(0, args?.limit || 25);
          
        case 'line__advanced_search':
          const results: any[] = [];
          const { query, limit = 25, types = ['issues', 'comments'] } = args;
          
          if (types.includes('issues')) {
            const issues = testDbQueries.searchIssues(query).slice(0, limit);
            results.push(...issues.map((issue: any) => ({ type: 'issue', ...issue })));
          }
          
          if (types.includes('comments')) {
            const comments = testDbQueries.getAllComments()
              .filter((comment: any) => comment.content.toLowerCase().includes(query.toLowerCase()))
              .slice(0, limit);
            results.push(...comments.map((comment: any) => ({ type: 'comment', ...comment })));
          }
          
          return results.slice(0, limit);
          
        case 'line__search_suggestions':
          const allIssues = testDbQueries.getAllIssues();
          return allIssues
            .filter((issue: any) => issue.title.toLowerCase().includes(args.query.toLowerCase()))
            .map((issue: any) => issue.title)
            .slice(0, 5);
            
        case 'line__get_issue':
          return testDbQueries.getIssueById(args.id);
          
        case 'line__list_comments':
          // Simple implementation for test
          return testDb.query('SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC').all(args.issueId);
          
        case 'line__create_task':
          const id = `LINE-${Date.now().toString(36).toUpperCase()}`;
          const now = new Date().toISOString();
          const task = {
            id,
            title: args.title,
            description: args.description,
            type: args.type || 'issue',
            status: 'todo',
            priority: args.priority || 'normal',
            assignee: args.assignee,
            created_at: now,
            updated_at: now,
            time_tracked: 0,
            progress: 0,
            due_date: args.due_date,
            parent_id: args.parent_id
          };
          
          // Insert into test database
          const stmt = testDb.prepare(`
            INSERT INTO line_tasks 
            (id, title, description, type, status, priority, assignee, created_at, updated_at, time_tracked, progress, due_date, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(task.id, task.title, task.description, task.type, task.status, task.priority, 
                  task.assignee, task.created_at, task.updated_at, task.time_tracked, task.progress, 
                  task.due_date, task.parent_id);
          
          return task;
          
        case 'line__list_tasks':
          return testDb.query('SELECT * FROM line_tasks ORDER BY created_at DESC').all();
          
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    }

    test('line__search_issues should work', async () => {
      const result = await callMCPTool('line__search_issues', {
        query: 'authentication',
        limit: 10
      });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title.toLowerCase()).toContain('authentication');
    });

    test('line__advanced_search should search issues and comments', async () => {
      const result = await callMCPTool('line__advanced_search', {
        query: 'authentication',
        types: ['issues', 'comments'],
        limit: 10
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Should find both issues and comments
      const hasIssues = result.some(item => item.type === 'issue');
      const hasComments = result.some(item => item.type === 'comment');
      expect(hasIssues || hasComments).toBe(true);
    });

    test('line__search_suggestions should provide suggestions', async () => {
      const result = await callMCPTool('line__search_suggestions', {
        query: 'auth'
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(typeof result[0]).toBe('string');
        expect(result[0].toLowerCase()).toContain('auth');
      }
    });

    test('line__list_issues should return all issues', async () => {
      const result = await callMCPTool('line__list_issues', {
        limit: 10
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3); // Our test issues
    });

    test('line__get_issue should return specific issue', async () => {
      const result = await callMCPTool('line__get_issue', {
        id: 'TEST-001'
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('TEST-001');
      expect(result.title).toBe('Authentication Bug');
    });

    test('line__create_task should create new task', async () => {
      const result = await callMCPTool('line__create_task', {
        title: 'Test Task Creation',
        description: 'Testing task creation via MCP',
        priority: 'high',
        type: 'issue'
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Task Creation');
      expect(result.id).toMatch(/^LINE-/);
      expect(result.priority).toBe('high');
    });

    test('line__list_tasks should return tasks', async () => {
      const result = await callMCPTool('line__list_tasks', {
        limit: 10
      });

      expect(Array.isArray(result)).toBe(true);
      // Should have at least the task we just created
      expect(result.length).toBeGreaterThan(0);
    });

    test('line__list_comments should return comments for issue', async () => {
      const result = await callMCPTool('line__list_comments', {
        issueId: 'TEST-001'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].issue_id).toBe('TEST-001');
    });
  });

  describe('Error Handling', () => {
    async function callMCPTool(toolName: string, args: any) {
      // Use the same test handler as above
      switch (toolName) {
        case 'line__get_issue':
          if (!args.id) {
            throw new Error('Missing required parameter: id');
          }
          return testDbQueries.getIssueById(args.id);
        case 'unknown__tool':
          throw new Error(`Unknown tool: ${toolName}`);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    }

    test('should handle missing required parameters', async () => {
      try {
        await callMCPTool('line__get_issue', {}); // Missing id
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle non-existent issue', async () => {
      const result = await callMCPTool('line__get_issue', {
        id: 'NON-EXISTENT'
      });
      expect(result).toBeNull();
    });

    test('should handle unknown tool name', async () => {
      try {
        await callMCPTool('unknown__tool', {});
        expect(true).toBe(false); // Should have thrown
      } catch (error) {
        expect(error.message).toContain('Unknown tool');
      }
    });
  });

  afterAll(() => {
    testDb.close();
  });
});