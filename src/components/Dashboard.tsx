import { Box, Text, Newline } from 'ink';
import React, { useEffect, useState } from 'react';
import { linearService } from '../services/linear.ts';
import type { Issue } from '../utils/database.ts';
import { Header, Section, Card, StatusIndicator, PriorityBadge, LoadingSpinner, EmptyState, Divider, icons } from './ui/Theme.tsx';
import { CardTable } from './ui/Table.tsx';

export default function Dashboard() {
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    linearService.getMyIssues().then((issues) => {
      setMyIssues(issues);
      setLoading(false);
    }).catch((error) => {
      console.error('Failed to load issues:', error);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Box padding={2}>
        <LoadingSpinner text="Loading your dashboard..." />
      </Box>
    );
  }

  const urgentIssues = myIssues.filter(issue => issue.priority === 1);
  const inProgressIssues = myIssues.filter(issue => issue.state_name === 'In Progress');
  const todoIssues = myIssues.filter(issue => issue.state_name === 'Todo');

  return (
    <Box flexDirection="column" padding={2}>
      {/* Welcome Header */}
      <Box flexDirection="column" marginBottom={2}>
        <Box flexDirection="column">
          <Text color="cyan" bold>
{`┬  ┬┌┐┌┌─┐
│  ││││├┤ 
┴─┘┴┘└┘└─┘`}
          </Text>
          <Text color="cyan" bold>DASHBOARD</Text>
        </Box>
        <Text color="gray" dimColor>Personal Linear command center</Text>
      </Box>

      <Divider char="─" color="gray" />

      {/* Quick Stats */}
      <Box marginBottom={2}>
        <Box marginRight={4}>
          <Text color="blue" bold>{myIssues.length}</Text>
          <Text color="gray"> total</Text>
        </Box>
        <Box marginRight={4}>
          <Text color="red" bold>{urgentIssues.length}</Text>
          <Text color="gray"> urgent</Text>
        </Box>
        <Box marginRight={4}>
          <Text color="yellow" bold>{inProgressIssues.length}</Text>
          <Text color="gray"> active</Text>
        </Box>
        <Box>
          <Text color="cyan" bold>{todoIssues.length}</Text>
          <Text color="gray"> pending</Text>
        </Box>
      </Box>

      {/* Urgent Issues Section */}
      {urgentIssues.length > 0 && (
        <Section title="URGENT ISSUES">
          <CardTable 
            data={urgentIssues}
            renderCard={(issue) => (
              <Box flexDirection="column">
                <Box marginBottom={1}>
                  <Text color="red" bold>{issue.id}</Text>
                  <Text color="gray"> • </Text>
                  <Text bold>{issue.title}</Text>
                </Box>
                <Box>
                  <StatusIndicator status={issue.state_name} />
                  <Text color="gray"> • </Text>
                  <Text color="blue">{issue.team_name}</Text>
                </Box>
              </Box>
            )}
          />
        </Section>
      )}

      {/* My Active Work */}
      <Section title="MY ACTIVE WORK">
        {myIssues.length === 0 ? (
          <EmptyState 
            icon="🎉"
            title="All caught up!"
            description="No issues assigned to you right now"
          />
        ) : (
          <CardTable 
            data={myIssues.slice(0, 5)} // Show top 5
            renderCard={(issue) => (
              <Box flexDirection="column">
                <Box marginBottom={1}>
                  <Text color="cyan" bold>{issue.id}</Text>
                  <Text> • </Text>
                  <Text>{issue.title}</Text>
                </Box>
                <Box>
                  <StatusIndicator status={issue.state_name} />
                  <Text> • </Text>
                  <PriorityBadge priority={issue.priority} />
                  <Text> • </Text>
                  <Text color="blue">{issue.team_name}</Text>
                </Box>
              </Box>
            )}
          />
        )}
      </Section>

      {myIssues.length > 5 && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            ... and {myIssues.length - 5} more issues
          </Text>
        </Box>
      )}

      <Divider />

      {/* Quick Actions */}
      <Box flexDirection="column">
        <Text color="yellow" bold>{icons.lightning} Quick Actions</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">• </Text>
          <Text color="cyan">line issues</Text>
          <Text color="gray"> - View all issues</Text>
        </Box>
        <Box flexDirection="column">
          <Text color="gray">• </Text>
          <Text color="cyan">line search "keyword"</Text>
          <Text color="gray"> - Search issues</Text>
        </Box>
        <Box flexDirection="column">
          <Text color="gray">• </Text>
          <Text color="cyan">line teams</Text>
          <Text color="gray"> - View team structure</Text>
        </Box>
      </Box>
    </Box>
  );
}