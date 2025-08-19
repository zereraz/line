import { Database } from 'bun:sqlite';
import { join } from 'path';
import { homedir } from 'os';

const dbPath = join(homedir(), '.line', 'data.db');

// Use the same database instance as the main database
export const userDb = new Database(dbPath);

// Database schema version for migrations
const CURRENT_SCHEMA_VERSION = 1;

// Initialize user and workspace management tables
userDb.exec(`
  -- Schema versioning table
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Users table - stores user credentials and session info
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                    -- UUID or user identifier
    username TEXT UNIQUE NOT NULL,          -- username or email
    display_name TEXT,                      -- human-readable name
    email TEXT,                             -- user email
    auth_provider TEXT DEFAULT 'local',     -- 'local', 'linear', 'github', etc.
    auth_token_hash TEXT,                   -- hashed auth token (for security)
    refresh_token_hash TEXT,                -- hashed refresh token
    token_expires_at DATETIME,              -- token expiration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT true
  );

  -- Workspaces table - isolated environments for data
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,                    -- UUID for workspace
    name TEXT NOT NULL,                     -- workspace display name
    slug TEXT UNIQUE NOT NULL,              -- URL-safe identifier
    description TEXT,                       -- workspace description
    owner_id TEXT NOT NULL,                 -- user who owns the workspace
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    settings TEXT,                          -- JSON settings for the workspace
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- User workspace memberships - many-to-many relationship
  CREATE TABLE IF NOT EXISTS workspace_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member',             -- 'owner', 'admin', 'member', 'viewer'
    permissions TEXT,                       -- JSON permissions object
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(workspace_id, user_id)
  );

  -- User sessions - track active sessions
  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,                    -- session token
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,             -- current workspace for session
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
  CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
  CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_workspace ON user_sessions(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
`);

// Migration system
export interface Migration {
  version: number;
  description: string;
  up: string[];
  down: string[];
}

const migrations: Migration[] = [
  {
    version: 1,
    description: "Add workspace_id to existing tables",
    up: [
      // Add workspace_id to existing tables
      "ALTER TABLE issues ADD COLUMN workspace_id TEXT",
      "ALTER TABLE teams ADD COLUMN workspace_id TEXT", 
      "ALTER TABLE projects ADD COLUMN workspace_id TEXT",
      "ALTER TABLE labels ADD COLUMN workspace_id TEXT",
      "ALTER TABLE comments ADD COLUMN workspace_id TEXT",
      "ALTER TABLE line_tasks ADD COLUMN workspace_id TEXT",
      "ALTER TABLE sync_status ADD COLUMN workspace_id TEXT",
      
      // Add user tracking columns
      "ALTER TABLE issues ADD COLUMN created_by TEXT",
      "ALTER TABLE issues ADD COLUMN updated_by TEXT",
      "ALTER TABLE teams ADD COLUMN created_by TEXT",
      "ALTER TABLE projects ADD COLUMN created_by TEXT",
      "ALTER TABLE line_tasks ADD COLUMN created_by TEXT",
      "ALTER TABLE line_tasks ADD COLUMN updated_by TEXT",
      "ALTER TABLE comments ADD COLUMN created_by TEXT",
      
      // Create indexes for workspace filtering
      "CREATE INDEX IF NOT EXISTS idx_issues_workspace ON issues(workspace_id)",
      "CREATE INDEX IF NOT EXISTS idx_teams_workspace ON teams(workspace_id)",
      "CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id)",
      "CREATE INDEX IF NOT EXISTS idx_labels_workspace ON labels(workspace_id)",
      "CREATE INDEX IF NOT EXISTS idx_comments_workspace ON comments(workspace_id)",
      "CREATE INDEX IF NOT EXISTS idx_line_tasks_workspace ON line_tasks(workspace_id)",
      "CREATE INDEX IF NOT EXISTS idx_sync_status_workspace ON sync_status(workspace_id)",
      
      // Create indexes for user tracking
      "CREATE INDEX IF NOT EXISTS idx_issues_created_by ON issues(created_by)",
      "CREATE INDEX IF NOT EXISTS idx_issues_updated_by ON issues(updated_by)",
      "CREATE INDEX IF NOT EXISTS idx_line_tasks_created_by ON line_tasks(created_by)",
      "CREATE INDEX IF NOT EXISTS idx_line_tasks_updated_by ON line_tasks(updated_by)",
      "CREATE INDEX IF NOT EXISTS idx_comments_created_by ON comments(created_by)"
    ],
    down: [
      // Remove workspace and user columns (note: SQLite doesn't support DROP COLUMN easily)
      // This would require recreating tables, so we'll handle it separately if needed
    ]
  }
];

export interface User {
  id: string;
  username: string;
  display_name?: string;
  email?: string;
  auth_provider: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  settings?: string;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions?: string;
  joined_at: string;
  last_accessed?: string;
  is_active: boolean;
}

export interface UserSession {
  id: string;
  user_id: string;
  workspace_id: string;
  created_at: string;
  expires_at: string;
  last_activity: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

class UserDatabase {
  
  // Migration system
  async runMigrations(): Promise<void> {
    // Get current schema version
    const versionResult = userDb.query<{version: number}, []>(
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    ).get();
    
    const currentVersion = versionResult?.version || 0;
    
    // Run migrations that haven't been applied
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        console.log(`Running migration ${migration.version}: ${migration.description}`);
        
        try {
          userDb.transaction(() => {
            for (const sql of migration.up) {
              userDb.exec(sql);
            }
            
            // Record migration
            userDb.exec(`
              INSERT INTO schema_version (version) VALUES (${migration.version})
            `);
          })();
          
          console.log(`Migration ${migration.version} completed successfully`);
        } catch (error) {
          console.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }
  }

  // User management
  createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const stmt = userDb.prepare(`
      INSERT INTO users 
      (id, username, display_name, email, auth_provider, created_at, updated_at, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, userData.username, userData.display_name, userData.email,
      userData.auth_provider, now, now, userData.is_active
    );
    
    return this.getUserById(id)!;
  }

  getUserById(id: string): User | null {
    const stmt = userDb.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | null;
  }

  getUserByUsername(username: string): User | null {
    const stmt = userDb.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username) as User | null;
  }

  updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): User | null {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) return this.getUserById(id);
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const stmt = userDb.prepare(`
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getUserById(id);
  }

  // Workspace management
  createWorkspace(workspaceData: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>): Workspace {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const stmt = userDb.prepare(`
      INSERT INTO workspaces 
      (id, name, slug, description, owner_id, created_at, updated_at, is_active, settings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, workspaceData.name, workspaceData.slug, workspaceData.description,
      workspaceData.owner_id, now, now, workspaceData.is_active, workspaceData.settings
    );
    
    // Add owner as workspace member
    this.addWorkspaceMember(id, workspaceData.owner_id, 'owner');
    
    return this.getWorkspaceById(id)!;
  }

  getWorkspaceById(id: string): Workspace | null {
    const stmt = userDb.prepare('SELECT * FROM workspaces WHERE id = ?');
    return stmt.get(id) as Workspace | null;
  }

  getWorkspaceBySlug(slug: string): Workspace | null {
    const stmt = userDb.prepare('SELECT * FROM workspaces WHERE slug = ?');
    return stmt.get(slug) as Workspace | null;
  }

  getUserWorkspaces(userId: string): Workspace[] {
    const stmt = userDb.prepare(`
      SELECT w.* FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE wm.user_id = ? AND w.is_active = true AND wm.is_active = true
      ORDER BY w.name
    `);
    return stmt.all(userId) as Workspace[];
  }

  // Workspace membership
  addWorkspaceMember(workspaceId: string, userId: string, role: 'owner' | 'admin' | 'member' | 'viewer'): WorkspaceMember {
    const stmt = userDb.prepare(`
      INSERT INTO workspace_members 
      (workspace_id, user_id, role, joined_at, is_active)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(workspaceId, userId, role, new Date().toISOString(), true);
    
    const member = userDb.prepare(
      'SELECT * FROM workspace_members WHERE id = ?'
    ).get(result.lastInsertRowid) as WorkspaceMember;
    
    return member;
  }

  getWorkspaceMembers(workspaceId: string): (WorkspaceMember & User)[] {
    const stmt = userDb.prepare(`
      SELECT wm.*, u.username, u.display_name, u.email
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.id
      WHERE wm.workspace_id = ? AND wm.is_active = true
      ORDER BY wm.role, u.display_name
    `);
    return stmt.all(workspaceId) as (WorkspaceMember & User)[];
  }

  getUserWorkspaceMembership(userId: string, workspaceId: string): WorkspaceMember | null {
    const stmt = userDb.prepare(`
      SELECT * FROM workspace_members 
      WHERE user_id = ? AND workspace_id = ? AND is_active = true
    `);
    return stmt.get(userId, workspaceId) as WorkspaceMember | null;
  }

  // Session management
  createSession(userId: string, workspaceId: string, expiresIn: number = 24 * 60 * 60 * 1000): UserSession {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn);
    
    const stmt = userDb.prepare(`
      INSERT INTO user_sessions 
      (id, user_id, workspace_id, created_at, expires_at, last_activity, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      sessionId, userId, workspaceId, now.toISOString(), 
      expiresAt.toISOString(), now.toISOString(), true
    );
    
    return this.getSessionById(sessionId)!;
  }

  getSessionById(sessionId: string): UserSession | null {
    const stmt = userDb.prepare(`
      SELECT * FROM user_sessions 
      WHERE id = ? AND is_active = true AND expires_at > datetime('now')
    `);
    return stmt.get(sessionId) as UserSession | null;
  }

  updateSessionActivity(sessionId: string): void {
    const stmt = userDb.prepare(`
      UPDATE user_sessions 
      SET last_activity = datetime('now')
      WHERE id = ?
    `);
    stmt.run(sessionId);
  }

  invalidateSession(sessionId: string): void {
    const stmt = userDb.prepare(`
      UPDATE user_sessions 
      SET is_active = false
      WHERE id = ?
    `);
    stmt.run(sessionId);
  }

  invalidateUserSessions(userId: string): void {
    const stmt = userDb.prepare(`
      UPDATE user_sessions 
      SET is_active = false
      WHERE user_id = ?
    `);
    stmt.run(userId);
  }

  // Cleanup expired sessions
  cleanupExpiredSessions(): number {
    const stmt = userDb.prepare(`
      UPDATE user_sessions 
      SET is_active = false
      WHERE expires_at <= datetime('now')
    `);
    const result = stmt.run();
    return result.changes;
  }
}

export const userDatabase = new UserDatabase();

// Initialize migrations on import
userDatabase.runMigrations().catch(console.error);