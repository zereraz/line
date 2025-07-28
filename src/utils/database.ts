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
`);

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

export const dbQueries = {
  // Issues
  getAllIssues: () => db.query<Issue, []>('SELECT * FROM issues ORDER BY updated_at DESC').all(),
  getMyIssues: (assigneeName: string) => 
    db.query<Issue, [string]>('SELECT * FROM issues WHERE assignee_name = ? ORDER BY updated_at DESC').all(assigneeName),
  getIssueById: (id: string) => 
    db.query<Issue, [string]>('SELECT * FROM issues WHERE id = ?').get(id),
  searchIssues: (query: string) =>
    db.query<Issue, [string, string]>('SELECT * FROM issues WHERE title LIKE ? OR description LIKE ? ORDER BY updated_at DESC').all(`%${query}%`, `%${query}%`),
  
  // Teams
  getAllTeams: () => db.query<Team, []>('SELECT * FROM teams ORDER BY name').all(),
  getTeamById: (id: string) => 
    db.query<Team, [string]>('SELECT * FROM teams WHERE id = ?').get(id),
  
  // Projects
  getAllProjects: () => db.query<Project, []>('SELECT * FROM projects ORDER BY name').all(),
  getProjectById: (id: string) => 
    db.query<Project, [string]>('SELECT * FROM projects WHERE id = ?').get(id),

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

  updateSyncStatus: (entity: string) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO sync_status (entity, last_sync)
      VALUES (?, CURRENT_TIMESTAMP)
    `);
    stmt.run(entity);
  },

  getSyncStatus: (entity: string) => 
    db.query<{entity: string, last_sync: string}, [string]>('SELECT * FROM sync_status WHERE entity = ?').get(entity)
};