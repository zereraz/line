import React, { useState, useEffect } from 'react';
import { Text, Box, Newline } from 'ink';
import Spinner from 'ink-spinner';
import { $ } from 'bun';

interface SetupProps {}

export default function Setup({}: SetupProps) {
  const [status, setStatus] = useState<'checking' | 'migrating' | 'complete' | 'error'>('checking');
  const [message, setMessage] = useState('Checking Claude Code MCP configuration...');
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
          setMessage('❌ Line CLI not found in PATH. Please install line first.');
          return;
        }

        // Step 2: Check for existing Linear MCP
        setMessage('Checking for existing Linear MCP server...');
        try {
          const mcpList = await $`claude mcp list`.text();
          setHasLinearMCP(mcpList.includes('linear-server'));
        } catch (error) {
          // claude command might not exist or no MCP servers configured
          setHasLinearMCP(false);
        }

        // Step 3: Migration
        setStatus('migrating');
        
        if (hasLinearMCP) {
          setMessage('🔄 Removing existing Linear MCP server...');
          try {
            await $`claude mcp remove linear-server`;
          } catch (error) {
            // Might already be removed or not exist
          }
        }

        setMessage('🚀 Adding line as Linear MCP server...');
        await $`claude mcp add linear-server -- ${foundLinePath} --mcp-server`;

        // Step 4: Verify setup
        setMessage('✅ Verifying setup...');
        const finalMcpList = await $`claude mcp list`.text();
        
        if (finalMcpList.includes('linear-server')) {
          setStatus('complete');
          setMessage('🎉 Successfully configured line as your Linear MCP server!');
        } else {
          setStatus('error');
          setMessage('❌ Setup verification failed. Please check Claude Code MCP configuration.');
        }

      } catch (error) {
        setStatus('error');
        setMessage(`❌ Setup failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    setup();
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">
        🔧 Line Claude Code MCP Setup
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
          <Text color="green" bold>✅ Setup Complete!</Text>
          <Newline />
          <Text>Claude Code will now use line's local SQLite cache for Linear data.</Text>
          <Newline />
          <Text color="blue">Next steps:</Text>
          <Text>• Run </Text>
          <Text color="cyan">line sync</Text>
          <Text> to populate your local cache</Text>
          <Text>• Use Claude Code with Linear MCP tools as usual</Text>
          <Text>• Enjoy faster, offline-capable Linear integration!</Text>
          <Newline />
          <Text color="gray">Note: line will automatically sync data when needed (5-minute cache for issues)</Text>
        </Box>
      )}

      {status === 'error' && (
        <Box flexDirection="column" marginTop={1}>
          <Newline />
          <Text color="red" bold>❌ Setup Failed</Text>
          <Newline />
          <Text>Manual setup instructions:</Text>
          <Text color="cyan">claude mcp remove linear-server</Text>
          <Text color="cyan">claude mcp add linear-server -- line --mcp-server</Text>
          <Newline />
          <Text color="gray">If you need help, check the documentation or create an issue.</Text>
        </Box>
      )}
    </Box>
  );
}