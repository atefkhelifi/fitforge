import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Cell, Chip, Grid, Label, Num, PrimaryButton } from '@/components/ui';
import { exercises, programs } from '@/data/programs';
import { useUnits } from '@/features/units/store';
import { useWorkout } from '@/features/workout/store';
import { toDisplayWeight, weightUnit } from '@/lib/units';
import { radius } from '@/theme/tokens';
import { createStyles } from '@/theme/use-theme';

const syncLabel = {
  pending: 'Saving…',
  saved: 'Saved to your account',
  'not-signed-in': 'Not saved. Sign in from Profile to keep your history.',
  error: 'Could not save this workout. Check your connection.',
} as const;

export default function TrainScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { session, lastSummary, start } = useWorkout();
  const units = useUnits();

  const open = (dayId: string) => {
    if (!session || session.dayId !== dayId) start(dayId);
    router.push('/train/session');
  };

  return (
    <Screen wide>
      <Text style={styles.title}>Train</Text>

      {session && (
        <Card style={{ gap: 12 }}>
          <Label>IN PROGRESS</Label>
          <Text style={styles.dayName}>{session.dayName}</Text>
          <PrimaryButton title="Resume workout" onPress={() => router.push('/train/session')} />
        </Card>
      )}

      {lastSummary && !session && (
        <Card style={{ gap: 10 }}>
          <Label>LAST WORKOUT</Label>
          <Text style={styles.dayName}>{lastSummary.dayName}</Text>
          <View style={styles.stats}>
            <Stat value={String(lastSummary.minutes)} unit="min" />
            <Stat value={String(lastSummary.sets)} unit="sets" />
            <Stat value={Math.round(toDisplayWeight(lastSummary.volumeKg, units)).toLocaleString('en-US')} unit={`${weightUnit(units)} lifted`} />
          </View>
          <Text style={styles.muted}>{syncLabel[lastSummary.sync]}</Text>
        </Card>
      )}

      <Grid>
      {programs.map((p) => (
        <Cell key={p.id}>
        <Card style={{ gap: 12, flexGrow: 1 }}>
          <View style={styles.programHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.programName}>{p.name}</Text>
              <Text style={styles.muted}>{p.daysPerWeek} days / week</Text>
            </View>
            <Chip>{p.goal}</Chip>
          </View>
          {p.days.map((d) => (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityLabel={`Start ${d.name}`}
              onPress={() => open(d.id)}
              style={({ pressed }) => [styles.day, pressed && { opacity: 0.8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dayTitle}>{d.name}</Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {d.slots.map((s) => exercises[s.exerciseId].name).join(' · ')}
                </Text>
              </View>
              <Text style={styles.go}>Start</Text>
            </Pressable>
          ))}
        </Card>
        </Cell>
      ))}
      </Grid>
    </Screen>
  );
}

function Stat({ value, unit }: { value: string; unit: string }) {
  const styles = useStyles();
  return (
    <View>
      <Num style={styles.statValue}>{value}</Num>
      <Text style={styles.muted}>{unit}</Text>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  dayName: { color: colors.text, fontSize: 22, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 13 },
  stats: { flexDirection: 'row', gap: 28 },
  statValue: { fontSize: 24, fontWeight: '800' },
  programHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  programName: { color: colors.text, fontSize: 18, fontWeight: '800' },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    minHeight: 64,
    paddingVertical: 10,
  },
  dayTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  go: { color: colors.primary, fontSize: 14, fontWeight: '800' },
}));
