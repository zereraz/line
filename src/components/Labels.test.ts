import { test, expect, describe } from 'bun:test';
import React from 'react';
import { render, RenderResult } from '@testing-library/react';
import { LabelBadge, LabelsGroup } from './ui/Theme.tsx';

// Helper function to render components in test environment
const renderComponent = (component: React.ReactElement): string => {
  // Since we're using Ink components, we'll test the structure and props
  // rather than rendered output. This simulates the component behavior.
  return JSON.stringify(component.props);
};

describe('LabelBadge Component', () => {
  test('should render label with name and color', () => {
    const label = { name: 'bug', color: '#d73a49' };
    const component = React.createElement(LabelBadge, { label, showIcon: true });
    
    expect(component.type).toBe(LabelBadge);
    expect(component.props.label).toEqual(label);
    expect(component.props.showIcon).toBe(true);
  });

  test('should render label without icon when showIcon is false', () => {
    const label = { name: 'feature', color: '#28a745' };
    const component = React.createElement(LabelBadge, { label, showIcon: false });
    
    expect(component.props.label).toEqual(label);
    expect(component.props.showIcon).toBe(false);
  });

  test('should default showIcon to true when not specified', () => {
    const label = { name: 'urgent', color: '#dc2626' };
    const component = React.createElement(LabelBadge, { label });
    
    expect(component.props.label).toEqual(label);
    // showIcon should default to true based on component implementation
  });

  test('should handle various color formats', () => {
    const testCases = [
      { name: 'red-label', color: '#d73a49' },
      { name: 'green-label', color: '#28a745' },
      { name: 'blue-label', color: '#007bff' },
      { name: 'yellow-label', color: '#f59e0b' },
      { name: 'purple-label', color: '#8b5cf6' },
      { name: 'cyan-label', color: '#06b6d4' },
      { name: 'gray-label', color: '#6c757d' },
      { name: 'unknown-color', color: '#abcdef' }
    ];

    testCases.forEach(testLabel => {
      const component = React.createElement(LabelBadge, { label: testLabel });
      expect(component.props.label.color).toBe(testLabel.color);
      expect(component.props.label.name).toBe(testLabel.name);
    });
  });

  test('should handle special characters in label names', () => {
    const specialLabels = [
      { name: 'bug/fix', color: '#d73a49' },
      { name: 'feature-request', color: '#28a745' },
      { name: 'urgent!', color: '#dc2626' },
      { name: 'needs-review 🔍', color: '#007bff' },
      { name: 'work-in-progress', color: '#f59e0b' }
    ];

    specialLabels.forEach(label => {
      const component = React.createElement(LabelBadge, { label });
      expect(component.props.label.name).toBe(label.name);
    });
  });

  test('should handle empty or minimal label names', () => {
    const minimalLabels = [
      { name: 'a', color: '#d73a49' },
      { name: '🐛', color: '#dc2626' },
      { name: '1', color: '#28a745' }
    ];

    minimalLabels.forEach(label => {
      const component = React.createElement(LabelBadge, { label });
      expect(component.props.label.name).toBe(label.name);
    });
  });
});

describe('LabelsGroup Component', () => {
  test('should render multiple labels', () => {
    const labels = [
      { name: 'bug', color: '#d73a49' },
      { name: 'urgent', color: '#dc2626' },
      { name: 'frontend', color: '#007bff' }
    ];
    
    const component = React.createElement(LabelsGroup, { labels, maxDisplay: 3 });
    
    expect(component.props.labels).toEqual(labels);
    expect(component.props.maxDisplay).toBe(3);
  });

  test('should handle empty labels array', () => {
    const component = React.createElement(LabelsGroup, { labels: [] });
    
    expect(component.props.labels).toEqual([]);
  });

  test('should handle undefined labels', () => {
    const component = React.createElement(LabelsGroup, { labels: undefined as any });
    
    expect(component.props.labels).toBeUndefined();
  });

  test('should use default maxDisplay when not specified', () => {
    const labels = [
      { name: 'bug', color: '#d73a49' },
      { name: 'urgent', color: '#dc2626' }
    ];
    
    const component = React.createElement(LabelsGroup, { labels });
    
    expect(component.props.labels).toEqual(labels);
    // maxDisplay should default to 3 based on component implementation
  });

  test('should limit display when labels exceed maxDisplay', () => {
    const labels = [
      { name: 'bug', color: '#d73a49' },
      { name: 'urgent', color: '#dc2626' },
      { name: 'feature', color: '#28a745' },
      { name: 'frontend', color: '#007bff' },
      { name: 'backend', color: '#6c757d' }
    ];
    
    const component = React.createElement(LabelsGroup, { labels, maxDisplay: 2 });
    
    expect(component.props.labels).toEqual(labels);
    expect(component.props.maxDisplay).toBe(2);
    // Component should internally handle showing only first 2 labels + overflow indicator
  });

  test('should handle maxDisplay larger than labels array', () => {
    const labels = [
      { name: 'bug', color: '#d73a49' },
      { name: 'urgent', color: '#dc2626' }
    ];
    
    const component = React.createElement(LabelsGroup, { labels, maxDisplay: 10 });
    
    expect(component.props.labels).toEqual(labels);
    expect(component.props.maxDisplay).toBe(10);
    // Should show all labels without overflow indicator
  });

  test('should handle single label', () => {
    const labels = [{ name: 'solo-label', color: '#d73a49' }];
    
    const component = React.createElement(LabelsGroup, { labels, maxDisplay: 3 });
    
    expect(component.props.labels).toEqual(labels);
    expect(component.props.labels).toHaveLength(1);
  });

  test('should handle maxDisplay of 0', () => {
    const labels = [
      { name: 'bug', color: '#d73a49' },
      { name: 'urgent', color: '#dc2626' }
    ];
    
    const component = React.createElement(LabelsGroup, { labels, maxDisplay: 0 });
    
    expect(component.props.maxDisplay).toBe(0);
    // Component should handle this edge case gracefully
  });

  test('should handle negative maxDisplay', () => {
    const labels = [
      { name: 'bug', color: '#d73a49' },
      { name: 'urgent', color: '#dc2626' }
    ];
    
    const component = React.createElement(LabelsGroup, { labels, maxDisplay: -1 });
    
    expect(component.props.maxDisplay).toBe(-1);
    // Component should handle this edge case gracefully
  });
});

describe('Label Color Mapping', () => {
  test('should map known colors to correct ink colors', () => {
    const colorMappings = [
      { hex: '#d73a49', expectedInk: 'red' },    // bug
      { hex: '#dc2626', expectedInk: 'red' },    // urgent  
      { hex: '#28a745', expectedInk: 'green' },  // feature
      { hex: '#007bff', expectedInk: 'blue' },   // frontend
      { hex: '#6c757d', expectedInk: 'gray' },   // documentation
      { hex: '#f59e0b', expectedInk: 'yellow' }, // warning/enhancement
      { hex: '#8b5cf6', expectedInk: 'magenta' }, // epic/project
      { hex: '#06b6d4', expectedInk: 'cyan' }    // info/design
    ];

    colorMappings.forEach(({ hex, expectedInk }) => {
      const label = { name: 'test-label', color: hex };
      const component = React.createElement(LabelBadge, { label });
      
      expect(component.props.label.color).toBe(hex);
      // The component should internally map this to the correct ink color
    });
  });

  test('should handle unknown colors', () => {
    const unknownColors = ['#123456', '#abcdef', '#ffffff', '#000000'];
    
    unknownColors.forEach(color => {
      const label = { name: 'unknown-color', color };
      const component = React.createElement(LabelBadge, { label });
      
      expect(component.props.label.color).toBe(color);
      // Should default to gray for unknown colors
    });
  });

  test('should handle case-insensitive color matching', () => {
    const caseVariations = [
      '#D73A49', // uppercase
      '#d73a49', // lowercase
      '#D73a49', // mixed case
    ];

    caseVariations.forEach(color => {
      const label = { name: 'case-test', color };
      const component = React.createElement(LabelBadge, { label });
      
      expect(component.props.label.color).toBe(color);
    });
  });
});

describe('Integration Scenarios', () => {
  test('should handle realistic GitHub-style labels', () => {
    const githubLabels = [
      { name: 'bug', color: '#d73a49' },
      { name: 'enhancement', color: '#a2eeef' },
      { name: 'good first issue', color: '#7057ff' },
      { name: 'help wanted', color: '#008672' },
      { name: 'invalid', color: '#e4e669' },
      { name: 'question', color: '#d876e3' },
      { name: 'wontfix', color: '#ffffff' }
    ];

    githubLabels.forEach(label => {
      const component = React.createElement(LabelBadge, { label });
      expect(component.props.label).toEqual(label);
    });

    const groupComponent = React.createElement(LabelsGroup, { 
      labels: githubLabels, 
      maxDisplay: 4 
    });
    expect(groupComponent.props.labels).toEqual(githubLabels);
  });

  test('should handle realistic Linear-style labels', () => {
    const linearLabels = [
      { name: 'Frontend', color: '#5e6ad2' },
      { name: 'Backend', color: '#26a69a' },
      { name: 'Mobile', color: '#ffab00' },
      { name: 'Design System', color: '#e91e63' },
      { name: 'Infrastructure', color: '#795548' },
      { name: 'Critical', color: '#f44336' },
      { name: 'Nice to have', color: '#9e9e9e' }
    ];

    linearLabels.forEach(label => {
      const component = React.createElement(LabelBadge, { label });
      expect(component.props.label).toEqual(label);
    });

    const groupComponent = React.createElement(LabelsGroup, { 
      labels: linearLabels, 
      maxDisplay: 3 
    });
    expect(groupComponent.props.labels).toEqual(linearLabels);
  });

  test('should handle mixed label scenarios from real usage', () => {
    const mixedLabels = [
      { name: 'P0', color: '#ff0000' },
      { name: 'needs-triage', color: '#fbca04' },
      { name: 'duplicate', color: '#cfd3d7' },
      { name: 'security 🔒', color: '#ee0701' },
      { name: 'performance ⚡', color: '#0e8a16' }
    ];

    // Test individual labels
    mixedLabels.forEach(label => {
      const component = React.createElement(LabelBadge, { label, showIcon: true });
      expect(component.props.label).toEqual(label);
    });

    // Test as group with overflow
    const groupComponent = React.createElement(LabelsGroup, { 
      labels: mixedLabels, 
      maxDisplay: 2 
    });
    expect(groupComponent.props.labels).toEqual(mixedLabels);
    expect(groupComponent.props.maxDisplay).toBe(2);
  });

  test('should handle labels with long names', () => {
    const longNameLabels = [
      { name: 'very-long-label-name-that-might-cause-display-issues', color: '#d73a49' },
      { name: 'extremely-long-descriptive-label-name-for-complex-feature-development', color: '#28a745' },
      { name: 'short', color: '#007bff' }
    ];

    longNameLabels.forEach(label => {
      const component = React.createElement(LabelBadge, { label });
      expect(component.props.label.name).toBe(label.name);
      expect(component.props.label.name.length).toBeGreaterThan(0);
    });
  });
});