import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { linearService } from '../services/linear.ts';
import type { Comment } from '../utils/database.ts';
import { Section, Card, LoadingSpinner, Divider, icons, EmptyState } from './ui/Theme.tsx';

interface CommentsProps {
  issueId: string;
}

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  maxDepth?: number;
}

function CommentItem({ comment, depth = 0, maxDepth = 2 }: CommentItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const indentWidth = Math.min(depth * 2, maxDepth * 2);
  const isDeepThread = depth >= maxDepth;
  
  return (
    <Box flexDirection="column" marginLeft={indentWidth}>
      {/* Comment Header */}
      <Box marginBottom={1}>
        <Box marginRight={1}>
          <Text color="cyan">{icons.user}</Text>
        </Box>
        <Text color="blue" bold>{comment.author}</Text>
        <Text color="gray"> • </Text>
        <Text color="gray" dimColor>{formatDate(comment.created_at)}</Text>
        {comment.parent_id && (
          <>
            <Text color="gray"> • </Text>
            <Text color="yellow" dimColor>↳ Reply</Text>
          </>
        )}
        {isDeepThread && (
          <>
            <Text color="gray"> • </Text>
            <Text color="gray" dimColor>Thread continues...</Text>
          </>
        )}
      </Box>

      {/* Comment Content */}
      <Box marginBottom={2}>
        <Box 
          flexDirection="column"
          borderStyle="round"
          borderColor={depth > 0 ? "gray" : "cyan"}
          padding={1}
          marginLeft={1}
        >
          <Text>{comment.content}</Text>
        </Box>
      </Box>

      {/* Replies (only if not too deep) */}
      {!isDeepThread && comment.replies && comment.replies.length > 0 && (
        <Box flexDirection="column">
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ))}
        </Box>
      )}

      {/* Show deep thread indicator */}
      {isDeepThread && comment.replies && comment.replies.length > 0 && (
        <Box marginLeft={1} marginBottom={1}>
          <Text color="gray" dimColor>
            {icons.arrow} {comment.replies.length} more repl{comment.replies.length === 1 ? 'y' : 'ies'} (view in Linear)
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default function Comments({ issueId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadComments = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadedComments = await linearService.getComments(issueId);
        setComments(loadedComments);
      } catch (err) {
        console.error('Failed to load comments:', err);
        setError('Failed to load comments');
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [issueId]);

  if (loading) {
    return (
      <Section title="💬 Comments" icon={icons.info}>
        <LoadingSpinner text="Loading comments..." />
      </Section>
    );
  }

  if (error) {
    return (
      <Section title="💬 Comments" icon={icons.info}>
        <Box flexDirection="column" alignItems="center" paddingY={2}>
          <Text color="red">{icons.error} {error}</Text>
          <Text color="gray" dimColor>Try refreshing the issue</Text>
        </Box>
      </Section>
    );
  }

  if (comments.length === 0) {
    return (
      <Section title="💬 Comments" icon={icons.info}>
        <EmptyState 
          icon="💭"
          title="No comments yet"
          description="Be the first to add a comment to this issue"
        />
      </Section>
    );
  }

  const totalComments = comments.reduce((count, comment) => {
    const countReplies = (c: Comment): number => {
      return 1 + (c.replies?.reduce((acc, reply) => acc + countReplies(reply), 0) || 0);
    };
    return count + countReplies(comment);
  }, 0);

  return (
    <Section title="💬 Comments" icon={icons.info}>
      {/* Comments Header */}
      <Box marginBottom={2}>
        <Text color="gray">
          {totalComments} comment{totalComments !== 1 ? 's' : ''} • {comments.length} thread{comments.length !== 1 ? 's' : ''}
        </Text>
      </Box>

      <Divider char="─" color="gray" />

      {/* Comments List */}
      <Box flexDirection="column">
        {comments.map((comment, index) => (
          <Box key={comment.id} flexDirection="column">
            <CommentItem comment={comment} />
            {index < comments.length - 1 && (
              <Divider char="·" color="gray" />
            )}
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box marginTop={2}>
        <Divider char="─" color="gray" />
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray" dimColor>
            {icons.info} Use MCP tools to add comments • View full discussion in Linear
          </Text>
        </Box>
      </Box>
    </Section>
  );
}