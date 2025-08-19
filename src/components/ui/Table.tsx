import React from 'react';
import { Box, Text, useStdout, useInput, useFocus } from 'ink';
import { icons } from './Theme.tsx';

interface Column {
  key: string;
  title: string;
  width?: number | string; // Support '20%', '100px', etc.
  flexGrow?: number;
  flexShrink?: number;
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
      {/* Top border - enhanced btop style */}
      {showBorder && (
        <Box>
          <Text color={headerColor}>
            {icons.boxTopLeft}{icons.boxHorizontal.repeat(maxWidth - 2)}{icons.boxTopRight}
          </Text>
        </Box>
      )}
      
      {/* Header */}
      <Box>
        {showBorder && <Text color={headerColor}>{icons.boxVertical}</Text>}
        {columns.map((col, index) => (
          <Box key={col.key} width={col.width || 20}>
            <Text 
              color={headerColor} 
              bold
              wrap="truncate"
            >
              {col.align === 'center' 
                ? col.title.padStart(Math.floor((col.title.length + (col.width || 20)) / 2)).padEnd(col.width || 20)
                : col.align === 'right'
                ? col.title.padStart(col.width || 20)
                : col.title.padEnd(col.width || 20)
              }
            </Text>
          </Box>
        ))}
        {showBorder && <Text color={headerColor}>{icons.boxVertical}</Text>}
      </Box>
      
      {/* Header separator - enhanced */}
      {showBorder && (
        <Box>
          <Text color="gray">
            {icons.boxTeeRight}{icons.boxHorizontal.repeat(maxWidth - 2)}{icons.boxTeeLeft}
          </Text>
        </Box>
      )}
      
      {/* Data rows with alternating colors */}
      {data.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {showBorder && <Text color="gray">{icons.boxVertical}</Text>}
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
          {showBorder && <Text color="gray">{icons.boxVertical}</Text>}
        </Box>
      ))}
      
      {/* Bottom border - enhanced */}
      {showBorder && (
        <Box>
          <Text color="gray">
            {icons.boxBottomLeft}{icons.boxHorizontal.repeat(maxWidth - 2)}{icons.boxBottomRight}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Responsive, navigable table using Ink's built-in capabilities
export function SimpleTable({ 
  columns, 
  data, 
  variant = 'default',
  interactive = false 
}: { 
  columns: Column[]; 
  data: any[];
  variant?: 'default' | 'minimal' | 'highlighted';
  interactive?: boolean;
}) {
  const { stdout } = useStdout();
  const [selectedRow, setSelectedRow] = React.useState(0);
  const { isFocused } = useFocus({ autoFocus: interactive });
  
  // Handle keyboard navigation (only in raw mode)
  useInput((input, key) => {
    if (!interactive || !isFocused) return;
    
    if (key.upArrow) {
      setSelectedRow(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedRow(prev => Math.min((data || []).length - 1, prev + 1));
    }
  }, { isActive: interactive && process.stdin.isTTY });
  
  const getHeaderColor = () => {
    switch (variant) {
      case 'highlighted': return 'cyan';
      case 'minimal': return 'gray';
      default: return 'gray';
    }
  };
  
  const showDivider = variant !== 'minimal';
  const terminalWidth = stdout?.columns || 80;
  
  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box marginBottom={1} width="100%">
        {columns.map((col) => (
          <Box 
            key={col.key} 
            width={col.width || undefined}
            flexGrow={col.flexGrow || 1}
            flexShrink={col.flexShrink || 1}
            marginRight={1}
          >
            <Text color={getHeaderColor()} bold dimColor>
              {col.title.toUpperCase()}
            </Text>
          </Box>
        ))}
      </Box>
      
      {/* Header divider */}
      {showDivider && (
        <Box marginBottom={1}>
          <Text color="gray">{icons.boxHorizontal.repeat(Math.min(terminalWidth - 4, 80))}</Text>
        </Box>
      )}
      
      {/* Data rows */}
      {(data || []).map((row, rowIndex) => {
        const isSelected = interactive && isFocused && rowIndex === selectedRow;
        const rowKey = row.id || row.key || `row-${rowIndex}`;
        
        return (
          <Box 
            key={rowKey} 
            marginBottom={variant === 'minimal' ? 0 : 1}
            backgroundColor={isSelected ? 'blue' : undefined}
            width="100%"
          >
            {columns.map((col) => (
              <Box 
                key={col.key}
                width={col.width || undefined}
                flexGrow={col.flexGrow || 1}
                flexShrink={col.flexShrink || 1}
                marginRight={1}
              >
                {col.render ? col.render(row[col.key], row) : (
                  <Text color={isSelected ? 'white' : undefined}>
                    {String(row[col.key] || '')}
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        );
      })}
      
      {/* Navigation hint for interactive mode */}
      {interactive && isFocused && (data || []).length > 0 && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            ↑/↓ Navigate • Enter Select • {selectedRow + 1}/{(data || []).length}
          </Text>
        </Box>
      )}
    </Box>
  );
}

// Enhanced card-style layout with btop aesthetics
export function CardTable({ data, renderCard, variant = 'default' }: { 
  data: any[]; 
  renderCard: (item: any, index: number) => React.ReactNode;
  variant?: 'default' | 'compact' | 'highlight';
}) {
  const getBorderColor = (index: number) => {
    if (variant === 'highlight' && index === 0) return 'cyan';
    return 'gray';
  };
  
  const getCardStyle = () => {
    switch (variant) {
      case 'compact': return { padding: 0, marginBottom: 0 };
      case 'highlight': return { padding: 1, marginBottom: 1 };
      default: return { padding: 1, marginBottom: 1 };
    }
  };
  
  return (
    <Box flexDirection="column">
      {data.map((item, index) => {
        const style = getCardStyle();
        return (
          <Box 
            key={index} 
            flexDirection="column" 
            borderStyle="round" 
            borderColor={getBorderColor(index)}
            padding={style.padding}
            marginBottom={style.marginBottom}
          >
            {renderCard(item, index)}
          </Box>
        );
      })}
    </Box>
  );
}

// Btop-style data grid for metrics
export function DataGrid({ 
  title,
  data,
  columns = 2
}: { 
  title?: string;
  data: Array<{ label: string; value: string | number; color?: string; icon?: string }>;
  columns?: number;
}) {
  const chunkedData = [];
  for (let i = 0; i < data.length; i += columns) {
    chunkedData.push(data.slice(i, i + columns));
  }
  
  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text color="cyan" bold>{title}</Text>
        </Box>
      )}
      
      <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1}>
        {chunkedData.map((row, rowIndex) => (
          <Box key={rowIndex} justifyContent="space-between" marginBottom={rowIndex < chunkedData.length - 1 ? 1 : 0}>
            {row.map((item, colIndex) => (
              <Box key={colIndex} flexDirection="column" width={Math.floor(60 / columns)}>
                <Box>
                  {item.icon && <Text color={item.color || 'gray'}>{item.icon} </Text>}
                  <Text color="gray">{item.label}</Text>
                </Box>
                <Text color={item.color || 'white'} bold>{item.value}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}