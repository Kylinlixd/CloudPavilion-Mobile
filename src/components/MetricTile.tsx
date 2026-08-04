import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export function MetricTile({ label, value, note, tone = 'ink' }: { label: string; value: string | number; note: string; tone?: 'ink' | 'terracotta' | 'sage' }) { const background = tone === 'terracotta' ? colors.terracotta : tone === 'sage' ? '#D8DFCF' : colors.ink; const foreground = tone === 'sage' ? colors.ink : colors.white; return <View style={{ backgroundColor: background, borderRadius: 14, flex: 1, minHeight: 142, padding: spacing.lg }}><Text style={{ color: tone === 'sage' ? colors.terracotta : colors.terracottaLight, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text><Text style={{ color: foreground, fontFamily: typography.display, fontSize: 52, letterSpacing: -2, marginTop: 22 }}>{value}</Text><Text style={{ color: tone === 'sage' ? colors.muted : 'rgba(255,255,255,.65)', fontFamily: typography.body, fontSize: 11, marginTop: 5 }}>{note}</Text></View> }
