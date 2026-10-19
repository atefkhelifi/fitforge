import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BarChart, LineChart } from '@/components/charts';
import { Card, Label, Num } from '@/components/ui';
import { exercises } from '@/data/programs';
import { useHistory } from '@/features/history/store';
import { useUnits } from '@/features/units/store';
import { round1, toDisplayWeight, weightUnit } from '@/lib/units';
import { countPRs, exercisesWithHistory, strengthSeries, weeklyVolume } from '@/lib/stats';
import { radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

const DAY = 24 * 60 * 60 * 1000;

export function StrengthTab() {
  const units = useUnits();
  const styles = useStyles();
  const colors = useColors();
  const workouts = useHistory((s) => s.workouts);
  const [picked, setPicked] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const ids = useMemo(() => exercisesWithHistory(workouts), [workouts]);
  const selected = picked && ids.includes(picked) ? picked : (ids[0] ?? null);

  const stats = useMemo(() => {
    const monthAgo = now - 30 * DAY;
    return {
      sessions: workouts.filter((w) => w.startedAt >= monthAgo).length,
      prs: countPRs(workouts, monthAgo),
      volume: weeklyVolume(workouts, now),
    };
  }, [workouts, now]);

  if (workouts.length === 0 || !selected) {
    return (
      <>
          <Card style={{ gap: 8 }}>
          <Label>NO DATA YET</Label>
          <Text style={styles.note}>Finish a workout in the Train tab and your strength trend and weekly volume will show up here.</Text>
        </Card>
      </>
    );
  }

  const series = strengthSeries(selected, workouts);
  const current = series[series.length - 1]?.value ?? 0;
  const previous = series.length > 1 ? series[series.length - 2].value : null;
  const delta = previous === null ? null : current - previous;

  return (
    <>

      <View style={styles.chips}>
        {ids.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: id === selected }}
            onPress={() => setPicked(id)}
            style={[styles.chip, id === selected && { backgroundColor: colors.primary }]}>
            <Text style={[styles.chipText, id === selected && { color: colors.onPrimary }]}>{exercises[id]?.name ?? id}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ gap: 10 }}>
        <Text style={styles.muted}>{exercises[selected]?.name} · est. 1RM</Text>
        <View style={styles.valueRow}>
          <Num style={styles.big}>{round1(toDisplayWeight(current, units))} {weightUnit(units)}</Num>
          {delta !== null && (
            <Text style={[styles.delta, { color: delta >= 0 ? colors.accentText : colors.danger }]}>
              {delta >= 0 ? '+' : ''}
              {round1(toDisplayWeight(delta, units))} {weightUnit(units)} vs last workout
            </Text>
          )}
        </View>
        <LineChart values={series.map((p) => p.value)} label={`Estimated one-rep max for ${exercises[selected]?.name}, ${series.length} workouts`} />
        {series.length < 2 && <Text style={styles.muted}>Log this exercise again to see a trend line.</Text>}
      </Card>

      <View style={styles.tiles}>
        <Card style={styles.tile}>
          <Text style={styles.muted}>Sessions</Text>
          <Num style={styles.tileValue}>{stats.sessions}</Num>
          <Text style={styles.muted}>last 30 days</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={styles.muted}>Personal records</Text>
          <Num style={[styles.tileValue, { color: colors.accentText }]}>{stats.prs}</Num>
          <Text style={styles.muted}>last 30 days</Text>
        </Card>
      </View>

      <Card style={{ gap: 10 }}>
        <View style={styles.valueRow}>
          <Text style={styles.cardTitle}>Weekly volume</Text>
          <Text style={styles.muted}>{weightUnit(units)} lifted, last 7 weeks</Text>
        </View>
        <BarChart values={stats.volume} label="Weekly training volume for the last seven weeks" />
      </Card>
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  note: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  big: { fontSize: 32, fontWeight: '800' },
  delta: { fontSize: 13, fontWeight: '800' },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, padding: 16, gap: 2 },
  tileValue: { fontSize: 28, fontWeight: '800' },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
}));
