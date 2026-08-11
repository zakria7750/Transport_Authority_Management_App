import { useState, useRef } from "react"
import { useApp } from "../context"
import { StandardAppBar, useTheme, T, Card, EmptyState, MonochromeIcon } from "../components"
import TripSheet from "../TripSheet"
import BreakdownSheet from "../BreakdownSheet"
import { isPendingTripStatus } from "../domain"
import type { Trip, TripType, Driver } from "../data"

const TRIP_TYPE_COLORS: Record<TripType, { bg: string; color: string; icon: string }> = {
  فرزة: { bg: "#DBEAFE", color: "#1D4ED8", icon: "dot" },
  م1: { bg: "#D1FAE5", color: "#065F46", icon: "dot" },
  م2: { bg: "#FEF9C3", color: "#B45309", icon: "dot" },
  تعويض: { bg: "#FEE2E2", color: "#991B1B", icon: "dot" },
}

function TripCard({
  trip,
  driver,
  meta,
  onConfirm,
  onCancel,
  onEdit,
  onBreakdown,
}: {
  trip: Trip
  driver: Driver
  meta: (typeof TRIP_TYPE_COLORS)[TripType]
  onConfirm: () => void
  onCancel: () => void
  onEdit: () => void
  onBreakdown: () => void
}) {
  const th = useTheme()
  const [offsetX, setOffsetX] = useState(0)
  const startX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current
    if (diff < 0) setOffsetX(Math.max(diff, -120))
  }

  const handleTouchEnd = () => {
    if (offsetX < -60) setOffsetX(-120)
    else setOffsetX(0)
  }

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 14 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "flex-end",
          gap: 0,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setOffsetX(0)
            onConfirm()
          }}
          style={{
            width: 60,
            border: "none",
            background: T.success,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <MonochromeIcon name="check" size={14} /> خروج
        </button>
        <button
          type="button"
          onClick={() => {
            setOffsetX(0)
            onCancel()
          }}
          style={{
            width: 60,
            border: "none",
            background: T.danger,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <MonochromeIcon name="close" size={14} /> إلغاء
        </button>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: offsetX === 0 || offsetX === -120 ? "transform 0.2s" : "none",
        }}
      >
        <Card style={{ overflow: "visible" }}>
          <div style={{ padding: "14px 16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>
                  {driver.ownerName}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: th.sub }}>
                   <MonochromeIcon name="car" size={14} /> {driver.plate} · {driver.type}
                </p>
              </div>
              <div style={{ textAlign: "left" }}>
                <span
                  style={{
                    background: meta.bg,
                    color: meta.color,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: 99,
                  }}
                >
                  {trip.type}
                </span>
                <p style={{ margin: "4px 0 0", fontSize: 10, color: th.muted }}>{trip.createdAt}</p>
              </div>
            </div>

            {trip.type !== "تعويض" ? (
              <div
                style={{
                  background: th.dark ? "#1E2D40" : "#F8FAFC",
                  borderRadius: 10,
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginBottom: 12,
                  fontSize: 11,
                  color: th.sub,
                }}
              >
                <span><MonochromeIcon name="package" size={13} /> الحمولة: {trip.payload}</span>
                <span><MonochromeIcon name="pin" size={13} /> {trip.province} · {trip.destinationType}: {trip.destination}</span>
                <span><MonochromeIcon name="hash" size={13} /> رقم الفك: {trip.breakNum}</span>
              </div>
            ) : (
              <div
                style={{
                  background: "#FEF9C3",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 12,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "#B45309" }}>
                   <MonochromeIcon name="money" size={15} /> {trip.compensationAmount?.toLocaleString()} ريال
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={onConfirm}
                style={{
                  flex: 2,
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
                 <MonochromeIcon name="check" size={15} /> تأكيد الخروج
              </button>
              <button
                type="button"
                onClick={onEdit}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 10,
                  border: "none",
                  background: th.dark ? "#1E2D40" : "#F1F5F9",
                  color: T.primary,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                 <MonochromeIcon name="edit" size={14} /> تعديل
              </button>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  flex: 1,
                  padding: "10px",
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
                 <MonochromeIcon name="close" size={14} /> إلغاء
              </button>
              <button
                type="button"
                onClick={onBreakdown}
                style={{
                  padding: "10px",
                  borderRadius: 10,
                  border: `1px solid ${th.border}`,
                  background: "none",
                  color: th.sub,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                 <MonochromeIcon name="wrench" size={15} />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function PendingTripsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [openSections, setOpenSections] = useState<Record<TripType, boolean>>({
    فرزة: true,
    م1: true,
    م2: true,
    تعويض: true,
  })
  const [editTrip, setEditTrip] = useState<Trip | null>(null)
  const [breakdownTrip, setBreakdownTrip] = useState<Trip | null>(null)

  const pendingTrips = state.trips.filter((t) => isPendingTripStatus(t.status))
  const types: TripType[] = ["فرزة", "م1", "م2", "تعويض"]

  const toggleSection = (t: TripType) => setOpenSections((p) => ({ ...p, [t]: !p[t] }))

  const confirmExit = (trip: Trip, driver: Driver) => {
    const driverSnap = { ...driver }
    const tripSnap = { ...trip }
    dispatch({ type: "COMPLETE_TRIP", driverId: driver.id })
    showSnackbar(`تم تأكيد خروج النهمة (${trip.type}) للسائق ${driver.ownerName} ✅`, () => {
      dispatch({ type: "RESTORE_TRIP", trip: tripSnap, driver: driverSnap })
    })
  }

  const cancelTrip = (trip: Trip, driver: Driver) => {
    const driverSnap = { ...driver }
    const tripSnap = { ...trip }
    dispatch({ type: "CANCEL_TRIP", driverId: driver.id })
    showSnackbar(`تم إلغاء نهمة السائق ${driver.ownerName}`, () => {
      dispatch({
        type: "RESTORE_TRIP",
        trip: { ...tripSnap, status: tripSnap.status === "ملغاة" ? "مؤكدة_مبدئياً" : tripSnap.status },
        driver: driverSnap,
      })
    })
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden" }}>
      <StandardAppBar title="النهمات المعلقة" back="home" />



      <div style={{ flex: 1, overflowY: "auto" }}>
        {pendingTrips.length === 0 ? (
          <EmptyState icon="🚛" text="لا توجد نهمات معلقة حالياً" />
        ) : (
          types.map((tripType) => {
            const trips = pendingTrips.filter((t) => t.type === tripType)
            if (trips.length === 0) return null
            const meta = TRIP_TYPE_COLORS[tripType]
            const isOpen = openSections[tripType]

            return (
              <div key={tripType} style={{ marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => toggleSection(tripType)}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    background: th.card,
                    border: "none",
                    borderBottom: `1px solid ${th.border}`,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ color: th.text, display: "flex" }}><MonochromeIcon name={meta.icon} size={16} /></span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: th.text,
                      flex: 1,
                      textAlign: "right",
                    }}
                  >
                    {tripType === "م1" ? "مصروف أول" : tripType === "م2" ? "مصروف ثاني" : tripType}
                  </span>
                  <span
                    style={{
                      background: meta.bg,
                      color: meta.color,
                      fontSize: 12,
                      fontWeight: 800,
                      borderRadius: 99,
                      padding: "3px 12px",
                    }}
                  >
                    {trips.length}
                  </span>
                  <span
                    style={{
                      color: th.muted,
                      fontSize: 14,
                      transform: isOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  >
                    ▼
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      background: th.bg,
                      padding: "10px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {trips.map((trip) => {
                      const driver = state.drivers.find((d) => d.id === trip.driverId)
                      if (!driver) return null
                      return (
                        <TripCard
                          key={trip.id}
                          trip={trip}
                          driver={driver}
                          meta={meta}
                          onConfirm={() => confirmExit(trip, driver)}
                          onCancel={() => cancelTrip(trip, driver)}
                          onEdit={() => setEditTrip(trip)}
                          onBreakdown={() => setBreakdownTrip(trip)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {editTrip && (
        <TripSheet
          driver={state.drivers.find((d) => d.id === editTrip.driverId)!}
          existingTrip={editTrip}
          onClose={() => setEditTrip(null)}
        />
      )}

      {breakdownTrip && (
        <BreakdownSheet trip={breakdownTrip} onClose={() => setBreakdownTrip(null)} />
      )}
    </div>
  )
}
