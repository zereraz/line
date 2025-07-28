import { Box, Text, Newline } from 'ink';
import React, { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
  status: string;
  team: { name: string };
}

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - will replace with Linear MCP list_projects call
    setTimeout(() => {
      setProjects([
        { id: '1', name: 'Mobile App Redesign', status: 'In Progress', team: { name: 'Design' } },
        { id: '2', name: 'API v2', status: 'Planning', team: { name: 'Engineering' } },
        { id: '3', name: 'User Onboarding', status: 'Completed', team: { name: 'Product' } }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <Box>
        <Text color="cyan">Loading projects...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold>📁 Projects ({projects.length})</Text>
      <Newline />
      
      {projects.map((project) => (
        <Box key={project.id} marginBottom={1}>
          <Box width={30}>
            <Text bold>{project.name}</Text>
          </Box>
          <Box width={15}>
            <Text color="green">{project.status}</Text>
          </Box>
          <Box>
            <Text color="blue">{project.team.name}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
}