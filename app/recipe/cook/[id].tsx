import { useState, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { backendAPI } from '@/services/backend';
import { Post } from '@/types/post';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StepProgressBar } from '@/components/ui/step-progress-bar';
import { StepBufferScreen } from '@/components/ui/step-buffer-screen';

type CookPhase = 'loading' | 'prep' | 'cooking' | 'buffer' | 'finished';

const WARNING_SECONDS = 5;

const formatClock = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatStepDuration = (durationSecs?: number | null) => {
  if (!durationSecs || durationSecs <= 0) return null;
  const m = Math.floor(durationSecs / 60);
  const s = durationSecs % 60;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m} min`;
  return `${s} sec`;
};

export default function CookModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [phase, setPhase] = useState<CookPhase>('loading');
  const [prepChecklist, setPrepChecklist] = useState<boolean[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepElapsedTime, setStepElapsedTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [bufferTargetIndex, setBufferTargetIndex] = useState<number | null>(null);
  const warnedSecondsRef = useRef<Set<number>>(new Set());

  const steps = useMemo(() => {
    return post?.recipe_steps?.sort((a, b) => (a.step_number || 0) - (b.step_number || 0)) || [];
  }, [post]);

  const totalDuration = useMemo(() => {
    return (
      post?.total_duration ||
      steps.reduce((acc, step) => acc + (step.duration || 0), 0)
    );
  }, [post, steps]);

  const cumulativeElapsedTime = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < activeStepIndex && i < steps.length; i++) {
      sum += steps[i].duration || 0;
    }
    return sum + stepElapsedTime;
  }, [activeStepIndex, stepElapsedTime, steps]);

  useEffect(() => {
    backendAPI.posts.getPost(id).then((data) => {
      setPost(data);
      if (data?.recipe_ingredients) {
        setPrepChecklist(new Array(data.recipe_ingredients.length).fill(false));
      }
      setPhase('prep');
    });
  }, [id]);

  const activeStep = steps[activeStepIndex];
  const stepDuration = activeStep?.duration || 0;
  const stepRemaining = Math.max(0, stepDuration - stepElapsedTime);
  const isWarning = stepDuration > 0 && stepRemaining > 0 && stepRemaining <= WARNING_SECONDS;

  useEffect(() => {
    if (phase !== 'cooking' || !isPlaying) return;

    if (stepDuration > 0 && stepElapsedTime >= stepDuration) {
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

    const timer = setInterval(() => setStepElapsedTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [stepElapsedTime, isPlaying, phase, stepDuration, activeStepIndex, steps.length]);

  useEffect(() => {
    warnedSecondsRef.current = new Set();
  }, [activeStepIndex]);

  useEffect(() => {
    if (phase !== 'cooking' || !isPlaying || !stepDuration) return;
    if (stepRemaining <= 0 || stepRemaining > WARNING_SECONDS) return;
    if (warnedSecondsRef.current.has(stepRemaining)) return;

    warnedSecondsRef.current.add(stepRemaining);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [phase, isPlaying, stepDuration, stepRemaining]);

  const startCooking = () => {
    if (steps.length === 0) {
      setPhase('finished');
      return;
    }
    setActiveStepIndex(0);
    setStepElapsedTime(0);
    setPhase('cooking');
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
      setPhase('finished');
    }
  };

  const jumpToPrevStep = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex((prev) => prev - 1);
      setStepElapsedTime(0);
    }
  };

  const handleAddExtra15s = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStepElapsedTime((prev) => Math.max(0, prev - 15));
  };

  const togglePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPlaying(!isPlaying);
  };

  const dim = 180;
  const stroke = 8;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeDuration = Math.max(1, stepDuration);
  const progress = Math.min(1, Math.max(0, stepElapsedTime / safeDuration));
  const strokeDashoffset = circumference * (1 - progress);
  const isDark = theme === 'dark';

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
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
            setActiveStepIndex(bufferTargetIndex);
            setStepElapsedTime(0);
            setBufferTargetIndex(null);
            setPhase('cooking');
            setIsPlaying(true);
          }}
          onPrevStep={() => {
            const prevIndex = Math.max(0, bufferTargetIndex - 1);
            setActiveStepIndex(prevIndex);
            setStepElapsedTime(0);
            setBufferTargetIndex(null);
            setPhase('cooking');
            setIsPlaying(true);
          }}
        />
      )}

      {phase === 'cooking' && activeStep && (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBadge}>
            <Ionicons name="flame-outline" size={16} color="#FF8C00" />
            <ThemedText style={styles.headerBadgeText}>
              STEP {activeStepIndex + 1} OF {steps.length}
            </ThemedText>
          </View>

          <ThemedText type="title" style={styles.screenTitle}>
            Step {activeStep.step_number || activeStepIndex + 1} Cooking
          </ThemedText>
          {post?.recipe_title && (
            <ThemedText style={styles.recipeSub}>{post.recipe_title}</ThemedText>
          )}

          <StepProgressBar
            steps={steps}
            elapsedTime={cumulativeElapsedTime}
            totalDuration={totalDuration}
            activeStepIndex={activeStepIndex}
            warning={isWarning}
          />

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
                  stroke={isWarning ? '#ff4444' : '#FF8C00'}
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
                <ThemedText
                  style={[styles.timerSecs, isWarning && styles.lowTimeText]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {formatClock(stepRemaining)}
                </ThemedText>
              </View>
            </View>
            {isWarning && (
              <View style={styles.warningBanner}>
                <Ionicons name="alarm" size={16} color="#ff4444" />
                <ThemedText style={styles.warningBannerText}>
                  {stepRemaining}s left on this step
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.bufferToolsRow}>
            <Pressable
              style={[styles.toolBtn, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}
              onPress={togglePlayPause}
            >
              <Ionicons
                name={isPlaying ? 'pause-outline' : 'play-outline'}
                size={18}
                color={Colors[theme].text}
              />
              <ThemedText style={styles.toolBtnText}>
                {isPlaying ? 'Pause' : 'Resume'}
              </ThemedText>
            </Pressable>
          </View>

          <View style={[styles.nextCard, { backgroundColor: isDark ? '#1E1E1E' : '#F8F9FA', borderColor: isDark ? '#333' : '#EAEAEA' }]}>
            <View style={styles.nextCardHeader}>
              <View style={styles.stepBadge}>
                <ThemedText style={styles.stepBadgeText}>
                  Step {activeStep.step_number || activeStepIndex + 1} of {steps.length}
                </ThemedText>
              </View>
              {stepDuration ? (
                <View style={styles.durationBadge}>
                  <Ionicons name="stopwatch-outline" size={14} color="#888" />
                  <ThemedText style={styles.durationBadgeText}>
                    {formatStepDuration(stepDuration)}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <ThemedText type="subtitle" style={styles.nextTitle}>
              {activeStep.title}
            </ThemedText>

            <ThemedText style={styles.nextDesc}>
              {activeStep.description}
            </ThemedText>
          </View>

          <Pressable style={styles.skipButton} onPress={jumpToNextStep}>
            <ThemedText style={styles.skipButtonText}>
              Skip Timer
            </ThemedText>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>

          {activeStepIndex > 0 && (
            <Pressable style={styles.backButton} onPress={jumpToPrevStep}>
              <Ionicons name="arrow-back" size={16} color="#888" />
              <ThemedText style={styles.backButtonText}>Return to Previous Step</ThemedText>
            </Pressable>
          )}
        </ScrollView>
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
  scrollContent: { padding: Spacing.lg, alignItems: 'center', paddingBottom: Spacing.xxl },
  title: { marginBottom: Spacing.xs },
  subtitle: { color: '#888', marginBottom: Spacing.xl },
  checklist: { gap: Spacing.md, marginBottom: Spacing.xxl, width: '100%' },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  checkText: { fontSize: 16, flex: 1 },
  checkedText: { color: '#888', textDecorationLine: 'line-through' },
  primaryButton: { backgroundColor: '#FF8C00', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderRadius: Radius.full, alignItems: 'center', alignSelf: 'center' },
  disabledButton: { backgroundColor: '#ccc' },
  primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  timerSecs: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 'bold',
    color: '#FF8C00',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  lowTimeText: {
    color: '#ff4444',
  },
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
