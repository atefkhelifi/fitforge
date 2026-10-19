import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { darkPalette, lightPalette, Palette } from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeState = { mode: ThemeMode; setMode: (mode: ThemeMode) => void };

export const useThemeMode = create<ThemeState>()(
  persist((set) => ({ mode: 'system', setMode: (mode) => set({ mode }) }), {
    name: 'fitforge-theme',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

/** True when the dark palette is active (follows the device unless the user picked a mode). */
export function useIsDark(): boolean {
  const mode = useThemeMode((s) => s.mode);
  const system = useColorScheme();
  return mode === 'system' ? system !== 'light' : mode === 'dark';
}

export function useColors(): Palette {
  return useIsDark() ? darkPalette : lightPalette;
}

/**
 * Defines styles that depend on the palette. Pass a factory that returns `StyleSheet.create({...})`;
 * the returned hook gives the styles for the active theme.
 */
export function createStyles<T>(factory: (colors: Palette) => T) {
  return function useStyles(): T {
    const colors = useColors();
    return useMemo(() => factory(colors), [colors]);
  };
}
