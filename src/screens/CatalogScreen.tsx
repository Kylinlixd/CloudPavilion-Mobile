import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'

import { ImportEbookButton } from '../components/ImportEbookButton'
import { ActionButton } from '../components/ActionButton'
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
  const { width } = useWindowDimensions()
  const [books, setBooks] = useState<Book[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [ordering, setOrdering] = useState('-created_at')
  const load = useCallback(async () => { if (!familyId) { setLoading(false); return } const params = new URLSearchParams(); if (query.trim()) params.set('search', query.trim()); if (ordering) params.set('ordering', ordering); const value = params.toString() ? `?${params.toString()}` : ''; setBooks(asList(await apiClient.get<Book[] | { results: Book[] }>(`/books/${value}`))) }, [familyId, ordering, query])
  useFocusEffect(useCallback(() => { const timer = setTimeout(() => { setError(''); void load().catch(() => setError('藏书暂时无法加载。')).finally(() => setLoading(false)) }, 220); return () => clearTimeout(timer) }, [load]))
  if (loading && !books.length) return <LoadingState label="正在翻找藏书" />
  const gap = spacing.sm
  const itemWidth = Math.max(44, (width - spacing.lg * 2 - gap * 5) / 6)
  return <View style={{ backgroundColor: colors.paper, flex: 1, padding: spacing.lg }}><AppHeader subtitle={`${books.length} 个书名`} title="藏书" /><View style={{ marginBottom: spacing.md }}><ActionButton onPress={() => navigation.navigate('AddBook')}>扫描或手动添加书籍</ActionButton><ImportEbookButton /></View><TextInput accessibilityLabel="搜索藏书" onChangeText={setQuery} placeholder="搜索书名、作者或分类" placeholderTextColor={colors.muted} style={{ backgroundColor: colors.paperBright, borderColor: colors.line, borderRadius: 10, borderWidth: 1, color: colors.ink, height: 50, marginBottom: spacing.sm, paddingHorizontal: 15 }} /><View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}><Text style={{ color: colors.muted, fontFamily: typography.mono, fontSize: 10, paddingVertical: 10 }}>排序</Text>{[['-created_at', '最近添加'], ['title', '书名'], ['category', '分类'], ['-updated_at', '最近更新']].map(([value, label]) => <TouchableOpacity key={value} onPress={() => setOrdering(value)} style={{ backgroundColor: ordering === value ? colors.ink : colors.paperBright, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8 }}><Text style={{ color: ordering === value ? colors.white : colors.muted, fontFamily: typography.body, fontSize: 10 }}>{label}</Text></TouchableOpacity>)}</View>{error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</Text> : null}<FlatList columnWrapperStyle={{ gap }} contentContainerStyle={{ gap: spacing.md, paddingBottom: 120 }} data={books} getItemLayout={(_, index) => ({ index, length: itemWidth * 1.55 + spacing.lg, offset: (itemWidth * 1.55 + spacing.lg) * Math.floor(index / 6), })} initialNumToRender={24} keyExtractor={(item) => String(item.id)} maxToRenderPerBatch={30} numColumns={6} refreshControl={<RefreshControl colors={[colors.terracotta]} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)) }} refreshing={refreshing} />} removeClippedSubviews renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('BookDetail', { bookId: item.id })} style={{ width: itemWidth }}><BookCover category={item.category} coverUrl={item.cover_url || item.cover} seed={item.id} small title={item.title} /><Text numberOfLines={2} style={{ color: colors.ink, fontFamily: typography.body, fontSize: 10, lineHeight: 13, marginTop: 5 }}>{item.title}</Text></TouchableOpacity>} ListEmptyComponent={<EmptyState title="书架还是空的" copy="扫描 ISBN 或手动录入第一本书。" />} windowSize={7} /> </View>
}
