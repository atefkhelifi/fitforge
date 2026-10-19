import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius } from '@/theme/tokens';
import { createStyles } from '@/theme/use-theme';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
};

/** A label with a minus button, the value and a plus button. Values stay within min and max. */
export function Stepper({ label, value, onChange, min, max, step = 1, format = String }: Props) {
  const styles = useStyles();
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <View style={styles.wrap} accessible accessibilityRole="adjustable" accessibilityLabel={`${label}: ${format(value)}`} accessibilityValue={{ min, max, now: value }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} disabled={value <= min} onPress={() => set(value - step)} style={[styles.btn, value <= min && styles.off]}>
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{format(value)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} disabled={value >= max} onPress={() => set(value + step)} style={[styles.btn, value >= max && styles.off]}>
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    wrap: { flexGrow: 1, flexBasis: 140, gap: 4 },
    label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    btn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    off: { opacity: 0.35 },
    btnText: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: -2 },
    value: { flex: 1, minWidth: 40, textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  }),
);
