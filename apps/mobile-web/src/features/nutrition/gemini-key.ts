import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type State = {
  apiKey: string;
  setKey: (key: string) => void;
  clearKey: () => void;
};

/**
 * The user's own Gemini key for scanning meals without a Supabase account.
 * It stays on this device (plain device storage, never in the app bundle) and is only sent to Google.
 */
export const useGeminiKey = create<State>()(
  persist(
    (set) => ({
      apiKey: '',
      setKey: (key) => set({ apiKey: key.trim() }),
      clearKey: () => set({ apiKey: '' }),
    }),
    { name: 'fitforge-gemini-key', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** First and last characters only, for showing that a key is saved. */
export function maskKey(key: string): string {
  return key.length <= 8 ? '••••' : `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
