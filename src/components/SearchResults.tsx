import { Box, Text, Newline } from 'ink';
import React from 'react';

interface SearchResultsProps {
  query: string;
}

export default function SearchResults({ query }: SearchResultsProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold>🔍 Search Results for "{query}"</Text>
      <Newline />
      <Text color="yellow">Search feature coming soon! Will integrate with Linear MCP search functionality.</Text>
    </Box>
  );
}