import { useMemo, useState } from 'react'
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { ActionButton } from '../components/ActionButton'
import { useFamily } from '../context/FamilyContext'
import { ApiError } from '../lib/api'
import {
  addBookToFamily,
  createSubmissionGuard,
  lookupBookByIsbn,
  normalizeScannedIsbn,
  type BookDraft,
} from '../lib/books'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'


type Props = NativeStackScreenProps<RootStackParamList, 'AddBook'>
type Mode = 'scan' | 'manual'

const EMPTY_DRAFT: BookDraft = {
  title: '',
  author: '',
  isbn: '',
  publisher: '',
  publish_date: '',
  category: '',
  description: '',
  cover_url: '',
  barcode: '',
  notes: '',
}

function firstError(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
    if (typeof value === 'string') return value
  }
  return null
}

function FormField({ label, value, onChangeText, multiline = false, placeholder }: {
  label: string
  value: string
  onChangeText: (value: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  return <View style={{ gap: 7 }}>
    <Text style={{ color: colors.muted, fontFamily: typography.mono, fontSize: 10, letterSpacing: .7 }}>{label}</Text>
    <TextInput
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      style={{
        backgroundColor: colors.paperBright,
        borderColor: colors.line,
        borderRadius: 10,
        borderWidth: 1,
        color: colors.ink,
        minHeight: multiline ? 100 : 50,
        paddingHorizontal: 14,
        paddingVertical: multiline ? 12 : 0,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
      value={value}
    />
  </View>
}

export function AddBookScreen({ navigation }: Props) {
  const { familyId } = useFamily()
  const [permission, requestPermission] = useCameraPermissions()
  const [mode, setMode] = useState<Mode>('scan')
  const [draft, setDraft] = useState<BookDraft>(EMPTY_DRAFT)
  const [scanning, setScanning] = useState(true)
  const [lookupPending, setLookupPending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  function update(field: keyof BookDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function handleScan(result: BarcodeScanningResult) {
    if (!scanning || lookupPending) return
    setScanning(false)
    setMessage('')
    const isbn = normalizeScannedIsbn(result.data)
    if (!isbn) {
      setMessage('这不是有效的 ISBN-13 条码，请对准书背面的 978 或 979 条码。')
      setScanning(true)
      return
    }
    setDraft((current) => ({ ...current, isbn }))
    setLookupPending(true)
    try {
      const { source, ...metadata } = await lookupBookByIsbn(isbn)
      setDraft((current) => ({ ...current, ...metadata, isbn }))
      setMessage(source === 'local' ? '已找到云阁中的书目，可直接新增副本。' : '已自动补全书目信息，请确认后保存。')
      setMode('manual')
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setMessage('没有查到这本书，ISBN 已保留，请手动补充书名。')
      } else if (caught instanceof ApiError && caught.status === 503) {
        setMessage('自动补全服务暂时不可用，ISBN 已保留，可以继续手动添加。')
      } else {
        setMessage(caught instanceof Error ? caught.message : '自动补全没有完成，请手动填写。')
      }
      setMode('manual')
    } finally {
      setLookupPending(false)
    }
  }

  const guardedSave = useMemo(() => createSubmissionGuard(async () => {
    if (!draft.title.trim()) {
      setMessage('请先填写书名。')
      return
    }
    setMessage('')
    setSubmitting(true)
    try {
      const result = await addBookToFamily(draft)
      navigation.replace('BookDetail', { bookId: result.book.id })
    } catch (caught) {
      if (caught instanceof ApiError) {
        setMessage(firstError(caught.payload) || caught.message)
      } else {
        setMessage('书籍没有保存，请检查网络后重试。')
      }
    } finally {
      setSubmitting(false)
    }
  }), [draft, navigation])

  if (!familyId) {
    return <View style={{ backgroundColor: colors.paper, flex: 1, justifyContent: 'center', padding: spacing.xl }}>
      <Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 32 }}>先选择一个家庭。</Text>
      <Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginTop: 12 }}>书籍需要放进一个家庭书房，设置完成后再回来添加。</Text>
      <View style={{ marginTop: spacing.xl }}><ActionButton onPress={() => navigation.navigate('Settings')}>打开设置</ActionButton></View>
    </View>
  }

  return <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled" style={{ backgroundColor: colors.paper }}>
    <TouchableOpacity accessibilityRole="button" onPress={() => navigation.goBack()}>
      <Text style={{ color: colors.terracotta, fontFamily: typography.body, fontSize: 14 }}>← 返回藏书</Text>
    </TouchableOpacity>
    <Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 36, letterSpacing: -1.2, marginTop: spacing.lg }}>添加一本书</Text>
    <Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 20, marginTop: 8 }}>扫描 ISBN 自动补全，或者直接手动录入。</Text>

    <View style={{ backgroundColor: colors.paperBright, borderRadius: 12, flexDirection: 'row', gap: 6, marginTop: spacing.xl, padding: 5 }}>
      {(['scan', 'manual'] as const).map((value) => <TouchableOpacity key={value} onPress={() => { setMode(value); setMessage(''); if (value === 'scan') setScanning(true) }} style={{ alignItems: 'center', backgroundColor: mode === value ? colors.ink : 'transparent', borderRadius: 9, flex: 1, paddingVertical: 12 }}>
        <Text style={{ color: mode === value ? colors.white : colors.muted, fontFamily: typography.body, fontSize: 13 }}>{value === 'scan' ? '扫码添加' : '手动添加'}</Text>
      </TouchableOpacity>)}
    </View>

    {message ? <Text accessibilityRole="alert" style={{ backgroundColor: '#F2E8D9', borderRadius: 10, color: colors.ink, fontFamily: typography.body, fontSize: 13, lineHeight: 20, marginTop: spacing.md, padding: spacing.md }}>{message}</Text> : null}

    {mode === 'scan' ? <View style={{ marginTop: spacing.lg }}>
      {!permission ? <Text style={{ color: colors.muted }}>正在读取摄像头权限…</Text> : !permission.granted ? <View style={{ backgroundColor: colors.paperBright, borderRadius: 14, gap: spacing.md, padding: spacing.xl }}>
        <Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 25 }}>允许使用摄像头</Text>
        <Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 20 }}>云阁只用摄像头读取书背面的 ISBN 条码，不会保存照片。</Text>
        {permission.canAskAgain ? <ActionButton onPress={() => void requestPermission()}>允许摄像头</ActionButton> : <Text style={{ color: colors.danger, fontFamily: typography.body, fontSize: 13 }}>请在 iPhone 设置中为云阁开启摄像头权限，或改用手动添加。</Text>}
        <ActionButton onPress={() => setMode('manual')} quiet>改用手动添加</ActionButton>
      </View> : <>
        <View style={{ borderRadius: 18, height: 360, overflow: 'hidden' }}>
          <CameraView barcodeScannerSettings={{ barcodeTypes: ['ean13'] }} onBarcodeScanned={scanning ? (result) => void handleScan(result) : undefined} style={{ flex: 1 }} />
          <View pointerEvents="none" style={{ borderColor: colors.terracottaLight, borderRadius: 12, borderWidth: 2, bottom: 105, left: 28, position: 'absolute', right: 28, top: 105 }} />
        </View>
        <Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: spacing.md, textAlign: 'center' }}>{lookupPending ? '正在查询书目信息…' : '把书背面的 978 / 979 条码放入框内'}</Text>
        {!scanning && !lookupPending ? <View style={{ marginTop: spacing.md }}><ActionButton onPress={() => { setMessage(''); setScanning(true) }} quiet>重新扫描</ActionButton></View> : null}
      </>}
    </View> : <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
      {draft.cover_url ? <Image accessibilityLabel="查询到的书籍封面" resizeMode="contain" source={{ uri: draft.cover_url }} style={{ alignSelf: 'center', backgroundColor: colors.paperBright, borderRadius: 12, height: 210, width: 150 }} /> : null}
      <FormField label="书名 *" onChangeText={(value) => update('title', value)} placeholder="请输入书名" value={draft.title} />
      <FormField label="作者" onChangeText={(value) => update('author', value)} placeholder="作者姓名" value={draft.author} />
      <FormField label="ISBN" onChangeText={(value) => update('isbn', value)} placeholder="10 位或 13 位 ISBN（可不填）" value={draft.isbn} />
      <FormField label="出版社" onChangeText={(value) => update('publisher', value)} value={draft.publisher} />
      <FormField label="出版日期" onChangeText={(value) => update('publish_date', value)} placeholder="YYYY-MM-DD" value={draft.publish_date} />
      <FormField label="分类" onChangeText={(value) => update('category', value)} placeholder="例如：小说、历史、绘本" value={draft.category} />
      <FormField label="简介" multiline onChangeText={(value) => update('description', value)} value={draft.description} />
      <FormField label="副本条码" onChangeText={(value) => update('barcode', value)} placeholder="家庭自定义编号（可不填）" value={draft.barcode} />
      <FormField label="副本备注" multiline onChangeText={(value) => update('notes', value)} placeholder="例如：客厅书架第二层" value={draft.notes} />
      <View style={{ marginTop: spacing.sm }}><ActionButton disabled={submitting} onPress={() => void guardedSave()}>保存到家庭书房</ActionButton></View>
      <ActionButton onPress={() => { setMode('scan'); setMessage(''); setScanning(true) }} quiet>返回扫码</ActionButton>
    </View>}
  </ScrollView>
}
