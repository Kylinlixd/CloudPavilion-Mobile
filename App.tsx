import { AppState } from 'react-native'
import { useEffect } from 'react'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import { AuthProvider } from './src/context/AuthContext'
import { FamilyProvider } from './src/context/FamilyContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import { colors } from './src/theme/colors'
import { apiClient } from './src/lib/api'

function OfflineSync() {
  useEffect(() => {
    const flush = () => { void apiClient.flushOfflineQueue() }
    flush()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') flush()
    })
    return () => subscription.remove()
  }, [])
  return null
}

export default function App() { return <SafeAreaProvider><SafeAreaView edges={['top']} style={{ backgroundColor: colors.paper, flex: 1 }}><AuthProvider><FamilyProvider><OfflineSync /><RootNavigator /></FamilyProvider></AuthProvider></SafeAreaView></SafeAreaProvider> }
