#!/usr/bin/env bun
/**
 * Line CLI MCP Server
 * Provides Linear-compatible MCP tools using line's local SQLite cache
 */

import { dbQueries, type Issue, type Team, type Project } from './utils/database.ts';
import { lineService, type CreateTaskOptions, type UpdateTaskOptions, type ListTasksOptions } from './services/lineService.ts';
import { type LineTask } from './utils/lineDatabase.ts';

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

interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools: {};
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

interface MCPToolsListResult {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>;
}

interface MCPToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

export class LineMCPServer {
  private tools = [
    // Line Native Tools (Primary)
    {
      name: "mcp__line-server__list_issues",
      description: "List issues from Line's local database",
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
      name: "mcp__line-server__get_issue",
      description: "Get specific issue by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Issue ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__line-server__list_my_issues",
      description: "List issues assigned to current user",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Limit number of results", default: 50 }
        }
      }
    },
    {
      name: "mcp__line-server__list_teams",
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
      name: "mcp__line-server__get_team",
      description: "Get specific team by ID or key",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Team ID, key, or name" }
        },
        required: ["query"]
      }
    },
    {
      name: "mcp__line-server__list_projects",
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
      name: "mcp__line-server__get_project",
      description: "Get specific project by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Project ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__line-server__search_issues",
      description: "Search issues by query",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Limit number of results", default: 25 }
        },
        required: ["query"]
      }
    },
    {
      name: "mcp__line-server__list_comments",
      description: "List comments for a specific issue",
      inputSchema: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "Issue ID" },
          includeReplies: { type: "boolean", description: "Include threaded replies", default: true }
        },
        required: ["issueId"]
      }
    },
    {
      name: "mcp__line-server__get_comment",
      description: "Get specific comment by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Comment ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__line-server__add_comment",
      description: "Add a new comment to an issue",
      inputSchema: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "Issue ID" },
          content: { type: "string", description: "Comment content" },
          parentId: { type: "string", description: "Parent comment ID for replies" }
        },
        required: ["issueId", "content"]
      }
    },
    // Line Native Task Management Tools
    {
      name: "mcp__line-server__create_task",
      description: "Create a new Line task",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          type: { type: "string", enum: ["issue", "goal", "habit", "learning"], description: "Task type", default: "issue" },
          priority: { type: "string", enum: ["urgent", "high", "normal", "low"], description: "Task priority", default: "normal" },
          assignee: { type: "string", description: "Assigned user" },
          due_date: { type: "string", description: "Due date (ISO string)" },
          parent_id: { type: "string", description: "Parent task ID for subtasks" },
          labels: { type: "array", items: { type: "string" }, description: "Label IDs" }
        },
        required: ["title"]
      }
    },
    {
      name: "mcp__line-server__update_task",
      description: "Update an existing Line task",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID" },
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          type: { type: "string", enum: ["issue", "goal", "habit", "learning"], description: "Task type" },
          status: { type: "string", enum: ["todo", "in_progress", "review", "done"], description: "Task status" },
          priority: { type: "string", enum: ["urgent", "high", "normal", "low"], description: "Task priority" },
          assignee: { type: "string", description: "Assigned user" },
          time_tracked: { type: "number", description: "Time tracked in minutes" },
          progress: { type: "number", description: "Progress percentage (0-100)" },
          due_date: { type: "string", description: "Due date (ISO string)" },
          parent_id: { type: "string", description: "Parent task ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__line-server__get_task",
      description: "Get a specific Line task by ID",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__line-server__delete_task",
      description: "Delete a Line task",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__line-server__list_tasks",
      description: "List Line tasks with optional filtering",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["todo", "in_progress", "review", "done"], description: "Filter by status" },
          type: { type: "string", enum: ["issue", "goal", "habit", "learning"], description: "Filter by type" },
          assignee: { type: "string", description: "Filter by assignee" },
          parent_only: { type: "boolean", description: "Only show top-level tasks", default: false }
        }
      }
    },
    {
      name: "mcp__line-server__assign_task",
      description: "Assign a Line task to a user",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID" },
          assignee: { type: "string", description: "User to assign to" }
        },
        required: ["id", "assignee"]
      }
    },
    {
      name: "mcp__line-server__set_priority",
      description: "Set the priority of a Line task",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task ID" },
          priority: { type: "string", enum: ["urgent", "high", "normal", "low"], description: "Priority level" }
        },
        required: ["id", "priority"]
      }
    },
    {
      name: "mcp__line-server__add_dependency",
      description: "Add a dependency between Line tasks",
      inputSchema: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "Task that depends on another" },
          depends_on_id: { type: "string", description: "Task that is depended upon" }
        },
        required: ["task_id", "depends_on_id"]
      }
    },
    
    // Linear Compatibility Tools (for migration)
    {
      name: "mcp__linear_server__list_issues",
      description: "List issues from Line's local database (Linear compatibility)",
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
      description: "Get specific issue by ID (Linear compatibility)",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Issue ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__linear_server__list_my_issues",
      description: "List issues assigned to current user (Linear compatibility)",
      inputSchema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Limit number of results", default: 50 }
        }
      }
    },
    {
      name: "mcp__linear_server__list_teams",
      description: "List all teams (Linear compatibility)",
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
      description: "Get specific team by ID or key (Linear compatibility)",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Team ID, key, or name" }
        },
        required: ["query"]
      }
    },
    {
      name: "mcp__linear_server__list_projects",
      description: "List all projects (Linear compatibility)",
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
      description: "Get specific project by ID (Linear compatibility)",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Project ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__linear_server__search_issues",
      description: "Search issues by query (Linear compatibility)",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Limit number of results", default: 25 }
        },
        required: ["query"]
      }
    },
    {
      name: "mcp__linear_server__list_comments",
      description: "List comments for a specific issue (Linear compatibility)",
      inputSchema: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "Issue ID" },
          includeReplies: { type: "boolean", description: "Include threaded replies", default: true }
        },
        required: ["issueId"]
      }
    },
    {
      name: "mcp__linear_server__get_comment",
      description: "Get specific comment by ID (Linear compatibility)",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Comment ID" }
        },
        required: ["id"]
      }
    },
    {
      name: "mcp__linear_server__add_comment",
      description: "Add a new comment to an issue (Linear compatibility)",
      inputSchema: {
        type: "object",
        properties: {
          issueId: { type: "string", description: "Issue ID" },
          content: { type: "string", description: "Comment content" },
          parentId: { type: "string", description: "Parent comment ID for replies" }
        },
        required: ["issueId", "content"]
      }
    }
  ];

  async handleRequest(request: MCPRequest): Promise<MCPInitializeResult | MCPToolsListResult | MCPToolResult> {
    try {
      switch (request.method) {
        case "initialize":
          return {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "line",
              version: "0.0.1"
            }
          };
        
        case "tools/list":
          return { tools: this.tools };
        
        case "tools/call":
          return await this.handleToolCall(request.params);
        
        default:
          throw new Error(`Unknown method: ${request.method}`);
      }
    } catch (error) {
      throw error;
    }
  }

  private async handleToolCall(params: any): Promise<MCPToolResult> {
    const { name, arguments: args } = params;

    switch (name) {
      // Line Native Tools (Primary)
      case "mcp__line-server__list_issues":
        return this.listIssues(args);
      
      case "mcp__line-server__get_issue":
        return this.getIssue(args);
      
      case "mcp__line-server__list_my_issues":
        return this.listMyIssues(args);
      
      case "mcp__line-server__list_teams":
        return this.listTeams(args);
      
      case "mcp__line-server__get_team":
        return this.getTeam(args);
      
      case "mcp__line-server__list_projects":
        return this.listProjects(args);
      
      case "mcp__line-server__get_project":
        return this.getProject(args);
      
      case "mcp__line-server__search_issues":
        return this.searchIssues(args);
      
      
      case "mcp__line-server__list_comments":
        return this.listComments(args);
      
      case "mcp__line-server__get_comment":
        return this.getComment(args);
      
      case "mcp__line-server__add_comment":
        return this.addComment(args);
      
      // Line Native Task Tools
      case "mcp__line-server__create_task":
        return await this.createLineTask(args);
      
      case "mcp__line-server__update_task":
        return await this.updateLineTask(args);
      
      case "mcp__line-server__get_task":
        return this.getLineTask(args);
      
      case "mcp__line-server__delete_task":
        return this.deleteLineTask(args);
      
      case "mcp__line-server__list_tasks":
        return await this.listLineTasks(args);
      
      case "mcp__line-server__assign_task":
        return await this.assignLineTask(args);
      
      case "mcp__line-server__set_priority":
        return await this.setLineTaskPriority(args);
      
      case "mcp__line-server__add_dependency":
        return this.addLineTaskDependency(args);
      
      // Linear Compatibility Tools (delegate to Line implementations)
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
      
      
      case "mcp__linear_server__list_comments":
        return this.listComments(args);
      
      case "mcp__linear_server__get_comment":
        return this.getComment(args);
      
      case "mcp__linear_server__add_comment":
        return this.addComment(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private listIssues(args: any = {}): MCPToolResult {
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

  private getIssue(args: any): MCPToolResult {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    const issue = dbQueries.getIssueById(args.id);
    if (!issue) {
      throw new Error(`Issue not found: ${args.id}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(issue) }]
    };
  }

  private listMyIssues(args: any = {}): MCPToolResult {
    const issues = dbQueries.getMyIssues('You'); // Line CLI uses 'You' for current user
    const limit = args.limit || 50;
    
    return {
      content: [{ type: "text", text: JSON.stringify(issues.slice(0, limit)) }]
    };
  }

  private listTeams(args: any = {}): MCPToolResult {
    const teams = dbQueries.getAllTeams();
    const limit = args.limit || 50;
    
    return {
      content: [{ type: "text", text: JSON.stringify(teams.slice(0, limit)) }]
    };
  }

  private getTeam(args: any): MCPToolResult {
    if (!args.query) {
      throw new Error("Missing required parameter: query");
    }

    const team = dbQueries.getTeamById(args.query);
    if (!team) {
      throw new Error(`Team not found: ${args.query}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(team) }]
    };
  }

  private listProjects(args: any = {}): MCPToolResult {
    const projects = dbQueries.getAllProjects();
    const limit = args.limit || 50;
    
    return {
      content: [{ type: "text", text: JSON.stringify(projects.slice(0, limit)) }]
    };
  }

  private getProject(args: any): MCPToolResult {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    const project = dbQueries.getProjectById(args.id);
    if (!project) {
      throw new Error(`Project not found: ${args.id}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(project) }]
    };
  }

  private searchIssues(args: any): MCPToolResult {
    if (!args.query) {
      throw new Error("Missing required parameter: query");
    }

    const issues = dbQueries.searchIssues(args.query);
    const limit = args.limit || 25;
    
    return {
      content: [{ type: "text", text: JSON.stringify(issues.slice(0, limit)) }]
    };
  }



  private listComments(args: any): MCPToolResult {
    if (!args.issueId) {
      throw new Error("Missing required parameter: issueId");
    }

    const comments = dbQueries.getCommentsByIssueId(args.issueId);
    
    return {
      content: [{ type: "text", text: JSON.stringify(comments) }]
    };
  }

  private getComment(args: any): MCPToolResult {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    const comment = dbQueries.getCommentById(args.id);
    if (!comment) {
      throw new Error(`Comment not found: ${args.id}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(comment) }]
    };
  }

  private addComment(args: any): MCPToolResult {
    if (!args.issueId || !args.content) {
      throw new Error("Missing required parameters: issueId and content");
    }

    const now = new Date().toISOString();
    const comment = {
      id: `comment_${args.issueId}_${Date.now()}`,
      issue_id: args.issueId,
      author: 'You',
      content: args.content,
      created_at: now,
      updated_at: now,
      parent_id: args.parentId
    };

    dbQueries.upsertComment(comment);

    return {
      content: [{ type: "text", text: JSON.stringify(comment) }]
    };
  }

  // Line Native Task Management Methods
  private async createLineTask(args: any): Promise<MCPToolResult> {
    if (!args.title) {
      throw new Error("Missing required parameter: title");
    }

    try {
      const options: CreateTaskOptions = {
        title: args.title,
        description: args.description,
        type: args.type || 'issue',
        priority: args.priority || 'normal',
        assignee: args.assignee,
        due_date: args.due_date,
        parent_id: args.parent_id,
        labels: args.labels
      };

      const task = lineService.createTask(options);
      return {
        content: [{ type: "text", text: JSON.stringify(task) }]
      };
    } catch (error) {
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async updateLineTask(args: any): Promise<MCPToolResult> {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    try {
      const updates: UpdateTaskOptions = {};
      
      // Only include defined fields in updates
      if (args.title !== undefined) updates.title = args.title;
      if (args.description !== undefined) updates.description = args.description;
      if (args.type !== undefined) updates.type = args.type;
      if (args.status !== undefined) updates.status = args.status;
      if (args.priority !== undefined) updates.priority = args.priority;
      if (args.assignee !== undefined) updates.assignee = args.assignee;
      if (args.time_tracked !== undefined) updates.time_tracked = args.time_tracked;
      if (args.progress !== undefined) updates.progress = args.progress;
      if (args.due_date !== undefined) updates.due_date = args.due_date;
      if (args.parent_id !== undefined) updates.parent_id = args.parent_id;

      const task = lineService.updateTask(args.id, updates);
      if (!task) {
        throw new Error(`Task not found: ${args.id}`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(task) }]
      };
    } catch (error) {
      throw new Error(`Failed to update task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getLineTask(args: any): MCPToolResult {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    const task = lineService.getTask(args.id);
    if (!task) {
      throw new Error(`Task not found: ${args.id}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(task) }]
    };
  }

  private deleteLineTask(args: any): MCPToolResult {
    if (!args.id) {
      throw new Error("Missing required parameter: id");
    }

    const success = lineService.deleteTask(args.id);
    if (!success) {
      throw new Error(`Failed to delete task: ${args.id}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, message: `Task ${args.id} deleted successfully` }) }]
    };
  }

  private async listLineTasks(args: any = {}): Promise<MCPToolResult> {
    try {
      const options: ListTasksOptions = {};
      
      if (args.status) options.status = args.status;
      if (args.type) options.type = args.type;
      if (args.assignee) options.assignee = args.assignee;
      if (args.parent_only) options.parent_only = args.parent_only;

      const tasks = await lineService.listTasks(options);
      return {
        content: [{ type: "text", text: JSON.stringify(tasks) }]
      };
    } catch (error) {
      throw new Error(`Failed to list tasks: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async assignLineTask(args: any): Promise<MCPToolResult> {
    if (!args.id || !args.assignee) {
      throw new Error("Missing required parameters: id and assignee");
    }

    try {
      const task = lineService.updateTask(args.id, { assignee: args.assignee });
      if (!task) {
        throw new Error(`Task not found: ${args.id}`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(task) }]
      };
    } catch (error) {
      throw new Error(`Failed to assign task: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async setLineTaskPriority(args: any): Promise<MCPToolResult> {
    if (!args.id || !args.priority) {
      throw new Error("Missing required parameters: id and priority");
    }

    try {
      const task = lineService.setPriority(args.id, args.priority);
      if (!task) {
        throw new Error(`Task not found: ${args.id}`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(task) }]
      };
    } catch (error) {
      throw new Error(`Failed to set priority: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private addLineTaskDependency(args: any): MCPToolResult {
    if (!args.task_id || !args.depends_on_id) {
      throw new Error("Missing required parameters: task_id and depends_on_id");
    }

    try {
      const success = lineService.addDependency(args.task_id, args.depends_on_id);
      if (!success) {
        throw new Error(`Failed to add dependency. This might create a circular dependency or one of the tasks doesn't exist.`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ 
          success: true, 
          message: `Dependency added: ${args.task_id} depends on ${args.depends_on_id}` 
        }) }]
      };
    } catch (error) {
      throw new Error(`Failed to add dependency: ${error instanceof Error ? error.message : String(error)}`);
    }
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