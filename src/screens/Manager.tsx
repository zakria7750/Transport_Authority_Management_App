import { useState } from "react"
import { useApp } from "../context"
import { AppBar, useTheme, T, Card, EmptyState, SkeletonRow } from "../components"
import BreakdownSheet from "../BreakdownSheet"
import { countActiveGuarantors } from "../domain"
import type { ViolationType, UserRole, Trip, Guarantor } from "../data"
import { nextId } from "../domain"

// ══════════════════════════════════════════════════════════
//  VIOLATIONS SCREEN
// ══════════════════════════════════════════════════════════
export function ViolationsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [filterRaised, setFilterRaised] = useState<"all" | "open" | "raised">("all")
  const [showAdd, setShowAdd] = useState(false)
  const [addDriverId, setAddDriverId] = useState<number | "">("")
  const [addType, setAddType] = useState<ViolationType>("ت")
  const [loading, setLoading] = useState(false)

  const eligibleDrivers = state.drivers.filter(
    (d) => d.status === "نشط" && !d.violation,
  )

  const filtered = state.violations.filter((v) => {
    if (filterRaised === "open") return !v.raised
    if (filterRaised === "raised") return v.raised
    return true
  })

  const raise = (id: number, driverName: string) => {
    dispatch({ type: "RAISE_VIOLATION", violationId: id })
    showSnackbar(`تم رفع مخالفة السائق ${driverName} — أصبح قابل للإضافة ✅`)
  }

  const handleAdd = () => {
    if (!addDriverId) return
    const driver = state.drivers.find((d) => d.id === addDriverId)
    if (!driver) return
    dispatch({ type: "ADD_VIOLATION", driverId: addDriverId, vType: addType })
    showSnackbar(`تم تسجيل مخالفة (${addType}) للسائق ${driver.ownerName}`, () => {
      dispatch({ type: "UNDO_VIOLATION_BY_DRIVER", driverId: addDriverId })
    })
    setShowAdd(false)
    setAddDriverId("")
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
      <AppBar
        title="المخالفات"
        back="more"
        leftSlot={
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
                      onClick={() => raise(v.id, v.driverName)}
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
            <label style={{ fontSize: 12, color: th.sub, display: "block", marginBottom: 6 }}>السائق</label>
            <select
              value={addDriverId}
              onChange={(e) => setAddDriverId(e.target.value ? Number(e.target.value) : "")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${th.border}`,
                marginBottom: 12,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            >
              <option value="">اختر سائقاً نشطاً...</option>
              {eligibleDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ownerName} · {d.plate}
                </option>
              ))}
            </select>
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
                disabled={!addDriverId}
                style={{
                  flex: 2,
                  padding: "13px",
                  borderRadius: 12,
                  border: "none",
                  background: addDriverId ? T.danger : th.border,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: addDriverId ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                تأكيد ✓
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
export function GuaranteesScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [tab, setTab] = useState<"guaranteed" | "guarantors">("guaranteed")
  const [guaranteeFilter, setGuaranteeFilter] = useState<"all" | "complete" | "incomplete">("all")
  const [editDriverId, setEditDriverId] = useState<number | null>(null)
  const [editGuarantors, setEditGuarantors] = useState<Guarantor[]>([])

  const driversWithGuarantors = state.drivers.filter((d) => {
    if (d.guarantors.length === 0 && guaranteeFilter !== "all") return false
    const count = countActiveGuarantors(d)
    if (guaranteeFilter === "complete") return count >= state.minGuarantors
    if (guaranteeFilter === "incomplete") return count < state.minGuarantors
    return d.guarantors.length > 0 || guaranteeFilter === "all"
  })

  const allGuarantors = state.drivers.flatMap((d) =>
    d.guarantors.map((g) => ({ ...g, driverName: d.ownerName, driverId: d.id })),
  )

  const openEdit = (driverId: number) => {
    const driver = state.drivers.find((d) => d.id === driverId)
    if (!driver) return
    setEditDriverId(driverId)
    setEditGuarantors(driver.guarantors.map((g) => ({ ...g })))
  }

  const saveGuarantors = () => {
    if (editDriverId === null) return
    dispatch({ type: "UPDATE_GUARANTORS", driverId: editDriverId, guarantors: editGuarantors })
    showSnackbar("تم حفظ الضمانات ✅")
    setEditDriverId(null)
  }

  const cancelAllForGuarantor = (nationalId: string, name: string) => {
    dispatch({ type: "CANCEL_GUARANTOR", guarantorNationalId: nationalId })
    showSnackbar(`تم إلغاء جميع ضمانات ${name}`, () => {})
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden", position: "relative" }}>
      <AppBar title="الضمانات" back="more" />

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
            onClick={() => dispatch({ type: "SET_MIN_GUARANTORS", min: Math.max(1, state.minGuarantors - 1) })}
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
              return (
                <Card key={driver.id}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div>
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
                        }}
                      >
                        {active}/{state.minGuarantors}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {driver.guarantors.map((g) => (
                        <span
                          key={g.id}
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 99,
                            background: g.suspended ? "#FEE2E2" : g.status === "فعال" ? "#DBEAFE" : "#F1F5F9",
                            color: g.suspended ? T.danger : g.status === "فعال" ? T.primary : th.sub,
                            fontWeight: 600,
                          }}
                        >
                          🏦 {g.name}
                          {g.suspended ? " (معلّق)" : ""}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(driver.id)}
                      style={{
                        width: "100%",
                        padding: "9px",
                        borderRadius: 10,
                        border: `1px solid ${th.border}`,
                        background: "none",
                        color: T.primary,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      ✏️ تعديل الضامنين
                    </button>
                  </div>
                </Card>
              )
            })
          )
        ) : allGuarantors.length === 0 ? (
          <EmptyState icon="👥" text="لا يوجد ضامنون مسجلون" />
        ) : (
          allGuarantors.map((g) => (
            <Card key={`${g.driverId}-${g.id}`}>
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
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
                  }}
                >
                  🏦
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{g.name}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: th.sub }}>
                    {g.phone} · يضمن: {g.driverName}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontWeight: 700,
                      background: g.status === "فعال" && !g.suspended ? "#D1FAE5" : "#FEE2E2",
                      color: g.status === "فعال" && !g.suspended ? "#065F46" : "#991B1B",
                    }}
                  >
                    {g.suspended ? "معلّق" : g.status}
                  </span>
                  {g.status === "فعال" && (
                    <button
                      type="button"
                      onClick={() => cancelAllForGuarantor(g.nationalId, g.name)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        border: "none",
                        background: "#FEE2E2",
                        color: T.danger,
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      إلغاء الضمانات
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {editDriverId !== null && (
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
              maxHeight: "80%",
              overflowY: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: th.text, fontSize: 16 }}>تعديل الضامنين</h3>
            {editGuarantors.map((g, idx) => (
              <div key={g.id} style={{ marginBottom: 12 }}>
                <input
                  value={g.name}
                  onChange={(e) => {
                    const next = [...editGuarantors]
                    next[idx] = { ...g, name: e.target.value }
                    setEditGuarantors(next)
                  }}
                  placeholder="اسم الضامن"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${th.border}`,
                    marginBottom: 6,
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px dashed ${th.border}`,
                    fontSize: 12,
                    color: th.sub,
                    cursor: "pointer",
                  }}
                >
                  صورة الضمانة
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => {
                        const next = [...editGuarantors]
                        next[idx] = { ...g, guaranteeImage: reader.result as string }
                        setEditGuarantors(next)
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                  <span style={{ color: g.guaranteeImage ? T.success : T.primary }}>
                    {g.guaranteeImage ? "✓ مرفق" : "رفع"}
                  </span>
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setEditGuarantors([
                  ...editGuarantors,
                  {
                    id: nextId(),
                    name: "",
                    phone: "05" + Math.floor(10000000 + Math.random() * 90000000),
                    nationalId: "10" + Math.floor(10000000 + Math.random() * 90000000),
                    status: "فعال",
                  },
                ])
              }
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 10,
                border: `1px dashed ${T.primary}`,
                background: "none",
                color: T.primary,
                marginBottom: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              + إضافة ضامن
            </button>
            <div style={{ display: "flex", gap: 8 }}>
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
                onClick={saveGuarantors}
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
//  BREAKDOWNS SCREEN
// ══════════════════════════════════════════════════════════
export function BreakdownsScreen() {
  const { state } = useApp()
  const th = useTheme()
  const [breakdownTrip, setBreakdownTrip] = useState<Trip | null>(null)

  const completedTrips = state.trips.filter((t) => t.status === "مكتملة")

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden", position: "relative" }}>
      <AppBar title="الأعطال" back="more" />

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "12px 16px 0" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>
            النهمات المكتملة
          </p>
        </div>

        {completedTrips.length === 0 ? (
          <EmptyState icon="🔧" text="لا توجد نهمات مكتملة" />
        ) : (
          completedTrips.map((trip) => {
            const driver = state.drivers.find((d) => d.id === trip.driverId)
            const breakdown = state.breakdowns.find((b) => b.tripId === trip.id)
            return (
              <div
                key={trip.id}
                style={{
                  margin: "0 16px 10px",
                  background: th.card,
                  borderRadius: 14,
                  border: `1px solid ${th.border}`,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{driver?.ownerName}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: th.sub }}>
                      {trip.type} · {trip.breakNum}
                    </p>
                    {trip.type !== "تعويض" && (
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: th.muted }}>
                        {trip.province} → {trip.destination}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 99,
                      background: breakdown ? "#FEF9C3" : "#D1FAE5",
                      color: breakdown ? "#B45309" : "#065F46",
                    }}
                  >
                    {breakdown ? "🔧 عطل مسجل" : "✅ سليم"}
                  </span>
                </div>

                {breakdown && (
                  <div
                    style={{
                      marginTop: 10,
                      background: th.dark ? "#1E2D40" : "#FEF9C3",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "#92400E",
                    }}
                  >
                    📍 {breakdown.location} · {breakdown.action?.replace("_", " ")}
                    {breakdown.rescuerName && ` · مسعف: ${breakdown.rescuerName}`}
                    {breakdown.compensationGiven != null && ` · تعويض: ${breakdown.compensationGiven} ر`}
                  </div>
                )}

                {!breakdown && (
                  <button
                    type="button"
                    onClick={() => setBreakdownTrip(trip)}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: "8px",
                      borderRadius: 10,
                      border: `1px solid ${th.border}`,
                      background: "none",
                      color: T.warning,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    🔧 تسجيل عطل
                  </button>
                )}
              </div>
            )
          })
        )}

        {state.breakdowns.length > 0 && (
          <div style={{ padding: "12px 16px 0" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>
              سجل الأعطال
            </p>
            {state.breakdowns.map((b) => (
              <div
                key={b.id}
                style={{
                  margin: "0 0 10px",
                  background: th.card,
                  borderRadius: 14,
                  border: `1px solid ${th.border}`,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{b.driverName}</p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: th.sub }}>
                      {b.plate} · {b.tripType} · {b.date}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontWeight: 700,
                      background: b.status === "نشط" ? "#FEF9C3" : "#F1F5F9",
                      color: b.status === "نشط" ? "#B45309" : th.sub,
                    }}
                  >
                    {b.status}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: th.sub }}>
                  📍 {b.location} {b.action && `· ${b.action.replace("_", " ")}`}
                  {b.rescuerName && ` · مسعف: ${b.rescuerName}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {breakdownTrip && (
        <BreakdownSheet trip={breakdownTrip} onClose={() => setBreakdownTrip(null)} />
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="التقارير" back="more" />

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
      <AppBar title="إدارة المستخدمين" back="more"
        leftSlot={
          <button onClick={() => setShowAdd(true)}
            style={{ background: T.primary, border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
