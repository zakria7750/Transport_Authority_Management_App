import { useState, useMemo, useRef } from "react"
import { useApp } from "../context"
import { useTheme, T, Card, EmptyState, SkeletonRow, SearchableField, SearchableRosterField, APP_FULL_BRAND, StandardAppBar } from "../components"
import BreakdownSheet from "../BreakdownSheet"
import {
  countActiveGuarantors,
  canBeGuarantor,
  canPersonGuarantee,
  guarantorFromRosterDriver,
  matchesNameOrPlate,
  eligibleGuarantorDrivers,
} from "../domain"
import type { ViolationType, UserRole, Trip, Guarantor, Driver } from "../data"
import { nextId } from "../domain"

// ══════════════════════════════════════════════════════════
//  VIOLATIONS SCREEN
// ══════════════════════════════════════════════════════════
export function ViolationsScreen() {
  const { state, dispatch, showSnackbar, scheduleDeferredViolation } = useApp()
  const th = useTheme()
  const [filterRaised, setFilterRaised] = useState<"all" | "open" | "raised">("all")
  const [showAdd, setShowAdd] = useState(false)
  const [addDriverLabel, setAddDriverLabel] = useState("")
  const [addType, setAddType] = useState<ViolationType>("ت")
  const [loading, setLoading] = useState(false)
  const [raiseDialog, setRaiseDialog] = useState<{ id: number; name: string } | null>(null)
  const [raiseReason, setRaiseReason] = useState("")
  // Task 38: date field for adding violation
  const [addDate, setAddDate] = useState(() => new Date().toLocaleDateString("ar-SA"))

  // Task 36: eligible drivers includes inactive (all drivers without active violation)
  const eligibleDrivers = state.drivers.filter((d) => !d.violation)
  const driverOptions = eligibleDrivers.map((d) => `${d.ownerName} · ${d.plate} · ${d.status === "نشط" ? "نشط" : "غير نشط"}`)

  const filtered = state.violations.filter((v) => {
    if (filterRaised === "open") return !v.raised
    if (filterRaised === "raised") return v.raised
    return true
  })

  const raise = (id: number, driverName: string, reason?: string) => {
    dispatch({ type: "RAISE_VIOLATION", violationId: id, reason })
    showSnackbar(`تم رفع مخالفة السائق ${driverName} — أصبح قابل للإضافة ✅`)
    setRaiseDialog(null)
    setRaiseReason("")
  }

  const handleAdd = () => {
    const driver = eligibleDrivers.find((d) => `${d.ownerName} · ${d.plate} · ${d.status === "نشط" ? "نشط" : "غير نشط"}` === addDriverLabel)
    if (!driver) return
    // Task 38: pass date; Task 39: pass recordedBy
    dispatch({ type: "ADD_VIOLATION", driverId: driver.id, vType: addType, date: addDate, recordedBy: state.user?.name })
    showSnackbar(`تم تسجيل مخالفة (${addType}) للسائق ${driver.ownerName} ✅`)
    setShowAdd(false)
    setAddDriverLabel("")
    setAddDate(new Date().toLocaleDateString("ar-SA"))
  }

  const toggleType = (vId: number, current: ViolationType) => {
    const next: ViolationType = current === "ت" ? "ح" : "ت"
    dispatch({ type: "EDIT_VIOLATION", violationId: vId, vType: next })
    showSnackbar(`تم تعديل نوع المخالفة إلى (${next})`)
  }

  const remove = (vId: number, driverName: string) => {
    dispatch({ type: "DELETE_VIOLATION", violationId: vId })
    showSnackbar(`تم حذف مخالفة ${driverName} واستعادة حالته`)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden", position: "relative" }}>
      <StandardAppBar
        title="المخالفات"
        back="home"
        extraLeft={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{
              background: T.danger,
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + إضافة
          </button>
        }
      />

      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, padding: "10px 16px", display: "flex", gap: 8 }}>
        {[
          ["all", "الكل"],
          ["open", "مفتوحة"],
          ["raised", "مرفوعة"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setLoading(true)
              setFilterRaised(k as typeof filterRaised)
              setTimeout(() => setLoading(false), 300)
            }}
            style={{
              padding: "6px 16px",
              borderRadius: 99,
              border: "none",
              background: filterRaised === k ? T.danger : th.dark ? "#1E2D40" : "#F1F5F9",
              color: filterRaised === k ? "#fff" : th.sub,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} dark={th.dark} />)
        ) : filtered.length === 0 ? (
          <EmptyState icon="✅" text="لا توجد مخالفات في هذا التصنيف" />
        ) : (
          filtered.map((v) => (
            <Card key={v.id}>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{v.driverName}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 12, color: th.sub }}>{v.note}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: th.muted }}>📅 {v.date}</p>
                    {/* Task 39: show recordedBy */}
                    {v.recordedBy && (
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: th.muted }}>👤 {v.recordedBy}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 99,
                        background: v.type === "ت" ? "#FEE2E2" : "#FEF9C3",
                        color: v.type === "ت" ? "#991B1B" : "#92400E",
                      }}
                    >
                      {v.type}
                    </span>
                    {!v.raised && (
                      <button
                        type="button"
                        onClick={() => setRaiseDialog({ id: v.id, name: v.driverName })}
                        style={{
                          background: "none",
                          border: "none",
                          color: T.success,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        رفع ↗️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
            ))
        )}
      </div>

      {/* Raise Dialog */}
      {raiseDialog && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 80 }} onClick={() => setRaiseDialog(null)} />
          <div
            style={{
              position: "fixed",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              background: th.card,
              borderRadius: 16,
              padding: 20,
              zIndex: 90,
              maxWidth: 320,
              border: `1px solid ${th.border}`,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: th.text }}>رفع المخالفة</h3>
            <p style={{ margin: "8px 0 12px", fontSize: 13, color: th.sub }}>يرجى إدخال سبب الرفع</p>
            <textarea
              value={raiseReason}
              onChange={(e) => setRaiseReason(e.target.value)}
              placeholder="السبب..."
              style={{
                width: "100%",
                minHeight: 80,
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${th.border}`,
                background: th.inputBg,
                color: th.text,
                fontSize: 13,
                fontFamily: "inherit",
                direction: "rtl",
                boxSizing: "border-box",
                outline: "none",
                resize: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setRaiseDialog(null)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: `1px solid ${th.border}`,
                  background: "none",
                  color: th.sub,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() =>raise(raiseDialog.id, raiseDialog.name, raiseReason)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: T.success,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                رفع ✅
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  DRIVER MANAGEMENT SCREEN (Task 73-75)
// ══════════════════════════════════════════════════════════
export function DriverManagementScreen() {
  const { state, dispatch, showSnackbar, navigate } = useApp()
  const th = useTheme()
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all")
  const [search, setSearch] = useState("")

  const filtered = state.drivers.filter((d) => {
    const matchFilter = filter === "all" || (filter === "active" ? d.status === "نشط" : d.status === "غير_نشط")
    const matchSearch = !search || d.ownerName.includes(search) || d.plate.includes(search)
    return matchFilter && matchSearch
  })

  const canDelete = (driver: Driver) => {
    // Task 74: Cannot delete if has active trips/violations/guarantees
    const hasTrips = state.trips.some((t) => t.driverId === driver.id && (t.status === "مؤكدة_مبدئياً" || t.status === "معلقة"))
    const hasViolations = state.violations.some((v) => v.driverId === driver.id && !v.raised)
    const hasGuarantees = driver.guarantors.some((g) => g.status === "فعال")
    return !hasTrips && !hasViolations && !hasGuarantees
  }

  const handleDelete = (driverId: number, name: string) => {
    if (!canDelete(state.drivers.find((d) => d.id === driverId)!)) {
      showSnackbar("لا يمكن حذف السائق — لديه نهمات أو مخالفات أو ضمانات نشطة ⚠️")
      return
    }
    if (!window.confirm(`⚠️ هل أنت متأكد من حذف ${name}؟\nسيتم حذف السائق من الكشف، ولا يجب تنفيذ هذه العملية إلا إذا كنت متأكداً.`)) return
    dispatch({ type: "DELETE_DRIVER", driverId })
    showSnackbar(`تم حذف ${name} ✅`)
  }

  const handleDisable = (driverId: number, name: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في تعطيل هذا السائق؟")) return
    dispatch({ type: "DISABLE_DRIVER", driverId })
    showSnackbar(`تم تعطيل ${name} مع الاحتفاظ ببياناته ✅`)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden" }}>
      <StandardAppBar title="إدارة السائقين" back="home" />

      <div style={{ padding: "12px 16px", background: th.card, borderBottom: `1px solid ${th.border}`, display: "flex", gap: 8 }}>
        {[
          ["all", "الكل"],
          ["active", "النشطين"],
          ["inactive", "غير النشطين"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k as typeof filter)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 10,
              border: "none",
              background: filter === k ? T.primary : th.dark ? "#1E2D40" : "#F1F5F9",
              color: filter === k ? "#fff" : th.sub,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 16px", background: th.card, borderBottom: `1px solid ${th.border}` }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو اللوحة..."
            style={{
              width: "100%",
              padding: "10px 40px 10px 12px",
              borderRadius: 10,
              border: `1px solid ${th.border}`,
              background: th.inputBg,
              color: th.text,
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              direction: "rtl",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: th.sub }}>لا يوجد سائقين مطابقين</p>
          </div>
        ) : (
          filtered.map((driver) => (
            <div
              key={driver.id}
              style={{
                margin: "10px 16px",
                border: `1px solid ${th.border}`,
                borderRadius: 14,
                padding: "14px",
                background: th.card,
                boxShadow: "0 4px 14px rgba(15,23,42,.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: driver.status === "نشط" ? "#D1FAE5" : "#FEE2E2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {driver.status === "نشط" ? "✓" : "✕"}
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate("driver-profile", { driverId: driver.id })}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{driver.ownerName}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: th.sub }}>
                  {driver.plate} · نوع البابور: {driver.type} · {driver.status === "نشط" ? "نشط" : "غير نشط"}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: th.muted }}>الهاتف: {driver.phone || "غير مسجل"}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => navigate("driver-profile", { driverId: driver.id })} style={{ flex: 1, padding: "8px 6px", borderRadius: 9, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>تعديل</button>
              <button type="button" onClick={() => handleDisable(driver.id, driver.ownerName)} disabled={driver.status !== "نشط"} style={{ flex: 1, padding: "8px 6px", borderRadius: 9, border: "none", background: driver.status === "نشط" ? "#FEF3C7" : th.inputBg, color: driver.status === "نشط" ? T.warning : th.muted, fontSize: 11, fontWeight: 700, cursor: driver.status === "نشط" ? "pointer" : "not-allowed", fontFamily: "inherit" }}>تعطيل</button>
              <button type="button" onClick={() => handleDelete(driver.id, driver.ownerName)} disabled={!canDelete(driver)} style={{ flex: 1, padding: "8px 6px", borderRadius: 9, border: "none", background: canDelete(driver) ? "#FEE2E2" : th.inputBg, color: canDelete(driver) ? T.danger : th.muted, fontSize: 11, fontWeight: 700, cursor: canDelete(driver) ? "pointer" : "not-allowed", fontFamily: "inherit" }}>حذف</button>
            </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  GUARANTEES SCREEN
// ══════════════════════════════════════════════════════════

type GuarantorGroup = {
  nationalId: string
  name: string
  phone: string
  sourceDriverId?: number
  entries: { driverId: number; driverName: string; plate: string; guarantorId: number }[]
}

function buildGuarantorGroups(drivers: Driver[]): GuarantorGroup[] {
  const map = new Map<string, GuarantorGroup>()
  for (const d of drivers) {
    for (const g of d.guarantors) {
      if (g.status !== "فعال" || g.suspended) continue
      let group = map.get(g.nationalId)
      if (!group) {
        group = {
          nationalId: g.nationalId,
          name: g.name,
          phone: g.phone,
          sourceDriverId: g.sourceDriverId,
          entries: [],
        }
        map.set(g.nationalId, group)
      }
      group.entries.push({
        driverId: d.id,
        driverName: d.ownerName,
        plate: d.plate,
        guarantorId: g.id,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"))
}

function ActionIconBtn({
  icon,
  title,
  color,
  bg,
  onClick,
}: {
  icon: string
  title: string
  color: string
  bg: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: "none",
        background: bg,
        color,
        fontSize: 15,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  )
}

export function GuaranteesScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [tab, setTab] = useState<"guaranteed" | "guarantors">("guaranteed")
  const [guaranteeFilter, setGuaranteeFilter] = useState<"all" | "complete" | "incomplete">("all")
  const [guaranteeSearch, setGuaranteeSearch] = useState("")
  const [editDriverId, setEditDriverId] = useState<number | null>(null)
  const [editGuarantors, setEditGuarantors] = useState<Guarantor[]>([])
  const [addGuarantorSearch, setAddGuarantorSearch] = useState("")
  const [editGuarantorGroup, setEditGuarantorGroup] = useState<GuarantorGroup | null>(null)
  const [editGuaranteedIds, setEditGuaranteedIds] = useState<number[]>([])
  const [addGuaranteedSearch, setAddGuaranteedSearch] = useState("")

  const guarantorCandidates = useMemo(
    () => eligibleGuarantorDrivers(state.drivers).filter(canBeGuarantor),
    [state.drivers],
  )

  const driversWithGuarantors = state.drivers.filter((d) => {
    const activeGuarantors = d.guarantors.filter((g) => g.status === "فعال" && !g.suspended)
    const q = guaranteeSearch.trim().toLocaleLowerCase("ar")
    const matchesSearch = !q || `${d.ownerName} ${d.plate} ${activeGuarantors.map((g) => g.name).join(" ")}`.toLocaleLowerCase("ar").includes(q)
    if (!matchesSearch) return false
    if (activeGuarantors.length === 0 && guaranteeFilter !== "all") return false
    const count = countActiveGuarantors(d)
    if (guaranteeFilter === "complete") return count >= state.minGuarantors
    if (guaranteeFilter === "incomplete") return count < state.minGuarantors && activeGuarantors.length > 0
    return activeGuarantors.length > 0 || guaranteeFilter === "all"
  })

  const guarantorGroups = useMemo(() => buildGuarantorGroups(state.drivers).filter((group) => {
    const q = guaranteeSearch.trim().toLocaleLowerCase("ar")
    return !q || `${group.name} ${group.phone} ${group.entries.map((entry) => entry.driverName).join(" ")}`.toLocaleLowerCase("ar").includes(q)
  }), [state.drivers, guaranteeSearch])

  const editDriver = editDriverId !== null ? state.drivers.find((d) => d.id === editDriverId) : undefined

  const openGuaranteedEdit = (driverId: number) => {
    const driver = state.drivers.find((d) => d.id === driverId)
    if (!driver) return
    setEditDriverId(driverId)
    setEditGuarantors(
      driver.guarantors.filter((g) => g.status === "فعال" && !g.suspended).map((g) => ({ ...g })),
    )
    setAddGuarantorSearch("")
  }

  const saveGuaranteedEdit = () => {
    if (editDriverId === null || !editDriver) return
    const activeIds = new Set(editGuarantors.map((g) => g.id))
    const historical = editDriver.guarantors.filter((g) => g.status === "منتهي")
    const newlyEnded = editDriver.guarantors
      .filter((g) => g.status === "فعال" && !activeIds.has(g.id))
      .map((g) => ({ ...g, status: "منتهي" as const, suspended: false }))
    dispatch({
      type: "UPDATE_GUARANTORS",
      driverId: editDriverId,
      guarantors: [...historical, ...newlyEnded, ...editGuarantors],
    })
    showSnackbar(`تم حفظ ضامنين ${editDriver.ownerName} ✅`)
    setEditDriverId(null)
  }

  const deleteGuaranteesForDriver = (driverId: number, name: string) => {
    if (!window.confirm(`حذف جميع ضمانات ${name}؟`)) return
    const driver = state.drivers.find((d) => d.id === driverId)
    if (!driver) return
    const ended = driver.guarantors
      .filter((g) => g.status === "فعال")
      .map((g) => ({ ...g, status: "منتهي" as const, suspended: false }))
    const historical = driver.guarantors.filter((g) => g.status === "منتهي")
    dispatch({ type: "UPDATE_GUARANTORS", driverId, guarantors: [...historical, ...ended] })
    showSnackbar(`تم حذف جميع ضمانات ${name}`)
  }

  const addGuarantorToEdit = (source: Driver) => {
    if (!canBeGuarantor(source)) {
      showSnackbar("لا يمكن للمخالف أن يكون ضامناً ⚠️")
      return
    }
    if (source.id === editDriverId) {
      showSnackbar("لا يمكن للمالك أن يضمن نفسه ⚠️")
      return
    }
    if (editGuarantors.some((g) => g.sourceDriverId === source.id || g.name === source.ownerName)) {
      showSnackbar("الضامن مضاف مسبقاً")
      return
    }
    setEditGuarantors((p) => [...p, guarantorFromRosterDriver(source, nextId())])
    setAddGuarantorSearch("")
    showSnackbar(`تمت إضافة ${source.ownerName} كضامن`)
  }

  const openGuarantorEdit = (group: GuarantorGroup) => {
    setEditGuarantorGroup(group)
    setEditGuaranteedIds(group.entries.map((e) => e.driverId))
    setAddGuaranteedSearch("")
  }

  const saveGuarantorEdit = () => {
    if (!editGuarantorGroup) return
    const template = {
      name: editGuarantorGroup.name,
      phone: editGuarantorGroup.phone,
      nationalId: editGuarantorGroup.nationalId,
      sourceDriverId: editGuarantorGroup.sourceDriverId,
    }
    if (editGuaranteedIds.length > 0 && !canPersonGuarantee(state.drivers, template)) {
      showSnackbar("لا يمكن للمخالف ضمان الآخرين ⚠️")
      return
    }
    dispatch({
      type: "SET_GUARANTOR_TARGETS",
      template,
      targetDriverIds: editGuaranteedIds,
    })
    showSnackbar(`تم حفظ مضمونين ${editGuarantorGroup.name} ✅`)
    setEditGuarantorGroup(null)
  }

  const cancelAllForGuarantor = (nationalId: string, name: string) => {
    if (!window.confirm(`إلغاء ضمان ${name} لجميع المالكين المضمونين؟`)) return
    dispatch({ type: "CANCEL_GUARANTOR", guarantorNationalId: nationalId })
    showSnackbar(`تم إلغاء جميع ضمانات ${name} لكل المالكين`)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden", position: "relative" }}>
      <StandardAppBar title="الضمانات" back="home" />

      <div
        style={{
          background: th.card,
          borderBottom: `1px solid ${th.border}`,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>🎯 الحد الأدنى للضامنين</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_MIN_GUARANTORS", min: Math.max(0, state.minGuarantors - 1) })}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: `1px solid ${th.border}`,
              background: "none",
              color: th.text,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            −
          </button>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.primary, minWidth: 24, textAlign: "center" }}>
            {state.minGuarantors}
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_MIN_GUARANTORS", min: state.minGuarantors + 1 })}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: `1px solid ${th.border}`,
              background: "none",
              color: th.text,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, display: "flex" }}>
        {[
          ["guaranteed", "🏦 المضمونون"],
          ["guarantors", "👥 الضامنون"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k as typeof tab)}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              background: "none",
              color: tab === k ? T.primary : th.sub,
              borderBottom: `2px solid ${tab === k ? T.primary : "transparent"}`,
              fontSize: 13,
              fontWeight: tab === k ? 700 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding: "10px 16px", background: th.bg }}>
        <input value={guaranteeSearch} onChange={(e) => setGuaranteeSearch(e.target.value)} placeholder="بحث باسم المالك أو الضامن أو اللوحة..." aria-label="بحث الضمانات" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, direction: "rtl", fontFamily: "inherit" }} />
      </div>

      {tab === "guaranteed" && (
        <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, padding: "8px 16px", display: "flex", gap: 8, overflowX: "auto" }}>
          {[
            ["all", "الكل"],
            ["complete", "مكتمل"],
            ["incomplete", "ناقص"],
          ].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setGuaranteeFilter(k as typeof guaranteeFilter)}
              style={{
                padding: "5px 14px",
                borderRadius: 99,
                border: "none",
                background: guaranteeFilter === k ? T.primary : th.inputBg,
                color: guaranteeFilter === k ? "#fff" : th.sub,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {tab === "guaranteed" ? (
          driversWithGuarantors.length === 0 ? (
            <EmptyState icon="🏦" text="لا يوجد مضمونون في هذا التصنيف" />
          ) : (
            driversWithGuarantors.map((driver) => {
              const active = countActiveGuarantors(driver)
              const activeGuarantors = driver.guarantors.filter((g) => g.status === "فعال" && !g.suspended)
              return (
                <Card key={driver.id}>
                  <article style={{ padding: "16px", minWidth: 0 }}>
                    <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ margin: 0, color: th.text, fontSize: 15, lineHeight: 1.5, overflowWrap: "anywhere" }}>{driver.ownerName}</h3>
                        <p style={{ margin: "5px 0 0", color: th.sub, fontSize: 12, lineHeight: 1.5, overflowWrap: "anywhere" }}>لوحة: {driver.plate} · النوع: {driver.type || "غير محدد"}</p>
                      </div>
                      <span style={{ flexShrink: 0, padding: "4px 9px", borderRadius: 99, background: active >= state.minGuarantors ? (th.dark ? "#123d31" : "#dcfce7") : (th.dark ? "#4a2020" : "#fee2e2"), color: active >= state.minGuarantors ? T.success : T.danger, fontSize: 11, fontWeight: 800 }}>
                        {active >= state.minGuarantors ? "مكتمل" : "غير مكتمل"} {active}/{state.minGuarantors}
                      </span>
                    </header>
                    <section style={{ borderTop: `1px solid ${th.border}`, paddingTop: 12 }}>
                      <h4 style={{ margin: "0 0 9px", color: th.text, fontSize: 12 }}>الضامنون ({activeGuarantors.length})</h4>
                      {activeGuarantors.length === 0 ? <p style={{ margin: 0, color: th.sub, fontSize: 12 }}>لا توجد ضمانة مسجلة</p> : <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {activeGuarantors.slice(0, 3).map((g) => <div key={g.id} style={{ padding: "9px 10px", borderRadius: 10, background: th.surfaceVariant, border: `1px solid ${th.border}`, minWidth: 0 }}><p style={{ margin: 0, color: th.text, fontSize: 12, fontWeight: 700, overflowWrap: "anywhere" }}>{g.name}</p><p style={{ margin: "3px 0 0", color: th.sub, fontSize: 11, overflowWrap: "anywhere" }}>الهاتف: {g.phone || "غير مسجل"}</p></div>)}
                        {activeGuarantors.length > 3 && <p style={{ margin: 0, color: T.primary, fontSize: 11 }}>+ {activeGuarantors.length - 3} ضامنين آخرين</p>}
                      </div>}
                    </section>
                    <footer style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${th.border}` }}>
                      <button type="button" onClick={() => openGuaranteedEdit(driver.id)} style={{ flex: 1, minHeight: 38, border: `1px solid ${th.border}`, borderRadius: 9, background: th.inputBg, color: th.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>تعديل</button>
                      <button type="button" onClick={() => deleteGuaranteesForDriver(driver.id, driver.ownerName)} style={{ flex: 1, minHeight: 38, border: "none", borderRadius: 9, background: th.dark ? "#4a2020" : "#fee2e2", color: T.danger, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>إلغاء الضمانات</button>
                    </footer>
                  </article>
                </Card>
              )
            })
          )
        ) : guarantorGroups.length === 0 ? (
          <EmptyState icon="👥" text="لا يوجد ضامنون مسجلون" />
        ) : (
          guarantorGroups.map((group) => (
            <Card key={group.nationalId}>
              <article style={{ padding: "16px", minWidth: 0 }}>
                <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ margin: 0, color: th.text, fontSize: 15, lineHeight: 1.5, overflowWrap: "anywhere" }}>{group.name}</h3>
                    <p style={{ margin: "5px 0 0", color: th.sub, fontSize: 12, overflowWrap: "anywhere" }}>الهاتف: {group.phone || "غير مسجل"}</p>
                  </div>
                  <span style={{ flexShrink: 0, padding: "4px 9px", borderRadius: 99, background: th.dark ? "#123d31" : "#dcfce7", color: T.success, fontSize: 11, fontWeight: 800 }}>{group.entries.length} مضمون</span>
                </header>
                <section style={{ borderTop: `1px solid ${th.border}`, paddingTop: 12 }}>
                  <h4 style={{ margin: "0 0 9px", color: th.text, fontSize: 12 }}>المضمونون ({group.entries.length})</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {group.entries.map((entry) => <div key={`${entry.driverId}-${entry.guarantorId}`} style={{ padding: "9px 10px", borderRadius: 10, background: th.surfaceVariant, border: `1px solid ${th.border}`, minWidth: 0 }}><p style={{ margin: 0, color: th.text, fontSize: 12, fontWeight: 700, overflowWrap: "anywhere" }}>{entry.driverName}</p><p style={{ margin: "3px 0 0", color: th.sub, fontSize: 11, overflowWrap: "anywhere" }}>لوحة: {entry.plate}</p></div>)}
                  </div>
                </section>
                <footer style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${th.border}` }}>
                  <button type="button" onClick={() => openGuarantorEdit(group)} style={{ flex: 1, minHeight: 38, border: `1px solid ${th.border}`, borderRadius: 9, background: th.inputBg, color: th.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>تعديل</button>
                  <button type="button" onClick={() => cancelAllForGuarantor(group.nationalId, group.name)} style={{ flex: 1, minHeight: 38, border: "none", borderRadius: 9, background: th.dark ? "#4a2020" : "#fee2e2", color: T.danger, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>إلغاء الضمانات</button>
                </footer>
              </article>
            </Card>
          ))
        )}
      </div>

      {editDriverId !== null && editDriver && (
        <div style={{ position: "absolute", inset: 0, zIndex: 150 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setEditDriverId(null)} />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: th.card,
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
              maxHeight: "85%",
              overflowY: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 4px", color: th.text, fontSize: 16 }}>تعديل ضامنين — {editDriver.ownerName}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: th.sub }}>{editDriver.plate}</p>

            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: th.sub }}>الضامنون الحاليون</p>
            {editGuarantors.length === 0 ? (
              <p style={{ margin: "0 0 12px", fontSize: 12, color: th.sub }}>لا يوجد ضامنون — أضف من الكشف</p>
            ) : (
              editGuarantors.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: th.dark ? "#1E2D40" : "#F8FAFC",
                    marginBottom: 8,
                    border: `1px solid ${th.border}`,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: th.text }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: th.sub }}>{g.phone}</span>
                  <button
                    type="button"
                    onClick={() => setEditGuarantors((p) => p.filter((x) => x.id !== g.id))}
                    style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 16 }}
                    title="إلغاء الضامن"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}

            <SearchableRosterField
              label="إضافة ضامن من الكشف"
              query={addGuarantorSearch}
              onQueryChange={setAddGuarantorSearch}
              items={guarantorCandidates.filter(
                (d) =>
                  d.id !== editDriver.id &&
                  !editGuarantors.some((g) => g.sourceDriverId === d.id || g.name === d.ownerName),
              )}
              getKey={(d) => d.id}
              formatLabel={(d) => d.ownerName}
              formatSubLabel={(d) => `${d.plate} · ${d.status === "نشط" ? "نشط" : "غير نشط"}`}
              filterItem={(d, q) => matchesNameOrPlate(q, d.ownerName, d.plate)}
              onAction={addGuarantorToEdit}
              actionLabel="إضافة"
              placeholder="ابحث بالاسم أو اللوحة..."
              emptyHint="لا يوجد ضامن مطابق — المخالفون غير مسموح"
            />

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setEditDriverId(null)}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: 12,
                  border: `1px solid ${th.border}`,
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={saveGuaranteedEdit}
                style={{
                  flex: 2,
                  padding: "13px",
                  borderRadius: 12,
                  border: "none",
                  background: T.primary,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                حفظ ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {editGuarantorGroup && (
        <div style={{ position: "absolute", inset: 0, zIndex: 150 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setEditGuarantorGroup(null)} />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: th.card,
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
              maxHeight: "85%",
              overflowY: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 4px", color: th.text, fontSize: 16 }}>تعديل مضمونين — {editGuarantorGroup.name}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: th.sub }}>{editGuarantorGroup.phone}</p>
            {!canPersonGuarantee(state.drivers, editGuarantorGroup) && (
              <p
                style={{
                  margin: "0 0 12px",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#FEE2E2",
                  color: "#991B1B",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ⚠️ هذا الضامن مخالف — يمكنك إلغاء المضمونين فقط، لا إضافة جدد
              </p>
            )}

            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: th.sub }}>المالكون المضمونون حالياً</p>
            {editGuaranteedIds.length === 0 ? (
              <p style={{ margin: "0 0 12px", fontSize: 12, color: th.sub }}>لا يوجد مضمونون — أضف من الكشف</p>
            ) : (
              editGuaranteedIds.map((driverId) => {
                const d = state.drivers.find((x) => x.id === driverId)
                if (!d) return null
                return (
                  <div
                    key={driverId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: th.dark ? "#1E2D40" : "#F8FAFC",
                      marginBottom: 8,
                      border: `1px solid ${th.border}`,
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: th.text }}>{d.ownerName}</span>
                    <span style={{ fontSize: 11, color: th.sub }}>{d.plate}</span>
                    <button
                      type="button"
                      onClick={() => setEditGuaranteedIds((p) => p.filter((id) => id !== driverId))}
                      style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 16 }}
                      title="إلغاء الضمان"
                    >
                      ✕
                    </button>
                  </div>
                )
              })
            )}

            <SearchableRosterField
              label="إضافة مضمون (مالك) من الكشف"
              query={addGuaranteedSearch}
              onQueryChange={setAddGuaranteedSearch}
              items={state.drivers.filter((d) => !editGuaranteedIds.includes(d.id))}
              getKey={(d) => d.id}
              formatLabel={(d) => d.ownerName}
              formatSubLabel={(d) => `${d.plate} · ${d.status === "نشط" ? "نشط" : "غير نشط"}`}
              filterItem={(d, q) => matchesNameOrPlate(q, d.ownerName, d.plate)}
              onAction={(d) => {
                if (!canPersonGuarantee(state.drivers, editGuarantorGroup)) {
                  showSnackbar("لا يمكن للمخالف ضمان الآخرين ⚠️")
                  return
                }
                if (editGuaranteedIds.includes(d.id)) return
                setEditGuaranteedIds((p) => [...p, d.id])
                setAddGuaranteedSearch("")
                showSnackbar(`تمت إضافة ${d.ownerName} كمضمون`)
              }}
              actionLabel="إضافة"
              placeholder="ابحث بالاسم أو اللوحة..."
            />

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setEditGuarantorGroup(null)}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: 12,
                  border: `1px solid ${th.border}`,
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={saveGuarantorEdit}
                style={{
                  flex: 2,
                  padding: "13px",
                  borderRadius: 12,
                  border: "none",
                  background: T.primary,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                حفظ ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════�����═════
//  BREAKDOWNS SCREEN  (tasks 44-49, 55)
// ══════════════════════════════════════════════════════════
export function BreakdownsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [breakdownTrip, setBreakdownTrip] = useState<Trip | null>(null)
  const [editBreakdownId, setEditBreakdownId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "نشط" | "منتهي">("all")
  const [locationFilter, setLocationFilter] = useState<"all" | "قريب" | "بعيد">("all")
  // Task 48: manual add state
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [manualDriverSearch, setManualDriverSearch] = useState("")
  const [manualDriverId, setManualDriverId] = useState<number | null>(null)
  const [manualLocation, setManualLocation] = useState<"قريب" | "بعيد">("قريب")

  // All breakdowns (tasks 44-45: search + full list)
  const allBreakdowns = state.breakdowns.filter((b) => {
    const matchesSearch = !search ||
      b.driverName.includes(search) ||
      b.plate.includes(search) ||
      b.tripType?.includes(search)
    const matchesStatus = statusFilter === "all" || b.status === statusFilter
    const matchesLocation = locationFilter === "all" || b.location === locationFilter
    return matchesSearch && matchesStatus && matchesLocation
  })

  // Completed trips without a breakdown (for registering new breakdown)
  const completedTripsWithoutBreakdown = state.trips.filter(
    (t) => t.status === "مكتملة" && !state.breakdowns.find((b) => b.tripId === t.id)
  )

  const editTrip = editBreakdownId !== null
    ? state.trips.find((t) => t.id === state.breakdowns.find((b) => b.id === editBreakdownId)?.tripId)
    : undefined

  const handleDeleteBreakdown = (b: import("../data").Breakdown) => {
    const snap = { ...b }
    dispatch({ type: "DELETE_BREAKDOWN", breakdownId: b.id })
    showSnackbar(`تم حذف عطل ${b.driverName}`, () => {
      // Restore (re-add breakdown snapshot)
      dispatch({ type: "ADD_BREAKDOWN_MANUAL", driverId: b.driverId, location: b.location, date: b.date })
    })
  }

  const handleManualAdd = () => {
    if (!manualDriverId) return
    dispatch({ type: "ADD_BREAKDOWN_MANUAL", driverId: manualDriverId, location: manualLocation })
    showSnackbar("تم تسجيل العطل اليدوي ✅")
    setShowManualAdd(false)
    setManualDriverSearch("")
    setManualDriverId(null)
  }

  const filteredDriversForManual = state.drivers.filter(
    (d) => !manualDriverSearch || d.ownerName.includes(manualDriverSearch) || d.plate.includes(manualDriverSearch)
  ).slice(0, 6)

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden", position: "relative" }}>
      <StandardAppBar
        title="الأعطال"
        back="home"
        extraLeft={
          <button
            type="button"
            onClick={() => setShowManualAdd(true)}
            style={{
              background: T.warning, border: "none", borderRadius: 8,
              padding: "6px 12px", color: "#fff", fontSize: 12,
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            + إضافة
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, padding: '10px 16px', background: th.bg }}>
        {[
          ['مكتملة', completedTripsWithoutBreakdown.length, T.primary],
          ['قريبة', state.breakdowns.filter((b) => b.location === 'قريب').length, T.warning],
          ['بعيدة', state.breakdowns.filter((b) => b.location === 'بعيد').length, T.danger],
          ['مفتوحة', state.breakdowns.filter((b) => b.status === 'نشط').length, T.success],
        ].map(([label, value, color]) => <div key={label} style={{ minWidth: 0, background: th.card, border: `1px solid ${th.border}`, borderRadius: 12, padding: '9px 6px', textAlign: 'center' }}><strong style={{ display: 'block', color: color as string, fontSize: 18 }}>{value}</strong><span style={{ color: th.sub, fontSize: 10 }}>{label}</span></div>)}
      </div>

      {/* Task 44: search field */}
      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 بحث بالاسم أو اللوحة..."
          style={{
            width: "100%", padding: "9px 12px", borderRadius: 10,
            border: `1px solid ${th.border}`, background: th.inputBg,
            color: th.text, fontSize: 13, boxSizing: "border-box",
            fontFamily: "inherit", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {([["all", "الكل"], ["نشط", "جارية"], ["منتهي", "منتهية"]] as const).map(([k, l]) => (
            <button key={k} type="button"
              onClick={() => setStatusFilter(k)}
              style={{
                padding: "5px 14px", borderRadius: 99, border: "none",
                background: statusFilter === k ? T.warning : (th.dark ? "#1E2D40" : "#F1F5F9"),
                color: statusFilter === k ? "#fff" : th.sub,
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >{l}</button>
          ))}
          {([['all', 'كل المواقع'], ['قريب', 'قريب'], ['بعيد', 'بعيد']] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setLocationFilter(k)} style={{ padding: '5px 10px', borderRadius: 99, border: 'none', background: locationFilter === k ? T.primary : (th.dark ? '#1E2D40' : '#F1F5F9'), color: locationFilter === k ? '#fff' : th.sub, fontSize: 11, fontWeight: 600 }}>{l}</button>)}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Completed trips available for breakdown registration */}
        {completedTripsWithoutBreakdown.length > 0 && !search && statusFilter === "all" && (
          <>
            <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>
              نهمات تحتاج تسجيل عطل
            </p>
            {completedTripsWithoutBreakdown.slice(0, 5).map((trip) => {
              const driver = state.drivers.find((d) => d.id === trip.driverId)
              return (
                <div
                  key={trip.id}
                  style={{
                    background: th.card, borderRadius: 14,
                    border: `2px dashed ${T.warning}`, padding: "12px 14px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: th.text }}>{driver?.ownerName}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: th.sub }}>{trip.type} · {trip.breakNum}</p>
                  </div>
                  <button type="button" onClick={() => setBreakdownTrip(trip)}
                    style={{
                      padding: "7px 12px", borderRadius: 8, border: "none",
                      background: T.warning, color: "#fff", fontSize: 11,
                      fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >🔧 تسجيل</button>
                </div>
              )
            })}
            <div style={{ height: 1, background: th.border, margin: "4px 0" }} />
          </>
        )}

        {/* Tasks 45-49: full breakdown list with actions */}
        {allBreakdowns.length === 0 ? (
          <EmptyState icon="🔧" text="لا توجد أعطال" />
        ) : (
          allBreakdowns.map((b) => {
            const trip = b.tripId ? state.trips.find((t) => t.id === b.tripId) : undefined
            return (
              <div
                key={b.id}
                style={{
                  background: th.card, borderRadius: 14,
                  border: `1px solid ${b.status === "نشط" ? T.warning : th.border}`,
                  padding: "14px 16px",
                  animation: "rowInsert 0.25s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{b.driverName}</p>
                    {/* Task 45: full columns */}
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: th.sub }}>
                      {b.plate}
                      {b.tripType && ` · ${b.tripType}`}
                      {b.date && ` · ${b.date}`}
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: th.muted }}>
                      📍 {b.location}
                      {b.action && ` · ${b.action.replace("_", " ")}`}
                      {b.rescuerName && ` · مسعف: ${b.rescuerName}`}
                      {b.rescuerTripType && ` (${b.rescuerTripType})`}
                      {b.compensationGiven != null && ` · تعويض: ${b.compensationGiven} ر`}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                      background: b.status === "نشط" ? "#FEF9C3" : "#F1F5F9",
                      color: b.status === "نشط" ? "#B45309" : th.sub,
                      flexShrink: 0,
                    }}
                  >
                    {b.status === "نشط" ? "🔧 جارٍ" : "✅ منتهٍ"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  {/* Task 47: end trip button */}
                  {b.status === "نشط" && (
                    <button type="button"
                      onClick={() => {
                        dispatch({ type: "END_BREAKDOWN", breakdownId: b.id })
                        showSnackbar(`تم إنهاء عطل ${b.driverName} ✅`)
                      }}
                      style={{
                        flex: 1, minWidth: 80, padding: "7px 10px", borderRadius: 8, border: "none",
                        background: "#D1FAE5", color: "#065F46", fontSize: 11,
                        fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >✅ إنهاء</button>
                  )}
                  {/* Task 46: edit button */}
                  {trip && (
                    <button type="button"
                      onClick={() => setEditBreakdownId(b.id)}
                      style={{
                        flex: 1, minWidth: 70, padding: "7px 10px", borderRadius: 8,
                        border: `1px solid ${th.border}`, background: "none",
                        color: T.primary, fontSize: 11,
                        fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >✏️ تعديل</button>
                  )}
                  {/* Task 49: delete with undo */}
                  <button type="button"
                    onClick={() => handleDeleteBreakdown(b)}
                    style={{
                      padding: "7px 10px", borderRadius: 8, border: "none",
                      background: "#FEE2E2", color: T.danger, fontSize: 11,
                      fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >🗑</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {breakdownTrip && (
        <BreakdownSheet trip={breakdownTrip} onClose={() => setBreakdownTrip(null)} />
      )}

      {/* Task 46: edit breakdown via BreakdownSheet */}
      {editBreakdownId !== null && editTrip && (
        <BreakdownSheet
          trip={editTrip}
          breakdownId={editBreakdownId}
          onClose={() => setEditBreakdownId(null)}
        />
      )}

      {/* Task 48: manual add breakdown */}
      {showManualAdd && (
        <div style={{ position: "absolute", inset: 0, zIndex: 150 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowManualAdd(false)} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: th.card, borderRadius: "20px 20px 0 0",
            padding: "24px 20px 32px", maxHeight: "85%", overflowY: "auto",
          }}>
            <h3 style={{ margin: "0 0 16px", color: th.text, fontSize: 16 }}>إضافة عطل يدوي</h3>

            <input
              value={manualDriverSearch}
              onChange={(e) => setManualDriverSearch(e.target.value)}
              placeholder="بحث السائق بالاسم أو اللوحة..."
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${th.border}`, background: th.inputBg,
                color: th.text, fontSize: 13, marginBottom: 8,
                fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
            {filteredDriversForManual.map((d) => (
              <div key={d.id}
                onClick={() => { setManualDriverId(d.id); setManualDriverSearch(d.ownerName + " · " + d.plate) }}
                style={{
                  padding: "10px 12px", borderRadius: 8, marginBottom: 4,
                  background: manualDriverId === d.id ? "#EFF6FF" : (th.dark ? "#1E2D40" : "#F8FAFC"),
                  border: `1px solid ${manualDriverId === d.id ? T.primary : th.border}`,
                  cursor: "pointer", fontSize: 13, color: th.text,
                }}
              >
                {d.ownerName} · {d.plate}
              </div>
            ))}

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, color: th.sub, display: "block", marginBottom: 6 }}>موقع العطل</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["قريب", "بعيد"] as const).map((loc) => (
                  <button key={loc} type="button" onClick={() => setManualLocation(loc)}
                    style={{
                      flex: 1, padding: "10px", borderRadius: 10, border: "none",
                      background: manualLocation === loc ? T.warning : (th.dark ? "#1E2D40" : "#F1F5F9"),
                      color: manualLocation === loc ? "#fff" : th.sub,
                      fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >{loc}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button type="button" onClick={() => setShowManualAdd(false)}
                style={{ flex: 1, padding: "13px", borderRadius: 12, border: `1px solid ${th.border}`, background: "none", cursor: "pointer", fontFamily: "inherit" }}>
                إلغاء
              </button>
              <button type="button" onClick={handleManualAdd} disabled={!manualDriverId}
                style={{
                  flex: 2, padding: "13px", borderRadius: 12, border: "none",
                  background: manualDriverId ? T.warning : th.border,
                  color: "#fff", fontWeight: 700, cursor: manualDriverId ? "pointer" : "not-allowed", fontFamily: "inherit",
                }}>
                ✅ حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  REPORTS SCREEN
// ══════════════════════════════════════════════════════════
function EmptyReport({ text, th }: { text: string; th: ReturnType<typeof useTheme> }) {
  return <div style={{ padding: '18px 8px', textAlign: 'center', color: th.sub, fontSize: 12 }}>{text}</div>
}

export function ReportsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const importInputRef = useRef<HTMLInputElement>(null)
  const th = useTheme()
  const [period, setPeriod] = useState('week')
  // Task 60: Calendar date range instead of chips
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])

  const inRange = (value: string) => {
    const date = value.slice(0, 10)
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate)
  }
  const rangedTrips = state.trips.filter((trip) => inRange(trip.completedAt ?? trip.createdAt))
  const rangedViolations = state.violations.filter((violation) => inRange(violation.date))
  const rangedBreakdowns = state.breakdowns.filter((breakdown) => inRange(breakdown.date))
  const totalDrivers = state.drivers.length
  const activeDrivers = state.drivers.filter(d => d.status === 'نشط').length
  const inactiveDrivers = state.drivers.filter(d => d.status === 'غير_نشط').length
  const completedTrips = rangedTrips.filter(t => t.status === 'مكتملة').length
  const cancelledTrips = rangedTrips.filter(t => t.status === 'ملغاة').length
  const totalViolations = rangedViolations.length
  const totalComp = state.drivers.reduce((s, d) => s + d.compensationBalance, 0)

  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>
      const required = ["drivers", "trips", "violations", "breakdowns", "users"]
      if (!required.every((key) => Array.isArray(parsed[key]))) throw new Error("invalid")
      dispatch({ type: "IMPORT_DATA", data: {
        drivers: parsed.drivers as typeof state.drivers,
        trips: parsed.trips as typeof state.trips,
        violations: parsed.violations as typeof state.violations,
        breakdowns: parsed.breakdowns as typeof state.breakdowns,
        users: parsed.users as typeof state.users,
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications as typeof state.notifications : state.notifications,
        minGuarantors: typeof parsed.minGuarantors === "number" ? parsed.minGuarantors : state.minGuarantors,
      } })
      showSnackbar("تم استيراد النسخة الاحتياطية")
    } catch {
      showSnackbar("ملف النسخة الاحتياطية غير صالح")
    }
  }

  const tripTypeCounts = (['فرزة', 'م1', 'م2', 'تعويض'] as const).map((type) => ({
    type,
    count: rangedTrips.filter((t) => t.type === type && t.status === 'مكتملة').length,
  }))

  const topViolators = [...rangedViolations]
    .reduce<{ name: string; count: number }[]>((acc, v) => {
      const existing = acc.find((x) => x.name === v.driverName)
      if (existing) existing.count += 1
      else acc.push({ name: v.driverName, count: 1 })
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const pendingTrips = rangedTrips.filter((t) => ['مسودة', 'مؤكدة_مبدئياً', 'معلقة'].includes(t.status)).length
  const tripStatusCounts = [
    { label: 'مكتملة', value: completedTrips, color: T.success },
    { label: 'معلقة', value: rangedTrips.filter((t) => t.status === 'معلقة').length, color: T.warning },
    { label: 'ملغاة', value: cancelledTrips, color: T.danger },
  ]
  const provinceCounts = Object.entries(rangedTrips.reduce<Record<string, number>>((acc, t) => { acc[t.province] = (acc[t.province] ?? 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const payloadCounts = Object.entries(rangedTrips.reduce<Record<string, number>>((acc, t) => { acc[t.payload] = (acc[t.payload] ?? 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const closeBreakdowns = rangedBreakdowns.filter((b) => b.location === 'قريب').length
  const farBreakdowns = rangedBreakdowns.filter((b) => b.location === 'بعيد').length
  const raisedViolations = rangedViolations.filter((v) => v.raised).length
  const activeGuarantors = state.drivers.reduce((sum, d) => sum + d.guarantors.filter((g) => g.status === 'فعال' && !g.suspended).length, 0)
  const completeGuarantees = state.drivers.filter((d) => d.guarantors.filter((g) => g.status === 'فعال' && !g.suspended).length >= state.minGuarantors).length
  const detailedRows = rangedTrips.slice(0, 12)

  const resetRange = () => {
    setPeriod('week')
    const end = new Date()
    const start = new Date(end); start.setDate(end.getDate() - 7)
    setFromDate(start.toISOString().split('T')[0]); setToDate(end.toISOString().split('T')[0])
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <StandardAppBar title="التقارير" back="home" />

      <div style={{ padding: '10px 16px 0', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 11, color: th.sub, fontWeight: 600 }}>{APP_FULL_BRAND}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر'], ['year', 'سنة'], ['custom', 'مخصص']].map(([k, l]) => (
            <button key={k} onClick={() => {
              setPeriod(k)
              const end = new Date()
              const start = new Date(end)
              if (k === 'day') start.setDate(end.getDate())
              if (k === 'week') start.setDate(end.getDate() - 7)
              if (k === 'month') start.setMonth(end.getMonth() - 1)
              if (k === 'year') start.setFullYear(end.getFullYear() - 1)
              setFromDate(start.toISOString().split('T')[0])
              setToDate(end.toISOString().split('T')[0])
            }}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
                background: period === k ? T.primary : (th.dark ? '#1E2D40' : '#F1F5F9'),
                color: period === k ? '#fff' : th.sub,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{l}</button>
          ))}
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'إجمالي النهمات', value: rangedTrips.length, icon: '01', color: T.primary },
            { label: 'النهمات المكتملة', value: completedTrips, icon: '02', color: T.success },
            { label: 'النهمات الملغاة', value: cancelledTrips, icon: '03', color: T.danger },
            { label: 'النهمات المعلقة', value: pendingTrips, icon: '04', color: T.warning },
            { label: 'إجمالي الأعطال', value: rangedBreakdowns.length, icon: '05', color: '#8B5CF6' },
            { label: 'إجمالي المخالفات', value: totalViolations, icon: '06', color: T.danger },
            { label: 'السائقون النشطون', value: activeDrivers, icon: '07', color: T.success },
            { label: 'السائقون غير النشطين', value: inactiveDrivers, icon: '08', color: th.sub },
          ].map(s => (
            <Card key={s.label}>
              <div style={{ padding: '14px 16px' }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: '6px 0 2px' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: th.sub }}>{s.label}</div>
              </div>
            </Card>
          ))}
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
          توزيع النهمات المكتملة
        </p>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tripTypeCounts.map(({ type, count }) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: th.text, width: 48 }}>{type}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 99, background: th.dark ? '#2C2C2C' : '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{ width: `${completedTrips ? (count / completedTrips) * 100 : 0}%`, height: '100%', background: T.primary, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.primary, minWidth: 24 }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
          أكثر المخالفين
        </p>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ padding: '14px 16px' }}>
            {topViolators.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: th.sub, textAlign: 'center' }}>لا توجد مخالفات</p>
            ) : (
              topViolators.map((v, i) => (
                <div key={v.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < topViolators.length - 1 ? `1px solid ${th.border}` : 'none' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: T.danger, width: 20 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: th.text }}>{v.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: th.sub }}>{v.count} مخالفة</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
          <Card><div style={{ padding: 14 }}><p style={{ margin: '0 0 12px', fontWeight: 800, color: th.text }}>توزيع النهمات حسب الحالة</p>{tripStatusCounts.map((item) => <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}><span style={{ width: 58, fontSize: 11, color: th.sub }}>{item.label}</span><div style={{ flex: 1, height: 10, background: th.surfaceVariant, borderRadius: 99 }}><div style={{ width: `${rangedTrips.length ? item.value / rangedTrips.length * 100 : 0}%`, height: '100%', background: item.color, borderRadius: 99 }} /></div><strong style={{ color: item.color, fontSize: 12 }}>{item.value}</strong></div>)}</div></Card>
          <Card><div style={{ padding: 14 }}><p style={{ margin: '0 0 12px', fontWeight: 800, color: th.text }}>توزيع المحافظات</p>{provinceCounts.length ? provinceCounts.map(([name, value]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${th.border}`, fontSize: 12 }}><span style={{ color: th.text }}>{name}</span><strong style={{ color: T.primary }}>{value}</strong></div>) : <EmptyReport text="لا توجد بيانات خلال الفترة المحددة" th={th} />}</div></Card>
          <Card><div style={{ padding: 14 }}><p style={{ margin: '0 0 12px', fontWeight: 800, color: th.text }}>الحمولات</p>{payloadCounts.length ? payloadCounts.map(([name, value]) => <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${th.border}`, fontSize: 12 }}><span style={{ color: th.text }}>{name || 'بدون'}</span><strong style={{ color: T.accent }}>{value}</strong></div>) : <EmptyReport text="لا توجد بيانات خلال الفترة المحددة" th={th} />}</div></Card>
          <Card><div style={{ padding: 14 }}><p style={{ margin: '0 0 12px', fontWeight: 800, color: th.text }}>الأعطال</p><div style={{ display: 'flex', gap: 8 }}>{[['قريب', closeBreakdowns, T.warning], ['بعيد', farBreakdowns, T.danger], ['منتهي', rangedBreakdowns.filter((b) => b.status === 'منتهي').length, T.success]].map(([label, value, color]) => <div key={label} style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 10, background: th.surfaceVariant }}><strong style={{ display: 'block', color: color as string, fontSize: 20 }}>{value}</strong><span style={{ color: th.sub, fontSize: 10 }}>{label}</span></div>)}</div></div></Card>
        </div>

        <Card style={{ marginBottom: 16 }}><div style={{ padding: 14 }}><p style={{ margin: '0 0 12px', fontWeight: 800, color: th.text }}>تقرير المخالفات</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{[['إجمالي', totalViolations, T.danger], ['نوع ت', rangedViolations.filter((v) => v.type === 'ت').length, T.warning], ['نوع ح', rangedViolations.filter((v) => v.type === 'ح').length, T.primary], ['مرفوعة', raisedViolations, T.success], ['غير مرفوعة', totalViolations - raisedViolations, th.sub]].map(([label, value, color]) => <div key={label} style={{ flex: '1 1 90px', padding: 10, borderRadius: 10, background: th.surfaceVariant, textAlign: 'center' }}><strong style={{ display: 'block', color: color as string, fontSize: 19 }}>{value}</strong><span style={{ fontSize: 10, color: th.sub }}>{label}</span></div>)}</div></div></Card>

        <Card style={{ marginBottom: 16 }}><div style={{ padding: 14 }}><p style={{ margin: '0 0 12px', fontWeight: 800, color: th.text }}>حالة السائقين والضمانات</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>{[['السائقون', totalDrivers], ['القابلون للإضافة', state.drivers.filter((d) => d.statusReason === 'قابل_للإضافة').length], ['لديهم مخالفات', state.drivers.filter((d) => d.violation).length], ['لديهم ضمانات', state.drivers.filter((d) => d.guarantors.length > 0).length], ['ضمانات مكتملة', completeGuarantees], ['إجمالي الضامنين', activeGuarantors]].map(([label, value]) => <div key={label} style={{ padding: 9, borderRadius: 9, background: th.surfaceVariant, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}><span style={{ color: th.sub }}>{label}</span><strong style={{ color: T.primary }}>{value}</strong></div>)}</div></div></Card>

        <Card style={{ marginBottom: 16 }}><div style={{ padding: 14 }}><p style={{ margin: '0 0 12px', fontWeight: 800, color: th.text }}>التقرير التفصيلي</p>{detailedRows.length ? <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520, fontSize: 11 }}><thead><tr>{['النهمة', '��لمالك', 'المحافظة', 'النوع', 'الحالة'].map((h) => <th key={h} style={{ padding: 8, textAlign: 'right', color: th.sub, borderBottom: `1px solid ${th.border}` }}>{h}</th>)}</tr></thead><tbody>{detailedRows.map((trip) => <tr key={trip.id}>{[trip.breakNum, state.drivers.find((d) => d.id === trip.driverId)?.ownerName ?? '—', trip.province, trip.type, trip.status].map((cell, index) => <td key={index} style={{ padding: 8, color: th.text, borderBottom: `1px solid ${th.border}` }}>{cell}</td>)}</tr>)}</tbody></table></div> : <EmptyReport text="لا توجد بيانات خلال الفترة المحددة" th={th} />}</div></Card>

        {/* Date range for export - Task 60 */}
        <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '16px 0 10px' }}>
          <span>نطاق التاريخ</span>
          <button type="button" onClick={resetRange} style={{ float: 'left', border: 'none', background: 'transparent', color: T.primary, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>إعادة تعيين</button>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: 'block', marginBottom: 6 }}>من</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${th.border}`, background: th.card, color: th.text, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: 'block', marginBottom: 6 }}>إلى</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${th.border}`, background: th.card, color: th.text, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Export buttons - Task 64, 65, 66 */}
        <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
          تصدير
        </p>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void importBackup(file)
            event.target.value = ""
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { 
              label: 'طباعة التقرير', 
              color: '#DC2626',
              action: () => {
                window.print()
                showSnackbar('تم فتح نافذة الطباعة')
              }
            },
            { 
              label: '📊 تصدير Excel', 
              color: '#16A34A',
              action: () => {
                const csv = `اسم,القيمة\nإجمالي البوابير,${totalDrivers}\nالنشطين,${activeDrivers}\nالنهمات,${completedTrips}\nالمخالفات,${totalViolations}\nالتعويضات,${totalComp}`
                const blob = new Blob([csv], { type: 'text/csv' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `تقرير_${fromDate}_${toDate}.csv`
                a.click()
                showSnackbar('تم تصدير Excel ✅')
              }
            },
            { 
              label: '💾 تصدير قاعدة البيانات', 
              color: T.primary,
              action: () => {
                const backup = {
                  exportDate: new Date().toISOString(),
                  drivers: state.drivers,
                  trips: state.trips,
                  violations: state.violations,
                  breakdowns: state.breakdowns,
                  users: state.users,
                  notifications: state.notifications,
                }
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `backup_${new Date().toISOString().split('T')[0]}.json`
                a.click()
                showSnackbar('تم تصدير قاعدة البيانات ✅')
              }
            },
            { 
              label: 'استيراد قاعدة البيانات', 
              color: '#7C3AED',
              action: () => importInputRef.current?.click()
            },
          ].map(btn => (
            <button key={btn.label}
              onClick={btn.action}
              style={{
                padding: '14px 16px', borderRadius: 12,
                border: `1px solid ${th.border}`, background: th.card,
                color: btn.color, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>{btn.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════���══════════════════════
//  USERS SCREEN
// ══════════════════════════════════════════════════════════
export function UsersScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    role: "موظف_نهمة" as UserRole,
  })

  const handleAdd = () => {
    if (!newUser.username || !newUser.password || !newUser.name) return
    dispatch({ type: "ADD_USER", user: { ...newUser, id: nextId(), avatar: newUser.name.charAt(0) } })
    showSnackbar(`تم إضافة المستخدم ${newUser.name} ✅`)
    setShowAdd(false)
    setNewUser({ username: "", password: "", name: "", role: "موظف_نهمة" })
  }

  const handleDelete = (userId: number, name: string) => {
    dispatch({ type: 'DELETE_USER', userId })
    showSnackbar(`تم حذف المستخدم ${name}`, () => {})
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <StandardAppBar
        title="إدارة المستخدمين"
        back="home"
        extraLeft={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{ background: T.primary, border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            + إضافة
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {state.users.map(user => (
          <Card key={user.id}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: user.role === 'مدير_م��تب' ? '#DBEAFE' : '#F0FDF4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800,
                color: user.role === 'مدير_مكتب' ? T.primary : T.success,
              }}>{user.avatar}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{user.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: th.sub }}>@{user.username}</p>
                <span style={{
                  display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 99,
                  background: user.role === 'مدير_مكتب' ? '#DBEAFE' : '#F0FDF4',
                  color: user.role === 'مدير_مكتب' ? T.primary : T.success,
                }}>{user.role === "مدير_مكتب" ? "مدير مكتب" : user.role === "موظف_تسجيل" ? "موظف تسجيل" : "موظف نهمة"}</span>
              </div>
              {user.id !== state.user?.id && (
                <button onClick={() => handleDelete(user.id, user.name)}
                  style={{ background: '#FEE2E2', border: 'none', borderRadius: 8, padding: '8px 10px', color: T.danger, cursor: 'pointer', fontSize: 14 }}>
                  🗑
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 150 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowAdd(false)} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: th.card, borderRadius: '20px 20px 0 0',
            padding: '20px 20px 32px',
            animation: 'slideUp 0.3s ease',
          }}>
            <h3 style={{ color: th.text, margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>إضافة مستخدم جديد</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'الاسم الكامل', key: 'name', placeholder: 'أدخل الاسم' },
                { label: 'اسم المستخدم', key: 'username', placeholder: 'موظف3' },
                { label: 'كلمة المرور', key: 'password', placeholder: '••••••' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: th.sub, display: 'block', marginBottom: 6, fontWeight: 600 }}>{f.label}</label>
                  <input
                    value={newUser[f.key as keyof typeof newUser] as string}
                    onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    type={f.key === 'password' ? 'password' : 'text'}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${th.border}`, background: th.inputBg,
                      color: th.text, fontSize: 14, outline: 'none',
                      boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: th.sub, display: 'block', marginBottom: 6, fontWeight: 600 }}>الدور</label>
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as typeof newUser.role }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', direction: 'rtl' }}>
                  <option value="موظف_نهمة">موظف نهمة</option>
                  <option value="مدير_مكتب">مدير مكتب</option>
                  <option value="موظف_تسجيل">موظف تسجيل</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowAdd(false)}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.sub, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
                <button onClick={handleAdd}
                  style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: T.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✅ حفظ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
