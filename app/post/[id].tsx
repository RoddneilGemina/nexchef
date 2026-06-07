import { useLocalSearchParams, Stack } from 'expo-router';
import { StyleSheet, View, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PostCard } from '@/components/ui/post-card';
import { MOCK_POSTS } from '@/constants/mock';
import { Spacing } from '@/constants/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = MOCK_POSTS.find((p) => p.id === id);

  if (!post) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <Stack.Screen options={{ title: 'Post Not Found' }} />
        <ThemedText>Post not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Post', headerBackTitle: 'Back' }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <PostCard post={post} isDetailView={true} />
        
        {/* Comments Section Placeholder */}
        <View style={styles.commentsSection}>
          <ThemedText type="subtitle" style={styles.commentsHeader}>Comments</ThemedText>
          <ThemedText style={styles.placeholderText}>
            No comments yet. Be the first to share your thoughts!
          </ThemedText>
        </View>
      </ScrollView>
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
  commentsSection: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  commentsHeader: {
    marginBottom: Spacing.md,
  },
  placeholderText: {
    color: '#888',
    fontStyle: 'italic',
  }
});
