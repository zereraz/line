import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { icons } from './ui/Theme.tsx';
import Dashboard from './Dashboard.tsx';
import IssuesList from './IssuesList.tsx';
import IssueDetails from './IssueDetails.tsx';
import TeamsList from './TeamsList.tsx';
import ProjectsList from './ProjectsList.tsx';
import SearchResults from './SearchResults.tsx';

type View = 
  | { type: 'dashboard' }
  | { type: 'issues'; filter?: 'me' | 'all' }
  | { type: 'issue'; id: string }
  | { type: 'teams' }
  | { type: 'projects' }
  | { type: 'search'; query: string }
  | { type: 'menu' };

interface MenuItem {
  key: string;
  label: string;
  description: string;
  action: () => void;
}

export default function InteractiveMode() {
  const [currentView, setCurrentView] = useState<View>({ type: 'dashboard' });
  const [searchInput, setSearchInput] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [isIssueMode, setIsIssueMode] = useState(false);

  const menuItems: MenuItem[] = [
    {
      key: '1',
      label: 'Dashboard',
      description: 'View your personal dashboard',
      action: () => setCurrentView({ type: 'dashboard' })
    },
    {
      key: '2',
      label: 'All Issues',
      description: 'List all team issues',
      action: () => setCurrentView({ type: 'issues', filter: 'all' })
    },
    {
      key: '3',
      label: 'My Issues',
      description: 'Show issues assigned to you',
      action: () => setCurrentView({ type: 'issues', filter: 'me' })
    },
    {
      key: '4',
      label: 'Teams',
      description: 'View team structure',
      action: () => setCurrentView({ type: 'teams' })
    },
    {
      key: '5',
      label: 'Projects',
      description: 'List all projects',
      action: () => setCurrentView({ type: 'projects' })
    },
    {
      key: 's',
      label: 'Search',
      description: 'Search issues by keyword',
      action: () => {
        setIsSearchMode(true);
        setSearchInput('');
      }
    },
    {
      key: 'i',
      label: 'Issue Details',
      description: 'View specific issue by ID',
      action: () => {
        setIsIssueMode(true);
        setSelectedIssueId('');
      }
    }
  ];

  useInput((input, key) => {
    // Handle search mode
    if (isSearchMode) {
      if (key.return) {
        if (searchInput.trim()) {
          setCurrentView({ type: 'search', query: searchInput.trim() });
        }
        setIsSearchMode(false);
        setSearchInput('');
      } else if (key.escape) {
        setIsSearchMode(false);
        setSearchInput('');
      } else if (key.backspace) {
        setSearchInput(prev => prev.slice(0, -1));
      } else if (input && input.length === 1) {
        setSearchInput(prev => prev + input);
      }
      return;
    }

    // Handle issue ID input mode
    if (isIssueMode) {
      if (key.return) {
        if (selectedIssueId.trim()) {
          setCurrentView({ type: 'issue', id: selectedIssueId.trim() });
        }
        setIsIssueMode(false);
        setSelectedIssueId('');
      } else if (key.escape) {
        setIsIssueMode(false);
        setSelectedIssueId('');
      } else if (key.backspace) {
        setSelectedIssueId(prev => prev.slice(0, -1));
      } else if (input && (input.match(/[a-zA-Z0-9-]/))) {
        setSelectedIssueId(prev => prev + input);
      }
      return;
    }

    // Handle main navigation
    if (key.escape || input === 'm') {
      setCurrentView({ type: 'menu' });
    } else if (input === 'q' && key.ctrl) {
      process.exit(0);
    } else if (currentView.type !== 'menu') {
      // Quick navigation from any view
      const menuItem = menuItems.find(item => item.key === input);
      if (menuItem) {
        menuItem.action();
      }
    } else {
      // Menu selection
      const menuItem = menuItems.find(item => item.key === input);
      if (menuItem) {
        menuItem.action();
      }
    }
  });

  const renderView = () => {
    switch (currentView.type) {
      case 'dashboard':
        return <Dashboard />;
      case 'issues':
        return <IssuesList filter={currentView.filter} />;
      case 'issue':
        return <IssueDetails issueId={currentView.id} />;
      case 'teams':
        return <TeamsList />;
      case 'projects':
        return <ProjectsList />;
      case 'search':
        return <SearchResults query={currentView.query} />;
      case 'menu':
        return renderMenu();
      default:
        return <Dashboard />;
    }
  };

  const renderMenu = () => (
    <Box flexDirection="column" padding={2}>
      {/* Header */}
      <Box marginBottom={2}>
        <Text color="cyan" bold>LINE INTERACTIVE MODE</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray">Select an option:</Text>
      </Box>

      {/* Menu Items */}
      {menuItems.map((item) => (
        <Box key={item.key} marginBottom={1}>
          <Box width={4}>
            <Text color="cyan" bold>[{item.key}]</Text>
          </Box>
          <Box width={15}>
            <Text bold>{item.label}</Text>
          </Box>
          <Box>
            <Text color="gray">{item.description}</Text>
          </Box>
        </Box>
      ))}

      <Box marginTop={2} marginBottom={1}>
        <Text color="yellow">Navigation:</Text>
      </Box>
      
      <Box flexDirection="column">
        <Text color="gray">• Press any number/letter to select option</Text>
        <Text color="gray">• Press 'm' or ESC to return to menu</Text>
        <Text color="gray">• Press Ctrl+C to quit</Text>
      </Box>
    </Box>
  );

  const renderStatusBar = () => {
    const getViewTitle = () => {
      switch (currentView.type) {
        case 'dashboard': return 'Dashboard';
        case 'issues': return currentView.filter === 'me' ? 'My Issues' : 'All Issues';
        case 'issue': return `Issue ${currentView.id}`;
        case 'teams': return 'Teams';
        case 'projects': return 'Projects';
        case 'search': return `Search: ${currentView.query}`;
        case 'menu': return 'Main Menu';
        default: return 'Line CLI';
      }
    };

    return (
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Box>
          <Text color="cyan" bold>Line</Text>
          <Text color="gray"> | </Text>
          <Text>{getViewTitle()}</Text>
        </Box>
        <Box marginLeft="auto">
          <Text color="gray">Press 'm' for menu | Ctrl+C to quit</Text>
        </Box>
      </Box>
    );
  };

  const renderInputPrompt = () => {
    if (isSearchMode) {
      return (
        <Box borderStyle="single" borderColor="yellow" paddingX={1}>
          <Text color="yellow">Search: </Text>
          <Text>{searchInput}</Text>
          <Text color="gray"> (Enter to search, ESC to cancel)</Text>
        </Box>
      );
    }

    if (isIssueMode) {
      return (
        <Box borderStyle="single" borderColor="blue" paddingX={1}>
          <Text color="blue">Issue ID: </Text>
          <Text>{selectedIssueId}</Text>
          <Text color="gray"> (Enter to view, ESC to cancel)</Text>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Status Bar */}
      {renderStatusBar()}
      
      {/* Main Content */}
      <Box flexGrow={1}>
        {renderView()}
      </Box>
      
      {/* Input Prompt */}
      {renderInputPrompt()}
    </Box>
  );
}