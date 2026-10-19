import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/components/charts';
import { Card, Label, Num } from '@/components/ui';
import { useMeals } from '@/features/nutrition/store';
import { useTargets } from '@/features/profile/store';
import { mealsOnDay, totalsOf } from '@/lib/meal';
import { createStyles, useColors } from '@/theme/use-theme';

const DAY = 24 * 60 * 60 * 1000;
const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function NutritionTab() {
  const styles = useStyles();
  const colors = useColors();
  const meals = useMeals((s) => s.meals);
  const targets = useTargets();
  const [now] = useState(() => Date.now());

  const days = Array.from({ length: 7 }, (_, i) => {
    const t = now - (6 - i) * DAY;
    return { letter: letters[new Date(t).getDay()], totals: totalsOf(mealsOnDay(meals, t).flatMap((m) => m.items)) };
  });
  const logged = days.filter((d) => d.totals.kcal > 0);

  if (logged.length === 0) {
    return (
      <Card style={{ gap: 8 }}>
        <Label>NO DATA YET</Label>
        <Text style={styles.muted}>Log meals in the Nutrition tab and your daily calories will show up here.</Text>
      </Card>
    );
  }

  const avg = (pick: (d: (typeof days)[number]) => number) => Math.round(logged.reduce((s, d) => s + pick(d), 0) / logged.length);

  return (
    <>
      <Card style={{ gap: 10 }}>
        <View style={styles.head}>
          <Text style={styles.title}>Calories, last 7 days</Text>
          <Text style={styles.muted}>Target {targets.kcal.toLocaleString('en-US')} kcal</Text>
        </View>
        <BarChart values={days.map((d) => d.totals.kcal)} height={120} label="Calories eaten per day over the last seven days" />
        <View style={styles.letters}>
          {days.map((d, i) => (
            <Text key={i} style={styles.letter}>
              {d.letter}
            </Text>
          ))}
        </View>
      </Card>

      <View style={styles.tiles}>
        <Card style={styles.tile}>
          <Text style={styles.muted}>Avg calories</Text>
          <Num style={styles.tileValue}>{avg((d) => d.totals.kcal).toLocaleString('en-US')}</Num>
          <Text style={styles.muted}>per logged day</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={styles.muted}>Avg protein</Text>
          <Num style={[styles.tileValue, { color: colors.protein }]}>{avg((d) => d.totals.protein_g)} g</Num>
          <Text style={styles.muted}>target {targets.protein_g} g</Text>
        </Card>
      </View>
    </>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  title: { color: colors.text, fontSize: 14, fontWeight: '800' },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  letters: { flexDirection: 'row', gap: 10 },
  letter: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, padding: 16, gap: 2 },
  tileValue: { fontSize: 28, fontWeight: '800' },
}));
