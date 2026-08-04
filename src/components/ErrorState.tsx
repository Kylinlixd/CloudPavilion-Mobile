import { Text, TouchableOpacity, View } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { return <View style={{ borderTopColor: colors.line, borderTopWidth: 1, margin: spacing.lg, paddingTop: spacing.lg }}><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 22 }}>{message}</Text>{onRetry && <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={{ marginTop: spacing.md }}><Text style={{ color: colors.terracotta, fontFamily: typography.mono, fontSize: 12 }}>重新尝试 →</Text></TouchableOpacity>}</View> }
