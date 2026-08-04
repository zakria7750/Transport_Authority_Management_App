import { useState } from "react"
import { useApp } from "./context"
import { BottomSheet, useTheme, T } from "./components"
import { suggestNextBreakNum } from "./domain"
import type { Trip, TripType } from "./data"

type Props = {
  trip: Trip
  onClose: () => void
}

export default function BreakdownSheet({ trip, onClose }: Props) {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const driver = state.drivers.find((d) => d.id === trip.driverId)

  const [location, setLocation] = useState<"قريب" | "بعيد">("قريب")
  const [action, setAction] = useState<"إلغاء_النهمة" | "إبقاء_النهمة">("إبقاء_النهمة")
  const [rescuerId, setRescuerId] = useState<number | "">("")
  const [rescuerTripType, setRescuerTripType] = useState<TripType>("م2")
  const [breakNum, setBreakNum] = useState(suggestNextBreakNum(state.trips))
  const [compensationGiven, setCompensationGiven] = useState(500)

  const rescuers = state.drivers.filter(
    (d) => d.status === "نشط" && d.id !== trip.driverId && !d.currentTrip,
  )

  const submit = () => {
    if (location === "بعيد" && !rescuerId) {
      showSnackbar("يرجى اختيار المسعف ⚠️")
      return
    }
    dispatch({
      type: "ADD_BREAKDOWN",
      breakdown: {
        tripId: trip.id,
        location,
        ...(location === "قريب"
          ? { action }
          : {
              rescuerId: Number(rescuerId),
              rescuerTripType,
              breakNum,
              compensationGiven,
            }),
      },
    })
    showSnackbar(`تم تسجيل عطل (${location}) للسائق ${driver?.ownerName ?? ""} ✅`)
    onClose()
  }

  return (
    <BottomSheet
      title="تسجيل عطل"
      subtitle={`${driver?.ownerName ?? ""} · ${trip.type} · ${trip.breakNum}`}
      onClose={onClose}
    >
      <p style={{ fontSize: 12, color: th.sub, margin: "0 0 8px" }}>موقع العطل</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["قريب", "بعيد"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLocation(l)}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 10,
              border: "none",
              background: location === l ? T.primary : th.inputBg,
              color: location === l ? "#fff" : th.sub,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {l === "قريب" ? "📍 قريب" : "🗺️ بعيد"}
          </button>
        ))}
      </div>

      {location === "قريب" ? (
        <>
          <p style={{ fontSize: 12, color: th.sub, margin: "0 0 8px" }}>حالة النهمة</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["إلغاء_النهمة", "إبقاء_النهمة"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAction(a)}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    action === a
                      ? a === "إلغاء_النهمة"
                        ? T.danger
                        : T.success
                      : th.inputBg,
                  color: action === a ? "#fff" : th.sub,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {a.replace("_", " ")}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 6 }}>
              المسعف
            </label>
            <select
              value={rescuerId}
              onChange={(e) => setRescuerId(e.target.value ? Number(e.target.value) : "")}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${th.border}`,
                background: th.inputBg,
                color: th.text,
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              <option value="">اختر مسعفاً...</option>
              {rescuers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.ownerName} · {r.plate}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 6 }}>
              نوع نهمة المسعف
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["م1", "م2", "فرزة"] as TripType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRescuerTripType(t)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: 10,
                    border: "none",
                    background: rescuerTripType === t ? T.primary : th.inputBg,
                    color: rescuerTripType === t ? "#fff" : th.text,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 6 }}>
              رقم الفك الجديد
            </label>
            <input
              value={breakNum}
              onChange={(e) => setBreakNum(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${th.border}`,
                background: th.inputBg,
                color: th.text,
                fontSize: 14,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 6 }}>
              التعويضات (ريال)
            </label>
            <input
              type="number"
              value={compensationGiven}
              onChange={(e) => setCompensationGiven(Number(e.target.value) || 0)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${th.border}`,
                background: th.inputBg,
                color: th.text,
                fontSize: 14,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            padding: "13px",
            borderRadius: 12,
            border: `1px solid ${th.border}`,
            background: "none",
            color: th.sub,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={submit}
          style={{
            flex: 2,
            padding: "13px",
            borderRadius: 12,
            border: "none",
            background: T.primary,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          تأكيد التسجيل ✓
        </button>
      </div>
    </BottomSheet>
  )
}
