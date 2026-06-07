import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Post } from '@/types/post';
import { Spacing, Radius, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

interface PostCardProps {
  post: Post;
  isDetailView?: boolean;
}

export function PostCard({ post, isDetailView = false }: PostCardProps) {
  const theme = useColorScheme() ?? 'light';
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldTruncate = !isDetailView && !isExpanded;

  const content = (
    <ThemedView style={[styles.card, !isDetailView && { borderBottomWidth: 1, borderBottomColor: theme === 'dark' ? '#333' : '#eee' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#444' : '#ddd' }]}>
           <Ionicons name="person" size={20} color={theme === 'dark' ? '#888' : '#aaa'} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold">{post.username}</ThemedText>
          <ThemedText style={styles.timestamp}>{post.timestamp}</ThemedText>
        </View>
        <Pressable style={({pressed}) => [{opacity: pressed ? 0.5 : 1}]}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors[theme].icon} />
        </Pressable>
      </View>

      {/* Image Placeholder */}
      <View style={[styles.imagePlaceholder, { backgroundColor: theme === 'dark' ? '#222' : '#f5f5f5' }]}>
        <Ionicons name="image-outline" size={48} color={theme === 'dark' ? '#444' : '#ccc'} />
        <ThemedText style={{ color: theme === 'dark' ? '#555' : '#aaa', marginTop: Spacing.sm }}>
          Post Image Placeholder
        </ThemedText>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionGroup}>
          <Pressable style={styles.actionButton}>
            <Ionicons name="wine-outline" size={26} color={Colors[theme].text} />
            <ThemedText style={styles.actionText}>{post.cheers}</ThemedText>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={24} color={Colors[theme].text} />
            <ThemedText style={styles.actionText}>{post.comments}</ThemedText>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Ionicons name="paper-plane-outline" size={24} color={Colors[theme].text} />
            <ThemedText style={styles.actionText}>{post.shares}</ThemedText>
          </Pressable>
        </View>
        <Pressable style={styles.actionButton}>
          <Ionicons name="bookmark-outline" size={24} color={Colors[theme].text} />
        </Pressable>
      </View>

      {/* Caption */}
      <View style={styles.captionContainer}>
        <ThemedText style={styles.captionText} numberOfLines={shouldTruncate ? 2 : undefined}>
          <ThemedText type="defaultSemiBold">{post.username}</ThemedText>{' '}
          {post.caption}
        </ThemedText>
        {shouldTruncate && post.caption.length > 80 && (
          <Pressable onPress={() => setIsExpanded(true)}>
            <ThemedText style={[styles.seeMore, { color: Colors[theme].icon }]}>see more</ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );

  if (isDetailView) {
    return content;
  }

  // Wrap the card in a Link to navigate to the detailed post view
  return (
    <Link href={{ pathname: '/post/[id]', params: { id: post.id } } as any} asChild>
      <Pressable>
        {content}
      </Pressable>
    </Link>
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
    aspectRatio: 1, // Square image
    justifyContent: 'center',
    alignItems: 'center',
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
  }
});
