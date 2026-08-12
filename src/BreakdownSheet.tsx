import { useState, useMemo } from "react"
import { useApp } from "./context"
import { BottomSheet, useTheme, T, SearchableRosterField, MonochromeIcon } from "./components"
import { suggestNextBreakNum, eligibleRescueDrivers, matchesNameOrPlate } from "./domain"
import type { Trip, Breakdown } from "./data"
import type { RescuerTripType } from "./data"

type Props = {
  trip: Trip
  breakdown?: Breakdown
  onClose: () => void
}

const RESCUER_TRIP_TYPES: RescuerTripType[] = ["م1", "م2", "فرزة", "بدون"]

export default function BreakdownSheet({ trip, breakdown, onClose }: Props) {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const isEdit = !!breakdown
  const driver = state.drivers.find((d) => d.id === trip.driverId)

  const [location, setLocation] = useState<"قريب" | "بعيد">(breakdown?.location ?? "قريب")
  const [action, setAction] = useState<"إلغاء_النهمة" | "إبقاء_النهمة">(
    breakdown?.action ?? "إبقاء_النهمة",
  )
  const [rescuerSearch, setRescuerSearch] = useState("")
  const [rescuerLabel, setRescuerLabel] = useState(
    breakdown?.rescuerName && breakdown.rescuerId
      ? (() => {
          const r = state.drivers.find((d) => d.id === breakdown.rescuerId)
          return r ? `${r.ownerName} · ${r.plate}` : breakdown.rescuerName
        })()
      : "",
  )
  const [rescuerTripType, setRescuerTripType] = useState<RescuerTripType>(
    breakdown?.rescuerTripType ?? "م2",
  )
  const [breakNum, setBreakNum] = useState(breakdown?.breakNum ?? suggestNextBreakNum(state.trips))
  const [compensationGiven, setCompensationGiven] = useState(breakdown?.compensationGiven ?? 500)

  const rescuers = useMemo(() => {
    const base = eligibleRescueDrivers(state.drivers, trip.driverId)
    if (breakdown?.rescuerId && !base.some((d) => d.id === breakdown.rescuerId)) {
      const existing = state.drivers.find((d) => d.id === breakdown.rescuerId)
      if (existing) return [...base, existing]
    }
    return base
  }, [state.drivers, trip.driverId, breakdown?.rescuerId])

  const selectedRescuer = useMemo(() => {
    if (!rescuerLabel) return undefined
    return state.drivers.find((r) => `${r.ownerName} · ${r.plate}` === rescuerLabel)
  }, [state.drivers, rescuerLabel])

  const submit = () => {
    if (location === "بعيد" && !selectedRescuer) {
      showSnackbar("يرجى اختيار المسعف ⚠️")
      return
    }

    if (isEdit && breakdown) {
      dispatch({
        type: "UPDATE_BREAKDOWN",
        breakdownId: breakdown.id,
        patch: {
          location,
          ...(location === "قريب"
            ? { action }
            : {
                rescuerId: selectedRescuer!.id,
                rescuerTripType,
                breakNum,
                compensationGiven,
              }),
        },
      })
      showSnackbar(`تم تحديث عطل ${driver?.ownerName ?? ""} ✅`)
      onClose()
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
              rescuerId: selectedRescuer!.id,
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
      title={isEdit ? "تعديل العطل" : "تسجيل عطل"}
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
            <><MonochromeIcon name="pin" size={15} /> {l}</>
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
          <SearchableRosterField
            label="المسعف"
            query={rescuerSearch}
            onQueryChange={setRescuerSearch}
            selectedLabel={rescuerLabel || undefined}
            items={rescuers}
            getKey={(d) => d.id}
            formatLabel={(d) => d.ownerName}
            formatSubLabel={(d) => `${d.plate} · ${d.status === "نشط" ? "نشط" : "غير نشط"}`}
            filterItem={(d, q) => matchesNameOrPlate(q, d.ownerName, d.plate)}
            onPick={(d) => setRescuerLabel(`${d.ownerName} · ${d.plate}`)}
            placeholder="ابحث بالاسم أو اللوحة..."
            emptyHint="لا يوجد مسعف مطابق في الكشف"
          />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 6 }}>
              نوع نهمة المسعف
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {RESCUER_TRIP_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRescuerTripType(t)}
                  style={{
                    flex: t === "بدون" ? "1 1 100%" : 1,
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
                  {t === "بدون" ? "بدون (لا تُنشأ نهمة)" : t}
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
              عدد التعويضات
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
          {isEdit ? <><MonochromeIcon name="check" size={15} /> حفظ التعديل</> : <><MonochromeIcon name="check" size={15} /> تأكيد التسجيل</>}
        </button>
      </div>
    </BottomSheet>
  )
}
