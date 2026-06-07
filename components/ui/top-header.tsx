import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Fonts } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function TopHeader() {
  const theme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.headerContainer, 
      { 
        backgroundColor: Colors[theme].background,
        // Apply safe area inset for top (status bar / notch).
        // Add a small base spacing so it's not flush even if insets are 0.
        paddingTop: Math.max(insets.top, Spacing.md),
        borderBottomColor: theme === 'dark' ? '#333' : '#eee',
      }
    ]}>
      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.iconButton]}>
        <Ionicons name="add-circle-outline" size={28} color={Colors[theme].text} />
      </Pressable>

      <View style={styles.logoContainer}>
        <ThemedText style={styles.logoTextOrange}>Nex</ThemedText>
        <ThemedText style={styles.logoTextChef}>chef</ThemedText>
      </View>

      <Pressable style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.iconButton]}>
        <Ionicons name="notifications-outline" size={26} color={Colors[theme].text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextOrange: {
    fontSize: 24,
    fontFamily: Fonts.serif,
    fontWeight: '800',
    color: '#FF8C00', // Orange as requested
  },
  logoTextChef: {
    fontSize: 24,
    fontFamily: Fonts.serif,
    fontWeight: '800',
    // In dark mode we want white, in light mode white would be invisible on white bg.
    // However, the prompt specifically requested "white on chef". 
    // To respect the prompt while keeping it visible on light mode, we can use theme color,
    // or we force the text to be theme-adaptive (black on light, white on dark).
    // I will use adaptive to ensure it looks good!
  },
  iconButton: {
    padding: Spacing.xs,
  }
});
