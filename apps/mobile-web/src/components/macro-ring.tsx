import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { createStyles, useColors } from '@/theme/use-theme';

type Props = { value: number; goal: number; size?: number };

export function MacroRing({ value, goal, size = 120 }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, value / goal);
  const center = size / 2;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`${value} of ${goal} calories eaten`}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={colors.surface2} strokeWidth={stroke} fill="none" />
        {dash > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={r}
            stroke={colors.primary}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${dash} ${c}`}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.value}>{value.toLocaleString('en-US')}</Text>
        <Text style={styles.sub}>of {goal.toLocaleString('en-US')} kcal</Text>
      </View>
    </View>
  );
}

const useStyles = createStyles((colors) => StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { color: colors.text, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sub: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
}));
