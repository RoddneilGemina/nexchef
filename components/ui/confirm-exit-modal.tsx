import React, { useEffect } from 'react';
import { StyleSheet, View, Modal, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface ConfirmExitModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmExitModal({
  visible,
  title = 'Discard Unsaved Changes?',
  message = 'Are you sure you want to leave? Any unsaved changes will be lost.',
  confirmText = 'Discard',
  cancelText = 'Keep Editing',
  iconName = 'warning-outline',
  onConfirm,
  onCancel,
}: ConfirmExitModalProps) {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [visible]);

  if (!visible) return null;

  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderColor = isDark ? '#333333' : '#E5E7EB';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable
          style={[styles.card, { backgroundColor: cardBg, borderColor }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon Badge */}
          <View style={styles.iconCircle}>
            <Ionicons name={iconName} size={32} color="#EF4444" />
          </View>

          {/* Title & Description */}
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.message}>{message}</ThemedText>

          {/* Action Buttons Row */}
          <View style={styles.buttonRow}>
            <Pressable
              style={[
                styles.btn,
                styles.cancelBtn,
                { borderColor: isDark ? '#444' : '#D1D5DB' },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onCancel();
              }}
            >
              <ThemedText style={[styles.cancelBtnText, { color: isDark ? '#CCC' : '#374151' }]}>
                {cancelText}
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.confirmBtn]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                onConfirm();
              }}
            >
              <ThemedText style={styles.confirmBtnText}>{confirmText}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: '#EF4444',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
