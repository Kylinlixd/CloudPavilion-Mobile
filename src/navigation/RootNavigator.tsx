import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import type { MainTabParamList, RootStackParamList } from './types'
import { LoadingState } from '../components/LoadingState'
import { LoginScreen } from '../screens/LoginScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { AddBookScreen } from '../screens/AddBookScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { CatalogScreen } from '../screens/CatalogScreen'
import { LoansScreen } from '../screens/LoansScreen'
import { NotificationsScreen } from '../screens/NotificationsScreen'
import { ReaderScreen } from '../screens/ReaderScreen'
import { BookDetailScreen } from '../screens/BookDetailScreen'
import { ReservationsScreen } from '../screens/ReservationsScreen'
import { ReportsScreen } from '../screens/ReportsScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { ProfileScreen } from '../screens/ProfileScreen'

const Root = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper, card: colors.paperBright, text: colors.ink, border: colors.line, primary: colors.terracotta } }

function MainTabs() {
  const insets = useSafeAreaInsets()
  const iconForRoute = {
    Home: 'home-outline',
    Catalog: 'library-outline',
    Loans: 'swap-horizontal-outline',
    Profile: 'person-outline',
  } as const

  return <Tabs.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.terracotta, tabBarInactiveTintColor: colors.muted, tabBarIcon: ({ color }) => <Ionicons color={color} name={iconForRoute[route.name]} size={24} />, tabBarStyle: { backgroundColor: colors.paperBright, borderTopColor: colors.line, height: 56 + insets.bottom, paddingBottom: insets.bottom, paddingTop: 7 }, tabBarLabelStyle: { fontSize: 11, marginTop: 1 }, tabBarItemStyle: { flex: 1 } })}><Tabs.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} /><Tabs.Screen name="Catalog" component={CatalogScreen} options={{ title: '藏书' }} /><Tabs.Screen name="Loans" component={LoansScreen} options={{ title: '借阅' }} /><Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} /></Tabs.Navigator>
}

export function RootNavigator() {
  const { isAuthenticated, hydrating } = useAuth()
  if (hydrating) return <LoadingState label="正在打开书房" />
  return <NavigationContainer theme={navTheme}><Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>{!isAuthenticated ? <><Root.Screen name="Login" component={LoginScreen} /><Root.Screen name="Register" component={RegisterScreen} /></> : <><Root.Screen name="Main" component={MainTabs} /><Root.Screen name="AddBook" component={AddBookScreen} /><Root.Screen name="BookDetail" component={BookDetailScreen} /><Root.Screen name="Reader" component={ReaderScreen} /><Root.Screen name="Reservations" component={ReservationsScreen} /><Root.Screen name="Reports" component={ReportsScreen} /><Root.Screen name="Settings" component={SettingsScreen} /><Root.Screen name="Notifications" component={NotificationsScreen} /></>}</Root.Navigator></NavigationContainer>
}
