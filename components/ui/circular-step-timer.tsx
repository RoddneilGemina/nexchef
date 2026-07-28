import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';

interface CircularStepTimerProps {
  stepNumber: number;
  duration: number;
  elapsed: number;
  isActive: boolean;
  isComplete: boolean;
  size?: 'sm' | 'lg';
  warning?: boolean;
}

const formatClock = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function CircularStepTimer({
  stepNumber,
  duration,
  elapsed,
  isActive,
  isComplete,
  size = 'sm',
  warning = false,
}: CircularStepTimerProps) {
  const dim = size === 'lg' ? 148 : 56;
  const stroke = size === 'lg' ? 10 : 4;
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeDuration = Math.max(1, duration);
  const progress = isComplete ? 1 : Math.min(1, Math.max(0, elapsed / safeDuration));
  const strokeDashoffset = circumference * (1 - progress);
  const remaining = Math.max(0, safeDuration - elapsed);

  const trackColor = '#e8e8e8';
  const progressColor = warning ? '#ff4444' : isComplete ? '#4CAF50' : '#FF8C00';
  const labelColor = warning ? '#ff4444' : isActive ? '#FF8C00' : isComplete ? '#4CAF50' : '#aaa';

  return (
    <View
      style={[
        styles.wrap,
        { width: dim, height: dim },
        warning && size === 'lg' && styles.warningPulse,
      ]}
    >
      <Svg width={dim} height={dim} style={styles.svg}>
        <Circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${dim / 2}, ${dim / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        {size === 'lg' ? (
          <>
            <ThemedText style={[styles.timeLg, warning && styles.warningText]}>
              {formatClock(remaining)}
            </ThemedText>
            <ThemedText style={styles.stepLg}>Step {stepNumber}</ThemedText>
          </>
        ) : (
          <ThemedText style={[styles.stepSm, { color: labelColor }]}>{stepNumber}</ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningPulse: {
    shadowColor: '#ff4444',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  svg: {
    position: 'absolute',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeLg: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF8C00',
    fontVariant: ['tabular-nums'],
  },
  stepLg: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    fontWeight: '600',
  },
  warningText: {
    color: '#ff4444',
  },
  stepSm: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
