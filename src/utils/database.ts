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