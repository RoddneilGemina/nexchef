import { useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Fonts, Radius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export function TopHeader() {
  const theme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  return (
    <View style={[
      styles.headerContainer, 
      { 
        backgroundColor: Colors[theme].background,
        paddingTop: Math.max(insets.top, Spacing.md),
        borderBottomColor: theme === 'dark' ? '#333' : '#eee',
        zIndex: 50,
      }
    ]}>
      <View style={{ position: 'relative' }}>
        <Pressable 
          onPress={() => setShowAddMenu(!showAddMenu)} 
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.iconButton]}
        >
          <Ionicons name="add-circle-outline" size={28} color={Colors[theme].text} />
        </Pressable>
        
        {showAddMenu && (
          <View style={[styles.dropdownMenu, { backgroundColor: theme === 'dark' ? '#222' : '#fff', borderColor: theme === 'dark' ? '#444' : '#ddd' }]}>
            <Pressable 
              style={styles.dropdownItem} 
              onPress={() => { setShowAddMenu(false); router.push('/post/create'); }}
            >
              <Ionicons name="document-text-outline" size={18} color={Colors[theme].text} />
              <ThemedText>Text Post</ThemedText>
            </Pressable>
            <View style={{ height: 1, backgroundColor: theme === 'dark' ? '#444' : '#eee' }} />
            <Pressable 
              style={styles.dropdownItem} 
              onPress={() => { setShowAddMenu(false); router.push('/recipe/create'); }}
            >
              <Ionicons name="restaurant-outline" size={18} color={Colors[theme].text} />
              <ThemedText>Recipe</ThemedText>
            </Pressable>
          </View>
        )}
      </View>

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
  dropdownMenu: {
    position: 'absolute',
    top: 45,
    left: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    minWidth: 140,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTextOrange: {
    fontSize: 24,
    fontFamily: Fonts.serif,
    fontWeight: '800',
    color: '#FF8C00', 
  },
  logoTextChef: {
    fontSize: 24,
    fontFamily: Fonts.serif,
    fontWeight: '800',
  },
  iconButton: {
    padding: Spacing.xs,
  }
});
