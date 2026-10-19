import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const styles = useStyles();
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A wrapping row of cells: side by side when there is room, stacked on a phone. */
export function Grid({ children }: { children: ReactNode }) {
  return <View style={layout.grid}>{children}</View>;
}

export function Cell({ children, basis = 340 }: { children: ReactNode; basis?: number }) {
  return <View style={[layout.cell, { flexBasis: basis }]}>{children}</View>;
}

const layout = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  cell: { flexGrow: 1, minWidth: 0 },
});

export function Label({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <Text style={styles.label}>{children}</Text>;
}

export function Num(props: TextProps) {
  const colors = useColors();
  return <Text {...props} style={[{ color: colors.text, fontVariant: ['tabular-nums'] }, props.style]} />;
}

export function Chip({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );
}

type ButtonProps = { title: string; onPress?: () => void; icon?: ReactNode };

export function PrimaryButton({ title, onPress, icon }: ButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
      {icon}
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, goal, color }: { value: number; goal: number; color: string }) {
  const styles = useStyles();
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  chip: { backgroundColor: colors.surface2, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  button: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 5 },
  barFill: { height: 6, borderRadius: 3 },
}));
