import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SubActionReminder } from '@/types/post';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { backendAPI } from '@/services/backend';
import Slider from '@react-native-community/slider';
import {
  COOKING_ACTIONS,
  MEASUREMENT_UNITS,
  getSmartRecommendation,
  checkActionGuardrails,
  SmartRecommendationResult,
} from '@/constants/cooking-actions';

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
    s: s.toString().padStart(2, '0'),
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

interface StepItemState {
  action?: string;
  stepType: 'prep' | 'heat';
  title: string;
  description: string;
  duration: number;
  usedIngredients: string[];
  subActions?: SubActionReminder[];
}

export default function CreateRecipeScreen() {
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();
  const params = useLocalSearchParams<{
    liveTitle?: string;
    liveSteps?: string;
    liveHeatSeconds?: string;
  }>();

  // Wizard state: 0 = Info, 1 = Ingredients, 2 = Steps
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [activeUnitPickerIndex, setActiveUnitPickerIndex] = useState<number | null>(null);
  const [showTimerPromptModal, setShowTimerPromptModal] = useState(false);

  // Form Data
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [recipeDuration, setRecipeDuration] = useState({ h: '', m: '10', s: '00' });
  const [ingredients, setIngredients] = useState([
    { name: '', quantity: '', unit: 'g' },
  ]);
  const [steps, setSteps] = useState<StepItemState[]>([
    { action: 'prep', stepType: 'prep', title: 'Prep ingredients', description: 'Chop and measure ingredients', duration: 0, usedIngredients: [] },
    { action: 'saute', stepType: 'heat', title: 'Sauté aromatics', description: 'Sauté in hot oil', duration: 180, usedIngredients: [] },
  ]);

  useEffect(() => {
    if (params.liveSteps) {
      try {
        const parsed = JSON.parse(params.liveSteps);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSteps(parsed);

          if (params.liveTitle) {
            setTitle(params.liveTitle);
            setCaption(`Live recorded recipe session for ${params.liveTitle}`);
          } else {
            setCaption('Live recorded recipe session');
          }

          if (params.liveHeatSeconds) {
            const totalSecs = parseInt(params.liveHeatSeconds, 10) || 0;
            if (totalSecs > 0) {
              const { h, m, s } = secondsToTime(totalSecs);
              setRecipeDuration({ h, m, s });
            }
          }

          setStep(1); // Jump to ingredients tab
        }
      } catch (e) {
        console.error('Failed to parse liveSteps', e);
      }
    }
  }, [params.liveSteps, params.liveTitle, params.liveHeatSeconds]);

  const totalRecipeSeconds = useMemo(
    () => timeToSeconds(recipeDuration.h, recipeDuration.m, recipeDuration.s),
    [recipeDuration]
  );

  const stepsWithTiming = useMemo(() => {
    let currentStart = 0;
    return steps.map((s) => {
      const stepDuration = s.stepType === 'prep' ? 0 : s.duration;
      const stepWithTime = { ...s, duration: stepDuration, start_time: currentStart };
      if (s.stepType === 'heat') {
        currentStart += stepDuration;
      }
      return stepWithTime;
    });
  }, [steps]);

  // Only Active Heat steps occupy the timeline
  const totalOccupiedTime = useMemo(
    () => steps.reduce((acc, s) => acc + (s.stepType === 'prep' ? 0 : s.duration), 0),
    [steps]
  );

  const remainingSeconds = Math.max(0, totalRecipeSeconds - totalOccupiedTime);

  const getStepBounds = useCallback(
    (index: number) => {
      const startTime = steps.slice(0, index).reduce((sum, s) => sum + (s.stepType === 'prep' ? 0 : s.duration), 0);
      const laterDuration = steps.slice(index + 1).reduce((sum, s) => sum + (s.stepType === 'prep' ? 0 : s.duration), 0);
      const maxDuration = Math.max(1, totalRecipeSeconds - startTime - laterDuration);
      return { startTime, maxDuration };
    },
    [steps, totalRecipeSeconds]
  );

  useEffect(() => {
    if (totalRecipeSeconds <= 0) return;
    setSteps((prev) => {
      let changed = false;
      const updated = prev.map((s, i) => {
        if (s.stepType === 'prep') return s;
        const startTime = prev.slice(0, i).reduce((sum, st) => sum + (st.stepType === 'prep' ? 0 : st.duration), 0);
        const laterDuration = prev.slice(i + 1).reduce((sum, st) => sum + (st.stepType === 'prep' ? 0 : st.duration), 0);
        const maxDuration = Math.max(1, totalRecipeSeconds - startTime - laterDuration);
        const clamped = clamp(s.duration, 1, maxDuration);
        if (clamped !== s.duration) changed = true;
        return { ...s, duration: clamped };
      });
      return changed ? updated : prev;
    });
  }, [totalRecipeSeconds]);

  const masterIngredientNames = useMemo(() => {
    return ingredients.map((i) => i.name.trim()).filter(Boolean);
  }, [ingredients]);

  const unassignedIngredients = useMemo(() => {
    const assignedSet = new Set<string>();
    steps.forEach((s) => {
      (s.usedIngredients || []).forEach((name) => assignedSet.add(name.trim().toLowerCase()));
    });
    return masterIngredientNames.filter((name) => !assignedSet.has(name.toLowerCase()));
  }, [masterIngredientNames, steps]);

  const handleNext = () => {
    if (step === 0 && totalRecipeSeconds <= 0) {
      Alert.alert('Invalid Duration', 'Please set a total active heat recipe duration first.');
      return;
    }
    if (step === 1 && masterIngredientNames.length === 0) {
      Alert.alert('Missing Ingredients', 'Please add at least one ingredient to your recipe.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => setStep((prev) => prev - 1);

  const handleAddIngredient = () =>
    setIngredients([...ingredients, { name: '', quantity: '', unit: 'g' }]);

  const handleUpdateIngredient = (index: number, field: string, value: string) => {
    const newIngredients = [...ingredients];
    const oldName = newIngredients[index].name;
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);

    if (field === 'name' && oldName && oldName !== value) {
      setSteps((prevSteps) =>
        prevSteps.map((s) => ({
          ...s,
          usedIngredients: (s.usedIngredients || []).map((ing) =>
            ing.toLowerCase() === oldName.toLowerCase() ? value : ing
          ),
        }))
      );
    }
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    const removedName = ingredients[index].name;
    setIngredients(ingredients.filter((_, i) => i !== index));

    if (removedName) {
      setSteps((prevSteps) =>
        prevSteps.map((s) => ({
          ...s,
          usedIngredients: (s.usedIngredients || []).filter(
            (ing) => ing.toLowerCase() !== removedName.toLowerCase()
          ),
        }))
      );
    }
  };

  const handleAddStep = (type: 'prep' | 'heat' = 'heat') => {
    const remaining = totalRecipeSeconds - totalOccupiedTime;
    if (type === 'heat' && remaining <= 0) {
      Alert.alert('Timeline Full', 'Active heat step timeline is fully occupied.');
      return;
    }
    setSteps([
      ...steps,
      {
        action: type === 'prep' ? 'prep' : '',
        stepType: type,
        title: '',
        description: '',
        duration: type === 'prep' ? 0 : Math.min(60, remaining),
        usedIngredients: [],
      },
    ]);
  };

  const handleToggleStepType = (index: number, newType: 'prep' | 'heat') => {
    const newSteps = [...steps];
    const current = newSteps[index];
    const updatedDuration = newType === 'prep' ? 0 : current.duration || 60;
    newSteps[index] = {
      ...current,
      stepType: newType,
      duration: updatedDuration,
    };
    setSteps(newSteps);
  };

  const handleToggleStepIngredient = (stepIndex: number, ingredientName: string) => {
    const newSteps = [...steps];
    const currentList = newSteps[stepIndex].usedIngredients || [];
    const exists = currentList.some((i) => i.toLowerCase() === ingredientName.toLowerCase());

    const updatedList = exists
      ? currentList.filter((i) => i.toLowerCase() !== ingredientName.toLowerCase())
      : [...currentList, ingredientName];

    newSteps[stepIndex] = { ...newSteps[stepIndex], usedIngredients: updatedList };

    if (newSteps[stepIndex].stepType === 'heat') {
      const searchContext = `${newSteps[stepIndex].title} ${newSteps[stepIndex].description} ${updatedList.join(' ')}`;
      const rec = getSmartRecommendation(newSteps[stepIndex].action, searchContext);
      if (rec) {
        const { maxDuration } = getStepBounds(stepIndex);
        newSteps[stepIndex].duration = clamp(rec.recommendedSeconds, 1, maxDuration);
      }
    }

    setSteps(newSteps);
  };

  const handleSelectAction = (index: number, actionId: string) => {
    const newAction = steps[index].action === actionId ? '' : actionId;
    const actionObj = COOKING_ACTIONS.find((a) => a.id === actionId);
    const isPrep = actionObj?.category === 'prep' || actionId === 'prep';
    const newStepType = isPrep ? 'prep' : 'heat';

    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      action: newAction,
      stepType: newStepType,
      duration: isPrep ? 0 : newSteps[index].duration || 60,
    };

    if (!isPrep) {
      const assignedIngredientsText = (newSteps[index].usedIngredients || []).join(' ');
      const searchContext = `${newSteps[index].title} ${newSteps[index].description} ${assignedIngredientsText}`;
      const rec = getSmartRecommendation(newAction, searchContext);

      if (rec) {
        const { maxDuration } = getStepBounds(index);
        newSteps[index].duration = clamp(rec.recommendedSeconds, 1, maxDuration);

        if (!newSteps[index].title.trim()) {
          newSteps[index].title = rec.matchedKeyword
            ? `${rec.actionLabel} ${rec.matchedKeyword}`
            : `${rec.actionLabel} ingredients`;
        }
      }
    } else {
      const firstIngredient = newSteps[index].usedIngredients?.[0];
      const prepTitles: Record<string, string> = {
        chop: firstIngredient ? `Chop ${firstIngredient}` : 'Chop & dice ingredients',
        slice: firstIngredient ? `Slice ${firstIngredient}` : 'Slice ingredients',
        mix: firstIngredient ? `Mix ${firstIngredient}` : 'Mix & combine ingredients',
        whisk: firstIngredient ? `Whisk ${firstIngredient}` : 'Whisk & beat ingredients',
        peel: firstIngredient ? `Peel ${firstIngredient}` : 'Peel & grate ingredients',
        marinate: firstIngredient ? `Marinate ${firstIngredient}` : 'Season & marinate',
        measure: 'Measure ingredients',
        wash: firstIngredient ? `Wash ${firstIngredient}` : 'Wash & rinse ingredients',
        rest: firstIngredient ? `Rest ${firstIngredient}` : 'Rest & cool',
      };
      if (!newSteps[index].title.trim() || newSteps[index].title.startsWith('Prep')) {
        newSteps[index].title = prepTitles[actionId] || (actionObj?.label ? `${actionObj.label} ingredients` : 'Prep ingredients');
      }
    }

    setSteps(newSteps);
  };

  const handleUpdateStep = (index: number, field: keyof StepItemState, value: any) => {
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

  const handleApplySmartRecommendation = (index: number, rec: SmartRecommendationResult) => {
    const { maxDuration } = getStepBounds(index);
    handleUpdateStep(index, 'duration', clamp(rec.recommendedSeconds, 1, maxDuration));
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const executePostRecipe = async (overrideTotalSeconds?: number) => {
    const finalTotalSeconds = overrideTotalSeconds ?? totalRecipeSeconds;
    const finalTitle = title.trim() || 'Live Recorded Recipe';
    const finalCaption = caption.trim() || `Live recorded recipe session for ${finalTitle}`;
    const validIngredients = ingredients.filter((i) => i.name.trim());

    const stepsToPost = stepsWithTiming
      .filter((s) => s.title.trim())
      .map((s) => ({
        ...s,
        duration: s.stepType === 'prep' ? 0 : s.duration,
        step_type: s.stepType,
        sub_actions: s.subActions || [],
      }));

    setIsSubmitting(true);
    try {
      await backendAPI.posts.createRecipe(
        finalTitle,
        finalCaption,
        finalTotalSeconds,
        validIngredients,
        stepsToPost
      );
      router.replace('/(tabs)');
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert(e.message);
      else Alert.alert('Error', e.message);
    } finally {
      setIsSubmitting(false);
      setShowTimerPromptModal(false);
    }
  };

  const handlePostRecipe = async () => {
    const finalTitle = title.trim() || 'Live Recorded Recipe';
    const finalCaption = caption.trim() || `Live recorded recipe session for ${finalTitle}`;

    if (!title.trim()) {
      setTitle(finalTitle);
    }
    if (!caption.trim()) {
      setCaption(finalCaption);
    }

    const stepsToPost = stepsWithTiming.filter((s) => s.title.trim());
    if (stepsToPost.length === 0) {
      Alert.alert('Missing Steps', 'Add at least one step with a title before posting.');
      return;
    }

    // 1. Guardrail: All ingredients must be assigned to at least one step
    if (unassignedIngredients.length > 0) {
      const formattedList = unassignedIngredients.map((ing) => `• ${ing}`).join('\n');
      Alert.alert(
        'Unassigned Ingredients Detected',
        `All ingredients must be assigned to a recipe step.\n\nThe following ingredients are not assigned yet:\n${formattedList}\n\nPlease select which step uses them before posting.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // 2. Guardrail: Timer fully occupied check for heat steps
    if (remainingSeconds > 0) {
      setShowTimerPromptModal(true);
      return;
    }

    await executePostRecipe();
  };

  const handleAutoAdjustRecipeTime = async () => {
    if (totalOccupiedTime <= 0) return;
    const { h, m, s } = secondsToTime(totalOccupiedTime);
    setRecipeDuration({ h, m, s });
    await executePostRecipe(totalOccupiedTime);
  };

  const handleAddRemainingStep = () => {
    if (remainingSeconds <= 0) return;
    setSteps([
      ...steps,
      {
        action: 'saute',
        stepType: 'heat',
        title: 'Final Sear & Serve',
        description: 'Complete cooking and plate dish',
        duration: remainingSeconds,
        usedIngredients: [],
      },
    ]);
    setShowTimerPromptModal(false);
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
          <View style={[styles.wizardProgressFill, { width: `${(step / 2) * 100}%` }]} />
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
                    <ThemedText style={[styles.wizardNodeNumber, isActive && styles.wizardNodeNumberActive]}>
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
          <Ionicons name="flame-outline" size={18} color="#FF8C00" />
          <ThemedText style={styles.compactLabel}>Total Active Heat Duration</ThemedText>
        </View>
        <ThemedText style={{ fontSize: 12, color: '#888', marginTop: -4 }}>
          Total active stove/heat duration. Untimed prep steps do not consume this timeline!
        </ThemedText>

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

      <Pressable
        style={styles.liveRecordLaunchBtn}
        onPress={() => router.push('/recipe/live-record')}
      >
        <Ionicons name="videocam" size={18} color="#fff" />
        <ThemedText style={styles.liveRecordLaunchBtnText}>
          Record Live Cooking Session with Checkpoints
        </ThemedText>
      </Pressable>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.wizardSection}>
      <ThemedText style={styles.sectionHeading}>Ingredients List</ThemedText>
      <ThemedText style={styles.sectionSubtitle}>
        Add all ingredients required for this recipe. You will specify which step uses them next.
      </ThemedText>

      {ingredients.map((ing, index) => (
        <View
          key={index}
          style={[styles.compactRow, { borderColor, backgroundColor: theme === 'dark' ? '#1E1E1E' : '#F8F9FA' }]}
        >
          <TextInput
            style={[styles.compactInput, { flex: 2 }, inputStyle]}
            placeholder="Ingredient (e.g. Garlic)"
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

          <Pressable
            style={[
              styles.unitSelectorBtn,
              { borderColor, backgroundColor: theme === 'dark' ? '#2A2A2A' : '#EFEFEF' },
            ]}
            onPress={() => setActiveUnitPickerIndex(index)}
          >
            <ThemedText style={styles.unitSelectorBtnText}>{ing.unit || 'Unit'}</ThemedText>
            <Ionicons name="chevron-down" size={14} color="#FF8C00" />
          </Pressable>

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
    return (
      <View style={styles.wizardSection}>
        <View
          style={[styles.timelineSummary, { borderColor, backgroundColor: theme === 'dark' ? '#1E1E1E' : '#F8F9FA' }]}
        >
          <View style={styles.timelineSummaryLeft}>
            <Ionicons name="speedometer-outline" size={18} color="#FF8C00" />
            <ThemedText style={styles.timelineSummaryText}>
              Active Heat: {formatSeconds(totalOccupiedTime)} / {formatSeconds(totalRecipeSeconds)}
            </ThemedText>
          </View>
          <ThemedText style={[styles.timelineSummaryRemaining, remainingSeconds <= 0 && { color: '#10B981' }]}>
            {remainingSeconds > 0 ? `${formatSeconds(remainingSeconds)} remaining` : '✓ 100% Heat Occupied'}
          </ThemedText>
        </View>

        {unassignedIngredients.length > 0 && (
          <View
            style={[
              styles.unassignedBanner,
              {
                borderColor: '#F59E0B',
                backgroundColor: theme === 'dark' ? '#271F14' : '#FFFBEB',
              },
            ]}
          >
            <Ionicons name="warning-outline" size={16} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.unassignedBannerTitle}>Unassigned Ingredients ({unassignedIngredients.length})</ThemedText>
              <ThemedText style={styles.unassignedBannerText}>
                Tag these in steps below: {unassignedIngredients.join(', ')}
              </ThemedText>
            </View>
          </View>
        )}

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

          const isPrepStep = stepItem.stepType === 'prep';
          const assignedIngredientsList = stepItem.usedIngredients || [];
          const searchContext = `${stepItem.title} ${stepItem.description} ${assignedIngredientsList.join(' ')}`;
          const rec = !isPrepStep ? getSmartRecommendation(stepItem.action, searchContext) : null;
          const guardrail = !isPrepStep ? checkActionGuardrails(stepItem.action, searchContext, stepItem.duration) : null;

          return (
            <View
              key={index}
              style={[styles.stepItem, { borderColor, backgroundColor: theme === 'dark' ? '#1E1E1E' : '#F8F9FA' }]}
            >
              <View style={styles.stepHeader}>
                <View style={styles.stepNumberPill}>
                  <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                </View>
                <TextInput
                  style={[styles.stepTitleInput, inputStyle]}
                  placeholder={isPrepStep ? 'Prep step (e.g. Chop onions)' : 'Heat step (e.g. Sauté garlic)'}
                  placeholderTextColor="#888"
                  value={stepItem.title}
                  onChangeText={(val) => handleUpdateStep(index, 'title', val)}
                />
                <Pressable
                  onPress={() => handleRemoveStep(index)}
                  hitSlop={8}
                  disabled={steps.length === 1}
                  style={styles.removeBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={steps.length === 1 ? '#ccc' : '#ff4444'} />
                </Pressable>
              </View>

              {/* Prep vs Active Heat Step Categorization Selector */}
              <View style={styles.stepTypeToggleRow}>
                <Pressable
                  style={[
                    styles.stepTypeOption,
                    isPrepStep
                      ? styles.stepTypeOptionActivePrep
                      : { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#EFEFEF', borderColor },
                  ]}
                  onPress={() => handleToggleStepType(index, 'prep')}
                >
                  <Ionicons name="cut-outline" size={14} color={isPrepStep ? '#fff' : theme === 'dark' ? '#aaa' : '#666'} />
                  <ThemedText style={[styles.stepTypeOptionText, isPrepStep && styles.stepTypeOptionTextActive]}>
                    Untimed Prep Step
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[
                    styles.stepTypeOption,
                    !isPrepStep
                      ? styles.stepTypeOptionActiveHeat
                      : { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#EFEFEF', borderColor },
                  ]}
                  onPress={() => handleToggleStepType(index, 'heat')}
                >
                  <Ionicons name="flame-outline" size={14} color={!isPrepStep ? '#fff' : theme === 'dark' ? '#aaa' : '#666'} />
                  <ThemedText style={[styles.stepTypeOptionText, !isPrepStep && styles.stepTypeOptionTextActive]}>
                    Active Heat Step
                  </ThemedText>
                </Pressable>
              </View>

              {/* Action Technique Chips */}
              <View style={styles.actionPickerBlock}>
                <ThemedText style={styles.actionPickerHeader}>Cooking Action / Technique:</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionChipContainer}>
                  {COOKING_ACTIONS.filter((act) => (isPrepStep ? act.category === 'prep' : act.category === 'heat')).map((act) => {
                    const isSelected = stepItem.action === act.id;
                    return (
                      <Pressable
                        key={act.id}
                        onPress={() => handleSelectAction(index, act.id)}
                        style={[
                          styles.actionChip,
                          isSelected
                            ? styles.actionChipActive
                            : { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#EFEFEF', borderColor },
                        ]}
                      >
                        <Ionicons
                          name={act.icon as any}
                          size={14}
                          color={isSelected ? '#fff' : theme === 'dark' ? '#aaa' : '#666'}
                        />
                        <ThemedText
                          style={[
                            styles.actionChipLabel,
                            isSelected ? styles.actionChipLabelActive : { color: theme === 'dark' ? '#ccc' : '#444' },
                          ]}
                        >
                          {act.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Ingredients Required in this Step Selector */}
              {masterIngredientNames.length > 0 && (
                <View style={styles.stepIngredientsBlock}>
                  <ThemedText style={styles.stepIngredientsHeader}>Ingredients Needed for this Step:</ThemedText>
                  <View style={styles.stepIngredientsChipsRow}>
                    {masterIngredientNames.map((ingName) => {
                      const isUsed = (stepItem.usedIngredients || []).some(
                        (i) => i.toLowerCase() === ingName.toLowerCase()
                      );
                      return (
                        <Pressable
                          key={ingName}
                          onPress={() => handleToggleStepIngredient(index, ingName)}
                          style={[
                            styles.ingredientChip,
                            isUsed
                              ? styles.ingredientChipActive
                              : { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F0F0F0', borderColor },
                          ]}
                        >
                          <Ionicons
                            name={isUsed ? 'checkmark-circle' : 'add-circle-outline'}
                            size={14}
                            color={isUsed ? '#fff' : theme === 'dark' ? '#888' : '#777'}
                          />
                          <ThemedText
                            style={[
                              styles.ingredientChipLabel,
                              isUsed ? styles.ingredientChipLabelActive : { color: theme === 'dark' ? '#ccc' : '#555' },
                            ]}
                          >
                            {ingName}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <TextInput
                style={[styles.stepDescInput, inputStyle]}
                placeholder="Detailed instructions for this step..."
                placeholderTextColor="#888"
                value={stepItem.description}
                onChangeText={(val) => handleUpdateStep(index, 'description', val)}
                multiline
              />

              {/* UNTIMED PREP STEP BADGE */}
              {isPrepStep ? (
                <View style={[styles.prepBadgeCard, { backgroundColor: theme === 'dark' ? '#1A2332' : '#F0FDF4', borderColor: '#10B981' }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.prepBadgeTitle}>Untimed Prep Step (Checklist Style)</ThemedText>
                    <ThemedText style={styles.prepBadgeDesc}>
                      During cooking, this step gives a "Tap when done" button so chefs chop at their own pace without stress!
                    </ThemedText>
                  </View>
                </View>
              ) : (
                <>
                  {/* Smart Recommendation Banner for Heat steps */}
                  {rec && (
                    <View
                      style={[
                        styles.smartBanner,
                        {
                          borderColor: '#3B82F6',
                          backgroundColor: theme === 'dark' ? '#0F172A' : '#EFF6FF',
                        },
                      ]}
                    >
                      <View style={styles.smartBannerHeader}>
                        <Ionicons name="sparkles" size={16} color="#3B82F6" />
                        <ThemedText style={styles.smartBannerTitle}>
                          Smart Default: {rec.actionLabel}
                          {rec.matchedKeyword ? ` + ${rec.matchedKeyword}` : ''}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.smartBannerReason, { color: theme === 'dark' ? '#94A3B8' : '#475569' }]}>
                        {rec.reason} (Recommended: {formatSeconds(rec.recommendedSeconds)})
                      </ThemedText>

                      {stepItem.duration !== rec.recommendedSeconds && (
                        <Pressable
                          style={styles.smartBannerApplyBtn}
                          onPress={() => handleApplySmartRecommendation(index, rec)}
                        >
                          <Ionicons name="flash-outline" size={14} color="#fff" />
                          <ThemedText style={styles.smartBannerApplyBtnText}>
                            Apply Smart Default ({formatSeconds(rec.recommendedSeconds)})
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {/* Action-Based Guardrail Warning Banner for Heat steps */}
                  {guardrail?.isWarning && (
                    <View
                      style={[
                        styles.guardrailBanner,
                        {
                          borderColor: guardrail.isTooHigh ? '#EF4444' : '#F59E0B',
                          backgroundColor: guardrail.isTooHigh
                            ? theme === 'dark'
                              ? '#2C0F14'
                              : '#FEF2F2'
                            : theme === 'dark'
                            ? '#271F14'
                            : '#FFFBEB',
                        },
                      ]}
                    >
                      <View style={styles.guardrailHeader}>
                        <Ionicons
                          name={guardrail.isTooHigh ? 'alert-circle' : 'warning-outline'}
                          size={16}
                          color={guardrail.isTooHigh ? '#EF4444' : '#F59E0B'}
                        />
                        <ThemedText
                          style={[
                            styles.guardrailTitle,
                            { color: guardrail.isTooHigh ? '#EF4444' : '#D97706' },
                          ]}
                        >
                          Action Guardrail Warning
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[
                          styles.guardrailMessage,
                          { color: theme === 'dark' ? '#E2E8F0' : '#334155' },
                        ]}
                      >
                        {guardrail.message}
                      </ThemedText>

                      {rec && (
                        <Pressable
                          style={[
                            styles.guardrailFixBtn,
                            { backgroundColor: guardrail.isTooHigh ? '#EF4444' : '#F59E0B' },
                          ]}
                          onPress={() => handleApplySmartRecommendation(index, rec)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                          <ThemedText style={styles.guardrailFixBtnText}>
                            Fix Duration to {formatSeconds(rec.recommendedSeconds)}
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  )}

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
                        thumbTintColor={guardrail?.isWarning ? (guardrail.isTooHigh ? '#EF4444' : '#F59E0B') : '#FF8C00'}
                        disabled={totalRecipeSeconds <= 0}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          );
        })}

        <View style={styles.addStepButtonsRow}>
          <Pressable
            onPress={() => handleAddStep('prep')}
            style={[styles.addButtonCompact, { flex: 1, borderColor: '#10B981' }]}
          >
            <Ionicons name="cut-outline" size={16} color="#10B981" />
            <ThemedText style={[styles.addButtonText, { color: '#10B981' }]}>+ Untimed Prep</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => handleAddStep('heat')}
            style={[
              styles.addButtonCompact,
              { flex: 1 },
              remainingSeconds <= 0 && styles.addButtonDisabled,
            ]}
            disabled={remainingSeconds <= 0}
          >
            <Ionicons name="flame-outline" size={16} color={remainingSeconds <= 0 ? '#ccc' : '#FF8C00'} />
            <ThemedText style={[styles.addButtonText, remainingSeconds <= 0 && { color: '#ccc' }]}>
              + Active Heat
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: step === 0 ? 'Recipe Info' : step === 1 ? 'Ingredients' : 'Steps',
          headerLeft: () =>
            step > 0 ? (
              <Pressable onPress={handleBack} style={styles.headerBtn}>
                <ThemedText style={{ color: '#FF8C00', fontSize: 16 }}>Back</ThemedText>
              </Pressable>
            ) : undefined,
          headerRight: () => (
            <Pressable
              onPress={step === 2 ? handlePostRecipe : handleNext}
              style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }, styles.headerBtn]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FF8C00" />
              ) : (
                <ThemedText style={styles.headerBtnText}>{step === 2 ? 'Post' : 'Next'}</ThemedText>
              )}
            </Pressable>
          ),
        }}
      />

      {renderWizardProgress()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </ScrollView>

      {/* Measurement Unit Picker Modal */}
      <Modal
        visible={activeUnitPickerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveUnitPickerIndex(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveUnitPickerIndex(null)}>
          <View style={[styles.unitModalContainer, { backgroundColor: theme === 'dark' ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={styles.unitModalHeader}>
              <ThemedText style={styles.unitModalTitle}>Select Set Measurement Unit</ThemedText>
              <Pressable onPress={() => setActiveUnitPickerIndex(null)}>
                <Ionicons name="close" size={20} color="#888" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.unitGridContainer}>
              {MEASUREMENT_UNITS.map((unit) => {
                const isSelected = activeUnitPickerIndex !== null && ingredients[activeUnitPickerIndex]?.unit === unit;
                return (
                  <Pressable
                    key={unit}
                    style={[
                      styles.unitModalItem,
                      isSelected && styles.unitModalItemActive,
                      { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F5F5F5' },
                    ]}
                    onPress={() => {
                      if (activeUnitPickerIndex !== null) {
                        handleUpdateIngredient(activeUnitPickerIndex, 'unit', unit);
                      }
                      setActiveUnitPickerIndex(null);
                    }}
                  >
                    <ThemedText style={[styles.unitModalItemText, isSelected && styles.unitModalItemTextActive]}>
                      {unit}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Timer Occupancy Prompt Modal */}
      <Modal visible={showTimerPromptModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.promptModalCard, { backgroundColor: theme === 'dark' ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={styles.promptModalHeaderIcon}>
              <Ionicons name="flame-outline" size={32} color="#FF8C00" />
            </View>
            <ThemedText style={styles.promptModalTitle}>Active Heat Timer Not Occupied</ThemedText>
            <ThemedText style={styles.promptModalMessage}>
              Active heat steps total <ThemedText style={{ fontWeight: 'bold' }}>{formatSeconds(totalOccupiedTime)}</ThemedText>, leaving <ThemedText style={{ color: '#FF8C00', fontWeight: 'bold' }}>{formatSeconds(remainingSeconds)}</ThemedText> unallocated out of your <ThemedText style={{ fontWeight: 'bold' }}>{formatSeconds(totalRecipeSeconds)}</ThemedText> heat duration.
            </ThemedText>

            <View style={styles.promptModalActions}>
              <Pressable style={styles.promptActionPrimaryBtn} onPress={handleAutoAdjustRecipeTime}>
                <Ionicons name="sparkles" size={16} color="#fff" />
                <ThemedText style={styles.promptActionPrimaryBtnText}>
                  Auto-Adjust Total Heat Time to {formatSeconds(totalOccupiedTime)}
                </ThemedText>
              </Pressable>

              <Pressable style={styles.promptActionSecondaryBtn} onPress={handleAddRemainingStep}>
                <Ionicons name="add-circle-outline" size={16} color="#FF8C00" />
                <ThemedText style={styles.promptActionSecondaryBtnText}>
                  Add Active Heat Step for Remaining {formatSeconds(remainingSeconds)}
                </ThemedText>
              </Pressable>

              <Pressable style={styles.promptActionCancelBtn} onPress={() => setShowTimerPromptModal(false)}>
                <ThemedText style={styles.promptActionCancelBtnText}>Edit Durations Manually</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

  // Measurement Unit Selector Button
  unitSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 74,
    justifyContent: 'space-between',
  },
  unitSelectorBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF8C00',
  },

  removeBtn: {
    padding: 4,
  },
  addStepButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
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
  },
  addButtonText: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: 13,
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
  unassignedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  unassignedBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  unassignedBannerText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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

  // Step Type Categorization Row (Prep vs Heat)
  stepTypeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  stepTypeOptionActivePrep: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepTypeOptionActiveHeat: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  stepTypeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  stepTypeOptionTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Action Picker Chips
  actionPickerBlock: {
    gap: 6,
  },
  actionPickerHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF8C00',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  actionChipContainer: {
    gap: 6,
    paddingVertical: 2,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionChipActive: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  actionChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionChipLabelActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Step Ingredients Block
  stepIngredientsBlock: {
    gap: 6,
    marginTop: 2,
  },
  stepIngredientsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stepIngredientsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  ingredientChipActive: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  ingredientChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  ingredientChipLabelActive: {
    color: '#fff',
    fontWeight: '700',
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

  // Prep Badge Card
  prepBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 10,
  },
  prepBadgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  prepBadgeDesc: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    lineHeight: 15,
  },

  // Smart Banner
  smartBanner: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 10,
    gap: 4,
  },
  smartBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smartBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  smartBannerReason: {
    fontSize: 12,
    lineHeight: 16,
  },
  smartBannerApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    marginTop: 4,
  },
  smartBannerApplyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Guardrail Banner
  guardrailBanner: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 10,
    gap: 4,
  },
  guardrailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guardrailTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  guardrailMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
  guardrailFixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    marginTop: 4,
  },
  guardrailFixBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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

  // Unit Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  unitModalContainer: {
    width: '100%',
    maxWidth: 360,
    maxHeight: 400,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  unitModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF8C00',
  },
  unitGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  unitModalItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  unitModalItemActive: {
    backgroundColor: '#FF8C00',
  },
  unitModalItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  unitModalItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Timer Prompt Modal
  promptModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  promptModalHeaderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  promptModalMessage: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  promptModalActions: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  promptActionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8C00',
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  promptActionPrimaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  promptActionSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FF8C00',
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  promptActionSecondaryBtnText: {
    color: '#FF8C00',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  promptActionCancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  promptActionCancelBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  liveRecordLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  liveRecordLaunchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
