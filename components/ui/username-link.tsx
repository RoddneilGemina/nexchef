import React from 'react';
import { Pressable, StyleSheet, StyleProp, TextStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';

interface UsernameLinkProps {
  userId: string;
  username: string;
  style?: StyleProp<TextStyle>;
  type?: 'default' | 'defaultSemiBold' | 'title' | 'subtitle' | 'link';
}

export function UsernameLink({
  userId,
  username,
  style,
  type = 'defaultSemiBold',
}: UsernameLinkProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handlePress = () => {
    if (user && user.id === userId) {
      router.push('/(tabs)/profile');
    } else {
      router.push({
        pathname: '/profile/[id]',
        params: { id: userId },
      } as any);
    }
  };

  return (
    <Pressable onPress={handlePress} style={styles.pressable}>
      <ThemedText type={type} style={[styles.text, style]}>
        {username}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'flex-start',
  },
  text: {
    // Styling can be customized, default is fine
  },
});
