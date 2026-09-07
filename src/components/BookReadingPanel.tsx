import { useCallback, useState } from 'react'
import { Image, Share, Text, TextInput, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { ActionButton } from './ActionButton'
import { apiClient } from '../lib/api'
import { errorMessage, uploadFile, type Ebook, type Excerpt } from '../lib/reading'
import { colors } from '../theme/colors'

function ExcerptImage({ id }: { id: number }) {
  const [uri, setUri] = useState('')
  const [error, setError] = useState(false)
  useFocusEffect(useCallback(() => {
    let active = true
    void apiClient.get<{ data_uri: string }>(`/excerpts/${id}/image/?inline=1`).then((r) => { if (active) setUri(r.data_uri) }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [id]))
  return uri ? <Image source={{ uri }} resizeMode="contain" style={{ height: 260, width: '100%', marginTop: 12 }} /> : <Text>{error ? '图片暂时无法加载' : '图片加载中'}</Text>
}

export function BookReadingPanel({ bookId, title }: { bookId: number; title: string }) {
  const navigation = useNavigation<any>()
  const [excerpts, setExcerpts] = useState<Excerpt[]>([])
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [content, setContent] = useState('')
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([apiClient.get<Excerpt[]>(`/excerpts/?book=${bookId}`), apiClient.get<Ebook[]>(`/ebooks/?book=${bookId}`)])
    setExcerpts(a); setEbooks(b)
  }, [bookId])
  useFocusEffect(useCallback(() => { void load().catch((e) => setMessage(errorMessage(e))) }, [load]))
  async function pickPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
      if (!result.canceled) setPhoto(result.assets[0])
    } catch (e) { setMessage(errorMessage(e)) }
  }
  async function publish() {
    if (busy || (!content.trim() && !photo)) return
    setBusy(true); setMessage('')
    try {
      if (photo) await uploadFile('/excerpts/', 'image', photo, bookId, content)
      else await apiClient.post('/excerpts/', { book: bookId, content })
      setContent(''); setPhoto(null); await load(); setMessage('已分享到家庭书房。')
    } catch (e) { setMessage(errorMessage(e)) } finally { setBusy(false) }
  }
  async function importBook() {
    if (busy) return
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/epub+zip', 'application/pdf', 'text/plain'], copyToCacheDirectory: true })
      if (result.canceled) return
      setBusy(true); setMessage('正在导入电子书……')
      await uploadFile<Ebook>('/ebooks/', 'file', result.assets[0], bookId)
      await load(); setMessage('导入成功，点击电子书即可阅读。')
    } catch (e) { setMessage(errorMessage(e)) } finally { setBusy(false) }
  }
  return <View style={{ marginTop: 28, gap: 16 }}>
    <Text style={{ color: colors.ink, fontSize: 26 }}>电子书</Text>
    {ebooks.map((item) => <ActionButton key={item.id} onPress={() => navigation.navigate('Reader', { ebookId: item.id, title: item.name })} quiet>{item.name} · 继续阅读 →</ActionButton>)}
    <ActionButton disabled={busy} onPress={() => void importBook()} quiet>导入 EPUB / PDF / TXT</ActionButton>
    <Text style={{ color: colors.ink, fontSize: 26, marginTop: 12 }}>书摘分享</Text>
    <Text style={{ color: colors.muted }}>把喜欢的文字或图片留给家人。</Text>
    <TextInput value={content} onChangeText={setContent} multiline maxLength={8000} placeholder="摘录一句，或写下阅读感受……" style={{ minHeight: 110, backgroundColor: colors.paperBright, padding: 16, borderRadius: 12, color: colors.ink, textAlignVertical: 'top' }} />
    {photo && <Image source={{ uri: photo.uri }} style={{ height: 180, width: '100%' }} resizeMode="contain" />}
    <ActionButton disabled={busy} onPress={() => void pickPhoto()} quiet>{photo ? '更换书摘图片' : '选择书摘图片'}</ActionButton>
    {photo && <ActionButton onPress={() => setPhoto(null)} quiet>移除图片</ActionButton>}
    <ActionButton disabled={busy || (!content.trim() && !photo)} onPress={() => void publish()}>{busy ? '处理中……' : '分享到家庭'}</ActionButton>
    {!!message && <Text accessibilityRole="alert" style={{ color: colors.terracotta }}>{message}</Text>}
    {excerpts.map((item) => <View key={item.id} style={{ backgroundColor: colors.paperBright, borderRadius: 12, padding: 18, gap: 10 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{item.username} · {new Date(item.created_at).toLocaleDateString('zh-CN')}</Text>
      {!!item.content && <Text selectable style={{ color: colors.ink, fontSize: 17, lineHeight: 28 }}>{item.content}</Text>}
      {item.has_image && <ExcerptImage id={item.id} />}
      {!!item.content && <ActionButton quiet onPress={() => { void Share.share({ message: `${item.content}\n——《${title}》 · 云阁书摘` }).catch((e) => setMessage(errorMessage(e))) }}>分享文字到其他应用</ActionButton>}
    </View>)}
    {!excerpts.length && <Text style={{ color: colors.muted }}>还没有书摘，写下第一条吧。</Text>}
  </View>
}
