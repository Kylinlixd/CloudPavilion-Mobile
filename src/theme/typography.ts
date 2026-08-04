import { Platform } from 'react-native'

export const typography = {
  body: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }),
  display: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
} as const
