import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { maxContentWidth, space, wideContentWidth } from '@/theme/tokens';
import { createStyles } from '@/theme/use-theme';

export function Screen({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.content, wide && { maxWidth: wideContentWidth }]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { alignItems: 'center', padding: space.xl, paddingTop: space.lg },
  content: { width: '100%', maxWidth: maxContentWidth, gap: space.lg },
}));
