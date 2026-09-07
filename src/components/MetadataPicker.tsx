import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ActionButton } from './ActionButton'
import { apiClient } from '../lib/api'
import type { BookLookup } from '../lib/books'
import { errorMessage, uploadFile } from '../lib/reading'
import { colors } from '../theme/colors'

export function MetadataPicker({ onChoose, onCameraOpening }: { onChoose: (book: BookLookup) => void; onCameraOpening: () => void }) {
  const [query, setQuery] = useState('')
  const [text, setText] = useState('')
  const [results, setResults] = useState<BookLookup[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function search() {
    if (busy || query.trim().length < 2) return
    setBusy(true); setMessage('正在联网查找书目信息……')
    try {
      const response = await apiClient.get<BookLookup[]>(`/book-metadata/search/?q=${encodeURIComponent(query.trim())}`)
      setResults(response); setMessage(response.length ? '选择对应版本，再确认书目信息。' : '未找到匹配版本，可换书名/作者搜索，或手动填写。')
    } catch (e) { setMessage(errorMessage(e)) } finally { setBusy(false) }
  }
  async function photograph() {
    if (busy) return
    try {
      onCameraOpening()
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) { setMessage('请在 iPhone 设置中允许云阁使用相机。'); return }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      if (result.canceled) return
      setBusy(true); setMessage('正在识别封面/版权页并查找书目……')
      const response = await uploadFile<{ text: string; query: string; candidates: BookLookup[] }>('/book-metadata/recognize/', 'image', result.assets[0])
      setText(response.text); setQuery(response.query); setResults(response.candidates)
      setMessage(response.candidates.length ? '已找到候选书目，请选择并核对。' : '已识别文字，可以调整下方关键词继续搜索，或使用识别的书名填写。')
    } catch (e) { setMessage(errorMessage(e)) } finally { setBusy(false) }
  }
  return <View style={{ gap: 12, paddingVertical: 16 }}>
    <ActionButton disabled={busy} onPress={() => void photograph()} quiet>拍封面 / 版权页识别</ActionButton>
    <TextInput placeholder="联网搜索书名、作者或 ISBN" value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} style={{ backgroundColor: colors.paperBright, borderRadius: 10, padding: 14, color: colors.ink }} />
    <ActionButton disabled={busy || query.trim().length < 2} onPress={() => void search()} quiet>{busy ? '识别查找中……' : '联网搜索书目信息'}</ActionButton>
    {!!message && <Text style={{ color: colors.terracotta, lineHeight: 22 }}>{message}</Text>}
    {!!text && <><Text selectable numberOfLines={8} style={{ color: colors.muted, lineHeight: 22 }}>{text}</Text><ActionButton quiet disabled={busy || !query.trim()} onPress={() => onChoose({ title: query.trim(), author: '', isbn: '', publisher: '', publish_date: '', category: '', description: '', cover_url: '', source: 'local' })}>用识别书名填写，再手动补充</ActionButton></>}
    {results.map((book, index) => <ActionButton key={`${book.isbn}-${index}`} quiet onPress={() => onChoose(book)}>{book.title} · {book.author || '作者未提供'}{book.publisher ? ` · ${book.publisher}` : ''}</ActionButton>)}
  </View>
}
