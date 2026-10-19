import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { BodyTab } from '@/features/progress/body-tab';
import { NutritionTab } from '@/features/progress/nutrition-tab';
import { PhotosTab } from '@/features/progress/photos-tab';
import { StrengthTab } from '@/features/progress/strength-tab';
import { radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

const tabs = [
  { key: 'strength', label: 'Strength' },
  { key: 'body', label: 'Body' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'photos', label: 'Photos' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

export default function ProgressScreen() {
  const styles = useStyles();
  const colors = useColors();
  const [tab, setTab] = useState<TabKey>('strength');

  return (
    <Screen>
      <Text style={styles.title}>Progress</Text>

      <View style={styles.segmented} accessibilityRole="tablist">
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
            onPress={() => setTab(t.key)}
            style={[styles.segment, tab === t.key && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, tab === t.key && { color: colors.onPrimary }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'strength' && <StrengthTab />}
      {tab === 'body' && <BodyTab />}
      {tab === 'nutrition' && <NutritionTab />}
      {tab === 'photos' && <PhotosTab />}
    </Screen>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  segmented: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, gap: 2 },
  segment: { flex: 1, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
}));
