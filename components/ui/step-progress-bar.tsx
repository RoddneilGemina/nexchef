import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

import { RecipeStep } from '@/types/post';

interface StepProgressBarProps {
  steps: RecipeStep[];
  elapsedTime: number;
  totalDuration: number;
  activeStepIndex: number;
  warning?: boolean;
}

const BAR_HEIGHT = 14;

export function StepProgressBar({
  steps,
  elapsedTime,
  totalDuration,
  activeStepIndex,
  warning = false,
}: StepProgressBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const themeColors = Colors[colorScheme];

  if (!steps || steps.length === 0) return null;

  const total = totalDuration > 0 ? totalDuration : 1;

  return (
    <View style={styles.container}>
      {/* Outer Progress Bar Track */}
      <View
        style={[
          styles.barTrack,
          {
            backgroundColor: colorScheme === 'dark' ? '#2E3032' : '#E0E0E0',
          },
        ]}
      >
        {steps.map((step, index) => {
          const stepDuration = step.duration || 0;
          const durationPct = (stepDuration / total) * 100;

          // Calculate fill progress for this compartment
          const stepStart = step.start_time || 0;
          let fillPct = 0;
          if (elapsedTime >= stepStart + stepDuration) {
            fillPct = 100;
          } else if (elapsedTime > stepStart) {
            fillPct = ((elapsedTime - stepStart) / stepDuration) * 100;
          }

          const isActive = index === activeStepIndex;
          const isComplete = elapsedTime >= stepStart + stepDuration;

          // Color selection
          let fillColor = '#FF8C00'; // Brand default orange
          if (isComplete) {
            fillColor = '#4CAF50'; // Complete green
          } else if (isActive) {
            fillColor = warning ? '#ff4444' : '#FF8C00';
          }

          return (
            <View
              key={step.id || index}
              style={[
                styles.compartment,
                {
                  width: `${durationPct}%`,
                },
              ]}
            >
              <View
                style={[
                  styles.fill,
                  {
                    width: `${fillPct}%`,
                    backgroundColor: fillColor,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      {/* Dividers, Ticks, and Step Numbers */}
      {steps.map((step, index) => {
        const startPct = ((step.start_time || 0) / total) * 100;
        const isActive = index === activeStepIndex;
        const isComplete = elapsedTime >= (step.start_time || 0) + (step.duration || 0);

        // Active/complete label highlighting
        const labelColor = warning && isActive
          ? '#ff4444'
          : isActive
          ? '#FF8C00'
          : isComplete
          ? '#4CAF50'
          : colorScheme === 'dark'
          ? '#888'
          : '#999';

        return (
          <React.Fragment key={`divider-${step.id || index}`}>
            {/* Split compartment separator (skip for index 0 to avoid clipping rounded corner) */}
            {index > 0 && (
              <View
                style={[
                  styles.separator,
                  {
                    left: `${startPct}%`,
                    backgroundColor: themeColors.background,
                  },
                ]}
              />
            )}

            {/* Tick line extending below the progress bar */}
            <View
              style={[
                styles.tick,
                {
                  left: `${startPct}%`,
                  backgroundColor: colorScheme === 'dark' ? '#555' : '#ccc',
                },
              ]}
            />

            {/* Step Number label */}
            <View
              style={[
                styles.labelContainer,
                {
                  left: `${startPct}%`,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.labelText,
                  {
                    color: labelColor,
                    fontWeight: isActive ? '800' : '600',
                  },
                ]}
              >
                {step.step_number || index + 1}
              </ThemedText>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 52,
    position: 'relative',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  barTrack: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
  },
  compartment: {
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  separator: {
    position: 'absolute',
    top: 0,
    height: BAR_HEIGHT,
    width: 2.5,
    zIndex: 2,
    transform: [{ translateX: -1.25 }],
  },
  tick: {
    position: 'absolute',
    top: BAR_HEIGHT,
    height: 6,
    width: 1.5,
    zIndex: 1,
    transform: [{ translateX: -0.75 }],
  },
  labelContainer: {
    position: 'absolute',
    top: BAR_HEIGHT + 8,
    width: 30,
    transform: [{ translateX: -15 }],
    alignItems: 'center',
  },
  labelText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
