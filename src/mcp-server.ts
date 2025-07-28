#!/usr/bin/env bun
/**
 * Line CLI MCP Server
 * Provides Linear-compatible MCP tools using line's local SQLite cache
 */

import { dbQueries, type Issue, type Team, type Project } from './utils/database.ts';

interface MCPRequest {
  method: string;
  params?: any;
}

interface MCPResponse {
  content?: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

class LineMCPServer {
  private tools = [
    {
      name: "mcp__linear_server__list_issues",
      description: "List issues from line's local database",
      inputSchema: {
        type: "object",
        properties: {
          assigneeId: { type: "string", description: "Filter by assignee ID" },
          teamId: { type: "string", description: "Filter by team ID" },
          stateId: { type: "string", description: "Filter by state ID" },
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Limit number of results", default: 50 }
        }
      }
    },
    {
      name: "mcp__linear_server__get_issue",
      description: "Get specific issue by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Issue ID", required: true }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__linear_server__list_my_issues",
      description: "List issues assigned to current user",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Limit number of results", default: 50 }
        }
      }
    },
    {
      name: "mcp__linear_server__list_teams",
      description: "List all teams",
      inputSchema: {
        type: "object",
        properties: {
          includeArchived: { type: "boolean", description: "Include archived teams", default: false },
          limit: { type: "number", description: "Limit number of results", default: 50 }
        }
      }
    },
    {
      name: "mcp__linear_server__get_team",
      description: "Get specific team by ID or key",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Team ID, key, or name", required: true }
        },
        required: ["query"]
      }
    },
    {
      name: "mcp__linear_server__list_projects",
      description: "List all projects",
      inputSchema: {
        type: "object",
        properties: {
          teamId: { type: "string", description: "Filter by team ID" },
          includeArchived: { type: "boolean", description: "Include archived projects", default: false },
          limit: { type: "number", description: "Limit number of results", default: 50 }
        }
      }
    },
    {
      name: "mcp__linear_server__get_project",
      description: "Get specific project by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Project ID", required: true }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__linear_server__search_issues",
      description: "Search issues by query",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query", required: true },
          limit: { type: "number", description: "Limit number of results", default: 25 }
        },
        required: ["query"]
      }
    }
  ];

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case "tools/list":
          return { content: [{ type: "text", text: JSON.stringify(this.tools) }] };
        
        case "tools/call":
          return await this.handleToolCall(request.params);
        
        default:
          return {
            content: [{ type: "text", text: `Unknown method: ${request.method}` }],
            isError: true
          };
      }
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }

  private async handleToolCall(params: any): Promise<MCPResponse> {
    const { name, arguments: args } = params;

    switch (name) {
      case "mcp__linear_server__list_issues":
        return this.listIssues(args);
      
      case "mcp__linear_server__get_issue":
        return this.getIssue(args);
      
      case "mcp__linear_server__list_my_issues":
        return this.listMyIssues(args);
      
      case "mcp__linear_server__list_teams":
        return this.listTeams(args);
      
      case "mcp__linear_server__get_team":
        return this.getTeam(args);
      
      case "mcp__linear_server__list_projects":
        return this.listProjects(args);
      
      case "mcp__linear_server__get_project":
        return this.getProject(args);
      
      case "mcp__linear_server__search_issues":
        return this.searchIssues(args);
      
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  }

  private listIssues(args: any = {}): MCPResponse {
    let issues = dbQueries.getAllIssues();
    
    // Apply filters
    if (args.assigneeId && args.assigneeId !== 'current') {
      issues = issues.filter(issue => issue.assignee_name === args.assigneeId);
    }
    
    if (args.teamId) {
      issues = issues.filter(issue => issue.team_name === args.teamId);
    }
    
    if (args.query) {
      issues = dbQueries.searchIssues(args.query);
    }
    
    // Apply limit
    const limit = args.limit || 50;
    issues = issues.slice(0, limit);

    return {
      content: [{ type: "text", text: JSON.stringify(issues) }]
    };
  }

  private getIssue(args: any): MCPResponse {
    if (!args.id) {
      return {
        content: [{ type: "text", text: "Missing required parameter: id" }],
        isError: true
      };
    }

    const issue = dbQueries.getIssueById(args.id);
    if (!issue) {
      return {
        content: [{ type: "text", text: `Issue not found: ${args.id}` }],
        isError: true
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(issue) }]
    };
  }

  private listMyIssues(args: any = {}): MCPResponse {
    const issues = dbQueries.getMyIssues('You'); // Line CLI uses 'You' for current user
    const limit = args.limit || 50;
    
    return {
      content: [{ type: "text", text: JSON.stringify(issues.slice(0, limit)) }]
    };
  }

  private listTeams(args: any = {}): MCPResponse {
    const teams = dbQueries.getAllTeams();
    const limit = args.limit || 50;
    
    return {
      content: [{ type: "text", text: JSON.stringify(teams.slice(0, limit)) }]
    };
  }

  private getTeam(args: any): MCPResponse {
    if (!args.query) {
      return {
        content: [{ type: "text", text: "Missing required parameter: query" }],
        isError: true
      };
    }

    const team = dbQueries.getTeamById(args.query);
    if (!team) {
      return {
        content: [{ type: "text", text: `Team not found: ${args.query}` }],
        isError: true
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(team) }]
    };
  }

  private listProjects(args: any = {}): MCPResponse {
    const projects = dbQueries.getAllProjects();
    const limit = args.limit || 50;
    
    return {
      content: [{ type: "text", text: JSON.stringify(projects.slice(0, limit)) }]
    };
  }

  private getProject(args: any): MCPResponse {
    if (!args.id) {
      return {
        content: [{ type: "text", text: "Missing required parameter: id" }],
        isError: true
      };
    }

    const project = dbQueries.getProjectById(args.id);
    if (!project) {
      return {
        content: [{ type: "text", text: `Project not found: ${args.id}` }],
        isError: true
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(project) }]
    };
  }

  private searchIssues(args: any): MCPResponse {
    if (!args.query) {
      return {
        content: [{ type: "text", text: "Missing required parameter: query" }],
        isError: true
      };
    }

    const issues = dbQueries.searchIssues(args.query);
    const limit = args.limit || 25;
    
    return {
      content: [{ type: "text", text: JSON.stringify(issues.slice(0, limit)) }]
    };
  }
}

export function startMCPServer() {
  // MCP Server Protocol Handler
  const server = new LineMCPServer();

  // Handle JSON-RPC over stdio
  process.stdin.setEncoding('utf8');

  let buffer = '';
  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    
    // Process complete JSON messages
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      
      if (line.trim()) {
        try {
          const request = JSON.parse(line);
          const response = await server.handleRequest(request);
          
          // Send response
          process.stdout.write(JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: response
          }) + '\n');
        } catch (error) {
          // Send error response
          process.stdout.write(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: "Parse error",
              data: error instanceof Error ? error.message : String(error)
            }
          }) + '\n');
        }
      }
    }
  });

  process.stdin.on('end', () => {
    process.exit(0);
  });

  // Handle process termination
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));

  console.error('Line MCP Server started');
}

// If run directly, start the server
if (import.meta.main) {
  startMCPServer();
}