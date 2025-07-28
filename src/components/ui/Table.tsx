import React from 'react';
import { Box, Text } from 'ink';

interface Column {
  key: string;
  title: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableProps {
  columns: Column[];
  data: any[];
  showBorder?: boolean;
  headerColor?: string;
  stripedRows?: boolean;
}

export function Table({ 
  columns, 
  data, 
  showBorder = true, 
  headerColor = 'cyan',
  stripedRows = true 
}: TableProps) {
  const maxWidth = columns.reduce((sum, col) => sum + (col.width || 20), 0);
  
  return (
    <Box flexDirection="column">
      {/* Top border */}
      {showBorder && (
        <Box>
          <Text color="gray">┌{'─'.repeat(maxWidth - 2)}┐</Text>
        </Box>
      )}
      
      {/* Header */}
      <Box>
        {showBorder && <Text color="gray">│</Text>}
        {columns.map((col, index) => (
          <Box key={col.key} width={col.width || 20}>
            <Text 
              color={headerColor} 
              bold
              wrap="truncate"
            >
              {col.align === 'center' 
                ? col.title.padStart((col.title.length + (col.width || 20)) / 2).padEnd(col.width || 20)
                : col.align === 'right'
                ? col.title.padStart(col.width || 20)
                : col.title.padEnd(col.width || 20)
              }
            </Text>
          </Box>
        ))}
        {showBorder && <Text color="gray">│</Text>}
      </Box>
      
      {/* Header separator */}
      {showBorder && (
        <Box>
          <Text color="gray">├{'─'.repeat(maxWidth - 2)}┤</Text>
        </Box>
      )}
      
      {/* Data rows */}
      {data.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {showBorder && <Text color="gray">│</Text>}
          {columns.map((col) => (
            <Box key={col.key} width={col.width || 20}>
              <Text wrap="truncate">
                {col.render 
                  ? col.render(row[col.key], row)
                  : String(row[col.key] || '').padEnd(col.width || 20)
                }
              </Text>
            </Box>
          ))}
          {showBorder && <Text color="gray">│</Text>}
        </Box>
      ))}
      
      {/* Bottom border */}
      {showBorder && (
        <Box>
          <Text color="gray">└{'─'.repeat(maxWidth - 2)}┘</Text>
        </Box>
      )}
    </Box>
  );
}

// Simpler table without borders for cleaner look
export function SimpleTable({ columns, data }: { columns: Column[]; data: any[] }) {
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        {columns.map((col) => (
          <Box key={col.key} width={col.width || 20}>
            <Text color="gray" bold dimColor>
              {col.title.toUpperCase()}
            </Text>
          </Box>
        ))}
      </Box>
      
      {/* Data rows */}
      {data.map((row, rowIndex) => (
        <Box key={rowIndex} marginBottom={1}>
          {columns.map((col) => (
            <Box key={col.key} width={col.width || 20}>
              {col.render ? col.render(row[col.key], row) : (
                <Text>{String(row[col.key] || '')}</Text>
              )}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

// Card-style layout for mobile-friendly view
export function CardTable({ data, renderCard }: { 
  data: any[]; 
  renderCard: (item: any, index: number) => React.ReactNode;
}) {
  return (
    <Box flexDirection="column">
      {data.map((item, index) => (
        <Box 
          key={index} 
          flexDirection="column" 
          borderStyle="round" 
          borderColor="gray"
          padding={1}
          marginBottom={1}
        >
          {renderCard(item, index)}
        </Box>
      ))}
    </Box>
  );
}