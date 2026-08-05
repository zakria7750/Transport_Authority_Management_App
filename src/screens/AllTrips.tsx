import { useMemo, useRef, useState } from "react"
import { useApp } from "../context"
import { StandardAppBar, useTheme, T, Card, EmptyState, useInfiniteScroll, SkeletonRow } from "../components"
import TripSheet from "../TripSheet"
import type { Trip, TripStatus, TripType } from "../data"

const STATUS_LABELS: Record<TripStatus, string> = {
  مسودة: "مسودة",
  مؤكدة_مبدئياً: "مؤكدة",
  معلقة: "معلقة",
  مكتملة: "مكتملة",
  ملغاة: "ملغاة",
}

export default function AllTripsScreen() {
  const { state, dispatch, showSnackbar, navigate } = useApp()
  const th = useTheme()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<TripStatus | "الكل">("الكل")
  const [typeFilter, setTypeFilter] = useState<TripType | "الكل">("الكل")
  const [editTrip, setEditTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return state.trips.filter((t) => {
      const driver = state.drivers.find((d) => d.id === t.driverId)
      const name = driver?.ownerName ?? ""
      const plate = driver?.plate ?? ""
      if (statusFilter !== "الكل" && t.status !== statusFilter) return false
      if (typeFilter !== "الكل" && t.type !== typeFilter) return false
      if (!q) return true
      return (
        name.includes(q) ||
        plate.includes(q) ||
        t.destination.includes(q) ||
        t.breakNum.includes(q)
      )
    })
  }, [state.trips, state.drivers, search, statusFilter, typeFilter])

  const { visibleItems, totalItems, hasMore } = useInfiniteScroll(filtered, 20, scrollRef)

  const handleDelete = (trip: Trip) => {
    if (trip.status !== "ملغاة" && trip.status !== "مسودة") {
      showSnackbar("يمكن حذف المسودات والنهمات الملغاة فقط ⚠️")
      return
    }
    const driver = state.drivers.find((d) => d.id === trip.driverId)
    dispatch({ type: "DELETE_TRIP", tripId: trip.id })
    showSnackbar(`تم حذف النهمة (${trip.type})`, () => {
      if (driver) {
        dispatch({ type: "RESTORE_TRIP", trip, driver })
      }
    })
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden" }}>
      <StandardAppBar title="لوحة النهمات" back="home" />

      <div style={{ padding: "10px 16px", background: th.card, borderBottom: `1px solid ${th.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالسائق، اللوحة، الوجهة، رقم الفك..."
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: `1px solid ${th.border}`,
            background: th.inputBg,
            color: th.text,
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            direction: "rtl",
          }}
        />
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {(["الكل", "مؤكدة_مبدئياً", "مكتملة", "ملغاة", "مسودة"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setLoading(true)
                setStatusFilter(s)
                setTimeout(() => setLoading(false), 250)
              }}
              style={{
                padding: "5px 12px",
                borderRadius: 99,
                border: "none",
                whiteSpace: "nowrap",
                background: statusFilter === s ? T.primary : th.inputBg,
                color: statusFilter === s ? "#fff" : th.sub,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {s === "الكل" ? "الكل" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {(["الكل", "فرزة", "م1", "م2", "تعويض"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              style={{
                padding: "5px 12px",
                borderRadius: 99,
                border: "none",
                whiteSpace: "nowrap",
                background: typeFilter === t ? T.success : th.inputBg,
                color: typeFilter === t ? "#fff" : th.sub,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 16px", fontSize: 12, color: th.sub }}>
        {totalItems} نهمة · يُعرض {visibleItems.length}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} dark={th.dark} />)
        ) : filtered.length === 0 ? (
          <EmptyState icon="🚛" text="لا توجد نهمات مطابقة" />
        ) : (
          visibleItems.map((trip) => {
            const driver = state.drivers.find((d) => d.id === trip.driverId)
            const canEdit = trip.status === "مؤكدة_مبدئياً" || trip.status === "مسودة"
            const canDelete = trip.status === "ملغاة" || trip.status === "مسودة"
            return (
              <Card key={trip.id} style={{ marginBottom: 10 }}>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>
                        {driver?.ownerName ?? "—"}
                      </p>
                      <p style={{ margin: "3px 0 0", fontSize: 11, color: th.sub }}>
                        {driver?.plate} · {trip.type} · {trip.breakNum}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: th.muted }}>{trip.createdAt}</p>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 99,
                        background: trip.status === "مكتملة" ? "#D1FAE5" : trip.status === "ملغاة" ? "#FEE2E2" : "#DBEAFE",
                        color: trip.status === "مكتملة" ? "#065F46" : trip.status === "ملغاة" ? T.danger : T.primary,
                      }}
                    >
                      {STATUS_LABELS[trip.status]}
                    </span>
                  </div>
                  {trip.type !== "تعويض" && (
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: th.sub }}>
                      {trip.province} → {trip.destination} · {trip.payload}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => driver && navigate("driver-profile", { driverId: driver.id })}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: 10,
                        border: `1px solid ${th.border}`,
                        background: "none",
                        color: th.sub,
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      👤 الملف
                    </button>
                    {canEdit && driver && (
                      <button
                        type="button"
                        onClick={() => setEditTrip(trip)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: 10,
                          border: "none",
                          background: T.primary,
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        ✏️ تعديل
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(trip)}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: 10,
                          border: "none",
                          background: "#FEE2E2",
                          color: T.danger,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        🗑 حذف
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
        {hasMore && (
          <p style={{ textAlign: "center", fontSize: 11, color: th.muted, padding: 12 }}>
            ↓ مرّر للمزيد ({visibleItems.length}/{totalItems})
          </p>
        )}
      </div>

      {editTrip && (
        <TripSheet
          driver={state.drivers.find((d) => d.id === editTrip.driverId)!}
          existingTrip={editTrip}
          onClose={() => setEditTrip(null)}
        />
      )}
    </div>
  )
}
