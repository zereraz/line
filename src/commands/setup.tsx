import React, { useState, useEffect } from 'react';
import { Text, Box, Newline } from 'ink';
import Spinner from 'ink-spinner';
import { $ } from 'bun';

interface SetupProps {}

export default function Setup({}: SetupProps) {
  const [status, setStatus] = useState<'checking' | 'migrating' | 'complete' | 'error'>('checking');
  const [message, setMessage] = useState('Checking backend integration configuration...');
  const [hasLinearMCP, setHasLinearMCP] = useState(false);
  const [linePath, setLinePath] = useState<string>('');

  useEffect(() => {
    async function setup() {
      try {
        // Step 1: Find line binary path
        setMessage('Finding line binary location...');
        const linePathResult = await $`which line`.text();
        const foundLinePath = linePathResult.trim();
        setLinePath(foundLinePath);
        
        if (!foundLinePath) {
          setStatus('error');
          setMessage('✗ Line CLI not found in PATH. Please install line first.');
          return;
        }

        // Step 2: Check for existing MCP servers that might conflict
        setMessage('Checking for existing MCP server configurations...');
        try {
          const mcpList = await $`claude mcp list`.text();
          setHasLinearMCP(mcpList.includes('linear-server') || mcpList.includes('line-server'));
        } catch (error) {
          // claude command might not exist or no MCP servers configured
          setHasLinearMCP(false);
        }

        // Step 3: Migration
        setStatus('migrating');
        
        if (hasLinearMCP) {
          setMessage('Removing existing conflicting MCP servers...');
          try {
            // Remove both possible conflicting entries
            await $`claude mcp remove linear-server`;
          } catch (error) {
            // Might already be removed or not exist
          }
          try {
            await $`claude mcp remove line-server`;
          } catch (error) {
            // Might already be removed or not exist
          }
        }

        setMessage('Configuring Line CLI as MCP server...');
        await $`claude mcp add line-cli -- ${foundLinePath} --mcp-server`;

        // Step 4: Add permissions for Line CLI tools
        setMessage('Adding tool permissions...');
        const permissions = [
          'mcp__line-server__list_issues',
          'mcp__line-server__get_issue', 
          'mcp__line-server__list_my_issues',
          'mcp__line-server__list_teams',
          'mcp__line-server__get_team',
          'mcp__line-server__list_projects',
          'mcp__line-server__get_project',
          'mcp__line-server__search_issues',
          'mcp__line-server__advanced_search',
          'mcp__line-server__search_suggestions',
          'mcp__line-server__list_comments',
          'mcp__line-server__get_comment',
          'mcp__line-server__add_comment',
          'mcp__line-server__create_task',
          'mcp__line-server__update_task',
          'mcp__line-server__get_task',
          'mcp__line-server__delete_task',
          'mcp__line-server__list_tasks',
          'mcp__line-server__assign_task',
          'mcp__line-server__set_priority',
          'mcp__line-server__add_dependency'
        ];
        
        for (const permission of permissions) {
          try {
            await $`claude mcp allow ${permission}`;
          } catch (error) {
            // Permission might already exist or command might fail
          }
        }
        
        // Step 5: Verify setup
        setMessage('Verifying setup...');
        const finalMcpList = await $`claude mcp list`.text();
        
        if (finalMcpList.includes('line-cli')) {
          setStatus('complete');
          setMessage('✓ Successfully configured Line CLI as MCP server!');
        } else {
          setStatus('error');
          setMessage('✗ Setup verification failed. Please check Claude Code MCP configuration.');
        }

      } catch (error) {
        setStatus('error');
        setMessage(`✗ Setup failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    setup();
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">
Line Backend Integration Setup
      </Text>
      <Newline />
      
      <Box>
        {status === 'checking' || status === 'migrating' ? (
          <Text color="yellow">
            <Spinner type="dots" /> {message}
          </Text>
        ) : status === 'complete' ? (
          <Text color="green">{message}</Text>
        ) : (
          <Text color="red">{message}</Text>
        )}
      </Box>

      {linePath && (
        <Box marginTop={1}>
          <Text color="gray">Using line binary: {linePath}</Text>
        </Box>
      )}

      {status === 'complete' && (
        <Box flexDirection="column" marginTop={1}>
          <Newline />
          <Text color="green" bold>✓ Setup Complete!</Text>
          <Newline />
          <Text>AI tools can now use line's unified interface with your configured backends.</Text>
          <Newline />
          <Text color="blue">Next steps:</Text>
          <Text>• Run </Text>
          <Text color="cyan">line sync</Text>
          <Text> to populate your local cache</Text>
          <Text>• Use AI assistants with integrated backend tools</Text>
          <Text>• Enjoy faster, offline-capable project management!</Text>
          <Newline />
          <Text color="gray">Note: line will automatically sync data when needed (5-minute cache for issues)</Text>
        </Box>
      )}

      {status === 'error' && (
        <Box flexDirection="column" marginTop={1}>
          <Newline />
          <Text color="red" bold>✗ Setup Failed</Text>
          <Newline />
          <Text>Manual setup instructions:</Text>
          <Text color="cyan">claude mcp remove linear-server</Text>
          <Text color="cyan">claude mcp remove line-server</Text>
          <Text color="cyan">claude mcp add line-cli -- line --mcp-server</Text>
          <Newline />
          <Text color="gray">If you need help, check the documentation or create an issue.</Text>
        </Box>
      )}
    </Box>
  );
}