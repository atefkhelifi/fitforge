import { Stack } from 'expo-router';

import { useColors } from '@/theme/use-theme';

export default function TrainLayout() {
  const colors = useColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
