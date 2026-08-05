import { useState, useMemo } from "react"
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
                        fontWeight: 800,
                        padding: "4px 12px",
                        borderRadius: 99,
                        background: v.type === "ت" ? "#FEE2E2" : "#FFF7ED",
                        color: v.type === "ت" ? T.danger : T.warning,
                      }}
                    >
                      مخالفة ({v.type})
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 99,
                        background: v.raised ? "#D1FAE5" : "#FEE2E2",
                        color: v.raised ? "#065F46" : "#991B1B",
                      }}
                    >
                      {v.raised ? "✅ مرفوعة" : "🔴 مفتوحة"}
                    </span>
                  </div>
                </div>
                {!v.raised && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setRaiseDialog({ id: v.id, name: v.driverName })}
                      style={{
                        flex: 1,
                        minWidth: 100,
                        padding: "10px",
                        borderRadius: 10,
                        border: "none",
                        background: T.success,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✅ رفع
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleType(v.id, v.type)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: `1px solid ${th.border}`,
                        background: "none",
                        color: T.primary,
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(v.id, v.driverName)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "none",
                        background: "#FEE2E2",
                        color: T.danger,
                        fontSize: 12,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      🗑 حذف
                    </button>
                  </div>
                )}
                {v.raisedDate && (
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: T.success }}>
                    ✅ رُفعت بتاريخ {v.raisedDate} — السائق قابل للإضافة للكشف
                  </p>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {showAdd && (
        <div style={{ position: "absolute", inset: 0, zIndex: 150 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowAdd(false)} />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: th.card,
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: th.text, fontSize: 16 }}>إضافة مخالفة</h3>
            <SearchableField
              label="السائق (نشط أو غير نشط)"
              value={addDriverLabel}
              onChange={setAddDriverLabel}
              options={driverOptions}
              placeholder="ابحث بالاسم أو اللوحة..."
            />
            <div style={{ marginBottom: 12 }} />
            {/* Task 38: date field */}
            <label style={{ fontSize: 12, color: th.sub, display: "block", marginBottom: 6 }}>تاريخ المخالفة</label>
            <input
              type="text"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              placeholder="مثال: 01/08/2026"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${th.border}`, background: th.inputBg,
                color: th.text, fontSize: 14, marginBottom: 12,
                fontFamily: "inherit", direction: "rtl", boxSizing: "border-box",
              }}
            />
            <label style={{ fontSize: 12, color: th.sub, display: "block", marginBottom: 6 }}>نوع المخالفة</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["ت", "ح"] as ViolationType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAddType(t)}
                  style={{
                    flex: 1,
                    padding: "11px",
                    borderRadius: 10,
                    border: "none",
                    background: addType === t ? T.danger : th.inputBg,
                    color: addType === t ? "#fff" : th.sub,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  مخالفة ({t})
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
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
                onClick={handleAdd}
                disabled={!addDriverLabel}
                style={{
                  flex: 2,
                  padding: "13px",
                  borderRadius: 12,
                  border: "none",
                  background: addDriverLabel ? T.danger : th.border,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: addDriverLabel ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                تأكيد ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {raiseDialog && (
        <div style={{ position: "absolute", inset: 0, zIndex: 160 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setRaiseDialog(null)} />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: th.card,
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
            }}
          >
            <h3 style={{ margin: "0 0 8px", color: th.text, fontSize: 16 }}>رفع مخالفة — {raiseDialog.name}</h3>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: th.sub }}>سبب الرفع (اختياري)</p>
            <input
              value={raiseReason}
              onChange={(e) => setRaiseReason(e.target.value)}
              placeholder="مثال: انتهت مدة المخالفة..."
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${th.border}`,
                marginBottom: 16,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setRaiseDialog(null)}
                style={{ flex: 1, padding: "13px", borderRadius: 12, border: `1px solid ${th.border}`, background: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => raise(raiseDialog.id, raiseDialog.name, raiseReason)}
                style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: T.success, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                ✅ تأكيد الرفع
              </button>
            </div>
          </div>
        </div>
      )}
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
    if (activeGuarantors.length === 0 && guaranteeFilter !== "all") return false
    const count = countActiveGuarantors(d)
    if (guaranteeFilter === "complete") return count >= state.minGuarantors
    if (guaranteeFilter === "incomplete") return count < state.minGuarantors && activeGuarantors.length > 0
    return activeGuarantors.length > 0 || guaranteeFilter === "all"
  })

  const guarantorGroups = useMemo(() => buildGuarantorGroups(state.drivers), [state.drivers])

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

      {tab === "guaranteed" && (
        <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, padding: "8px 16px", display: "flex", gap: 8 }}>
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
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{driver.ownerName}</p>
                        <p style={{ margin: "3px 0 0", fontSize: 12, color: th.sub }}>{driver.plate}</p>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: active >= state.minGuarantors ? "#D1FAE5" : "#FEE2E2",
                          color: active >= state.minGuarantors ? "#065F46" : "#991B1B",
                          flexShrink: 0,
                        }}
                      >
                        {active}/{state.minGuarantors}
                      </span>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <ActionIconBtn
                          icon="✏️"
                          title="تعديل الضامنين"
                          color={T.primary}
                          bg={th.dark ? "#1E3A5F" : "#EFF6FF"}
                          onClick={() => openGuaranteedEdit(driver.id)}
                        />
                        <ActionIconBtn
                          icon="🗑"
                          title="حذف جميع الضمانات"
                          color={T.danger}
                          bg="#FEE2E2"
                          onClick={() => deleteGuaranteesForDriver(driver.id, driver.ownerName)}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {activeGuarantors.length === 0 ? (
                        <span style={{ fontSize: 11, color: th.sub }}>لا يوجد ضامنون نشطون</span>
                      ) : (
                        activeGuarantors.map((g) => (
                          <span
                            key={g.id}
                            style={{
                              fontSize: 11,
                              padding: "4px 10px",
                              borderRadius: 99,
                              background: "#DBEAFE",
                              color: T.primary,
                              fontWeight: 600,
                            }}
                          >
                            🏦 {g.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
          )
        ) : guarantorGroups.length === 0 ? (
          <EmptyState icon="👥" text="لا يوجد ضامنون مسجلون" />
        ) : (
          guarantorGroups.map((group) => (
            <Card key={group.nationalId}>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: "#DBEAFE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    🏦
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{group.name}</p>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <ActionIconBtn
                          icon="✏️"
                          title="تعديل المضمونين"
                          color={T.primary}
                          bg={th.dark ? "#1E3A5F" : "#EFF6FF"}
                          onClick={() => openGuarantorEdit(group)}
                        />
                        <ActionIconBtn
                          icon="🗑"
                          title="إلغاء الضمانة لكل المالكين"
                          color={T.danger}
                          bg="#FEE2E2"
                          onClick={() => cancelAllForGuarantor(group.nationalId, group.name)}
                        />
                      </div>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: th.sub }}>{group.phone}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: th.text, lineHeight: 1.5 }}>
                      يضمن:{" "}
                      {group.entries.map((e) => e.driverName).join(" · ")}
                    </p>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 8,
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontWeight: 700,
                        background: "#D1FAE5",
                        color: "#065F46",
                      }}
                    >
                      {group.entries.length} مضمون
                    </span>
                  </div>
                </div>
              </div>
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

// ══════════════════════════════════════════════════════════
//  BREAKDOWNS SCREEN  (tasks 44-49, 55)
// ══════════════════════════════════════════════════════════
export function BreakdownsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [breakdownTrip, setBreakdownTrip] = useState<Trip | null>(null)
  const [editBreakdownId, setEditBreakdownId] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "نشط" | "منتهي">("all")
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
    return matchesSearch && matchesStatus
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
export function ReportsScreen() {
  const { state, showSnackbar } = useApp()
  const th = useTheme()
  const [period, setPeriod] = useState('week')

  const totalDrivers = state.drivers.length
  const activeDrivers = state.drivers.filter(d => d.status === 'نشط').length
  const completedTrips = state.trips.filter(t => t.status === 'مكتملة').length
  const totalViolations = state.violations.length
  const totalComp = state.drivers.reduce((s, d) => s + d.compensationBalance, 0)

  const tripTypeCounts = (['فرزة', 'م1', 'م2', 'تعويض'] as const).map((type) => ({
    type,
    count: state.trips.filter((t) => t.type === type && t.status === 'مكتملة').length,
  }))

  const topViolators = [...state.violations]
    .reduce<{ name: string; count: number }[]>((acc, v) => {
      const existing = acc.find((x) => x.name === v.driverName)
      if (existing) existing.count += 1
      else acc.push({ name: v.driverName, count: 1 })
      return acc
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <StandardAppBar title="التقارير" back="home" />

      <div style={{ padding: '10px 16px 0', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 11, color: th.sub, fontWeight: 600 }}>{APP_FULL_BRAND}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر'], ['year', 'سنة']].map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)}
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
            { label: 'إجمالي البوابير', value: totalDrivers, icon: '🚛', color: T.primary },
            { label: 'النشطين', value: activeDrivers, icon: '✅', color: T.success },
            { label: 'النهمات المكتملة', value: completedTrips, icon: '🚀', color: T.accent },
            { label: 'المخالفات', value: totalViolations, icon: '⚠️', color: T.danger },
            { label: 'التعويضات (ر)', value: totalComp.toLocaleString(), icon: '💰', color: T.warning },
            { label: 'الأعطال', value: state.breakdowns.length, icon: '🔧', color: '#8B5CF6' },
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

        {/* Export buttons */}
        <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
          تصدير
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: '📄 تصدير PDF', color: '#DC2626' },
            { label: '📊 تصدير Excel', color: '#16A34A' },
            { label: '💾 تصدير قاعدة البيانات', color: T.primary },
            { label: '📥 استيراد قاعدة البيانات', color: '#7C3AED' },
          ].map(btn => (
            <button key={btn.label}
              onClick={() => showSnackbar(`${btn.label} — تم الإرسال ✅`)}
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

// ══════════════════════════════════════════════════════════
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
                background: user.role === 'مدير_مكتب' ? '#DBEAFE' : '#F0FDF4',
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
