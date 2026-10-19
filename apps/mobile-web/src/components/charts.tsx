import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';

import { useColors } from '@/theme/use-theme';

const PAD = 8;

export function LineChart({ values, height = 140, label }: { values: number[]; height?: number; label: string }) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  let body = null;
  if (width > 0 && values.length > 0) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const x = (i: number) => (values.length === 1 ? width / 2 : PAD + (i * (width - PAD * 2)) / (values.length - 1));
    const y = (v: number) => PAD + (1 - (v - min) / span) * (height - PAD * 2);
    const last = values.length - 1;
    body = (
      <Svg width={width} height={height}>
        {[0.15, 0.5, 0.85].map((f) => (
          <Line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={colors.surface2} />
        ))}
        {values.length > 1 && (
          <Polyline
            points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <Circle cx={x(last)} cy={y(values[last])} r={6} fill={colors.accentText} />
      </Svg>
    );
  }

  return (
    <View onLayout={onLayout} style={{ height }} accessible accessibilityRole="image" accessibilityLabel={label}>
      {body}
    </View>
  );
}

export function BarChart({ values, height = 90, label }: { values: number[]; height?: number; label: string }) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  let body = null;
  if (width > 0 && values.length > 0) {
    const max = Math.max(...values, 1);
    const gap = 10;
    const barW = (width - gap * (values.length - 1)) / values.length;
    body = (
      <Svg width={width} height={height}>
        {values.map((v, i) => {
          const h = Math.max(4, (v / max) * height);
          return (
            <Rect
              key={i}
              x={i * (barW + gap)}
              y={height - h}
              width={barW}
              height={h}
              rx={6}
              fill={i === values.length - 1 ? colors.primary : colors.surface2}
            />
          );
        })}
      </Svg>
    );
  }

  return (
    <View onLayout={onLayout} style={{ height }} accessible accessibilityRole="image" accessibilityLabel={label}>
      {body}
    </View>
  );
}
