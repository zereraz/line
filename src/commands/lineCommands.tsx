import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { lineService, type CreateTaskOptions, type UpdateTaskOptions, type ListTasksOptions } from '../services/lineService.ts';
import type { LineTask } from '../utils/lineDatabase.ts';
import { Header, Section, StatusIndicator, LinePriorityBadge, LoadingSpinner, EmptyState, Divider, icons, InfoPanel, LabelsGroup } from '../components/ui/Theme.tsx';
import { SimpleTable } from '../components/ui/Table.tsx';

// Parse command line arguments for Line commands
function parseLineArgs(args: string[]): { flags: Record<string, string | boolean>, positionals: string[] } {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=', 2);
      flags[key] = value || true;
    } else if (arg.startsWith('-')) {
      flags[arg.slice(1)] = true;
    } else {
      positionals.push(arg);
    }
  }
  
  return { flags, positionals };
}

// Line Create Command
export function LineCreate({ args }: { args: string[] }) {
  const [task, setTask] = useState<LineTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const createTask = async () => {
      try {
        const { flags, positionals } = parseLineArgs(args);
        
        if (positionals.length === 0) {
          setError('Title is required. Usage: line create "Task title" [options]');
          return;
        }

        const options: CreateTaskOptions = {
          title: positionals.join(' '),
          description: flags.description as string,
          type: (flags.type as 'issue' | 'goal' | 'habit' | 'learning') || 'issue',
          priority: (flags.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal',
          assignee: flags.assignee as string,
          due_date: flags.due_date as string,
          parent_id: flags.parent as string,
          labels: flags.labels ? (flags.labels as string).split(',') : undefined
        };

        const newTask = lineService.createTask(options);
        setTask(newTask);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create task');
      } finally {
        setLoading(false);
      }
    };

    createTask();
  }, [args]);

  if (loading) return <LoadingSpinner text="Creating task..." />;
  if (error) return <Text color="red">{error}</Text>;
  if (!task) return <Text color="red">Failed to create task</Text>;

  return (
    <Box flexDirection="column">
      <Header icon={icons.success}>Task Created</Header>
      <Divider />
      <Box flexDirection="column" paddingX={2}>
        <Text>
          <Text color="green" bold>{task.id}</Text>
          <Text> - </Text>
          <Text bold>{task.title}</Text>
        </Text>
        {task.description && (
          <Text color="gray">{task.description}</Text>
        )}
        <Box marginTop={1}>
          <Text color="blue">Type: </Text>
          <Text bold>{task.type}</Text>
          <Text color="blue"> | Priority: </Text>
          <LinePriorityBadge priority={task.priority} />
          <Text color="blue"> | Status: </Text>
          <StatusIndicator status={task.status} />
        </Box>
        {task.assignee && (
          <Text>
            <Text color="blue">Assignee: </Text>
            <Text bold>{task.assignee}</Text>
          </Text>
        )}
        {task.due_date && (
          <Text>
            <Text color="blue">Due: </Text>
            <Text>{new Date(task.due_date).toLocaleDateString()}</Text>
          </Text>
        )}
      </Box>
    </Box>
  );
}

// Line List Command
export function LineList({ args }: { args: string[] }) {
  const [tasks, setTasks] = useState<LineTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { flags } = parseLineArgs(args);
        
        const options: ListTasksOptions = {
          status: flags.status as 'todo' | 'in_progress' | 'review' | 'done',
          type: flags.type as 'issue' | 'goal' | 'habit' | 'learning',
          assignee: flags.assignee as string,
          parent_only: flags.parent_only as boolean
        };

        const result = await lineService.listTasks(options);
        setTasks(result);
      } catch (err) {
        console.error('Error fetching tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [args]);

  if (loading) return <LoadingSpinner text="Loading tasks..." />;

  if (tasks.length === 0) {
    return <EmptyState message="No tasks found" icon={icons.empty} />;
  }

  const columns = [
    {
      key: 'id',
      title: 'ID',
      width: 12,
      flexShrink: 0,
      render: (value: string) => <Text color="cyan" bold>{value}</Text>
    },
    {
      key: 'title',
      title: 'Title',
      flexGrow: 3,
      render: (value: string) => <Text>{value}</Text>
    },
    {
      key: 'type',
      title: 'Type',
      width: 10,
      flexShrink: 0,
      render: (value: string) => <Text color="blue">{value}</Text>
    },
    {
      key: 'status',
      title: 'Status',
      flexGrow: 1,
      render: (value: string) => <StatusIndicator status={value} />
    },
    {
      key: 'priority',
      title: 'Priority',
      flexGrow: 1,
      render: (value: string) => <LinePriorityBadge priority={value} />
    },
    {
      key: 'assignee',
      title: 'Assignee',
      flexGrow: 1,
      render: (value: string) => <Text>{value || '-'}</Text>
    }
  ];

  return (
    <Box flexDirection="column">
      <Header icon={icons.tasks}>Line Tasks</Header>
      <Divider />
      <SimpleTable data={tasks} columns={columns} />
    </Box>
  );
}

// Line Show Command
export function LineShow({ args }: { args: string[] }) {
  const [task, setTask] = useState<LineTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        if (args.length === 0) {
          setError('Task ID is required. Usage: line show LINE-001');
          return;
        }

        const taskId = lineService.formatTaskId(args[0]);
        const result = lineService.getTask(taskId);
        
        if (!result) {
          setError(`Task ${taskId} not found`);
          return;
        }
        
        setTask(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch task');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [args]);

  if (loading) return <LoadingSpinner text="Loading task..." />;
  if (error) return <Text color="red">{error}</Text>;
  if (!task) return <Text color="red">Task not found</Text>;

  return (
    <Box flexDirection="column">
      <Header icon={icons.task}>{task.id} - {task.title}</Header>
      <Divider />
      
      <Box flexDirection="column" paddingX={2}>
        {/* Basic Info */}
        <Section title="Details">
          <Box flexDirection="column">
            <Box>
              <Text color="blue">Type: </Text>
              <Text bold>{task.type}</Text>
              <Text color="blue"> | Status: </Text>
              <StatusIndicator status={task.status} />
              <Text color="blue"> | Priority: </Text>
              <LinePriorityBadge priority={task.priority} />
            </Box>
            
            {task.assignee && (
              <Text>
                <Text color="blue">Assignee: </Text>
                <Text bold>{task.assignee}</Text>
              </Text>
            )}
            
            {task.due_date && (
              <Text>
                <Text color="blue">Due Date: </Text>
                <Text>{new Date(task.due_date).toLocaleDateString()}</Text>
              </Text>
            )}
            
            <Text>
              <Text color="blue">Progress: </Text>
              <Text bold>{task.progress}%</Text>
              <Text color="blue"> | Time Tracked: </Text>
              <Text bold>{Math.floor(task.time_tracked / 60)}h {task.time_tracked % 60}m</Text>
            </Text>
            
            <Text>
              <Text color="blue">Created: </Text>
              <Text>{new Date(task.created_at).toLocaleDateString()}</Text>
              <Text color="blue"> | Updated: </Text>
              <Text>{new Date(task.updated_at).toLocaleDateString()}</Text>
            </Text>
          </Box>
        </Section>

        {/* Description */}
        {task.description && (
          <Section title="Description">
            <Text>{task.description}</Text>
          </Section>
        )}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <Section title="Labels">
            <LabelsGroup labels={task.labels} />
          </Section>
        )}

        {/* Dependencies */}
        {(task.dependencies && task.dependencies.length > 0) || (task.dependents && task.dependents.length > 0) && (
          <Section title="Dependencies">
            {task.dependencies && task.dependencies.length > 0 && (
              <Text>
                <Text color="blue">Depends on: </Text>
                <Text>{task.dependencies.join(', ')}</Text>
              </Text>
            )}
            {task.dependents && task.dependents.length > 0 && (
              <Text>
                <Text color="blue">Blocking: </Text>
                <Text>{task.dependents.join(', ')}</Text>
              </Text>
            )}
          </Section>
        )}

        {/* Subtasks */}
        {task.subtasks && task.subtasks.length > 0 && (
          <Section title="Subtasks">
            <Box flexDirection="column">
              {task.subtasks.map((subtask) => (
                <Text key={subtask.id}>
                  <Text color="cyan">{subtask.id}</Text>
                  <Text> - </Text>
                  <StatusIndicator status={subtask.status} />
                  <Text> {subtask.title}</Text>
                </Text>
              ))}
            </Box>
          </Section>
        )}
      </Box>
    </Box>
  );
}

// Line Update Command
export function LineUpdate({ args }: { args: string[] }) {
  const [task, setTask] = useState<LineTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateTask = async () => {
      try {
        const { flags, positionals } = parseLineArgs(args);
        
        if (positionals.length === 0) {
          setError('Task ID is required. Usage: line update LINE-001 [options]');
          return;
        }

        const taskId = lineService.formatTaskId(positionals[0]);
        const updates: UpdateTaskOptions = {};

        // Parse update options
        if (flags.title) updates.title = flags.title as string;
        if (flags.description) updates.description = flags.description as string;
        if (flags.status) updates.status = flags.status as 'todo' | 'in_progress' | 'review' | 'done';
        if (flags.type) updates.type = flags.type as 'issue' | 'goal' | 'habit' | 'learning';
        if (flags.priority) updates.priority = flags.priority as 'urgent' | 'high' | 'normal' | 'low';
        if (flags.assignee) updates.assignee = flags.assignee as string;
        if (flags.progress) updates.progress = parseInt(flags.progress as string);
        if (flags.due_date) updates.due_date = flags.due_date as string;

        const updatedTask = lineService.updateTask(taskId, updates);
        
        if (!updatedTask) {
          setError(`Task ${taskId} not found`);
          return;
        }
        
        setTask(updatedTask);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update task');
      } finally {
        setLoading(false);
      }
    };

    updateTask();
  }, [args]);

  if (loading) return <LoadingSpinner text="Updating task..." />;
  if (error) return <Text color="red">{error}</Text>;
  if (!task) return <Text color="red">Failed to update task</Text>;

  return (
    <Box flexDirection="column">
      <Header icon={icons.success}>Task Updated</Header>
      <Divider />
      <Box flexDirection="column" paddingX={2}>
        <Text>
          <Text color="green" bold>{task.id}</Text>
          <Text> - </Text>
          <Text bold>{task.title}</Text>
        </Text>
        <Box marginTop={1}>
          <Text color="blue">Status: </Text>
          <StatusIndicator status={task.status} />
          <Text color="blue"> | Priority: </Text>
          <LinePriorityBadge priority={task.priority} />
          <Text color="blue"> | Progress: </Text>
          <Text bold>{task.progress}%</Text>
        </Box>
      </Box>
    </Box>
  );
}

// Line Delete Command
export function LineDelete({ args }: { args: string[] }) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskId, setTaskId] = useState<string>('');

  useEffect(() => {
    const deleteTask = async () => {
      try {
        if (args.length === 0) {
          setError('Task ID is required. Usage: line delete LINE-001');
          return;
        }

        const id = lineService.formatTaskId(args[0]);
        setTaskId(id);
        
        const result = lineService.deleteTask(id);
        
        if (!result) {
          setError(`Task ${id} not found or could not be deleted`);
          return;
        }
        
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete task');
      } finally {
        setLoading(false);
      }
    };

    deleteTask();
  }, [args]);

  if (loading) return <LoadingSpinner text="Deleting task..." />;
  if (error) return <Text color="red">{error}</Text>;

  return (
    <Box flexDirection="column">
      <Header icon={icons.success}>Task Deleted</Header>
      <Divider />
      <Box paddingX={2}>
        <Text color="green">Successfully deleted task {taskId}</Text>
      </Box>
    </Box>
  );
}

// Line My Tasks Command  
export function LineMyTasks({ args }: { args: string[] }) {
  const [tasks, setTasks] = useState<LineTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyTasks = async () => {
      try {
        const { flags } = parseLineArgs(args);
        const assignee = flags.assignee as string || 'You';
        
        const result = lineService.getMyTasks(assignee);
        setTasks(result);
      } catch (err) {
        console.error('Error fetching my tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTasks();
  }, [args]);

  if (loading) return <LoadingSpinner text="Loading your tasks..." />;

  if (tasks.length === 0) {
    return <EmptyState message="No tasks assigned to you" icon={icons.empty} />;
  }

  const columns = [
    {
      key: 'id',
      title: 'ID',
      width: 12,
      render: (value: string) => <Text color="cyan" bold>{value}</Text>
    },
    {
      key: 'title',
      title: 'Title',
      width: 40,
      render: (value: string) => <Text>{value.length > 37 ? value.slice(0, 34) + '...' : value}</Text>
    },
    {
      key: 'type',
      title: 'Type',
      width: 10,
      render: (value: string) => <Text color="blue">{value}</Text>
    },
    {
      key: 'status',
      title: 'Status',
      width: 15,
      render: (value: string) => <StatusIndicator status={value} />
    },
    {
      key: 'priority',
      title: 'Priority',
      width: 12,
      render: (value: string) => <LinePriorityBadge priority={value} />
    }
  ];

  return (
    <Box flexDirection="column">
      <Header icon={icons.user}>My Line Tasks</Header>
      <Divider />
      <SimpleTable data={tasks} columns={columns} />
    </Box>
  );
}

// Line Depend Command
export function LineDepend({ args }: { args: string[] }) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskId, setTaskId] = useState<string>('');
  const [dependsOnId, setDependsOnId] = useState<string>('');

  useEffect(() => {
    const addDependency = async () => {
      try {
        const { flags, positionals } = parseLineArgs(args);
        
        if (positionals.length === 0) {
          setError('Task ID is required. Usage: line depend LINE-002 --on=LINE-001');
          return;
        }

        if (!flags.on) {
          setError('Dependency task ID is required. Usage: line depend LINE-002 --on=LINE-001');
          return;
        }

        const id = lineService.formatTaskId(positionals[0]);
        const dependsOn = lineService.formatTaskId(flags.on as string);
        
        setTaskId(id);
        setDependsOnId(dependsOn);
        
        const result = lineService.addDependency(id, dependsOn);
        
        if (!result) {
          setError(`Could not add dependency. Check if tasks exist and dependency doesn't create a cycle.`);
          return;
        }
        
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add dependency');
      } finally {
        setLoading(false);
      }
    };

    addDependency();
  }, [args]);

  if (loading) return <LoadingSpinner text="Adding dependency..." />;
  if (error) return <Text color="red">{error}</Text>;

  return (
    <Box flexDirection="column">
      <Header icon={icons.success}>Dependency Added</Header>
      <Divider />
      <Box paddingX={2}>
        <Text color="green">
          Task {taskId} now depends on {dependsOnId}
        </Text>
      </Box>
    </Box>
  );
}

// Line Stats Command
export function LineStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = lineService.getStats();
        setStats(result);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner text="Loading statistics..." />;
  if (!stats) return <Text color="red">Failed to load statistics</Text>;

  return (
    <Box flexDirection="column">
      <Header icon={icons.chart}>Line Task Statistics</Header>
      <Divider />
      
      <Box flexDirection="column" paddingX={2}>
        <Section title="Overview">
          <Text bold>Total Tasks: {stats.total}</Text>
        </Section>

        <Section title="By Status">
          <Box flexDirection="column">
            {Object.entries(stats.by_status).map(([status, count]) => (
              <Box key={status}>
                <StatusIndicator status={status} />
                <Text> {status}: </Text>
                <Text bold>{count as number}</Text>
              </Box>
            ))}
          </Box>
        </Section>

        <Section title="By Type">
          <Box flexDirection="column">
            {Object.entries(stats.by_type).map(([type, count]) => (
              <Box key={type}>
                <Text color="blue">{type}: </Text>
                <Text bold>{count as number}</Text>
              </Box>
            ))}
          </Box>
        </Section>

        <Section title="By Priority">
          <Box flexDirection="column">
            {Object.entries(stats.by_priority).map(([priority, count]) => (
              <Box key={priority}>
                <LinePriorityBadge priority={priority} />
                <Text> {priority}: </Text>
                <Text bold>{count as number}</Text>
              </Box>
            ))}
          </Box>
        </Section>
      </Box>
    </Box>
  );
}