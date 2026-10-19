import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { MacroRing } from '@/components/macro-ring';
import { Screen } from '@/components/screen';
import { Card, Cell, Chip, Grid, Label, Num, PrimaryButton, ProgressBar } from '@/components/ui';
import { exerciseInfo } from '@/data/exercise-catalog';
import { findDay, useAllPrograms } from '@/features/programs/store';
import { useHistory } from '@/features/history/store';
import { useMeals } from '@/features/nutrition/store';
import { OnboardingForm } from '@/features/profile/onboarding-form';
import { useProfile, useProfileHydrated, useTargets } from '@/features/profile/store';
import { useWorkout } from '@/features/workout/store';
import { mealsOnDay, totalsOf } from '@/lib/meal';
import { estimateMinutes, nextWorkoutDay, weekDays, workoutsThisWeek } from '@/lib/today';
import { radius, space } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

export default function TodayScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const hydrated = useProfileHydrated();
  const hasProfile = useProfile((s) => s.profile !== null);
  const dailyTargets = useTargets();
  const meals = useMeals((s) => s.meals);
  const [now] = useState(() => Date.now());
  const workouts = useHistory((st) => st.workouts);
  const activeSession = useWorkout((st) => st.session);
  const startWorkout = useWorkout((st) => st.start);
  // The card shows the session in progress if there is one, otherwise the next day in the program.
  const programs = useAllPrograms();
  const shownDay = (activeSession && findDay(activeSession.dayId)) || nextWorkoutDay(workouts, programs);
  const shownMuscles = [...new Set(shownDay.slots.map((sl) => exerciseInfo(sl.exerciseId).muscle).filter(Boolean))].slice(0, 4);
  const week = weekDays(workouts, now);
  const doneThisWeek = workoutsThisWeek(workouts, now);
  const eaten = totalsOf(mealsOnDay(meals, now).flatMap((m) => m.items));
  const macros = [
    { name: 'Protein', value: Math.round(eaten.protein_g), goal: dailyTargets.protein_g, color: colors.protein },
    { name: 'Carbs', value: Math.round(eaten.carbs_g), goal: dailyTargets.carbs_g, color: colors.carbs },
    { name: 'Fat', value: Math.round(eaten.fat_g), goal: dailyTargets.fat_g, color: colors.fat },
  ];
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  if (hydrated && !hasProfile) return <OnboardingForm />;

  return (
    <Screen wide>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text style={styles.title}>Today</Text>
        </View>
        <View style={styles.streak}>
          <Icon name="bolt" size={16} color={colors.accentText} strokeWidth={2.2} />
          <Text style={styles.streakText}>{doneThisWeek === 0 ? 'No workouts this week yet' : `${doneThisWeek} workout${doneThisWeek === 1 ? '' : 's'} this week`}</Text>
        </View>
      </View>

      <Grid>
      <Cell>
      <Card style={{ gap: 14, flexGrow: 1 }}>
        <Label>{activeSession ? 'IN PROGRESS' : 'UP NEXT'}</Label>
        <View>
          <Text style={styles.workoutName}>{shownDay.name}</Text>
          <Text style={styles.muted}>
            {shownDay.slots.length} exercises · about {estimateMinutes(shownDay)} min
          </Text>
        </View>
        <View style={styles.row}>
          {shownMuscles.map((m) => (
            <Chip key={m}>{m}</Chip>
          ))}
        </View>
        <PrimaryButton
          title={activeSession ? 'Resume workout' : 'Start workout'}
          onPress={() => {
            if (!activeSession) startWorkout(shownDay.id);
            router.push('/train/session');
          }}
          icon={<Icon name="play" size={18} color={colors.onPrimary} filled />} />
      </Card>
      </Cell>

      <Cell>
      <Card style={styles.nutrition}>
        <MacroRing value={Math.round(eaten.kcal)} goal={dailyTargets.kcal} />
        <View style={styles.macros}>
          {macros.map((m) => (
            <View key={m.name}>
              <View style={styles.macroHead}>
                <Text style={styles.macroName}>{m.name}</Text>
                <Num style={styles.muted}>
                  {m.value} / {m.goal} g
                </Num>
              </View>
              <ProgressBar value={m.value} goal={m.goal} color={m.color} />
            </View>
          ))}
        </View>
      </Card>
      </Cell>
      </Grid>

      <Card style={styles.week}>
        {week.map((d, i) => (
          <View key={i} style={styles.day} accessible accessibilityLabel={`${d.label}${d.isToday ? ', today' : ''}${d.done ? ', workout done' : ''}`}>
            <Text style={[styles.dayLetter, d.isToday && { color: colors.text, fontWeight: '800' }]}>
              {d.label}
            </Text>
            <View
              style={[
                styles.dayDot,
                d.done && { backgroundColor: colors.accent },
                d.isToday && !d.done && { borderWidth: 2, borderColor: colors.primary },
              ]}>
              {d.done && <Icon name="check" size={14} color={colors.onAccent} strokeWidth={3.2} />}
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  date: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface2,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  streakText: { color: colors.accentText, fontSize: 13, fontWeight: '700' },
  workoutName: { color: colors.text, fontSize: 24, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 14 },
  row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  nutrition: { flexDirection: 'row', alignItems: 'center', gap: 20, flexGrow: 1 },
  macros: { flex: 1, gap: 12 },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between' },
  macroName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.lg },
  day: { alignItems: 'center', gap: 6 },
  dayLetter: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  dayDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
}));
