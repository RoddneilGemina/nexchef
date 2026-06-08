import { useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PostCard } from '@/components/ui/post-card';
import { Spacing, Radius, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth';
import { backendAPI } from '@/services/backend';
import { Post } from '@/types/post';

export default function ProfileScreen() {
  const theme = useColorScheme() ?? 'light';
  const { user, logout } = useAuth();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Edit state
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfileData = async () => {
    if (!user) return;
    try {
      const userPosts = await backendAPI.posts.getUserPosts(user.id);
      setPosts(userPosts);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [user])
  );

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await backendAPI.users.updateProfile(user.id, editUsername, editBio);
      // Wait for AuthContext to pick up changes or reload, but for MVP we will just update state locally
      user.username = editUsername;
      user.bio = editBio;
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const TopBar = () => (
    <View style={styles.topBar}>
      <Pressable onPress={() => setShowMenu(!showMenu)} style={styles.menuIcon}>
        <Ionicons name="ellipsis-horizontal" size={24} color={Colors[theme].text} />
      </Pressable>
      {showMenu && (
        <View style={[styles.menuDropdown, { backgroundColor: theme === 'dark' ? '#222' : '#fff', borderColor: theme === 'dark' ? '#444' : '#ddd' }]}>
          <Pressable style={styles.menuItem} onPress={() => { setIsEditing(true); setShowMenu(false); }}>
            <Ionicons name="pencil" size={18} color={Colors[theme].text} />
            <ThemedText>Edit Profile</ThemedText>
          </Pressable>
          <Pressable style={[styles.menuItem, styles.menuItemDestructive]} onPress={logout}>
            <Ionicons name="log-out" size={18} color="#ff4444" />
            <ThemedText style={{ color: '#ff4444' }}>Logout</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );

  const ProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]}>
         <Ionicons name="person" size={48} color={theme === 'dark' ? '#666' : '#ccc'} />
      </View>
      
      {isEditing ? (
        <View style={styles.editForm}>
          <TextInput
            style={[styles.editInput, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
            value={editUsername}
            onChangeText={setEditUsername}
            placeholder="Username"
          />
          <TextInput
            style={[styles.editInput, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
            value={editBio}
            onChangeText={setEditBio}
            placeholder="Bio"
            multiline
          />
          <View style={styles.editActions}>
            <Pressable onPress={() => setIsEditing(false)} disabled={isSaving}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
            <Pressable onPress={handleSaveProfile} disabled={isSaving} style={styles.saveButton}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={styles.saveText}>Save</ThemedText>}
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <ThemedText type="title" style={styles.username}>
            @{user?.username || 'Guest'}
          </ThemedText>
          <ThemedText style={styles.bio}>
            {user?.bio || 'No bio available.'}
          </ThemedText>
        </>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <ThemedText type="defaultSemiBold">{posts.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Posts</ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText type="defaultSemiBold">0</ThemedText>
          <ThemedText style={styles.statLabel}>Followers</ThemedText>
        </View>
        <View style={styles.statBox}>
          <ThemedText type="defaultSemiBold">0</ThemedText>
          <ThemedText style={styles.statLabel}>Following</ThemedText>
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <TopBar />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<ProfileHeader />}
          renderItem={({ item }) => <PostCard post={item} onPostUpdated={fetchProfileData} />}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl, // Safe area roughly
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  menuIcon: {
    padding: Spacing.xs,
  },
  menuDropdown: {
    position: 'absolute',
    top: Spacing.xl + 40,
    left: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    minWidth: 150,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  menuItemDestructive: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
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
    marginBottom: Spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: Spacing.lg,
  },
  statBox: {
    alignItems: 'center',
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
  editForm: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
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
  }
});