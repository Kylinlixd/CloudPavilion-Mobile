import { useCallback, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { BookReadingPanel } from '../components/BookReadingPanel'
import { CheckoutSheet } from '../components/CheckoutSheet'
import { errorMessage } from '../lib/reading'
import { ActionButton } from '../components/ActionButton'
import { BookCover } from '../components/BookCover'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { StatusPill } from '../components/StatusPill'
import { useFamily } from '../context/FamilyContext'
import { apiClient } from '../lib/api'
import type { Book, BookCopy, Membership } from '../lib/types'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'
type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>
function asList<T>(value: T[] | { results: T[] }) { return Array.isArray(value) ? value : value.results }
export function BookDetailScreen({ route, navigation }: Props) {
  const { familyId } = useFamily(); const [book, setBook] = useState<Book | null>(null); const [copies, setCopies] = useState<BookCopy[]>([]); const [members, setMembers] = useState<Membership[]>([]); const [checkoutCopy, setCheckoutCopy] = useState<number | null>(null); const [error, setError] = useState(''); const [pending, setPending] = useState(false)
  useFocusEffect(useCallback(() => { if (!familyId) return; Promise.all([apiClient.get<Book>(`/books/${route.params.bookId}/`), apiClient.get<BookCopy[] | { results: BookCopy[] }>(`/book-copies/?book=${route.params.bookId}`), apiClient.get<Membership[] | { results: Membership[] }>('/memberships/')]).then(([b, c, m]) => { setBook(b); setCopies(asList(c).filter((x) => x.book === route.params.bookId)); setMembers(asList(m)) }).catch(() => setError('这本书暂时无法打开。')) }, [familyId, route.params.bookId]))
  async function reserve(copyId: number) { setPending(true); try { await apiClient.post('/reservations/', { copy_id: copyId }); setError('已加入预约队列。') } catch (e) { setError(errorMessage(e)) } finally { setPending(false) } }
  async function checkout(copyId: number, borrowerId: number, dueAt: string) { setPending(true); try { await apiClient.post('/loans/checkout/', { copy_id: copyId, borrower_id: borrowerId, due_at: dueAt }); setCopies((current) => current.map((copy) => copy.id === copyId ? { ...copy, status: 'borrowed' } : copy)); setCheckoutCopy(null); setError('借阅成功，可到借阅页续借或归还。') } catch (e) { setError(errorMessage(e)) } finally { setPending(false) } }
  if (!book) return error ? <ErrorState message={error} /> : <LoadingState label="正在翻开这本书" />
  return <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} style={{ backgroundColor: colors.paper }}><ActionButton quiet onPress={() => navigation.goBack()}>← 返回藏书</ActionButton><BookCover category={book.category} coverUrl={book.cover_url || book.cover} seed={book.id} title={book.title} /><Text style={{ color: colors.terracotta, fontFamily: typography.mono, fontSize: 10, marginTop: spacing.xl }}>{book.category || '家庭藏书'}</Text><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 40, marginTop: 13 }}>{book.title}</Text><Text style={{ color: colors.terracotta, marginTop: 12 }}>{book.author || '作者未录入'}</Text><Text style={{ color: colors.muted, lineHeight: 22, marginTop: 22 }}>{book.description || '这本书还没有留下介绍，先从书名开始认识它。'}</Text><View style={{ borderTopColor: colors.line, borderTopWidth: 1, marginTop: spacing.xl, paddingTop: spacing.lg }}><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 26 }}>实体副本</Text>{error ? <Text accessibilityRole="alert" style={{ color: colors.terracotta, marginTop: 12 }}>{error}</Text> : null}{copies.map((copy) => <View key={copy.id} style={{ alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.lg }}><View style={{ flex: 1 }}><Text style={{ color: colors.ink }}>{copy.barcode || `副本 ${copy.id}`}</Text><Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>{copy.notes || '没有备注'}</Text></View><StatusPill status={copy.status} />{copy.status === 'available' ? <ActionButton disabled={pending} loading={pending} onPress={() => setCheckoutCopy(copy.id)}>借出</ActionButton> : copy.status === 'borrowed' ? <ActionButton disabled={pending} loading={pending} onPress={() => void reserve(copy.id)} quiet>预约</ActionButton> : null}</View>)}</View><BookReadingPanel bookId={book.id} title={book.title} /><CheckoutSheet busy={pending} members={members} onClose={() => setCheckoutCopy(null)} onSubmit={(borrowerId, dueAt) => checkoutCopy && void checkout(checkoutCopy, borrowerId, dueAt)} visible={checkoutCopy !== null} /></ScrollView>
}
