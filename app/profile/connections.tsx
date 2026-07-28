import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Radius, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth';
import { backendAPI, UserProfile } from '@/services/backend';

export default function ConnectionsScreen() {
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();
  const { userId, type } = useLocalSearchParams<{ userId: string; type: 'followers' | 'following' }>();
  const { user: me } = useAuth();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!userId) return;
    try {
      const list = type === 'followers'
        ? await backendAPI.follows.getFollowers(userId)
        : await backendAPI.follows.getFollowing(userId);
      setUsersList(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [userId, type]);

  useFocusEffect(
    useCallback(() => {
      fetchConnections();
    }, [fetchConnections])
  );

  const handleUserPress = (targetUserId: string) => {
    if (me && me.id === targetUserId) {
      router.push('/(tabs)/profile');
    } else {
      router.push({
        pathname: '/profile/[id]',
        params: { id: targetUserId },
      } as any);
    }
  };

  const renderUserItem = ({ item }: { item: UserProfile }) => (
    <Pressable
      style={({ pressed }) => [
        styles.userItem,
        {
          backgroundColor: pressed
            ? theme === 'dark'
              ? '#222'
              : '#f9f9f9'
            : 'transparent',
          borderBottomColor: theme === 'dark' ? '#222' : '#f0f0f0',
        },
      ]}
      onPress={() => handleUserPress(item.id)}
    >
      <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]}>
        <Ionicons name="person" size={18} color={theme === 'dark' ? '#666' : '#ccc'} />
      </View>
      <View style={styles.userInfo}>
        <ThemedText type="defaultSemiBold">@{item.username}</ThemedText>
        {item.bio ? (
          <ThemedText style={styles.bioText} numberOfLines={1}>
            {item.bio}
          </ThemedText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors[theme].icon} />
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: type === 'followers' ? 'Followers' : 'Following',
          headerBackTitle: 'Back',
        }}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
        </View>
      ) : (
        <FlatList
          data={usersList}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={type === 'followers' ? 'people-outline' : 'person-add-outline'}
                size={48}
                color={theme === 'dark' ? '#444' : '#ccc'}
                style={{ marginBottom: Spacing.md }}
              />
              <ThemedText style={styles.emptyText}>
                {type === 'followers'
                  ? 'No followers yet.'
                  : 'Not following anyone yet.'}
              </ThemedText>
            </View>
          }
          contentContainerStyle={styles.listContainer}
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
  listContainer: {
    paddingVertical: Spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bioText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    padding: Spacing.xl,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
  },
});
