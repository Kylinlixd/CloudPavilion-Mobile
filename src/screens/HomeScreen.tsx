import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { AppHeader } from '../components/AppHeader'
import { BookRail } from '../components/BookRail'
import { ErrorState } from '../components/ErrorState'
import { LoadingState } from '../components/LoadingState'
import { MetricTile } from '../components/MetricTile'
import { ActionButton } from '../components/ActionButton'
import { useFamily } from '../context/FamilyContext'
import { apiClient } from '../lib/api'
import type { Dashboard, Loan, Recommendation } from '../lib/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export function HomeScreen() {
  const navigation = useNavigation<any>()
  const { familyId, family, refreshFamily } = useFamily()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => { if (!familyId) { setLoading(false); return } const [nextDashboard, nextRecommendations, loans] = await Promise.all([apiClient.get<Dashboard>('/reports/dashboard/'), apiClient.get<{ books: Recommendation[] }>('/reports/recommendations/'), apiClient.get<Loan[] | { results: Loan[] }>('/loans/')]); setDashboard(nextDashboard); setRecommendations(nextRecommendations.books); const list = Array.isArray(loans) ? loans : loans.results; setActiveLoan(list.find((item) => item.is_active) || null); await refreshFamily().catch(() => undefined) }, [familyId, refreshFamily])
  useEffect(() => { void load().catch(() => setError('工作台暂时无法加载。')).finally(() => setLoading(false)) }, [load])
  if (loading) return <LoadingState label="正在整理书房" />
  if (!familyId) return <View style={{ backgroundColor: colors.paper, flex: 1, justifyContent: 'center', padding: spacing.xl }}><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 32 }}>先选择一个家庭。</Text><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginTop: 12 }}>去设置里输入家庭 ID，云阁才能加载你们的藏书。</Text><ActionButton onPress={() => navigation.navigate('Settings')}>打开设置</ActionButton></View>
  return <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} refreshControl={<RefreshControl colors={[colors.terracotta]} onRefresh={() => { setRefreshing(true); void load().finally(() => setRefreshing(false)) }} refreshing={refreshing} />}><AppHeader onPress={() => navigation.navigate('Settings')} subtitle={family?.name || `家庭 ${familyId}`} title="你好，书房。" /><View style={{ backgroundColor: colors.ink, borderRadius: 22, minHeight: 260, overflow: 'hidden', padding: spacing.xl }}><Text style={{ color: colors.terracottaLight, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>今天从这里开始</Text><Text style={{ color: colors.white, fontFamily: typography.display, fontSize: 36, letterSpacing: -1.4, lineHeight: 39, marginTop: 42 }}>书架上总有一本，刚好适合今天。</Text><TouchableOpacity onPress={() => navigation.navigate('Catalog')} style={{ marginTop: 28 }}><Text style={{ color: colors.terracottaLight, fontFamily: typography.body, fontSize: 14 }}>打开藏书 →</Text></TouchableOpacity></View><View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}><MetricTile label="书名" note="藏书标题" tone="ink" value={dashboard?.books.titles ?? '—'} /><MetricTile label="实体" note="真实拥有" tone="terracotta" value={dashboard?.books.copies ?? '—'} /></View><View style={{ backgroundColor: '#D8DFCF', borderRadius: 14, marginTop: spacing.sm, padding: spacing.lg }}><Text style={{ color: colors.terracotta, fontFamily: typography.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>正在流转</Text><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 27, letterSpacing: -1, marginTop: 23 }}>{activeLoan?.book_title || '还没有进行中的借阅'}</Text><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 13, marginTop: 8 }}>{activeLoan ? `应还 ${new Date(activeLoan.due_at).toLocaleDateString('zh-CN')}` : '去藏书里挑一本带走。'}</Text>{activeLoan && <TouchableOpacity onPress={() => navigation.navigate('Loans')} style={{ marginTop: 19 }}><Text style={{ color: colors.terracotta, fontFamily: typography.body, fontSize: 13 }}>管理借阅 →</Text></TouchableOpacity>}</View><View style={{ marginTop: spacing.xxl }}>{error ? <ErrorState message={error} onRetry={() => { setError(''); void load() }} /> : <><View style={{ alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}><Text style={{ color: colors.ink, fontFamily: typography.display, fontSize: 25, letterSpacing: -.8 }}>下一本，已经在等你。</Text><TouchableOpacity onPress={() => navigation.navigate('Catalog')}><Text style={{ color: colors.terracotta, fontFamily: typography.mono, fontSize: 10 }}>全部 →</Text></TouchableOpacity></View><BookRail books={recommendations} onPress={(id) => navigation.navigate('BookDetail', { bookId: id })} /></>}</View></ScrollView>
}
