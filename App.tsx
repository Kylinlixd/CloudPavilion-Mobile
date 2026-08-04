import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider } from './src/context/AuthContext'
import { FamilyProvider } from './src/context/FamilyContext'
import { RootNavigator } from './src/navigation/RootNavigator'

export default function App() { return <SafeAreaProvider><AuthProvider><FamilyProvider><RootNavigator /></FamilyProvider></AuthProvider></SafeAreaProvider> }
