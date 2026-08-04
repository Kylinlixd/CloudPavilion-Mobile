import { ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import { colors } from '../theme/colors'
import { radius, spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export function ActionButton({ children, onPress, disabled, quiet = false }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean; quiet?: boolean }) { return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress} style={{ alignItems: 'center', backgroundColor: quiet ? 'transparent' : colors.terracotta, borderColor: quiet ? colors.line : colors.terracotta, borderRadius: radius.sm, borderWidth: quiet ? 1 : 0, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 46, paddingHorizontal: spacing.lg }}><Text style={{ color: quiet ? colors.ink : colors.white, fontFamily: typography.body, fontSize: 14, fontWeight: '600' }}>{disabled ? <ActivityIndicator color={quiet ? colors.ink : colors.white} /> : children}</Text></TouchableOpacity> }
