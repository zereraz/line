import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { dbQueries, type Issue, type Team, type Project } from './database.ts';

// Create an in-memory test database
const createTestDb = () => {
  const testDb = new Database(':memory:');
  
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      state_name TEXT,
      assignee_name TEXT,
      team_name TEXT,
      priority INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key TEXT,
      description TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT,
      team_name TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_status (
      entity TEXT PRIMARY KEY,
      last_sync TEXT
    );
  `);
  
  return testDb;
};

// Mock the database module for testing
const mockDbQueries = (testDb: Database) => ({
  getAllIssues: () => testDb.query<Issue, []>('SELECT * FROM issues ORDER BY updated_at DESC').all(),
  getMyIssues: (assigneeName: string) => 
    testDb.query<Issue, [string]>('SELECT * FROM issues WHERE assignee_name = ? ORDER BY updated_at DESC').all(assigneeName),
  getIssueById: (id: string) => 
    testDb.query<Issue, [string]>('SELECT * FROM issues WHERE id = ?').get(id),
  searchIssues: (query: string) =>
    testDb.query<Issue, [string, string]>('SELECT * FROM issues WHERE title LIKE ? OR description LIKE ? ORDER BY updated_at DESC').all(`%${query}%`, `%${query}%`),
  
  getAllTeams: () => testDb.query<Team, []>('SELECT * FROM teams ORDER BY name').all(),
  getTeamById: (id: string) => 
    testDb.query<Team, [string]>('SELECT * FROM teams WHERE id = ?').get(id),
  
  getAllProjects: () => testDb.query<Project, []>('SELECT * FROM projects ORDER BY name').all(),
  getProjectById: (id: string) => 
    testDb.query<Project, [string]>('SELECT * FROM projects WHERE id = ?').get(id),

  upsertIssue: (issue: Issue) => {
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO issues 
      (id, title, description, state_name, assignee_name, team_name, priority, created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(issue.id, issue.title, issue.description, issue.state_name, 
             issue.assignee_name, issue.team_name, issue.priority, 
             issue.created_at, issue.updated_at);
  },

  upsertTeam: (team: Team) => {
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO teams 
      (id, name, key, description, synced_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(team.id, team.name, team.key, team.description);
  },

  upsertProject: (project: Project) => {
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO projects 
      (id, name, status, team_name, synced_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(project.id, project.name, project.status, project.team_name);
  },

  updateSyncStatus: (entity: string) => {
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO sync_status (entity, last_sync)
      VALUES (?, CURRENT_TIMESTAMP)
    `);
    stmt.run(entity);
  },

  getSyncStatus: (entity: string) => 
    testDb.query<{entity: string, last_sync: string}, [string]>('SELECT * FROM sync_status WHERE entity = ?').get(entity)
});

describe('Database Operations', () => {
  let testDb: Database;
  let testQueries: ReturnType<typeof mockDbQueries>;

  beforeEach(() => {
    testDb = createTestDb();
    testQueries = mockDbQueries(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  describe('Issue Operations', () => {
    const sampleIssue: Issue = {
      id: 'TEST-123',
      title: 'Test Issue',
      description: 'This is a test issue',
      state_name: 'In Progress',
      assignee_name: 'John Doe',
      team_name: 'Engineering',
      priority: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    };

    test('should insert and retrieve an issue', () => {
      testQueries.upsertIssue(sampleIssue);
      
      const retrieved = testQueries.getIssueById('TEST-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Test Issue');
      expect(retrieved?.priority).toBe(1);
    });

    test('should update existing issue', () => {
      testQueries.upsertIssue(sampleIssue);
      
      const updatedIssue = { ...sampleIssue, title: 'Updated Test Issue' };
      testQueries.upsertIssue(updatedIssue);
      
      const retrieved = testQueries.getIssueById('TEST-123');
      expect(retrieved?.title).toBe('Updated Test Issue');
    });

    test('should get all issues', () => {
      testQueries.upsertIssue(sampleIssue);
      testQueries.upsertIssue({
        ...sampleIssue,
        id: 'TEST-124',
        title: 'Another Test Issue'
      });
      
      const allIssues = testQueries.getAllIssues();
      expect(allIssues).toHaveLength(2);
    });

    test('should get my issues', () => {
      testQueries.upsertIssue(sampleIssue);
      testQueries.upsertIssue({
        ...sampleIssue,
        id: 'TEST-124',
        assignee_name: 'Alice'
      });
      
      const myIssues = testQueries.getMyIssues('John Doe');
      expect(myIssues).toHaveLength(1);
      expect(myIssues[0].id).toBe('TEST-123');
    });

    test('should search issues by title', () => {
      testQueries.upsertIssue(sampleIssue);
      testQueries.upsertIssue({
        ...sampleIssue,
        id: 'TEST-124',
        title: 'Bug Fix',
        description: 'Fix authentication bug'
      });
      
      const searchResults = testQueries.searchIssues('Test');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].title).toBe('Test Issue');
      
      const bugResults = testQueries.searchIssues('Bug');
      expect(bugResults).toHaveLength(1);
      expect(bugResults[0].title).toBe('Bug Fix');
    });

    test('should search issues by description', () => {
      testQueries.upsertIssue(sampleIssue);
      
      const searchResults = testQueries.searchIssues('test issue');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].description).toBe('This is a test issue');
    });
  });

  describe('Team Operations', () => {
    const sampleTeam: Team = {
      id: 'team-1',
      name: 'Engineering',
      key: 'ENG',
      description: 'Product engineering team'
    };

    test('should insert and retrieve a team', () => {
      testQueries.upsertTeam(sampleTeam);
      
      const retrieved = testQueries.getTeamById('team-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Engineering');
      expect(retrieved?.key).toBe('ENG');
    });

    test('should get all teams', () => {
      testQueries.upsertTeam(sampleTeam);
      testQueries.upsertTeam({
        id: 'team-2',
        name: 'Product',
        key: 'PROD'
      });
      
      const allTeams = testQueries.getAllTeams();
      expect(allTeams).toHaveLength(2);
      // Should be sorted by name
      expect(allTeams[0].name).toBe('Engineering');
      expect(allTeams[1].name).toBe('Product');
    });
  });

  describe('Project Operations', () => {
    const sampleProject: Project = {
      id: 'proj-1',
      name: 'Mobile App',
      status: 'In Progress',
      team_name: 'Engineering'
    };

    test('should insert and retrieve a project', () => {
      testQueries.upsertProject(sampleProject);
      
      const retrieved = testQueries.getProjectById('proj-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Mobile App');
      expect(retrieved?.status).toBe('In Progress');
    });

    test('should get all projects', () => {
      testQueries.upsertProject(sampleProject);
      testQueries.upsertProject({
        id: 'proj-2',
        name: 'API v2',
        status: 'Planning',
        team_name: 'Backend'
      });
      
      const allProjects = testQueries.getAllProjects();
      expect(allProjects).toHaveLength(2);
    });
  });

  describe('Sync Status Operations', () => {
    test('should update and retrieve sync status', () => {
      testQueries.updateSyncStatus('issues');
      
      const status = testQueries.getSyncStatus('issues');
      expect(status).not.toBeNull();
      expect(status?.entity).toBe('issues');
      expect(status?.last_sync).toBeTruthy();
    });

    test('should return null for non-existent sync status', () => {
      const status = testQueries.getSyncStatus('non-existent');
      expect(status).toBeNull();
    });
  });
});