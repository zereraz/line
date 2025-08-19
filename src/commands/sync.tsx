import React, { useState, useEffect } from 'react';
import { Text, Box, Newline } from 'ink';
import Spinner from 'ink-spinner';
import { linearService } from '../services/linear.ts';

interface SyncProps {}

export default function Sync({}: SyncProps) {
  const [status, setStatus] = useState<'checking' | 'syncing' | 'complete' | 'error'>('checking');
  const [message, setMessage] = useState('Checking data source configuration...');
  const [dataSource, setDataSource] = useState<string>('');

  useEffect(() => {
    async function sync() {
      try {
        setDataSource('cache');

        // Start sync
        setStatus('syncing');
        setMessage('Syncing all data from configured backend...');
        
        await Promise.all([
          linearService.getIssues(true),
          linearService.getTeams(true),
          linearService.getProjects(true)
        ]);

        setStatus('complete');
        setMessage('✓ Successfully synced all data from backend!');
      } catch (error) {
        setStatus('error');
        setMessage(`✗ Sync failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    sync();
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">
Line Data Sync
      </Text>
      <Newline />
      
      <Box>
        {status === 'checking' || status === 'syncing' ? (
          <Text color="yellow">
            <Spinner type="dots" /> {message}
          </Text>
        ) : status === 'complete' ? (
          <Text color="green">{message}</Text>
        ) : (
          <Text color="red">{message}</Text>
        )}
      </Box>

      {dataSource && (
        <Box marginTop={1}>
          <Text color="gray">Data source: {dataSource.toUpperCase()}</Text>
        </Box>
      )}

      {status === 'complete' && (
        <Box flexDirection="column" marginTop={1}>
          <Newline />
          <Text color="green" bold>✓ Sync Complete!</Text>
          <Newline />
          <Text>Your local cache has been updated with the latest data from your backend.</Text>
          <Newline />
          <Text color="blue">Data synced:</Text>
          <Text>• Issues (with status, assignees, teams)</Text>
          <Text>• Teams and team information</Text>
          <Text>• Projects and project status</Text>
          <Newline />
          <Text color="gray">Note: Line automatically syncs when needed (5-minute cache for issues)</Text>
        </Box>
      )}

      {status === 'error' && (
        <Box flexDirection="column" marginTop={1}>
          <Newline />
          <Text color="red" bold>✗ Sync Failed</Text>
          <Newline />
          <Text>To sync data, ensure you have a backend configured (Linear MCP, GitHub, etc.).</Text>
        </Box>
      )}
    </Box>
  );
}