import { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const [username, setUsername] = useState('roronexchefdev');
  const [password, setPassword] = useState('123');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, signUp, isLoading } = useAuth();
  const theme = useColorScheme() ?? 'light';

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      const msg = 'Please enter both a username and password.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Validation Error', msg);
      }
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        const msg = 'Passwords do not match.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Validation Error', msg);
        }
        return;
      }

      try {
        await signUp(username.trim(), password);
      } catch (e: any) {
        if (Platform.OS === 'web') {
          window.alert(e.message);
        } else {
          Alert.alert('Sign Up Failed', e.message);
        }
      }
    } else {
      try {
        await login(username.trim(), password);
      } catch (e: any) {
        if (Platform.OS === 'web') {
          window.alert(e.message);
        } else {
          Alert.alert('Login Failed', e.message);
        }
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
        <ThemedText style={styles.subtitle}>
          {isSignUp ? 'Create a new kitchen profile.' : 'Welcome to the kitchen.'}
        </ThemedText>

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

          {isSignUp && (
            <TextInput
              style={[styles.input, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#333' : '#ddd' }]}
              placeholder="Confirm Password"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          )}

          <Pressable 
            style={({ pressed }) => [styles.loginButton, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.loginButtonText}>
                {isSignUp ? 'Create Account' : 'Log In'}
              </ThemedText>
            )}
          </Pressable>

          <Pressable 
            style={({ pressed }) => [styles.toggleButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setConfirmPassword('');
            }}
            disabled={isLoading}
          >
            <ThemedText style={styles.toggleButtonText}>
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Create one"}
            </ThemedText>
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
  },
  toggleButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  toggleButtonText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '600',
  }
});
