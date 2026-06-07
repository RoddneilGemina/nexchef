import { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [username, setUsername] = useState('roronexchefdev');
  const [password, setPassword] = useState('123');
  const { login, isLoading } = useAuth();
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();

  const handleLogin = async () => {
    try {
      await login(username, password);
      // Upon successful login, the _layout will automatically re-render and hide this screen,
      // but we can explicitly replace routing to the tabs just in case.
      router.replace('/(tabs)');
    } catch (e: any) {
      if (Platform.OS === 'web') {
        window.alert(e.message);
      } else {
        Alert.alert('Login Failed', e.message);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <ThemedText style={styles.logoTextOrange}>Nex</ThemedText>
          <ThemedText style={styles.logoTextChef}>chef</ThemedText>
        </View>
        <ThemedText style={styles.subtitle}>Welcome to the kitchen.</ThemedText>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#333' : '#ddd' }]}
            placeholder="Username"
            placeholderTextColor="#888"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#333' : '#ddd' }]}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable 
            style={({ pressed }) => [styles.loginButton, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.loginButtonText}>Log In</ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 360,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  logoTextOrange: {
    fontSize: 42,
    fontFamily: Fonts.serif,
    fontWeight: '800',
    color: '#FF8C00', 
  },
  logoTextChef: {
    fontSize: 42,
    fontFamily: Fonts.serif,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: Spacing.xxl,
  },
  form: {
    width: '100%',
    gap: Spacing.md,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  loginButton: {
    height: 50,
    backgroundColor: '#FF8C00',
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
