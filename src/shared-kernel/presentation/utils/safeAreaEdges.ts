import { Platform } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

export const ROOT_SAFE_AREA_EDGES: Edge[] =
  Platform.OS === 'ios'
    ? ['top', 'left', 'right']
    : ['top', 'right', 'bottom', 'left'];
