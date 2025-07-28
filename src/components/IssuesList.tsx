import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { linearService } from '../services/linear.ts';
import type { Issue } from '../utils/database.ts';
import { Header, Section, StatusIndicator, PriorityBadge, LoadingSpinner, EmptyState, Divider, icons } from './ui/Theme.tsx';
import { SimpleTable } from './ui/Table.tsx';

interface IssuesListProps {
  filter?: 'me' | 'all';
}

export default function IssuesList({ filter = 'all' }: IssuesListProps) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIssues = async () => {
      try {
        const loadedIssues = filter === 'me' 
          ? await linearService.getMyIssues()
          : await linearService.getIssues();
        setIssues(loadedIssues);
      } catch (error) {
        console.error('Failed to load issues:', error);
      } finally {
        setLoading(false);
      }
    };

    loadIssues();
  }, [filter]);

  if (loading) {
    return (
      <Box padding={2}>
        <LoadingSpinner text={`Loading ${filter === 'me' ? 'your' : 'all'} issues...`} />
      </Box>
    );
  }

  const urgentIssues = issues.filter(issue => issue.priority === 1);
  const inProgressIssues = issues.filter(issue => issue.state_name === 'In Progress');
  const todoIssues = issues.filter(issue => issue.state_name === 'Todo');
  const doneIssues = issues.filter(issue => issue.state_name === 'Done');

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
      width: 45,
      render: (value: string) => <Text>{value.length > 42 ? value.slice(0, 39) + '...' : value}</Text>
    },
    {
      key: 'state_name',
      title: 'Status',
      width: 18,
      render: (value: string) => <StatusIndicator status={value} />
    },
    {
      key: 'assignee_name',
      title: 'Assignee',
      width: 15,
      render: (value: string) => <Text color="magenta">{value || 'Unassigned'}</Text>
    },
    {
      key: 'team_name',
      title: 'Team',
      width: 12,
      render: (value: string) => <Text color="blue">{value}</Text>
    },
    {
      key: 'priority',
      title: 'Priority',
      width: 15,
      render: (value: number) => <PriorityBadge priority={value} />
    }
  ];

  return (
    <Box flexDirection="column" padding={2}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={2}>
        <Box>
          <Text color="cyan">{filter === 'me' ? icons.user : icons.issues} </Text>
          <Text color="cyan" bold>
            {filter === 'me' ? 'My Issues' : 'All Issues'}
          </Text>
          <Text color="gray"> ({issues.length})</Text>
        </Box>
        <Text color="gray" dimColor>
          {filter === 'me' ? 'Issues assigned to you' : 'All team issues'}
        </Text>
      </Box>

      {/* Quick Stats */}
      <Box marginBottom={2}>
        <Box marginRight={4}>
          <Text color="red">{icons.urgent} </Text>
          <Text color="red" bold>{urgentIssues.length}</Text>
          <Text color="gray"> urgent</Text>
        </Box>
        <Box marginRight={4}>
          <Text color="yellow">{icons.inProgress} </Text>
          <Text color="yellow" bold>{inProgressIssues.length}</Text>
          <Text color="gray"> in progress</Text>
        </Box>
        <Box marginRight={4}>
          <Text color="cyan">{icons.todo} </Text>
          <Text color="cyan" bold>{todoIssues.length}</Text>
          <Text color="gray"> todo</Text>
        </Box>
        <Box>
          <Text color="green">{icons.done} </Text>
          <Text color="green" bold>{doneIssues.length}</Text>
          <Text color="gray"> done</Text>
        </Box>
      </Box>

      <Divider char="─" color="gray" />

      {/* Issues Table */}
      {issues.length === 0 ? (
        <EmptyState 
          icon={filter === 'me' ? '🎉' : '📋'}
          title={filter === 'me' ? 'All caught up!' : 'No issues found'}
          description={filter === 'me' ? 'No issues assigned to you' : 'Try creating some issues'}
        />
      ) : (
        <>
          {/* Urgent Issues First */}
          {urgentIssues.length > 0 && (
            <Section title="🔥 Urgent Issues" icon={icons.fire}>
              <SimpleTable columns={columns} data={urgentIssues} />
            </Section>
          )}

          {/* In Progress Issues */}
          {inProgressIssues.length > 0 && (
            <Section title="🚀 In Progress" icon={icons.inProgress}>
              <SimpleTable columns={columns} data={inProgressIssues} />
            </Section>
          )}

          {/* Todo Issues */}
          {todoIssues.length > 0 && (
            <Section title="📋 To Do" icon={icons.todo}>
              <SimpleTable columns={columns} data={todoIssues} />
            </Section>
          )}

          {/* Recently Completed */}
          {doneIssues.length > 0 && (
            <Section title="✅ Recently Completed" icon={icons.done}>
              <SimpleTable columns={columns} data={doneIssues.slice(0, 5)} />
              {doneIssues.length > 5 && (
                <Box marginTop={1}>
                  <Text color="gray" dimColor>
                    ... and {doneIssues.length - 5} more completed issues
                  </Text>
                </Box>
              )}
            </Section>
          )}
        </>
      )}

      <Divider />

      {/* Help Text */}
      <Box flexDirection="column">
        <Text color="yellow" bold>{icons.info} Quick Actions</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">• </Text>
          <Text color="cyan">line issue LIN-123</Text>
          <Text color="gray"> - View issue details</Text>
        </Box>
        <Box flexDirection="column">
          <Text color="gray">• </Text>
          <Text color="cyan">line search "keyword"</Text>
          <Text color="gray"> - Search issues</Text>
        </Box>
        <Box flexDirection="column">
          <Text color="gray">• </Text>
          <Text color="cyan">line create</Text>
          <Text color="gray"> - Create new issue</Text>
        </Box>
      </Box>
    </Box>
  );
}