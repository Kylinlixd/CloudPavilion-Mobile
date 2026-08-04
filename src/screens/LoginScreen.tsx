import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { useAuth } from '../context/AuthContext'
import { useFamily } from '../context/FamilyContext'
import { ApiError } from '../lib/api'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
import { ActionButton } from '../components/ActionButton'

export function LoginScreen() {
  const { login } = useAuth()
  const { setCurrentFamilyId } = useFamily()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [familyId, setFamilyId] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit() { setError(''); setPending(true); try { await login(username, password); if (familyId.trim()) await setCurrentFamilyId(familyId); } catch (caught) { setError(caught instanceof ApiError ? caught.message : '登录失败，请检查账号和密码') } finally { setPending(false) } }
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ backgroundColor: colors.paper, flex: 1 }}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }} keyboardShouldPersistTaps="handled"><View style={{ backgroundColor: colors.ink, borderRadius: 22, minHeight: 250, overflow: 'hidden', padding: spacing.xl }}><Text style={{ color: colors.terracottaLight, fontFamily: typography.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' }}>CloudPavilion</Text><Text style={{ color: colors.white, fontFamily: typography.display, fontSize: 41, letterSpacing: -1.7, lineHeight: 43, marginTop: 58 }}>让每一本书，回到家人的日常里。</Text><Text style={{ color: 'rgba(255,255,255,.62)', fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginTop: 22 }}>把藏书、借阅和阅读记忆放在同一个安静的角落。</Text></View><View style={{ paddingTop: spacing.xxl }}><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 30, letterSpacing: -1 }}>进入你的家庭书房</Text><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 20, marginTop: 10 }}>登录后可以继续上次没有读完的故事。</Text><View style={{ gap: spacing.md, marginTop: spacing.xl }}><TextInput autoCapitalize="none" autoComplete="username" onChangeText={setUsername} placeholder="用户名" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.paperBright, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, minHeight: 52, paddingHorizontal: 15 }} /><TextInput autoCapitalize="none" autoComplete="password" onChangeText={setPassword} placeholder="密码" placeholderTextColor={colors.muted} secureTextEntry style={{ backgroundColor: colors.paperBright, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, minHeight: 52, paddingHorizontal: 15 }} /><TextInput keyboardType="number-pad" onChangeText={setFamilyId} placeholder="家庭 ID（可稍后填写）" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.paperBright, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, minHeight: 52, paddingHorizontal: 15 }} />{error ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontFamily: typography.body, fontSize: 13 }}>{error}</Text> : null}<ActionButton disabled={pending} onPress={() => void submit()}>{pending ? '正在进入…' : '进入云阁  →'}</ActionButton></View><TouchableOpacity style={{ marginTop: spacing.lg }}><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 12 }}>还没有家庭？登录后可以创建或加入家庭。</Text></TouchableOpacity></View></ScrollView></KeyboardAvoidingView>
}
