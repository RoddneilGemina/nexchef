import { useState, useCallback, useMemo } from 'react';
import { useLocalSearchParams, Stack, Link, useRouter } from 'expo-router';
import { StyleSheet, View, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PostCard } from '@/components/ui/post-card';
import { RecipeTechniqueTags } from '@/components/ui/recipe-technique-tags';
import { Comment } from '@/components/ui/comment';
import { Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { backendAPI } from '@/services/backend';
import { Post, Comment as CommentType } from '@/types/post';

const formatDuration = (totalSeconds?: number | null) => {
  if (!totalSeconds) return '';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || (h === 0 && m === 0)) parts.push(`${s}s`);
  return parts.join(' ');
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [fetchedPost, fetchedComments] = await Promise.all([
        backendAPI.posts.getPost(id),
        backendAPI.comments.getComments(id)
      ]);
      setPost(fetchedPost);
      setComments(fetchedComments);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  // Build the adjacency list: Group comments by parent_id
  const structuredComments = useMemo(() => {
    const rootComments = comments.filter(c => !c.parent_id);
    const replies = comments.filter(c => c.parent_id);
    
    return rootComments.map(root => {
      // Find all replies that point to this root comment
      root.replies = replies.filter(r => r.parent_id === root.id);
      return root;
    });
  }, [comments]);

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#FF8C00" />
      </ThemedView>
    );
  }

  if (!post) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <ThemedText>Post not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Post', headerBackTitle: 'Back' }} />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <PostCard
            post={post}
            isDetailView={true}
            onPostUpdated={fetchData}
            onPostDeleted={() => router.back()}
          />
          
          {/* Recipe Content Section */}
          {post.post_type === 'recipe' && (
            <View style={styles.recipeContentSection}>
              <View style={styles.recipeActionRow}>
                <ThemedText type="subtitle">Ingredients</ThemedText>
                <Link href={{ pathname: '/recipe/cook/[id]', params: { id: post.id } } as any} asChild>
                  <Pressable style={({pressed}) => [styles.cookButton, { opacity: pressed ? 0.8 : 1 }]}>
                    <ThemedText style={styles.cookButtonText}>Cook this</ThemedText>
                  </Pressable>
                </Link>
              </View>
              
              <View style={[styles.ingredientsBox, { backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9', borderColor: theme === 'dark' ? '#333' : '#eee' }]}>
                {post.recipe_ingredients?.map((ing, i) => (
                  <View key={i} style={styles.ingredientRow}>
                    <View style={styles.bulletPoint} />
                    <ThemedText style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">{ing.quantity} {ing.unit}</ThemedText> {ing.name}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <ThemedText type="subtitle" style={[styles.recipeSectionHeader, { marginTop: Spacing.xl }]}>Instructions</ThemedText>
              <View style={styles.stepsContainer}>
                {post.recipe_steps?.sort((a, b) => (a.step_number || 0) - (b.step_number || 0)).map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={styles.stepNumberBadge}>
                      <ThemedText style={styles.stepNumberText}>{step.step_number}</ThemedText>
                    </View>
                    <View style={styles.stepContent}>
                      <View style={styles.stepHeaderRow}>
                        <ThemedText type="defaultSemiBold">{step.title}</ThemedText>
                        {step.duration ? <ThemedText style={styles.stepDuration}>{formatDuration(step.duration)}</ThemedText> : null}
                      </View>
                      <ThemedText style={styles.stepDescription}>{step.description}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} />
          
          <View style={styles.commentsSection}>
            <ThemedText type="subtitle" style={styles.commentsHeader}>Comments</ThemedText>
            
            {structuredComments.length === 0 ? (
              <ThemedText style={styles.placeholderText}>
                No comments yet. Be the first to share your thoughts!
              </ThemedText>
            ) : (
              structuredComments.map(comment => (
                <Comment 
                  key={comment.id} 
                  comment={comment} 
                  onRefresh={fetchData}
                />
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  recipeContentSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  recipeActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cookButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  cookButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  recipeSectionHeader: {
    marginBottom: Spacing.md,
  },
  ingredientsBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF8C00',
  },
  stepsContainer: {
    gap: Spacing.lg,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepDuration: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  stepDescription: {
    lineHeight: 22,
    color: '#555',
  },
  commentsSection: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  commentsHeader: {
    marginBottom: Spacing.md,
  },
  placeholderText: {
    color: '#888',
    fontStyle: 'italic',
  }
});
