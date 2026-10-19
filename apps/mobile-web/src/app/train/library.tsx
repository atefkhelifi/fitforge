import { useLocalSearchParams, useRouter } from 'expo-router';
import { memo, useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseImage } from '@/components/exercise-image';
import { FilterRow } from '@/components/filter-row';
import { canonicalId, capitalise, CatalogExercise, EQUIPMENT, getCatalog, LEVELS, MUSCLES } from '@/data/exercise-catalog';
import { useProgramDraft } from '@/features/programs/draft';
import { ExerciseFilters, filterExercises, noFilters } from '@/lib/exercise-search';
import { addExercise } from '@/lib/program-draft';
import { exercisePath, href } from '@/lib/nav';
import { maxContentWidth, radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

type RowProps = { item: CatalogExercise; picking: boolean; added: boolean; onOpen: (id: string) => void; onAdd: (id: string) => void };

const Row = memo(function Row({ item, picking, added, onOpen, onAdd }: RowProps) {
  const styles = useStyles();
  const sub = [capitalise(item.primary[0] ?? ''), item.equipment ?? 'unspecified', item.level].filter(Boolean).join(' · ');
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}. ${sub}. Open details`} onPress={() => onOpen(item.id)} style={styles.rowMain}>
        <ExerciseImage exerciseId={item.id} style={styles.thumb} label="" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        </View>
      </Pressable>
      {picking && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={added ? `${item.name} is already in this day` : `Add ${item.name}`}
          disabled={added}
          onPress={() => onAdd(item.id)}
          style={[styles.add, added && styles.added]}>
          <Text style={[styles.addText, added && styles.addedText]}>{added ? '✓' : '+'}</Text>
        </Pressable>
      )}
    </View>
  );
});

export default function LibraryScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const picking = pick === '1';

  const draft = useProgramDraft((s) => s.draft);
  const pickDay = useProgramDraft((s) => s.pickDay);
  const update = useProgramDraft((s) => s.update);

  const [filters, setFilters] = useState<ExerciseFilters>(noFilters);
  const query = useDeferredValue(filters.query);
  const results = useMemo(
    () => filterExercises(getCatalog(), { muscle: filters.muscle, equipment: filters.equipment, level: filters.level, query }),
    [filters.muscle, filters.equipment, filters.level, query],
  );

  const day = draft?.days[pickDay];
  const inDay = useMemo(() => new Set(day?.slots.map((s) => s.exerciseId) ?? []), [day]);
  const hasFilter = !!(filters.query || filters.muscle || filters.equipment || filters.level);

  const open = (id: string) => router.push(href(exercisePath(id, picking)));
  const add = (id: string) => update((p) => addExercise(p, pickDay, id));

  const header = (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{picking ? 'Add exercise' : 'Exercises'}</Text>
          {picking && day && <Text style={styles.sub}>Adding to {day.name || 'this day'}</Text>}
        </View>
        {picking && (
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        )}
      </View>

      <TextInput
        accessibilityLabel="Search exercises"
        value={filters.query}
        onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
        placeholder="Search by name, muscle or equipment"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.search}
      />
      <FilterRow label="MUSCLE" options={MUSCLES} value={filters.muscle} onChange={(muscle) => setFilters((f) => ({ ...f, muscle }))} />
      <FilterRow label="EQUIPMENT" options={EQUIPMENT} value={filters.equipment} onChange={(equipment) => setFilters((f) => ({ ...f, equipment }))} />
      <FilterRow label="LEVEL" options={LEVELS} value={filters.level} onChange={(level) => setFilters((f) => ({ ...f, level }))} />

      <View style={styles.countRow}>
        <Text style={styles.sub} accessibilityLiveRegion="polite">
          {results.length} exercise{results.length === 1 ? '' : 's'}
        </Text>
        {hasFilter && (
          <Pressable accessibilityRole="button" onPress={() => setFilters(noFilters)} style={styles.clear}>
            <Text style={styles.clearText}>Clear filters</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.column}>
        <FlatList
          data={results}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <Row item={item} picking={picking} added={inDay.has(canonicalId(item.id))} onOpen={open} onAdd={add} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={[styles.sub, { padding: 24, textAlign: 'center' }]}>No exercises match. Try fewer filters or a different word.</Text>}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={7}
          maxToRenderPerBatch={12}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </SafeAreaView>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
    column: { flex: 1, width: '100%', maxWidth: maxContentWidth, paddingHorizontal: 20 },
    header: { gap: 12, paddingTop: 8, paddingBottom: 8 },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    back: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    backText: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: -3 },
    title: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
    sub: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    done: { height: 44, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    doneText: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' },
    search: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, fontSize: 15 },
    countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
    clear: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
    clearText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: 8, paddingRight: 8 },
    rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, minHeight: 72 },
    thumb: { width: 64, height: 64, borderRadius: 10, overflow: 'hidden' },
    name: { color: colors.text, fontSize: 15, fontWeight: '700' },
    add: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    addText: { color: colors.onPrimary, fontSize: 22, fontWeight: '800', marginTop: -2 },
    added: { backgroundColor: colors.accent },
    addedText: { color: colors.onAccent, fontSize: 18 },
  }),
);
