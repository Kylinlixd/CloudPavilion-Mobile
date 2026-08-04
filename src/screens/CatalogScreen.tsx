import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { AppHeader } from '../components/AppHeader'
import { BookCover } from '../components/BookCover'
import { EmptyState } from '../components/EmptyState'
import { LoadingState } from '../components/LoadingState'
import { useFamily } from '../context/FamilyContext'
import { apiClient } from '../lib/api'
import type { Book } from '../lib/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

function asList<T>(value: T[] | { results: T[] }) { return Array.isArray(value) ? value : value.results }

export function CatalogScreen() {
  const navigation = useNavigation<any>()
  const { familyId } = useFamily()
  const [books, setBooks] = useState<Book[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => { if (!familyId) { setLoading(false); return } const value = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''; setBooks(asList(await apiClient.get<Book[] | { results: Book[] }>(`/books/${value}`))) }, [familyId, query])
  useEffect(() => { const timer = setTimeout(() => { void load().catch(() => setError('藏书暂时无法加载。')).finally(() => setLoading(false)) }, 220); return () => clearTimeout(timer) }, [load])
  if (loading && !books.length) return <LoadingState label="正在翻找藏书" />
  return <View style={{ backgroundColor: colors.paper, flex: 1, padding: spacing.lg }}><AppHeader subtitle={`${books.length} 个书名`} title="藏书" /><TextInput accessibilityLabel="搜索藏书" onChangeText={setQuery} placeholder="搜索书名、作者或分类" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.paperBright, borderColor: colors.line, borderRadius: 10, borderWidth: 1, color: colors.ink, height: 50, marginBottom: spacing.lg, paddingHorizontal: 15 }} />{error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</Text> : null}<FlatList columnWrapperStyle={{ gap: spacing.md }} contentContainerStyle={{ gap: spacing.lg, paddingBottom: 120 }} data={books} keyExtractor={(item) => String(item.id)} numColumns={2} refreshControl={<RefreshControl colors={[colors.terracotta]} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)) }} refreshing={refreshing} />} renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('BookDetail', { bookId: item.id })} style={{ flex: 1 }}><BookCover category={item.category} seed={item.id} small title={item.title} /><Text numberOfLines={2} style={{ color: colors.ink, fontFamily: typography.body, fontSize: 14, marginTop: 9 }}>{item.title}</Text><Text numberOfLines={1} style={{ color: colors.muted, fontFamily: typography.body, fontSize: 11, marginTop: 3 }}>{item.author || '作者未录入'}</Text></TouchableOpacity>} ListEmptyComponent={<EmptyState title="书架还是空的" copy="先在 Web 端添加第一本书。" />} /> </View>
}
