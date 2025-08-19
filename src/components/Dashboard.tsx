import { Box, Text, Newline } from 'ink';
import React, { useEffect, useState } from 'react';
import { linearService } from '../services/linear.ts';
import type { Issue } from '../utils/database.ts';
import { Header, Section, Card, StatusIndicator, PriorityBadge, LoadingSpinner, EmptyState, Divider, icons, ProgressBar, InfoPanel, StatusBar, MetricDisplay, BtopDivider } from './ui/Theme.tsx';
import { CardTable, DataGrid } from './ui/Table.tsx';

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
  const doneIssues = myIssues.filter(issue => issue.state_name === 'Done');
  
  // Calculate workload metrics
  const totalIssues = myIssues.length;
  const completionRate = totalIssues > 0 ? (doneIssues.length / totalIssues) * 100 : 0;
  const workloadDistribution = {
    urgent: urgentIssues.length,
    high: myIssues.filter(issue => issue.priority === 2).length,
    normal: myIssues.filter(issue => issue.priority === 3).length,
    low: myIssues.filter(issue => issue.priority === 4).length
  };

  return (
    <Box flexDirection="column" padding={1} width="100%">
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
        <Text color="gray" dimColor>Universal project management command center</Text>
      </Box>

      <BtopDivider title="SYSTEM OVERVIEW" style="double" color="cyan" />

      {/* Enhanced Metrics Display */}
      <Box flexDirection="column" marginBottom={2}>
        {/* Top row - Key metrics */}
        <Box marginBottom={2}>
          <MetricDisplay 
            label="TOTAL ISSUES" 
            value={myIssues.length} 
            icon={icons.dashboard}
            variant="default"
          />
          <MetricDisplay 
            label="COMPLETION" 
            value={completionRate.toFixed(1)} 
            unit="%"
            progress={completionRate}
            icon={icons.success}
            variant="cpu"
          />
          <MetricDisplay 
            label="IN PROGRESS" 
            value={inProgressIssues.length} 
            icon={icons.inProgress}
            variant="memory"
          />
          <MetricDisplay 
            label="URGENT" 
            value={urgentIssues.length} 
            icon={icons.urgent}
            variant="network"
          />
        </Box>
        
        {/* Progress bars for workload distribution */}
        <InfoPanel title="WORKLOAD DISTRIBUTION" variant="primary" icon={icons.dashboard}>
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color="gray">Urgent: </Text>
              <ProgressBar 
                value={workloadDistribution.urgent} 
                max={Math.max(totalIssues, 1)} 
                width={15} 
                variant="cpu"
              />
            </Box>
            <Box marginBottom={1}>
              <Text color="gray">High:   </Text>
              <ProgressBar 
                value={workloadDistribution.high} 
                max={Math.max(totalIssues, 1)} 
                width={15} 
                variant="memory"
              />
            </Box>
            <Box marginBottom={1}>
              <Text color="gray">Normal: </Text>
              <ProgressBar 
                value={workloadDistribution.normal} 
                max={Math.max(totalIssues, 1)} 
                width={15} 
                variant="network"
              />
            </Box>
            <Box>
              <Text color="gray">Low:    </Text>
              <ProgressBar 
                value={workloadDistribution.low} 
                max={Math.max(totalIssues, 1)} 
                width={15} 
                variant="default"
              />
            </Box>
          </Box>
        </InfoPanel>
      </Box>

      {/* Urgent Issues Section - Enhanced */}
      {urgentIssues.length > 0 && (
        <InfoPanel title="CRITICAL ISSUES" variant="error" icon={icons.urgent}>
          <CardTable 
            data={urgentIssues}
            variant="highlight"
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
                  <Text color="gray"> • </Text>
                  <ProgressBar value={25} width={8} variant="cpu" showPercentage={false} />
                </Box>
              </Box>
            )}
          />
        </InfoPanel>
      )}

      {/* My Active Work - Enhanced */}
      <InfoPanel title="ACTIVE WORK" variant="primary" icon={icons.lightning}>
        {myIssues.length === 0 ? (
          <EmptyState 
            icon={icons.success}
            title="All caught up!"
            description="No issues assigned to you right now"
          />
        ) : (
          <Box flexDirection="column">
            {/* Status bar */}
            <StatusBar 
              items={[
                { label: 'Active', value: inProgressIssues.length, color: 'yellow', icon: icons.inProgress },
                { label: 'Pending', value: todoIssues.length, color: 'cyan', icon: icons.todo },
                { label: 'Done Today', value: doneIssues.length, color: 'green', icon: icons.done }
              ]}
            />
            
            <Box marginY={1}>
              <Text color="gray">{icons.boxHorizontal.repeat(60)}</Text>
            </Box>
            
            <CardTable 
              data={myIssues.slice(0, 5)} // Show top 5
              variant="compact"
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
                    <Text> • </Text>
                    {/* Add progress visualization */}
                    <ProgressBar 
                      value={issue.state_name === 'Done' ? 100 : issue.state_name === 'In Progress' ? 60 : 20} 
                      width={8} 
                      variant="default" 
                      showPercentage={false}
                    />
                  </Box>
                </Box>
              )}
            />
          </Box>
        )}
      </InfoPanel>

      {myIssues.length > 5 && (
        <Box marginTop={1}>
          <Text color="cyan">{icons.dashboard} </Text>
          <Text color="gray" dimColor>
            ... and {myIssues.length - 5} more issues
          </Text>
        </Box>
      )}

      <BtopDivider title="QUICK ACTIONS" color="yellow" />

      {/* Enhanced Quick Actions */}
      <DataGrid 
        data={[
          { label: 'View Issues', value: 'line issues', color: 'cyan', icon: icons.issues },
          { label: 'Search', value: 'line search "keyword"', color: 'magenta', icon: icons.search },
          { label: 'Teams', value: 'line teams', color: 'blue', icon: icons.teams },
          { label: 'Projects', value: 'line projects', color: 'green', icon: icons.projects }
        ]}
        columns={2}
      />
    </Box>
  );
}