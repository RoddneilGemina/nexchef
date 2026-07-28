import { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { backendAPI } from '@/services/backend';
import { Post } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CircularStepTimer } from '@/components/ui/circular-step-timer';
import { StepProgressBar } from '@/components/ui/step-progress-bar';
import { StepBufferScreen } from '@/components/ui/step-buffer-screen';

type CookPhase = 'loading' | 'prep' | 'cooking' | 'buffer' | 'finished';

const WARNING_SECONDS = 5;

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m.toString().padStart(2, '0')}m`);
  parts.push(`${s.toString().padStart(2, '0')}s`);
  return parts.join(' : ');
};

export default function CookModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [phase, setPhase] = useState<CookPhase>('loading');
  const [prepChecklist, setPrepChecklist] = useState<boolean[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [bufferTargetIndex, setBufferTargetIndex] = useState<number | null>(null);
  const warnedSecondsRef = useRef<Set<number>>(new Set());
  const lastActiveStepRef = useRef<number>(0);

  const steps = useMemo(() => {
    return post?.recipe_steps?.sort((a, b) => (a.step_number || 0) - (b.step_number || 0)) || [];
  }, [post]);

  const totalDuration =
    post?.total_duration ||
    (steps.length > 0
      ? (steps[steps.length - 1].start_time || 0) + (steps[steps.length - 1].duration || 0)
      : 0);

  useEffect(() => {
    backendAPI.posts.getPost(id).then((data) => {
      setPost(data);
      if (data?.recipe_ingredients) {
        setPrepChecklist(new Array(data.recipe_ingredients.length).fill(false));
      }
      setPhase('prep');
    });
  }, [id]);

  const activeStepIndex = useMemo(() => {
    if (steps.length === 0) return 0;
    let foundIndex = 0;
    for (let i = steps.length - 1; i >= 0; i--) {
      if ((steps[i].start_time || 0) <= elapsedTime) {
        foundIndex = i;
        break;
      }
    }
    return foundIndex;
  }, [elapsedTime, steps]);

  const activeStep = steps[activeStepIndex];

  useEffect(() => {
    if (phase !== 'cooking' || !isPlaying) return;

    if (totalDuration > 0 && elapsedTime >= totalDuration) {
      setPhase('finished');
      return;
    }

    if (activeStep && activeStep.duration && activeStep.duration > 0) {
      const stepEndTime = (activeStep.start_time || 0) + activeStep.duration;
      if (elapsedTime >= stepEndTime) {
        if (activeStepIndex < steps.length - 1) {
          setIsPlaying(false);
          setBufferTargetIndex(activeStepIndex + 1);
          setPhase('buffer');
          return;
        } else {
          setPhase('finished');
          return;
        }
      }
    }

    const timer = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [elapsedTime, isPlaying, phase, totalDuration, activeStep, activeStepIndex, steps.length]);

  const stepElapsed = activeStep
    ? Math.max(0, elapsedTime - (activeStep.start_time || 0))
    : 0;
  const stepDuration = activeStep?.duration || 0;
  const stepRemaining = Math.max(0, stepDuration - stepElapsed);
  const isWarning = stepRemaining > 0 && stepRemaining <= WARNING_SECONDS;

  useEffect(() => {
    if (activeStepIndex !== lastActiveStepRef.current) {
      warnedSecondsRef.current = new Set();
      lastActiveStepRef.current = activeStepIndex;
    }
  }, [activeStepIndex]);

  useEffect(() => {
    if (phase !== 'cooking' || !isPlaying || !activeStep?.duration) return;
    if (stepRemaining <= 0 || stepRemaining > WARNING_SECONDS) return;
    if (warnedSecondsRef.current.has(stepRemaining)) return;

    warnedSecondsRef.current.add(stepRemaining);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [phase, isPlaying, activeStep, stepRemaining]);


  const startCooking = () => {
    if (steps.length === 0) {
      setPhase('finished');
      return;
    }
    setPhase('cooking');
    setElapsedTime(0);
    setIsPlaying(true);
    warnedSecondsRef.current = new Set();
  };

  const toggleCheck = (index: number) => {
    const next = [...prepChecklist];
    next[index] = !next[index];
    setPrepChecklist(next);
  };

  const jumpToNextStep = () => {
    if (activeStepIndex < steps.length - 1) {
      setIsPlaying(false);
      setBufferTargetIndex(activeStepIndex + 1);
      setPhase('buffer');
    } else {
      setElapsedTime(totalDuration);
      setPhase('finished');
    }
  };

  const jumpToPrevStep = () => {
    if (activeStepIndex > 0) {
      setElapsedTime(steps[activeStepIndex - 1].start_time || 0);
    } else {
      setElapsedTime(0);
    }
  };

  if (phase === 'loading') {
    return (
      <SafeAreaView style={[styles.container, styles.center, { backgroundColor: Colors[theme].background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#FF8C00" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topNav, { paddingTop: Platform.OS === 'android' ? Spacing.xl : 0 }]}>
        <Pressable onPress={() => router.back()} style={styles.navIcon}>
          <Ionicons name="close" size={28} color={Colors[theme].text} />
        </Pressable>
        <ThemedText type="defaultSemiBold" style={styles.navTitle} numberOfLines={1}>
          {post?.recipe_title}
        </ThemedText>
        <View style={styles.navIcon} />
      </View>

      {phase === 'prep' && (
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>Preparation</ThemedText>
          <ThemedText style={styles.subtitle}>Check off all ingredients before you start cooking.</ThemedText>

          <View style={styles.checklist}>
            {post?.recipe_ingredients?.map((ing, i) => (
              <Pressable key={i} style={styles.checkItem} onPress={() => toggleCheck(i)}>
                <Ionicons
                  name={prepChecklist[i] ? 'checkbox' : 'square-outline'}
                  size={28}
                  color={prepChecklist[i] ? '#FF8C00' : '#888'}
                />
                <ThemedText style={[styles.checkText, prepChecklist[i] && styles.checkedText]}>
                  <ThemedText type="defaultSemiBold">{ing.quantity} {ing.unit}</ThemedText> {ing.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.primaryButton, !prepChecklist.every((v) => v) && styles.disabledButton]}
            disabled={!prepChecklist.every((v) => v)}
            onPress={startCooking}
          >
            <ThemedText style={styles.primaryButtonText}>Start Cooking</ThemedText>
          </Pressable>
        </ScrollView>
      )}

      {phase === 'buffer' && bufferTargetIndex !== null && steps[bufferTargetIndex] && (
        <StepBufferScreen
          nextStep={steps[bufferTargetIndex]}
          nextStepIndex={bufferTargetIndex}
          totalSteps={steps.length}
          initialBufferSeconds={30}
          theme={theme}
          recipeTitle={post?.recipe_title}
          onProceed={() => {
            const targetStart = steps[bufferTargetIndex].start_time || 0;
            setElapsedTime(targetStart);
            setBufferTargetIndex(null);
            setPhase('cooking');
            setIsPlaying(true);
          }}
          onPrevStep={() => {
            const prevIndex = Math.max(0, bufferTargetIndex - 1);
            const targetStart = steps[prevIndex].start_time || 0;
            setElapsedTime(targetStart);
            setBufferTargetIndex(null);
            setPhase('cooking');
            setIsPlaying(true);
          }}
        />
      )}

      {phase === 'cooking' && activeStep && (
        <View style={styles.cookingLayout}>
          <View style={styles.timelineHeader}>
            <ThemedText style={styles.elapsedText}>{formatDuration(elapsedTime)}</ThemedText>
            {totalDuration > 0 && (
              <ThemedText style={styles.totalText}> / {formatDuration(totalDuration)}</ThemedText>
            )}
          </View>

          <StepProgressBar
            steps={steps}
            elapsedTime={elapsedTime}
            totalDuration={totalDuration}
            activeStepIndex={activeStepIndex}
            warning={isWarning}
          />

          <ScrollView
            style={styles.stepScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.stepScrollContent}
          >
            <View style={styles.activeTimerWrap}>
              <CircularStepTimer
                stepNumber={activeStep.step_number || activeStepIndex + 1}
                duration={stepDuration}
                elapsed={stepElapsed}
                isActive
                isComplete={false}
                size="lg"
                warning={isWarning}
              />
              {isWarning && (
                <View style={styles.warningBanner}>
                  <Ionicons name="alarm" size={16} color="#ff4444" />
                  <ThemedText style={styles.warningBannerText}>
                    {stepRemaining}s left on this step
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.activeStepCard}>
              <ThemedText type="title" style={styles.stepTitle}>{activeStep.title}</ThemedText>
              <ThemedText style={styles.stepDesc}>{activeStep.description}</ThemedText>
            </View>
          </ScrollView>

          <View style={[styles.bottomDock, { borderTopColor: theme === 'dark' ? '#333' : '#eee', backgroundColor: Colors[theme].background }]}>
            {activeStepIndex < steps.length - 1 && (
              <Pressable
                style={[styles.nextStepPreview, { borderColor: theme === 'dark' ? '#333' : '#eee' }]}
                onPress={jumpToNextStep}
              >
                <ThemedText style={styles.nextStepLabel}>Next</ThemedText>
                <ThemedText style={styles.nextStepTitle} numberOfLines={1}>
                  {steps[activeStepIndex + 1].title}
                </ThemedText>
                <ThemedText style={styles.nextStepTime}>
                  {formatDuration(steps[activeStepIndex + 1].start_time || 0)}
                </ThemedText>
              </Pressable>
            )}

            <View style={styles.playerRow}>
              <Pressable
                style={[styles.controlIcon, activeStepIndex === 0 && styles.controlIconDisabled]}
                onPress={jumpToPrevStep}
                disabled={activeStepIndex === 0}
              >
                <Ionicons
                  name="play-skip-back"
                  size={32}
                  color={activeStepIndex === 0 ? '#ccc' : Colors[theme].text}
                />
              </Pressable>

              <Pressable style={styles.playButton} onPress={() => setIsPlaying(!isPlaying)}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#fff" />
              </Pressable>

              <Pressable
                style={[styles.controlIcon, activeStepIndex >= steps.length - 1 && styles.controlIconDisabled]}
                onPress={jumpToNextStep}
                disabled={activeStepIndex >= steps.length - 1}
              >
                <Ionicons
                  name="play-skip-forward"
                  size={32}
                  color={activeStepIndex >= steps.length - 1 ? '#ccc' : Colors[theme].text}
                />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {phase === 'finished' && (
        <View style={[styles.content, styles.center, { flex: 1 }]}>
          <Ionicons name="restaurant" size={80} color="#FF8C00" style={{ marginBottom: Spacing.lg }} />
          <ThemedText type="title">Enjoy your meal!</ThemedText>
          <ThemedText style={[styles.subtitle, { textAlign: 'center', marginTop: Spacing.md }]}>
            You have successfully completed {post?.recipe_title}.
          </ThemedText>
          <Pressable style={[styles.primaryButton, { marginTop: Spacing.xxl }]} onPress={() => router.back()}>
            <ThemedText style={styles.primaryButtonText}>Finish</ThemedText>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  navIcon: { width: 40, alignItems: 'flex-start' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16 },
  content: { padding: Spacing.lg, flexGrow: 1 },
  title: { marginBottom: Spacing.xs },
  subtitle: { color: '#888', marginBottom: Spacing.xl },
  checklist: { gap: Spacing.md, marginBottom: Spacing.xxl },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  checkText: { fontSize: 16, flex: 1 },
  checkedText: { color: '#888', textDecorationLine: 'line-through' },
  primaryButton: { backgroundColor: '#FF8C00', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: Radius.full, alignItems: 'center', alignSelf: 'center' },
  disabledButton: { backgroundColor: '#ccc' },
  primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cookingLayout: { flex: 1, paddingHorizontal: Spacing.lg },
  timelineHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  elapsedText: { fontSize: 28, fontWeight: 'bold', color: '#FF8C00', fontVariant: ['tabular-nums'] },
  totalText: { fontSize: 16, fontWeight: '600', color: '#888', fontVariant: ['tabular-nums'] },
  stepTimersRow: { gap: Spacing.sm, paddingBottom: Spacing.md, paddingHorizontal: 2 },
  miniTimerWrap: { alignItems: 'center' },
  stepScroll: { flex: 1 },
  stepScrollContent: { alignItems: 'center', paddingBottom: Spacing.md },
  activeTimerWrap: { alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.sm },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: '#FFF0F0',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  warningBannerText: { color: '#ff4444', fontWeight: '700', fontSize: 13 },
  activeStepCard: { width: '100%', alignItems: 'center' },
  stepTitle: { marginBottom: Spacing.sm, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  stepDesc: { fontSize: 16, lineHeight: 24, color: '#555', textAlign: 'center' },
  bottomDock: { borderTopWidth: 1, paddingTop: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? Spacing.xs : Spacing.md },
  nextStepPreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: 6, paddingHorizontal: Spacing.sm, marginBottom: Spacing.xs, borderWidth: 1, borderRadius: Radius.sm, borderLeftWidth: 3, borderLeftColor: '#FF8C00' },
  nextStepLabel: { fontSize: 10, fontWeight: '700', color: '#FF8C00', textTransform: 'uppercase', letterSpacing: 0.4 },
  nextStepTitle: { flex: 1, fontSize: 12, color: '#888' },
  nextStepTime: { fontSize: 11, color: '#aaa', fontVariant: ['tabular-nums'] },
  playerRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  controlIcon: { padding: Spacing.sm, width: 52, alignItems: 'center' },
  controlIconDisabled: { opacity: 0.4 },
  playButton: { backgroundColor: '#FF8C00', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF8C00', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
});
