import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Post } from '@/types/post';
import { Spacing, Radius, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { backendAPI } from '@/services/backend';
import { UsernameLink } from './username-link';
import { RecipeTechniqueTags } from './recipe-technique-tags';

interface PostCardProps {
  post: Post;
  isDetailView?: boolean;
  onPostUpdated?: () => void;
  onPostDeleted?: () => void;
}

export function PostCard({ post, isDetailView = false, onPostUpdated, onPostDeleted }: PostCardProps) {
  const theme = useColorScheme() ?? 'light';
  const { user } = useAuth();
  const router = useRouter();
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption);
  const [isSaving, setIsSaving] = useState(false);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Commenting state
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Cheers state
  const [isCheered, setIsCheered] = useState(post.has_cheered || false);
  const [cheersCount, setCheersCount] = useState(post.cheers || 0);

  // Keep local cheers state in sync with the post prop when it re-fetches
  useEffect(() => {
    setIsCheered(post.has_cheered || false);
    setCheersCount(post.cheers || 0);
  }, [post.has_cheered, post.cheers]);

  const shouldTruncate = !isDetailView && !isExpanded;
  const isOwner = user?.id === post.user_id;

  const handleSaveEdit = async () => {
    if (!editedCaption.trim() || editedCaption === post.caption) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await backendAPI.posts.updatePost(post.id, editedCaption.trim());
      setIsEditing(false);
      if (onPostUpdated) onPostUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCheer = async () => {
    const newlyCheered = !isCheered;
    setIsCheered(newlyCheered);
    setCheersCount((prev) => (newlyCheered ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const result = await backendAPI.posts.toggleCheer(post.id, isCheered);
      if (result) {
        setIsCheered(result.has_cheered);
        setCheersCount(result.cheers_count);
      }
      if (onPostUpdated) onPostUpdated();
    } catch (e) {
      console.error('Error toggling cheer:', e);
      // Revert optimism on failure
      setIsCheered(!newlyCheered);
      setCheersCount((prev) => (newlyCheered ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  const handleDeletePost = () => {
    const confirmDelete = () => {
      setIsDeleting(true);
      backendAPI.posts.deletePost(post.id)
        .then(() => {
          setShowOwnerMenu(false);
          if (onPostDeleted) onPostDeleted();
          else if (onPostUpdated) onPostUpdated();
        })
        .catch((e) => {
          const message = e?.message || 'Failed to delete post';
          if (Platform.OS === 'web') window.alert(message);
          else Alert.alert('Error', message);
        })
        .finally(() => setIsDeleting(false));
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this post? This cannot be undone.')) confirmDelete();
      return;
    }

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await backendAPI.comments.createComment(post.id, commentText.trim());
      setCommentText('');
      setIsCommenting(false);
      if (onPostUpdated) onPostUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const content = (
    <ThemedView style={[styles.card, !isDetailView && { borderBottomWidth: 1, borderBottomColor: theme === 'dark' ? '#333' : '#eee' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#444' : '#ddd' }]}>
           <Ionicons name="person" size={20} color={theme === 'dark' ? '#888' : '#aaa'} />
        </View>
        <View style={styles.headerText}>
          <UsernameLink userId={post.user_id} username={post.username} type="defaultSemiBold" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ThemedText style={styles.timestamp}>
              {post.updated_at ? `Last updated: ${post.updated_at}` : post.timestamp}
            </ThemedText>
            {post.updated_at && <Ionicons name="pencil" size={10} color="#888" />}
          </View>
        </View>
        
        {isOwner && !isEditing && (
          <Pressable
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
            onPress={() => setShowOwnerMenu((v) => !v)}
            disabled={isDeleting}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors[theme].icon} />
          </Pressable>
        )}
      </View>

      {isOwner && showOwnerMenu && !isEditing && (
        <View style={[styles.ownerMenu, { backgroundColor: theme === 'dark' ? '#222' : '#fff', borderColor: theme === 'dark' ? '#333' : '#eee' }]}>
          <Pressable
            style={styles.ownerMenuItem}
            onPress={() => { setShowOwnerMenu(false); setIsEditing(true); }}
          >
            <Ionicons name="pencil-outline" size={18} color={Colors[theme].text} />
            <ThemedText style={styles.ownerMenuText}>Edit caption</ThemedText>
          </Pressable>
          <View style={[styles.ownerMenuDivider, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} />
          <Pressable style={styles.ownerMenuItem} onPress={handleDeletePost} disabled={isDeleting}>
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ff4444" />
            ) : (
              <Ionicons name="trash-outline" size={18} color="#ff4444" />
            )}
            <ThemedText style={[styles.ownerMenuText, { color: '#ff4444' }]}>Delete post</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Image Placeholder (Only if imageUrl exists) */}
      {post.imageUrl && (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme === 'dark' ? '#222' : '#f5f5f5' }]}>
          <Ionicons name="image-outline" size={48} color={theme === 'dark' ? '#444' : '#ccc'} />
        </View>
      )}

      {/* Caption / Edit Mode */}
      <View style={styles.captionContainer}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.editInput, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
              value={editedCaption}
              onChangeText={setEditedCaption}
              multiline
              autoFocus
            />
            <View style={styles.editActions}>
              <Pressable onPress={() => setIsEditing(false)} disabled={isSaving}>
                <ThemedText style={styles.cancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={handleSaveEdit} disabled={isSaving} style={styles.saveButton}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={styles.saveText}>Save</ThemedText>}
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <ThemedText style={styles.captionText} numberOfLines={shouldTruncate ? 2 : undefined}>
              {post.caption}
            </ThemedText>
            {shouldTruncate && post.caption.length > 80 && (
              <Pressable onPress={() => setIsExpanded(true)}>
                <ThemedText style={[styles.seeMore, { color: Colors[theme].icon }]}>see more</ThemedText>
              </Pressable>
            )}
          </>
        )}

        {/* COOKING METHOD & TECHNIQUE TAGS */}
        <RecipeTechniqueTags post={post} />
      </View>

      {/* Action Bar */}
      {!isEditing && (
        <View style={styles.actionBar}>
          <View style={styles.actionGroup}>
            <Pressable style={styles.actionButton} onPress={handleToggleCheer}>
              <Ionicons name={isCheered ? "wine" : "wine-outline"} size={26} color={isCheered ? "#FF8C00" : Colors[theme].text} />
              <ThemedText style={[styles.actionText, isCheered && { color: "#FF8C00" }]}>{cheersCount}</ThemedText>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => setIsCommenting(!isCommenting)}>
              <Ionicons name="chatbubble-outline" size={24} color={Colors[theme].text} />
              <ThemedText style={styles.actionText}>{post.comments || 0}</ThemedText>
            </Pressable>
            <Pressable style={styles.actionButton}>
              <Ionicons name="paper-plane-outline" size={24} color={Colors[theme].text} />
              <ThemedText style={styles.actionText}>{post.shares || 0}</ThemedText>
            </Pressable>
          </View>
          <Pressable style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={24} color={Colors[theme].text} />
          </Pressable>
        </View>
      )}

      {/* Inline Comment Box */}
      {isCommenting && (
        <View style={styles.inlineCommentContainer}>
          <TextInput
            style={[styles.commentInput, { color: Colors[theme].text, backgroundColor: theme === 'dark' ? '#222' : '#f5f5f5' }]}
            placeholder="Write a comment..."
            placeholderTextColor="#888"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            autoFocus
          />
          <Pressable 
            onPress={handleSubmitComment} 
            disabled={isSubmittingComment || !commentText.trim()}
            style={({pressed}) => [styles.sendButton, { opacity: pressed || !commentText.trim() ? 0.5 : 1 }]}
          >
            {isSubmittingComment ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
          </Pressable>
        </View>
      )}
    </ThemedView>
  );

  if (isDetailView) {
    return content;
  }

  return (
    <Pressable
      disabled={isEditing || isCommenting || showOwnerMenu || isDeleting}
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } } as any)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  recipeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  recipeBannerText: {
    color: '#FF8C00',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  captionContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  seeMore: {
    fontSize: 14,
    marginTop: 2,
  },
  editContainer: {
    width: '100%',
  },
  editInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    minHeight: 60,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelText: {
    color: '#888',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inlineCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    minHeight: 36,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#FF8C00',
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  ownerMenu: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  ownerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  ownerMenuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ownerMenuDivider: {
    height: 1,
    width: '100%',
  },
});
