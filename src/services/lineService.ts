import { lineTaskDb, type LineTask } from '../utils/lineDatabase.ts';

// Line Task Management Service
// Provides unified interface for Line's native task management system
// Independent from external services like Linear

export interface CreateTaskOptions {
  title: string;
  description?: string;
  type?: 'issue' | 'goal' | 'habit' | 'learning';
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  assignee?: string;
  due_date?: string;
  parent_id?: string;
  labels?: string[];
}

export interface UpdateTaskOptions {
  title?: string;
  description?: string;
  type?: 'issue' | 'goal' | 'habit' | 'learning';
  status?: 'todo' | 'in_progress' | 'review' | 'done';
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  assignee?: string;
  time_tracked?: number;
  progress?: number;
  due_date?: string;
  parent_id?: string;
}

export interface ListTasksOptions {
  status?: 'todo' | 'in_progress' | 'review' | 'done';
  type?: 'issue' | 'goal' | 'habit' | 'learning';
  assignee?: string;
  parent_only?: boolean; // Only show top-level tasks (no parent)
}

class LineService {
  
  // Task CRUD operations
  createTask(options: CreateTaskOptions): LineTask {
    const task = lineTaskDb.createTask({
      title: options.title,
      description: options.description,
      type: options.type || 'issue',
      status: 'todo',
      priority: options.priority || 'normal',
      assignee: options.assignee,
      time_tracked: 0,
      progress: 0,
      due_date: options.due_date,
      parent_id: options.parent_id
    });

    // Set labels if provided
    if (options.labels && options.labels.length > 0) {
      lineTaskDb.setTaskLabels(task.id, options.labels);
      // Refresh to get labels
      return lineTaskDb.getTaskById(task.id)!;
    }

    return task;
  }

  updateTask(id: string, options: UpdateTaskOptions): LineTask | null {
    return lineTaskDb.updateTask(id, options);
  }

  deleteTask(id: string): boolean {
    return lineTaskDb.deleteTask(id);
  }

  getTask(id: string): LineTask | null {
    return lineTaskDb.getTaskById(id);
  }

  // List operations
  async listTasks(options: ListTasksOptions = {}): Promise<LineTask[]> {
    const filters: any = {};
    
    if (options.status) filters.status = options.status;
    if (options.type) filters.type = options.type;
    if (options.assignee) filters.assignee = options.assignee;
    if (options.parent_only) filters.parent_id = null;

    return await lineTaskDb.getAllTasks(filters);
  }

  async searchTasks(query: string): Promise<LineTask[]> {
    return await lineTaskDb.searchTasks(query);
  }

  async getMyTasks(assignee?: string): Promise<LineTask[]> {
    // Default to current user if no assignee provided
    const currentAssignee = assignee || 'You';
    return await lineTaskDb.getMyTasks(currentAssignee);
  }

  getSubtasks(parentId: string): LineTask[] {
    return lineTaskDb.getSubtasks(parentId);
  }

  // Status transitions
  startTask(id: string): LineTask | null {
    return this.updateTask(id, { status: 'in_progress' });
  }

  completeTask(id: string): LineTask | null {
    return this.updateTask(id, { status: 'done', progress: 100 });
  }

  reviewTask(id: string): LineTask | null {
    return this.updateTask(id, { status: 'review' });
  }

  reopenTask(id: string): LineTask | null {
    return this.updateTask(id, { status: 'todo' });
  }

  // Priority management
  setPriority(id: string, priority: 'urgent' | 'high' | 'normal' | 'low'): LineTask | null {
    return this.updateTask(id, { priority });
  }

  // Time tracking
  addTimeTracked(id: string, minutes: number): LineTask | null {
    const task = this.getTask(id);
    if (!task) return null;
    
    const newTimeTracked = task.time_tracked + minutes;
    return this.updateTask(id, { time_tracked: newTimeTracked });
  }

  setProgress(id: string, progress: number): LineTask | null {
    // Ensure progress is between 0-100
    const clampedProgress = Math.max(0, Math.min(100, progress));
    return this.updateTask(id, { progress: clampedProgress });
  }

  // Dependency management
  addDependency(taskId: string, dependsOnId: string): boolean {
    return lineTaskDb.addDependency(taskId, dependsOnId);
  }

  removeDependency(taskId: string, dependsOnId: string): boolean {
    return lineTaskDb.removeDependency(taskId, dependsOnId);
  }

  getDependencies(taskId: string): string[] {
    return lineTaskDb.getTaskDependencies(taskId);
  }

  getDependents(taskId: string): string[] {
    return lineTaskDb.getTaskDependents(taskId);
  }

  // Check if task is blocked by incomplete dependencies
  isTaskBlocked(taskId: string): boolean {
    const dependencies = this.getDependencies(taskId);
    
    for (const depId of dependencies) {
      const depTask = this.getTask(depId);
      if (!depTask || depTask.status !== 'done') {
        return true;
      }
    }
    
    return false;
  }

  // Get tasks that can be started (no incomplete dependencies)
  getAvailableTasks(): LineTask[] {
    const allTasks = this.listTasks({ status: 'todo' });
    return allTasks.filter(task => !this.isTaskBlocked(task.id));
  }

  // Label management
  setTaskLabels(taskId: string, labelIds: string[]): void {
    lineTaskDb.setTaskLabels(taskId, labelIds);
  }

  // Statistics and reporting
  getStats(): {
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    by_priority: Record<string, number>;
  } {
    return lineTaskDb.getTaskStats();
  }

  // Bulk operations
  bulkUpdateStatus(taskIds: string[], status: 'todo' | 'in_progress' | 'review' | 'done'): number {
    let updated = 0;
    for (const id of taskIds) {
      if (this.updateTask(id, { status })) {
        updated++;
      }
    }
    return updated;
  }

  bulkSetPriority(taskIds: string[], priority: 'urgent' | 'high' | 'normal' | 'low'): number {
    let updated = 0;
    for (const id of taskIds) {
      if (this.updateTask(id, { priority })) {
        updated++;
      }
    }
    return updated;
  }

  // Task validation
  validateTaskId(id: string): boolean {
    return /^LINE-\d{3}$/.test(id);
  }

  // Utility methods
  formatTaskId(id: string): string {
    if (this.validateTaskId(id)) {
      return id;
    }
    
    // Try to normalize common variations
    const normalized = id.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (normalized.startsWith('LINE') && !normalized.startsWith('LINE-')) {
      return normalized.replace('LINE', 'LINE-');
    }
    
    return normalized;
  }

  // Get task hierarchy (parent and all children)
  getTaskHierarchy(taskId: string): {
    root: LineTask | null;
    children: LineTask[];
    allRelated: LineTask[];
  } {
    const task = this.getTask(taskId);
    if (!task) {
      return { root: null, children: [], allRelated: [] };
    }

    // Find root task
    let root = task;
    while (root.parent_id) {
      const parent = this.getTask(root.parent_id);
      if (!parent) break;
      root = parent;
    }

    // Get all descendants
    const getAllDescendants = (parentId: string): LineTask[] => {
      const directChildren = this.getSubtasks(parentId);
      const allDescendants = [...directChildren];
      
      for (const child of directChildren) {
        allDescendants.push(...getAllDescendants(child.id));
      }
      
      return allDescendants;
    };

    const children = getAllDescendants(root.id);
    const allRelated = [root, ...children];

    return { root, children, allRelated };
  }
}

export const lineService = new LineService();