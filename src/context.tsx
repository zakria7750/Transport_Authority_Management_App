import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import {
  USERS_DATA, DRIVERS_DATA, TRIPS_DATA, VIOLATIONS_DATA,
  BREAKDOWNS_DATA, NOTIFICATIONS_DATA,
  type User, type Driver, type Trip, type Violation,
  type Breakdown, type Notification, type ViolationType,
  type TripType,
} from './data'

// ─── Screen Types ─────────────────────────────────────────
export type Screen =
  | 'login' | 'home' | 'drivers' | 'driver-profile'
  | 'attendance' | 'registration' | 'pending-trips'
  | 'violations' | 'guarantees' | 'breakdowns'
  | 'reports' | 'settings' | 'users'
  | 'search' | 'notifications' | 'more'

export interface SnackbarState {
  message: string
  undoFn?: () => void
  timeoutId?: ReturnType<typeof setTimeout>
}

// ─── App State ────────────────────────────────────────────
interface AppState {
  user: User | null
  darkMode: boolean
  screen: Screen
  screenParams: Record<string, unknown>
  snackbar: SnackbarState | null
  drivers: Driver[]
  trips: Trip[]
  violations: Violation[]
  breakdowns: Breakdown[]
  notifications: Notification[]
  users: User[]
  minGuarantors: number
  lastHighlightedDriverId: number | null
}

// ─── Actions ──────────────────────────────────────────────
type Action =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'NAVIGATE'; screen: Screen; params?: Record<string, unknown> }
  | { type: 'TOGGLE_DARK' }
  | { type: 'SHOW_SNACKBAR'; message: string; undoFn?: () => void }
  | { type: 'HIDE_SNACKBAR' }
  | { type: 'ADD_VIOLATION'; driverId: number; vType: ViolationType }
  | { type: 'UNDO_VIOLATION'; driverId: number; vType: ViolationType }
  | { type: 'RAISE_VIOLATION'; violationId: number }
  | { type: 'RAISE_ALL_VIOLATIONS' }
  | { type: 'SET_TRIP'; driverId: number; tripType: TripType }
  | { type: 'COMPLETE_TRIP'; driverId: number }
  | { type: 'CANCEL_TRIP'; driverId: number }
  | { type: 'ADD_DRIVER'; driver: Driver }
  | { type: 'ACTIVATE_DRIVER'; driverId: number }
  | { type: 'READ_NOTIFICATION'; id: number }
  | { type: 'READ_ALL_NOTIFICATIONS' }
  | { type: 'DELETE_NOTIFICATION'; id: number }
  | { type: 'ADD_NOTIFICATION'; notification: Omit<Notification, 'id' | 'read' | 'date'> }
  | { type: 'SAVE_ATTENDANCE'; driverIds: number[] }
  | { type: 'UPDATE_USER'; user: User }
  | { type: 'ADD_USER'; user: User }
  | { type: 'DELETE_USER'; userId: number }
  | { type: 'SET_MIN_GUARANTORS'; min: number }
  | { type: 'SET_HIGHLIGHT'; driverId: number | null }

const initialState: AppState = {
  user: null,
  darkMode: false,
  screen: 'login',
  screenParams: {},
  snackbar: null,
  drivers: DRIVERS_DATA,
  trips: TRIPS_DATA,
  violations: VIOLATIONS_DATA,
  breakdowns: BREAKDOWNS_DATA,
  notifications: NOTIFICATIONS_DATA,
  users: USERS_DATA,
  minGuarantors: 2,
  lastHighlightedDriverId: null,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.user, screen: 'home', screenParams: {} }

    case 'LOGOUT':
      return { ...state, user: null, screen: 'login', screenParams: {} }

    case 'NAVIGATE':
      return { ...state, screen: action.screen, screenParams: action.params ?? {} }

    case 'TOGGLE_DARK':
      return { ...state, darkMode: !state.darkMode }

    case 'SHOW_SNACKBAR':
      if (state.snackbar?.timeoutId) clearTimeout(state.snackbar.timeoutId)
      return { ...state, snackbar: { message: action.message, undoFn: action.undoFn } }

    case 'HIDE_SNACKBAR':
      return { ...state, snackbar: null }

    case 'ADD_VIOLATION': {
      const now = new Date().toLocaleDateString('ar-SA')
      const driver = state.drivers.find(d => d.id === action.driverId)
      if (!driver) return state
      const newViolation: Violation = {
        id: Date.now(),
        driverId: action.driverId,
        driverName: driver.ownerName,
        type: action.vType,
        date: now,
        raised: false,
        note: action.vType === 'ت' ? 'غياب عن كشف التحضير' : 'مخالفة حمول',
      }
      const newNotif: Notification = {
        id: Date.now() + 1,
        icon: '⚠️', type: 'مخالفة',
        title: `مخالفة ${action.vType === 'ت' ? 'تحضير' : 'حمول'}`,
        message: `تم تسجيل مخالفة (${action.vType}) للسائق ${driver.ownerName}`,
        date: new Date().toLocaleString('ar-SA'),
        read: false,
      }
      return {
        ...state,
        drivers: state.drivers.map(d =>
          d.id === action.driverId
            ? { ...d, violation: action.vType, status: 'غير_نشط', statusReason: action.vType === 'ت' ? 'مخالف_ت' : 'مخالف_ح' }
            : d
        ),
        violations: [newViolation, ...state.violations],
        notifications: [newNotif, ...state.notifications],
      }
    }

    case 'UNDO_VIOLATION':
      return {
        ...state,
        drivers: state.drivers.map(d =>
          d.id === action.driverId
            ? { ...d, violation: null, status: 'نشط', statusReason: null }
            : d
        ),
        violations: state.violations.filter(v => !(v.driverId === action.driverId && !v.raised)),
      }

    case 'RAISE_VIOLATION': {
      const today = new Date().toLocaleDateString('ar-SA')
      return {
        ...state,
        violations: state.violations.map(v =>
          v.id === action.violationId ? { ...v, raised: true, raisedDate: today } : v
        ),
        drivers: state.drivers.map(d => {
          const viol = state.violations.find(v => v.id === action.violationId)
          if (viol && viol.driverId === d.id) {
            return { ...d, violation: null, status: 'نشط', statusReason: null }
          }
          return d
        }),
      }
    }

    case 'RAISE_ALL_VIOLATIONS': {
      const today = new Date().toLocaleDateString('ar-SA')
      const driverIdsToRaise = state.violations.filter(v => !v.raised).map(v => v.driverId)
      return {
        ...state,
        violations: state.violations.map(v => v.raised ? v : { ...v, raised: true, raisedDate: today }),
        drivers: state.drivers.map(d =>
          driverIdsToRaise.includes(d.id) ? { ...d, violation: null, status: 'نشط', statusReason: null } : d
        ),
      }
    }

    case 'SET_TRIP': {
      const driver = state.drivers.find(d => d.id === action.driverId)
      if (!driver) return state
      const newTrip: Trip = {
        id: Date.now(),
        driverId: action.driverId,
        type: action.tripType,
        payload: 'غير محدد',
        province: 'الرياض',
        destination: 'جدة',
        breakNum: `T${Date.now().toString().slice(-4)}`,
        status: 'معلقة',
        createdAt: new Date().toLocaleString('ar-SA'),
        ...(action.tripType === 'تعويض' ? { compensationAmount: driver.compensationBalance } : {}),
      }
      const newNotif: Notification = {
        id: Date.now() + 1,
        icon: '🚛', type: 'نهمة',
        title: 'نهمة جديدة',
        message: `تم إنشاء نهمة (${action.tripType}) للسائق ${driver.ownerName}`,
        date: new Date().toLocaleString('ar-SA'),
        read: false,
      }
      return {
        ...state,
        drivers: state.drivers.map(d =>
          d.id === action.driverId ? { ...d, currentTrip: action.tripType } : d
        ),
        trips: [newTrip, ...state.trips],
        notifications: [newNotif, ...state.notifications],
      }
    }

    case 'COMPLETE_TRIP': {
      const driver = state.drivers.find(d => d.id === action.driverId)
      if (!driver) return state
      const newNotif: Notification = {
        id: Date.now(),
        icon: '✅', type: 'نهمة',
        title: 'تأكيد خروج',
        message: `تم تأكيد خروج النهمة للسائق ${driver.ownerName}`,
        date: new Date().toLocaleString('ar-SA'),
        read: false,
      }
      return {
        ...state,
        drivers: state.drivers.map(d =>
          d.id === action.driverId
            ? { ...d, currentTrip: null, status: driver.currentTrip === 'فرزة' ? 'غير_نشط' : 'نشط', statusReason: driver.currentTrip === 'فرزة' ? 'مفروز' : null }
            : d
        ),
        trips: state.trips.map(t =>
          t.driverId === action.driverId && t.status === 'معلقة'
            ? { ...t, status: 'مكتملة', completedAt: new Date().toLocaleString('ar-SA') }
            : t
        ),
        notifications: [newNotif, ...state.notifications],
      }
    }

    case 'CANCEL_TRIP':
      return {
        ...state,
        drivers: state.drivers.map(d =>
          d.id === action.driverId ? { ...d, currentTrip: null } : d
        ),
        trips: state.trips.map(t =>
          t.driverId === action.driverId && t.status === 'معلقة'
            ? { ...t, status: 'ملغاة' }
            : t
        ),
      }

    case 'ADD_DRIVER':
      return { ...state, drivers: [...state.drivers, action.driver] }

    case 'ACTIVATE_DRIVER':
      return {
        ...state,
        drivers: state.drivers.map(d =>
          d.id === action.driverId ? { ...d, status: 'نشط', statusReason: null } : d
        ),
      }

    case 'READ_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n),
      }

    case 'READ_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      }

    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id),
      }

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [{
          ...action.notification,
          id: Date.now(),
          read: false,
          date: new Date().toLocaleString('ar-SA'),
        }, ...state.notifications],
      }

    case 'ADD_USER':
      return { ...state, users: [...state.users, action.user] }

    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.user.id ? action.user : u) }

    case 'DELETE_USER':
      return { ...state, users: state.users.filter(u => u.id !== action.userId) }

    case 'SET_MIN_GUARANTORS':
      return { ...state, minGuarantors: action.min }

    case 'SET_HIGHLIGHT':
      return { ...state, lastHighlightedDriverId: action.driverId }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
  navigate: (screen: Screen, params?: Record<string, unknown>) => void
  showSnackbar: (message: string, undoFn?: () => void) => void
  isManager: boolean
  unreadCount: number
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const navigate = useCallback((screen: Screen, params?: Record<string, unknown>) => {
    dispatch({ type: 'NAVIGATE', screen, params })
  }, [])

  const showSnackbar = useCallback((message: string, undoFn?: () => void) => {
    dispatch({ type: 'SHOW_SNACKBAR', message, undoFn })
    const tid = setTimeout(() => dispatch({ type: 'HIDE_SNACKBAR' }), 5000)
    // Store timeoutId (simplified — we just clear on next show)
    void tid
  }, [])

  const isManager = state.user?.role === 'مدير_مكتب'
  const unreadCount = state.notifications.filter(n => !n.read).length

  return (
    <AppContext.Provider value={{ state, dispatch, navigate, showSnackbar, isManager, unreadCount }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
