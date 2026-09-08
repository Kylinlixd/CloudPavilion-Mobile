import { useCallback, useState } from 'react'
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { ActionButton } from '../components/ActionButton'
import { AppHeader } from '../components/AppHeader'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { StatusPill } from '../components/StatusPill'
import { useFamily } from '../context/FamilyContext'
import { apiClient } from '../lib/api'
import type { Loan, Reservation } from '../lib/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

function asList<T>(value: T[] | { results: T[] }) { return Array.isArray(value) ? value : value.results }
type Filter = 'active' | 'ended' | 'reservations'

export function LoansScreen() {
  const navigation = useNavigation<any>(); const { familyId } = useFamily()
  const [loans, setLoans] = useState<Loan[]>([]); const [reservations, setReservations] = useState<Reservation[]>([])
  const [filter, setFilter] = useState<Filter>('active'); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState(''); const [pending, setPending] = useState<number | null>(null)
  const load = useCallback(async () => { if (!familyId) return; const [a, b] = await Promise.all([apiClient.get<Loan[] | { results: Loan[] }>('/loans/'), apiClient.get<Reservation[] | { results: Reservation[] }>('/reservations/')]); setLoans(asList(a)); setReservations(asList(b)) }, [familyId])
  useFocusEffect(useCallback(() => { void load().catch(() => setError('借阅记录暂时无法加载。')).finally(() => setLoading(false)) }, [load]))
  async function action(id: number, type: 'return' | 'renew') { setPending(id); setError(''); try { await apiClient.post(`/loans/${id}/${type}/`); await load() } catch { setError(type === 'return' ? '归还没有完成。' : '续借没有完成。') } finally { setPending(null) } }
  async function cancelReservation(id: number) { setPending(id); try { await apiClient.post(`/reservations/${id}/cancel/`); await load() } catch { setError('预约取消没有完成。') } finally { setPending(null) } }
  if (loading) return <LoadingState label="正在整理借阅" />
  const data = filter === 'active' ? loans.filter((x) => x.is_active) : filter === 'ended' ? loans.filter((x) => !x.is_active) : reservations.filter((x) => x.status === 'pending')
  return <View style={{ backgroundColor: colors.paper, flex: 1, padding: spacing.lg }}><AppHeader subtitle={`${loans.filter((x) => x.is_active).length} 本书正在流动`} title="借阅" /><View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg }}>{([['active', '借阅中'], ['ended', '已结束'], ['reservations', '我的预约']] as [Filter, string][]).map(([key, label]) => <TouchableOpacity key={key} onPress={() => setFilter(key)} style={{ backgroundColor: filter === key ? colors.ink : colors.paperBright, borderColor: colors.line, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9 }}><Text style={{ color: filter === key ? colors.white : colors.ink, fontFamily: typography.body, fontSize: 13 }}>{label}</Text></TouchableOpacity>)}</View>{error ? <ErrorState message={error} onRetry={() => { setError(''); void load() }} /> : <FlatList<any> contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }} data={data as any[]} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl colors={[colors.terracotta]} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)) }} refreshing={refreshing} />} renderItem={({ item }) => filter === 'reservations' ? <View style={{ backgroundColor: colors.paperBright, borderRadius: 14, padding: spacing.lg }}><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 20 }}>{item.book_title || `副本 ${item.copy}`}</Text><Text style={{ color: colors.muted, marginTop: 8 }}>预约队列第 {item.queue_position || 1} 位 · 等待中</Text><ActionButton disabled={pending === item.id} loading={pending === item.id} onPress={() => void cancelReservation(item.id)} quiet>取消预约</ActionButton></View> : <View style={{ backgroundColor: colors.paperBright, borderRadius: 14, borderLeftColor: item.is_active ? colors.terracotta : colors.line, borderLeftWidth: 3, padding: spacing.lg }}><View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.ink, flex: 1, fontFamily: typography.display, fontSize: 20, marginRight: 10 }}>{item.book_title}</Text><StatusPill status={item.is_active ? (new Date(item.due_at) < new Date() ? 'overdue' : 'borrowed') : 'returned'} /></View><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 12, marginTop: 10 }}>{item.borrower_name} · {item.is_active ? `应还 ${new Date(item.due_at).toLocaleDateString('zh-CN')} · 已续借 ${item.renewed_count} 次` : '借阅结束'}</Text>{item.is_active && <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}><ActionButton disabled={pending === item.id} loading={pending === item.id} onPress={() => void action(item.id, 'renew')} quiet>续借</ActionButton><ActionButton disabled={pending === item.id} loading={pending === item.id} onPress={() => void action(item.id, 'return')}>归还</ActionButton></View>}</View>} ListEmptyComponent={<View><EmptyState title={filter === 'reservations' ? '还没有预约' : filter === 'active' ? '还没有借阅' : '还没有结束的借阅'} copy="去藏书里选择书籍，在详情页借阅实体副本。" /><ActionButton onPress={() => navigation.navigate('Catalog')}>挑一本书</ActionButton></View>} />}</View>
}
