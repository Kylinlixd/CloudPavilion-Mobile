import { ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import { colors } from '../theme/colors'
import { radius, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export function ActionButton({ children, onPress, disabled, loading = false, quiet = false }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; loading?: boolean; quiet?: boolean }) { return <TouchableOpacity accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={{ alignItems: 'center', backgroundColor: quiet ? 'transparent' : colors.terracotta, borderColor: quiet ? colors.line : colors.terracotta, borderRadius: radius.sm, borderWidth: quiet ? 1 : 0, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 46, opacity: disabled ? 0.55 : 1, paddingHorizontal: spacing.lg }}>{loading ? <ActivityIndicator color={quiet ? colors.ink : colors.white} /> : <Text style={{ color: quiet ? colors.ink : colors.white, fontFamily: typography.body, fontSize: 14, fontWeight: '600' }}>{children}</Text>}</TouchableOpacity> }
