import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ExerciseImage } from '@/components/exercise-image';
import { Screen } from '@/components/screen';
import { Stepper } from '@/components/stepper';
import { Card, Label, PrimaryButton } from '@/components/ui';
import { exerciseInfo } from '@/data/exercise-catalog';
import { useProgramDraft } from '@/features/programs/draft';
import { useCustomPrograms } from '@/features/programs/store';
import { formatClock } from '@/lib/formulas';
import { exercisePath, href, PICKER_PATH } from '@/lib/nav';
import {
  addDay,
  finalizeProgram,
  GOALS,
  LIMITS,
  moveSlot,
  removeDay,
  removeSlot,
  renameDay,
  renameProgram,
  setGoal,
  updateSlot,
  validateProgram,
} from '@/lib/program-draft';
import { radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

export default function ProgramEditScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const draft = useProgramDraft((s) => s.draft);
  const isExisting = useProgramDraft((s) => s.isExisting);
  const update = useProgramDraft((s) => s.update);
  const setPickDay = useProgramDraft((s) => s.setPickDay);
  const clear = useProgramDraft((s) => s.clear);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!draft) return <Redirect href={href('/train')} />;

  const errors = validateProgram(draft);

  const save = () => {
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    useCustomPrograms.getState().save(finalizeProgram(draft));
    clear();
    router.back();
  };

  const cancel = () => {
    clear();
    router.back();
  };

  const remove = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    useCustomPrograms.getState().remove(draft.id);
    clear();
    router.back();
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <Text style={styles.title}>{isExisting ? 'Edit program' : 'New program'}</Text>
        <Pressable accessibilityRole="button" onPress={cancel} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <Card style={{ gap: 12 }}>
        <Label>PROGRAM</Label>
        <TextInput
          accessibilityLabel="Program name"
          value={draft.name}
          onChangeText={(t) => update((p) => renameProgram(p, t))}
          placeholder="Program name, e.g. My upper/lower"
          placeholderTextColor={colors.textMuted}
          maxLength={LIMITS.nameLength + 10}
          style={styles.input}
        />
        <View style={styles.chips}>
          {GOALS.map((g) => (
            <Pressable
              key={g}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.goal === g }}
              onPress={() => update((p) => setGoal(p, g))}
              style={[styles.chip, draft.goal === g && { backgroundColor: colors.primary }]}>
              <Text style={[styles.chipText, draft.goal === g && { color: colors.onPrimary }]}>{g}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {draft.days.map((day, di) => (
        <Card key={day.id} style={{ gap: 12 }}>
          <View style={styles.dayHead}>
            <TextInput
              accessibilityLabel={`Name of day ${di + 1}`}
              value={day.name}
              onChangeText={(t) => update((p) => renameDay(p, di, t))}
              placeholder={`Day ${di + 1}`}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { flex: 1 }]}
            />
            {draft.days.length > 1 && (
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${day.name || `day ${di + 1}`}`} onPress={() => update((p) => removeDay(p, di))} style={styles.iconBtn}>
                <Text style={styles.iconText}>×</Text>
              </Pressable>
            )}
          </View>

          {day.slots.length === 0 && <Text style={styles.muted}>No exercises yet. Add some from the library.</Text>}

          {day.slots.map((s, si) => {
            const info = exerciseInfo(s.exerciseId);
            return (
              <View key={s.exerciseId} style={styles.slot}>
                <View style={styles.slotHead}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${info.name}, details`} onPress={() => router.push(href(exercisePath(s.exerciseId)))} style={styles.slotInfo}>
                    <ExerciseImage exerciseId={s.exerciseId} style={styles.thumb} label="" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slotName} numberOfLines={2}>
                        {info.name}
                      </Text>
                      <Text style={styles.muted}>{info.muscle || ' '}</Text>
                    </View>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move ${info.name} up`} disabled={si === 0} onPress={() => update((p) => moveSlot(p, di, si, -1))} style={[styles.iconBtn, si === 0 && styles.off]}>
                    <Text style={styles.iconText}>↑</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Move ${info.name} down`} disabled={si === day.slots.length - 1} onPress={() => update((p) => moveSlot(p, di, si, 1))} style={[styles.iconBtn, si === day.slots.length - 1 && styles.off]}>
                    <Text style={styles.iconText}>↓</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${info.name}`} onPress={() => update((p) => removeSlot(p, di, si))} style={styles.iconBtn}>
                    <Text style={styles.iconText}>×</Text>
                  </Pressable>
                </View>
                <View style={styles.steppers}>
                  <Stepper label="SETS" value={s.sets} min={LIMITS.sets.min} max={LIMITS.sets.max} onChange={(v) => update((p) => updateSlot(p, di, si, { sets: v }))} />
                  <Stepper label="REPS FROM" value={s.repMin} min={LIMITS.reps.min} max={LIMITS.reps.max} onChange={(v) => update((p) => updateSlot(p, di, si, { repMin: v }))} />
                  <Stepper label="REPS TO" value={s.repMax} min={LIMITS.reps.min} max={LIMITS.reps.max} onChange={(v) => update((p) => updateSlot(p, di, si, { repMax: v }))} />
                  <Stepper label="REST" value={s.restS} min={LIMITS.restS.min} max={LIMITS.restS.max} step={15} format={formatClock} onChange={(v) => update((p) => updateSlot(p, di, si, { restS: v }))} />
                </View>
              </View>
            );
          })}

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setPickDay(di);
              router.push(href(PICKER_PATH));
            }}
            style={styles.addEx}>
            <Text style={styles.addExText}>+ Add exercise</Text>
          </Pressable>
        </Card>
      ))}

      {draft.days.length < LIMITS.days && (
        <Pressable accessibilityRole="button" onPress={() => update((p) => addDay(p))} style={styles.secondary}>
          <Text style={styles.secondaryText}>+ Add day</Text>
        </Pressable>
      )}

      {showErrors && errors.length > 0 && (
        <View accessibilityRole="alert" style={{ gap: 4 }}>
          {errors.map((e) => (
            <Text key={e} style={styles.error}>
              {e}
            </Text>
          ))}
        </View>
      )}

      <PrimaryButton title={isExisting ? 'Save changes' : 'Save program'} onPress={save} />

      {isExisting && (
        <Pressable accessibilityRole="button" onPress={remove} style={[styles.secondary, confirmDelete && { backgroundColor: colors.danger }]}>
          <Text style={[styles.secondaryText, confirmDelete && { color: colors.onDanger }]}>{confirmDelete ? 'Tap again to delete this program' : 'Delete program'}</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    title: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, flex: 1 },
    cancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
    cancelText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
    input: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 14, fontSize: 16, fontWeight: '600' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
    chipText: { color: colors.text, fontSize: 13, fontWeight: '700' },
    dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    muted: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    slot: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: 10, gap: 10 },
    slotHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    slotInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
    thumb: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden' },
    slotName: { color: colors.text, fontSize: 14, fontWeight: '700' },
    iconBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    iconText: { color: colors.textMuted, fontSize: 20, fontWeight: '800' },
    off: { opacity: 0.3 },
    steppers: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    addEx: { height: 48, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
    addExText: { color: colors.primary, fontSize: 14, fontWeight: '800' },
    secondary: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
    secondaryText: { color: colors.text, fontSize: 15, fontWeight: '700' },
    error: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  }),
);
