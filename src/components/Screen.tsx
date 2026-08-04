import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'

export function Screen({ children, scroll = false }: { children: React.ReactNode; scroll?: boolean }) {
  const style = { flex: 1, backgroundColor: colors.paper }
  return <SafeAreaView edges={['top']} style={style}>{scroll ? <>{children}</> : children}</SafeAreaView>
}
