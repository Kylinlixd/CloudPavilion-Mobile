import { Text } from 'react-native'
import { radius } from '../theme/spacing'
import { typography } from '../theme/typography'

export function StatusPill({ status }: { status: string }) { const active = status === 'active' || status === 'available' || status === 'returned'; return <Text style={{ backgroundColor: active ? '#DBE5D5' : '#F2D4C4', borderRadius: radius.pill, color: active ? '#39624D' : '#994B35', fontFamily: typography.mono, fontSize: 10, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 6, textTransform: 'uppercase' }}>{status === 'active' ? '等待中' : status === 'available' ? '可借' : status === 'borrowed' ? '借阅中' : status === 'returned' ? '已归还' : status}</Text> }
