import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Cell, Chip, Grid, Label, Num, PrimaryButton, ProgressBar } from '@/components/ui';
import { analyzeMeal, prepareImage } from '@/features/nutrition/analyze';
import { deleteMeal, syncMeal, useMeals } from '@/features/nutrition/store';
import { useTargets } from '@/features/profile/store';
import {
  defaultMealType,
  looksTooBig,
  LoggedMeal,
  MealAnalysis,
  mealsOnDay,
  MealType,
  scaleItem,
  totalsOf,
} from '@/lib/meal';
import { radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const round = (n: number) => Math.round(n);

type Picked = { uri: string; base64: string } | null;

export default function NutritionScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { meals, addMeal } = useMeals();
  const dailyTargets = useTargets();
  const [now] = useState(() => Date.now());
  const [photo, setPhoto] = useState<Picked>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [grams, setGrams] = useState<number[]>([]);
  const [mealType, setMealType] = useState<MealType>(() => defaultMealType(new Date().getHours()));
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const today = mealsOnDay(meals, now);
  const dayTotals = totalsOf(today.flatMap((m) => m.items));

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    setSaveNote(null);
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError('Camera permission is needed to take a photo. You can choose one from your gallery instead.');
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
      const result =
        source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      setBusy(true);
      const uri = result.assets[0].uri;
      setPhoto({ uri, base64: await prepareImage(uri) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the photo.');
    } finally {
      setBusy(false);
    }
  };

  const analyse = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await analyzeMeal({ imageBase64: photo?.base64, note: note.trim() || undefined });
      if (!result.is_food) {
        setError('That does not look like food. Try another photo or describe the meal.');
        return;
      }
      setAnalysis(result);
      setGrams(result.items.map((i) => i.grams));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setAnalysis(null);
    setGrams([]);
    setPhoto(null);
    setNote('');
    setError(null);
  };

  const save = async () => {
    if (!analysis) return;
    const meal: LoggedMeal = {
      id: `${Date.now()}`,
      eatenAt: Date.now(),
      mealType,
      dishName: analysis.dish_name,
      source: photo ? 'photo' : 'text',
      items: analysis.items.map((item, i) => scaleItem(item, grams[i])),
    };
    addMeal(meal);
    reset();
    const synced = await syncMeal(meal).catch(() => false);
    setSaveNote(synced ? 'Meal saved to your account.' : 'Meal saved on this device. Sign in to sync it.');
  };

  if (analysis) {
    const items = analysis.items.map((item, i) => scaleItem(item, grams[i]));
    const t = totalsOf(items);
    return (
      <Screen>
        <Text style={styles.title}>Review meal</Text>
        {photo && <Image source={{ uri: photo.uri }} style={styles.preview} accessibilityLabel="Meal photo" />}
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Label>DETECTED</Label>
            <Text style={styles.dish}>{analysis.dish_name}</Text>
            <Text style={styles.muted}>{round(analysis.overall_confidence * 100)}% confidence</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Num style={styles.kcal}>{round(t.kcal)}</Num>
            <Text style={styles.muted}>kcal</Text>
          </View>
        </View>

        <View style={styles.macroRow}>
          <MacroBox label="PROTEIN" value={t.protein_g} color={colors.protein} />
          <MacroBox label="CARBS" value={t.carbs_g} color={colors.carbs} />
          <MacroBox label="FAT" value={t.fat_g} color={colors.fat} />
        </View>

        <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
          {items.map((item, i) => (
            <View key={i} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Num style={styles.muted}>
                  {round(item.kcal)} kcal · P {round(item.protein_g)} · C {round(item.carbs_g)} · F {round(item.fat_g)}
                </Num>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease ${item.name} portion`}
                  onPress={() => setGrams((g) => g.map((v, j) => (j === i ? Math.max(10, v - 10) : v)))}
                  style={styles.stepBtn}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Num style={styles.grams}>{round(grams[i])} g</Num>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Increase ${item.name} portion`}
                  onPress={() => setGrams((g) => g.map((v, j) => (j === i ? v + 10 : v)))}
                  style={styles.stepBtn}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>

        {looksTooBig(t) && (
          <Text style={styles.warn} accessibilityRole="alert">
            That is a lot for one meal ({round(t.kcal)} kcal). If the photo shows several plates or a table of ingredients, scan one plate at a time or lower the portions below.
          </Text>
        )}

        {analysis.assumptions.length > 0 && <Text style={styles.assume}>{analysis.assumptions.join(' ')}</Text>}

        <View style={styles.chips}>
          {mealTypes.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: m === mealType }}
              onPress={() => setMealType(m)}
              style={[styles.typeChip, m === mealType && { backgroundColor: colors.primary }]}>
              <Text style={[styles.typeText, m === mealType && { color: colors.onPrimary }]}>{m}</Text>
            </Pressable>
          ))}
        </View>

        <PrimaryButton title="Save meal" onPress={save} />
        <Pressable accessibilityRole="button" onPress={reset} style={styles.secondary}>
          <Text style={styles.secondaryText}>Discard</Text>
        </Pressable>
        <Text style={styles.disclaimer}>Estimates only. Not medical or dietary advice.</Text>
      </Screen>
    );
  }

  return (
    <Screen wide>
      <Text style={styles.title}>Nutrition</Text>

      <Grid>
      <Cell>
      <Card style={{ gap: 12, flexGrow: 1 }}>
        <Label>SCAN A MEAL</Label>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.preview} accessibilityLabel="Selected meal photo" />
        ) : (
          <Text style={styles.muted}>Take a photo of your plate or describe it. You can correct the portions before saving.</Text>
        )}
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={() => pick('camera')} disabled={busy} style={[styles.secondary, { flex: 1 }]}>
            <Text style={styles.secondaryText}>Take photo</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => pick('library')} disabled={busy} style={[styles.secondary, { flex: 1 }]}>
            <Text style={styles.secondaryText}>Gallery</Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Meal description"
          value={note}
          onChangeText={setNote}
          placeholder={photo ? 'Add a note (optional), e.g. cooked with 1 tbsp oil' : 'Or describe it, e.g. 2 eggs and 100 g rice'}
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PrimaryButton title="Analyse" onPress={photo || note.trim() ? analyse : undefined} />
        )}
        {saveNote && <Text style={styles.muted}>{saveNote}</Text>}
      </Card>
      </Cell>

      <Cell>
      <Card style={{ gap: 12, flexGrow: 1 }}>
        <Label>TODAY</Label>
        <View style={styles.headRow}>
          <Num style={styles.kcal}>{round(dayTotals.kcal)}</Num>
          <Text style={styles.muted}>of {dailyTargets.kcal.toLocaleString('en-US')} kcal</Text>
        </View>
        <ProgressBar value={dayTotals.kcal} goal={dailyTargets.kcal} color={colors.primary} />
        <View style={styles.macroRow}>
          <MacroBox label="PROTEIN" value={dayTotals.protein_g} color={colors.protein} />
          <MacroBox label="CARBS" value={dayTotals.carbs_g} color={colors.carbs} />
          <MacroBox label="FAT" value={dayTotals.fat_g} color={colors.fat} />
        </View>
      </Card>
      </Cell>
      </Grid>

      {today.length > 0 && (
        <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
          {today.map((m, i) => {
            const t = totalsOf(m.items);
            return (
              <View key={m.id} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.itemName}>{m.dishName}</Text>
                  <View style={styles.row}>
                    <Chip>{m.mealType}</Chip>
                    <Num style={styles.muted}>{round(t.kcal)} kcal</Num>
                  </View>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${m.dishName}`} onPress={() => deleteMeal(m.id)} style={styles.stepBtn}>
                  <Text style={styles.stepText}>×</Text>
                </Pressable>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

function MacroBox({ label, value, color }: { label: string; value: number; color: string }) {
  const styles = useStyles();
  return (
    <View style={styles.macroBox}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <Num style={styles.macroValue}>{round(value)} g</Num>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  muted: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  preview: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: colors.surface2 },
  secondary: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  input: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  error: { color: colors.carbs, fontSize: 14, lineHeight: 20 },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  dish: { color: colors.text, fontSize: 24, fontWeight: '800' },
  kcal: { fontSize: 34, fontWeight: '800' },
  macroRow: { flexDirection: 'row', gap: 10 },
  macroBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  macroLabel: { fontSize: 11, fontWeight: '700' },
  macroValue: { fontSize: 18, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.surface2 },
  itemName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: 20, fontWeight: '800' },
  grams: { width: 52, textAlign: 'center', fontSize: 14, fontWeight: '800' },
  warn: { color: colors.danger, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  assume: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  typeText: { color: colors.text, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  disclaimer: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
}));
