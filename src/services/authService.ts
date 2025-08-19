import { userDatabase, type User, type Workspace, type UserSession } from '../utils/userDatabase.ts';
import { join } from 'path';
import { homedir } from 'os';
import { createHash, randomBytes } from 'crypto';

// Session storage path for secure credential management
const SESSION_FILE_PATH = join(homedir(), '.line', 'session.json');
const KEYCHAIN_SERVICE = 'line-cli';

export interface AuthContext {
  user: User;
  workspace: Workspace;
  session: UserSession;
  hasValidSession: boolean;
}

export interface LoginCredentials {
  username: string;
  password?: string;
  token?: string;
  provider?: 'local' | 'linear' | 'github';
}

export interface WorkspaceCreateOptions {
  name: string;
  slug: string;
  description?: string;
}

class AuthService {
  private currentContext: AuthContext | null = null;

  // Hash utilities for secure token storage
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  // Keychain integration for secure credential storage
  private async storeSecureCredential(key: string, value: string): Promise<void> {
    try {
      // Try to use system keychain if available
      if (process.platform === 'darwin') {
        // macOS Keychain
        await Bun.$`security add-generic-password -a "${key}" -s "${KEYCHAIN_SERVICE}" -w "${value}" -U`.quiet();
      } else if (process.platform === 'linux') {
        // Linux Secret Service / gnome-keyring
        const secretTool = await Bun.which('secret-tool');
        if (secretTool) {
          await Bun.$`secret-tool store --label="Line CLI ${key}" service "${KEYCHAIN_SERVICE}" account "${key}" "${value}"`.quiet();
        } else {
          // Fallback to encrypted file storage
          await this.storeEncryptedFile(key, value);
        }
      } else {
        // Windows or other platforms - use encrypted file storage
        await this.storeEncryptedFile(key, value);
      }
    } catch (error) {
      console.warn('Failed to store in system keychain, using encrypted file storage:', error);
      await this.storeEncryptedFile(key, value);
    }
  }

  private async retrieveSecureCredential(key: string): Promise<string | null> {
    try {
      if (process.platform === 'darwin') {
        // macOS Keychain
        const result = await Bun.$`security find-generic-password -a "${key}" -s "${KEYCHAIN_SERVICE}" -w`.quiet();
        return result.stdout.toString().trim() || null;
      } else if (process.platform === 'linux') {
        const secretTool = await Bun.which('secret-tool');
        if (secretTool) {
          const result = await Bun.$`secret-tool lookup service "${KEYCHAIN_SERVICE}" account "${key}"`.quiet();
          return result.stdout.toString().trim() || null;
        } else {
          return await this.retrieveEncryptedFile(key);
        }
      } else {
        return await this.retrieveEncryptedFile(key);
      }
    } catch (error) {
      console.warn('Failed to retrieve from system keychain, trying encrypted file storage:', error);
      return await this.retrieveEncryptedFile(key);
    }
  }

  private async deleteSecureCredential(key: string): Promise<void> {
    try {
      if (process.platform === 'darwin') {
        await Bun.$`security delete-generic-password -a "${key}" -s "${KEYCHAIN_SERVICE}"`.quiet();
      } else if (process.platform === 'linux') {
        const secretTool = await Bun.which('secret-tool');
        if (secretTool) {
          await Bun.$`secret-tool clear service "${KEYCHAIN_SERVICE}" account "${key}"`.quiet();
        } else {
          await this.deleteEncryptedFile(key);
        }
      } else {
        await this.deleteEncryptedFile(key);
      }
    } catch (error) {
      console.warn('Failed to delete from system keychain:', error);
      await this.deleteEncryptedFile(key);
    }
  }

  // Encrypted file storage fallback
  private async storeEncryptedFile(key: string, value: string): Promise<void> {
    const credentialsPath = join(homedir(), '.line', 'credentials.enc');
    
    try {
      // Simple encryption using built-in crypto
      const cipher = createHash('sha256').update(`${key}:${process.env.USER || 'default'}`).digest();
      const encrypted = Buffer.from(value).map((byte, i) => byte ^ cipher[i % cipher.length]);
      
      let existingData: Record<string, string> = {};
      try {
        const existing = await Bun.file(credentialsPath).text();
        existingData = JSON.parse(existing);
      } catch {
        // File doesn't exist or is corrupted, start fresh
      }
      
      existingData[key] = encrypted.toString('base64');
      await Bun.write(credentialsPath, JSON.stringify(existingData));
    } catch (error) {
      console.error('Failed to store encrypted credential:', error);
      throw new Error('Failed to securely store credentials');
    }
  }

  private async retrieveEncryptedFile(key: string): Promise<string | null> {
    const credentialsPath = join(homedir(), '.line', 'credentials.enc');
    
    try {
      const data = await Bun.file(credentialsPath).text();
      const credentials = JSON.parse(data);
      
      if (!credentials[key]) return null;
      
      const cipher = createHash('sha256').update(`${key}:${process.env.USER || 'default'}`).digest();
      const encrypted = Buffer.from(credentials[key], 'base64');
      const decrypted = encrypted.map((byte, i) => byte ^ cipher[i % cipher.length]);
      
      return decrypted.toString();
    } catch {
      return null;
    }
  }

  private async deleteEncryptedFile(key: string): Promise<void> {
    const credentialsPath = join(homedir(), '.line', 'credentials.enc');
    
    try {
      const data = await Bun.file(credentialsPath).text();
      const credentials = JSON.parse(data);
      delete credentials[key];
      await Bun.write(credentialsPath, JSON.stringify(credentials));
    } catch {
      // File doesn't exist or is corrupted, nothing to delete
    }
  }

  // Session management
  private async loadSession(): Promise<AuthContext | null> {
    try {
      const sessionData = await Bun.file(SESSION_FILE_PATH).text();
      const { sessionId } = JSON.parse(sessionData);
      
      if (!sessionId) return null;
      
      const session = userDatabase.getSessionById(sessionId);
      if (!session) return null;
      
      const user = userDatabase.getUserById(session.user_id);
      const workspace = userDatabase.getWorkspaceById(session.workspace_id);
      
      if (!user || !workspace) return null;
      
      // Update session activity
      userDatabase.updateSessionActivity(sessionId);
      
      return {
        user,
        workspace,
        session,
        hasValidSession: true
      };
    } catch {
      return null;
    }
  }

  private async saveSession(session: UserSession): Promise<void> {
    try {
      await Bun.write(SESSION_FILE_PATH, JSON.stringify({
        sessionId: session.id,
        userId: session.user_id,
        workspaceId: session.workspace_id
      }));
    } catch (error) {
      console.error('Failed to save session:', error);
      throw new Error('Failed to save session');
    }
  }

  private async clearSession(): Promise<void> {
    try {
      await Bun.write(SESSION_FILE_PATH, '{}');
    } catch (error) {
      console.warn('Failed to clear session file:', error);
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthContext> {
    const { username, password, token, provider = 'local' } = credentials;
    
    // Check if user exists
    let user = userDatabase.getUserByUsername(username);
    
    if (!user) {
      // Create new user for first-time login
      user = userDatabase.createUser({
        username,
        display_name: username,
        auth_provider: provider,
        is_active: true
      });
      
      // Create default workspace for new user
      const workspace = await this.createWorkspace(user.id, {
        name: `${username}'s Workspace`,
        slug: `${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-workspace`,
        description: 'Personal workspace'
      });
      
      // Store credentials securely if provided
      if (token) {
        await this.storeSecureCredential(`${user.id}:token`, token);
        userDatabase.updateUser(user.id, {
          auth_token_hash: this.hashToken(token)
        });
      }
      
      // Create session
      const session = userDatabase.createSession(user.id, workspace.id);
      await this.saveSession(session);
      
      const context: AuthContext = {
        user,
        workspace,
        session,
        hasValidSession: true
      };
      
      this.currentContext = context;
      return context;
    }
    
    // Existing user - validate credentials
    if (token) {
      const hashedToken = this.hashToken(token);
      if (user.auth_token_hash !== hashedToken) {
        throw new Error('Invalid credentials');
      }
      
      // Update stored token
      await this.storeSecureCredential(`${user.id}:token`, token);
    }
    
    // Get user's workspaces
    const workspaces = userDatabase.getUserWorkspaces(user.id);
    if (workspaces.length === 0) {
      throw new Error('User has no accessible workspaces');
    }
    
    // Use first workspace as default
    const workspace = workspaces[0];
    
    // Create new session
    const session = userDatabase.createSession(user.id, workspace.id);
    await this.saveSession(session);
    
    // Update last login
    userDatabase.updateUser(user.id, {
      last_login: new Date().toISOString()
    });
    
    const context: AuthContext = {
      user,
      workspace,
      session,
      hasValidSession: true
    };
    
    this.currentContext = context;
    return context;
  }

  async logout(): Promise<void> {
    if (this.currentContext?.session) {
      userDatabase.invalidateSession(this.currentContext.session.id);
    }
    
    await this.clearSession();
    this.currentContext = null;
  }

  async getCurrentContext(): Promise<AuthContext | null> {
    if (this.currentContext) {
      return this.currentContext;
    }
    
    // Try to load from saved session
    this.currentContext = await this.loadSession();
    return this.currentContext;
  }

  async requireAuth(): Promise<AuthContext> {
    const context = await this.getCurrentContext();
    if (!context) {
      throw new Error('Authentication required. Please run "line auth login" first.');
    }
    return context;
  }

  // Workspace management
  async createWorkspace(ownerId: string, options: WorkspaceCreateOptions): Promise<Workspace> {
    // Check if slug is available
    const existing = userDatabase.getWorkspaceBySlug(options.slug);
    if (existing) {
      throw new Error(`Workspace slug "${options.slug}" is already taken`);
    }
    
    return userDatabase.createWorkspace({
      name: options.name,
      slug: options.slug,
      description: options.description,
      owner_id: ownerId,
      is_active: true
    });
  }

  async switchWorkspace(workspaceId: string): Promise<AuthContext> {
    const context = await this.requireAuth();
    
    // Check if user has access to workspace
    const membership = userDatabase.getUserWorkspaceMembership(
      context.user.id, 
      workspaceId
    );
    
    if (!membership) {
      throw new Error('You do not have access to this workspace');
    }
    
    const workspace = userDatabase.getWorkspaceById(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    
    // Invalidate current session
    userDatabase.invalidateSession(context.session.id);
    
    // Create new session in the target workspace
    const newSession = userDatabase.createSession(context.user.id, workspaceId);
    await this.saveSession(newSession);
    
    const newContext: AuthContext = {
      user: context.user,
      workspace,
      session: newSession,
      hasValidSession: true
    };
    
    this.currentContext = newContext;
    return newContext;
  }

  async getUserWorkspaces(): Promise<Workspace[]> {
    const context = await this.requireAuth();
    return userDatabase.getUserWorkspaces(context.user.id);
  }

  // Token management for external services
  async storeExternalToken(service: string, token: string): Promise<void> {
    const context = await this.requireAuth();
    const key = `${context.user.id}:${service}:token`;
    await this.storeSecureCredential(key, token);
  }

  async getExternalToken(service: string): Promise<string | null> {
    const context = await this.requireAuth();
    const key = `${context.user.id}:${service}:token`;
    return await this.retrieveSecureCredential(key);
  }

  async removeExternalToken(service: string): Promise<void> {
    const context = await this.requireAuth();
    const key = `${context.user.id}:${service}:token`;
    await this.deleteSecureCredential(key);
  }

  // Status and health checks
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    user?: User;
    workspace?: Workspace;
    session?: UserSession;
  }> {
    const context = await this.getCurrentContext();
    
    if (!context) {
      return { isAuthenticated: false };
    }
    
    return {
      isAuthenticated: true,
      user: context.user,
      workspace: context.workspace,
      session: context.session
    };
  }

  // Cleanup utilities
  async cleanup(): Promise<void> {
    // Clean up expired sessions
    const cleaned = userDatabase.cleanupExpiredSessions();
    console.log(`Cleaned up ${cleaned} expired sessions`);
  }
}

export const authService = new AuthService();