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

/** minGuarantors=0 → لا يُشترط وجود ضامنين */
export function meetsMinGuarantors(activeCount: number, min: number): boolean {
  return min === 0 || activeCount >= min
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

/** Suspend guarantor entries on other drivers when this driver becomes violator */
export function suspendGuarantorObligations(drivers: Driver[], violatorDriverId: number): Driver[] {
  const violator = drivers.find((d) => d.id === violatorDriverId)
  if (!violator) return drivers

  return drivers.map((d) => {
    let guarantors = d.guarantors.map((g) => {
      if (g.status !== "فعال") return g
      const isViolatorAsGuarantor =
        g.sourceDriverId === violatorDriverId || g.name === violator.ownerName
      if (isViolatorAsGuarantor) {
        return {
          ...g,
          status: "منتهي" as const,
          suspended: false,
          suspendedForViolatorId: undefined,
        }
      }
      return g
    })

    if (d.id === violatorDriverId) {
      guarantors = suspendGuarantorsAsViolator(guarantors, violatorDriverId)
    }

    return { ...d, guarantors }
  })
}

export function guarantorFromRosterDriver(source: Driver, id: number): Guarantor {
  const ref = source.guarantors.find((g) => g.status === "فعال")
  return {
    id,
    name: source.ownerName,
    phone: source.phone,
    nationalId: ref?.nationalId ?? `10${Math.floor(10000000 + Math.random() * 90000000)}`,
    status: "فعال",
    sourceDriverId: source.id,
  }
}

export function canBeGuarantor(driver: Driver): boolean {
  return !isViolator(driver) && !driver.violation
}

export function resolveGuarantorSourceDriver(
  drivers: Driver[],
  g: Pick<Guarantor, "sourceDriverId" | "name">,
): Driver | undefined {
  if (g.sourceDriverId) {
    const byId = drivers.find((d) => d.id === g.sourceDriverId)
    if (byId) return byId
  }
  return drivers.find((d) => d.ownerName === g.name)
}

export function isGuarantorPersonViolator(
  drivers: Driver[],
  g: Pick<Guarantor, "sourceDriverId" | "name">,
): boolean {
  const src = resolveGuarantorSourceDriver(drivers, g)
  return src ? !canBeGuarantor(src) : false
}

export function filterValidActiveGuarantors(guarantors: Guarantor[], drivers: Driver[]): Guarantor[] {
  return guarantors.map((g) => {
    if (g.status !== "فعال" || g.suspended) return g
    if (isGuarantorPersonViolator(drivers, g)) {
      return { ...g, status: "منتهي" as const, suspended: false }
    }
    return g
  })
}

export function canPersonGuarantee(
  drivers: Driver[],
  template: Pick<Guarantor, "name" | "sourceDriverId">,
): boolean {
  return !isGuarantorPersonViolator(drivers, template)
}

export function applyGuarantorGroupToDrivers(
  drivers: Driver[],
  template: Pick<Guarantor, "name" | "phone" | "nationalId" | "sourceDriverId">,
  targetDriverIds: number[],
  nextIdFn: () => number,
): Driver[] {
  const targetSet = new Set(targetDriverIds)
  const allowAdd = canPersonGuarantee(drivers, template)

  return drivers.map((d) => {
    let guarantors = d.guarantors.map((g) => {
      if (g.nationalId === template.nationalId && g.status === "فعال" && !targetSet.has(d.id)) {
        return { ...g, status: "منتهي" as const, suspended: false }
      }
      return g
    })

    if (
      allowAdd &&
      targetSet.has(d.id) &&
      !guarantors.some((g) => g.nationalId === template.nationalId && g.status === "فعال")
    ) {
      guarantors = [
        ...guarantors,
        {
          id: nextIdFn(),
          name: template.name,
          phone: template.phone,
          nationalId: template.nationalId,
          status: "فعال" as const,
          sourceDriverId: template.sourceDriverId,
        },
      ]
    }

    return { ...d, guarantors }
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

/** Sort for «الكل» filter: active (by seq) → inactive → violators */
export function sortDriversAllFilter(drivers: Driver[]): Driver[] {
  const rank = (d: Driver) => {
    if (d.status === "نشط") return 0
    if (isViolator(d)) return 2
    return 1
  }
  return [...drivers].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    if (ra === 0) return a.seq - b.seq || a.id - b.id
    return a.ownerName.localeCompare(b.ownerName, "ar")
  })
}

export function matchesNameOrPlate(query: string, name: string, plate: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const n = name.toLowerCase()
  const p = plate.toLowerCase()
  return n.includes(q) || p.includes(q) || `${n} ${p}`.includes(q)
}

/** مسعفون من الكشف: نشط (بدون نهمة) أو غير نشط — بدون مخالفات */
export function eligibleRescueDrivers(drivers: Driver[], excludeDriverId: number): Driver[] {
  return drivers.filter((d) => {
    if (d.id === excludeDriverId || d.violation) return false
    if (d.status === "نشط") return !d.currentTrip
    return d.status === "غير_نشط"
  })
}

/** ضامنون محتملون من الكشف: نشط أو غير نشط — بدون مخالفات */
export function eligibleGuarantorDrivers(drivers: Driver[]): Driver[] {
  return drivers.filter(
    (d) => !d.violation && (d.status === "نشط" || d.status === "غير_نشط"),
  )
}

export function collectRosterGuarantors(drivers: Driver[]): Guarantor[] {
  const seen = new Set<string>()
  const out: Guarantor[] = []
  for (const d of drivers) {
    for (const g of d.guarantors) {
      if (g.status !== "فعال" || seen.has(g.nationalId)) continue
      seen.add(g.nationalId)
      out.push(g)
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, "ar"))
}
