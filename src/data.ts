// ═══════════════════════════════════════════════════════════
//  هيئة النقل — مكتب تعز — نظام البوابير | Data Types & Mock Data
// ═══════════════════════════════════════════════════════════

export type UserRole = "موظف_نهمة" | "مدير_مكتب" | "موظف_تسجيل"
export type DriverStatus = "نشط" | "غير_نشط"
export type StatusReason =
  | "مفروز"
  | "مخالف_ت"
  | "مخالف_ح"
  | "بدون_ضمانة"
  | "ملغي"
  | "معطل"
  | "قابل_للإضافة"
  | null
export type DriverType = "س" | "ع"
export type TripType = "فرزة" | "م1" | "م2" | "تعويض"
/** نوع نهمة المسعف — «بدون» = لا تُنشأ نهمة للمسعف */
export type RescuerTripType = TripType | "بدون"
export type TripCompletionState = "جارية" | "مكتملة"
export type ViolationType = "ت" | "ح"
export type TripStatus = "مسودة" | "مؤكدة_مبدئياً" | "معلقة" | "مكتملة" | "ملغاة"
export type DestinationType = "وكيل" | "فرع" | "تصدير"

export interface DriverImages {
  frontId?: string
  backId?: string
  licenseImg?: string
  guaranteeImg?: string
}

export interface User {
  id: number
  username: string
  password: string
  role: UserRole
  name: string
  avatar: string
}

export interface Guarantor {
  id: number
  name: string
  phone: string
  status: "فعال" | "منتهي"
  nationalId: string
  suspended?: boolean
  suspendedForViolatorId?: number
  guaranteeImage?: string
  /** السائق في الكشف الذي يمثّل الضامن */
  sourceDriverId?: number
}

export interface PreTripSnapshot {
  currentTrip: TripType | null
  compensationBalance: number
  status: DriverStatus
  statusReason: StatusReason
  seq: number
}

export interface Trip {
  id: number
  driverId: number
  type: TripType
  payload: string
  province: string
  destinationType: DestinationType
  destination: string
  breakNum: string
  status: TripStatus
  createdAt: string
  completedAt?: string
  compensationAmount?: number
  completionState?: TripCompletionState
  breakdownLocation?: string
  preTripSnapshot?: PreTripSnapshot
  dismissedFromBreakdown?: boolean
}

export interface ViolationUndoSnapshot {
  status: DriverStatus
  statusReason: StatusReason
  violation: ViolationType | null
  currentTrip?: TripType | null
  compensationBalance?: number
  seq: number
  guarantorSnapshot?: Record<number, Guarantor[]>
}

export interface Violation {
  id: number
  driverId: number
  driverName: string
  type: ViolationType
  date: string
  raised: boolean
  raisedDate?: string
  note: string
  recordedBy?: string
  raiseReason?: string
  guaranteesSuspended?: boolean
  undoSnapshot?: ViolationUndoSnapshot
}

export interface Breakdown {
  id: number
  tripId?: number
  tripType: TripType
  driverId: number
  driverName: string
  plate: string
  location: "قريب" | "بعيد"
  /** مكان وقوع العطل (نص حر أو من القائمة) */
  breakdownPlace?: string
  action?: "إلغاء_النهمة" | "إبقاء_النهمة"
  rescuerId?: number
  rescuerName?: string
  rescuerTripType?: RescuerTripType
  breakNum?: string
  compensation?: number
  compensationGiven?: number
  payload?: string
  province?: string
  destinationType?: DestinationType
  destination?: string
  notes?: string
  ownerSnapshot?: PreTripSnapshot
  rescuerSnapshot?: PreTripSnapshot
  rescuerTripId?: number
  originalTripStatus?: TripStatus
  originalTripCompletionState?: TripCompletionState
  originalTripCompletedAt?: string
  date: string
  status: "نشط" | "منتهي"
}

export interface Notification {
  id: number
  icon: string
  type: "مخالفة" | "نهمة" | "استثناء" | "عطل" | "ضمانة" | "تسجيل" | "عام"
  title: string
  message: string
  date: string
  read: boolean
}

export interface Driver {
  id: number
  seq: number
  ownerName: string
  type: DriverType
  plate: string
  phone: string
  status: DriverStatus
  statusReason: StatusReason
  currentTrip: TripType | null
  violation: ViolationType | null
  compensationBalance: number
  guarantors: Guarantor[]
  separator: string
  joinDate: string
  images?: DriverImages
}

export const USERS_DATA: User[] = [
  { id: 1, username: "موظف1", password: "1234", role: "موظف_نهمة", name: "أحمد الشمري", avatar: "أ" },
  { id: 2, username: "مدير1", password: "admin", role: "مدير_مكتب", name: "محمد العمري", avatar: "م" },
  { id: 3, username: "موظف2", password: "5678", role: "موظف_نهمة", name: "فهد الدوسري", avatar: "ف" },
  { id: 4, username: "تسجيل1", password: "reg", role: "موظف_تسجيل", name: "سارة الحارثي", avatar: "س" },
]

export const DRIVERS_DATA: Driver[] = []

export const TRIPS_DATA: Trip[] = []

export const VIOLATIONS_DATA: Violation[] = []

export const BREAKDOWNS_DATA: Breakdown[] = []

export const NOTIFICATIONS_DATA: Notification[] = [
  { id: 1, icon: "⚠️", type: "مخالفة", title: "مخالفة تحضير", message: "تم تسجيل مخالفة (ت) للسائق عبدالله سعد القحطاني", date: "2024-01-15 10:30", read: false },
  { id: 2, icon: "🚛", type: "نهمة", title: "تأكيد خروج", message: "تم تأكيد خروج النهمة (فرزة) للسائق محمد علي الغامدي", date: "2024-01-15 09:45", read: false },
  { id: 3, icon: "🔔", type: "استثناء", title: "طلب استثناء", message: "طلب استثناء مقدم من السائق عمر سعيد العتيبي", date: "2024-01-15 08:20", read: false },
  { id: 4, icon: "⚠️", type: "مخالفة", title: "مخالفة تحضير", message: "تم تسجيل مخالفة (ت) للسائق ماجد عبدالله الشهري", date: "2024-01-15 07:55", read: false },
  { id: 5, icon: "🔧", type: "عطل", title: "بلاغ عطل", message: "تم تسجيل عطل بعيد للنهمة F003 — السائق أحمد محمد العمري", date: "2024-01-14 16:00", read: true },
  { id: 6, icon: "✅", type: "مخالفة", title: "رفع مخالفة", message: "تم رفع مخالفة السائق سلطان فهد الشمري بتاريخ 08/01", date: "2024-01-14 11:00", read: true },
  { id: 7, icon: "🏦", type: "ضمانة", title: "اكتمال ضمانة", message: "اكتملت ضمانة السائق تركي يوسف الرشيدي — الحد الأدنى مستوفى", date: "2024-01-13 14:30", read: true },
]
