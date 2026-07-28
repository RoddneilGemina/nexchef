import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { RecipeStep } from '@/types/post';

interface StepBufferScreenProps {
  nextStep: RecipeStep;
  nextStepIndex: number;
  totalSteps: number;
  initialBufferSeconds?: number;
  theme?: 'light' | 'dark';
  onProceed: () => void;
  onPrevStep?: () => void;
  recipeTitle?: string | null;
}

const DEFAULT_BUFFER_SECONDS = 30;

export function StepBufferScreen({
  nextStep,
  nextStepIndex,
  totalSteps,
  initialBufferSeconds = DEFAULT_BUFFER_SECONDS,
  theme = 'light',
  onProceed,
  onPrevStep,
  recipeTitle,
}: StepBufferScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialBufferSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const maxSecondsRef = useRef(initialBufferSeconds);

  useEffect(() => {
    maxSecondsRef.current = Math.max(initialBufferSeconds, secondsLeft);
  }, [initialBufferSeconds]);

  useEffect(() => {
    if (isPaused) return;

    if (secondsLeft <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onProceed();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        if (prev <= 4 && prev > 1) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, isPaused, onProceed]);

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onProceed();
  };

  const handleAddExtraTime = (seconds: number = 15) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSecondsLeft((prev) => {
      const nextVal = prev + seconds;
      if (nextVal > maxSecondsRef.current) {
        maxSecondsRef.current = nextVal;
      }
      return nextVal;
    });
  };

  const togglePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(!isPaused);
  };

  const dim = 160;
  const stroke = 10;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxSecs = Math.max(1, maxSecondsRef.current);
  const progress = Math.min(1, Math.max(0, secondsLeft / maxSecs));
  const strokeDashoffset = circumference * (1 - progress);

  const formatStepDuration = (durationSecs?: number | null) => {
    if (!durationSecs || durationSecs <= 0) return null;
    const m = Math.floor(durationSecs / 60);
    const s = durationSecs % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m} min`;
    return `${s} sec`;
  };

  const isLowTime = secondsLeft <= 5 && secondsLeft > 0;
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBadge}>
          <Ionicons name="time-outline" size={16} color="#FF8C00" />
          <ThemedText style={styles.headerBadgeText}>
            STEP {nextStepIndex + 1} PREPARATION
          </ThemedText>
        </View>

        <ThemedText type="title" style={styles.screenTitle}>
          Get Ready for Next Step
        </ThemedText>
        {recipeTitle && (
          <ThemedText style={styles.recipeSub}>{recipeTitle}</ThemedText>
        )}

        <View style={styles.timerContainer}>
          <View style={[styles.svgWrap, { width: dim, height: dim }]}>
            <Svg width={dim} height={dim}>
              <Circle
                cx={dim / 2}
                cy={dim / 2}
                r={radius}
                stroke={isDark ? '#333' : '#e0e0e0'}
                strokeWidth={stroke}
                fill="none"
              />
              <Circle
                cx={dim / 2}
                cy={dim / 2}
                r={radius}
                stroke={isLowTime ? '#ff4444' : '#FF8C00'}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${dim / 2}, ${dim / 2}`}
              />
            </Svg>
            <View style={styles.timerCenter}>
              <ThemedText style={[styles.timerSecs, isLowTime && styles.lowTimeText]}>
                {secondsLeft}s
              </ThemedText>
              <ThemedText style={styles.timerLabel}>
                {isPaused ? 'PAUSED' : 'BUFFER TIME'}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.bufferToolsRow}>
          <Pressable
            style={[styles.toolBtn, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}
            onPress={togglePause}
          >
            <Ionicons
              name={isPaused ? 'play-outline' : 'pause-outline'}
              size={18}
              color={Colors[theme].text}
            />
            <ThemedText style={styles.toolBtnText}>
              {isPaused ? 'Resume' : 'Pause'}
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.toolBtn, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}
            onPress={() => handleAddExtraTime(15)}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FF8C00" />
            <ThemedText style={[styles.toolBtnText, { color: '#FF8C00' }]}>
              +15s
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.nextCard, { backgroundColor: isDark ? '#1E1E1E' : '#F8F9FA', borderColor: isDark ? '#333' : '#EAEAEA' }]}>
          <View style={styles.nextCardHeader}>
            <View style={styles.stepBadge}>
              <ThemedText style={styles.stepBadgeText}>
                Step {nextStep.step_number || nextStepIndex + 1} of {totalSteps}
              </ThemedText>
            </View>
            {nextStep.duration ? (
              <View style={styles.durationBadge}>
                <Ionicons name="stopwatch-outline" size={14} color="#888" />
                <ThemedText style={styles.durationBadgeText}>
                  {formatStepDuration(nextStep.duration)}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <ThemedText type="subtitle" style={styles.nextTitle}>
            {nextStep.title}
          </ThemedText>

          <ThemedText style={styles.nextDesc}>
            {nextStep.description}
          </ThemedText>
        </View>

        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <ThemedText style={styles.skipButtonText}>
            Skip Timer
          </ThemedText>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </Pressable>

        {onPrevStep && (
          <Pressable style={styles.backButton} onPress={onPrevStep}>
            <Ionicons name="arrow-back" size={16} color="#888" />
            <ThemedText style={styles.backButtonText}>Return to Previous Step</ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF4E6',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  headerBadgeText: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  screenTitle: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 4,
  },
  recipeSub: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  timerContainer: {
    marginVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timerCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerSecs: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FF8C00',
    fontVariant: ['tabular-nums'],
  },
  lowTimeText: {
    color: '#ff4444',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  bufferToolsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  toolBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  nextCard: {
    width: '100%',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  nextCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    backgroundColor: '#FF8C0022',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  stepBadgeText: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: 12,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationBadgeText: {
    fontSize: 12,
    color: '#888',
  },
  nextTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  nextDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  skipButton: {
    backgroundColor: '#FF8C00',
    width: '100%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: '#FF8C00',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  backButtonText: {
    color: '#888',
    fontSize: 14,
  },
});
