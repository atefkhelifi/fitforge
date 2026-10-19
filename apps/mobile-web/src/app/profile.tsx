import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card, Label, PrimaryButton } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { PrivacyCard } from '@/features/privacy/privacy-card';
import { useUnitsStore } from '@/features/units/store';
import { formatHeight, formatWeight, Units } from '@/lib/units';
import { maskKey, useGeminiKey } from '@/features/nutrition/gemini-key';
import { useProfile, useTargets } from '@/features/profile/store';
import { syncAll, useSyncStatus } from '@/features/sync/sync';
import { radius } from '@/theme/tokens';
import { createStyles, ThemeMode, useColors, useThemeMode } from '@/theme/use-theme';

export default function ProfileScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const profile = useProfile((s) => s.profile);
  const targets = useTargets();
  const sync = useSyncStatus();
  const units = useUnitsStore((s) => s.units);
  const setUnits = useUnitsStore((s) => s.setUnits);
  const themeMode = useThemeMode((s) => s.mode);
  const geminiKey = useGeminiKey((s) => s.apiKey);
  const setGeminiKey = useGeminiKey((s) => s.setKey);
  const clearGeminiKey = useGeminiKey((s) => s.clearKey);
  const [keyDraft, setKeyDraft] = useState('');
  const setThemeMode = useThemeMode((s) => s.setMode);
  const { configured, loading, session, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (mode: 'in' | 'up') => {
    setBusy(true);
    setMessage(null);
    const error = await (mode === 'in' ? signIn(email.trim(), password) : signUp(email.trim(), password));
    setMessage(error);
    setBusy(false);
  };

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>

      <Card style={{ gap: 10 }}>
        <Label>DAILY TARGETS</Label>
        <Text style={styles.email}>{targets.kcal.toLocaleString('en-US')} kcal</Text>
        <Text style={styles.note}>
          Protein {targets.protein_g} g · Carbs {targets.carbs_g} g · Fat {targets.fat_g} g
        </Text>
        {profile && (
          <Text style={styles.note}>
            {formatWeight(profile.weightKg, units)} · {formatHeight(profile.heightCm, units)} · {profile.age} years
          </Text>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.push('/onboarding')} style={styles.secondary}>
          <Text style={styles.secondaryText}>{profile ? 'Edit profile' : 'Set up targets'}</Text>
        </Pressable>
      </Card>

      <Card style={{ gap: 10 }}>
        <Label>APPEARANCE</Label>
        <View style={styles.modes}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: themeMode === m }}
              onPress={() => setThemeMode(m)}
              style={[styles.mode, themeMode === m && { backgroundColor: colors.primary }]}>
              <Text style={[styles.modeText, themeMode === m && { color: colors.onPrimary }]}>{m}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <Label>UNITS</Label>
        <View style={styles.modes}>
          {(['metric', 'imperial'] as Units[]).map((u) => (
            <Pressable
              key={u}
              accessibilityRole="button"
              accessibilityState={{ selected: units === u }}
              onPress={() => setUnits(u)}
              style={[styles.mode, units === u && { backgroundColor: colors.primary }]}>
              <Text style={[styles.unitText, units === u && { color: colors.onPrimary }]}>{u === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lb, ft)'}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.note}>Changes how weights and heights are shown and typed. Your data is not altered.</Text>
      </Card>

      <Card style={{ gap: 10 }}>
        <Label>AI MEAL SCAN</Label>
        {geminiKey ? (
          <>
            <Text style={styles.note}>Gemini key saved ({maskKey(geminiKey)}). Meal scans use it when you are not signed in.</Text>
            <Pressable accessibilityRole="button" onPress={clearGeminiKey} style={styles.secondary}>
              <Text style={styles.secondaryText}>Remove key</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.note}>
              Paste a free Gemini API key from aistudio.google.com to scan meals without an account. It is stored only on this device and sent only to Google.
            </Text>
            <TextInput
              accessibilityLabel="Gemini API key"
              value={keyDraft}
              onChangeText={setKeyDraft}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Gemini API key"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <PrimaryButton
              title="Save key"
              onPress={
                keyDraft.trim().length >= 20
                  ? () => {
                      setGeminiKey(keyDraft);
                      setKeyDraft('');
                    }
                  : undefined
              }
            />
          </>
        )}
      </Card>

      <PrivacyCard />

      {!configured && (
        <Card style={{ gap: 8 }}>
          <Label>LOCAL MODE</Label>
          <Text style={styles.note}>
            Supabase is not configured, so workouts are not saved. Copy .env.example to .env, add your project URL and anon key, then
            restart the dev server.
          </Text>
        </Card>
      )}

      {configured && loading && <ActivityIndicator color={colors.primary} />}

      {configured && !loading && session && (
        <Card style={{ gap: 12 }}>
          <Label>SIGNED IN</Label>
          <Text style={styles.email}>{session.user.email}</Text>
          <Text style={styles.note}>
            {sync.status === 'syncing' && 'Syncing…'}
            {sync.status === 'done' && sync.lastAt !== null && `Synced at ${new Date(sync.lastAt).toLocaleTimeString()}`}
            {sync.status === 'error' && `Sync failed: ${sync.error}`}
            {sync.status === 'idle' && 'Not synced yet'}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => syncAll()} style={styles.secondary}>
            <Text style={styles.secondaryText}>Sync now</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={signOut} style={styles.secondary}>
            <Text style={styles.secondaryText}>Sign out</Text>
          </Pressable>
        </Card>
      )}

      {configured && !loading && !session && (
        <Card style={{ gap: 12 }}>
          <Label>ACCOUNT</Label>
          <TextInput
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="Password (min 6 characters)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          {message && <Text style={styles.message}>{message}</Text>}
          <PrimaryButton title={busy ? 'Please wait…' : 'Sign in'} onPress={busy ? undefined : () => submit('in')} />
          <Pressable accessibilityRole="button" onPress={busy ? undefined : () => submit('up')} style={styles.secondary}>
            <Text style={styles.secondaryText}>Create account</Text>
          </Pressable>
        </Card>
      )}

      <View />
    </Screen>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  note: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  email: { color: colors.text, fontSize: 18, fontWeight: '700' },
  input: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface2, color: colors.text, paddingHorizontal: 14, fontSize: 16 },
  message: { color: colors.carbs, fontSize: 14, lineHeight: 20 },
  modes: { flexDirection: 'row', gap: 8 },
  mode: { flex: 1, height: 44, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  unitText: { color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  modeText: { color: colors.text, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  secondary: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '700' },
}));
