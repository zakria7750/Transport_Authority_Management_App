export const TRANSPORT_AUTHORITY = "هيئة النقل"
export const OFFICE_BRAND = "مكتب تعز"
export const APP_NAME = "نظام البوابير"
export const APP_VERSION = "٢٫٠"
export const APP_FULL_BRAND = `${TRANSPORT_AUTHORITY} — ${OFFICE_BRAND} — ${APP_NAME}`
export const APP_SHORT_BRAND = `${OFFICE_BRAND} · ${APP_NAME}`
export const APP_TAGLINE = `${APP_NAME} — الإصدار ${APP_VERSION}`
export const APP_PRINT_HEADER = APP_FULL_BRAND

export const YEMEN_PROVINCES = [
  "أبين",
  "إب",
  "أمانة العاصمة",
  "البيضاء",
  "تعز",
  "حجة",
  "حضرموت",
  "الجوف",
  "الحديدة",
  "المحويت",
  "المهرة",
  "ذمار",
  "شبوة",
  "صعدة",
  "صنعاء",
  "عدن",
  "عمران",
  "لحج",
  "مأرب",
  "ريمة",
  "سقطرى",
] as const

export const PAYLOAD_OPTIONS = ["زيت", "صابون", "سمن"] as const

export const DESTINATION_TYPES = ["وكيل", "فرع", "تصدير"] as const

export type DestinationType = (typeof DESTINATION_TYPES)[number]

export const DESTINATION_SUGGESTIONS = [
  "عدن",
  "تعز",
  "الحديدة",
  "إب",
  "حضرموت",
  "المكلا",
  "ميناء",
  "صنعاء",
  "ذمار",
  "مأرب",
  "لحج",
  "أبين",
] as const

export const ADDABLE_STATUS_REASONS = [
  "مفروز",
  "ملغي",
  "بدون_ضمانة",
  "قابل_للإضافة",
] as const
