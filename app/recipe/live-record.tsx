import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SubActionReminder } from '@/types/post';

interface LiveCheckpoint {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  duration: number; // Recorded elapsed seconds
  stepType: 'prep' | 'heat';
  subActions: SubActionReminder[];
}

const formatClock = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function LiveRecordScreen() {
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();
  const isDark = theme === 'dark';

  // Recipe Meta
  const [recipeTitle, setRecipeTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Timers
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [currentStepElapsedTime, setCurrentStepElapsedTime] = useState(0);

  // Checkpoints Recorded
  const [checkpoints, setCheckpoints] = useState<LiveCheckpoint[]>([]);
  const [activeStepTitle, setActiveStepTitle] = useState('');

  // Active Stirring Sub-action Tracking
  const [activeStirringStart, setActiveStirringStart] = useState<number | null>(null);
  const [currentStepSubActions, setCurrentStepSubActions] = useState<SubActionReminder[]>([]);

  // Main Recording Interval
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const interval = setInterval(() => {
      setTotalElapsedTime((prev) => prev + 1);
      setCurrentStepElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startRecordingSession = () => {
    if (!recipeTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a recipe title to begin live recording.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRecording(true);
    setIsPaused(false);
    setTotalElapsedTime(0);
    setCurrentStepElapsedTime(0);
    setCheckpoints([]);
    setCurrentStepSubActions([]);
    setActiveStepTitle('Step 1: Prep & Sauté');
  };

  const togglePauseSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(!isPaused);
  };

  // --- SUB-ACTION REMINDERS ---
  const handleToggleStirringReminder = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (activeStirringStart === null) {
      // Start Stirring
      setActiveStirringStart(currentStepElapsedTime);
    } else {
      // End Stirring -> Add Stir SubAction
      const newSubAction: SubActionReminder = {
        id: `sub_${Date.now()}`,
        type: 'stir',
        label: 'Stir ingredients continuously',
        startOffsetSeconds: activeStirringStart,
        endOffsetSeconds: currentStepElapsedTime,
      };
      setCurrentStepSubActions((prev) => [...prev, newSubAction]);
      setActiveStirringStart(null);
    }
  };

  const handleAddPointSubAction = (
    type: 'flip' | 'baste' | 'check' | 'add_ingredient',
    label: string
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newSubAction: SubActionReminder = {
      id: `sub_${Date.now()}`,
      type,
      label,
      startOffsetSeconds: currentStepElapsedTime,
    };
    setCurrentStepSubActions((prev) => [...prev, newSubAction]);
  };

  // --- MARK CHECKPOINT ---
  const handleMarkCheckpoint = (defaultType: 'heat' | 'prep' = 'heat') => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // If stirring was active, close it out
    let finalSubActions = [...currentStepSubActions];
    if (activeStirringStart !== null) {
      finalSubActions.push({
        id: `sub_${Date.now()}`,
        type: 'stir',
        label: 'Stir ingredients continuously',
        startOffsetSeconds: activeStirringStart,
        endOffsetSeconds: currentStepElapsedTime,
      });
      setActiveStirringStart(null);
    }

    const stepNum = checkpoints.length + 1;
    const newCheckpoint: LiveCheckpoint = {
      id: `cp_${Date.now()}`,
      stepNumber: stepNum,
      title: activeStepTitle.trim() || `Step ${stepNum}`,
      description: `Recorded live duration: ${formatClock(currentStepElapsedTime)}`,
      duration: defaultType === 'prep' ? 0 : currentStepElapsedTime,
      stepType: defaultType,
      subActions: finalSubActions,
    };

    setCheckpoints((prev) => [...prev, newCheckpoint]);

    // Reset step timer & sub-actions for next step
    setCurrentStepElapsedTime(0);
    setCurrentStepSubActions([]);
    setActiveStepTitle(`Step ${stepNum + 1}`);
  };

  const handleToggleCheckpointType = (id: string, newType: 'prep' | 'heat') => {
    setCheckpoints((prev) =>
      prev.map((cp) => (cp.id === id ? { ...cp, stepType: newType } : cp))
    );
  };

  const handleRemoveCheckpoint = (id: string) => {
    setCheckpoints((prev) => prev.filter((cp) => cp.id !== id));
  };

  const handleRemoveSubAction = (checkpointId: string, subId: string) => {
    setCheckpoints((prev) =>
      prev.map((cp) =>
        cp.id === checkpointId
          ? { ...cp, subActions: cp.subActions.filter((s) => s.id !== subId) }
          : cp
      )
    );
  };

  const handleFinishLiveRecording = () => {
    if (checkpoints.length === 0 && currentStepElapsedTime > 0) {
      // Lock in final current step
      handleMarkCheckpoint('heat');
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Live Session Complete! 🎉',
      `Recorded ${checkpoints.length + (currentStepElapsedTime > 0 ? 1 : 0)} steps in ${formatClock(totalElapsedTime)}. Do you want to export these to the Recipe Builder?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export to Recipe Builder',
          onPress: () => {
            setIsRecording(false);
            router.back();
          },
        },
      ]
    );
  };

  const borderColor = isDark ? '#333' : '#e5e5e5';
  const cardBg = isDark ? '#1E1E1E' : '#F8F9FA';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Stack.Screen options={{ title: 'Live Cooking Recording', headerBackTitle: 'Cancel' }} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isRecording ? (
          <View style={styles.startSection}>
            <View style={styles.heroBadge}>
              <Ionicons name="videocam" size={24} color="#FF8C00" />
              <ThemedText style={styles.heroBadgeTitle}>Live Cooking Session Recorder</ThemedText>
            </View>
            <ThemedText style={styles.heroDesc}>
              Cook in real time! Physics takes the same time for everyone; knife skills do not. Record your active heat steps, untimed prep checkpoints, and live sub-actions (stir, flip, baste) as they happen.
            </ThemedText>

            <View style={styles.inputBlock}>
              <ThemedText style={styles.inputLabel}>Recipe Title</ThemedText>
              <TextInput
                style={[styles.titleInput, { color: Colors[theme].text, borderColor }]}
                placeholder="e.g. Pan-Seared Garlic Butter Ribeye"
                placeholderTextColor="#888"
                value={recipeTitle}
                onChangeText={setRecipeTitle}
              />
            </View>

            <Pressable style={styles.startBtn} onPress={startRecordingSession}>
              <Ionicons name="radio-button-on" size={20} color="#fff" />
              <ThemedText style={styles.startBtnText}>Start Live Cooking Recording</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.activeRecordingSection}>
            {/* Live Indicator Header */}
            <View style={styles.liveHeaderBar}>
              <View style={styles.liveTag}>
                <View style={styles.liveRedDot} />
                <ThemedText style={styles.liveTagText}>LIVE RECORDING</ThemedText>
              </View>
              <ThemedText style={styles.totalTimerText}>
                Total Time: <ThemedText style={styles.totalTimerBold}>{formatClock(totalElapsedTime)}</ThemedText>
              </ThemedText>
            </View>

            {/* Current Step Segment Box */}
            <View style={[styles.currentStepCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.currentStepHeader}>
                <ThemedText style={styles.currentStepNumberText}>
                  STEP {checkpoints.length + 1} SEGMENT
                </ThemedText>
                <Pressable style={styles.pauseBtn} onPress={togglePauseSession}>
                  <Ionicons name={isPaused ? 'play' : 'pause'} size={16} color={Colors[theme].text} />
                  <ThemedText style={styles.pauseBtnText}>{isPaused ? 'Resume' : 'Pause'}</ThemedText>
                </Pressable>
              </View>

              <View style={styles.stepClockCenter}>
                <ThemedText style={styles.stepClockText}>{formatClock(currentStepElapsedTime)}</ThemedText>
                <ThemedText style={styles.stepClockSub}>Step Elapsed Seconds</ThemedText>
              </View>

              <TextInput
                style={[styles.stepTitleInput, { color: Colors[theme].text, borderColor }]}
                placeholder={`Step ${checkpoints.length + 1} Title (e.g. Sauté garlic & aromatics)`}
                placeholderTextColor="#888"
                value={activeStepTitle}
                onChangeText={setActiveStepTitle}
              />

              {/* Sub-Actions Trigger Bar */}
              <View style={styles.subActionTriggerSection}>
                <ThemedText style={styles.subActionTriggerHeader}>Record Sub-Action Reminders for Next Users:</ThemedText>
                <View style={styles.subActionButtonsGrid}>
                  {/* Stirring Button */}
                  <Pressable
                    style={[
                      styles.subActionBtn,
                      activeStirringStart !== null && styles.subActionBtnActiveStir,
                    ]}
                    onPress={handleToggleStirringReminder}
                  >
                    <Ionicons
                      name="sync-outline"
                      size={16}
                      color={activeStirringStart !== null ? '#fff' : '#FF8C00'}
                    />
                    <ThemedText
                      style={[
                        styles.subActionBtnText,
                        activeStirringStart !== null && styles.subActionBtnTextActive,
                      ]}
                    >
                      {activeStirringStart !== null
                        ? `Stop Stirring (${formatClock(currentStepElapsedTime - activeStirringStart)})`
                        : 'Start Stirring'}
                    </ThemedText>
                  </Pressable>

                  {/* Flip Button */}
                  <Pressable
                    style={styles.subActionBtn}
                    onPress={() => handleAddPointSubAction('flip', 'Flip ingredient to other side')}
                  >
                    <Ionicons name="restaurant-outline" size={16} color="#FF8C00" />
                    <ThemedText style={styles.subActionBtnText}>Flip Meat/Ingredient</ThemedText>
                  </Pressable>

                  {/* Baste Button */}
                  <Pressable
                    style={styles.subActionBtn}
                    onPress={() => handleAddPointSubAction('baste', 'Baste with pan sauce/butter')}
                  >
                    <Ionicons name="color-palette-outline" size={16} color="#FF8C00" />
                    <ThemedText style={styles.subActionBtnText}>Baste / Add Butter</ThemedText>
                  </Pressable>

                  {/* Check Doneness */}
                  <Pressable
                    style={styles.subActionBtn}
                    onPress={() => handleAddPointSubAction('check', 'Check temperature & doneness')}
                  >
                    <Ionicons name="speedometer-outline" size={16} color="#FF8C00" />
                    <ThemedText style={styles.subActionBtnText}>Check Doneness</ThemedText>
                  </Pressable>
                </View>

                {/* Sub-actions recorded in current step */}
                {currentStepSubActions.length > 0 && (
                  <View style={styles.currentSubActionsList}>
                    {currentStepSubActions.map((sub) => (
                      <View key={sub.id} style={styles.subActionPill}>
                        <Ionicons name="notifications-outline" size={12} color="#FF8C00" />
                        <ThemedText style={styles.subActionPillText}>
                          {sub.type.toUpperCase()}: {sub.label} at {formatClock(sub.startOffsetSeconds)}
                          {sub.endOffsetSeconds ? ` - ${formatClock(sub.endOffsetSeconds)}` : ''}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Checkpoint Creation Buttons */}
              <View style={styles.checkpointActionRow}>
                <Pressable
                  style={[styles.checkpointBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => handleMarkCheckpoint('prep')}
                >
                  <Ionicons name="cut-outline" size={16} color="#fff" />
                  <ThemedText style={styles.checkpointBtnText}>Mark as Untimed Prep</ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.checkpointBtn, { backgroundColor: '#FF8C00' }]}
                  onPress={() => handleMarkCheckpoint('heat')}
                >
                  <Ionicons name="flame-outline" size={16} color="#fff" />
                  <ThemedText style={styles.checkpointBtnText}>
                    Mark Checkpoint ({formatClock(currentStepElapsedTime)})
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Checkpoints Recorded List */}
            {checkpoints.length > 0 && (
              <View style={styles.checkpointsListBlock}>
                <ThemedText style={styles.checkpointsListHeader}>
                  Recorded Checkpoints ({checkpoints.length}):
                </ThemedText>

                {checkpoints.map((cp, idx) => (
                  <View key={cp.id} style={[styles.cpCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.cpHeader}>
                      <View style={styles.cpBadge}>
                        <ThemedText style={styles.cpBadgeText}>Step {idx + 1}</ThemedText>
                      </View>
                      <ThemedText style={styles.cpTitle}>{cp.title}</ThemedText>

                      <Pressable onPress={() => handleRemoveCheckpoint(cp.id)} style={styles.cpRemoveBtn}>
                        <Ionicons name="trash-outline" size={16} color="#ff4444" />
                      </Pressable>
                    </View>

                    {/* Step Type Toggle */}
                    <View style={styles.cpTypeRow}>
                      <Pressable
                        style={[
                          styles.cpTypeBtn,
                          cp.stepType === 'prep' && styles.cpTypeBtnActivePrep,
                        ]}
                        onPress={() => handleToggleCheckpointType(cp.id, 'prep')}
                      >
                        <Ionicons name="cut-outline" size={12} color={cp.stepType === 'prep' ? '#fff' : '#888'} />
                        <ThemedText style={[styles.cpTypeBtnText, cp.stepType === 'prep' && styles.cpTypeBtnTextActive]}>
                          Untimed Prep
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.cpTypeBtn,
                          cp.stepType === 'heat' && styles.cpTypeBtnActiveHeat,
                        ]}
                        onPress={() => handleToggleCheckpointType(cp.id, 'heat')}
                      >
                        <Ionicons name="flame-outline" size={12} color={cp.stepType === 'heat' ? '#fff' : '#888'} />
                        <ThemedText style={[styles.cpTypeBtnText, cp.stepType === 'heat' && styles.cpTypeBtnTextActive]}>
                          Timed Heat ({formatClock(cp.duration)})
                        </ThemedText>
                      </Pressable>
                    </View>

                    {/* Sub-actions in checkpoint */}
                    {cp.subActions.length > 0 && (
                      <View style={styles.cpSubActionsBlock}>
                        {cp.subActions.map((sub) => (
                          <View key={sub.id} style={styles.cpSubItem}>
                            <Ionicons name="notifications-circle-outline" size={14} color="#FF8C00" />
                            <ThemedText style={styles.cpSubItemText}>
                              {sub.type.toUpperCase()}: {sub.label} ({formatClock(sub.startOffsetSeconds)}
                              {sub.endOffsetSeconds ? ` - ${formatClock(sub.endOffsetSeconds)}` : ''})
                            </ThemedText>
                            <Pressable onPress={() => handleRemoveSubAction(cp.id, sub.id)}>
                              <Ionicons name="close-circle" size={14} color="#888" />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            <Pressable style={styles.finishLiveBtn} onPress={handleFinishLiveRecording}>
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <ThemedText style={styles.finishLiveBtnText}>Finish Session & Export to Recipe Builder</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  startSection: { gap: Spacing.md, marginTop: Spacing.md },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroBadgeTitle: { fontSize: 20, fontWeight: '700', color: '#FF8C00' },
  heroDesc: { fontSize: 14, color: '#888', lineHeight: 20 },
  inputBlock: { gap: 6, marginTop: Spacing.sm },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#FF8C00' },
  titleInput: { borderWidth: 1, borderRadius: Radius.md, padding: 12, fontSize: 15 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FF8C00',
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  activeRecordingSection: { gap: Spacing.md },
  liveHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveRedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  liveTagText: { fontSize: 12, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5 },
  totalTimerText: { fontSize: 13, color: '#666' },
  totalTimerBold: { fontWeight: '700', color: '#FF8C00', fontVariant: ['tabular-nums'] },

  currentStepCard: { borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md },
  currentStepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currentStepNumberText: { fontSize: 12, fontWeight: '800', color: '#FF8C00', letterSpacing: 0.5 },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: '#eee' },
  pauseBtnText: { fontSize: 12, fontWeight: '600' },

  stepClockCenter: { alignItems: 'center', marginVertical: 4 },
  stepClockText: { fontSize: 40, fontWeight: 'bold', color: '#FF8C00', fontVariant: ['tabular-nums'] },
  stepClockSub: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },

  stepTitleInput: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, fontWeight: '600' },

  subActionTriggerSection: { gap: 6, paddingTop: 4 },
  subActionTriggerHeader: { fontSize: 11, fontWeight: '700', color: '#FF8C00', textTransform: 'uppercase', letterSpacing: 0.3 },
  subActionButtonsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FF8C00',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    backgroundColor: '#FFF8F0',
  },
  subActionBtnActiveStir: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  subActionBtnText: { fontSize: 12, fontWeight: '600', color: '#FF8C00' },
  subActionBtnTextActive: { color: '#fff', fontWeight: '700' },

  currentSubActionsList: { gap: 4, marginTop: 4 },
  subActionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  subActionPillText: { fontSize: 11, color: '#D97706', fontWeight: '600' },

  checkpointActionRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  checkpointBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radius.md },
  checkpointBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  checkpointsListBlock: { gap: Spacing.sm, marginTop: Spacing.sm },
  checkpointsListHeader: { fontSize: 14, fontWeight: '700', color: '#FF8C00' },
  cpCard: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 8 },
  cpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cpBadge: { backgroundColor: '#FF8C0022', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm },
  cpBadgeText: { fontSize: 11, fontWeight: '700', color: '#FF8C00' },
  cpTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  cpRemoveBtn: { padding: 4 },

  cpTypeRow: { flexDirection: 'row', gap: 8 },
  cpTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1, borderColor: '#ccc' },
  cpTypeBtnActivePrep: { backgroundColor: '#10B981', borderColor: '#10B981' },
  cpTypeBtnActiveHeat: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  cpTypeBtnText: { fontSize: 11, fontWeight: '600', color: '#666' },
  cpTypeBtnTextActive: { color: '#fff', fontWeight: '700' },

  cpSubActionsBlock: { gap: 4, marginTop: 2 },
  cpSubItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF4E6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  cpSubItemText: { flex: 1, fontSize: 11, color: '#D97706', fontWeight: '600' },

  finishLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8C00',
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  finishLiveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
