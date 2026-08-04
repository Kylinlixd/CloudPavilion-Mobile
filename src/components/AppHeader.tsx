import { Text, TouchableOpacity, View } from 'react-native'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export function AppHeader({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress?: () => void }) { return <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl }}><View><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 31, letterSpacing: -1.2 }}>{title}</Text>{subtitle && <Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 13, marginTop: 5 }}>{subtitle}</Text>}</View>{onPress && <TouchableOpacity accessibilityLabel="打开设置" onPress={onPress} style={{ alignItems: 'center', backgroundColor: colors.ink, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 }}><Text style={{ color: colors.white, fontFamily: typography.mono, fontSize: 12 }}>CP</Text></TouchableOpacity>}</View> }
