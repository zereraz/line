import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { linearService } from '../services/linear.ts';
import type { Issue } from '../utils/database.ts';
import { Header, Section, Card, StatusIndicator, PriorityBadge, LoadingSpinner, Divider, icons, LabelsGroup } from './ui/Theme.tsx';
import Comments from './Comments.tsx';

interface IssueDetailsProps {
  issueId: string;
}

export default function IssueDetails({ issueId }: IssueDetailsProps) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    linearService.getIssue(issueId).then((loadedIssue) => {
      setIssue(loadedIssue);
      setLoading(false);
    }).catch((error) => {
      console.error('Failed to load issue:', error);
      setLoading(false);
    });
  }, [issueId]);

  if (loading) {
    return (
      <Box padding={2}>
        <LoadingSpinner text={`Loading issue ${issueId}...`} />
      </Box>
    );
  }

  if (!issue) {
    return (
      <Box padding={2}>
        <Box flexDirection="column" alignItems="center" justifyContent="center" minHeight={10}>
          <Text color="red">{icons.error} Issue Not Found</Text>
          <Text color="gray">Issue {issueId} could not be found</Text>
          <Box marginTop={2}>
            <Text color="cyan">Try: </Text>
            <Text color="cyan">line issues</Text>
            <Text color="gray"> to see all issues</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box flexDirection="column" padding={2}>
      {/* Issue Header */}
      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text color="cyan" bold>{issue.id}</Text>
          <Text color="gray"> • </Text>
          <PriorityBadge priority={issue.priority} />
        </Box>
        <Text bold>{issue.title}</Text>
        <Box marginTop={1}>
          <StatusIndicator status={issue.state_name} />
          <Text color="gray"> • </Text>
          <Text color="blue">{issue.team_name}</Text>
          <Text color="gray"> • </Text>
          <Text color="magenta">{issue.assignee_name || 'Unassigned'}</Text>
        </Box>
        {issue.labels && issue.labels.length > 0 && (
          <Box marginTop={1}>
            <LabelsGroup labels={issue.labels} maxDisplay={6} />
          </Box>
        )}
      </Box>

      <Divider char="═" color="cyan" />

      {/* Issue Details Card */}
      <Card>
        <Box flexDirection="column">
          {/* Metadata Grid */}
          <Box marginBottom={2}>
            <Box flexDirection="column" marginRight={4} width={30}>
              <Text color="yellow" bold>{icons.info} Details</Text>
              <Box marginTop={1} flexDirection="column">
                <Box marginBottom={1}>
                  <Text color="gray">Created: </Text>
                  <Text>{formatDate(issue.created_at)}</Text>
                </Box>
                <Box marginBottom={1}>
                  <Text color="gray">Updated: </Text>
                  <Text>{formatDate(issue.updated_at)}</Text>
                </Box>
                <Box>
                  <Text color="gray">ID: </Text>
                  <Text color="cyan">{issue.id}</Text>
                </Box>
              </Box>
            </Box>

            <Box flexDirection="column" width={30}>
              <Text color="yellow" bold>{icons.user} Assignment</Text>
              <Box marginTop={1} flexDirection="column">
                <Box marginBottom={1}>
                  <Text color="gray">Assignee: </Text>
                  <Text color="magenta">{issue.assignee_name || 'Unassigned'}</Text>
                </Box>
                <Box marginBottom={1}>
                  <Text color="gray">Team: </Text>
                  <Text color="blue">{issue.team_name}</Text>
                </Box>
                <Box>
                  <Text color="gray">Status: </Text>
                  <StatusIndicator status={issue.state_name} />
                </Box>
              </Box>
            </Box>
          </Box>

          <Divider char="─" color="gray" />

          {/* Description */}
          <Section title="📝 Description" icon={icons.info}>
            {issue.description ? (
              <Box 
                flexDirection="column" 
                borderStyle="round" 
                borderColor="gray"
                padding={1}
              >
                <Text>{issue.description}</Text>
              </Box>
            ) : (
              <Box>
                <Text color="gray" italic>No description provided</Text>
              </Box>
            )}
          </Section>
        </Box>
      </Card>

      <Divider />

      {/* Comments Section */}
      <Comments issueId={issue.id} />

      <Divider />

      {/* Quick Actions */}
      <Box flexDirection="column">
        <Text color="yellow" bold>{icons.lightning} Quick Actions</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="gray">• </Text>
          <Text color="cyan">line issues</Text>
          <Text color="gray"> - Back to issues list</Text>
        </Box>
        <Box flexDirection="column">
          <Text color="gray">• </Text>
          <Text color="cyan">line search "{issue.team_name}"</Text>
          <Text color="gray"> - Find similar issues</Text>
        </Box>
        <Box flexDirection="column">
          <Text color="gray">• </Text>
          <Text color="cyan">line me</Text>
          <Text color="gray"> - View my assigned issues</Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={2} justifyContent="center">
        <Text color="gray" dimColor>
          {icons.sparkle} Line CLI • Universal project management
        </Text>
      </Box>
    </Box>
  );
}