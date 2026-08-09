import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, Pressable, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter, useNavigation } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import { backendAPI } from '@/services/backend';
import { ConfirmExitModal } from '@/components/ui/confirm-exit-modal';

export default function CreatePostScreen() {
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const isSubmittingRef = useRef(false);

  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const pendingActionRef = useRef<any>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isSubmittingRef.current || !caption.trim()) {
        return;
      }

      e.preventDefault();
      pendingActionRef.current = e.data.action;
      setShowExitConfirmModal(true);
    });

    return unsubscribe;
  }, [navigation, caption]);

  const handleConfirmExit = () => {
    setShowExitConfirmModal(false);
    if (pendingActionRef.current) {
      navigation.dispatch(pendingActionRef.current);
      pendingActionRef.current = null;
    }
  };

  const handleCancelExit = () => {
    setShowExitConfirmModal(false);
    pendingActionRef.current = null;
  };

  const handlePost = async () => {
    if (!caption.trim()) return;
    setIsSubmitting(true);
    isSubmittingRef.current = true;
    
    try {
      // Create the post using our backend facade
      await backendAPI.posts.createPost(caption.trim(), null); // null for image placeholder until storage is hooked up
      
      router.back(); // Go back to the feed
    } catch (error: any) {
      isSubmittingRef.current = false;
      if (Platform.OS === 'web') {
        window.alert(error.message);
      } else {
        Alert.alert('Failed to post', error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'New Recipe', 
          headerBackTitle: 'Cancel',
          headerRight: () => (
            <Pressable 
              onPress={handlePost} 
              disabled={isSubmitting || !caption.trim()}
              style={({pressed}) => [{ opacity: pressed || !caption.trim() ? 0.5 : 1 }, styles.postButton]}
            >
              {isSubmitting ? <ActivityIndicator size="small" color="#FF8C00" /> : <ThemedText style={styles.postButtonText}>Post</ThemedText>}
            </Pressable>
          )
        }} 
      />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Info Header */}
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]}>
            <Ionicons name="person" size={24} color={theme === 'dark' ? '#666' : '#ccc'} />
          </View>
          <ThemedText type="defaultSemiBold">@{user?.username}</ThemedText>
        </View>

        {/* Caption Input */}
        <TextInput
          style={[styles.input, { color: Colors[theme].text }]}
          placeholder="Share your recipe, steps, or thoughts..."
          placeholderTextColor="#888"
          multiline
          autoFocus
          value={caption}
          onChangeText={setCaption}
          maxLength={1000}
        />

        {/* Image Picker Placeholder */}
        <Pressable style={({pressed}) => [
          styles.imageUploadArea, 
          { 
            backgroundColor: theme === 'dark' ? '#222' : '#f8f8f8',
            borderColor: theme === 'dark' ? '#333' : '#e0e0e0',
            opacity: pressed ? 0.8 : 1
          }
        ]}>
          <Ionicons name="images-outline" size={40} color="#888" />
          <ThemedText style={styles.uploadText}>Tap to add an image</ThemedText>
        </Pressable>
      </ScrollView>

      <ConfirmExitModal
        visible={showExitConfirmModal}
        title="Discard Post?"
        message="Are you sure you want to leave? Your post draft will be lost."
        confirmText="Discard"
        cancelText="Keep Editing"
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  postButton: {
    marginRight: Platform.OS === 'web' ? Spacing.md : 0,
  },
  postButtonText: {
    color: '#FF8C00',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    fontSize: 18,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: Spacing.xl,
  },
  imageUploadArea: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  uploadText: {
    color: '#888',
  }
});
