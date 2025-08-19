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
  lightning: '◊',
  fire: '▲',
  
  // Line task system icons
  empty: '○',       // Empty state
  tasks: '▤',       // Tasks list (alias for issues)
  task: '▤',        // Single task (alias for issues) 
  chart: '▦',       // Charts/statistics (alias for dashboard)
  
  // Navigation
  arrow: '→',
  back: '←',
  up: '↑',
  down: '↓',
  enter: '⏎',
  
  // Box drawing enhanced
  boxTopLeft: '┌',
  boxTopRight: '┐',
  boxBottomLeft: '└',
  boxBottomRight: '┘',
  boxVertical: '│',
  boxHorizontal: '─',
  boxCross: '┼',
  boxTeeDown: '┬',
  boxTeeUp: '┴',
  boxTeeRight: '├',
  boxTeeLeft: '┤',
  
  // Double line box drawing
  boxDoubleTopLeft: '╔',
  boxDoubleTopRight: '╗',
  boxDoubleBottomLeft: '╚',
  boxDoubleBottomRight: '╝',
  boxDoubleVertical: '║',
  boxDoubleHorizontal: '═',
  
  // Progress bar elements
  progressFull: '█',
  progressHalf: '▌',
  progressQuarter: '▎',
  progressEmpty: '░',
  progressBlock: '▓',
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
    <Box flexDirection="column" marginBottom={1} width="100%">
      <Box width="100%">
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
    <Box flexDirection="column" marginBottom={1} width="100%">
      <Box marginBottom={1} width="100%">
        {icon && <Text color="yellow">{icon} </Text>}
        <Text color="yellow" bold>
          {title}
        </Text>
      </Box>
      <Box marginLeft={2} width="100%">
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
      width="100%"
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

export function StatusIndicator({ status, animated = false }: { status: string; animated?: boolean }) {
  const [pulseFrame, setPulseFrame] = React.useState(0);
  
  const statusMap: Record<string, { color: string; icon: string; pulseIcon?: string }> = {
    'Todo': { color: 'gray', icon: icons.todo, pulseIcon: '▫' },
    'todo': { color: 'gray', icon: icons.todo, pulseIcon: '▫' },
    'In Progress': { color: 'blue', icon: icons.inProgress, pulseIcon: '◑' },
    'in_progress': { color: 'blue', icon: icons.inProgress, pulseIcon: '◑' },
    'Done': { color: 'green', icon: icons.done, pulseIcon: '■' },
    'done': { color: 'green', icon: icons.done, pulseIcon: '■' },
    'Review': { color: 'yellow', icon: icons.loading, pulseIcon: '⟲' },
    'review': { color: 'yellow', icon: icons.loading, pulseIcon: '⟲' },
    'Backlog': { color: 'magenta', icon: icons.backlog, pulseIcon: '◦' },
    'backlog': { color: 'magenta', icon: icons.backlog, pulseIcon: '◦' },
  };
  
  const statusInfo = statusMap[status] || { color: 'gray', icon: icons.info };
  
  React.useEffect(() => {
    if (animated && status === 'In Progress') {
      const interval = setInterval(() => {
        setPulseFrame(prev => (prev + 1) % 3);
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [animated, status]);
  
  const getDisplayIcon = () => {
    if (animated && status === 'In Progress') {
      return pulseFrame === 0 ? statusInfo.icon : (statusInfo.pulseIcon || statusInfo.icon);
    }
    return statusInfo.icon;
  };
  
  return (
    <Box>
      <Text color={statusInfo.color}>{getDisplayIcon()} </Text>
      <Text color={statusInfo.color} bold>{status}</Text>
    </Box>
  );
}

export function PriorityBadge({ priority, animated = false }: { priority: number; animated?: boolean }) {
  const [blinkFrame, setBlinkFrame] = React.useState(0);
  
  const priorityMap: Record<number, { color: string; icon: string; label: string }> = {
    1: { color: 'red', icon: icons.urgent, label: 'URGENT' },
    2: { color: 'orange', icon: icons.high, label: 'HIGH' },
    3: { color: 'blue', icon: icons.normal, label: 'NORMAL' },
    4: { color: 'gray', icon: icons.low, label: 'LOW' },
    0: { color: 'gray', icon: icons.none, label: 'NONE' },
  };
  
  const { color, icon, label } = priorityMap[priority] || priorityMap[0];
  
  React.useEffect(() => {
    if (animated && priority === 1) {
      const interval = setInterval(() => {
        setBlinkFrame(prev => (prev + 1) % 2);
      }, 750);
      
      return () => clearInterval(interval);
    }
  }, [animated, priority]);
  
  const shouldBlink = animated && priority === 1 && blinkFrame === 0;
  
  return (
    <Box>
      <Text color={shouldBlink ? 'gray' : color} bold>{icon}</Text>
      <Text color={shouldBlink ? 'gray' : color}> {label}</Text>
    </Box>
  );
}

export function LinePriorityBadge({ priority, animated = false }: { priority: string; animated?: boolean }) {
  const [blinkFrame, setBlinkFrame] = React.useState(0);
  
  const priorityMap: Record<string, { color: string; icon: string; label: string }> = {
    'urgent': { color: 'red', icon: icons.urgent, label: 'URGENT' },
    'high': { color: 'yellow', icon: icons.high, label: 'HIGH' },
    'normal': { color: 'blue', icon: icons.normal, label: 'NORMAL' },
    'low': { color: 'gray', icon: icons.low, label: 'LOW' },
  };
  
  const { color, icon, label } = priorityMap[priority?.toLowerCase?.()] || { color: 'gray', icon: icons.none, label: 'NONE' };
  
  React.useEffect(() => {
    if (animated && priority === 'urgent') {
      const interval = setInterval(() => {
        setBlinkFrame(prev => (prev + 1) % 2);
      }, 750);
      
      return () => clearInterval(interval);
    }
  }, [animated, priority]);
  
  const shouldBlink = animated && priority === 'urgent' && blinkFrame === 0;
  
  return (
    <Box>
      <Text color={shouldBlink ? 'gray' : color} bold>{icon}</Text>
      <Text color={shouldBlink ? 'gray' : color}> {label}</Text>
    </Box>
  );
}

export function LabelBadge({ label, showIcon = true }: { label: { name: string; color: string }, showIcon?: boolean }) {
  // Convert hex color to ink color name
  const getInkColor = (hexColor: string): string => {
    const colorMapping: Record<string, string> = {
      '#d73a49': 'red',      // bug
      '#dc2626': 'red',      // urgent  
      '#28a745': 'green',    // feature
      '#007bff': 'blue',     // frontend
      '#6c757d': 'gray',     // documentation
      '#f59e0b': 'yellow',   // warning/enhancement
      '#8b5cf6': 'magenta',  // epic/project
      '#06b6d4': 'cyan',     // info/design
    };
    
    return colorMapping[hexColor.toLowerCase()] || 'gray';
  };

  const inkColor = getInkColor(label.color);
  const icon = showIcon ? '●' : '';
  
  return (
    <Box marginRight={1}>
      {showIcon && <Text color={inkColor}>{icon}</Text>}
      <Text color={inkColor}>{showIcon ? ' ' : ''}{label.name}</Text>
    </Box>
  );
}

export function LabelsGroup({ labels, maxDisplay = 3 }: { labels: { name: string; color: string }[], maxDisplay?: number }) {
  if (!labels || labels.length === 0) return null;
  
  const displayLabels = labels.slice(0, maxDisplay);
  const remainingCount = labels.length - maxDisplay;
  
  return (
    <Box flexDirection="row" flexWrap="wrap">
      {displayLabels.map((label, index) => (
        <LabelBadge key={index} label={label} showIcon={true} />
      ))}
      {remainingCount > 0 && (
        <Box marginLeft={1}>
          <Text color="gray" dimColor>+{remainingCount} more</Text>
        </Box>
      )}
    </Box>
  );
}

export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  const [frame, setFrame] = React.useState(0);
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setFrame(prev => (prev + 1) % spinnerFrames.length);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Box>
      <Text color="cyan">
        {spinnerFrames[frame]} <Text dimColor>{text}</Text>
      </Text>
    </Box>
  );
}

export function EmptyState({ 
  icon = icons.info, 
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

// Btop-inspired progress bar with gradient effect
export function ProgressBar({ 
  value, 
  max = 100, 
  width = 20, 
  showPercentage = true,
  variant = 'default'
}: { 
  value: number; 
  max?: number; 
  width?: number; 
  showPercentage?: boolean;
  variant?: 'default' | 'cpu' | 'memory' | 'network';
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const filledWidth = Math.floor((percentage / 100) * width);
  const emptyWidth = width - filledWidth;
  
  // Color gradient based on percentage and variant
  const getColor = () => {
    if (variant === 'cpu' || variant === 'memory') {
      if (percentage >= 90) return 'red';
      if (percentage >= 70) return 'yellow';
      if (percentage >= 50) return 'green';
      return 'cyan';
    }
    if (percentage >= 80) return 'green';
    if (percentage >= 60) return 'yellow';
    if (percentage >= 40) return 'cyan';
    return 'blue';
  };
  
  const color = getColor();
  
  return (
    <Box>
      <Text color={color}>
        {icons.progressFull.repeat(filledWidth)}
      </Text>
      <Text color="gray">
        {icons.progressEmpty.repeat(emptyWidth)}
      </Text>
      {showPercentage && (
        <Text color={color} bold> {percentage.toFixed(1)}%</Text>
      )}
    </Box>
  );
}

// Btop-style information panel
export function InfoPanel({ 
  title, 
  children, 
  variant = 'default',
  icon
}: { 
  title: string; 
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'warning' | 'error' | 'success';
  icon?: string;
}) {
  const getBorderColor = () => {
    switch (variant) {
      case 'primary': return 'cyan';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      case 'success': return 'green';
      default: return 'gray';
    }
  };
  
  const getTitleColor = () => {
    switch (variant) {
      case 'primary': return 'cyan';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      case 'success': return 'green';
      default: return 'white';
    }
  };
  
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={getBorderColor()} padding={1}>
      <Box marginBottom={1}>
        {icon && <Text color={getTitleColor()}>{icon} </Text>}
        <Text color={getTitleColor()} bold>{title}</Text>
      </Box>
      {children}
    </Box>
  );
}

// Enhanced status bar like btop
export function StatusBar({ 
  items 
}: { 
  items: Array<{ label: string; value: string | number; color?: string; icon?: string }>
}) {
  return (
    <Box justifyContent="space-between" paddingX={1}>
      {items.map((item, index) => (
        <Box key={index}>
          {item.icon && <Text color={item.color || 'gray'}>{item.icon} </Text>}
          <Text color="gray">{item.label}: </Text>
          <Text color={item.color || 'white'} bold>{item.value}</Text>
        </Box>
      ))}
    </Box>
  );
}

// Btop-style metric display
export function MetricDisplay({ 
  label, 
  value, 
  unit = '', 
  progress, 
  icon,
  variant = 'default'
}: { 
  label: string; 
  value: number | string; 
  unit?: string;
  progress?: number;
  icon?: string;
  variant?: 'cpu' | 'memory' | 'network' | 'disk' | 'default';
}) {
  const getColor = () => {
    switch (variant) {
      case 'cpu': return 'cyan';
      case 'memory': return 'green';
      case 'network': return 'magenta';
      case 'disk': return 'yellow';
      default: return 'white';
    }
  };
  
  return (
    <Box flexDirection="column" marginRight={2}>
      <Box>
        {icon && <Text color={getColor()}>{icon} </Text>}
        <Text color="gray">{label}</Text>
      </Box>
      <Box>
        <Text color={getColor()} bold>{value}{unit}</Text>
      </Box>
      {progress !== undefined && (
        <ProgressBar value={progress} variant={variant} width={12} showPercentage={false} />
      )}
    </Box>
  );
}

// Enhanced divider with btop styling
export function BtopDivider({ 
  title, 
  char = '─', 
  color = 'gray',
  style = 'single'
}: { 
  title?: string; 
  char?: string; 
  color?: string;
  style?: 'single' | 'double' | 'thick';
}) {
  const getChar = () => {
    switch (style) {
      case 'double': return '═';
      case 'thick': return '━';
      default: return char;
    }
  };
  
  const dividerChar = getChar();
  const lineLength = title ? 25 : 60;
  
  if (title) {
    return (
      <Box marginY={1}>
        <Text color={color}>{dividerChar.repeat(3)} </Text>
        <Text color="white" bold>{title}</Text>
        <Text color={color}> {dividerChar.repeat(lineLength)}</Text>
      </Box>
    );
  }
  
  return (
    <Box marginY={1}>
      <Text color={color}>{dividerChar.repeat(60)}</Text>
    </Box>
  );
}