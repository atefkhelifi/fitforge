import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Card, Label } from '@/components/ui';
import { useAuth } from '@/features/auth/auth-provider';
import { radius } from '@/theme/tokens';
import { createStyles } from '@/theme/use-theme';

import { clearLocalData, deleteAccount, exportData } from './actions';

type Pending = 'device' | 'account' | null;

export function PrivacyCard() {
  const styles = useStyles();
  const { session } = useAuth();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (fn: () => Promise<void> | void, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage(done);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  // First tap asks for confirmation, second tap does it.
  const confirm = (which: Exclude<Pending, null>, action: () => Promise<void> | void, done: string) => {
    if (pending !== which) {
      setPending(which);
      setMessage(null);
      return;
    }
    run(action, done);
  };

  return (
    <Card style={{ gap: 10 }}>
      <Label>YOUR DATA</Label>
      <Text style={styles.note}>Download everything this app holds about you, or delete it.</Text>

      <Pressable accessibilityRole="button" disabled={busy} onPress={() => run(exportData, 'Export ready.')} style={styles.button}>
        <Text style={styles.buttonText}>Export my data</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => confirm('device', clearLocalData, 'Data on this device deleted.')}
        style={[styles.button, pending === 'device' && styles.danger]}>
        <Text style={[styles.buttonText, pending === 'device' && styles.dangerText]}>
          {pending === 'device' ? 'Tap again to delete data on this device' : 'Delete data on this device'}
        </Text>
      </Pressable>
      {pending === 'device' && <Text style={styles.warn}>This removes your profile, workouts, meals and weights from this device. Anything synced to your account stays there.</Text>}

      {session && (
        <>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => confirm('account', deleteAccount, 'Account deleted.')}
            style={[styles.button, pending === 'account' && styles.danger]}>
            <Text style={[styles.buttonText, pending === 'account' && styles.dangerText]}>
              {pending === 'account' ? 'Tap again to permanently delete my account' : 'Delete my account'}
            </Text>
          </Pressable>
          {pending === 'account' && (
            <Text style={styles.warn}>This permanently deletes your account and everything synced to it, including progress photos. It cannot be undone.</Text>
          )}
        </>
      )}

      {message && <Text style={styles.note}>{message}</Text>}
    </Card>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    note: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
    warn: { color: colors.danger, fontSize: 14, lineHeight: 20 },
    button: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 },
    buttonText: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
    danger: { backgroundColor: colors.danger },
    dangerText: { color: colors.onDanger },
  }),
);
