import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Comment as CommentType } from '@/types/post';
import { Spacing, Radius, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { backendAPI } from '@/services/backend';
import { UsernameLink } from './username-link';

interface CommentProps {
  comment: CommentType;
  onRefresh: () => void;
  isReply?: boolean;
}

export function Comment({ comment, onRefresh, isReply = false }: CommentProps) {
  const theme = useColorScheme() ?? 'light';
  
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      // If it's already a reply, we attach the new reply to the SAME parent so it stays 1 level deep
      const targetParentId = isReply ? (comment.parent_id || comment.id) : comment.id;
      
      // Prefix with @username if replying to a specific sub-reply
      const finalContent = isReply ? `@${comment.username} ${replyText.trim()}` : replyText.trim();

      await backendAPI.comments.createComment(comment.post_id, finalContent, targetParentId);
      setReplyText('');
      setIsReplying(false);
      onRefresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#444' : '#ddd' }]}>
        <Ionicons name="person" size={16} color={theme === 'dark' ? '#888' : '#aaa'} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <UsernameLink userId={comment.user_id} username={comment.username} type="defaultSemiBold" style={styles.username} />
          <ThemedText style={styles.timestamp}>{comment.created_at}</ThemedText>
        </View>
        <ThemedText style={styles.content}>{comment.content}</ThemedText>
        <View style={styles.actions}>
          <Pressable onPress={() => setIsReplying(!isReplying)}>
            <ThemedText style={styles.actionText}>Reply</ThemedText>
          </Pressable>
        </View>
        
        {/* Inline Reply Box */}
        {isReplying && (
          <View style={styles.inlineReplyContainer}>
            <TextInput
              style={[styles.replyInput, { color: Colors[theme].text, backgroundColor: theme === 'dark' ? '#222' : '#f5f5f5' }]}
              placeholder={`Reply to @${comment.username}...`}
              placeholderTextColor="#888"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              autoFocus
            />
            <Pressable 
              onPress={handleSubmitReply} 
              disabled={isSubmitting || !replyText.trim()}
              style={({pressed}) => [styles.sendButton, { opacity: pressed || !replyText.trim() ? 0.5 : 1 }]}
            >
              {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={14} color="#fff" />}
            </Pressable>
          </View>
        )}

        {/* Render nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesWrapper}>
            {comment.replies.map(reply => (
              <Comment key={reply.id} comment={reply} onRefresh={onRefresh} isReply={true} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  replyContainer: {
    marginTop: Spacing.sm,
    marginBottom: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  username: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  content: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: Spacing.md,
  },
  actionText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  repliesWrapper: {
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    paddingLeft: Spacing.sm,
    marginTop: Spacing.sm,
  },
  inlineReplyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  replyInput: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    minHeight: 32,
    maxHeight: 100,
    fontSize: 13,
  },
  sendButton: {
    backgroundColor: '#FF8C00',
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  }
});
