import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

type Props = {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Turns an option into the text shown on its chip. */
  format?: (option: string) => string;
};

/** A labelled, horizontally scrolling row of single-select chips with an "All" option. */
export function FilterRow({ label, options, value, onChange, format = (o) => o }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const chip = (text: string, selected: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}: ${text}`}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.primary }]}>
      <Text style={[styles.chipText, selected && { color: colors.onPrimary }]}>{text}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chip('All', value === null, () => onChange(null), '__all')}
        {options.map((o) => chip(format(o), value === o, () => onChange(value === o ? null : o), o))}
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    row: { gap: 6 },
    label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    chips: { gap: 8, paddingRight: 8 },
    chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    chipText: { color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  }),
);
