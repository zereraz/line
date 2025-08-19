import { Database } from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';
import { authService } from '../services/authService.ts';

const dbPath = join(homedir(), '.line', 'data.db');

// Use the same database instance as the main database
export const lineDb = new Database(dbPath);

// Initialize Line task tables
lineDb.exec(`
  CREATE TABLE IF NOT EXISTS line_tasks (
    id TEXT PRIMARY KEY,                    -- LINE-001, LINE-002, etc.
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'issue',              -- issue, goal, habit, learning
    status TEXT DEFAULT 'todo',             -- todo, in_progress, review, done
    priority TEXT DEFAULT 'normal',         -- urgent, high, normal, low
    assignee TEXT,                          -- human or AI instance name
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    time_tracked INTEGER DEFAULT 0,         -- minutes
    progress INTEGER DEFAULT 0,             -- 0-100 for goals/learning
    due_date DATETIME,
    parent_id TEXT,                         -- for sub-tasks
    FOREIGN KEY (parent_id) REFERENCES line_tasks(id)
  );

  CREATE TABLE IF NOT EXISTS line_task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    depends_on_id TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES line_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_id) REFERENCES line_tasks(id) ON DELETE CASCADE,
    UNIQUE(task_id, depends_on_id)
  );

  CREATE TABLE IF NOT EXISTS line_task_labels (
    task_id TEXT NOT NULL,
    label_id TEXT NOT NULL,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES line_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_line_tasks_status ON line_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_line_tasks_type ON line_tasks(type);
  CREATE INDEX IF NOT EXISTS idx_line_tasks_assignee ON line_tasks(assignee);
  CREATE INDEX IF NOT EXISTS idx_line_tasks_parent ON line_tasks(parent_id);
  CREATE INDEX IF NOT EXISTS idx_line_task_deps_task ON line_task_dependencies(task_id);
  CREATE INDEX IF NOT EXISTS idx_line_task_deps_depends ON line_task_dependencies(depends_on_id);
`);

export interface LineTask {
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
  workspace_id?: string;
  created_by?: string;
  updated_by?: string;
  labels?: Array<{id: string, name: string, color: string, description?: string}>;
  dependencies?: string[];
  dependents?: string[];
  subtasks?: LineTask[];
}

export interface LineTaskDependency {
  id: number;
  task_id: string;
  depends_on_id: string;
}

class LineTaskDatabase {
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

  private generateNextId(): string {
    const stmt = lineDb.prepare(`
      SELECT id FROM line_tasks 
      WHERE id LIKE 'LINE-%' 
      ORDER BY CAST(SUBSTR(id, 6) AS INTEGER) DESC 
      LIMIT 1
    `);
    const lastTask = stmt.get() as {id: string} | undefined;
    
    if (!lastTask) {
      return 'LINE-001';
    }
    
    const lastNumber = parseInt(lastTask.id.split('-')[1]);
    const nextNumber = lastNumber + 1;
    return `LINE-${nextNumber.toString().padStart(3, '0')}`;
  }

  async createTask(task: Omit<LineTask, 'id' | 'created_at' | 'updated_at'>): Promise<LineTask> {
    const id = this.generateNextId();
    const now = new Date().toISOString();
    const workspaceId = await this.getCurrentWorkspaceId();
    const userId = await this.getCurrentUserId();
    
    const stmt = lineDb.prepare(`
      INSERT INTO line_tasks 
      (id, title, description, type, status, priority, assignee, created_at, updated_at, 
       time_tracked, progress, due_date, parent_id, workspace_id, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, task.title, task.description, task.type, task.status, task.priority,
      task.assignee, now, now, task.time_tracked, task.progress, task.due_date, task.parent_id,
      task.workspace_id || workspaceId, task.created_by || userId, userId
    );

    return this.getTaskById(id)!;
  }

  async updateTask(id: string, updates: Partial<Omit<LineTask, 'id' | 'created_at'>>): Promise<LineTask | null> {
    const existing = this.getTaskById(id);
    if (!existing) return null;

    const fields = [];
    const values = [];
    const userId = await this.getCurrentUserId();
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return existing;
    
    fields.push('updated_at = ?', 'updated_by = ?');
    values.push(new Date().toISOString(), userId);
    values.push(id);

    const stmt = lineDb.prepare(`
      UPDATE line_tasks 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getTaskById(id);
  }

  deleteTask(id: string): boolean {
    // First delete all dependencies
    const deleteDepsStmt = lineDb.prepare(`
      DELETE FROM line_task_dependencies 
      WHERE task_id = ? OR depends_on_id = ?
    `);
    deleteDepsStmt.run(id, id);

    // Delete task labels
    const deleteLabelsStmt = lineDb.prepare(`
      DELETE FROM line_task_labels WHERE task_id = ?
    `);
    deleteLabelsStmt.run(id);

    // Delete the task
    const deleteTaskStmt = lineDb.prepare(`
      DELETE FROM line_tasks WHERE id = ?
    `);
    const result = deleteTaskStmt.run(id);
    
    return result.changes > 0;
  }

  getTaskById(id: string): LineTask | null {
    const stmt = lineDb.prepare(`
      SELECT * FROM line_tasks WHERE id = ?
    `);
    const task = stmt.get(id) as LineTask | undefined;
    
    if (!task) return null;
    
    // Get labels
    task.labels = this.getTaskLabels(id);
    
    // Get dependencies
    task.dependencies = this.getTaskDependencies(id);
    task.dependents = this.getTaskDependents(id);
    
    // Get subtasks
    task.subtasks = this.getSubtasks(id);
    
    return task;
  }

  async getAllTasks(filters?: {
    status?: string;
    type?: string;
    assignee?: string;
    parent_id?: string | null;
  }): Promise<LineTask[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let query = 'SELECT * FROM line_tasks';
    const conditions = [];
    const values = [];

    // Add workspace filter
    if (workspaceId) {
      conditions.push('(workspace_id = ? OR workspace_id IS NULL)');
      values.push(workspaceId);
    }

    if (filters) {
      if (filters.status) {
        conditions.push('status = ?');
        values.push(filters.status);
      }
      if (filters.type) {
        conditions.push('type = ?');
        values.push(filters.type);
      }
      if (filters.assignee) {
        conditions.push('assignee = ?');
        values.push(filters.assignee);
      }
      if (filters.parent_id !== undefined) {
        if (filters.parent_id === null) {
          conditions.push('parent_id IS NULL');
        } else {
          conditions.push('parent_id = ?');
          values.push(filters.parent_id);
        }
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';

    const stmt = lineDb.prepare(query);
    const tasks = stmt.all(...values) as LineTask[];
    
    // Enrich each task with related data (sync operations for performance)
    return tasks.map(task => {
      task.labels = this.getTaskLabels(task.id);
      task.dependencies = this.getTaskDependencies(task.id);
      task.dependents = this.getTaskDependents(task.id);
      // Note: subtasks will be loaded separately to avoid async issues in map
      return task;
    });
  }

  async searchTasks(query: string): Promise<LineTask[]> {
    const workspaceId = await this.getCurrentWorkspaceId();
    
    let sql = `
      SELECT * FROM line_tasks 
      WHERE (title LIKE ? OR description LIKE ?)
    `;
    const params = [`%${query}%`, `%${query}%`];
    
    if (workspaceId) {
      sql += ' AND (workspace_id = ? OR workspace_id IS NULL)';
      params.push(workspaceId);
    }
    
    sql += ' ORDER BY updated_at DESC';
    
    const stmt = lineDb.prepare(sql);
    const tasks = stmt.all(...params) as LineTask[];
    
    return tasks.map(task => {
      task.labels = this.getTaskLabels(task.id);
      task.dependencies = this.getTaskDependencies(task.id);
      task.dependents = this.getTaskDependents(task.id);
      // Note: subtasks will be loaded separately to avoid async issues in map
      return task;
    });
  }

  async getMyTasks(assignee: string): Promise<LineTask[]> {
    return await this.getAllTasks({ assignee });
  }

  async getSubtasks(parentId: string): Promise<LineTask[]> {
    return await this.getAllTasks({ parent_id: parentId });
  }

  // Dependency management
  addDependency(taskId: string, dependsOnId: string): boolean {
    // Check for circular dependencies
    if (this.wouldCreateCircularDependency(taskId, dependsOnId)) {
      return false;
    }

    try {
      const stmt = lineDb.prepare(`
        INSERT OR IGNORE INTO line_task_dependencies (task_id, depends_on_id)
        VALUES (?, ?)
      `);
      const result = stmt.run(taskId, dependsOnId);
      return result.changes > 0;
    } catch {
      return false;
    }
  }

  removeDependency(taskId: string, dependsOnId: string): boolean {
    const stmt = lineDb.prepare(`
      DELETE FROM line_task_dependencies 
      WHERE task_id = ? AND depends_on_id = ?
    `);
    const result = stmt.run(taskId, dependsOnId);
    return result.changes > 0;
  }

  getTaskDependencies(taskId: string): string[] {
    const stmt = lineDb.prepare(`
      SELECT depends_on_id FROM line_task_dependencies WHERE task_id = ?
    `);
    const deps = stmt.all(taskId) as {depends_on_id: string}[];
    return deps.map(d => d.depends_on_id);
  }

  getTaskDependents(taskId: string): string[] {
    const stmt = lineDb.prepare(`
      SELECT task_id FROM line_task_dependencies WHERE depends_on_id = ?
    `);
    const deps = stmt.all(taskId) as {task_id: string}[];
    return deps.map(d => d.task_id);
  }

  private wouldCreateCircularDependency(taskId: string, dependsOnId: string): boolean {
    // If dependsOnId depends on taskId (directly or indirectly), adding this dependency would create a cycle
    const visited = new Set<string>();
    const stack = [dependsOnId];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      
      if (current === taskId) {
        return true; // Circular dependency detected
      }
      
      const dependencies = this.getTaskDependencies(current);
      stack.push(...dependencies);
    }
    
    return false;
  }

  // Label management
  setTaskLabels(taskId: string, labelIds: string[]): void {
    // Remove existing labels
    const deleteStmt = lineDb.prepare('DELETE FROM line_task_labels WHERE task_id = ?');
    deleteStmt.run(taskId);
    
    // Add new labels
    const insertStmt = lineDb.prepare('INSERT INTO line_task_labels (task_id, label_id) VALUES (?, ?)');
    for (const labelId of labelIds) {
      insertStmt.run(taskId, labelId);
    }
  }

  getTaskLabels(taskId: string): Array<{id: string, name: string, color: string, description?: string}> {
    const stmt = lineDb.prepare(`
      SELECT l.* FROM labels l 
      JOIN line_task_labels ltl ON l.id = ltl.label_id 
      WHERE ltl.task_id = ? 
      ORDER BY l.name
    `);
    return stmt.all(taskId) as Array<{id: string, name: string, color: string, description?: string}>;
  }

  // Statistics
  getTaskStats(): {
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  } {
    const totalStmt = lineDb.prepare('SELECT COUNT(*) as count FROM line_tasks');
    const total = (totalStmt.get() as {count: number}).count;

    const statusStmt = lineDb.prepare('SELECT status, COUNT(*) as count FROM line_tasks GROUP BY status');
    const statusCounts = statusStmt.all() as {status: string, count: number}[];
    const by_status = Object.fromEntries(statusCounts.map(s => [s.status, s.count]));

    const typeStmt = lineDb.prepare('SELECT type, COUNT(*) as count FROM line_tasks GROUP BY type');
    const typeCounts = typeStmt.all() as {type: string, count: number}[];
    const by_type = Object.fromEntries(typeCounts.map(t => [t.type, t.count]));

    const priorityStmt = lineDb.prepare('SELECT priority, COUNT(*) as count FROM line_tasks GROUP BY priority');
    const priorityCounts = priorityStmt.all() as {priority: string, count: number}[];
    const by_priority = Object.fromEntries(priorityCounts.map(p => [p.priority, p.count]));

    return { total, by_status, by_type, by_priority };
  }
}

export const lineTaskDb = new LineTaskDatabase();