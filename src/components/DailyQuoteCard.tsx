import { useCallback, useEffect, useState } from 'react'
import { AppState, Linking, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { apiClient } from '../lib/api'
import type { Quote } from '../lib/reading'
import { colors } from '../theme/colors'

export function DailyQuoteCard() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(() => { void apiClient.get<Quote>('/daily-quote/').then((q) => { setQuote(q); setError('') }).catch(() => setError('今日书摘暂时无法加载，点此重试')) }, [])
  useFocusEffect(load)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (s) => { if (s === 'active') load() })
    const timer = setInterval(load, 60_000)
    return () => { subscription.remove(); clearInterval(timer) }
  }, [load])
  return <View style={{ backgroundColor: colors.ink, borderRadius: 22, padding: 28, minHeight: 250 }}>
    <Text style={{ color: colors.terracottaLight, fontSize: 12 }}>今天从这里开始 · {quote?.date || '每日一读'}</Text>
    <Text selectable style={{ color: colors.white, fontSize: 27, lineHeight: 40, marginTop: 30 }}>{quote?.content || '正在寻找今天的书中一句……'}</Text>
    {quote && <TouchableOpacity onPress={() => { void Linking.openURL(quote.source_url).catch(() => setError('出处链接暂时无法打开')) }} style={{ marginTop: 24 }}>
      <Text style={{ color: colors.terracottaLight, fontSize: 14, lineHeight: 22 }}>— {quote.author}《{quote.book_title}》 ↗</Text>
      <Text style={{ color: '#BDC8C1', fontSize: 10, marginTop: 6 }}>{quote.source_note}</Text>
    </TouchableOpacity>}
    {!!error && <Text onPress={load} style={{ color: colors.terracottaLight, marginTop: 12 }}>{error}</Text>}
  </View>
}
