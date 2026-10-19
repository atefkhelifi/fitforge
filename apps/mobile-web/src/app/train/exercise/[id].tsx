import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseImage } from '@/components/exercise-image';
import { Card, Chip, Label, Num, PrimaryButton } from '@/components/ui';
import { canonicalId, capitalise, exerciseInfo } from '@/data/exercise-catalog';
import { useHistory } from '@/features/history/store';
import { useProgramDraft } from '@/features/programs/draft';
import { useUnits } from '@/features/units/store';
import { addExercise } from '@/lib/program-draft';
import { best1RM, lastSetsFor } from '@/lib/stats';
import { formatWeight, weightText, weightUnit } from '@/lib/units';
import { maxContentWidth, radius } from '@/theme/tokens';
import { createStyles } from '@/theme/use-theme';

function decode(id: string | undefined): string {
  if (!id) return '';
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export default function ExerciseDetailScreen() {
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; pick?: string }>();
  const id = decode(params.id);
  const picking = params.pick === '1';
  const info = exerciseInfo(id);
  const known = info.imageId !== null;

  const units = useUnits();
  const workouts = useHistory((s) => s.workouts);
  const best = best1RM(canonicalId(id), workouts);
  const last = lastSetsFor(canonicalId(id), workouts);

  const draft = useProgramDraft((s) => s.draft);
  const pickDay = useProgramDraft((s) => s.pickDay);
  const update = useProgramDraft((s) => s.update);
  const day = draft?.days[pickDay];
  const alreadyAdded = !!day?.slots.some((s) => s.exerciseId === canonicalId(id));

  const tags = [info.level, info.equipment, info.category].filter((t) => t && t !== 'unspecified');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={2}>
            {info.name}
          </Text>
        </View>

        {!known ? (
          <Card style={{ gap: 8 }}>
            <Label>NOT FOUND</Label>
            <Text style={styles.body}>This exercise is not in the library, but you can still log it in a workout.</Text>
          </Card>
        ) : (
          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: picking ? 120 : 40 }}>
            {info.images > 0 ? (
              <View style={styles.photos}>
                {Array.from({ length: info.images }, (_, i) => (
                  <View key={i} style={styles.photoCol}>
                    <ExerciseImage exerciseId={id} index={i} style={styles.photo} label={`${info.name}, ${i === 0 ? 'start' : 'finish'} position`} />
                    <Text style={styles.caption}>{i === 0 ? 'Start' : 'Finish'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.body}>No photo for this exercise.</Text>
            )}

            <View style={styles.chips}>
              {tags.map((t) => (
                <Chip key={t}>{capitalise(t)}</Chip>
              ))}
            </View>

            <Card style={{ gap: 8 }}>
              <Label>MUSCLES</Label>
              <Text style={styles.body}>
                <Text style={styles.strong}>Main: </Text>
                {info.primary.map(capitalise).join(', ') || '—'}
              </Text>
              {info.secondary.length > 0 && (
                <Text style={styles.body}>
                  <Text style={styles.strong}>Also works: </Text>
                  {info.secondary.map(capitalise).join(', ')}
                </Text>
              )}
            </Card>

            {best > 0 && (
              <Card style={{ gap: 6 }}>
                <Label>YOUR HISTORY</Label>
                <Num style={styles.big}>{formatWeight(best, units)}</Num>
                <Text style={styles.muted}>best estimated 1RM</Text>
                {last.length > 0 && (
                  <Text style={styles.muted}>
                    Last time: {last.map((s) => `${weightText(s.weightKg, units)} ${weightUnit(units)} × ${s.reps}`).join(', ')}
                  </Text>
                )}
              </Card>
            )}

            {info.steps.length > 0 && (
              <Card style={{ gap: 12 }}>
                <Label>HOW TO</Label>
                {info.steps.map((step, i) => (
                  <View key={i} style={styles.step}>
                    <Text style={styles.stepNo}>{i + 1}</Text>
                    <Text style={[styles.body, { flex: 1 }]}>{step}</Text>
                  </View>
                ))}
              </Card>
            )}

            <Text style={styles.source}>Photos and instructions: Free Exercise DB, public domain (Unlicense).</Text>
          </ScrollView>
        )}

        {picking && known && (
          <View style={styles.pickBar}>
            <PrimaryButton
              title={alreadyAdded ? `Already in ${day?.name || 'this day'}` : `Add to ${day?.name || 'this day'}`}
              onPress={
                alreadyAdded || !day
                  ? undefined
                  : () => {
                      update((p) => addExercise(p, pickDay, id));
                      router.back();
                    }
              }
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
    column: { flex: 1, width: '100%', maxWidth: maxContentWidth, paddingHorizontal: 20, gap: 14, paddingTop: 8 },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    back: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    backText: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: -3 },
    title: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
    photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    photoCol: { flexGrow: 1, flexBasis: 240, gap: 6 },
    photo: { width: '100%', aspectRatio: 3 / 2, borderRadius: radius.md, overflow: 'hidden' },
    caption: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    body: { color: colors.text, fontSize: 15, lineHeight: 22 },
    strong: { fontWeight: '800' },
    muted: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    big: { fontSize: 28, fontWeight: '800' },
    step: { flexDirection: 'row', gap: 12 },
    stepNo: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface2, color: colors.text, textAlign: 'center', lineHeight: 26, fontSize: 13, fontWeight: '800', overflow: 'hidden' },
    source: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
    pickBar: { position: 'absolute', left: 20, right: 20, bottom: 16 },
  }),
);
