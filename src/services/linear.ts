import { dbQueries, type Issue, type Team, type Project } from '../utils/database.ts';

// Note: These would be replaced with actual MCP Linear commands
// For now, simulating the MCP command structure

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

class LinearService {
  private async shouldSync(entity: string, maxAgeMinutes = 5): Promise<boolean> {
    const status = dbQueries.getSyncStatus(entity);
    if (!status) return true;
    
    const lastSync = new Date(status.last_sync);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    
    return diffMinutes > maxAgeMinutes;
  }

  private convertLinearIssue(linearIssue: LinearIssue): Issue {
    return {
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

  async getIssues(forceSync = false): Promise<Issue[]> {
    if (!forceSync && !await this.shouldSync('issues')) {
      return dbQueries.getAllIssues();
    }

    try {
      // TODO: Replace with actual MCP Linear command
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
          updatedAt: '2024-01-16T14:22:00Z'
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
          updatedAt: '2024-01-15T16:45:00Z'
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
          updatedAt: '2024-01-13T14:30:00Z'
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
      console.error('Failed to sync issues from Linear:', error);
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
      // TODO: Replace with actual MCP Linear command
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
        updatedAt: '2024-01-16T14:22:00Z'
      };

      const issue = this.convertLinearIssue(mockLinearIssue);
      dbQueries.upsertIssue(issue);
      return issue;
    } catch (error) {
      console.error('Failed to fetch issue from Linear:', error);
      return dbQueries.getIssueById(id);
    }
  }

  async searchIssues(query: string): Promise<Issue[]> {
    // First try local search
    const localResults = dbQueries.searchIssues(query);
    
    // TODO: Also search Linear directly with MCP command
    // const linearResults = await mcp__linear_server__list_issues({ query });
    
    return localResults;
  }

  async getTeams(forceSync = false): Promise<Team[]> {
    if (!forceSync && !await this.shouldSync('teams')) {
      return dbQueries.getAllTeams();
    }

    try {
      // TODO: Replace with actual MCP Linear command
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
      console.error('Failed to sync teams from Linear:', error);
      return dbQueries.getAllTeams();
    }
  }

  async getProjects(forceSync = false): Promise<Project[]> {
    if (!forceSync && !await this.shouldSync('projects')) {
      return dbQueries.getAllProjects();
    }

    try {
      // TODO: Replace with actual MCP Linear command
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
      console.error('Failed to sync projects from Linear:', error);
      return dbQueries.getAllProjects();
    }
  }
}

export const linearService = new LinearService();