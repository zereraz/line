import React from 'react';
import { Box, Text } from 'ink';

// Color palette
export const colors = {
  primary: '#6366f1',      // Indigo
  secondary: '#8b5cf6',    // Purple  
  success: '#10b981',      // Emerald
  warning: '#f59e0b',      // Amber
  error: '#ef4444',        // Red
  info: '#06b6d4',         // Cyan
  
  // Grays
  gray50: '#f9fafb',
  gray100: '#f3f4f6', 
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  // Status colors
  urgent: '#dc2626',       // Red-600
  high: '#ea580c',         // Orange-600
  normal: '#2563eb',       // Blue-600
  low: '#6b7280',          // Gray-500
  none: '#374151',         // Gray-700
  
  // State colors
  todo: '#6b7280',         // Gray-500
  inProgress: '#2563eb',   // Blue-600
  done: '#16a34a',         // Green-600
  backlog: '#9333ea',      // Purple-600
};

// Icons - Unicode box drawing + shapes for maximum compatibility
export const icons = {
  // Priority (different shapes + colors)
  urgent: '▲',      // Red triangle - high urgency
  high: '◆',        // Yellow diamond - important  
  normal: '●',      // Blue circle - standard
  low: '▽',         // Gray inverted triangle - low priority
  none: '○',        // Gray outline circle - no priority
  
  // Status (clear visual progression)
  todo: '□',        // Empty square - not started
  inProgress: '◐',  // Half-filled circle - in progress
  done: '■',        // Filled square - completed
  backlog: '◦',     // Small circle - backlog
  
  // General navigation
  dashboard: '▦',   // Dashboard grid
  issues: '▤',      // Issues list
  teams: '▶',       // Teams arrow
  projects: '▣',    // Projects folder
  search: '◈',      // Search diamond
  user: '◆',
  loading: '⟳',
  error: '!',
  success: '✓',
  info: 'i',
  
  // Navigation
  arrow: '→',
  back: '←',
  up: '↑',
  down: '↓',
  enter: '⏎',
};

// Helper functions for colored icons
export function getPriorityIcon(priority: string) {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return { icon: icons.urgent, color: 'red' };
    case 'high':
      return { icon: icons.high, color: 'yellow' };
    case 'normal':
    case 'medium':
      return { icon: icons.normal, color: 'blue' };
    case 'low':
      return { icon: icons.low, color: 'gray' };
    default:
      return { icon: icons.none, color: 'gray' };
  }
}

export function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'todo':
    case 'to do':
      return { icon: icons.todo, color: 'gray' };
    case 'in progress':
    case 'in_progress':
    case 'progress':
      return { icon: icons.inProgress, color: 'blue' };
    case 'done':
    case 'completed':
      return { icon: icons.done, color: 'green' };
    case 'backlog':
      return { icon: icons.backlog, color: 'magenta' };
    default:
      return { icon: icons.todo, color: 'gray' };
  }
}

// Styled components
export function Header({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        {icon && <Text color="cyan">{icon} </Text>}
        <Text color="cyan" bold underline>
          {children}
        </Text>
      </Box>
    </Box>
  );
}

export function Section({ title, children, icon }: { 
  title: string; 
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        {icon && <Text color="yellow">{icon} </Text>}
        <Text color="yellow" bold>
          {title}
        </Text>
      </Box>
      <Box marginLeft={2}>
        {children}
      </Box>
    </Box>
  );
}

export function Card({ children, border = true }: { 
  children: React.ReactNode; 
  border?: boolean;
}) {
  return (
    <Box 
      flexDirection="column" 
      borderStyle={border ? 'round' : undefined}
      borderColor="gray"
      padding={border ? 1 : 0}
    >
      {children}
    </Box>
  );
}

export function Badge({ 
  children, 
  variant = 'default' 
}: { 
  children: React.ReactNode; 
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}) {
  const colorMap = {
    default: 'gray',
    success: 'green',
    warning: 'yellow', 
    error: 'red',
    info: 'cyan'
  };
  
  return (
    <Text color={colorMap[variant]} backgroundColor={colorMap[variant]} inverse>
      {' '}{children}{' '}
    </Text>
  );
}

export function Divider({ char = '─', color = 'gray' }: { char?: string; color?: string }) {
  return (
    <Box marginY={1}>
      <Text color={color}>{char.repeat(60)}</Text>
    </Box>
  );
}

export function StatusIndicator({ status }: { status: string }) {
  const statusMap: Record<string, { color: string; icon: string }> = {
    'Todo': { color: 'gray', icon: icons.todo },
    'In Progress': { color: 'blue', icon: icons.inProgress },
    'Done': { color: 'green', icon: icons.done },
    'Backlog': { color: 'magenta', icon: icons.backlog },
  };
  
  const { color, icon } = statusMap[status] || { color: 'gray', icon: '📄' };
  
  return (
    <Box>
      <Text>{icon} </Text>
      <Text color={color} bold>{status}</Text>
    </Box>
  );
}

export function PriorityBadge({ priority }: { priority: number }) {
  const priorityMap: Record<number, { color: string; icon: string; label: string }> = {
    1: { color: 'red', icon: icons.urgent, label: 'URGENT' },
    2: { color: 'orange', icon: icons.high, label: 'HIGH' },
    3: { color: 'blue', icon: icons.normal, label: 'NORMAL' },
    4: { color: 'gray', icon: icons.low, label: 'LOW' },
    0: { color: 'gray', icon: icons.none, label: 'NONE' },
  };
  
  const { color, icon, label } = priorityMap[priority] || priorityMap[0];
  
  return (
    <Box>
      <Text color={color} bold>{icon}</Text>
      <Text color={color}> {label}</Text>
    </Box>
  );
}

export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <Box>
      <Text color="cyan">
        {icons.loading} <Text dimColor>{text}</Text>
      </Text>
    </Box>
  );
}

export function EmptyState({ 
  icon = '📭', 
  title, 
  description 
}: { 
  icon?: string; 
  title: string; 
  description?: string;
}) {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" minHeight={5}>
      <Text color="gray">{icon}</Text>
      <Text color="gray" bold>{title}</Text>
      {description && (
        <Text color="gray" dimColor>{description}</Text>
      )}
    </Box>
  );
}