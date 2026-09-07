import { useEffect, useRef, useState } from 'react'
import { Image, ScrollView, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ActionButton } from '../components/ActionButton'
import { apiClient } from '../lib/api'
import { errorMessage, type Ebook } from '../lib/reading'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme/colors'

type Page = { page: number; page_count: number; text: string; image: string }
export function ReaderScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Reader'>) {
  const [page, setPage] = useState<number | null>(null)
  const [data, setData] = useState<Page | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [retry, setRetry] = useState(0)
  const [fontSize, setFontSize] = useState(19)
  const scroll = useRef<ScrollView>(null)
  useEffect(() => { void apiClient.get<Ebook>(`/ebooks/${route.params.ebookId}/`).then((r) => setPage(r.progress)).catch((e) => { setError(errorMessage(e)); setBusy(false) }) }, [route.params.ebookId, retry])
  useEffect(() => {
    if (page === null) return
    let active = true
    setBusy(true); setError('')
    void apiClient.get<Page>(`/ebooks/${route.params.ebookId}/page/?page=${page}`).then(async (r) => {
      if (!active) return
      setData(r); scroll.current?.scrollTo({ y: 0, animated: false })
      await apiClient.patch(`/ebooks/${route.params.ebookId}/progress/`, { page }).catch(() => { if (active) setError('当前页已打开，阅读位置暂未同步。') })
    }).catch((e) => { if (active) setError(errorMessage(e)) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [page, route.params.ebookId, retry])
  return <View style={{ flex: 1, backgroundColor: colors.paper, padding: 20 }}>
    <ActionButton quiet onPress={() => navigation.goBack()}>← 返回书籍</ActionButton>
    <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 18, marginVertical: 12 }}>{route.params.title}</Text>
    {!!error && <Text onPress={() => setRetry((n) => n + 1)} style={{ color: colors.terracotta }}>{error} · 点此重试</Text>}
    {busy && <Text style={{ color: colors.muted }}>正在翻页……</Text>}
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16 }} maximumZoomScale={3} minimumZoomScale={1}>
      {data?.image ? <Image source={{ uri: data.image }} style={{ width: '100%', height: 650 }} resizeMode="contain" /> : <Text selectable style={{ color: colors.ink, fontSize, lineHeight: fontSize * 1.8 }}>{data?.text}</Text>}
    </ScrollView>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
      <ActionButton quiet onPress={() => setFontSize((s) => Math.max(14, s - 2))}>小字</ActionButton>
      <Text style={{ color: colors.muted, alignSelf: 'center' }}>{data ? `${data.page + 1} / ${data.page_count}` : ''}</Text>
      <ActionButton quiet onPress={() => setFontSize((s) => Math.min(32, s + 2))}>大字</ActionButton>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20 }}>
      <ActionButton disabled={busy || !data || data.page === 0} onPress={() => setPage(data!.page - 1)}>上一页</ActionButton>
      <ActionButton disabled={busy || !data || data.page + 1 >= data.page_count} onPress={() => setPage(data!.page + 1)}>下一页</ActionButton>
    </View>
  </View>
}
