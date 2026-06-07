import { StyleSheet, FlatList, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Container } from '@/components/ui/container';
import { TopHeader } from '@/components/ui/top-header';
import { PostCard } from '@/components/ui/post-card';
import { MOCK_POSTS } from '@/constants/mock';
import { Ionicons } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
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
      <FlatList
        data={MOCK_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        ListFooterComponent={<EndOfFeed />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
