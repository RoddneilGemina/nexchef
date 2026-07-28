import { useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, FlatList, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
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
  const router = useRouter();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Connection counts
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Edit state
  const [editUsername, setEditUsername] = useState(user?.username || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    try {
      const userPosts = await backendAPI.posts.getUserPosts(user.id);
      setPosts(userPosts);

      // Fetch follows in a separate try/catch block
      try {
        const [followersList, followingList] = await Promise.all([
          backendAPI.follows.getFollowers(user.id),
          backendAPI.follows.getFollowing(user.id),
        ]);
        setFollowersCount(followersList.length);
        setFollowingCount(followingList.length);
      } catch (followError) {
        console.warn('Follow system fetch failed (table may not exist):', followError);
        setFollowersCount(0);
        setFollowingCount(0);
      }
    } catch (error) {
      console.error('Core profile posts fetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
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

  const { updatePassword } = useAuth();

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      const msg = 'Please enter a new password.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Validation Error', msg);
      }
      return;
    }
    if (newPassword !== confirmNewPassword) {
      const msg = 'Passwords do not match.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Validation Error', msg);
      }
      return;
    }
    
    setIsUpdatingPassword(true);
    try {
      await updatePassword(newPassword);
      const successMsg = 'Password updated successfully!';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Success', successMsg);
      }
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      const failMsg = 'Failed to update password: ' + error.message;
      if (Platform.OS === 'web') {
        window.alert(failMsg);
      } else {
        Alert.alert('Error', failMsg);
      }
    } finally {
      setIsUpdatingPassword(false);
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
          <Pressable style={styles.menuItem} onPress={() => { setIsChangingPassword(true); setShowMenu(false); }}>
            <Ionicons name="key-outline" size={18} color={Colors[theme].text} />
            <ThemedText>Change Password</ThemedText>
          </Pressable>
          <Pressable style={[styles.menuItem, styles.menuItemDestructive]} onPress={logout}>
            <Ionicons name="log-out" size={18} color="#ff4444" />
            <ThemedText style={{ color: '#ff4444' }}>Logout</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );

  const handleStatsPress = (type: 'followers' | 'following') => {
    router.push({
      pathname: '/profile/connections',
      params: { userId: user?.id, type }
    } as any);
  };

  const ProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]}>
         <Ionicons name="person" size={48} color={theme === 'dark' ? '#666' : '#ccc'} />
      </View>
      
      {isChangingPassword ? (
        <View style={styles.editForm}>
          <TextInput
            style={[styles.editInput, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New Password"
            secureTextEntry
          />
          <TextInput
            style={[styles.editInput, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder="Confirm New Password"
            secureTextEntry
          />
          <View style={styles.editActions}>
            <Pressable onPress={() => { setIsChangingPassword(false); setNewPassword(''); setConfirmNewPassword(''); }} disabled={isUpdatingPassword}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
            <Pressable onPress={handleUpdatePassword} disabled={isUpdatingPassword} style={styles.saveButton}>
              {isUpdatingPassword ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText style={styles.saveText}>Update</ThemedText>}
            </Pressable>
          </View>
        </View>
      ) : isEditing ? (
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
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPostUpdated={fetchProfileData}
              onPostDeleted={() => setPosts((prev) => prev.filter((p) => p.id !== item.id))}
            />
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