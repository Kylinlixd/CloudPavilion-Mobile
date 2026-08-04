import { Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export function EmptyState({ title, copy }: { title: string; copy: string }) { return <View style={{ borderTopColor: colors.line, borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.lg }}><Text style={{ color: colors.terracotta, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1 }}>云阁</Text><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 26, letterSpacing: -1, marginTop: 14 }}>{title}</Text><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 20, marginTop: 8 }}>{copy}</Text></View> }
