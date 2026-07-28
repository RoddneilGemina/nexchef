import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PostCard } from '@/components/ui/post-card';
import { Spacing, Radius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth';
import { backendAPI, UserProfile } from '@/services/backend';
import { Post } from '@/types/post';

export default function VisitorProfileScreen() {
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Connection counts and follow states
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id || !me) return;
    try {
      const [fetchedProfile, fetchedPosts] = await Promise.all([
        backendAPI.users.getProfile(id),
        backendAPI.posts.getUserPosts(id),
      ]);

      setProfile(fetchedProfile);
      setPosts(fetchedPosts);

      // Fetch follows in a separate try/catch block
      try {
        const [followersList, followingList, status] = await Promise.all([
          backendAPI.follows.getFollowers(id),
          backendAPI.follows.getFollowing(id),
          backendAPI.follows.getFollowStatus(me.id, id),
        ]);
        setFollowersCount(followersList.length);
        setFollowingCount(followingList.length);
        setIsFollowing(status.isFollowing);
        setIsFollowedBy(status.isFollowedBy);
      } catch (followError) {
        console.warn('Follow system fetch failed (table may not exist):', followError);
        setFollowersCount(0);
        setFollowingCount(0);
        setIsFollowing(false);
        setIsFollowedBy(false);
      }
    } catch (error) {
      console.error('Core profile/posts fetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, [id, me]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleFollowToggle = async () => {
    if (!me || !id || followLoading) return;
    setFollowLoading(true);
    try {
      await backendAPI.follows.toggleFollow(me.id, id, isFollowing);
      setIsFollowing(!isFollowing);
      setFollowersCount((prev) => (isFollowing ? prev - 1 : prev + 1));
    } catch (error) {
      console.error(error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleStatsPress = (type: 'followers' | 'following') => {
    router.push({
      pathname: '/profile/connections',
      params: { userId: id, type },
    } as any);
  };

  const ProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]}>
        <Ionicons name="person" size={48} color={theme === 'dark' ? '#666' : '#ccc'} />
      </View>

      <ThemedText type="title" style={styles.username}>
        @{profile?.username || 'user'}
      </ThemedText>
      <ThemedText style={styles.bio}>{profile?.bio || 'No bio available.'}</ThemedText>

      {/* Follow / Unfollow / Follow Back Button */}
      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          isFollowing ? styles.unfollowButton : styles.followButton,
          { opacity: pressed || followLoading ? 0.8 : 1 },
        ]}
        onPress={handleFollowToggle}
        disabled={followLoading}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText style={isFollowing ? styles.unfollowText : styles.followText}>
            {isFollowing ? 'Unfollow' : isFollowedBy ? 'Follow Back' : 'Follow'}
          </ThemedText>
        )}
      </Pressable>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <ThemedText type="defaultSemiBold">{posts.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Posts</ThemedText>
        </View>
        <Pressable style={styles.statBox} onPress={() => handleStatsPress('followers')}>
          <ThemedText type="defaultSemiBold">{followersCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Followers</ThemedText>
        </Pressable>
        <Pressable style={styles.statBox} onPress={() => handleStatsPress('following')}>
          <ThemedText type="defaultSemiBold">{followingCount}</ThemedText>
          <ThemedText style={styles.statLabel}>Following</ThemedText>
        </Pressable>
      </View>
      <View style={[styles.divider, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: profile ? `@${profile.username}` : 'Profile',
          headerBackTitle: 'Back',
        }}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<ProfileHeader />}
          renderItem={({ item }) => (
            <PostCard post={item} onPostUpdated={fetchData} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
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
    paddingBottom: Spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  username: {
    marginBottom: Spacing.xs,
  },
  bio: {
    color: '#888',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  actionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  followButton: {
    backgroundColor: '#FF8C00',
  },
  unfollowButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  followText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  unfollowText: {
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: Spacing.lg,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 70,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    marginBottom: Spacing.sm,
  },
});
