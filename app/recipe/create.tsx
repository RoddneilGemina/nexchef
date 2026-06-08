import { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { backendAPI } from '@/services/backend';

export default function CreateRecipeScreen() {
  const theme = useColorScheme() ?? 'light';
  const router = useRouter();

  // Wizard state: 0 = Info, 1 = Ingredients, 2 = Steps
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '' }]);
  const [steps, setSteps] = useState([{ title: '', description: '', duration: '' }]);

  const handleNext = () => setStep(prev => prev + 1);
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

  const handleAddStep = () => setSteps([...steps, { title: '', description: '', duration: '' }]);
  const handleUpdateStep = (index: number, field: string, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
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
    
    setIsSubmitting(true);
    try {
      await backendAPI.posts.createRecipe(title.trim(), caption.trim(), ingredients, steps);
      router.back();
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert(e.message);
      else Alert.alert("Error", e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep0 = () => (
    <View style={styles.wizardSection}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>Basic Info</ThemedText>
      <TextInput
        style={[styles.input, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
        placeholder="Recipe Title (e.g. Grandma's Lasagna)"
        placeholderTextColor="#888"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />
      <TextInput
        style={[styles.input, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc', minHeight: 100, textAlignVertical: 'top' }]}
        placeholder="A brief description or story about this recipe..."
        placeholderTextColor="#888"
        value={caption}
        onChangeText={setCaption}
        multiline
      />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.wizardSection}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>Ingredients</ThemedText>
      {ingredients.map((ing, index) => (
        <View key={index} style={styles.rowItem}>
          <Pressable onPress={() => handleRemoveIngredient(index)} style={styles.removeBtn}>
            <Ionicons name="remove-circle" size={24} color="#ff4444" />
          </Pressable>
          <View style={styles.ingredientInputs}>
            <TextInput
              style={[styles.inputSmall, { flex: 1.5, color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
              placeholder="Name (e.g. Flour)"
              placeholderTextColor="#888"
              value={ing.name}
              onChangeText={(val) => handleUpdateIngredient(index, 'name', val)}
            />
            <TextInput
              style={[styles.inputSmall, { flex: 1, color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
              placeholder="Qty (e.g. 2)"
              placeholderTextColor="#888"
              value={ing.quantity}
              onChangeText={(val) => handleUpdateIngredient(index, 'quantity', val)}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.inputSmall, { flex: 1, color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
              placeholder="Unit (e.g. cups)"
              placeholderTextColor="#888"
              value={ing.unit}
              onChangeText={(val) => handleUpdateIngredient(index, 'unit', val)}
            />
          </View>
        </View>
      ))}
      <Pressable onPress={handleAddIngredient} style={styles.addButton}>
        <Ionicons name="add" size={18} color="#FF8C00" />
        <ThemedText style={styles.addButtonText}>Add Ingredient</ThemedText>
      </Pressable>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.wizardSection}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>Cooking Steps</ThemedText>
      {steps.map((stepItem, index) => (
        <View key={index} style={styles.stepItem}>
          <View style={styles.stepHeader}>
            <ThemedText type="defaultSemiBold">Step {index + 1}</ThemedText>
            <Pressable onPress={() => handleRemoveStep(index)}>
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </Pressable>
          </View>
          <TextInput
            style={[styles.inputSmall, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
            placeholder="Title (e.g. Prepare the Dough)"
            placeholderTextColor="#888"
            value={stepItem.title}
            onChangeText={(val) => handleUpdateStep(index, 'title', val)}
          />
          <TextInput
            style={[styles.inputSmall, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc', minHeight: 60, textAlignVertical: 'top' }]}
            placeholder="Detailed description..."
            placeholderTextColor="#888"
            value={stepItem.description}
            onChangeText={(val) => handleUpdateStep(index, 'description', val)}
            multiline
          />
          <TextInput
            style={[styles.inputSmall, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#444' : '#ccc' }]}
            placeholder="Duration (in minutes, optional)"
            placeholderTextColor="#888"
            value={stepItem.duration}
            onChangeText={(val) => handleUpdateStep(index, 'duration', val)}
            keyboardType="numeric"
          />
        </View>
      ))}
      <Pressable onPress={handleAddStep} style={styles.addButton}>
        <Ionicons name="add" size={18} color="#FF8C00" />
        <ThemedText style={styles.addButtonText}>Add Step</ThemedText>
      </Pressable>
    </View>
  );

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
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl * 2,
  },
  headerBtn: {
    paddingHorizontal: Spacing.xs,
  },
  headerBtnText: {
    color: '#FF8C00',
    fontWeight: 'bold',
    fontSize: 16,
  },
  wizardSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    fontSize: 16,
  },
  inputSmall: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ingredientInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  removeBtn: {
    marginTop: 8,
  },
  stepItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FF8C00',
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  addButtonText: {
    color: '#FF8C00',
    fontWeight: '600',
  }
});
