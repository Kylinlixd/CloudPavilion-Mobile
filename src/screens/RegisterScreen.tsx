import { useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { ActionButton } from '../components/ActionButton'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

function firstValidationMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    if (typeof value === 'string') return value
  }
  return null
}

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Register'>>()
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit() {
    if (!username.trim() || !password || !passwordConfirm) {
      setError('请填写用户名、密码和确认密码')
      return
    }
    if (password !== passwordConfirm) {
      setError('两次输入的密码不一致')
      return
    }
    setError('')
    setPending(true)
    try {
      await register(username.trim(), password, passwordConfirm)
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(firstValidationMessage(caught.payload) || caught.message)
      } else {
        setError('注册失败，请稍后再试')
      }
    } finally {
      setPending(false)
    }
  }

  const inputStyle = {
    backgroundColor: colors.paperBright,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    minHeight: 52,
    paddingHorizontal: 15,
  }

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ backgroundColor: colors.paper, flex: 1 }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: colors.ink, borderRadius: 22, padding: spacing.xl }}>
        <Image accessibilityLabel="云阁 Logo" resizeMode="contain" source={require('../../assets/cloudpavilion-logo.png')} style={{ borderRadius: 18, height: 88, width: 88 }} />
        <Text style={{ color: colors.terracottaLight, fontFamily: typography.mono, fontSize: 11, letterSpacing: 1.2, marginTop: 18, textTransform: 'uppercase' }}>CloudPavilion · New Reader</Text>
        <Text style={{ color: colors.white, fontFamily: typography.display, fontSize: 39, letterSpacing: -1.5, lineHeight: 43, marginTop: 24 }}>先拥有一把钥匙，再建立你的家庭书房。</Text>
        <Text style={{ color: 'rgba(255,255,255,.62)', fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginTop: 20 }}>账号只用于登录；家庭可以在进入云阁后创建或加入。</Text>
      </View>
      <View style={{ paddingTop: spacing.xxl }}>
        <Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 30, letterSpacing: -1 }}>创建账号</Text>
        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <TextInput autoCapitalize="none" autoComplete="username-new" onChangeText={setUsername} placeholder="用户名" placeholderTextColor={colors.muted} style={inputStyle} value={username} />
          <TextInput autoCapitalize="none" autoComplete="password-new" onChangeText={setPassword} placeholder="密码（至少 8 位，避免常见密码）" placeholderTextColor={colors.muted} secureTextEntry style={inputStyle} value={password} />
          <TextInput autoCapitalize="none" autoComplete="password-new" onChangeText={setPasswordConfirm} placeholder="再次输入密码" placeholderTextColor={colors.muted} secureTextEntry style={inputStyle} value={passwordConfirm} />
          {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontFamily: typography.body, fontSize: 13 }}>{error}</Text> : null}
          <ActionButton disabled={pending} onPress={() => void submit()}>{pending ? '正在创建…' : '创建账号  →'}</ActionButton>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 12 }}>已经有账号？返回登录</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
}
