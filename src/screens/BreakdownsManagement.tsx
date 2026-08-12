import { useMemo, useState } from "react"
import { useApp } from "../context"
import { StandardAppBar, useTheme, T, Card, EmptyState, MonochromeIcon } from "../components"
import BreakdownSheet from "../BreakdownSheet"
import { matchesNameOrPlate } from "../domain"
import type { Breakdown, Driver, Trip } from "../data"

type TabKey = "all" | "جارية" | "مكتملة" | "قريب" | "بعيد"

type ListItem =
  | { kind: "ongoing"; trip: Trip; driver: Driver }
  | { kind: "completed"; trip: Trip; driver: Driver }
  | { kind: "breakdown"; breakdown: Breakdown; trip?: Trip; driver?: Driver }

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "جارية", label: "جارية" },
  { key: "مكتملة", label: "مكتملة" },
  { key: "قريب", label: "قريب" },
  { key: "بعيد", label: "بعيد" },
]

const EMPTY_MESSAGES: Record<TabKey, string> = {
  all: "لا توجد سجلات في شاشة الأعطال",
  جارية: "لا توجد نهمات جارية",
  مكتملة: "لا توجد نهمات مكتملة",
  قريب: "لا توجد أعطال قريبة",
  بعيد: "لا توجد أعطال بعيدة",
}

function actionLabel(action?: Breakdown["action"]) {
  if (action === "إلغاء_النهمة") return "إلغاء النهمة"
  if (action === "إبقاء_النهمة") return "إبقاء النهمة"
  return "—"
}

function InfoRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  const th = useTheme()
  if (value == null || value === "") return null
  return (
    <p style={{ margin: "4px 0 0", fontSize: 11, color: th.sub, lineHeight: 1.55, overflowWrap: "anywhere" }}>
      <span style={{ color: th.muted }}>{label}: </span>
      {value}
    </p>
  )
}

function BreakdownDetailSheet({
  breakdown,
  trip,
  driver,
  onClose,
}: {
  breakdown: Breakdown
  trip?: Trip
  driver?: Driver
  onClose: () => void
}) {
  const { state } = useApp()
  const th = useTheme()
  const rescuer = breakdown.rescuerId
    ? state.drivers.find((d) => d.id === breakdown.rescuerId)
    : undefined
  const rescuerTrip = breakdown.rescuerTripId
    ? state.trips.find((t) => t.id === breakdown.rescuerTripId)
    : undefined

  const timeline = [
    trip?.completedAt ? `تأكيد خروج النهمة — ${trip.completedAt}` : "تأكيد خروج النهمة",
    `تسجيل العطل — ${breakdown.location}`,
    breakdown.breakdownPlace ? `تحديد مكان العطل — ${breakdown.breakdownPlace}` : null,
    breakdown.action ? `اختيار مصير النهمة — ${actionLabel(breakdown.action)}` : null,
    breakdown.rescuerName ? `اختيار المسعف — ${breakdown.rescuerName}` : null,
    breakdown.rescuerTripType && breakdown.rescuerTripType !== "بدون"
      ? `إنشاء نهمة المسعف (${breakdown.rescuerTripType})`
      : breakdown.rescuerTripType === "بدون"
        ? "بدون نهمة للمسعف"
        : null,
    breakdown.compensationGiven != null && breakdown.location === "بعيد"
      ? `إضافة ${breakdown.compensationGiven} تعويض للمسعف`
      : null,
    breakdown.action === "إبقاء_النهمة" ? "إعادة تسجيل المالك في آخر الكشف" : "استعادة حالة المالك السابقة",
  ].filter(Boolean) as string[]

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 160 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "92%",
          overflowY: "auto",
          background: th.card,
          borderRadius: "22px 22px 0 0",
          padding: "20px 18px 32px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, color: th.text, fontSize: 17 }}>تفاصيل العطل</h3>
            <p style={{ margin: "4px 0 0", color: th.sub, fontSize: 11 }}>{breakdown.driverName} · {breakdown.plate}</p>
          </div>
          <button type="button" onClick={onClose} style={{ border: 0, background: th.inputBg, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit" }}>
            إغلاق
          </button>
        </div>

        <section style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 12, color: T.primary }}>بيانات المعطل</h4>
          <div style={{ background: th.inputBg, borderRadius: 12, padding: 12 }}>
            <InfoRow label="الاسم" value={breakdown.driverName} />
            <InfoRow label="اللوحة" value={breakdown.plate} />
            <InfoRow label="النوع" value={driver?.type ?? breakdown.tripType} />
            <InfoRow label="الحمولة" value={breakdown.payload ?? trip?.payload} />
            <InfoRow label="الوجهة" value={breakdown.destination ?? trip?.destination} />
            <InfoRow label="رقم الفك" value={trip?.breakNum} />
          </div>
        </section>

        <section style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 12, color: T.warning }}>بيانات العطل</h4>
          <div style={{ background: th.inputBg, borderRadius: 12, padding: 12 }}>
            <InfoRow label="النوع" value={breakdown.location === "قريب" ? "قريب من المصنع" : "بعيد عن المصنع"} />
            <InfoRow label="مكان العطل" value={breakdown.breakdownPlace} />
            <InfoRow label="التاريخ" value={breakdown.date} />
            <InfoRow label="مصير النهمة" value={actionLabel(breakdown.action)} />
            <InfoRow label="الملاحظات" value={breakdown.notes} />
            <InfoRow label="الحالة" value={breakdown.status === "نشط" ? "جارٍ" : "منتهٍ"} />
          </div>
        </section>

        <section style={{ marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 12, color: T.success }}>بيانات المسعف</h4>
          <div style={{ background: th.inputBg, borderRadius: 12, padding: 12 }}>
            <InfoRow label="الاسم" value={breakdown.rescuerName ?? rescuer?.ownerName} />
            <InfoRow label="اللوحة" value={rescuer?.plate} />
            <InfoRow label="نوع النهمة" value={breakdown.rescuerTripType} />
            <InfoRow label="رقم الفك" value={breakdown.breakNum ?? rescuerTrip?.breakNum} />
            {breakdown.location === "بعيد" && (
              <InfoRow label="التعويضات" value={breakdown.compensationGiven ?? 0} />
            )}
          </div>
        </section>

        <section>
          <h4 style={{ margin: "0 0 10px", fontSize: 12, color: th.text }}>سجل العمليات</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {timeline.map((step, index) => (
              <div key={step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  background: T.primary,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}>
                  {index + 1}
                </span>
                <p style={{ margin: 0, fontSize: 11, color: th.sub, lineHeight: 1.5, overflowWrap: "anywhere" }}>{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

export function BreakdownsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [tab, setTab] = useState<TabKey>("all")
  const [search, setSearch] = useState("")
  const [breakdownTrip, setBreakdownTrip] = useState<Trip | null>(null)
  const [editBreakdown, setEditBreakdown] = useState<Breakdown | null>(null)
  const [detailBreakdown, setDetailBreakdown] = useState<Breakdown | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Breakdown | null>(null)

  const breakdownForTrip = (tripId: number) =>
    state.breakdowns.find((b) => b.tripId === tripId)

  const ongoingTrips = useMemo(
    () =>
      state.trips.filter(
        (trip) =>
          trip.status === "مكتملة"
          && trip.completionState === "جارية"
          && !breakdownForTrip(trip.id),
      ),
    [state.trips, state.breakdowns],
  )

  const completedTrips = useMemo(
    () =>
      state.trips.filter(
        (trip) =>
          trip.status === "مكتملة"
          && trip.completionState === "مكتملة"
          && !breakdownForTrip(trip.id),
      ),
    [state.trips, state.breakdowns],
  )

  const closeBreakdowns = useMemo(
    () => state.breakdowns.filter((b) => b.location === "قريب"),
    [state.breakdowns],
  )

  const farBreakdowns = useMemo(
    () => state.breakdowns.filter((b) => b.location === "بعيد"),
    [state.breakdowns],
  )

  const allItems = useMemo((): ListItem[] => {
    const items: ListItem[] = []
    for (const trip of ongoingTrips) {
      const driver = state.drivers.find((d) => d.id === trip.driverId)
      if (driver) items.push({ kind: "ongoing", trip, driver })
    }
    for (const trip of completedTrips) {
      const driver = state.drivers.find((d) => d.id === trip.driverId)
      if (driver) items.push({ kind: "completed", trip, driver })
    }
    for (const breakdown of state.breakdowns) {
      const trip = breakdown.tripId ? state.trips.find((t) => t.id === breakdown.tripId) : undefined
      const driver = state.drivers.find((d) => d.id === breakdown.driverId)
      items.push({ kind: "breakdown", breakdown, trip, driver })
    }
    return items
  }, [ongoingTrips, completedTrips, state.breakdowns, state.trips, state.drivers])

  const filteredItems = useMemo(() => {
    let items = allItems
    if (tab === "جارية") items = items.filter((item) => item.kind === "ongoing")
    if (tab === "مكتملة") items = items.filter((item) => item.kind === "completed")
    if (tab === "قريب") items = items.filter((item) => item.kind === "breakdown" && item.breakdown.location === "قريب")
    if (tab === "بعيد") items = items.filter((item) => item.kind === "breakdown" && item.breakdown.location === "بعيد")

    const q = search.trim()
    if (!q) return items

    return items.filter((item) => {
      if (item.kind === "breakdown") {
        return matchesNameOrPlate(q, item.breakdown.driverName, item.breakdown.plate)
      }
      return matchesNameOrPlate(q, item.driver.ownerName, item.driver.plate)
    })
  }, [allItems, tab, search])

  const registerTrip = (trip: Trip) => {
    const driver = state.drivers.find((d) => d.id === trip.driverId)
    if (!driver) return
    const snapshot = {
      drivers: state.drivers,
      trips: state.trips,
      breakdowns: state.breakdowns,
    }
    dispatch({ type: "REGISTER_COMPLETED_TRIP", tripId: trip.id })
    showSnackbar(`تم تسجيل ${driver.ownerName} في الكشف النشط ✅`, () => {
      dispatch({ type: "RESTORE_BREAKDOWN_STATE", snapshot })
    })
  }

  const confirmDeleteBreakdown = (breakdown: Breakdown) => {
    const snapshot = {
      drivers: state.drivers,
      trips: state.trips,
      breakdowns: state.breakdowns,
    }
    dispatch({ type: "DELETE_BREAKDOWN", breakdownId: breakdown.id })
    showSnackbar(`تم حذف عطل ${breakdown.driverName} — تراجع`, () => {
      dispatch({ type: "RESTORE_BREAKDOWN_STATE", snapshot })
    })
    setConfirmDelete(null)
  }

  const editTrip = editBreakdown?.tripId
    ? state.trips.find((t) => t.id === editBreakdown.tripId)
    : undefined

  const renderOngoingCard = (item: Extract<ListItem, { kind: "ongoing" }>) => {
    const { trip, driver } = item
    return (
      <Card key={`ongoing-${trip.id}`}>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text, overflowWrap: "anywhere" }}>{driver.ownerName}</p>
              <InfoRow label="اللوحة" value={driver.plate} />
              <InfoRow label="النوع" value={driver.type} />
              <InfoRow label="الحمولة" value={trip.payload} />
              <InfoRow label="الوجهة" value={trip.destination || trip.province} />
              <InfoRow label="رقم الفك" value={trip.breakNum} />
              <InfoRow label="تاريخ الخروج" value={trip.completedAt ?? trip.createdAt} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 99, background: "#DBEAFE", color: T.primary, flexShrink: 0 }}>
              جارية
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => registerTrip(trip)}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "9px 12px",
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
              <MonochromeIcon name="check" size={14} /> تسجيل
            </button>
            <button
              type="button"
              onClick={() => setBreakdownTrip(trip)}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "9px 12px",
                borderRadius: 10,
                border: "none",
                background: T.warning,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <MonochromeIcon name="wrench" size={14} /> تسجيل عطل
            </button>
          </div>
        </div>
      </Card>
    )
  }

  const renderCompletedCard = (item: Extract<ListItem, { kind: "completed" }>) => {
    const { trip, driver } = item
    return (
      <Card key={`completed-${trip.id}`}>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text, overflowWrap: "anywhere" }}>{driver.ownerName}</p>
              <InfoRow label="اللوحة" value={driver.plate} />
              <InfoRow label="النوع" value={driver.type} />
              <InfoRow label="الحمولة" value={trip.payload} />
              <InfoRow label="الوجهة" value={trip.destination || trip.province} />
              <InfoRow label="رقم الفك" value={trip.breakNum} />
              <InfoRow label="تاريخ الإكمال" value={trip.completedAt ?? trip.createdAt} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 99, background: "#D1FAE5", color: T.success, flexShrink: 0 }}>
              مكتملة
            </span>
          </div>
        </div>
      </Card>
    )
  }

  const renderBreakdownCard = (item: Extract<ListItem, { kind: "breakdown" }>) => {
    const { breakdown, trip, driver } = item
    const isClose = breakdown.location === "قريب"
    return (
      <Card key={`breakdown-${breakdown.id}`}>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text, overflowWrap: "anywhere" }}>{breakdown.driverName}</p>
              <InfoRow label="اللوحة" value={breakdown.plate} />
              <InfoRow label="نوع البابور" value={driver?.type ?? breakdown.tripType} />
              <InfoRow label="الحمولة" value={breakdown.payload ?? trip?.payload} />
              <InfoRow label="الوجهة" value={breakdown.destination ?? trip?.destination} />
              <InfoRow label="رقم الفك" value={trip?.breakNum} />
              <InfoRow label="مكان العطل" value={breakdown.breakdownPlace} />
              <InfoRow label="تاريخ العطل" value={breakdown.date} />
              <InfoRow label="المسعف" value={breakdown.rescuerName} />
              <InfoRow label="نوع نهمة المسعف" value={breakdown.rescuerTripType} />
              {!isClose && <InfoRow label="عدد التعويضات" value={breakdown.compensationGiven ?? 0} />}
              <InfoRow label="مصير النهمة" value={actionLabel(breakdown.action)} />
            </div>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              padding: "4px 9px",
              borderRadius: 99,
              background: breakdown.status === "نشط" ? "#FEF9C3" : "#F1F5F9",
              color: breakdown.status === "نشط" ? "#B45309" : th.sub,
              flexShrink: 0,
            }}>
              {isClose ? "قريب" : "بعيد"} · {breakdown.status === "نشط" ? "جارٍ" : "منتهٍ"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setDetailBreakdown(breakdown)}
              style={{
                flex: 1,
                minWidth: 90,
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${th.border}`,
                background: "none",
                color: th.text,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              تفاصيل
            </button>
            {trip && (
              <button
                type="button"
                onClick={() => setEditBreakdown(breakdown)}
                style={{
                  flex: 1,
                  minWidth: 90,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${th.border}`,
                  background: "none",
                  color: T.primary,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <MonochromeIcon name="edit" size={14} /> تعديل
              </button>
            )}
            {breakdown.status === "نشط" && (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "END_BREAKDOWN", breakdownId: breakdown.id })
                  showSnackbar(`تم إنهاء عطل ${breakdown.driverName} ✅`)
                }}
                style={{
                  flex: 1,
                  minWidth: 90,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "none",
                  background: "#D1FAE5",
                  color: "#065F46",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <MonochromeIcon name="check" size={14} /> إنهاء
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmDelete(breakdown)}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: "#FEE2E2",
                color: T.danger,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <MonochromeIcon name="trash" size={14} />
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden", position: "relative" }}>
      <StandardAppBar title="إدارة الأعطال" back="home" />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 8,
        padding: "10px 16px",
        background: th.bg,
      }}>
        {[
          ["جارية", ongoingTrips.length, T.primary],
          ["مكتملة", completedTrips.length, T.success],
          ["قريب", closeBreakdowns.length, T.warning],
          ["بعيد", farBreakdowns.length, T.danger],
        ].map(([label, value, color]) => (
          <div
            key={String(label)}
            style={{
              minWidth: 0,
              background: th.card,
              border: `1px solid ${th.border}`,
              borderRadius: 12,
              padding: "9px 6px",
              textAlign: "center",
            }}
          >
            <strong style={{ display: "block", color: color as string, fontSize: 18 }}>{value as number}</strong>
            <span style={{ color: th.sub, fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث باسم المالك أو رقم اللوحة..."
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${th.border}`,
            background: th.inputBg,
            color: th.text,
            fontSize: 13,
            boxSizing: "border-box",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              style={{
                padding: "7px 14px",
                borderRadius: 99,
                border: "none",
                whiteSpace: "nowrap",
                background: tab === key ? T.primary : (th.dark ? "#1E2D40" : "#F1F5F9"),
                color: tab === key ? "#fff" : th.sub,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredItems.length === 0 ? (
          <EmptyState icon="wrench" text={EMPTY_MESSAGES[tab]} />
        ) : (
          filteredItems.map((item) => {
            if (item.kind === "ongoing") return renderOngoingCard(item)
            if (item.kind === "completed") return renderCompletedCard(item)
            return renderBreakdownCard(item)
          })
        )}
      </div>

      {breakdownTrip && (
        <BreakdownSheet
          trip={breakdownTrip}
          onClose={() => setBreakdownTrip(null)}
          onSaved={(undo) => showSnackbar("تم تسجيل العطل بنجاح — تراجع", undo)}
        />
      )}

      {editBreakdown && editTrip && (
        <BreakdownSheet
          trip={editTrip}
          breakdown={editBreakdown}
          onClose={() => setEditBreakdown(null)}
        />
      )}

      {detailBreakdown && (
        <BreakdownDetailSheet
          breakdown={detailBreakdown}
          trip={detailBreakdown.tripId ? state.trips.find((t) => t.id === detailBreakdown.tripId) : undefined}
          driver={state.drivers.find((d) => d.id === detailBreakdown.driverId)}
          onClose={() => setDetailBreakdown(null)}
        />
      )}

      {confirmDelete && (
        <div style={{ position: "absolute", inset: 0, zIndex: 170 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={() => setConfirmDelete(null)} />
          <div style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            background: th.card,
            borderRadius: 16,
            padding: 20,
          }}>
            <h3 style={{ margin: "0 0 8px", color: th.text, fontSize: 16 }}>حذف العطل؟</h3>
            <p style={{ margin: "0 0 16px", color: th.sub, fontSize: 12, lineHeight: 1.6 }}>
              سيتم التراجع عن جميع العمليات المرتبطة: حالة المالك، نهمة المسعف، التعويضات، والتسلسل.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${th.border}`, background: "none", cursor: "pointer", fontFamily: "inherit" }}>
                إلغاء
              </button>
              <button type="button" onClick={() => confirmDeleteBreakdown(confirmDelete)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: T.danger, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
