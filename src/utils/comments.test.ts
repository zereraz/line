import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { dbQueries, type Comment } from './database.ts';

// Create an in-memory test database for comments
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

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      parent_id TEXT,
      synced_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_id) REFERENCES issues (id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_comments_issue_id ON comments(issue_id);
    CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
  `);
  
  return testDb;
};

// Mock the database module for testing
const mockDbQueries = (testDb: Database) => ({
  // Comments
  getCommentsByIssueId: (issueId: string): Comment[] => {
    const allComments = testDb.query<Comment, [string]>('SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC').all(issueId);
    return buildCommentTree(allComments);
  },

  getCommentById: (id: string) => 
    testDb.query<Comment, [string]>('SELECT * FROM comments WHERE id = ?').get(id),

  getAllComments: () => 
    testDb.query<Comment, []>('SELECT * FROM comments ORDER BY created_at DESC').all(),

  upsertComment: (comment: Comment) => {
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO comments 
      (id, issue_id, author, content, created_at, updated_at, parent_id, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(comment.id, comment.issue_id, comment.author, comment.content, 
             comment.created_at, comment.updated_at, comment.parent_id);
  },

  deleteComment: (id: string) => {
    const stmt = testDb.prepare('DELETE FROM comments WHERE id = ?');
    stmt.run(id);
  },

  upsertIssue: (issue: any) => {
    const stmt = testDb.prepare(`
      INSERT OR REPLACE INTO issues 
      (id, title, description, state_name, assignee_name, team_name, priority, created_at, updated_at, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(issue.id, issue.title, issue.description, issue.state_name, 
             issue.assignee_name, issue.team_name, issue.priority, 
             issue.created_at, issue.updated_at);
  }
});

// Helper function to build comment tree with replies
function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create map and initialize replies arrays
  comments.forEach(comment => {
    comment.replies = [];
    commentMap.set(comment.id, comment);
  });

  // Second pass: build tree structure
  comments.forEach(comment => {
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies!.push(comment);
      }
    } else {
      rootComments.push(comment);
    }
  });

  return rootComments;
}

describe('Comment Database Operations', () => {
  let testDb: Database;
  let testQueries: ReturnType<typeof mockDbQueries>;

  beforeEach(() => {
    testDb = createTestDb();
    testQueries = mockDbQueries(testDb);
    
    // Insert test issue
    testQueries.upsertIssue({
      id: 'TEST-123',
      title: 'Test Issue',
      description: 'Test issue for comments',
      state_name: 'In Progress',
      assignee_name: 'Test User',
      team_name: 'Test Team',
      priority: 2,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    });
  });

  afterEach(() => {
    testDb.close();
  });

  test('should create and retrieve a comment', () => {
    const comment: Comment = {
      id: 'comment-1',
      issue_id: 'TEST-123',
      author: 'John Doe',
      content: 'This is a test comment',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z'
    };

    testQueries.upsertComment(comment);
    
    const retrieved = testQueries.getCommentById('comment-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toBe('This is a test comment');
    expect(retrieved?.author).toBe('John Doe');
    expect(retrieved?.issue_id).toBe('TEST-123');
  });

  test('should retrieve comments by issue ID', () => {
    const comments: Comment[] = [
      {
        id: 'comment-1',
        issue_id: 'TEST-123',
        author: 'John Doe',
        content: 'First comment',
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:00:00Z'
      },
      {
        id: 'comment-2',
        issue_id: 'TEST-123',
        author: 'Jane Smith',
        content: 'Second comment',
        created_at: '2024-01-16T11:00:00Z',
        updated_at: '2024-01-16T11:00:00Z'
      }
    ];

    comments.forEach(comment => testQueries.upsertComment(comment));
    
    const retrieved = testQueries.getCommentsByIssueId('TEST-123');
    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].content).toBe('First comment');
    expect(retrieved[1].content).toBe('Second comment');
  });

  test('should handle threaded comments (replies)', () => {
    const parentComment: Comment = {
      id: 'comment-1',
      issue_id: 'TEST-123',
      author: 'John Doe',
      content: 'Parent comment',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z'
    };

    const replyComment: Comment = {
      id: 'comment-2',
      issue_id: 'TEST-123',
      author: 'Jane Smith',
      content: 'Reply to parent',
      created_at: '2024-01-16T11:00:00Z',
      updated_at: '2024-01-16T11:00:00Z',
      parent_id: 'comment-1'
    };

    testQueries.upsertComment(parentComment);
    testQueries.upsertComment(replyComment);
    
    const retrieved = testQueries.getCommentsByIssueId('TEST-123');
    expect(retrieved).toHaveLength(1); // Only root comment in main array
    expect(retrieved[0].content).toBe('Parent comment');
    expect(retrieved[0].replies).toHaveLength(1);
    expect(retrieved[0].replies![0].content).toBe('Reply to parent');
    expect(retrieved[0].replies![0].parent_id).toBe('comment-1');
  });

  test('should handle nested replies (multiple levels)', () => {
    const comments: Comment[] = [
      {
        id: 'comment-1',
        issue_id: 'TEST-123',
        author: 'John',
        content: 'Root comment',
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:00:00Z'
      },
      {
        id: 'comment-2',
        issue_id: 'TEST-123',
        author: 'Jane',
        content: 'First reply',
        created_at: '2024-01-16T11:00:00Z',
        updated_at: '2024-01-16T11:00:00Z',
        parent_id: 'comment-1'
      },
      {
        id: 'comment-3',
        issue_id: 'TEST-123',
        author: 'Bob',
        content: 'Reply to first reply',
        created_at: '2024-01-16T12:00:00Z',
        updated_at: '2024-01-16T12:00:00Z',
        parent_id: 'comment-2'
      }
    ];

    comments.forEach(comment => testQueries.upsertComment(comment));
    
    const retrieved = testQueries.getCommentsByIssueId('TEST-123');
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].content).toBe('Root comment');
    expect(retrieved[0].replies).toHaveLength(1);
    expect(retrieved[0].replies![0].content).toBe('First reply');
    expect(retrieved[0].replies![0].replies).toHaveLength(1);
    expect(retrieved[0].replies![0].replies![0].content).toBe('Reply to first reply');
  });

  test('should update existing comment', () => {
    const originalComment: Comment = {
      id: 'comment-1',
      issue_id: 'TEST-123',
      author: 'John Doe',
      content: 'Original content',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z'
    };

    testQueries.upsertComment(originalComment);
    
    const updatedComment: Comment = {
      ...originalComment,
      content: 'Updated content',
      updated_at: '2024-01-16T11:00:00Z'
    };

    testQueries.upsertComment(updatedComment);
    
    const retrieved = testQueries.getCommentById('comment-1');
    expect(retrieved?.content).toBe('Updated content');
    expect(retrieved?.updated_at).toBe('2024-01-16T11:00:00Z');
  });

  test('should delete comment', () => {
    const comment: Comment = {
      id: 'comment-1',
      issue_id: 'TEST-123',
      author: 'John Doe',
      content: 'Comment to delete',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z'
    };

    testQueries.upsertComment(comment);
    expect(testQueries.getCommentById('comment-1')).toBeDefined();
    
    testQueries.deleteComment('comment-1');
    expect(testQueries.getCommentById('comment-1')).toBeNull();
  });

  test('should handle comments with no replies', () => {
    const comment: Comment = {
      id: 'comment-1',
      issue_id: 'TEST-123',
      author: 'John Doe',
      content: 'Standalone comment',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z'
    };

    testQueries.upsertComment(comment);
    
    const retrieved = testQueries.getCommentsByIssueId('TEST-123');
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].replies).toEqual([]);
  });

  test('should retrieve all comments across issues', () => {
    // Add another issue
    testQueries.upsertIssue({
      id: 'TEST-456',
      title: 'Another Test Issue',
      description: 'Another test issue',
      state_name: 'Todo',
      assignee_name: 'Another User',
      team_name: 'Test Team',
      priority: 1,
      created_at: '2024-01-15T11:00:00Z',
      updated_at: '2024-01-15T11:00:00Z'
    });

    const comments: Comment[] = [
      {
        id: 'comment-1',
        issue_id: 'TEST-123',
        author: 'John',
        content: 'Comment on first issue',
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:00:00Z'
      },
      {
        id: 'comment-2',
        issue_id: 'TEST-456',
        author: 'Jane',
        content: 'Comment on second issue',
        created_at: '2024-01-16T11:00:00Z',
        updated_at: '2024-01-16T11:00:00Z'
      }
    ];

    comments.forEach(comment => testQueries.upsertComment(comment));
    
    const allComments = testQueries.getAllComments();
    expect(allComments).toHaveLength(2);
    expect(allComments[0].content).toBe('Comment on second issue'); // Ordered by created_at DESC
    expect(allComments[1].content).toBe('Comment on first issue');
  });
});

describe('Comment Tree Building', () => {
  test('should build correct tree from flat comment list', () => {
    const flatComments: Comment[] = [
      {
        id: 'comment-3',
        issue_id: 'TEST-123',
        author: 'Charlie',
        content: 'Third comment (root)',
        created_at: '2024-01-16T12:00:00Z',
        updated_at: '2024-01-16T12:00:00Z'
      },
      {
        id: 'comment-1',
        issue_id: 'TEST-123',
        author: 'Alice',
        content: 'First comment (root)',
        created_at: '2024-01-16T10:00:00Z',
        updated_at: '2024-01-16T10:00:00Z'
      },
      {
        id: 'comment-2',
        issue_id: 'TEST-123',
        author: 'Bob',
        content: 'Reply to first',
        created_at: '2024-01-16T11:00:00Z',
        updated_at: '2024-01-16T11:00:00Z',
        parent_id: 'comment-1'
      },
      {
        id: 'comment-4',
        issue_id: 'TEST-123',
        author: 'David',
        content: 'Reply to reply',
        created_at: '2024-01-16T13:00:00Z',
        updated_at: '2024-01-16T13:00:00Z',
        parent_id: 'comment-2'
      }
    ];

    const tree = buildCommentTree(flatComments);
    
    expect(tree).toHaveLength(2); // Two root comments
    
    // Find the comments by content since order may vary
    const firstComment = tree.find(c => c.content === 'First comment (root)');
    const thirdComment = tree.find(c => c.content === 'Third comment (root)');
    
    expect(firstComment).toBeDefined();
    expect(thirdComment).toBeDefined();
    
    expect(firstComment!.replies).toHaveLength(1);
    expect(firstComment!.replies![0].content).toBe('Reply to first');
    expect(firstComment!.replies![0].replies).toHaveLength(1);
    expect(firstComment!.replies![0].replies![0].content).toBe('Reply to reply');
    
    expect(thirdComment!.replies).toEqual([]);
  });
});