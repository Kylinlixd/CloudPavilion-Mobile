import { ActivityIndicator, Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { typography } from '../theme/typography'

export function LoadingState({ label = '正在加载' }: { label?: string }) { return <View style={{ alignItems: 'center', backgroundColor: colors.paper, flex: 1, justifyContent: 'center', gap: 12 }}><ActivityIndicator color={colors.terracotta} /><Text style={{ color: colors.muted, fontFamily: typography.mono, fontSize: 11, letterSpacing: 1 }}>{label}</Text></View> }
