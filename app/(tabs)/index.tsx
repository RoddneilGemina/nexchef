import { useState, useCallback } from 'react';
import { StyleSheet, FlatList, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopHeader } from '@/components/ui/top-header';
import { PostCard } from '@/components/ui/post-card';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';
import { backendAPI } from '@/services/backend';
import { Post } from '@/types/post';

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const feed = await backendAPI.posts.getFeed();
      setPosts(feed);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [])
  );

  const EndOfFeed = () => (
    <View style={styles.endOfFeedContainer}>
      <View style={styles.iconComposite}>
        <Ionicons name="ellipse-outline" size={50} color="#ccc" style={styles.plateIcon} />
        <Ionicons name="leaf-outline" size={24} color="#bbb" style={styles.windIcon1} />
        <Ionicons name="remove-outline" size={30} color="#ccc" style={styles.windIcon2} />
      </View>
      <ThemedText style={styles.endOfFeedText}>that's all for now..</ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <TopHeader />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} onPostUpdated={fetchPosts} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          ListFooterComponent={<EndOfFeed />}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  endOfFeedContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconComposite: {
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  plateIcon: {
    transform: [{ scaleY: 0.4 }],
    position: 'absolute',
    bottom: 0,
  },
  windIcon1: {
    position: 'absolute',
    top: 5,
    right: 10,
    transform: [{ rotate: '-20deg' }],
  },
  windIcon2: {
    position: 'absolute',
    top: 15,
    left: 10,
  },
  endOfFeedText: {
    color: '#aaa',
    fontStyle: 'italic',
  }
});
