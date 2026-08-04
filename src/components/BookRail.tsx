import { FlatList, Text, TouchableOpacity } from 'react-native'
import type { Recommendation } from '../lib/types'
import { BookCover } from './BookCover'
import { colors } from '../theme/colors'
import { spacing } from '../theme/spacing'
import { typography } from '../theme/typography'

export function BookRail({ books, onPress }: { books: Recommendation[]; onPress: (id: number) => void }) { return <FlatList data={books} horizontal keyExtractor={(item) => String(item.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }} renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" onPress={() => onPress(item.id)} style={{ width: 176 }}><BookCover category={item.category} seed={item.id} title={item.title} /><Text numberOfLines={1} style={{ color: colors.ink, fontFamily: typography.body, fontSize: 14, marginTop: 10 }}>{item.title}</Text><Text numberOfLines={1} style={{ color: colors.muted, fontFamily: typography.body, fontSize: 11, marginTop: 3 }}>{item.author || '作者未录入'}</Text></TouchableOpacity>} /> }
