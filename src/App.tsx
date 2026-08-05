import { AppProvider, useApp } from './context'
import { BottomNav, Snackbar } from './components'
import { APP_FULL_BRAND } from './components'

// Screens
import LoginScreen from './screens/Login'
import HomeScreen from './screens/Home'
import DriversScreen from './screens/Drivers'
import DriverProfileScreen from './screens/DriverProfile'
import PendingTripsScreen from './screens/PendingTrips'
import AllTripsScreen from './screens/AllTrips'
import AttendanceScreen from './screens/Attendance'
import RegistrationScreen from './screens/Registration'
import {
  ViolationsScreen, GuaranteesScreen, BreakdownsScreen,
  ReportsScreen, UsersScreen, DriverManagementScreen
} from './screens/Manager'
import {
  MoreScreen, SettingsScreen, SearchScreen, NotificationsScreen
} from './screens/More'

// ─── Phone Frame ──────────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #040810 0%, #0B1526 50%, #061022 100%)',
      padding: '20px',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(29,78,216,0.15) 0%, transparent 70%)',
        top: '10%', left: '50%', transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />

      {/* Phone Shell */}
      <div style={{
        width: 390,
        height: 844,
        background: '#000',
        borderRadius: 50,
        boxShadow: [
          '0 0 0 1px #1E2D40',
          '0 0 0 3px #0B1526',
          '0 0 0 4px #1E2D40',
          '0 30px 80px rgba(0,0,0,0.7)',
          '0 0 60px rgba(29,78,216,0.2)',
        ].join(', '),
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Dynamic Island */}
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          width: 120, height: 34, borderRadius: 17,
          background: '#000', zIndex: 100,
          boxShadow: 'inset 0 0 0 1px #1E2D40',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1a1a1a', border: '1px solid #2a2a2a' }} />
          <div style={{ width: 28, height: 8, borderRadius: 4, background: '#111' }} />
        </div>

        {/* Status Bar */}
        <div style={{
          height: 52, paddingTop: 14,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          paddingRight: 24, paddingLeft: 24, paddingBottom: 4,
          background: 'transparent',
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99,
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif' }}>
            {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#F1F5F9' }}>●●●</span>
            <span style={{ fontSize: 11, color: '#F1F5F9' }}>WiFi</span>
            <span style={{ fontSize: 11, color: '#4ADE80' }}>🔋</span>
          </div>
        </div>

        {/* Screen Content */}
        <div style={{
          position: 'absolute', inset: 0,
          paddingTop: 52,
          paddingBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {children}
        </div>

        {/* Home indicator */}
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          width: 130, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.25)', zIndex: 100,
        }} />
      </div>

      {/* Side label */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(148,163,184,0.3)', fontSize: 11, textAlign: 'center',
        fontFamily: 'Cairo, sans-serif', letterSpacing: 2,
      }}>
        {APP_FULL_BRAND}
      </div>
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────
function Router() {
  const { state } = useApp()
  const { screen, navDirection } = state

  const SCREEN_MAP: Record<string, React.ComponentType> = {
    login: LoginScreen,
    home: HomeScreen,
    drivers: DriversScreen,
    'driver-profile': DriverProfileScreen,
    'pending-trips': PendingTripsScreen,
    'all-trips': AllTripsScreen,
    attendance: AttendanceScreen,
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

  const ActiveScreen = SCREEN_MAP[screen] ?? HomeScreen

  const slideAnim = navDirection === 'back' ? 'slideInBack 0.3s ease' : 'slideInForward 0.3s ease'

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      <div
        key={screen}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
          animation: slideAnim,
        }}
      >
        <ActiveScreen />
        <Snackbar />
      </div>
      {screen !== 'login' && <BottomNav />}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────
export default function App() {
  return (
    <AppProvider>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideInForward {
          from { transform: translateX(24px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInBack {
          from { transform: translateX(-24px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes rowInsert {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rowRemove {
          from { opacity: 1; transform: scale(1); max-height: 200px; }
          to   { opacity: 0; transform: scale(0.96); max-height: 0; }
        }
        @keyframes successOverlay {
          0%   { opacity: 0; transform: scale(0.8); }
          40%  { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.2); }
        }
        * {
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
      `}</style>
      <PhoneFrame>
        <Router />
      </PhoneFrame>
    </AppProvider>
  )
}
