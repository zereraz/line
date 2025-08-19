import { Database } from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';
import { authService } from '../services/authService.ts';

const dbPath = join(homedir(), '.line', 'data.db');

// Use the same database instance as the main database
export const db = new Database(dbPath);

// Extended interfaces with workspace context
export interface Label {
  id: string;
  name: string;
  color: string;
  description?: string;
  workspace_id?: string;
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
  workspace_id?: string;
  created_by?: string;
  updated_by?: string;
  synced_at?: string;
  labels?: Label[];
}

export interface Team {
  id: string;
  name: string;
  key?: string;
  description?: string;
  workspace_id?: string;
  created_by?: string;
  synced_at?: string;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  team_name: string;
  workspace_id?: string;
  created_by?: string;
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
  workspace_id?: string;
  created_by?: string;
  synced_at?: string;
  replies?: Comment[];
}

class WorkspaceDatabase {
  
  // Get current workspace context
  private async getCurrentWorkspaceId(): Promise<string | null> {
    try {
      const context = await authService.getCurrentContext();
      return context?.workspace.id || null;
    } catch {
      return null;
    }
  }

  private async getCurrentUserId(): Promise<string | null> {
    try {
      const context = await authService.getCurrentContext();
      return context?.user.id || null;
    } catch {
      return null;
    }
  }

  // Issues - workspace-aware queries
  async getAllIssues(): Promise<Issue[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let query = 'SELECT * FROM issues';
    const params: any[] = [];
    
    if (workspaceId) {
      query += ' WHERE (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const issues = db.query<Issue, any[]>(query).all(...params);
    return issues.map(issue => ({ 
      ...issue, 
      labels: this.getIssueLabels(issue.id) 
    }));
  }

  async getMyIssues(assigneeName?: string): Promise<Issue[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    const actualAssigneeName = assigneeName || 'You';
    
    let query = 'SELECT * FROM issues WHERE assignee_name = ?';
    const params: any[] = [actualAssigneeName];
    
    if (workspaceId) {
      query += ' AND (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const issues = db.query<Issue, any[]>(query).all(...params);
    return issues.map(issue => ({ 
      ...issue, 
      labels: this.getIssueLabels(issue.id) 
    }));
  }

  getIssueById(id: string): Issue | null {
    const issue = db.query<Issue, [string]>('SELECT * FROM issues WHERE id = ?').get(id);
    if (issue) {
      issue.labels = this.getIssueLabels(issue.id);
    }
    return issue;
  }

  async searchIssues(query: string): Promise<Issue[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let sql = 'SELECT * FROM issues WHERE (title LIKE ? OR description LIKE ?)';
    const params: any[] = [`%${query}%`, `%${query}%`];
    
    if (workspaceId) {
      sql += ' AND (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    sql += ' ORDER BY updated_at DESC';
    
    const issues = db.query<Issue, any[]>(sql).all(...params);
    return issues.map(issue => ({ 
      ...issue, 
      labels: this.getIssueLabels(issue.id) 
    }));
  }

  // Teams - workspace-aware queries
  async getAllTeams(): Promise<Team[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let query = 'SELECT * FROM teams';
    const params: any[] = [];
    
    if (workspaceId) {
      query += ' WHERE (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    query += ' ORDER BY name';
    
    return db.query<Team, any[]>(query).all(...params);
  }

  getTeamById(id: string): Team | null {
    return db.query<Team, [string]>('SELECT * FROM teams WHERE id = ?').get(id);
  }

  // Projects - workspace-aware queries
  async getAllProjects(): Promise<Project[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let query = 'SELECT * FROM projects';
    const params: any[] = [];
    
    if (workspaceId) {
      query += ' WHERE (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    query += ' ORDER BY name';
    
    return db.query<Project, any[]>(query).all(...params);
  }

  getProjectById(id: string): Project | null {
    return db.query<Project, [string]>('SELECT * FROM projects WHERE id = ?').get(id);
  }

  // Labels - workspace-aware queries
  async getAllLabels(): Promise<Label[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let query = 'SELECT * FROM labels';
    const params: any[] = [];
    
    if (workspaceId) {
      query += ' WHERE (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    query += ' ORDER BY name';
    
    return db.query<Label, any[]>(query).all(...params);
  }

  getLabelById(id: string): Label | null {
    return db.query<Label, [string]>('SELECT * FROM labels WHERE id = ?').get(id);
  }

  getIssueLabels(issueId: string): Label[] {
    return db.query<Label, [string]>(`
      SELECT l.* FROM labels l 
      JOIN issue_labels il ON l.id = il.label_id 
      WHERE il.issue_id = ? 
      ORDER BY l.name
    `).all(issueId);
  }

  // Sync operations - workspace-aware
  async upsertIssue(issue: Issue): Promise<void> {
    const workspaceId = await this.getCurrentWorkspaceId();
    const userId = await this.getCurrentUserId();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO issues 
      (id, title, description, state_name, assignee_name, team_name, priority, 
       created_at, updated_at, workspace_id, created_by, updated_by, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      issue.id, issue.title, issue.description, issue.state_name, 
      issue.assignee_name, issue.team_name, issue.priority, 
      issue.created_at, issue.updated_at, 
      issue.workspace_id || workspaceId,
      issue.created_by || userId,
      userId
    );
  }

  async upsertTeam(team: Team): Promise<void> {
    const workspaceId = await this.getCurrentWorkspaceId();
    const userId = await this.getCurrentUserId();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO teams 
      (id, name, key, description, workspace_id, created_by, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      team.id, team.name, team.key, team.description,
      team.workspace_id || workspaceId,
      team.created_by || userId
    );
  }

  async upsertProject(project: Project): Promise<void> {
    const workspaceId = await this.getCurrentWorkspaceId();
    const userId = await this.getCurrentUserId();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO projects 
      (id, name, status, team_name, workspace_id, created_by, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      project.id, project.name, project.status, project.team_name,
      project.workspace_id || workspaceId,
      project.created_by || userId
    );
  }

  async upsertLabel(label: Label): Promise<void> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO labels 
      (id, name, color, description, workspace_id, synced_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      label.id, label.name, label.color, label.description,
      label.workspace_id || workspaceId
    );
  }

  setIssueLabels(issueId: string, labelIds: string[]): void {
    // Remove existing labels for this issue
    const deleteStmt = db.prepare('DELETE FROM issue_labels WHERE issue_id = ?');
    deleteStmt.run(issueId);
    
    // Add new labels
    const insertStmt = db.prepare('INSERT INTO issue_labels (issue_id, label_id) VALUES (?, ?)');
    for (const labelId of labelIds) {
      insertStmt.run(issueId, labelId);
    }
  }

  async updateSyncStatus(entity: string): Promise<void> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO sync_status (entity, last_sync, workspace_id)
      VALUES (?, CURRENT_TIMESTAMP, ?)
    `);
    
    stmt.run(entity, workspaceId);
  }

  async getSyncStatus(entity: string): Promise<{entity: string, last_sync: string} | null> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let query = 'SELECT * FROM sync_status WHERE entity = ?';
    const params: any[] = [entity];
    
    if (workspaceId) {
      query += ' AND (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    return db.query<{entity: string, last_sync: string}, any[]>(query).get(...params);
  }

  // Comments - workspace-aware
  async getCommentsByIssueId(issueId: string): Promise<Comment[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let query = 'SELECT * FROM comments WHERE issue_id = ?';
    const params: any[] = [issueId];
    
    if (workspaceId) {
      query += ' AND (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    query += ' ORDER BY created_at ASC';
    
    const allComments = db.query<Comment, any[]>(query).all(...params);
    return this.buildCommentTree(allComments);
  }

  getCommentById(id: string): Comment | null {
    return db.query<Comment, [string]>('SELECT * FROM comments WHERE id = ?').get(id);
  }

  async getAllComments(): Promise<Comment[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let query = 'SELECT * FROM comments';
    const params: any[] = [];
    
    if (workspaceId) {
      query += ' WHERE (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    return db.query<Comment, any[]>(query).all(...params);
  }

  async upsertComment(comment: Comment): Promise<void> {
    const workspaceId = await this.getCurrentWorkspaceId();
    const userId = await this.getCurrentUserId();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO comments 
      (id, issue_id, author, content, created_at, updated_at, parent_id, 
       workspace_id, created_by, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      comment.id, comment.issue_id, comment.author, comment.content, 
      comment.created_at, comment.updated_at, comment.parent_id,
      comment.workspace_id || workspaceId,
      comment.created_by || userId
    );
  }

  deleteComment(id: string): void {
    const stmt = db.prepare('DELETE FROM comments WHERE id = ?');
    stmt.run(id);
  }

  // Helper method to build comment tree with replies
  private buildCommentTree(comments: Comment[]): Comment[] {
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

  // Migration helper - migrate existing data to current workspace
  async migrateDataToWorkspace(workspaceId: string, userId: string): Promise<void> {
    const transaction = db.transaction(() => {
      // Migrate issues
      db.exec(`
        UPDATE issues 
        SET workspace_id = ?, created_by = ?, updated_by = ?
        WHERE workspace_id IS NULL
      `, [workspaceId, userId, userId]);
      
      // Migrate teams
      db.exec(`
        UPDATE teams 
        SET workspace_id = ?, created_by = ?
        WHERE workspace_id IS NULL
      `, [workspaceId, userId]);
      
      // Migrate projects
      db.exec(`
        UPDATE projects 
        SET workspace_id = ?, created_by = ?
        WHERE workspace_id IS NULL
      `, [workspaceId, userId]);
      
      // Migrate labels
      db.exec(`
        UPDATE labels 
        SET workspace_id = ?
        WHERE workspace_id IS NULL
      `, [workspaceId]);
      
      // Migrate comments
      db.exec(`
        UPDATE comments 
        SET workspace_id = ?, created_by = ?
        WHERE workspace_id IS NULL
      `, [workspaceId, userId]);
      
      // Migrate line_tasks
      db.exec(`
        UPDATE line_tasks 
        SET workspace_id = ?, created_by = ?, updated_by = ?
        WHERE workspace_id IS NULL
      `, [workspaceId, userId, userId]);
      
      // Migrate sync_status
      db.exec(`
        UPDATE sync_status 
        SET workspace_id = ?
        WHERE workspace_id IS NULL
      `, [workspaceId]);
    });
    
    transaction();
  }
}

export const workspaceDb = new WorkspaceDatabase();