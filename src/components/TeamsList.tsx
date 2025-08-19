import { Box, Text, Newline } from 'ink';
import React, { useEffect, useState } from 'react';

interface Team {
  id: string;
  name: string;
  key: string;
  description: string;
}

export default function TeamsList() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - will integrate with backend APIs (Linear MCP, GitHub, etc.)
    setTimeout(() => {
      setTeams([
        { id: '1', name: 'Engineering', key: 'ENG', description: 'Product engineering team' },
        { id: '2', name: 'Product', key: 'PROD', description: 'Product management team' },
        { id: '3', name: 'Design', key: 'DES', description: 'Design and UX team' }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <Box>
        <Text color="cyan">Loading teams...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold>👥 Teams ({teams.length})</Text>
      <Newline />
      
      {teams.map((team) => (
        <Box key={team.id} marginBottom={1}>
          <Box width={8}>
            <Text color="blue" bold>{team.key}</Text>
          </Box>
          <Box width={20}>
            <Text bold>{team.name}</Text>
          </Box>
          <Box>
            <Text color="gray">{team.description}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}