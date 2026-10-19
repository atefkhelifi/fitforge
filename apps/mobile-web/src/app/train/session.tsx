import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExercisePhoto } from '@/components/exercise-image';
import { Icon } from '@/components/icon';
import { Card, Num, PrimaryButton } from '@/components/ui';
import { exerciseInfo } from '@/data/exercise-catalog';
import { useHistory } from '@/features/history/store';
import { useWorkout } from '@/features/workout/store';
import { useNow } from '@/features/workout/use-now';
import { estimate1RM, formatClock } from '@/lib/formulas';
import { exercisePath, href } from '@/lib/nav';
import { fromDisplayWeight, weightText, weightUnit } from '@/lib/units';
import { best1RM, lastSetsFor } from '@/lib/stats';
import { maxContentWidth, radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

export default function SessionScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const { session, updateSet, toggleSet, addSet, goTo, addRest, skipRest, finish, discard } = useWorkout();
  const now = useNow(!!session);
  const history = useHistory((s) => s.workouts);

  if (!session) return <Redirect href="/train" />;

  const ei = session.index;
  const ex = session.exercises[ei];
  const info = exerciseInfo(ex.exerciseId);
  const isLast = ei === session.exercises.length - 1;
  const prevSets = lastSetsFor(ex.exerciseId, history);
  const bestEver = best1RM(ex.exerciseId, history);
  const restLeft = session.restEndsAt ? Math.ceil((session.restEndsAt - now) / 1000) : 0;
  const resting = restLeft > 0;

  const onToggle = (si: number) => {
    toggleSet(ei, si);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const onFinish = () => {
    finish();
    router.replace('/train');
  };

  const onEnd = () => {
    discard();
    router.replace('/train');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>‹</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.sessionName}>{session.dayName}</Text>
            <Num style={styles.muted}>
              {formatClock((now - session.startedAt) / 1000)} · Exercise {ei + 1} of {session.exercises.length}
            </Num>
          </View>
          <Pressable accessibilityRole="button" onPress={onEnd} style={styles.iconBtn}>
            <Text style={styles.endText}>End</Text>
          </Pressable>
        </View>

        <View style={styles.segments}>
          {session.exercises.map((_, i) => (
            <View key={i} style={[styles.segment, i <= ei && { backgroundColor: colors.primary }]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          <Card style={{ gap: 12, padding: 16 }}>
            <ExercisePhoto key={ex.exerciseId} exerciseId={ex.exerciseId} onInfo={() => router.push(href(exercisePath(ex.exerciseId)))} />
            <Text style={styles.exName}>{info.name}</Text>
            <Text style={styles.muted}>
              {info.muscle} · {ex.sets.length} sets · {ex.repMin}–{ex.repMax} reps · rest {formatClock(ex.restS)}
            </Text>

            <View style={styles.setRow}>
              <Text style={[styles.colHead, { width: 28 }]}>SET</Text>
              <Text style={[styles.colHead, { width: 64 }]}>PREV</Text>
              <Text style={[styles.colHead, { flex: 1, textAlign: 'center' }]}>{weightUnit(session.units).toUpperCase()}</Text>
              <Text style={[styles.colHead, { flex: 1, textAlign: 'center' }]}>REPS</Text>
              <View style={{ width: 44 }} />
            </View>

            {ex.sets.map((s, si) => (
              <View key={si} style={styles.setRow}>
                <Num style={styles.setNo}>{si + 1}</Num>
                <View style={styles.prev}>
                  <Num style={styles.prevText}>
                    {prevSets[si] ? `${weightText(prevSets[si].weightKg, session.units)} × ${prevSets[si].reps}` : '—'}
                  </Num>
                  {s.done && bestEver > 0 && estimate1RM(fromDisplayWeight(parseFloat(s.weight) || 0, session.units), parseInt(s.reps, 10) || 0) > bestEver && (
                    <Text style={styles.pr}>PR</Text>
                  )}
                </View>
                <TextInput
                  accessibilityLabel={`Set ${si + 1} weight ${weightUnit(session.units)}`}
                  value={s.weight}
                  onChangeText={(t) => updateSet(ei, si, { weight: t.replace(',', '.') })}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  style={[styles.input, s.done && styles.inputDone]}
                />
                <TextInput
                  accessibilityLabel={`Set ${si + 1} reps`}
                  value={s.reps}
                  onChangeText={(t) => updateSet(ei, si, { reps: t.replace(/[^0-9]/g, '') })}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  style={[styles.input, s.done && styles.inputDone]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={s.done ? `Undo set ${si + 1}` : `Complete set ${si + 1}`}
                  onPress={() => onToggle(si)}
                  style={[styles.check, s.done && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                  <Icon name="check" size={20} strokeWidth={3} color={s.done ? colors.onAccent : colors.primary} />
                </Pressable>
              </View>
            ))}

            <Pressable accessibilityRole="button" onPress={() => addSet(ei)} style={styles.addSet}>
              <Text style={styles.addSetText}>+ Add set</Text>
            </Pressable>
          </Card>

          <View style={styles.nav}>
            <Pressable
              accessibilityRole="button"
              disabled={ei === 0}
              onPress={() => goTo(ei - 1)}
              style={[styles.navBtn, ei === 0 && { opacity: 0.4 }]}>
              <Text style={styles.navText}>Previous</Text>
            </Pressable>
            {isLast ? (
              <View style={{ flex: 1 }}>
                <PrimaryButton title="Finish workout" onPress={onFinish} />
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <PrimaryButton title={`Next: ${exerciseInfo(session.exercises[ei + 1].exerciseId).name}`} onPress={() => goTo(ei + 1)} />
              </View>
            )}
          </View>
        </ScrollView>

        {resting && (
          <View style={styles.rest} accessibilityLiveRegion="polite">
            <View style={{ flex: 1 }}>
              <Text style={styles.restLabel}>REST</Text>
              <Num style={styles.restTime}>{formatClock(restLeft)}</Num>
            </View>
            <Pressable accessibilityRole="button" onPress={() => addRest(15)} style={styles.restBtn}>
              <Text style={styles.navText}>+15s</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={skipRest} style={[styles.restBtn, { backgroundColor: colors.primary }]}>
              <Text style={[styles.navText, { color: colors.onPrimary }]}>Skip</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  wrap: { flex: 1, width: '100%', maxWidth: maxContentWidth, paddingHorizontal: 20, gap: 14, paddingTop: 8 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { minWidth: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  iconBtnText: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: -3 },
  endText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  sessionName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segments: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface2 },
  exName: { color: colors.text, fontSize: 22, fontWeight: '800' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colHead: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  prev: { width: 64, gap: 2 },
  prevText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  pr: { alignSelf: 'flex-start', backgroundColor: colors.accent, color: colors.onAccent, borderRadius: 6, paddingHorizontal: 5, fontSize: 10, fontWeight: '800', overflow: 'hidden' },
  setNo: { width: 28, fontSize: 14, fontWeight: '700' },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    color: colors.text,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  inputDone: { opacity: 0.6 },
  check: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addSet: { height: 44, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  addSetText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  nav: { flexDirection: 'row', gap: 10 },
  navBtn: { height: 52, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  navText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  rest: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  restTime: { fontSize: 26, fontWeight: '800' },
  restBtn: { height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
}));
