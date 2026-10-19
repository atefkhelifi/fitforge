import { Platform, Share } from 'react-native';

import { useBody } from '@/features/body/store';
import { useHistory } from '@/features/history/store';
import { useMeals } from '@/features/nutrition/store';
import { useProfile } from '@/features/profile/store';
import { buildExport, exportFilename } from '@/lib/export';
import { supabase } from '@/lib/supabase';

/** Gives the user a JSON file with all their data: a download on the web, the share sheet on phones. */
export async function exportData(): Promise<void> {
  const now = Date.now();
  const json = JSON.stringify(
    buildExport({
      profile: useProfile.getState().profile,
      workouts: useHistory.getState().workouts,
      meals: useMeals.getState().meals,
      weights: useBody.getState().entries,
      now,
    }),
    null,
    2,
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename(now);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: exportFilename(now), message: json });
}

/** Wipes the profile, workouts, meals and weights stored on this device. Theme and the saved AI key are kept. */
export function clearLocalData(): void {
  useHistory.setState({ workouts: [] });
  useMeals.setState({ meals: [] });
  useBody.setState({ entries: [] });
  useProfile.setState({ profile: null });
}

/** Deletes the account and all synced data on the server (including photos), then clears this device. */
export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) throw new Error('Sign in first to delete your account.');

  const { error } = await supabase.functions.invoke('delete-account');
  if (error) {
    let message = 'Could not delete the account. Try again.';
    const response = (error as { context?: unknown }).context;
    if (response instanceof Response) {
      try {
        const body = await response.json();
        if (typeof body?.error === 'string') message = body.error;
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message);
  }

  clearLocalData();
  await supabase.auth.signOut();
}
