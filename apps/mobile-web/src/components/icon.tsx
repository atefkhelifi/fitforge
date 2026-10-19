import Svg, { Circle, Path } from 'react-native-svg';

const paths = {
  home: 'm3 11 9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  train: 'M6 6v12M18 6v12M2 9v6M22 9v6M6 12h12',
  progress: 'm3 17 6-6 4 4 8-8M15 7h6v6',
  nutrition:
    'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M12 8v8M8 12h8',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  play: 'M7 4v16l13-8z',
  check: 'm5 12 5 5 9-10',
} as const;

export type IconName = keyof typeof paths | 'profile';

type Props = { name: IconName; size?: number; color: string; filled?: boolean; strokeWidth?: number };

export function Icon({ name, size = 24, color, filled, strokeWidth = 2 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'profile' ? (
        <>
          <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={strokeWidth} />
          <Path d="M4 21a8 8 0 0 1 16 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </>
      ) : (
        <Path
          d={paths[name]}
          stroke={color}
          fill={filled ? color : 'none'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}
