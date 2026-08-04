import type {
  Driver,
  Guarantor,
  Trip,
  TripStatus,
  TripType,
  ViolationType,
  StatusReason,
  DriverStatus,
} from "./data"

let idCounter = 0
export function nextId(): number {
  idCounter += 1
  return Date.now() + idCounter
}

export function isOpenTripStatus(status: TripStatus): boolean {
  return status === "مؤكدة_مبدئياً" || status === "معلقة"
}

export function isPendingTripStatus(status: TripStatus): boolean {
  return isOpenTripStatus(status)
}

export function countActiveGuarantors(driver: Driver, minOverride?: number): number {
  void minOverride
  return driver.guarantors.filter((g) => g.status === "فعال" && !g.suspended).length
}

/** seq 1..n for active drivers only; inactive seq = 0 */
export function reindexActiveDrivers(drivers: Driver[]): Driver[] {
  const active = drivers
    .filter((d) => d.status === "نشط")
    .sort((a, b) => a.seq - b.seq || a.id - b.id)
  const seqMap = new Map(active.map((d, i) => [d.id, i + 1]))
  return drivers.map((d) =>
    d.status === "نشط" ? { ...d, seq: seqMap.get(d.id) ?? d.seq } : { ...d, seq: 0 },
  )
}

export function suggestNextBreakNum(trips: Trip[]): string {
  let max = 0
  for (const t of trips) {
    const n = parseInt(t.breakNum.replace(/\D/g, ""), 10)
    if (!Number.isNaN(n) && n > max) max = n
  }
  const next = max + 1
  return `F${String(next).padStart(3, "0")}`
}

export function suspendGuarantorsAsViolator(guarantors: Guarantor[], violatorId: number): Guarantor[] {
  return guarantors.map((g) =>
    g.status === "فعال" ? { ...g, suspended: true, suspendedForViolatorId: violatorId } : g,
  )
}

/** Suspend guarantor entries on other drivers when this driver becomes violator (same person as guarantor) */
export function suspendGuarantorObligations(drivers: Driver[], violatorDriverId: number): Driver[] {
  const violator = drivers.find((d) => d.id === violatorDriverId)
  if (!violator) return drivers
  const violatorNationalIds = new Set(violator.guarantors.map((g) => g.nationalId))
  return drivers.map((d) => {
    if (d.id === violatorDriverId) {
      return {
        ...d,
        guarantors: suspendGuarantorsAsViolator(d.guarantors, violatorDriverId),
      }
    }
    return {
      ...d,
      guarantors: d.guarantors.map((g) =>
        violatorNationalIds.has(g.nationalId) && g.status === "فعال"
          ? { ...g, suspended: true, suspendedForViolatorId: violatorDriverId }
          : g,
      ),
    }
  })
}

export function restoreGuarantorsFromSnapshot(
  drivers: Driver[],
  violatorDriverId: number,
  snapshotGuarantorsByDriverId: Map<number, Guarantor[]>,
): Driver[] {
  return drivers.map((d) => {
    const snap = snapshotGuarantorsByDriverId.get(d.id)
    if (snap) return { ...d, guarantors: snap.map((g) => ({ ...g })) }
    if (d.id === violatorDriverId) {
      return {
        ...d,
        guarantors: d.guarantors.map((g) => ({
          ...g,
          suspended: false,
          suspendedForViolatorId: undefined,
        })),
      }
    }
    return {
      ...d,
      guarantors: d.guarantors.map((g) =>
        g.suspendedForViolatorId === violatorDriverId
          ? { ...g, suspended: false, suspendedForViolatorId: undefined }
          : g,
      ),
    }
  })
}

export function captureGuarantorSnapshot(drivers: Driver[]): Map<number, Guarantor[]> {
  const m = new Map<number, Guarantor[]>()
  for (const d of drivers) {
    m.set(
      d.id,
      d.guarantors.map((g) => ({ ...g })),
    )
  }
  return m
}

export function isViolator(driver: Driver): boolean {
  if (driver.violation) return true
  if (driver.statusReason?.includes("مخالف")) return true
  return false
}

export function violatorCount(drivers: Driver[]): number {
  return drivers.filter((d) => isViolator(d)).length
}

export function statusReasonForViolation(vType: ViolationType): StatusReason {
  return vType === "ت" ? "مخالف_ت" : "مخالف_ح"
}

export function reactivateGuarantorsOnRaise(guarantors: Guarantor[]): Guarantor[] {
  return guarantors.map((g) => ({
    ...g,
    suspended: false,
    suspendedForViolatorId: undefined,
    status: g.status === "منتهي" ? g.status : "فعال",
  }))
}

export function getDriverOpenTrip(trips: Trip[], driverId: number): Trip | undefined {
  return trips.find((t) => t.driverId === driverId && isOpenTripStatus(t.status))
}

export function appendActiveDriver(drivers: Driver[], driverId: number): Driver[] {
  const maxSeq = Math.max(0, ...drivers.filter((d) => d.status === "نشط").map((d) => d.seq))
  return drivers.map((d) =>
    d.id === driverId ? { ...d, status: "نشط" as DriverStatus, statusReason: null, seq: maxSeq + 1 } : d,
  )
}

export function moveDriverToEndOfActive(drivers: Driver[], driverId: number): Driver[] {
  const updated = drivers.map((d) => (d.id === driverId ? { ...d, status: "نشط" as DriverStatus } : d))
  return reindexActiveDrivers(updated)
}

export function formatPayload(selected: string[]): string {
  if (selected.length === 0) return "غير محدد"
  return selected.join("، ")
}

export type TripCreateFields = {
  driverId: number
  tripType: TripType
  payload: string
  province: string
  destinationType: import("./data").DestinationType
  destination: string
  breakNum: string
}
