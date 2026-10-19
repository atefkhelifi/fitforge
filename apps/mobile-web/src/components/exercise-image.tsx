import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { exerciseImages, exerciseInfo } from '@/data/exercise-catalog';
import { radius } from '@/theme/tokens';
import { createStyles, useColors } from '@/theme/use-theme';

import { Icon } from './icon';

type Props = {
  exerciseId: string;
  /** 0 = start position, 1 = end position. Falls back to the first photo. */
  index?: number;
  style?: StyleProp<ViewStyle>;
  label?: string;
};

/**
 * One exercise photo. Photos come from a CDN and are cached on the device. If there is no photo, or it
 * fails to load (offline, first view), a neutral placeholder is shown instead, never a broken image.
 */
export function ExerciseImage({ exerciseId, index = 0, style, label }: Props) {
  const colors = useColors();
  const urls = exerciseImages(exerciseId);
  const url = urls[index] ?? urls[0];
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!url || failedUrl === url) {
    return (
      <View style={[{ backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }, style]} accessibilityLabel={label}>
        <Icon name="train" size={26} color={colors.textMuted} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={[{ backgroundColor: colors.surface2 }, style as never]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      recyclingKey={url}
      accessibilityLabel={label}
      onError={() => setFailedUrl(url)}
    />
  );
}

/** A large photo for the workout screen: tap to flip between the start and end position, with a "How to" shortcut. */
export function ExercisePhoto({ exerciseId, height = 170, onInfo }: { exerciseId: string; height?: number; onInfo?: () => void }) {
  const styles = useStyles();
  const info = exerciseInfo(exerciseId);
  const [position, setPosition] = useState(0);
  if (info.images === 0) return null;
  const canFlip = info.images > 1;

  return (
    <View style={[styles.wrap, { height }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={canFlip ? `${info.name}. Showing position ${position + 1} of ${info.images}. Tap to show the other position.` : info.name}
        disabled={!canFlip}
        onPress={() => setPosition((p) => (p + 1) % info.images)}
        style={StyleSheet.absoluteFill}>
        <ExerciseImage exerciseId={exerciseId} index={position} style={StyleSheet.absoluteFill} label={info.name} />
      </Pressable>
      {canFlip && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{position === 0 ? 'Start' : 'Finish'} · tap to flip</Text>
        </View>
      )}
      {onInfo && (
        <Pressable accessibilityRole="button" accessibilityLabel={`How to do ${info.name}`} onPress={onInfo} style={styles.info}>
          <Text style={styles.infoText}>How to</Text>
        </Pressable>
      )}
    </View>
  );
}

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    wrap: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface2 },
    badge: { position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    info: { position: 'absolute', right: 10, bottom: 10, minHeight: 44, justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 14 },
    infoText: { color: colors.onPrimary, fontSize: 13, fontWeight: '800' },
  }),
);
