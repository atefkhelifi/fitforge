import { useWindowDimensions } from 'react-native';

import { breakpoints } from './tokens';

/** True on desktop-sized windows, where navigation moves to a sidebar. */
export function useIsWide(): boolean {
  return useWindowDimensions().width >= breakpoints.lg;
}
