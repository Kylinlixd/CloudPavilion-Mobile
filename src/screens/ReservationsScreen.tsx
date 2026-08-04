import { useEffect, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { ActionButton } from '../components/ActionButton'
import { AppHeader } from '../components/AppHeader'
import { EmptyState } from '../components/EmptyState'
import { StatusPill } from '../components/StatusPill'
import { useFamily } from '../context/FamilyContext'
import { apiClient } from '../lib/api'
import type { Reservation } from '../lib/types'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

function asList<T>(value: T[] | { results: T[] }) { return Array.isArray(value) ? value : value.results }
export function ReservationsScreen() { const navigation = useNavigation<any>(); const { familyId } = useFamily(); const [items, setItems] = useState<Reservation[]>([]); useEffect(() => { if (familyId) void apiClient.get<Reservation[] | { results: Reservation[] }>('/reservations/').then((data) => setItems(asList(data))) }, [familyId]); async function cancel(id: number) { await apiClient.post(`/reservations/${id}/cancel/`); setItems((current) => current.map((item) => item.id === id ? { ...item, status: 'cancelled' } : item)) } return <View style={{ backgroundColor: colors.paper, flex: 1, padding: spacing.lg }}><AppHeader onPress={() => navigation.navigate('Settings')} subtitle="正在等待回到手边的书" title="预约" /><FlatList contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }} data={items} keyExtractor={(item) => String(item.id)} renderItem={({ item }) => <View style={{ alignItems: 'center', backgroundColor: colors.paperBright, borderRadius: 14, flexDirection: 'row', gap: spacing.md, padding: spacing.lg }}><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontFamily: typography.body, fontSize: 15 }}>实体副本 #{item.copy}</Text><Text style={{ color: colors.muted, fontFamily: typography.body, fontSize: 11, marginTop: 5 }}>{new Date(item.created_at).toLocaleDateString('zh-CN')}</Text></View><StatusPill status={item.status} />{item.status === 'active' && <ActionButton onPress={() => void cancel(item.id)} quiet>取消</ActionButton>}</View>} ListEmptyComponent={<EmptyState title="预约队列是空的" copy="书架上的故事还在等你选择。" />} /></View> }
