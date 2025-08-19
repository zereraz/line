#!/usr/bin/env bun

import { Database } from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';

const dbPath = join(homedir(), '.line', 'data.db');

// Ensure the directory exists
await Bun.write(join(homedir(), '.line', '.keep'), '');

export const db = new Database(dbPath);

// Initialize tables
db.exec(`
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

export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
  synced_at?: string;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  state_name: string;
  assignee_name?: string;
  team_name: string;
  priority: number;
  created_at: string;
  updated_at: string;
  synced_at?: string;
  labels?: Label[];
}

export interface Team {
  id: string;
  name: string;
  key?: string;
  description?: string;
  synced_at?: string;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  team_name: string;
  synced_at?: string;
}

export interface Comment {
  id: string;
  issue_id: string;
  author: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  synced_at?: string;
  replies?: Comment[];
}

export const dbQueries = {
  // Issues
  getAllIssues: () => {
    const issues = db.query<Issue, []>('SELECT * FROM issues ORDER BY updated_at DESC').all();
    return issues.map(issue => ({ ...issue, labels: dbQueries.getIssueLabels(issue.id) }));
  },
  getMyIssues: (assigneeName: string) => {
    const issues = db.query<Issue, [string]>('SELECT * FROM issues WHERE assignee_name = ? ORDER BY updated_at DESC').all(assigneeName);
    return issues.map(issue => ({ ...issue, labels: dbQueries.getIssueLabels(issue.id) }));
  },
  getIssueById: (id: string) => {
    const issue = db.query<Issue, [string]>('SELECT * FROM issues WHERE id = ?').get(id);
    if (issue) {
      issue.labels = dbQueries.getIssueLabels(issue.id);
    }
    return issue;
  },
  searchIssues: (query: string) => {
    const issues = db.query<Issue, [string, string]>('SELECT * FROM issues WHERE title LIKE ? OR description LIKE ? ORDER BY updated_at DESC').all(`%${query}%`, `%${query}%`);
    return issues.map(issue => ({ ...issue, labels: dbQueries.getIssueLabels(issue.id) }));
  },

  getTaskLabels: (taskId: string) => {
    const stmt = db.prepare(`
      SELECT l.* FROM labels l 
      JOIN line_task_labels ltl ON l.id = ltl.label_id 
      WHERE ltl.task_id = ? 
      ORDER BY l.name
    `);
    return stmt.all(taskId) as Array<{id: string, name: string, color: string, description?: string}>;
  },

  // Teams
  getAllTeams: () => db.query<Team, []>('SELECT * FROM teams ORDER BY name').all(),
  getTeamById: (id: string) => 
    db.query<Team, [string]>('SELECT * FROM teams WHERE id = ?').get(id),
  
  // Projects
  getAllProjects: () => db.query<Project, []>('SELECT * FROM projects ORDER BY name').all(),
  getProjectById: (id: string) => 
    db.query<Project, [string]>('SELECT * FROM projects WHERE id = ?').get(id),

  // Labels
  getAllLabels: () => db.query<Label, []>('SELECT * FROM labels ORDER BY name').all(),
  getLabelById: (id: string) => 
    db.query<Label, [string]>('SELECT * FROM labels WHERE id = ?').get(id),
  getIssueLabels: (issueId: string) => 
    db.query<Label, [string]>(`
      SELECT l.* FROM labels l 
      JOIN issue_labels il ON l.id = il.label_id 
      WHERE il.issue_id = ? 
      ORDER BY l.name
    `).all(issueId),

  // Sync operations
  upsertIssue: (issue: Issue) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO issues 
      (id, title, description, state_name, assignee_name, team_name, priority, created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(issue.id, issue.title, issue.description, issue.state_name, 
             issue.assignee_name, issue.team_name, issue.priority, 
             issue.created_at, issue.updated_at);
  },

  upsertTeam: (team: Team) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO teams 
      (id, name, key, description, synced_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(team.id, team.name, team.key, team.description);
  },

  upsertProject: (project: Project) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO projects 
      (id, name, status, team_name, synced_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(project.id, project.name, project.status, project.team_name);
  },

  upsertLabel: (label: Label) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO labels 
      (id, name, color, description, synced_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(label.id, label.name, label.color, label.description);
  },

  setIssueLabels: (issueId: string, labelIds: string[]) => {
    // Remove existing labels for this issue
    const deleteStmt = db.prepare('DELETE FROM issue_labels WHERE issue_id = ?');
    deleteStmt.run(issueId);
    
    // Add new labels
    const insertStmt = db.prepare('INSERT INTO issue_labels (issue_id, label_id) VALUES (?, ?)');
    for (const labelId of labelIds) {
      insertStmt.run(issueId, labelId);
    }
  },

  updateSyncStatus: (entity: string) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO sync_status (entity, last_sync)
      VALUES (?, CURRENT_TIMESTAMP)
    `);
    stmt.run(entity);
  },

  getSyncStatus: (entity: string) => 
    db.query<{entity: string, last_sync: string}, [string]>('SELECT * FROM sync_status WHERE entity = ?').get(entity),

  // Comments
  getCommentsByIssueId: (issueId: string): Comment[] => {
    const allComments = db.query<Comment, [string]>('SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC').all(issueId);
    return buildCommentTree(allComments);
  },

  getCommentById: (id: string) => 
    db.query<Comment, [string]>('SELECT * FROM comments WHERE id = ?').get(id),

  getAllComments: () => 
    db.query<Comment, []>('SELECT * FROM comments ORDER BY created_at DESC').all(),

  upsertComment: (comment: Comment) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO comments 
      (id, issue_id, author, content, created_at, updated_at, parent_id, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(comment.id, comment.issue_id, comment.author, comment.content, 
             comment.created_at, comment.updated_at, comment.parent_id);
  },

  deleteComment: (id: string) => {
    const stmt = db.prepare('DELETE FROM comments WHERE id = ?');
    stmt.run(id);
  }
};

// Helper function to build comment tree with replies
function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create map and initialize replies arrays
  comments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment.id, comment);
  });

  // Second pass: build tree structure
  comments.forEach(comment => {
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies!.push(comment);
      }
    } else {
      rootComments.push(comment);
    }
  });

  return rootComments;
}

// MCP Server implementation
interface MCPRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: string;
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPNotification {
  jsonrpc: string;
  method: string;
  params?: any;
}

type MCPMessage = MCPRequest | MCPResponse | MCPNotification;

// Line Task Management
interface LineTask {
  id: string;
  title: string;
  description?: string;
  type: 'issue' | 'goal' | 'habit' | 'learning';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  assignee?: string;
  created_at: string;
  updated_at: string;
  time_tracked: number;
  progress: number;
  due_date?: string;
  parent_id?: string;
}

const lineTaskQueries = {
  getAllTasks: (filters: {
    status?: string;
    type?: string;
    assignee?: string;
    parent_only?: boolean;
  } = {}) => {
    let query = 'SELECT * FROM line_tasks';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.type) {
      conditions.push('type = ?');
      params.push(filters.type);
    }

    if (filters.assignee) {
      conditions.push('assignee = ?');
      params.push(filters.assignee);
    }

    if (filters.parent_only) {
      conditions.push('parent_id IS NULL');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    return db.query<LineTask, any[]>(query).all(...params);
  },

  getTaskById: (id: string): LineTask | undefined => {
    return db.query<LineTask, [string]>('SELECT * FROM line_tasks WHERE id = ?').get(id);
  },

  createTask: (task: Omit<LineTask, 'id' | 'created_at' | 'updated_at'>): LineTask => {
    const id = `LINE-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();
    
    const fullTask: LineTask = {
      ...task,
      id,
      created_at: now,
      updated_at: now,
    };

    const stmt = db.prepare(`
      INSERT INTO line_tasks 
      (id, title, description, type, status, priority, assignee, created_at, updated_at, time_tracked, progress, due_date, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      fullTask.id, fullTask.title, fullTask.description, fullTask.type,
      fullTask.status, fullTask.priority, fullTask.assignee, fullTask.created_at,
      fullTask.updated_at, fullTask.time_tracked, fullTask.progress, fullTask.due_date, fullTask.parent_id
    );

    return fullTask;
  },

  updateTask: (id: string, updates: Partial<Omit<LineTask, 'id' | 'created_at'>>): LineTask | undefined => {
    const existingTask = lineTaskQueries.getTaskById(id);
    if (!existingTask) return undefined;

    const updatedTask = {
      ...existingTask,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const stmt = db.prepare(`
      UPDATE line_tasks SET 
        title = ?, description = ?, type = ?, status = ?, priority = ?,
        assignee = ?, updated_at = ?, time_tracked = ?, progress = ?, due_date = ?, parent_id = ?
      WHERE id = ?
    `);

    stmt.run(
      updatedTask.title, updatedTask.description, updatedTask.type, updatedTask.status,
      updatedTask.priority, updatedTask.assignee, updatedTask.updated_at, updatedTask.time_tracked,
      updatedTask.progress, updatedTask.due_date, updatedTask.parent_id, id
    );

    return updatedTask;
  },

  deleteTask: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM line_tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  addDependency: (taskId: string, dependsOnId: string): boolean => {
    // For now, we'll use parent_id to represent dependencies
    // A more robust implementation would have a separate dependencies table
    const stmt = db.prepare('UPDATE line_tasks SET parent_id = ? WHERE id = ?');
    const result = stmt.run(dependsOnId, taskId);
    return result.changes > 0;
  }
};

// MCP Tools Implementation
const tools = [
  {
    name: 'line__list_issues',
    description: 'List issues from Line\'s local database',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Limit number of results', default: 50 },
        query: { type: 'string', description: 'Search query' },
        assigneeId: { type: 'string', description: 'Filter by assignee ID' },
        teamId: { type: 'string', description: 'Filter by team ID' },
        stateId: { type: 'string', description: 'Filter by state ID' }
      }
    }
  },
  {
    name: 'line__get_issue',
    description: 'Get specific issue by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Issue ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'line__list_my_issues',
    description: 'List issues assigned to current user',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Limit number of results', default: 50 }
      }
    }
  },
  {
    name: 'line__list_teams',
    description: 'List all teams',
    inputSchema: {
      type: 'object',
      properties: {
        includeArchived: { type: 'boolean', description: 'Include archived teams', default: false },
        limit: { type: 'number', description: 'Limit number of results', default: 50 }
      }
    }
  },
  {
    name: 'line__get_team',
    description: 'Get specific team by ID or key',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Team ID, key, or name' }
      },
      required: ['query']
    }
  },
  {
    name: 'line__list_projects',
    description: 'List all projects',
    inputSchema: {
      type: 'object',
      properties: {
        includeArchived: { type: 'boolean', description: 'Include archived projects', default: false },
        limit: { type: 'number', description: 'Limit number of results', default: 50 },
        teamId: { type: 'string', description: 'Filter by team ID' }
      }
    }
  },
  {
    name: 'line__get_project',
    description: 'Get specific project by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Project ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'line__search_issues',
    description: 'Search issues by query',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Limit number of results', default: 25 }
      },
      required: ['query']
    }
  },
  {
    name: 'line__advanced_search',
    description: 'Advanced full-text search across issues and comments with filtering',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query with support for boolean operators and phrases' },
        types: { 
          type: 'array', 
          items: { type: 'string', enum: ['issues', 'comments'] },
          description: 'Content types to search',
          default: ['issues', 'comments']
        },
        filters: {
          type: 'object',
          properties: {
            assignee: { type: 'array', items: { type: 'string' }, description: 'Filter by assignee' },
            team: { type: 'array', items: { type: 'string' }, description: 'Filter by team' },
            labels: { type: 'array', items: { type: 'string' }, description: 'Filter by labels' },
            status: { type: 'array', items: { type: 'string' }, description: 'Filter by issue status' },
            priority: { 
              type: 'array', 
              items: { type: 'string', enum: ['none', 'low', 'normal', 'high', 'urgent'] },
              description: 'Filter by priority'
            },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date', description: 'Start date (ISO format)' },
                end: { type: 'string', format: 'date', description: 'End date (ISO format)' }
              }
            },
            author: { type: 'string', description: 'Filter comments by author' },
            issueId: { type: 'string', description: 'Filter comments by issue ID' }
          }
        },
        sortBy: { 
          type: 'string', 
          enum: ['relevance', 'date', 'priority'],
          description: 'Sort criterion',
          default: 'relevance'
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order',
          default: 'desc'
        },
        limit: { type: 'number', description: 'Maximum number of results', default: 25 },
        offset: { type: 'number', description: 'Results offset for pagination', default: 0 },
        includeSnippets: { type: 'boolean', description: 'Include highlighted snippets', default: true }
      },
      required: ['query']
    }
  },
  {
    name: 'line__search_suggestions',
    description: 'Get search suggestions for query completion',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Partial search query' }
      },
      required: ['query']
    }
  },
  {
    name: 'line__list_comments',
    description: 'List comments for a specific issue',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string', description: 'Issue ID' },
        includeReplies: { type: 'boolean', description: 'Include threaded replies', default: true }
      },
      required: ['issueId']
    }
  },
  {
    name: 'line__get_comment',
    description: 'Get specific comment by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Comment ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'line__add_comment',
    description: 'Add a new comment to an issue',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: { type: 'string', description: 'Issue ID' },
        content: { type: 'string', description: 'Comment content' },
        parentId: { type: 'string', description: 'Parent comment ID for replies' }
      },
      required: ['issueId', 'content']
    }
  },

  // Line Task Management Tools
  {
    name: 'line__create_task',
    description: 'Create a new Line task',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        type: { 
          type: 'string', 
          enum: ['issue', 'goal', 'habit', 'learning'],
          description: 'Task type',
          default: 'issue'
        },
        priority: { 
          type: 'string', 
          enum: ['urgent', 'high', 'normal', 'low'],
          description: 'Task priority',
          default: 'normal'
        },
        assignee: { type: 'string', description: 'Assigned user' },
        due_date: { type: 'string', description: 'Due date (ISO string)' },
        parent_id: { type: 'string', description: 'Parent task ID for subtasks' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Label IDs' }
      },
      required: ['title']
    }
  },
  {
    name: 'line__update_task',
    description: 'Update an existing Line task',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        type: { 
          type: 'string', 
          enum: ['issue', 'goal', 'habit', 'learning'],
          description: 'Task type'
        },
        status: { 
          type: 'string', 
          enum: ['todo', 'in_progress', 'review', 'done'],
          description: 'Task status'
        },
        priority: { 
          type: 'string', 
          enum: ['urgent', 'high', 'normal', 'low'],
          description: 'Task priority'
        },
        assignee: { type: 'string', description: 'Assigned user' },
        progress: { type: 'number', description: 'Progress percentage (0-100)' },
        time_tracked: { type: 'number', description: 'Time tracked in minutes' },
        due_date: { type: 'string', description: 'Due date (ISO string)' },
        parent_id: { type: 'string', description: 'Parent task ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'line__get_task',
    description: 'Get a specific Line task by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'line__delete_task',
    description: 'Delete a Line task',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'line__list_tasks',
    description: 'List Line tasks with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        status: { 
          type: 'string', 
          enum: ['todo', 'in_progress', 'review', 'done'],
          description: 'Filter by status'
        },
        type: { 
          type: 'string', 
          enum: ['issue', 'goal', 'habit', 'learning'],
          description: 'Filter by type'
        },
        assignee: { type: 'string', description: 'Filter by assignee' },
        parent_only: { type: 'boolean', description: 'Only show top-level tasks', default: false }
      }
    }
  },
  {
    name: 'line__assign_task',
    description: 'Assign a Line task to a user',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' },
        assignee: { type: 'string', description: 'User to assign to' }
      },
      required: ['id', 'assignee']
    }
  },
  {
    name: 'line__set_priority',
    description: 'Set the priority of a Line task',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task ID' },
        priority: { 
          type: 'string', 
          enum: ['urgent', 'high', 'normal', 'low'],
          description: 'Priority level'
        }
      },
      required: ['id', 'priority']
    }
  },
  {
    name: 'line__add_dependency',
    description: 'Add a dependency between Line tasks',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task that depends on another' },
        depends_on_id: { type: 'string', description: 'Task that is depended upon' }
      },
      required: ['task_id', 'depends_on_id']
    }
  }
];

// Tool handlers
export async function handleToolCall(name: string, params: any): Promise<any> {
  try {
    switch (name) {
      // Issue tools
      case 'line__list_issues':
        const { limit = 50, query, assigneeId, teamId, stateId } = params || {};
        let issues = dbQueries.getAllIssues();
        
        if (query) {
          issues = dbQueries.searchIssues(query);
        }
        if (assigneeId) {
          issues = issues.filter(issue => issue.assignee_name === assigneeId);
        }
        if (teamId) {
          issues = issues.filter(issue => issue.team_name === teamId);
        }
        if (stateId) {
          issues = issues.filter(issue => issue.state_name === stateId);
        }
        
        return issues.slice(0, limit);

      case 'line__get_issue':
        return dbQueries.getIssueById(params.id);

      case 'line__list_my_issues':
        const { limit: myLimit = 50 } = params || {};
        const currentUser = 'You'; // Could be configured
        return dbQueries.getMyIssues(currentUser).slice(0, myLimit);

      case 'line__search_issues':
        const { query: searchQuery, limit: searchLimit = 25 } = params;
        return dbQueries.searchIssues(searchQuery).slice(0, searchLimit);

      case 'line__advanced_search':
        // Simple implementation - just search in issues and comments
        const { query: advQuery, limit: advLimit = 25, types = ['issues', 'comments'] } = params;
        const results: any[] = [];
        
        if (types.includes('issues')) {
          const issues = dbQueries.searchIssues(advQuery).slice(0, advLimit);
          results.push(...issues.map(issue => ({ type: 'issue', ...issue })));
        }
        
        if (types.includes('comments')) {
          const comments = dbQueries.getAllComments()
            .filter(comment => comment.content.toLowerCase().includes(advQuery.toLowerCase()))
            .slice(0, advLimit);
          results.push(...comments.map(comment => ({ type: 'comment', ...comment })));
        }
        
        return results.slice(0, advLimit);

      case 'line__search_suggestions':
        // Simple suggestion based on existing issue titles
        const { query: suggestionQuery } = params;
        const allIssues = dbQueries.getAllIssues();
        const suggestions = allIssues
          .filter(issue => issue.title.toLowerCase().includes(suggestionQuery.toLowerCase()))
          .map(issue => issue.title)
          .slice(0, 5);
        return suggestions;

      // Team tools
      case 'line__list_teams':
        const { includeArchived = false, limit: teamLimit = 50 } = params || {};
        return dbQueries.getAllTeams().slice(0, teamLimit);

      case 'line__get_team':
        const { query: teamQuery } = params;
        return dbQueries.getTeamById(teamQuery) || 
               dbQueries.getAllTeams().find(team => 
                 team.name === teamQuery || team.key === teamQuery
               );

      // Project tools
      case 'line__list_projects':
        const { includeArchived: projArchived = false, limit: projLimit = 50, teamId: projTeamId } = params || {};
        let projects = dbQueries.getAllProjects();
        if (projTeamId) {
          projects = projects.filter(project => project.team_name === projTeamId);
        }
        return projects.slice(0, projLimit);

      case 'line__get_project':
        return dbQueries.getProjectById(params.id);

      // Comment tools
      case 'line__list_comments':
        const { issueId, includeReplies = true } = params;
        return dbQueries.getCommentsByIssueId(issueId);

      case 'line__get_comment':
        return dbQueries.getCommentById(params.id);

      case 'line__add_comment':
        const { issueId: commentIssueId, content, parentId } = params;
        const comment: Comment = {
          id: `COMMENT-${Date.now()}`,
          issue_id: commentIssueId,
          author: 'You',
          content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          parent_id: parentId
        };
        dbQueries.upsertComment(comment);
        return comment;

      // Line Task Management Tools
      case 'line__create_task':
        const task = lineTaskQueries.createTask({
          title: params.title,
          description: params.description,
          type: params.type || 'issue',
          status: 'todo',
          priority: params.priority || 'normal',
          assignee: params.assignee,
          time_tracked: 0,
          progress: 0,
          due_date: params.due_date,
          parent_id: params.parent_id
        });
        return task;

      case 'line__update_task':
        const updatedTask = lineTaskQueries.updateTask(params.id, params);
        return updatedTask;

      case 'line__get_task':
        return lineTaskQueries.getTaskById(params.id);

      case 'line__delete_task':
        const deleted = lineTaskQueries.deleteTask(params.id);
        return { success: deleted };

      case 'line__list_tasks':
        return lineTaskQueries.getAllTasks(params || {});

      case 'line__assign_task':
        const assignedTask = lineTaskQueries.updateTask(params.id, { assignee: params.assignee });
        return assignedTask;

      case 'line__set_priority':
        const priorityTask = lineTaskQueries.updateTask(params.id, { priority: params.priority });
        return priorityTask;

      case 'line__add_dependency':
        const success = lineTaskQueries.addDependency(params.task_id, params.depends_on_id);
        return { success };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`Error handling tool ${name}:`, error);
    throw error;
  }
}

// MCP Server
export function startMCPServer() {
  console.error('Line CLI MCP Server starting...');

  // Handle initialization
  process.stdin.on('data', async (data) => {
    const lines = data.toString().trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message: MCPMessage = JSON.parse(line);
        
        if ('method' in message) {
          const request = message as MCPRequest;
          
          switch (request.method) {
            case 'initialize':
              const response: MCPResponse = {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  protocolVersion: '2024-11-05',
                  capabilities: {
                    tools: {}
                  },
                  serverInfo: {
                    name: 'line-cli-mcp',
                    version: '0.0.2'
                  }
                }
              };
              console.log(JSON.stringify(response));
              break;

            case 'notifications/initialized':
              // Server is ready
              break;

            case 'tools/list':
              const toolsResponse: MCPResponse = {
                jsonrpc: '2.0',
                id: request.id,
                result: { tools }
              };
              console.log(JSON.stringify(toolsResponse));
              break;

            case 'tools/call':
              try {
                const { name, arguments: args } = request.params;
                const result = await handleToolCall(name, args);
                
                const callResponse: MCPResponse = {
                  jsonrpc: '2.0',
                  id: request.id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                      }
                    ]
                  }
                };
                console.log(JSON.stringify(callResponse));
              } catch (error) {
                const errorResponse: MCPResponse = {
                  jsonrpc: '2.0',
                  id: request.id,
                  error: {
                    code: -32000,
                    message: error instanceof Error ? error.message : 'Unknown error'
                  }
                };
                console.log(JSON.stringify(errorResponse));
              }
              break;

            default:
              const unknownResponse: MCPResponse = {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                  code: -32601,
                  message: `Method not found: ${request.method}`
                }
              };
              console.log(JSON.stringify(unknownResponse));
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  });
}

// If this file is run directly, start the MCP server
if (import.meta.main) {
  startMCPServer();
}