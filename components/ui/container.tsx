import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Spacing } from '@/constants/theme';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function Container({ children, style }: { children: React.ReactNode, style?: any }) {
  const colorScheme = useColorScheme();
  const isWeb = Platform.OS === 'web';
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    // On web, prevent the app from stretching too wide and keep it centered
    maxWidth: Platform.OS === 'web' ? 1200 : '100%',
  },
});
