import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
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
  const [isReviewPhase, setIsReviewPhase] = useState(false);

  // Timers
  const [totalElapsedTime, setTotalElapsedTime] = useState(0);
  const [currentStepElapsedTime, setCurrentStepElapsedTime] = useState(0);
  const [currentStepNumber, setCurrentStepNumber] = useState(1);

  // Checkpoints Recorded
  const [checkpoints, setCheckpoints] = useState<LiveCheckpoint[]>([]);

  // Sub-action Tracking
  const [activeStirringStart, setActiveStirringStart] = useState<number | null>(null);
  const [currentStepSubActions, setCurrentStepSubActions] = useState<SubActionReminder[]>([]);

  // Main Recording Interval
  useEffect(() => {
    if (!isRecording || isPaused || isReviewPhase) return;

    const interval = setInterval(() => {
      setTotalElapsedTime((prev) => prev + 1);
      setCurrentStepElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, isPaused, isReviewPhase]);

  const startRecordingSession = () => {
    if (!recipeTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a recipe title to begin live recording.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRecording(true);
    setIsPaused(false);
    setIsReviewPhase(false);
    setTotalElapsedTime(0);
    setCurrentStepElapsedTime(0);
    setCurrentStepNumber(1);
    setCheckpoints([]);
    setCurrentStepSubActions([]);
    setActiveStirringStart(null);
  };

  const togglePauseSession = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(!isPaused);
  };

  // --- SUB-ACTION HANDLERS ---
  const handleToggleStirring = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (activeStirringStart === null) {
      // Start Stirring
      setActiveStirringStart(currentStepElapsedTime);
    } else {
      // End Stirring
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

  const handleAddFlipAction = () => {
    if (activeStirringStart !== null) return; // Disabled while stirring is active!

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newSubAction: SubActionReminder = {
      id: `sub_${Date.now()}`,
      type: 'flip',
      label: 'Flip food to the other side',
      startOffsetSeconds: currentStepElapsedTime,
    };
    setCurrentStepSubActions((prev) => [...prev, newSubAction]);
  };

  // --- ADVANCE TO NEXT STEP ---
  const handleNextStep = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Close active stirring if running
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

    const recordedStep: LiveCheckpoint = {
      id: `cp_${Date.now()}`,
      stepNumber: currentStepNumber,
      title: `Step ${currentStepNumber}`,
      description: `Recorded live heat duration: ${formatClock(currentStepElapsedTime)}`,
      duration: currentStepElapsedTime,
      stepType: 'heat',
      subActions: finalSubActions,
    };

    setCheckpoints((prev) => [...prev, recordedStep]);

    // Reset step timer & start next step immediately
    setCurrentStepElapsedTime(0);
    setCurrentStepSubActions([]);
    setCurrentStepNumber((prev) => prev + 1);
  };

  // --- FINISH LIVE RECORDING ---
  const handleFinishRecording = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Save final step if elapsed time > 0
    if (currentStepElapsedTime > 0) {
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

      const finalStep: LiveCheckpoint = {
        id: `cp_${Date.now()}`,
        stepNumber: currentStepNumber,
        title: `Step ${currentStepNumber}`,
        description: `Recorded live heat duration: ${formatClock(currentStepElapsedTime)}`,
        duration: currentStepElapsedTime,
        stepType: 'heat',
        subActions: finalSubActions,
      };

      setCheckpoints((prev) => [...prev, finalStep]);
    }

    setIsReviewPhase(true);
  };

  // --- POST-LIVE EDITING HANDLERS ---
  const handleToggleStepType = (id: string, newType: 'prep' | 'heat') => {
    setCheckpoints((prev) =>
      prev.map((cp) => (cp.id === id ? { ...cp, stepType: newType } : cp))
    );
  };

  const handleUpdateStepTitle = (id: string, text: string) => {
    setCheckpoints((prev) =>
      prev.map((cp) => (cp.id === id ? { ...cp, title: text } : cp))
    );
  };

  const handleRemoveStep = (id: string) => {
    setCheckpoints((prev) => prev.filter((cp) => cp.id !== id));
  };

  const handleExportToBuilder = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Export Complete!',
      'Recorded steps and sub-action reminders have been exported.',
      [
        {
          text: 'OK',
          onPress: () => {
            setIsRecording(false);
            setIsReviewPhase(false);
            router.back();
          },
        },
      ]
    );
  };

  const borderColor = isDark ? '#333' : '#e5e5e5';
  const cardBg = isDark ? '#1E1E1E' : '#F8F9FA';
  const isStirring = activeStirringStart !== null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Stack.Screen
        options={{
          title: isReviewPhase ? 'Edit Checkpoints' : 'Live Cooking Recording',
          headerBackTitle: 'Cancel',
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isRecording ? (
          // SETUP / START SCREEN
          <View style={styles.startSection}>
            <View style={styles.heroBadge}>
              <Ionicons name="videocam" size={24} color="#FF8C00" />
              <ThemedText style={styles.heroBadgeTitle}>Live Cooking Session</ThemedText>
            </View>
            <ThemedText style={styles.heroDesc}>
              Cook in real time! Start your session to immediately begin Step 1. Tap "Next Step" to record checkpoints and log sub-actions (Start/End Stirring, Flip). Edit step types (Prep vs Heat) after cooking finishes.
            </ThemedText>

            <View style={styles.inputBlock}>
              <ThemedText style={styles.inputLabel}>Recipe Title</ThemedText>
              <TextInput
                style={[styles.titleInput, { color: Colors[theme].text, borderColor }]}
                placeholder="e.g. Pan-Seared Garlic Butter Steak"
                placeholderTextColor="#888"
                value={recipeTitle}
                onChangeText={setRecipeTitle}
              />
            </View>

            <Pressable style={styles.startBtn} onPress={startRecordingSession}>
              <Ionicons name="radio-button-on" size={20} color="#fff" />
              <ThemedText style={styles.startBtnText}>Start Live Cooking Session</ThemedText>
            </Pressable>
          </View>
        ) : !isReviewPhase ? (
          // ACTIVE LIVE COOKING RECORDING VIEW (COMPACT)
          <View style={styles.compactLiveSection}>
            {/* Compact Header Bar */}
            <View style={styles.compactHeaderBar}>
              <View style={styles.liveTag}>
                <View style={styles.liveRedDot} />
                <ThemedText style={styles.liveTagText}>LIVE</ThemedText>
              </View>
              <ThemedText style={styles.totalTimerText}>
                Session: <ThemedText style={styles.totalTimerBold}>{formatClock(totalElapsedTime)}</ThemedText>
              </ThemedText>
              <Pressable style={styles.pauseIconBtn} onPress={togglePauseSession}>
                <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color={Colors[theme].text} />
              </Pressable>
            </View>

            {/* Active Step Card */}
            <View style={[styles.activeStepCard, { backgroundColor: cardBg, borderColor }]}>
              <View style={styles.stepHeaderRow}>
                <View style={styles.stepPill}>
                  <ThemedText style={styles.stepPillText}>STEP {currentStepNumber}</ThemedText>
                </View>
                <ThemedText style={styles.stepClockText}>{formatClock(currentStepElapsedTime)}</ThemedText>
              </View>

              {/* Glowing Stirring Active Banner */}
              {isStirring && (
                <View style={styles.stirringActiveBanner}>
                  <Ionicons name="sync" size={16} color="#fff" />
                  <ThemedText style={styles.stirringActiveText}>
                    Stirring in progress ({formatClock(currentStepElapsedTime - (activeStirringStart || 0))})
                  </ThemedText>
                </View>
              )}

              {/* Compact Action Buttons Row */}
              <View style={styles.actionButtonsRow}>
                {/* Stirring Toggle Button */}
                <Pressable
                  style={[
                    styles.actionBtn,
                    isStirring ? styles.actionBtnActiveStir : styles.actionBtnStir,
                  ]}
                  onPress={handleToggleStirring}
                >
                  <Ionicons name="sync-outline" size={16} color={isStirring ? '#fff' : '#FF8C00'} />
                  <ThemedText style={[styles.actionBtnText, isStirring && styles.actionBtnTextActive]}>
                    {isStirring ? 'End Stirring' : 'Start Stirring'}
                  </ThemedText>
                </Pressable>

                {/* Flip Action Button (Disabled while stirring is active) */}
                <Pressable
                  style={[styles.actionBtn, styles.actionBtnFlip, isStirring && styles.actionBtnDisabled]}
                  onPress={handleAddFlipAction}
                  disabled={isStirring}
                >
                  <Ionicons name="restaurant-outline" size={16} color={isStirring ? '#bbb' : '#FF8C00'} />
                  <ThemedText style={[styles.actionBtnText, isStirring && { color: '#bbb' }]}>
                    Flip Food
                  </ThemedText>
                </Pressable>
              </View>

              {/* Logged sub-actions in current step */}
              {currentStepSubActions.length > 0 && (
                <View style={styles.loggedSubActionsRow}>
                  {currentStepSubActions.map((sub) => (
                    <View key={sub.id} style={styles.subActionChip}>
                      <Ionicons
                        name={sub.type === 'stir' ? 'sync' : 'restaurant'}
                        size={12}
                        color="#D97706"
                      />
                      <ThemedText style={styles.subActionChipText}>
                        {sub.type === 'stir'
                          ? `Stir (${formatClock(sub.startOffsetSeconds)} - ${formatClock(sub.endOffsetSeconds || 0)})`
                          : `Flip (${formatClock(sub.startOffsetSeconds)})`}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {/* Primary Next Step Button */}
              <Pressable style={styles.nextStepBtn} onPress={handleNextStep}>
                <ThemedText style={styles.nextStepBtnText}>Next Step →</ThemedText>
              </Pressable>
            </View>

            {/* Checkpoints Recorded Read-Only List */}
            {checkpoints.length > 0 && (
              <View style={styles.checkpointsSummaryBlock}>
                <ThemedText style={styles.checkpointsSummaryTitle}>
                  Recorded Checkpoints ({checkpoints.length}):
                </ThemedText>
                {checkpoints.map((cp) => (
                  <View key={cp.id} style={[styles.cpSummaryRow, { borderColor }]}>
                    <View style={styles.cpSummaryBadge}>
                      <ThemedText style={styles.cpSummaryBadgeText}>Step {cp.stepNumber}</ThemedText>
                    </View>
                    <ThemedText style={styles.cpSummaryTime}>{formatClock(cp.duration)}</ThemedText>
                    <ThemedText style={styles.cpSummarySubCount}>
                      {cp.subActions.length > 0 ? `${cp.subActions.length} actions` : 'No sub-actions'}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            {/* Finish Live Session Button */}
            <Pressable style={styles.finishSessionBtn} onPress={handleFinishRecording}>
              <Ionicons name="stop-circle-outline" size={20} color="#fff" />
              <ThemedText style={styles.finishSessionBtnText}>Finish Live Cooking Session</ThemedText>
            </Pressable>
          </View>
        ) : (
          // POST-LIVE EDITING & REVIEW PHASE (After Live Session Finishes)
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeaderCard}>
              <Ionicons name="checkmark-done-circle" size={32} color="#10B981" />
              <ThemedText style={styles.reviewHeaderTitle}>Live Session Complete!</ThemedText>
              <ThemedText style={styles.reviewHeaderSub}>
                Recorded {checkpoints.length} steps in {formatClock(totalElapsedTime)}. Edit step types and titles before exporting.
              </ThemedText>
            </View>

            <ThemedText style={styles.reviewListTitle}>Edit Recorded Checkpoints:</ThemedText>

            {checkpoints.map((cp, idx) => (
              <View key={cp.id} style={[styles.editCpCard, { backgroundColor: cardBg, borderColor }]}>
                <View style={styles.editCpHeader}>
                  <View style={styles.stepPill}>
                    <ThemedText style={styles.stepPillText}>Step {idx + 1}</ThemedText>
                  </View>
                  <TextInput
                    style={[styles.editTitleInput, { color: Colors[theme].text, borderColor }]}
                    placeholder={`Step ${idx + 1} Title`}
                    placeholderTextColor="#888"
                    value={cp.title}
                    onChangeText={(val) => handleUpdateStepTitle(cp.id, val)}
                  />
                  <Pressable onPress={() => handleRemoveStep(cp.id)} style={styles.removeStepBtn}>
                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                  </Pressable>
                </View>

                {/* Step Type Toggle (Untimed Prep vs Timed Heat) */}
                <View style={styles.stepTypeToggleRow}>
                  <Pressable
                    style={[
                      styles.typeOptionBtn,
                      cp.stepType === 'prep' && styles.typeOptionPrepActive,
                    ]}
                    onPress={() => handleToggleStepType(cp.id, 'prep')}
                  >
                    <Ionicons
                      name="cut-outline"
                      size={14}
                      color={cp.stepType === 'prep' ? '#fff' : '#666'}
                    />
                    <ThemedText
                      style={[
                        styles.typeOptionText,
                        cp.stepType === 'prep' && styles.typeOptionTextActive,
                      ]}
                    >
                      Untimed Prep Step
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.typeOptionBtn,
                      cp.stepType === 'heat' && styles.typeOptionHeatActive,
                    ]}
                    onPress={() => handleToggleStepType(cp.id, 'heat')}
                  >
                    <Ionicons
                      name="flame-outline"
                      size={14}
                      color={cp.stepType === 'heat' ? '#fff' : '#666'}
                    />
                    <ThemedText
                      style={[
                        styles.typeOptionText,
                        cp.stepType === 'heat' && styles.typeOptionTextActive,
                      ]}
                    >
                      Timed Heat ({formatClock(cp.duration)})
                    </ThemedText>
                  </Pressable>
                </View>

                {/* Sub-actions list */}
                {cp.subActions.length > 0 && (
                  <View style={styles.subActionsReviewList}>
                    {cp.subActions.map((sub) => (
                      <View key={sub.id} style={styles.subActionReviewItem}>
                        <Ionicons name="notifications-outline" size={14} color="#FF8C00" />
                        <ThemedText style={styles.subActionReviewText}>
                          {sub.type.toUpperCase()}: {sub.label} at {formatClock(sub.startOffsetSeconds)}
                          {sub.endOffsetSeconds ? ` - ${formatClock(sub.endOffsetSeconds)}` : ''}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <Pressable style={styles.exportBtn} onPress={handleExportToBuilder}>
              <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
              <ThemedText style={styles.exportBtnText}>Export to Recipe Builder</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  // SETUP SCREEN
  startSection: { gap: Spacing.md, marginTop: Spacing.sm },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroBadgeTitle: { fontSize: 20, fontWeight: '700', color: '#FF8C00' },
  heroDesc: { fontSize: 13, color: '#888', lineHeight: 19 },
  inputBlock: { gap: 6, marginTop: Spacing.xs },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#FF8C00' },
  titleInput: { borderWidth: 1, borderRadius: Radius.md, padding: 12, fontSize: 15 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8C00',
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // COMPACT LIVE RECORDING VIEW
  compactLiveSection: { gap: Spacing.md },
  compactHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveRedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveTagText: { fontSize: 11, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5 },
  totalTimerText: { fontSize: 13, color: '#666' },
  totalTimerBold: { fontWeight: '700', color: '#FF8C00', fontVariant: ['tabular-nums'] },
  pauseIconBtn: { padding: 4 },

  activeStepCard: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepPill: {
    backgroundColor: '#FF8C0022',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  stepPillText: { fontSize: 12, fontWeight: '800', color: '#FF8C00' },
  stepClockText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF8C00',
    fontVariant: ['tabular-nums'],
  },

  stirringActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  stirringActiveText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FF8C00',
    paddingVertical: 9,
    borderRadius: Radius.sm,
    backgroundColor: '#FFF8F0',
  },
  actionBtnStir: { borderColor: '#FF8C00' },
  actionBtnActiveStir: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  actionBtnFlip: { borderColor: '#FF8C00' },
  actionBtnDisabled: { opacity: 0.4, borderColor: '#ccc' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#FF8C00' },
  actionBtnTextActive: { color: '#fff' },

  loggedSubActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  subActionChipText: { fontSize: 11, fontWeight: '600', color: '#D97706' },

  nextStepBtn: {
    backgroundColor: '#FF8C00',
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  nextStepBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  checkpointsSummaryBlock: { gap: 6, marginTop: Spacing.xs },
  checkpointsSummaryTitle: { fontSize: 12, fontWeight: '700', color: '#888' },
  cpSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  cpSummaryBadge: { backgroundColor: '#eee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  cpSummaryBadgeText: { fontSize: 11, fontWeight: '700', color: '#555' },
  cpSummaryTime: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cpSummarySubCount: { fontSize: 11, color: '#888', marginLeft: 'auto' },

  finishSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 13,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  finishSessionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // POST-LIVE REVIEW & EDITING VIEW
  reviewSection: { gap: Spacing.md },
  reviewHeaderCard: { alignItems: 'center', gap: 6, paddingVertical: Spacing.md },
  reviewHeaderTitle: { fontSize: 20, fontWeight: '700', color: '#10B981' },
  reviewHeaderSub: { fontSize: 13, color: '#666', textAlign: 'center' },
  reviewListTitle: { fontSize: 14, fontWeight: '700', color: '#FF8C00' },

  editCpCard: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  editCpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editTitleInput: { flex: 1, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontWeight: '600' },
  removeStepBtn: { padding: 4 },

  stepTypeToggleRow: { flexDirection: 'row', gap: 8 },
  typeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  typeOptionPrepActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  typeOptionHeatActive: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  typeOptionText: { fontSize: 12, fontWeight: '600', color: '#666' },
  typeOptionTextActive: { color: '#fff', fontWeight: '700' },

  subActionsReviewList: { gap: 4, marginTop: 2 },
  subActionReviewItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF4E6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  subActionReviewText: { fontSize: 11, color: '#D97706', fontWeight: '600' },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8C00',
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
