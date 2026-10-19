import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { Card, Label, Num, PrimaryButton } from '@/components/ui';
import { deleteWeight, logWeight, useBody } from '@/features/body/store';
import { recentAverage, sortedEntries, weeklyChange } from '@/lib/body';
import { limits } from '@/lib/targets';
import { formatWeight, fromDisplayWeight, round1, toDisplayWeight, weightText, weightUnit } from '@/lib/units';
import { useUnits } from '@/features/units/store';
import { radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

export function BodyTab() {
  const styles = useStyles();
  const colors = useColors();
  const entries = useBody((s) => s.entries);
  const units = useUnits();
  const [text, setText] = useState('');

  const value = parseFloat(text.replace(',', '.'));
  // What the user types is in their units; the limits and storage are in kg.
  const valueKg = fromDisplayWeight(value, units);
  const valid = valueKg >= limits.weightKg.min && valueKg <= limits.weightKg.max;

  const submit = () => {
    if (!valid) return;
    logWeight(Math.round(valueKg * 1000) / 1000);
    setText('');
  };

  const sorted = sortedEntries(entries);
  const latest = sorted[sorted.length - 1];
  const avg = recentAverage(entries);
  const change = weeklyChange(entries);
  const recent = sorted.slice(-7).reverse();

  return (
    <>
      <Card style={{ gap: 12 }}>
        <Label>LOG TODAY&apos;S WEIGHT</Label>
        <View style={styles.row}>
          <TextInput
            accessibilityLabel={`Weight in ${weightUnit(units)}`}
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder={latest ? weightText(latest.weightKg, units) : weightUnit(units)}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.unit}>{weightUnit(units)}</Text>
        </View>
        <PrimaryButton title="Save weight" onPress={valid ? submit : undefined} />
        <Text style={styles.muted}>Weigh yourself at the same time each day. The 7-day average smooths out daily swings.</Text>
      </Card>

      {latest ? (
        <>
          <Card style={{ gap: 10 }}>
            <Text style={styles.muted}>Body weight</Text>
            <View style={styles.valueRow}>
              <Num style={styles.big}>{formatWeight(latest.weightKg, units)}</Num>
              {change !== null && (
                <Text style={styles.delta}>
                  {change >= 0 ? '+' : ''}
                  {round1(toDisplayWeight(change, units))} {weightUnit(units)} in 7 days
                </Text>
              )}
            </View>
            {avg !== null && <Text style={styles.muted}>7-day average {formatWeight(avg, units)}</Text>}
            <LineChart
              values={sorted.slice(-60).map((e) => toDisplayWeight(e.weightKg, units))}
              label={`Body weight over ${Math.min(sorted.length, 60)} entries, latest ${weightText(latest.weightKg, units)} ${units === 'imperial' ? 'pounds' : 'kilograms'}`}
            />
            {sorted.length < 2 && <Text style={styles.muted}>Log your weight on another day to see a trend line.</Text>}
          </Card>

          <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
            {recent.map((e, i) => (
              <View key={e.date} style={[styles.entry, i > 0 && styles.entryBorder]}>
                <Text style={styles.entryDate}>{e.date}</Text>
                <Num style={styles.entryValue}>{formatWeight(e.weightKg, units)}</Num>
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete weight for ${e.date}`} onPress={() => deleteWeight(e.date)} style={styles.remove}>
                  <Text style={styles.removeText}>×</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Card style={{ gap: 8 }}>
          <Label>NO DATA YET</Label>
          <Text style={styles.muted}>Save your first weight above to start your trend.</Text>
        </Card>
      )}
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, height: 52, borderRadius: radius.md, backgroundColor: colors.surface2, color: colors.text, textAlign: 'center', fontSize: 20, fontWeight: '800' },
  unit: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  big: { fontSize: 32, fontWeight: '800' },
  delta: { color: colors.text, fontSize: 13, fontWeight: '800' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  entryBorder: { borderTopWidth: 1, borderTopColor: colors.surface2 },
  entryDate: { flex: 1, color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  entryValue: { fontSize: 15, fontWeight: '800' },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.textMuted, fontSize: 20, fontWeight: '800' },
}));
