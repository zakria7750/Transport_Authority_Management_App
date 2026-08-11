const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩"
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

function normalizeDigits(value: string): string {
  return [...value]
    .map((character) => {
      const arabicIndex = ARABIC_DIGITS.indexOf(character)
      if (arabicIndex >= 0) return String(arabicIndex)
      const persianIndex = PERSIAN_DIGITS.indexOf(character)
      return persianIndex >= 0 ? String(persianIndex) : character
    })
    .join("")
}

/**
 * Converts the date formats used by the local state to a calendar-only key.
 * Keeping the key in the local calendar avoids timezone and locale-string
 * comparisons when a record contains Arabic digits or a time component.
 */
export function dateKey(value: string | Date | undefined | null): string | null {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-")
  }

  const normalized = normalizeDigits(value)
    .replace(/[\u200e\u200f\u061c]/g, "")
    .trim()

  const iso = normalized.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`
  }

  const dayFirst = normalized.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (dayFirst) {
    return `${dayFirst[3]}-${dayFirst[2].padStart(2, "0")}-${dayFirst[1].padStart(2, "0")}`
  }

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : dateKey(parsed)
}

export function todayKey(): string {
  return dateKey(new Date()) ?? "1970-01-01"
}

export function shiftDateKey(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + days)
  return dateKey(date) ?? value
}

export function isDateInRange(value: string, from: string, to: string): boolean {
  const key = dateKey(value)
  return Boolean(key && key >= from && key <= to)
}

export function formatDateForReport(value: string): string {
  return dateKey(value) ?? value
}