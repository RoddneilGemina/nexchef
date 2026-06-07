import { StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Container } from '@/components/ui/container';
import { Spacing, Radius } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth';

export default function ProfileScreen() {
  const theme = useColorScheme() ?? 'light';
  const { user, logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <Container style={styles.centerContent}>
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]}>
             <Ionicons name="person" size={48} color={theme === 'dark' ? '#666' : '#ccc'} />
          </View>
          
          <ThemedText type="title" style={styles.username}>
            @{user?.username || 'Guest'}
          </ThemedText>
          
          <ThemedText style={styles.bio}>
            {user?.bio || 'No bio available.'}
          </ThemedText>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <ThemedText type="defaultSemiBold">0</ThemedText>
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

          <Pressable 
            style={({ pressed }) => [styles.logoutButton, { opacity: pressed ? 0.8 : 1 }]}
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <ThemedText style={styles.logoutText}>Logout</ThemedText>
          </Pressable>
        </View>
      </Container>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  profileCard: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    padding: Spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
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
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: Spacing.xxl,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    gap: Spacing.sm,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
