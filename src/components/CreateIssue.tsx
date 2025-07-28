import { Box, Text } from 'ink';
import React from 'react';

export default function CreateIssue() {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold>🆕 Create New Issue</Text>
      <Box marginTop={1}>
        <Text color="yellow">Feature coming soon! Will integrate with Linear MCP create_issue command.</Text>
      </Box>
    </Box>
  );
}