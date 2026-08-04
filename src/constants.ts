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

export const ADDABLE_STATUS_REASONS = [
  "مفروز",
  "ملغي",
  "بدون_ضمانة",
  "قابل_للإضافة",
] as const
