import { useState, useMemo, useCallback, useEffect } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { backendAPI } from '@/services/backend';
import Slider from '@react-native-community/slider';

// Helper: HH:MM:SS to Seconds
const timeToSeconds = (h: string, m: string, s: string) => {
  return (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
};

// Helper: Seconds to HH:MM:SS
const secondsToTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return {
    h: h > 0 ? h.toString() : '',
    m: m.toString().padStart(2, '0'),
    s: s.toString().padStart(2, '0')
  };
};

const formatSeconds = (totalSeconds: number) => {
  const { h, m, s } = secondsToTime(Math.max(0, totalSeconds));
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const parseTimeInput = (val: string): number => {
  const parts = val.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function DurationInput({
  value,
  onCommit,
  theme,
}: {
  value: number;
  onCommit: (seconds: number) => void;
  theme: 'light' | 'dark';
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(formatSeconds(value));

  useEffect(() => {
    if (!editing) setText(formatSeconds(value));
  }, [value, editing]);

  const commitText = (raw: string) => {
    const parsed = parseTimeInput(raw);
    if (parsed > 0) onCommit(parsed);
  };

  const handleChange = (raw: string) => {
    setText(raw);
    const parts = raw.split(':');
    const looksComplete =
      parts.length >= 2 && parts.every((part) => part !== '' && !Number.isNaN(parseInt(part, 10)));
    if (looksComplete) commitText(raw);
  };

  return (
    <TextInput
      style={[
        styles.timeFieldInput,
        {
          color: Colors[theme].text,
          borderColor: '#FF8C00',
          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#FFF8F0',
        },
      ]}
      value={editing ? text : formatSeconds(value)}
      onFocus={() => {
        setEditing(true);
        setText(formatSeconds(value));
      }}
      onChangeText={handleChange}
      onBlur={() => {
        setEditing(false);
        commitText(text);
      }}
      onSubmitEditing={() => {
        setEditing(false);
        commitText(text);
      }}
      returnKeyType="done"
      selectTextOnFocus
      keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
      placeholder="MM:SS"
      placeholderTextColor="#888"
    />
  );
}

export default function CreateRecipeScreen() {
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();

  // Wizard state: 0 = Info, 1 = Ingredients, 2 = Steps
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [recipeDuration, setRecipeDuration] = useState({ h: '', m: '10', s: '00' });
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '' }]);
  const [steps, setSteps] = useState([{ title: '', description: '', duration: 60 }]);

  const totalRecipeSeconds = useMemo(() => 
    timeToSeconds(recipeDuration.h, recipeDuration.m, recipeDuration.s),
  [recipeDuration]);

  const stepsWithTiming = useMemo(() => {
    let currentStart = 0;
    return steps.map((s) => {
      const stepWithTime = { ...s, start_time: currentStart };
      currentStart += s.duration;
      return stepWithTime;
    });
  }, [steps]);

  const totalOccupiedTime = useMemo(() =>
    steps.reduce((acc, s) => acc + s.duration, 0),
  [steps]);

  const getStepBounds = useCallback((index: number) => {
    const startTime = steps.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
    const laterDuration = steps.slice(index + 1).reduce((sum, s) => sum + s.duration, 0);
    const maxDuration = Math.max(1, totalRecipeSeconds - startTime - laterDuration);
    return { startTime, maxDuration };
  }, [steps, totalRecipeSeconds]);

  useEffect(() => {
    if (totalRecipeSeconds <= 0) return;
    setSteps((prev) => {
      let changed = false;
      const updated = prev.map((s, i) => {
        const startTime = prev.slice(0, i).reduce((sum, st) => sum + st.duration, 0);
        const laterDuration = prev.slice(i + 1).reduce((sum, st) => sum + st.duration, 0);
        const maxDuration = Math.max(1, totalRecipeSeconds - startTime - laterDuration);
        const clamped = clamp(s.duration, 1, maxDuration);
        if (clamped !== s.duration) changed = true;
        return { ...s, duration: clamped };
      });
      return changed ? updated : prev;
    });
  }, [totalRecipeSeconds]);

  const handleNext = () => {
    if (step === 0 && totalRecipeSeconds <= 0) {
      Alert.alert("Invalid Duration", "Please set a total recipe duration first.");
      return;
    }
    setStep(prev => prev + 1);
  };
  const handleBack = () => setStep(prev => prev - 1);

  const handleAddIngredient = () => setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  const handleUpdateIngredient = (index: number, field: string, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };
  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleAddStep = () => {
    const remaining = totalRecipeSeconds - totalOccupiedTime;
    if (remaining <= 0) {
      Alert.alert("Timeline Full", "You have already used up the total recipe duration.");
      return;
    }
    setSteps([...steps, { title: '', description: '', duration: Math.min(60, remaining) }]);
  };
  
  const handleUpdateStep = (index: number, field: string, value: string | number) => {
    const newSteps = [...steps];
    if (field === 'duration') {
      const { maxDuration } = getStepBounds(index);
      newSteps[index] = {
        ...newSteps[index],
        duration: clamp(typeof value === 'number' ? value : parseTimeInput(String(value)), 1, maxDuration),
      };
    } else {
      newSteps[index] = { ...newSteps[index], [field]: value };
    }
    setSteps(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handlePostRecipe = async () => {
    if (!title.trim() || !caption.trim()) {
      Alert.alert("Missing Info", "Please provide a title and caption.");
      return;
    }
    if (totalOccupiedTime > totalRecipeSeconds) {
      Alert.alert("Timeline Error", "Steps exceed the total recipe duration. Please adjust step durations.");
      return;
    }
    const stepsToPost = stepsWithTiming.filter((s) => s.title.trim());
    if (stepsToPost.length === 0) {
      Alert.alert("Missing Steps", "Add at least one step with a title before posting.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await backendAPI.posts.createRecipe(
        title.trim(),
        caption.trim(),
        totalRecipeSeconds,
        ingredients,
        stepsToPost
      );
      router.back();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert(e.message);
      else Alert.alert("Error", e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const borderColor = theme === 'dark' ? '#333' : '#e5e5e5';
  const inputStyle = {
    color: Colors[theme].text,
    borderColor,
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fafafa',
  };

  const renderWizardProgress = () => {
    const stepLabels = ['Basic Info', 'Ingredients', 'Recipe Steps'];
    return (
      <View style={styles.wizardProgressContainer}>
        <View style={[styles.wizardProgressTrack, { backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0' }]}>
          <View
            style={[
              styles.wizardProgressFill,
              { width: `${(step / 2) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.wizardStepsRow}>
          {stepLabels.map((label, i) => {
            const isActive = i <= step;
            const isCurrent = i === step;
            return (
              <Pressable
                key={i}
                style={styles.wizardStepNode}
                onPress={() => {
                  if (i < step) setStep(i);
                }}
              >
                <View
                  style={[
                    styles.wizardNodeCircle,
                    { backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0' },
                    isActive && styles.wizardNodeCircleActive,
                    isCurrent && styles.wizardNodeCircleCurrent,
                  ]}
                >
                  {i < step ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <ThemedText
                      style={[
                        styles.wizardNodeNumber,
                        isActive && styles.wizardNodeNumberActive,
                      ]}
                    >
                      {i + 1}
                    </ThemedText>
                  )}
                </View>
                <ThemedText
                  style={[
                    styles.wizardNodeLabel,
                    { color: theme === 'dark' ? '#888' : '#999' },
                    isActive && styles.wizardNodeLabelActive,
                    isCurrent && styles.wizardNodeLabelCurrent,
                  ]}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStep0 = () => (
    <View style={styles.wizardSection}>
      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Recipe Title</ThemedText>
        <TextInput
          style={[styles.input, inputStyle]}
          placeholder="e.g. Creamy Tuscan Garlic Chicken"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
          autoFocus
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Caption / Recipe Story</ThemedText>
        <TextInput
          style={[styles.input, styles.inputMultiline, inputStyle]}
          placeholder="Tell your followers about this dish, tips, or origin..."
          placeholderTextColor="#888"
          value={caption}
          onChangeText={setCaption}
          multiline
        />
      </View>

      <View style={[styles.compactCard, { borderColor, backgroundColor: theme === 'dark' ? '#1E1E1E' : '#F8F9FA' }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="time-outline" size={18} color="#FF8C00" />
          <ThemedText style={styles.compactLabel}>Total Recipe Duration</ThemedText>
        </View>

        <View style={styles.durationInputs}>
          <View style={styles.durationField}>
            <TextInput
              style={[styles.durationInput, inputStyle]}
              placeholder="0"
              placeholderTextColor="#888"
              value={recipeDuration.h}
              onChangeText={(val) => setRecipeDuration({ ...recipeDuration, h: val })}
              keyboardType="numeric"
            />
            <ThemedText style={styles.durationUnit}>hr</ThemedText>
          </View>
          <ThemedText style={styles.durationSep}>:</ThemedText>
          <View style={styles.durationField}>
            <TextInput
              style={[styles.durationInput, inputStyle]}
              placeholder="00"
              placeholderTextColor="#888"
              value={recipeDuration.m}
              onChangeText={(val) => setRecipeDuration({ ...recipeDuration, m: val })}
              keyboardType="numeric"
            />
            <ThemedText style={styles.durationUnit}>min</ThemedText>
          </View>
          <ThemedText style={styles.durationSep}>:</ThemedText>
          <View style={styles.durationField}>
            <TextInput
              style={[styles.durationInput, inputStyle]}
              placeholder="00"
              placeholderTextColor="#888"
              value={recipeDuration.s}
              onChangeText={(val) => setRecipeDuration({ ...recipeDuration, s: val })}
              keyboardType="numeric"
            />
            <ThemedText style={styles.durationUnit}>sec</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.wizardSection}>
      <ThemedText style={styles.sectionHeading}>Ingredients List</ThemedText>
      <ThemedText style={styles.sectionSubtitle}>Add all ingredients required for this recipe.</ThemedText>

      {ingredients.map((ing, index) => (
        <View key={index} style={[styles.compactRow, { borderColor, backgroundColor: theme === 'dark' ? '#1E1E1E' : '#F8F9FA' }]}>
          <TextInput
            style={[styles.compactInput, { flex: 2 }, inputStyle]}
            placeholder="Ingredient name"
            placeholderTextColor="#888"
            value={ing.name}
            onChangeText={(val) => handleUpdateIngredient(index, 'name', val)}
          />
          <TextInput
            style={[styles.compactInput, { flex: 0.8 }, inputStyle]}
            placeholder="Qty"
            placeholderTextColor="#888"
            value={ing.quantity}
            onChangeText={(val) => handleUpdateIngredient(index, 'quantity', val)}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.compactInput, { flex: 1 }, inputStyle]}
            placeholder="Unit (g, tbsp, cups)"
            placeholderTextColor="#888"
            value={ing.unit}
            onChangeText={(val) => handleUpdateIngredient(index, 'unit', val)}
          />
          <Pressable onPress={() => handleRemoveIngredient(index)} hitSlop={8} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={20} color={ingredients.length === 1 ? '#ccc' : '#ff4444'} />
          </Pressable>
        </View>
      ))}

      <Pressable onPress={handleAddIngredient} style={styles.addButtonCompact}>
        <Ionicons name="add" size={18} color="#FF8C00" />
        <ThemedText style={styles.addButtonText}>Add Ingredient</ThemedText>
      </Pressable>
    </View>
  );

  const renderStep2 = () => {
    const remainingSeconds = Math.max(0, totalRecipeSeconds - totalOccupiedTime);

    return (
      <View style={styles.wizardSection}>
        <View style={[styles.timelineSummary, { borderColor, backgroundColor: theme === 'dark' ? '#1E1E1E' : '#F8F9FA' }]}>
          <View style={styles.timelineSummaryLeft}>
            <Ionicons name="speedometer-outline" size={18} color="#FF8C00" />
            <ThemedText style={styles.timelineSummaryText}>
              Allocated: {formatSeconds(totalOccupiedTime)} / {formatSeconds(totalRecipeSeconds)}
            </ThemedText>
          </View>
          <ThemedText style={[styles.timelineSummaryRemaining, remainingSeconds <= 0 && { color: '#ff4444' }]}>
            {formatSeconds(remainingSeconds)} remaining
          </ThemedText>
        </View>

        {totalRecipeSeconds > 0 && (
          <View style={styles.globalTimeline}>
            <View style={[styles.globalTimelineTrack, { backgroundColor: theme === 'dark' ? '#222' : '#eee' }]}>
              {stepsWithTiming.map((seg, i) => (
                <View
                  key={i}
                  style={[
                    styles.globalTimelineSegment,
                    {
                      left: `${((seg.start_time || 0) / totalRecipeSeconds) * 100}%`,
                      width: `${(seg.duration / totalRecipeSeconds) * 100}%`,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {stepsWithTiming.map((stepItem, index) => {
          const { startTime, maxDuration } = getStepBounds(index);
          const endTime = startTime + stepItem.duration;
          const otherSegments = stepsWithTiming.filter((_, i) => i !== index);

          return (
            <View key={index} style={[styles.stepItem, { borderColor, backgroundColor: theme === 'dark' ? '#1E1E1E' : '#F8F9FA' }]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumberPill}>
                  <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                </View>
                <TextInput
                  style={[styles.stepTitleInput, inputStyle]}
                  placeholder="Step title (e.g. Sauté onions)"
                  placeholderTextColor="#888"
                  value={stepItem.title}
                  onChangeText={(val) => handleUpdateStep(index, 'title', val)}
                />
                <Pressable onPress={() => handleRemoveStep(index)} hitSlop={8} disabled={steps.length === 1} style={styles.removeBtn}>
                  <Ionicons name="trash-outline" size={18} color={steps.length === 1 ? '#ccc' : '#ff4444'} />
                </Pressable>
              </View>

              <TextInput
                style={[styles.stepDescInput, inputStyle]}
                placeholder="Detailed instructions for this step..."
                placeholderTextColor="#888"
                value={stepItem.description}
                onChangeText={(val) => handleUpdateStep(index, 'description', val)}
                multiline
              />

              <View style={styles.timeFieldsRow}>
                <View style={styles.timeFieldBlock}>
                  <ThemedText style={styles.timeFieldLabel}>Start</ThemedText>
                  <ThemedText style={[styles.timeChip, theme === 'dark' && styles.timeChipDark]}>
                    {formatSeconds(startTime)}
                  </ThemedText>
                </View>
                <View style={[styles.timeFieldBlock, styles.timeFieldBlockGrow]}>
                  <ThemedText style={styles.timeFieldLabel}>Duration</ThemedText>
                  <DurationInput
                    value={stepItem.duration}
                    onCommit={(seconds) => handleUpdateStep(index, 'duration', seconds)}
                    theme={theme}
                  />
                </View>
                <View style={styles.timeFieldBlock}>
                  <ThemedText style={styles.timeFieldLabel}>End</ThemedText>
                  <ThemedText style={[styles.timeChip, theme === 'dark' && styles.timeChipDark]}>
                    {formatSeconds(endTime)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.sliderContainer}>
                <View style={[styles.timelineTrack, { backgroundColor: theme === 'dark' ? '#222' : '#eee' }]}>
                  {otherSegments.map((seg, i) => (
                    <View
                      key={i}
                      style={[
                        styles.occupiedMarker,
                        {
                          left: `${((seg.start_time || 0) / totalRecipeSeconds) * 100}%`,
                          width: `${(seg.duration / totalRecipeSeconds) * 100}%`,
                        },
                      ]}
                    />
                  ))}
                  <View
                    style={[
                      styles.currentStepMarker,
                      {
                        left: `${(startTime / totalRecipeSeconds) * 100}%`,
                        width: `${(stepItem.duration / totalRecipeSeconds) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <View
                  style={[
                    styles.sliderInset,
                    {
                      left: `${(startTime / totalRecipeSeconds) * 100}%`,
                      width: `${(maxDuration / totalRecipeSeconds) * 100}%`,
                    },
                  ]}
                >
                  <Slider
                    style={styles.durationSlider}
                    minimumValue={1}
                    maximumValue={maxDuration}
                    step={1}
                    value={stepItem.duration}
                    onValueChange={(val) => handleUpdateStep(index, 'duration', Math.floor(val))}
                    minimumTrackTintColor="transparent"
                    maximumTrackTintColor="transparent"
                    thumbTintColor="#FF8C00"
                    disabled={totalRecipeSeconds <= 0}
                  />
                </View>
              </View>
            </View>
          );
        })}

        <Pressable
          onPress={handleAddStep}
          style={[styles.addButtonCompact, remainingSeconds <= 0 && styles.addButtonDisabled]}
          disabled={remainingSeconds <= 0}
        >
          <Ionicons name="add" size={18} color={remainingSeconds <= 0 ? '#ccc' : '#FF8C00'} />
          <ThemedText style={[styles.addButtonText, remainingSeconds <= 0 && { color: '#ccc' }]}>
            Add Step
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: step === 0 ? 'Recipe Info' : step === 1 ? 'Ingredients' : 'Steps', 
          headerLeft: () => step > 0 ? (
            <Pressable onPress={handleBack} style={styles.headerBtn}>
              <ThemedText style={{ color: '#FF8C00', fontSize: 16 }}>Back</ThemedText>
            </Pressable>
          ) : undefined,
          headerRight: () => (
            <Pressable 
              onPress={step === 2 ? handlePostRecipe : handleNext} 
              style={({pressed}) => [{ opacity: pressed ? 0.5 : 1 }, styles.headerBtn]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FF8C00" />
              ) : (
                <ThemedText style={styles.headerBtnText}>{step === 2 ? 'Post' : 'Next'}</ThemedText>
              )}
            </Pressable>
          )
        }} 
      />

      {renderWizardProgress()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl * 2, paddingTop: Spacing.sm },
  headerBtn: { paddingHorizontal: Spacing.xs },
  headerBtnText: { color: '#FF8C00', fontWeight: 'bold', fontSize: 16 },

  // Spanning Wizard Progress Tracker
  wizardProgressContainer: {
    width: '100%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  wizardProgressTrack: {
    position: 'absolute',
    top: 28,
    left: Spacing.lg + 30,
    right: Spacing.lg + 30,
    height: 3,
    borderRadius: 2,
    zIndex: 1,
  },
  wizardProgressFill: {
    height: '100%',
    backgroundColor: '#FF8C00',
    borderRadius: 2,
  },
  wizardStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  wizardStepNode: {
    alignItems: 'center',
    width: 80,
  },
  wizardNodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    elevation: 2,
  },
  wizardNodeCircleActive: {
    backgroundColor: '#FF8C00',
  },
  wizardNodeCircleCurrent: {
    backgroundColor: '#FF8C00',
    shadowColor: '#FF8C00',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  wizardNodeNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  wizardNodeNumberActive: {
    color: '#fff',
  },
  wizardNodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  wizardNodeLabelActive: {
    color: '#FF8C00',
  },
  wizardNodeLabelCurrent: {
    fontWeight: 'bold',
    color: '#FF8C00',
  },

  // Form Section & Inputs
  wizardSection: { gap: Spacing.md },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF8C00',
    letterSpacing: 0.3,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingTop: 14,
    lineHeight: 22,
  },
  compactCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF8C00',
    letterSpacing: 0.4,
  },
  durationInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationField: {
    alignItems: 'center',
    minWidth: 64,
  },
  durationInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    width: 60,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  durationUnit: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontWeight: '600',
  },
  durationSep: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ccc',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  compactInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 14,
  },
  removeBtn: {
    padding: 4,
  },
  addButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#FF8C00',
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  addButtonText: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: 14,
  },
  timelineSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  timelineSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineSummaryText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timelineSummaryRemaining: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
  },
  globalTimeline: { marginBottom: Spacing.xs },
  globalTimelineTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  globalTimelineSegment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#FF8C00',
    opacity: 0.85,
  },
  stepItem: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  stepNumberPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  stepTitleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  stepDescInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  timeFieldsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs + 2,
    marginTop: 4,
  },
  timeFieldBlock: {
    minWidth: 64,
  },
  timeFieldBlockGrow: {
    flex: 1,
  },
  timeFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF8C00',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeChip: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    fontVariant: ['tabular-nums'],
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    textAlign: 'center',
    overflow: 'hidden',
  },
  timeChipDark: {
    backgroundColor: '#222',
    color: '#aaa',
  },
  timeFieldInput: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    width: '100%',
    minHeight: 38,
  },
  sliderContainer: { position: 'relative', height: 36, justifyContent: 'center', marginTop: 4 },
  sliderInset: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  durationSlider: { width: '100%', height: 36 },
  timelineTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    top: '50%',
    marginTop: -2,
  },
  occupiedMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#bbb',
    borderRadius: 1,
  },
  currentStepMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#FF8C00',
    borderRadius: 1,
    opacity: 0.85,
  },
  addButtonDisabled: { borderColor: '#ddd' },
});
