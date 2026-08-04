import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import { ActionButton } from '../components/ActionButton'
import { BookCover } from '../components/BookCover'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { StatusPill } from '../components/StatusPill'
import { useFamily } from '../context/FamilyContext'
import { apiClient } from '../lib/api'
import type { Book, BookCopy } from '../lib/types'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>
function asList<T>(value: T[] | { results: T[] }) { return Array.isArray(value) ? value : value.results }

export function BookDetailScreen({ route }: Props) {
  const { familyId } = useFamily()
  const [book, setBook] = useState<Book | null>(null)
  const [copies, setCopies] = useState<BookCopy[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  useEffect(() => { if (!familyId) return; Promise.all([apiClient.get<Book>(`/books/${route.params.bookId}/`), apiClient.get<BookCopy[] | { results: BookCopy[] }>(`/book-copies/?search=${route.params.bookId}`)]).then(([nextBook, nextCopies]) => { setBook(nextBook); setCopies(asList(nextCopies).filter((copy) => copy.book === route.params.bookId)) }).catch(() => setError('这本书暂时无法打开。')) }, [familyId, route.params.bookId])
  async function reserve(copyId: number) { setPending(true); try { await apiClient.post('/reservations/', { copy_id: copyId }); setError('已加入预约队列。') } catch { setError('预约没有完成。') } finally { setPending(false) } }
  async function checkout(copyId: number) { setPending(true); try { await apiClient.post('/loans/checkout/', { copy_id: copyId }); setCopies((current) => current.map((copy) => copy.id === copyId ? { ...copy, status: 'borrowed' } : copy)) } catch { setError('这本书现在无法借出。') } finally { setPending(false) } }
  if (!book) return error ? <ErrorState message={error} /> : <LoadingState label="正在翻开这本书" />
  return <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} style={{ backgroundColor: colors.paper }}><BookCover category={book.category} seed={book.id} title={book.title} /><Text style={{ color: colors.terracotta, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1, marginTop: spacing.xl, textTransform: 'uppercase' }}>{book.category || '家庭藏书'}</Text><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 40, letterSpacing: -1.5, lineHeight: 43, marginTop: 13 }}>{book.title}</Text><Text style={{ color: colors.terracotta, fontFamily: typography.body, fontSize: 16, marginTop: 12 }}>{book.author || '作者未录入'}</Text><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 14, lineHeight: 22, marginTop: 22 }}>{book.description || '这本书还没有留下介绍，先从书名开始认识它。'}</Text><View style={{ borderTopColor: colors.line, borderTopWidth: 1, marginTop: spacing.xl, paddingTop: spacing.lg }}><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 26 }}>实体副本</Text>{copies.map((copy) => <View key={copy.id} style={{ alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.lg }}><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontFamily: typography.body, fontSize: 14 }}>{copy.barcode || `副本 ${copy.id}`}</Text><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 11, marginTop: 4 }}>{copy.notes || '没有备注'}</Text></View><StatusPill status={copy.status} />{copy.status === 'available' ? <ActionButton disabled={pending} onPress={() => void checkout(copy.id)}>借出</ActionButton> : copy.status === 'borrowed' ? <ActionButton disabled={pending} onPress={() => void reserve(copy.id)} quiet>预约</ActionButton> : null}</View>)}</View></ScrollView>
}
