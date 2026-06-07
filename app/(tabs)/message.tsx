import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Container } from '@/components/ui/container';
import { Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MessageScreen() {
  const theme = useColorScheme() ?? 'light';

  return (
    <ThemedView style={styles.container}>
      <Container style={styles.centerContent}>
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme === 'dark' ? '#666' : '#ccc'} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>No Messages Yet</ThemedText>
          <ThemedText style={styles.emptyDescription}>Start a conversation to share recipes with your friends.</ThemedText>
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
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    maxWidth: 300,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    color: '#888',
  },
});
