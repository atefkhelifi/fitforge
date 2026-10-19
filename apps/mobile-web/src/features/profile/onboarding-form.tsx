import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Label, Num, PrimaryButton } from '@/components/ui';
import { logWeight } from '@/features/body/store';
import { saveProfileRemote } from '@/features/profile/api';
import { useProfile } from '@/features/profile/store';
import { useUnitsStore } from '@/features/units/store';
import { Activity, activityOptions, computeTargets, Goal, goalOptions, isValidProfile, limits, Profile, Sex } from '@/lib/targets';
import {
  convertWeightText,
  fromDisplayWeight,
  formatHeight,
  ftInToCm,
  heightFields,
  toDisplayWeight,
  Units,
  weightText,
  weightUnit,
} from '@/lib/units';
import { radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

const sexOptions: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const toNumber = (text: string) => parseFloat(text.replace(',', '.'));

export function OnboardingForm() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const saved = useProfile((s) => s.profile);
  const setProfile = useProfile((s) => s.setProfile);

  const [sex, setSex] = useState<Sex>(saved?.sex ?? 'male');
  const units = useUnitsStore((st) => st.units);
  const setUnits = useUnitsStore((st) => st.setUnits);
  const [age, setAge] = useState(saved ? String(saved.age) : '');
  // Height is typed as cm, or as feet and inches in imperial; weight in the chosen units. Stored values are always kg and cm.
  const initialHeight = saved ? heightFields(saved.heightCm) : { cm: '', ft: '', inch: '' };
  const [height, setHeight] = useState(initialHeight.cm);
  const [feet, setFeet] = useState(initialHeight.ft);
  const [inches, setInches] = useState(initialHeight.inch);
  const [weight, setWeight] = useState(saved ? weightText(saved.weightKg, units) : '');
  const [activity, setActivity] = useState<Activity>(saved?.activity ?? 'moderate');
  const [goal, setGoal] = useState<Goal>(saved?.goal ?? 'muscle');

  const inchValue = toNumber(inches);
  const heightCm = units === 'imperial' ? ftInToCm(toNumber(feet), Number.isNaN(inchValue) ? 0 : inchValue) : toNumber(height);
  const draft: Profile = {
    sex,
    age: toNumber(age),
    heightCm: Math.round(heightCm * 10) / 10,
    weightKg: Math.round(fromDisplayWeight(toNumber(weight), units) * 1000) / 1000,
    activity,
    goal,
  };

  const switchUnits = (next: Units) => {
    if (next === units) return;
    setWeight(convertWeightText(weight, units, next));
    if (Number.isFinite(heightCm)) {
      const f = heightFields(heightCm);
      setHeight(f.cm);
      setFeet(f.ft);
      setInches(f.inch);
    }
    setUnits(next);
  };
  const valid = isValidProfile(draft);
  const targets = valid ? computeTargets(draft) : null;

  const save = () => {
    if (!valid) return;
    setProfile(draft);
    logWeight(draft.weightKg);
    // Remote save is best effort; the profile is already stored on this device.
    saveProfileRemote(draft).catch(() => false);
    router.replace('/');
  };

  return (
    <Screen>
      <Text style={styles.title}>{saved ? 'Edit profile' : 'Set up your targets'}</Text>
      <Text style={styles.muted}>We use this to calculate your daily calories and macros. You can change it any time.</Text>

      <Card style={{ gap: 14 }}>
        <Label>ABOUT YOU</Label>
        <View style={styles.row}>
          <Choice label="Metric (kg, cm)" selected={units === 'metric'} onPress={() => switchUnits('metric')} flex />
          <Choice label="Imperial (lb, ft)" selected={units === 'imperial'} onPress={() => switchUnits('imperial')} flex />
        </View>
        <View style={styles.row}>
          {sexOptions.map((o) => (
            <Choice key={o.value} label={o.label} selected={sex === o.value} onPress={() => setSex(o.value)} flex />
          ))}
        </View>
        <Field label="Age" unit="years" value={age} onChange={setAge} hint={`${limits.age.min}–${limits.age.max}`} />
        {units === 'imperial' ? (
          <>
            <Field label="Height" unit="ft" value={feet} onChange={setFeet} hint={`${formatHeight(limits.heightCm.min, units)} – ${formatHeight(limits.heightCm.max, units)}`} />
            <Field label="Height" unit="in" value={inches} onChange={setInches} hint="0–11" />
          </>
        ) : (
          <Field label="Height" unit="cm" value={height} onChange={setHeight} hint={`${limits.heightCm.min}–${limits.heightCm.max}`} />
        )}
        <Field
          label="Weight"
          unit={weightUnit(units)}
          value={weight}
          onChange={setWeight}
          hint={`${Math.round(toDisplayWeight(limits.weightKg.min, units))}–${Math.round(toDisplayWeight(limits.weightKg.max, units))}`}
        />
      </Card>

      <Card style={{ gap: 10 }}>
        <Label>ACTIVITY</Label>
        {activityOptions.map((o) => (
          <Choice key={o.value} label={o.label} hint={o.hint} selected={activity === o.value} onPress={() => setActivity(o.value)} />
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Label>GOAL</Label>
        {goalOptions.map((o) => (
          <Choice key={o.value} label={o.label} hint={o.hint} selected={goal === o.value} onPress={() => setGoal(o.value)} />
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <Label>YOUR DAILY TARGETS</Label>
        {targets ? (
          <>
            <View style={styles.kcalRow}>
              <Num style={styles.kcal}>{targets.kcal.toLocaleString('en-US')}</Num>
              <Text style={styles.muted}>kcal</Text>
            </View>
            <View style={styles.row}>
              <Macro label="PROTEIN" value={targets.protein_g} color={colors.protein} />
              <Macro label="CARBS" value={targets.carbs_g} color={colors.carbs} />
              <Macro label="FAT" value={targets.fat_g} color={colors.fat} />
            </View>
          </>
        ) : (
          <Text style={styles.muted}>Fill in your age, height and weight to see your targets.</Text>
        )}
      </Card>

      <PrimaryButton title={saved ? 'Save changes' : 'Save and continue'} onPress={valid ? save : undefined} />
      <Text style={styles.disclaimer}>Estimates only, not medical advice. Talk to a professional before big diet changes.</Text>
    </Screen>
  );
}

function Field({ label, unit, value, onChange, hint }: { label: string; unit: string; value: string; onChange: (v: string) => void; hint: string }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.field}>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.muted}>{hint}</Text>
      </View>
      <TextInput
        accessibilityLabel={`${label} in ${unit}`}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

function Choice({ label, hint, selected, onPress, flex }: { label: string; hint?: string; selected: boolean; onPress: () => void; flex?: boolean }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, flex && { flex: 1 }, selected && { backgroundColor: colors.primary }]}>
      <Text style={[styles.choiceLabel, selected && { color: colors.onPrimary }]}>{label}</Text>
      {hint && <Text style={[styles.choiceHint, selected && { color: colors.onPrimary }]}>{hint}</Text>}
    </Pressable>
  );
}

function Macro({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <Num style={styles.macroValue}>{value} g</Num>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  muted: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  input: { width: 96, height: 48, borderRadius: radius.md, backgroundColor: colors.surface2, color: colors.text, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  unit: { width: 40, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  choice: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.surface2, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  choiceLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  choiceHint: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  kcalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  kcal: { fontSize: 36, fontWeight: '800' },
  macro: { flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  macroLabel: { fontSize: 11, fontWeight: '700' },
  macroValue: { fontSize: 18, fontWeight: '800' },
  disclaimer: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
}));
