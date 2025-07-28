import { Box, Text } from 'ink';
import React from 'react';
import Dashboard from './components/Dashboard.tsx';
import IssuesList from './components/IssuesList.tsx';
import IssueDetails from './components/IssueDetails.tsx';
import CreateIssue from './components/CreateIssue.tsx';
import TeamsList from './components/TeamsList.tsx';
import ProjectsList from './components/ProjectsList.tsx';
import SearchResults from './components/SearchResults.tsx';
import Setup from './commands/setup.tsx';
import Sync from './commands/sync.tsx';

interface AppProps {
  command: string;
  args: string[];
}

export default function App({ command, args }: AppProps) {
  switch (command) {
    case 'dashboard':
    case 'dash':
      return <Dashboard />;
    
    case 'issues':
      return <IssuesList />;
    
    case 'issue':
      if (!args[0]) {
        return (
          <Box>
            <Text color="red">Error: Issue ID required</Text>
          </Box>
        );
      }
      return <IssueDetails issueId={args[0]} />;
    
    case 'create':
      return <CreateIssue />;
    
    case 'teams':
      return <TeamsList />;
    
    case 'projects':
      return <ProjectsList />;
    
    case 'me':
      return <IssuesList filter="me" />;
    
    case 'search':
      if (!args[0]) {
        return (
          <Box>
            <Text color="red">Error: Search query required</Text>
          </Box>
        );
      }
      return <SearchResults query={args[0]} />;
    
    case 'setup':
      return <Setup />;
    
    case 'sync':
      return <Sync />;
    
    default:
      return (
        <Box flexDirection="column">
          <Text color="red">Unknown command: {command}</Text>
          <Text>Run 'line --help' for available commands</Text>
        </Box>
      );
  }
}