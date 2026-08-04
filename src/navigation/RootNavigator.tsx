import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'
import type { MainTabParamList, RootStackParamList } from './types'
import { LoadingState } from '../components/LoadingState'
import { LoginScreen } from '../screens/LoginScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { CatalogScreen } from '../screens/CatalogScreen'
import { LoansScreen } from '../screens/LoansScreen'
import { NotificationsScreen } from '../screens/NotificationsScreen'
import { BookDetailScreen } from '../screens/BookDetailScreen'
import { ReservationsScreen } from '../screens/ReservationsScreen'
import { ReportsScreen } from '../screens/ReportsScreen'
import { SettingsScreen } from '../screens/SettingsScreen'

const Root = createNativeStackNavigator<RootStackParamList>()
const Tabs = createBottomTabNavigator<MainTabParamList>()
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper, card: colors.paperBright, text: colors.ink, border: colors.line, primary: colors.terracotta } }

function MainTabs() {
  return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.terracotta, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.paperBright, borderTopColor: colors.line, height: 72, paddingBottom: 12, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 11 } }}><Tabs.Screen name="Home" component={HomeScreen} options={{ title: '工作台' }} /><Tabs.Screen name="Catalog" component={CatalogScreen} options={{ title: '藏书' }} /><Tabs.Screen name="Loans" component={LoansScreen} options={{ title: '借阅' }} /><Tabs.Screen name="Notifications" component={NotificationsScreen} options={{ title: '通知' }} /></Tabs.Navigator>
}

export function RootNavigator() {
  const { isAuthenticated, hydrating } = useAuth()
  if (hydrating) return <LoadingState label="正在打开书房" />
  return <NavigationContainer theme={navTheme}><Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>{!isAuthenticated ? <Root.Screen name="Login" component={LoginScreen} /> : <><Root.Screen name="Main" component={MainTabs} /><Root.Screen name="BookDetail" component={BookDetailScreen} /><Root.Screen name="Reservations" component={ReservationsScreen} /><Root.Screen name="Reports" component={ReportsScreen} /><Root.Screen name="Settings" component={SettingsScreen} /></>}</Root.Navigator></NavigationContainer>
}
