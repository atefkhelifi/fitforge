export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  /** Lime highlight used as a fill (PR badges, completed sets). */
  accent: string;
  onAccent: string;
  /** Readable version of the accent for text on the page background. */
  accentText: string;
  protein: string;
  carbs: string;
  fat: string;
  danger: string;
  onDanger: string;
};

export const darkPalette: Palette = {
  bg: '#0B0D12',
  surface: '#151922',
  surface2: '#1E2430',
  text: '#F2F4F8',
  textMuted: '#9AA4B5',
  primary: '#4F8CFF',
  onPrimary: '#06101F',
  accent: '#B6FF3B',
  onAccent: '#10131A',
  accentText: '#B6FF3B',
  protein: '#FF6B6B',
  carbs: '#FFC24B',
  fat: '#5BD6A5',
  danger: '#FF4D4F',
  onDanger: '#10131A',
};

// Text and label colors are darkened so they keep at least 4.5:1 contrast on white and light grey.
export const lightPalette: Palette = {
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  surface2: '#EEF0F4',
  text: '#10131A',
  textMuted: '#5B6577',
  primary: '#2F6FED',
  onPrimary: '#FFFFFF',
  accent: '#B6FF3B',
  onAccent: '#10131A',
  accentText: '#3F6B00',
  protein: '#C23030',
  carbs: '#9A5600',
  fat: '#08724F',
  danger: '#D92D20',
  onDanger: '#FFFFFF',
};

export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const breakpoints = { sm: 0, md: 600, lg: 900, xl: 1280 } as const;
export const maxContentWidth = 720;
/** Content width on screens that use multiple columns (Today, Train, Nutrition). */
export const wideContentWidth = 1040;
