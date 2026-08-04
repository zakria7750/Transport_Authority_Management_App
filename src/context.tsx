import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react"
import {
  USERS_DATA,
  DRIVERS_DATA,
  TRIPS_DATA,
  VIOLATIONS_DATA,
  BREAKDOWNS_DATA,
  NOTIFICATIONS_DATA,
  type User,
  type Driver,
  type Trip,
  type Violation,
  type Breakdown,
  type Notification,
  type ViolationType,
  type TripType,
  type DestinationType,
  type DriverImages,
  type Guarantor,
  type UserRole,
} from "./data"
import {
  nextId,
  isOpenTripStatus,
  reindexActiveDrivers,
  suspendGuarantorObligations,
  restoreGuarantorsFromSnapshot,
  captureGuarantorSnapshot,
  statusReasonForViolation,
  reactivateGuarantorsOnRaise,
  getDriverOpenTrip,
  appendActiveDriver,
  moveDriverToEndOfActive,
  countActiveGuarantors,
} from "./domain"

export type Screen =
  | "login"
  | "home"
  | "drivers"
  | "driver-profile"
  | "attendance"
  | "registration"
  | "pending-trips"
  | "violations"
  | "guarantees"
  | "breakdowns"
  | "reports"
  | "settings"
  | "users"
  | "search"
  | "notifications"
  | "more"

export interface SnackbarState {
  message: string
  undoFn?: () => void
  timeoutId?: ReturnType<typeof setTimeout>
}

interface AppState {
  user: User | null
  darkMode: boolean
  biometricEnabled: boolean
  pendingSyncCount: number
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
  scrollPositions: Record<Screen, number>
}

export type TripCreatePayload = {
  driverId: number
  tripType: TripType
  payload: string
  province: string
  destinationType: DestinationType
  destination: string
  breakNum: string
  asDraft?: boolean
}

export type TripEditPayload = {
  tripId: number
  payload?: string
  province?: string
  destinationType?: DestinationType
  destination?: string
  breakNum?: string
}

export type BreakdownCreatePayload = {
  tripId: number
  location: "قريب" | "بعيد"
  action?: "إلغاء_النهمة" | "إبقاء_النهمة"
  rescuerId?: number
  rescuerTripType?: TripType
  breakNum?: string
  compensationGiven?: number
}

type Action =
  | { type: "LOGIN"; user: User }
  | { type: "LOGOUT" }
  | { type: "NAVIGATE"; screen: Screen; params?: Record<string, unknown> }
  | { type: "TOGGLE_DARK" }
  | { type: "SET_BIOMETRIC"; enabled: boolean }
  | { type: "SYNC_NOW" }
  | { type: "SHOW_SNACKBAR"; message: string; undoFn?: () => void }
  | { type: "HIDE_SNACKBAR" }
  | { type: "ADD_VIOLATION"; driverId: number; vType: ViolationType; date?: string }
  | { type: "UNDO_VIOLATION"; violationId: number }
  | { type: "UNDO_VIOLATION_BY_DRIVER"; driverId: number }
  | { type: "RAISE_VIOLATION"; violationId: number }
  | { type: "RAISE_ALL_VIOLATIONS" }
  | { type: "EDIT_VIOLATION"; violationId: number; vType: ViolationType }
  | { type: "DELETE_VIOLATION"; violationId: number }
  | { type: "CREATE_TRIP"; trip: TripCreatePayload }
  | { type: "EDIT_TRIP"; edit: TripEditPayload }
  | { type: "DELETE_TRIP"; tripId: number }
  | { type: "COMPLETE_TRIP"; driverId: number }
  | { type: "CANCEL_TRIP"; driverId: number }
  | { type: "RESTORE_TRIP"; trip: Trip; driver: Driver }
  | { type: "ADD_DRIVER"; driver: Driver }
  | { type: "UPDATE_DRIVER"; driver: Driver }
  | { type: "ACTIVATE_DRIVER"; driverId: number }
  | { type: "SET_DRIVER_IMAGES"; driverId: number; images: DriverImages }
  | { type: "READ_NOTIFICATION"; id: number }
  | { type: "READ_ALL_NOTIFICATIONS" }
  | { type: "DELETE_NOTIFICATION"; id: number }
  | { type: "ADD_NOTIFICATION"; notification: Omit<Notification, "id" | "read" | "date"> }
  | { type: "SAVE_ATTENDANCE"; absentDriverIds: number[] }
  | { type: "UPDATE_GUARANTORS"; driverId: number; guarantors: Guarantor[] }
  | { type: "CANCEL_GUARANTOR"; guarantorNationalId: string }
  | { type: "ADD_BREAKDOWN"; breakdown: BreakdownCreatePayload }
  | { type: "UPDATE_USER"; user: User }
  | { type: "ADD_USER"; user: User }
  | { type: "DELETE_USER"; userId: number }
  | { type: "SET_MIN_GUARANTORS"; min: number }
  | { type: "SET_HIGHLIGHT"; driverId: number | null }
  | { type: "SAVE_SCROLL"; screen: Screen; position: number }

const REGISTRATION_SCREENS: Screen[] = ["registration", "settings", "login"]
const MANAGER_ONLY: Screen[] = ["violations", "guarantees", "breakdowns", "reports", "users"]

function getInitialBool(key: string, fallback = false): boolean {
  if (typeof window === "undefined") return fallback
  const saved = localStorage.getItem(key)
  if (saved === null) return fallback
  return saved === "true"
}

function makeNotification(
  partial: Omit<Notification, "id" | "read" | "date">,
): Notification {
  return {
    ...partial,
    id: nextId(),
    read: false,
    date: new Date().toLocaleString("ar-SA"),
  }
}

function pushNotif(state: AppState, partial: Omit<Notification, "id" | "read" | "date">): Notification[] {
  return [makeNotification(partial), ...state.notifications]
}

function bumpPendingSync(state: AppState): number {
  return state.pendingSyncCount + 1
}

function canAccessScreen(role: UserRole | undefined, screen: Screen): boolean {
  if (!role) return screen === "login"
  if (role === "موظف_تسجيل") return REGISTRATION_SCREENS.includes(screen)
  if (role === "موظف_نهمة" && MANAGER_ONLY.includes(screen)) return false
  return screen !== "login"
}

function guarantorSnapshotRecord(drivers: Driver[]): Record<number, Guarantor[]> {
  const r: Record<number, Guarantor[]> = {}
  for (const d of drivers) {
    r[d.id] = d.guarantors.map((g) => ({ ...g }))
  }
  return r
}

function applyViolationToState(
  state: AppState,
  driverId: number,
  vType: ViolationType,
  date?: string,
): AppState {
  const driver = state.drivers.find((d) => d.id === driverId)
  if (!driver || driver.violation) return state

  const gSnap = guarantorSnapshotRecord(state.drivers)
  const now = date ?? new Date().toLocaleDateString("ar-SA")
  const newViolation: Violation = {
    id: nextId(),
    driverId,
    driverName: driver.ownerName,
    type: vType,
    date: now,
    raised: false,
    note: vType === "ت" ? "غياب عن كشف التحضير" : "مخالفة حمول",
    undoSnapshot: {
      status: driver.status,
      statusReason: driver.statusReason,
      violation: driver.violation,
      seq: driver.seq,
      guarantorSnapshot: gSnap,
    },
  }

  let drivers = state.drivers.map((d) =>
    d.id === driverId
      ? {
          ...d,
          violation: vType,
          status: "غير_نشط" as const,
          statusReason: statusReasonForViolation(vType),
          currentTrip: null,
          seq: 0,
        }
      : d,
  )
  drivers = suspendGuarantorObligations(drivers, driverId)
  drivers = reindexActiveDrivers(drivers)

  return {
    ...state,
    drivers,
    violations: [newViolation, ...state.violations],
    notifications: pushNotif(state, {
      icon: "⚠️",
      type: "مخالفة",
      title: `مخالفة ${vType === "ت" ? "تحضير" : "حمول"}`,
      message: `تم تسجيل مخالفة (${vType}) للسائق ${driver.ownerName}`,
    }),
    pendingSyncCount: bumpPendingSync(state),
  }
}

const initialState: AppState = {
  user: null,
  darkMode: getInitialBool("darkMode"),
  biometricEnabled: getInitialBool("biometricEnabled"),
  pendingSyncCount: 0,
  screen: "login",
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
  scrollPositions: {
    login: 0,
    home: 0,
    drivers: 0,
    "driver-profile": 0,
    attendance: 0,
    registration: 0,
    "pending-trips": 0,
    violations: 0,
    guarantees: 0,
    breakdowns: 0,
    reports: 0,
    settings: 0,
    users: 0,
    search: 0,
    notifications: 0,
    more: 0,
  },
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOGIN": {
      const screen =
        action.user.role === "موظف_تسجيل" ? "registration" : "home"
      return { ...state, user: action.user, screen, screenParams: {} }
    }

    case "LOGOUT":
      return { ...state, user: null, screen: "login", screenParams: {} }

    case "NAVIGATE": {
      if (state.user && !canAccessScreen(state.user.role, action.screen)) {
        return state
      }
      return { ...state, screen: action.screen, screenParams: action.params ?? {} }
    }

    case "TOGGLE_DARK": {
      const darkMode = !state.darkMode
      if (typeof window !== "undefined") localStorage.setItem("darkMode", String(darkMode))
      return { ...state, darkMode }
    }

    case "SET_BIOMETRIC": {
      if (typeof window !== "undefined") {
        localStorage.setItem("biometricEnabled", String(action.enabled))
      }
      return { ...state, biometricEnabled: action.enabled }
    }

    case "SYNC_NOW":
      return { ...state, pendingSyncCount: 0 }

    case "SHOW_SNACKBAR":
      if (state.snackbar?.timeoutId) clearTimeout(state.snackbar.timeoutId)
      return { ...state, snackbar: { message: action.message, undoFn: action.undoFn } }

    case "HIDE_SNACKBAR":
      return { ...state, snackbar: null }

    case "ADD_VIOLATION":
      return applyViolationToState(state, action.driverId, action.vType, action.date)

    case "UNDO_VIOLATION_BY_DRIVER": {
      const viol = state.violations.find((v) => v.driverId === action.driverId && !v.raised)
      if (!viol) return state
      return reducer(state, { type: "UNDO_VIOLATION", violationId: viol.id })
    }

    case "UNDO_VIOLATION": {
      const viol = state.violations.find((v) => v.id === action.violationId)
      if (!viol || !viol.undoSnapshot) return state
      const snap = viol.undoSnapshot
      const snapMap = snap.guarantorSnapshot
        ? new Map(Object.entries(snap.guarantorSnapshot).map(([k, v]) => [Number(k), v]))
        : captureGuarantorSnapshot(state.drivers)
      let drivers = state.drivers.map((d) =>
        d.id === viol.driverId
          ? {
              ...d,
              status: snap.status,
              statusReason: snap.statusReason,
              violation: snap.violation,
              seq: snap.seq,
            }
          : d,
      )
      drivers = restoreGuarantorsFromSnapshot(drivers, viol.driverId, snapMap)
      drivers = reindexActiveDrivers(drivers)
      return {
        ...state,
        drivers,
        violations: state.violations.filter((v) => v.id !== action.violationId),
      }
    }

    case "RAISE_VIOLATION": {
      const viol = state.violations.find((v) => v.id === action.violationId)
      if (!viol) return state
      const today = new Date().toLocaleDateString("ar-SA")
      const drivers = state.drivers.map((d) => {
        if (d.id !== viol.driverId) return d
        return {
          ...d,
          violation: null,
          status: "غير_نشط" as const,
          statusReason: "قابل_للإضافة" as const,
          guarantors: reactivateGuarantorsOnRaise(d.guarantors),
        }
      })
      return {
        ...state,
        violations: state.violations.map((v) =>
          v.id === action.violationId ? { ...v, raised: true, raisedDate: today } : v,
        ),
        drivers,
        notifications: pushNotif(state, {
          icon: "✅",
          type: "مخالفة",
          title: "رفع مخالفة",
          message: `تم رفع مخالفة السائق ${viol.driverName}`,
        }),
      }
    }

    case "RAISE_ALL_VIOLATIONS": {
      const today = new Date().toLocaleDateString("ar-SA")
      const openIds = new Set(state.violations.filter((v) => !v.raised).map((v) => v.driverId))
      return {
        ...state,
        violations: state.violations.map((v) =>
          v.raised ? v : { ...v, raised: true, raisedDate: today },
        ),
        drivers: state.drivers.map((d) =>
          openIds.has(d.id)
            ? {
                ...d,
                violation: null,
                status: "غير_نشط" as const,
                statusReason: "قابل_للإضافة" as const,
                guarantors: reactivateGuarantorsOnRaise(d.guarantors),
              }
            : d,
        ),
        notifications: pushNotif(state, {
          icon: "✅",
          type: "مخالفة",
          title: "رفع مخالفات",
          message: `تم رفع ${openIds.size} مخالفة`,
        }),
      }
    }

    case "EDIT_VIOLATION": {
      const viol = state.violations.find((v) => v.id === action.violationId)
      if (!viol) return state
      return {
        ...state,
        violations: state.violations.map((v) =>
          v.id === action.violationId ? { ...v, type: action.vType } : v,
        ),
        drivers: state.drivers.map((d) =>
          d.id === viol.driverId
            ? {
                ...d,
                violation: action.vType,
                statusReason: statusReasonForViolation(action.vType),
              }
            : d,
        ),
      }
    }

    case "DELETE_VIOLATION": {
      const viol = state.violations.find((v) => v.id === action.violationId)
      if (!viol || !viol.undoSnapshot) return state
      const snap = viol.undoSnapshot
      const snapMap = snap.guarantorSnapshot
        ? new Map(Object.entries(snap.guarantorSnapshot).map(([k, v]) => [Number(k), v]))
        : captureGuarantorSnapshot(state.drivers)
      let drivers = state.drivers.map((d) =>
        d.id === viol.driverId
          ? {
              ...d,
              status: snap.status,
              statusReason: snap.statusReason,
              violation: snap.violation,
              seq: snap.seq,
            }
          : d,
      )
      drivers = restoreGuarantorsFromSnapshot(drivers, viol.driverId, snapMap)
      drivers = reindexActiveDrivers(drivers)
      return {
        ...state,
        violations: state.violations.filter((v) => v.id !== action.violationId),
        drivers,
      }
    }

    case "CREATE_TRIP": {
      const { trip } = action
      const driver = state.drivers.find((d) => d.id === trip.driverId)
      if (!driver) return state
      if (!trip.asDraft && driver.currentTrip) return state
      if (
        trip.tripType === "تعويض" &&
        !trip.asDraft &&
        driver.compensationBalance <= 0
      )
        return state

      const amount =
        trip.tripType === "تعويض" ? driver.compensationBalance : undefined
      const newTrip: Trip = {
        id: nextId(),
        driverId: trip.driverId,
        type: trip.tripType,
        payload: trip.payload,
        province: trip.province,
        destinationType: trip.destinationType,
        destination: trip.destination,
        breakNum: trip.breakNum,
        status: trip.asDraft ? "مسودة" : "مؤكدة_مبدئياً",
        createdAt: new Date().toLocaleString("ar-SA"),
        ...(amount !== undefined ? { compensationAmount: amount } : {}),
      }

      let drivers = state.drivers
      if (!trip.asDraft) {
        drivers = drivers.map((d) =>
          d.id === trip.driverId
            ? {
                ...d,
                currentTrip: trip.tripType,
                compensationBalance:
                  trip.tripType === "تعويض"
                    ? 0
                    : d.compensationBalance,
              }
            : d,
        )
      }

      return {
        ...state,
        trips: [newTrip, ...state.trips],
        drivers,
        notifications: trip.asDraft
          ? state.notifications
          : pushNotif(state, {
              icon: "🚛",
              type: "نهمة",
              title: "نهمة جديدة",
              message: `تم إنشاء نهمة (${trip.tripType}) للسائق ${driver.ownerName}`,
            }),
        pendingSyncCount: trip.asDraft ? state.pendingSyncCount : bumpPendingSync(state),
      }
    }

    case "EDIT_TRIP": {
      const { edit } = action
      return {
        ...state,
        trips: state.trips.map((t) =>
          t.id === edit.tripId
            ? {
                ...t,
                payload: edit.payload ?? t.payload,
                province: edit.province ?? t.province,
                destinationType: edit.destinationType ?? t.destinationType,
                destination: edit.destination ?? t.destination,
                breakNum: edit.breakNum ?? t.breakNum,
              }
            : t,
        ),
      }
    }

    case "DELETE_TRIP": {
      const trip = state.trips.find((t) => t.id === action.tripId)
      if (!trip) return state
      const driver = state.drivers.find((d) => d.id === trip.driverId)
      let drivers = state.drivers
      if (driver && isOpenTripStatus(trip.status)) {
        drivers = drivers.map((d) =>
          d.id === trip.driverId
            ? {
                ...d,
                currentTrip: null,
                compensationBalance:
                  trip.type === "تعويض" && trip.compensationAmount
                    ? d.compensationBalance + trip.compensationAmount
                    : d.compensationBalance,
              }
            : d,
        )
      }
      return {
        ...state,
        trips: state.trips.filter((t) => t.id !== action.tripId),
        drivers,
      }
    }

    case "COMPLETE_TRIP": {
      const driver = state.drivers.find((d) => d.id === action.driverId)
      const trip = getDriverOpenTrip(state.trips, action.driverId)
      if (!driver || !trip) return state

      let drivers = state.drivers.map((d) => {
        if (d.id !== action.driverId) return d
        if (trip.type === "فرزة") {
          return {
            ...d,
            currentTrip: null,
            status: "غير_نشط" as const,
            statusReason: "مفروز" as const,
            seq: 0,
          }
        }
        return { ...d, currentTrip: null, status: "نشط" as const, statusReason: null }
      })
      drivers = reindexActiveDrivers(drivers)

      return {
        ...state,
        drivers,
        trips: state.trips.map((t) =>
          t.id === trip.id
            ? { ...t, status: "مكتملة", completedAt: new Date().toLocaleString("ar-SA") }
            : t,
        ),
        notifications: pushNotif(state, {
          icon: "✅",
          type: "نهمة",
          title: "تأكيد خروج",
          message: `تم تأكيد خروج النهمة (${trip.type}) للسائق ${driver.ownerName}`,
        }),
      }
    }

    case "CANCEL_TRIP": {
      const trip = getDriverOpenTrip(state.trips, action.driverId)
      if (!trip) return state
      const driver = state.drivers.find((d) => d.id === action.driverId)
      if (!driver) return state

      return {
        ...state,
        drivers: state.drivers.map((d) =>
          d.id === action.driverId
            ? {
                ...d,
                currentTrip: null,
                compensationBalance:
                  trip.type === "تعويض" && trip.compensationAmount
                    ? d.compensationBalance + trip.compensationAmount
                    : d.compensationBalance,
              }
            : d,
        ),
        trips: state.trips.map((t) =>
          t.id === trip.id ? { ...t, status: "ملغاة" } : t,
        ),
      }
    }

    case "RESTORE_TRIP": {
      const { trip, driver } = action
      return {
        ...state,
        trips: [trip, ...state.trips.filter((t) => t.id !== trip.id)],
        drivers: state.drivers.map((d) => (d.id === driver.id ? driver : d)),
      }
    }

    case "ADD_DRIVER": {
      let drivers = [...state.drivers, { ...action.driver, seq: 0 }]
      if (action.driver.status === "نشط") {
        drivers = appendActiveDriver(drivers, action.driver.id)
      }
      drivers = reindexActiveDrivers(drivers)
      return { ...state, drivers }
    }

    case "UPDATE_DRIVER":
      return {
        ...state,
        drivers: state.drivers.map((d) => (d.id === action.driver.id ? action.driver : d)),
      }

    case "ACTIVATE_DRIVER": {
      const driver = state.drivers.find((d) => d.id === action.driverId)
      if (!driver) return state
      if (countActiveGuarantors(driver) < state.minGuarantors) return state
      let drivers = appendActiveDriver(state.drivers, action.driverId)
      drivers = reindexActiveDrivers(drivers)
      return { ...state, drivers }
    }

    case "SET_DRIVER_IMAGES":
      return {
        ...state,
        drivers: state.drivers.map((d) =>
          d.id === action.driverId ? { ...d, images: { ...d.images, ...action.images } } : d,
        ),
      }

    case "SAVE_ATTENDANCE": {
      let next = state
      for (const id of action.absentDriverIds) {
        next = applyViolationToState(next, id, "ت")
      }
      return next
    }

    case "UPDATE_GUARANTORS": {
      const driver = state.drivers.find((d) => d.id === action.driverId)
      if (!driver) return state
      const activeCount = action.guarantors.filter(
        (g) => g.status === "فعال" && !g.suspended,
      ).length
      const meetsMin = activeCount >= state.minGuarantors
      let drivers = state.drivers.map((d) => {
        if (d.id !== action.driverId) return d
        const updated = { ...d, guarantors: action.guarantors }
        if (meetsMin && d.status === "غير_نشط" && d.statusReason === "بدون_ضمانة") {
          return { ...updated, status: "نشط" as const, statusReason: null }
        }
        return updated
      })
      const target = drivers.find((d) => d.id === action.driverId)
      if (target?.status === "نشط" && driver.status !== "نشط") {
        drivers = appendActiveDriver(drivers, action.driverId)
      }
      drivers = reindexActiveDrivers(drivers)
      const notifs =
        meetsMin && driver.statusReason === "بدون_ضمانة"
          ? pushNotif(state, {
              icon: "🏦",
              type: "ضمانة",
              title: "اكتمال ضمانة",
              message: `اكتملت ضمانة السائق ${driver.ownerName}`,
            })
          : state.notifications
      return { ...state, drivers, notifications: notifs }
    }

    case "CANCEL_GUARANTOR": {
      let drivers = state.drivers.map((d) => ({
        ...d,
        guarantors: d.guarantors.map((g) =>
          g.nationalId === action.guarantorNationalId
            ? { ...g, status: "منتهي" as const, suspended: false }
            : g,
        ),
      }))
      drivers = drivers.map((d) => {
        const active = countActiveGuarantors(d)
        if (active < state.minGuarantors && d.status === "نشط") {
          return { ...d, status: "غير_نشط" as const, statusReason: "بدون_ضمانة" as const, seq: 0 }
        }
        return d
      })
      drivers = reindexActiveDrivers(drivers)
      return {
        ...state,
        drivers,
        notifications: pushNotif(state, {
          icon: "🏦",
          type: "ضمانة",
          title: "إلغاء ضمانة",
          message: "تم إلغاء ضمانة مرتبطة بسائق",
        }),
      }
    }

    case "ADD_BREAKDOWN": {
      const trip = state.trips.find((t) => t.id === action.breakdown.tripId)
      const driver = trip ? state.drivers.find((d) => d.id === trip.driverId) : undefined
      if (!trip || !driver) return state

      const b: Breakdown = {
        id: nextId(),
        tripId: trip.id,
        tripType: trip.type,
        driverId: driver.id,
        driverName: driver.ownerName,
        plate: driver.plate,
        location: action.breakdown.location,
        action: action.breakdown.action,
        rescuerId: action.breakdown.rescuerId,
        rescuerName: action.breakdown.rescuerId
          ? state.drivers.find((d) => d.id === action.breakdown.rescuerId)?.ownerName
          : undefined,
        rescuerTripType: action.breakdown.rescuerTripType,
        breakNum: action.breakdown.breakNum,
        compensationGiven: action.breakdown.compensationGiven,
        compensation: action.breakdown.compensationGiven,
        date: new Date().toLocaleDateString("ar-SA"),
        status: "نشط",
      }

      let drivers = [...state.drivers]
      if (action.breakdown.location === "قريب") {
        if (action.breakdown.action === "إلغاء_النهمة") {
          drivers = drivers.map((d) =>
            d.id === driver.id ? { ...d, currentTrip: null, status: "نشط" as const, statusReason: null } : d,
          )
        } else {
          drivers = moveDriverToEndOfActive(drivers, driver.id)
        }
      } else if (action.breakdown.rescuerId && action.breakdown.compensationGiven) {
        drivers = drivers.map((d) =>
          d.id === action.breakdown.rescuerId
            ? {
                ...d,
                compensationBalance: d.compensationBalance + (action.breakdown.compensationGiven ?? 0),
              }
            : d.id === driver.id
              ? { ...d, status: "نشط" as const, seq: 0 }
              : d,
        )
        drivers = reindexActiveDrivers(drivers)
        drivers = appendActiveDriver(drivers, driver.id)
        drivers = reindexActiveDrivers(drivers)
      }

      return {
        ...state,
        breakdowns: [b, ...state.breakdowns],
        drivers,
        notifications: pushNotif(state, {
          icon: "🔧",
          type: "عطل",
          title: "بلاغ عطل",
          message: `تم تسجيل عطل ${action.breakdown.location} للسائق ${driver.ownerName}`,
        }),
      }
    }

    case "READ_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: true } : n,
        ),
      }

    case "READ_ALL_NOTIFICATIONS":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      }

    case "DELETE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.id),
      }

    case "ADD_NOTIFICATION":
      return { ...state, notifications: pushNotif(state, action.notification) }

    case "ADD_USER":
      return { ...state, users: [...state.users, action.user] }

    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map((u) => (u.id === action.user.id ? action.user : u)),
      }

    case "DELETE_USER":
      return { ...state, users: state.users.filter((u) => u.id !== action.userId) }

    case "SET_MIN_GUARANTORS":
      return { ...state, minGuarantors: action.min }

    case "SET_HIGHLIGHT":
      return { ...state, lastHighlightedDriverId: action.driverId }

    case "SAVE_SCROLL":
      return {
        ...state,
        scrollPositions: { ...state.scrollPositions, [action.screen]: action.position },
      }

    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: Dispatch<Action>
  navigate: (screen: Screen, params?: Record<string, unknown>) => void
  showSnackbar: (message: string, undoFn?: () => void) => void
  isManager: boolean
  isRegistrationClerk: boolean
  unreadCount: number
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const navigate = useCallback((screen: Screen, params?: Record<string, unknown>) => {
    dispatch({ type: "NAVIGATE", screen, params })
  }, [])

  const showSnackbar = useCallback((message: string, undoFn?: () => void) => {
    dispatch({ type: "SHOW_SNACKBAR", message, undoFn })
    setTimeout(() => dispatch({ type: "HIDE_SNACKBAR" }), 5000)
  }, [])

  const isManager = state.user?.role === "مدير_مكتب"
  const isRegistrationClerk = state.user?.role === "موظف_تسجيل"
  const unreadCount = state.notifications.filter((n) => !n.read).length

  return (
    <AppContext.Provider
      value={{ state, dispatch, navigate, showSnackbar, isManager, isRegistrationClerk, unreadCount }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}

export function useSaveScrollPosition(screen: Screen) {
  const { dispatch } = useApp()
  return useCallback(
    (position: number) => {
      dispatch({ type: "SAVE_SCROLL", screen, position })
    },
    [screen, dispatch],
  )
}

export function useGetScrollPosition(screen: Screen) {
  const { state } = useApp()
  return state.scrollPositions[screen] ?? 0
}
