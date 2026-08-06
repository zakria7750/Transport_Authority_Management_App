import { AppProvider, useApp } from './context'
import { BottomNav, Snackbar } from './components'

import LoginScreen from './screens/Login'
import HomeScreen from './screens/Home'
import DriversScreen from './screens/Drivers'
import DriverProfileScreen from './screens/DriverProfile'
import PendingTripsScreen from './screens/PendingTrips'
import AllTripsScreen from './screens/AllTrips'
import AttendanceScreen from './screens/Attendance'
import { AttendanceSheet } from './screens/AttendanceSheet'
import { TripsManagementScreen } from './screens/TripsManagement'
import RegistrationScreen from './screens/Registration'
import {
  ViolationsScreen, GuaranteesScreen, BreakdownsScreen,
  ReportsScreen, UsersScreen, DriverManagementScreen,
} from './screens/Manager'
import { MoreScreen, SettingsScreen, SearchScreen, NotificationsScreen } from './screens/More'

function Router() {
  const { state } = useApp()
  const { screen, navDirection } = state

  const screenMap: Record<string, React.ComponentType> = {
    login: LoginScreen,
    home: HomeScreen,
    drivers: DriversScreen,
    'driver-profile': DriverProfileScreen,
    'pending-trips': PendingTripsScreen,
    'all-trips': AllTripsScreen,
    'trips-management': TripsManagementScreen,
    attendance: AttendanceScreen,
    'attendance-sheet': AttendanceSheet,
    registration: RegistrationScreen,
    violations: ViolationsScreen,
    guarantees: GuaranteesScreen,
    breakdowns: BreakdownsScreen,
    reports: ReportsScreen,
    users: UsersScreen,
    'driver-management': DriverManagementScreen,
    more: MoreScreen,
    settings: SettingsScreen,
    search: SearchScreen,
    notifications: NotificationsScreen,
  }

  const ActiveScreen = screenMap[screen] ?? HomeScreen
  const slideAnim = navDirection === 'back' ? 'slideInBack 0.25s ease' : 'slideInForward 0.25s ease'

  return (
    <div className="app-shell">
      <div key={screen} className="screen-stage" style={{ animation: slideAnim }}>
        <ActiveScreen />
        <Snackbar />
      </div>
      {screen !== 'login' && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <div className="app-root">
        <Router />
      </div>
    </AppProvider>
  )
}
