import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import { AuthProvider } from './src/context/AuthContext'
import { FamilyProvider } from './src/context/FamilyContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import { colors } from './src/theme/colors'

export default function App() { return <SafeAreaProvider><SafeAreaView edges={['top']} style={{ backgroundColor: colors.paper, flex: 1 }}><AuthProvider><FamilyProvider><RootNavigator /></FamilyProvider></AuthProvider></SafeAreaView></SafeAreaProvider> }
