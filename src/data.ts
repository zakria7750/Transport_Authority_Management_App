// ═══════════════════════════════════════════════════════════
//  هيئة النقل — نظام البوابير | Data Types & Mock Data
// ═══════════════════════════════════════════════════════════

export type UserRole = 'موظف_نهمة' | 'مدير_مكتب'
export type DriverStatus = 'نشط' | 'غير_نشط'
export type StatusReason = 'مفروز' | 'مخالف_ت' | 'مخالف_ح' | 'بدون_ضمانة' | 'ملغي' | null
export type DriverType = 'س' | 'ع'
export type TripType = 'فرزة' | 'م1' | 'م2' | 'تعويض'
export type ViolationType = 'ت' | 'ح'
export type TripStatus = 'معلقة' | 'مكتملة' | 'ملغاة'

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
  status: 'فعال' | 'منتهي'
  nationalId: string
}

export interface Trip {
  id: number
  driverId: number
  type: TripType
  payload: string
  province: string
  destination: string
  breakNum: string
  status: TripStatus
  createdAt: string
  completedAt?: string
  compensationAmount?: number
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
}

export interface Breakdown {
  id: number
  tripId: number
  tripType: TripType
  driverId: number
  driverName: string
  plate: string
  location: 'قريب' | 'بعيد'
  action?: 'إلغاء_النهمة' | 'إبقاء_النهمة'
  rescuerName?: string
  breakNum?: string
  compensation?: number
  date: string
  status: 'نشط' | 'منتهي'
}

export interface Notification {
  id: number
  icon: string
  type: 'مخالفة' | 'نهمة' | 'استثناء' | 'عطل' | 'ضمانة' | 'عام'
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
}

// ─── Users ────────────────────────────────────────────────
export const USERS_DATA: User[] = [
  { id: 1, username: 'موظف1', password: '1234', role: 'موظف_نهمة', name: 'أحمد الشمري', avatar: 'أ' },
  { id: 2, username: 'مدير1', password: 'admin', role: 'مدير_مكتب', name: 'محمد العمري', avatar: 'م' },
  { id: 3, username: 'موظف2', password: '5678', role: 'موظف_نهمة', name: 'فهد الدوسري', avatar: 'ف' },
]

// ─── Drivers ──────────────────────────────────────────────
export const DRIVERS_DATA: Driver[] = [
  {
    id: 1, seq: 1, ownerName: 'أحمد محمد العمري', type: 'س', plate: 'ع ب ج 1234',
    phone: '0501234567', status: 'نشط', statusReason: null, currentTrip: null, violation: null,
    compensationBalance: 0, separator: 'أ',
    joinDate: '2023-05-10',
    guarantors: [
      { id: 1, name: 'سعد العمري', phone: '0507654321', status: 'فعال', nationalId: '1023456789' },
      { id: 2, name: 'ناصر القحطاني', phone: '0503219876', status: 'فعال', nationalId: '1034567890' },
    ]
  },
  {
    id: 2, seq: 2, ownerName: 'محمد علي الغامدي', type: 'ع', plate: 'ع ب د 5678',
    phone: '0502345678', status: 'نشط', statusReason: null, currentTrip: 'فرزة', violation: null,
    compensationBalance: 1500, separator: 'م',
    joinDate: '2023-06-20',
    guarantors: [
      { id: 3, name: 'علي الغامدي', phone: '0508765432', status: 'فعال', nationalId: '1045678901' },
    ]
  },
  {
    id: 3, seq: 3, ownerName: 'عبدالله سعد القحطاني', type: 'س', plate: 'ر ز م 9012',
    phone: '0503456789', status: 'نشط', statusReason: null, currentTrip: null, violation: 'ت',
    compensationBalance: 0, separator: 'ع',
    joinDate: '2023-07-15',
    guarantors: [
      { id: 4, name: 'سعد القحطاني', phone: '0504321098', status: 'فعال', nationalId: '1056789012' },
    ]
  },
  {
    id: 4, seq: 4, ownerName: 'سلطان فهد الشمري', type: 'ع', plate: 'ح ط س 3456',
    phone: '0504567890', status: 'نشط', statusReason: null, currentTrip: null, violation: null,
    compensationBalance: 2000, separator: 'س',
    joinDate: '2023-08-01',
    guarantors: [
      { id: 5, name: 'ناصر الشمري', phone: '0509876543', status: 'فعال', nationalId: '1067890123' },
      { id: 6, name: 'بدر الشمري', phone: '0501234098', status: 'فعال', nationalId: '1078901234' },
    ]
  },
  {
    id: 5, seq: 5, ownerName: 'خالد عمر الزهراني', type: 'س', plate: 'ع ز ث 7890',
    phone: '0505678901', status: 'غير_نشط', statusReason: 'مفروز', currentTrip: null, violation: null,
    compensationBalance: 0, separator: 'خ',
    joinDate: '2023-04-05',
    guarantors: []
  },
  {
    id: 6, seq: 6, ownerName: 'فيصل ناصر الحربي', type: 'ع', plate: 'ب ج ح 2345',
    phone: '0506789012', status: 'نشط', statusReason: null, currentTrip: 'م1', violation: null,
    compensationBalance: 500, separator: 'ف',
    joinDate: '2023-09-12',
    guarantors: [
      { id: 7, name: 'حمد الحربي', phone: '0501234987', status: 'فعال', nationalId: '1089012345' },
    ]
  },
  {
    id: 7, seq: 7, ownerName: 'عمر سعيد العتيبي', type: 'س', plate: 'م ن ع 6789',
    phone: '0507890123', status: 'غير_نشط', statusReason: 'مخالف_ح', currentTrip: null, violation: 'ح',
    compensationBalance: 0, separator: 'ع',
    joinDate: '2023-03-20',
    guarantors: []
  },
  {
    id: 8, seq: 8, ownerName: 'عبدالرحمن حمد الدوسري', type: 'ع', plate: 'ل و ص 0123',
    phone: '0508901234', status: 'نشط', statusReason: null, currentTrip: 'م2', violation: null,
    compensationBalance: 3200, separator: 'ع',
    joinDate: '2023-10-08',
    guarantors: [
      { id: 8, name: 'سعيد الدوسري', phone: '0502349876', status: 'فعال', nationalId: '1090123456' },
      { id: 9, name: 'جابر الدوسري', phone: '0503216789', status: 'منتهي', nationalId: '1091234567' },
    ]
  },
  {
    id: 9, seq: 9, ownerName: 'تركي يوسف الرشيدي', type: 'س', plate: 'د ه ت 4567',
    phone: '0509012345', status: 'غير_نشط', statusReason: 'بدون_ضمانة', currentTrip: null, violation: null,
    compensationBalance: 0, separator: 'ت',
    joinDate: '2023-11-01',
    guarantors: []
  },
  {
    id: 10, seq: 10, ownerName: 'نواف عبدالعزيز السبيعي', type: 'ع', plate: 'ك ل م 8901',
    phone: '0500123456', status: 'نشط', statusReason: null, currentTrip: null, violation: null,
    compensationBalance: 800, separator: 'ن',
    joinDate: '2023-12-15',
    guarantors: [
      { id: 10, name: 'يوسف السبيعي', phone: '0503219876', status: 'فعال', nationalId: '1012345678' },
    ]
  },
  {
    id: 11, seq: 11, ownerName: 'بدر عبدالله المطيري', type: 'س', plate: 'ث ج خ 2345',
    phone: '0501239876', status: 'نشط', statusReason: null, currentTrip: null, violation: null,
    compensationBalance: 1200, separator: 'ب',
    joinDate: '2024-01-05',
    guarantors: [
      { id: 11, name: 'فهد المطيري', phone: '0506789123', status: 'فعال', nationalId: '1023456780' },
    ]
  },
  {
    id: 12, seq: 12, ownerName: 'وليد محمد العنزي', type: 'ع', plate: 'ذ ر ز 6789',
    phone: '0502348765', status: 'نشط', statusReason: null, currentTrip: 'تعويض', violation: null,
    compensationBalance: 4500, separator: 'و',
    joinDate: '2024-01-10',
    guarantors: [
      { id: 12, name: 'مشعل العنزي', phone: '0508765901', status: 'فعال', nationalId: '1034567801' },
    ]
  },
  {
    id: 13, seq: 13, ownerName: 'راشد سعد الثبيتي', type: 'س', plate: 'ط ظ ع 0123',
    phone: '0503457654', status: 'غير_نشط', statusReason: 'ملغي', currentTrip: null, violation: null,
    compensationBalance: 0, separator: 'ر',
    joinDate: '2023-02-14',
    guarantors: []
  },
  {
    id: 14, seq: 14, ownerName: 'حمدان علي الهاجري', type: 'ع', plate: 'غ ف ق 4567',
    phone: '0504566543', status: 'نشط', statusReason: null, currentTrip: null, violation: null,
    compensationBalance: 600, separator: 'ح',
    joinDate: '2024-01-12',
    guarantors: [
      { id: 13, name: 'جاسم الهاجري', phone: '0501238765', status: 'فعال', nationalId: '1045678012' },
    ]
  },
  {
    id: 15, seq: 15, ownerName: 'ماجد عبدالله الشهري', type: 'س', plate: 'ك ل م 8902',
    phone: '0505675432', status: 'نشط', statusReason: null, currentTrip: null, violation: 'ت',
    compensationBalance: 0, separator: 'م',
    joinDate: '2024-01-14',
    guarantors: [
      { id: 14, name: 'عبدالله الشهري', phone: '0509876234', status: 'فعال', nationalId: '1056789023' },
    ]
  },
]

// ─── Trips ────────────────────────────────────────────────
export const TRIPS_DATA: Trip[] = [
  { id: 1, driverId: 2, type: 'فرزة', payload: 'قمح', province: 'الرياض', destination: 'جدة', breakNum: 'F001', status: 'معلقة', createdAt: '2024-01-15 08:30' },
  { id: 2, driverId: 6, type: 'م1', payload: 'أسمنت', province: 'مكة المكرمة', destination: 'المدينة المنورة', breakNum: 'M101', status: 'معلقة', createdAt: '2024-01-15 09:15' },
  { id: 3, driverId: 8, type: 'م2', payload: 'حديد', province: 'الدمام', destination: 'الرياض', breakNum: 'M201', status: 'معلقة', createdAt: '2024-01-15 10:00' },
  { id: 4, driverId: 12, type: 'تعويض', payload: '-', province: 'الرياض', destination: '-', breakNum: 'T001', status: 'معلقة', createdAt: '2024-01-15 11:30', compensationAmount: 4500 },
  { id: 5, driverId: 1, type: 'فرزة', payload: 'أغذية', province: 'الرياض', destination: 'القصيم', breakNum: 'F002', status: 'مكتملة', createdAt: '2024-01-14 07:00', completedAt: '2024-01-14 18:00' },
  { id: 6, driverId: 4, type: 'م1', payload: 'رمل', province: 'جدة', destination: 'الطائف', breakNum: 'M102', status: 'مكتملة', createdAt: '2024-01-13 08:00', completedAt: '2024-01-13 17:30' },
  { id: 7, driverId: 10, type: 'م2', payload: 'حصى', province: 'مكة المكرمة', destination: 'المدينة المنورة', breakNum: 'M202', status: 'مكتملة', createdAt: '2024-01-12 09:00', completedAt: '2024-01-12 20:00' },
  { id: 8, driverId: 11, type: 'فرزة', payload: 'تمور', province: 'المدينة', destination: 'الرياض', breakNum: 'F003', status: 'مكتملة', createdAt: '2024-01-11 07:30', completedAt: '2024-01-11 19:00' },
]

// ─── Violations ───────────────────────────────────────────
export const VIOLATIONS_DATA: Violation[] = [
  { id: 1, driverId: 3, driverName: 'عبدالله القحطاني', type: 'ت', date: '2024-01-15', raised: false, note: 'غياب عن كشف التحضير' },
  { id: 2, driverId: 7, driverName: 'عمر العتيبي', type: 'ح', date: '2024-01-14', raised: false, note: 'تجاوز الحمولة المسموحة بـ 20%' },
  { id: 3, driverId: 15, driverName: 'ماجد الشهري', type: 'ت', date: '2024-01-15', raised: false, note: 'غياب عن كشف التحضير' },
  { id: 4, driverId: 1, driverName: 'أحمد محمد العمري', type: 'ت', date: '2024-01-10', raised: true, raisedDate: '2024-01-12', note: 'غياب متكرر — ثالث مرة' },
  { id: 5, driverId: 4, driverName: 'سلطان الشمري', type: 'ح', date: '2024-01-08', raised: true, raisedDate: '2024-01-09', note: 'تجاوز الوزن المحدد' },
]

// ─── Breakdowns ───────────────────────────────────────────
export const BREAKDOWNS_DATA: Breakdown[] = [
  { id: 1, tripId: 5, tripType: 'فرزة', driverId: 1, driverName: 'أحمد العمري', plate: 'ع ب ج 1234', location: 'قريب', action: 'إبقاء_النهمة', date: '2024-01-14', status: 'منتهي' },
  { id: 2, tripId: 6, tripType: 'م1', driverId: 4, driverName: 'سلطان الشمري', plate: 'ح ط س 3456', location: 'بعيد', rescuerName: 'ورشة الأمل', breakNum: 'WS001', compensation: 800, date: '2024-01-13', status: 'منتهي' },
]

// ─── Notifications ────────────────────────────────────────
export const NOTIFICATIONS_DATA: Notification[] = [
  { id: 1, icon: '⚠️', type: 'مخالفة', title: 'مخالفة تحضير', message: 'تم تسجيل مخالفة (ت) للسائق عبدالله القحطاني', date: '2024-01-15 10:30', read: false },
  { id: 2, icon: '🚛', type: 'نهمة', title: 'تأكيد خروج', message: 'تم تأكيد خروج النهمة (فرزة) للسائق محمد الغامدي', date: '2024-01-15 09:45', read: false },
  { id: 3, icon: '🔔', type: 'استثناء', title: 'طلب استثناء', message: 'طلب استثناء مقدم من السائق عمر العتيبي', date: '2024-01-15 08:20', read: false },
  { id: 4, icon: '⚠️', type: 'مخالفة', title: 'مخالفة تحضير', message: 'تم تسجيل مخالفة (ت) للسائق ماجد الشهري', date: '2024-01-15 07:55', read: false },
  { id: 5, icon: '🔧', type: 'عطل', title: 'بلاغ عطل', message: 'تم تسجيل عطل بعيد للنهمة F003 — السائق أحمد العمري', date: '2024-01-14 16:00', read: true },
  { id: 6, icon: '✅', type: 'مخالفة', title: 'رفع مخالفة', message: 'تم رفع مخالفة السائق سلطان الشمري بتاريخ 08/01', date: '2024-01-14 11:00', read: true },
  { id: 7, icon: '🏦', type: 'ضمانة', title: 'اكتمال ضمانة', message: 'اكتملت ضمانة السائق تركي الرشيدي — الحد الأدنى مستوفى', date: '2024-01-13 14:30', read: true },
]
