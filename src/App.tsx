import { Box, Text } from 'ink';
import React, { useEffect } from 'react';
import Dashboard from './components/Dashboard.tsx';
import IssuesList from './components/IssuesList.tsx';
import IssueDetails from './components/IssueDetails.tsx';
import CreateIssue from './components/CreateIssue.tsx';
import TeamsList from './components/TeamsList.tsx';
import ProjectsList from './components/ProjectsList.tsx';
import Setup from './commands/setup.tsx';
import Sync from './commands/sync.tsx';
import { 
  LineCreate, 
  LineList, 
  LineShow, 
  LineUpdate, 
  LineDelete, 
  LineMyTasks, 
  LineDepend, 
  LineStats 
} from './commands/lineCommands.tsx';
import { outputAsJson } from './utils/jsonOutput.ts';

interface AppProps {
  command: string;
  args: string[];
  jsonOutput?: boolean;
}

export default function App({ command, args, jsonOutput = false }: AppProps) {
  // Handle JSON output mode
  useEffect(() => {
    if (jsonOutput) {
      outputAsJson(command, args);
      return;
    }
  }, [command, args, jsonOutput]);

  // If JSON output is requested, don't render anything
  if (jsonOutput) {
    return null;
  }

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
    
    
    case 'setup':
      return <Setup />;
    
    case 'sync':
      return <Sync />;
    
    // Line native task management commands
    case 'line':
      const subCommand = args[0];
      const subArgs = args.slice(1);
      
      switch (subCommand) {
        case 'create':
          return <LineCreate args={subArgs} />;
        case 'list':
          return <LineList args={subArgs} />;
        case 'show':
          return <LineShow args={subArgs} />;
        case 'update':
          return <LineUpdate args={subArgs} />;
        case 'delete':
          return <LineDelete args={subArgs} />;
        case 'me':
          return <LineMyTasks args={subArgs} />;
        case 'depend':
          return <LineDepend args={subArgs} />;
        case 'stats':
          return <LineStats />;
        case undefined:
          return <LineList args={[]} />;
        default:
          return (
            <Box flexDirection="column">
              <Text color="red">Unknown line command: {subCommand}</Text>
              <Text>Available commands: create, list, show, update, delete, me, depend, stats</Text>
            </Box>
          );
      }
    
    default:
      return (
        <Box flexDirection="column">
          <Text color="red">Unknown command: {command}</Text>
          <Text>Run 'line --help' for available commands</Text>
        </Box>
      );
  }
}