import { useState } from 'react'
import { Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import { ActionButton } from './ActionButton'
import { errorMessage, uploadFile, type Ebook } from '../lib/reading'
import { colors } from '../theme/colors'

export function ImportEbookButton() {
  const navigation = useNavigation<any>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function pick() {
    if (busy) return
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/epub+zip', 'application/pdf', 'text/plain'], copyToCacheDirectory: true })
      if (result.canceled) return
      setBusy(true); setError('')
      const book = await uploadFile<Ebook>('/ebooks/', 'file', result.assets[0])
      navigation.navigate('BookDetail', { bookId: book.book })
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <View style={{ marginTop: 10 }}><ActionButton disabled={busy} onPress={() => void pick()} quiet>{busy ? '正在导入电子书……' : '导入电子书 · EPUB / PDF / TXT'}</ActionButton>{!!error && <Text style={{ color: colors.terracotta }}>{error}</Text>}</View>
}
