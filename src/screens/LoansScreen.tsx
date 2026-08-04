import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text, View } from 'react-native'

import { ActionButton } from '../components/ActionButton'
import { AppHeader } from '../components/AppHeader'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { StatusPill } from '../components/StatusPill'
import { useFamily } from '../context/FamilyContext'
import { apiClient } from '../lib/api'
import type { Loan } from '../lib/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

function asList<T>(value: T[] | { results: T[] }) { return Array.isArray(value) ? value : value.results }

export function LoansScreen() {
  const { familyId } = useFamily()
  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<number | null>(null)
  const load = useCallback(async () => { if (!familyId) return; setLoans(asList(await apiClient.get<Loan[] | { results: Loan[] }>('/loans/'))) }, [familyId])
  useEffect(() => { void load().catch(() => setError('借阅记录暂时无法加载。')).finally(() => setLoading(false)) }, [load])
  async function action(id: number, type: 'return' | 'renew') { setPending(id); try { await apiClient.post(`/loans/${id}/${type}/`); await load() } catch { setError(type === 'return' ? '归还没有完成。' : '续借没有完成。') } finally { setPending(null) } }
  if (loading) return <LoadingState label="正在整理借阅" />
  return <View style={{ backgroundColor: colors.paper, flex: 1, padding: spacing.lg }}><AppHeader subtitle={`${loans.filter((loan) => loan.is_active).length} 本书正在流动`} title="借阅" />{error ? <ErrorState message={error} onRetry={() => { setError(''); void load() }} /> : <FlatList contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }} data={loans} keyExtractor={(item) => String(item.id)} refreshControl={<RefreshControl colors={[colors.terracotta]} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)) }} refreshing={refreshing} />} renderItem={({ item }) => <View style={{ backgroundColor: colors.paperBright, borderRadius: 14, borderLeftColor: item.is_active ? colors.terracotta : colors.line, borderLeftWidth: 3, padding: spacing.lg }}><View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.ink, flex: 1, fontFamily: typography.display, fontSize: 20, marginRight: 10 }}>{item.book_title}</Text><StatusPill status={item.is_active ? 'borrowed' : 'returned'} /></View><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 12, marginTop: 10 }}>{item.borrower_name} · {item.is_active ? `应还 ${new Date(item.due_at).toLocaleDateString('zh-CN')}` : '借阅结束'}</Text>{item.is_active && <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}><ActionButton disabled={pending === item.id} onPress={() => void action(item.id, 'renew')} quiet>续借</ActionButton><ActionButton disabled={pending === item.id} onPress={() => void action(item.id, 'return')}>归还</ActionButton></View>}</View>} ListEmptyComponent={<EmptyState title="还没有借阅" copy="去藏书里带走第一本书。" />} />}</View>
}
