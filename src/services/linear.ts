import { dbQueries, type Issue, type Team, type Project, type Label, type Comment } from '../utils/database.ts';

// Backend Integration Service for Linear.app
// Provides unified interface for Linear backend via MCP commands
// Part of Line's universal backend architecture

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface LinearIssue {
  id: string;
  title: string;
  description?: string;
  state: { name: string };
  assignee?: { name: string };
  team: { name: string };
  priority: number;
  createdAt: string;
  updatedAt: string;
  labels?: LinearLabel[];
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
}

export interface LinearProject {
  id: string;
  name: string;
  state: string;
  team?: { name: string };
}

export interface LinearComment {
  id: string;
  body: string;
  user: { name: string };
  createdAt: string;
  updatedAt: string;
  parent?: { id: string };
}

class LinearService {
  private async shouldSync(entity: string, maxAgeMinutes = 5): Promise<boolean> {
    const status = dbQueries.getSyncStatus(entity);
    if (!status) return true;
    
    const lastSync = new Date(status.last_sync);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    
    return diffMinutes > maxAgeMinutes;
  }

  private convertLinearLabel(linearLabel: LinearLabel): Label {
    return {
      id: linearLabel.id,
      name: linearLabel.name,
      color: linearLabel.color,
      description: linearLabel.description
    };
  }

  private convertLinearIssue(linearIssue: LinearIssue): Issue {
    const issue: Issue = {
      id: linearIssue.id,
      title: linearIssue.title,
      description: linearIssue.description,
      state_name: linearIssue.state.name,
      assignee_name: linearIssue.assignee?.name,
      team_name: linearIssue.team.name,
      priority: linearIssue.priority,
      created_at: linearIssue.createdAt,
      updated_at: linearIssue.updatedAt
    };

    // Convert and sync labels if present
    if (linearIssue.labels) {
      issue.labels = linearIssue.labels.map(label => this.convertLinearLabel(label));
      
      // Sync labels to database
      for (const label of issue.labels) {
        dbQueries.upsertLabel(label);
      }
      
      // Set issue-label relationships
      dbQueries.setIssueLabels(issue.id, issue.labels.map(l => l.id));
    }

    return issue;
  }

  private convertLinearTeam(linearTeam: LinearTeam): Team {
    return {
      id: linearTeam.id,
      name: linearTeam.name,
      key: linearTeam.key,
      description: linearTeam.description
    };
  }

  private convertLinearProject(linearProject: LinearProject): Project {
    return {
      id: linearProject.id,
      name: linearProject.name,
      status: linearProject.state,
      team_name: linearProject.team?.name || 'Unknown'
    };
  }

  private convertLinearComment(linearComment: LinearComment, issueId: string): Comment {
    return {
      id: linearComment.id,
      issue_id: issueId,
      author: linearComment.user.name,
      content: linearComment.body,
      created_at: linearComment.createdAt,
      updated_at: linearComment.updatedAt,
      parent_id: linearComment.parent?.id
    };
  }

  async getIssues(forceSync = false): Promise<Issue[]> {
    if (!forceSync && !await this.shouldSync('issues')) {
      return dbQueries.getAllIssues();
    }

    try {
      // TODO: Integrate with MCP Linear backend when available
      // const linearIssues = await mcp__linear_server__list_issues();
      
      // Mock data for now
      const mockLinearIssues: LinearIssue[] = [
        {
          id: 'LIN-123',
          title: 'Fix authentication bug',
          description: 'The login flow is broken when users try to authenticate with OAuth providers.',
          state: { name: 'In Progress' },
          assignee: { name: 'You' },
          team: { name: 'Engineering' },
          priority: 1,
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-16T14:22:00Z',
          labels: [
            { id: 'bug', name: 'bug', color: '#d73a49', description: 'Something isn\'t working' },
            { id: 'urgent', name: 'urgent', color: '#dc2626', description: 'Needs immediate attention' }
          ]
        },
        {
          id: 'LIN-124',
          title: 'Implement new dashboard',
          description: 'Create a modern dashboard with real-time updates.',
          state: { name: 'Todo' },
          assignee: { name: 'Alice' },
          team: { name: 'Product' },
          priority: 2,
          createdAt: '2024-01-14T09:15:00Z',
          updatedAt: '2024-01-15T16:45:00Z',
          labels: [
            { id: 'feature', name: 'feature', color: '#28a745', description: 'New feature request' },
            { id: 'frontend', name: 'frontend', color: '#007bff', description: 'Frontend related work' }
          ]
        },
        {
          id: 'LIN-125',
          title: 'Update documentation',
          description: 'Update API documentation with new endpoints.',
          state: { name: 'Done' },
          assignee: { name: 'Bob' },
          team: { name: 'Engineering' },
          priority: 4,
          createdAt: '2024-01-10T11:20:00Z',
          updatedAt: '2024-01-13T14:30:00Z',
          labels: [
            { id: 'documentation', name: 'documentation', color: '#6c757d', description: 'Documentation updates' }
          ]
        }
      ];

      // Sync to local database
      for (const linearIssue of mockLinearIssues) {
        const issue = this.convertLinearIssue(linearIssue);
        dbQueries.upsertIssue(issue);
      }

      dbQueries.updateSyncStatus('issues');
      return dbQueries.getAllIssues();
    } catch (error) {
      console.error('Failed to sync issues from backend:', error);
      return dbQueries.getAllIssues();
    }
  }

  async getMyIssues(forceSync = false): Promise<Issue[]> {
    await this.getIssues(forceSync); // Ensure issues are synced
    return dbQueries.getMyIssues('You');
  }

  async getIssue(id: string, forceSync = false): Promise<Issue | null> {
    if (!forceSync) {
      const cached = dbQueries.getIssueById(id);
      if (cached) return cached;
    }

    try {
      // TODO: Integrate with MCP Linear backend when available
      // const linearIssue = await mcp__linear_server__get_issue({ id });
      
      // Mock data
      const mockLinearIssue: LinearIssue = {
        id,
        title: 'Fix authentication bug',
        description: 'The login flow is broken when users try to authenticate with OAuth providers. Need to investigate and fix the token refresh mechanism.',
        state: { name: 'In Progress' },
        assignee: { name: 'John Doe' },
        team: { name: 'Engineering' },
        priority: 1,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-16T14:22:00Z',
        labels: [
          { id: 'bug', name: 'bug', color: '#d73a49', description: 'Something isn\'t working' },
          { id: 'urgent', name: 'urgent', color: '#dc2626', description: 'Needs immediate attention' }
        ]
      };

      const issue = this.convertLinearIssue(mockLinearIssue);
      dbQueries.upsertIssue(issue);
      return issue;
    } catch (error) {
      console.error('Failed to fetch issue from backend:', error);
      return dbQueries.getIssueById(id);
    }
  }

  async searchIssues(query: string): Promise<Issue[]> {
    // First try local search
    const localResults = dbQueries.searchIssues(query);
    
    // TODO: Enhance search with Linear backend integration
    // const linearResults = await mcp__linear_server__list_issues({ query });
    
    return localResults;
  }

  async getTeams(forceSync = false): Promise<Team[]> {
    if (!forceSync && !await this.shouldSync('teams')) {
      return dbQueries.getAllTeams();
    }

    try {
      // TODO: Integrate with MCP Linear backend when available
      // const linearTeams = await mcp__linear_server__list_teams();
      
      // Mock data
      const mockLinearTeams: LinearTeam[] = [
        { id: '1', name: 'Engineering', key: 'ENG', description: 'Product engineering team' },
        { id: '2', name: 'Product', key: 'PROD', description: 'Product management team' },
        { id: '3', name: 'Design', key: 'DES', description: 'Design and UX team' }
      ];

      for (const linearTeam of mockLinearTeams) {
        const team = this.convertLinearTeam(linearTeam);
        dbQueries.upsertTeam(team);
      }

      dbQueries.updateSyncStatus('teams');
      return dbQueries.getAllTeams();
    } catch (error) {
      console.error('Failed to sync teams from backend:', error);
      return dbQueries.getAllTeams();
    }
  }

  async getProjects(forceSync = false): Promise<Project[]> {
    if (!forceSync && !await this.shouldSync('projects')) {
      return dbQueries.getAllProjects();
    }

    try {
      // TODO: Integrate with MCP Linear backend when available
      // const linearProjects = await mcp__linear_server__list_projects();
      
      // Mock data
      const mockLinearProjects: LinearProject[] = [
        { id: '1', name: 'Mobile App Redesign', state: 'In Progress', team: { name: 'Design' } },
        { id: '2', name: 'API v2', state: 'Planning', team: { name: 'Engineering' } },
        { id: '3', name: 'User Onboarding', state: 'Completed', team: { name: 'Product' } }
      ];

      for (const linearProject of mockLinearProjects) {
        const project = this.convertLinearProject(linearProject);
        dbQueries.upsertProject(project);
      }

      dbQueries.updateSyncStatus('projects');
      return dbQueries.getAllProjects();
    } catch (error) {
      console.error('Failed to sync projects from backend:', error);
      return dbQueries.getAllProjects();
    }
  }

  async getLabels(forceSync = false): Promise<Label[]> {
    if (!forceSync && !await this.shouldSync('labels')) {
      return dbQueries.getAllLabels();
    }

    try {
      // TODO: Integrate with MCP Linear backend when available
      // const linearLabels = await mcp__linear_server__list_labels();
      
      // Mock data - labels are already synced when issues are synced
      // Just return the labels from database
      return dbQueries.getAllLabels();
    } catch (error) {
      console.error('Failed to sync labels from backend:', error);
      return dbQueries.getAllLabels();
    }
  }

  async getComments(issueId: string, forceSync = false): Promise<Comment[]> {
    if (!forceSync && !await this.shouldSync(`comments_${issueId}`)) {
      return dbQueries.getCommentsByIssueId(issueId);
    }

    try {
      // TODO: Integrate with MCP Linear backend when available
      // const linearComments = await mcp__linear_server__list_comments({ issueId });
      
      // Mock data for demonstration
      const mockLinearComments: LinearComment[] = [
        {
          id: `comment_${issueId}_1`,
          body: 'This seems like a critical issue. I noticed the same behavior when testing with OAuth2 providers.',
          user: { name: 'Alice Johnson' },
          createdAt: '2024-01-16T09:15:00Z',
          updatedAt: '2024-01-16T09:15:00Z'
        },
        {
          id: `comment_${issueId}_2`,
          body: 'I can reproduce this. The token refresh endpoint is returning 401 errors intermittently.',
          user: { name: 'Bob Smith' },
          createdAt: '2024-01-16T11:30:00Z',
          updatedAt: '2024-01-16T11:30:00Z'
        },
        {
          id: `comment_${issueId}_3`,
          body: 'I think the issue is in the token validation middleware. Looking into it now.',
          user: { name: 'You' },
          createdAt: '2024-01-16T14:45:00Z',
          updatedAt: '2024-01-16T14:45:00Z',
          parent: { id: `comment_${issueId}_2` }
        }
      ];

      // Sync to local database
      for (const linearComment of mockLinearComments) {
        const comment = this.convertLinearComment(linearComment, issueId);
        dbQueries.upsertComment(comment);
      }

      dbQueries.updateSyncStatus(`comments_${issueId}`);
      return dbQueries.getCommentsByIssueId(issueId);
    } catch (error) {
      console.error('Failed to sync comments from backend:', error);
      return dbQueries.getCommentsByIssueId(issueId);
    }
  }

  async getComment(commentId: string): Promise<Comment | null> {
    try {
      // TODO: Integrate with MCP Linear backend when available
      // const linearComment = await mcp__linear_server__get_comment({ id: commentId });
      
      return dbQueries.getCommentById(commentId);
    } catch (error) {
      console.error('Failed to fetch comment from backend:', error);
      return dbQueries.getCommentById(commentId);
    }
  }

  async addComment(issueId: string, content: string, parentId?: string): Promise<Comment | null> {
    try {
      // TODO: Integrate with MCP Linear backend when available
      // const linearComment = await mcp__linear_server__add_comment({ issueId, content, parentId });
      
      // Mock implementation - generate comment
      const now = new Date().toISOString();
      const comment: Comment = {
        id: `comment_${issueId}_${Date.now()}`,
        issue_id: issueId,
        author: 'You',
        content,
        created_at: now,
        updated_at: now,
        parent_id: parentId
      };

      dbQueries.upsertComment(comment);
      return comment;
    } catch (error) {
      console.error('Failed to add comment to backend:', error);
      return null;
    }
  }
}

export const linearService = new LinearService();