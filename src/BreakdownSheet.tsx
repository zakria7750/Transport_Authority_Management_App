import { useMemo, useState } from "react"
import { useApp } from "./context"
import {
  BottomSheet,
  useTheme,
  T,
  SearchableRosterField,
  MonochromeIcon,
} from "./components"
import {
  suggestNextBreakNum,
  eligibleRescueDrivers,
  matchesNameOrPlate,
} from "./domain"
import { BREAKDOWN_PLACE_SUGGESTIONS } from "./constants"
import type { Trip, Breakdown, RescuerTripType } from "./data"

type Props = {
  trip: Trip
  breakdown?: Breakdown
  onClose: () => void
  onSaved?: (undo: () => void) => void
}

const RESCUER_TRIP_TYPES: RescuerTripType[] = ["فرزة", "م1", "م2", "بدون"]

export default function BreakdownSheet({
  trip,
  breakdown,
  onClose,
  onSaved,
}: Props) {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const isEdit = !!breakdown
  const driver = state.drivers.find((d) => d.id === trip.driverId)

  const [location, setLocation] = useState<"قريب" | "بعيد">(
    breakdown?.location ?? "قريب",
  )
  const [breakdownPlace, setBreakdownPlace] = useState(
    breakdown?.breakdownPlace ?? "",
  )
  const [action, setAction] = useState<"إلغاء_النهمة" | "إبقاء_النهمة">(
    breakdown?.location === "بعيد"
      ? "إبقاء_النهمة"
      : (breakdown?.action ?? "إبقاء_النهمة"),
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
  const [breakNum, setBreakNum] = useState(
    breakdown?.breakNum ?? suggestNextBreakNum(state.trips),
  )
  const [compensationGiven, setCompensationGiven] = useState(
    breakdown?.compensationGiven ?? 0,
  )
  const [notes, setNotes] = useState(breakdown?.notes ?? "")

  const rescuers = useMemo(() => {
    const base = eligibleRescueDrivers(state.drivers, trip.driverId)
    if (
      breakdown?.rescuerId &&
      !base.some((d) => d.id === breakdown.rescuerId)
    ) {
      const existing = state.drivers.find((d) => d.id === breakdown.rescuerId)
      if (existing) return [...base, existing]
    }
    return base
  }, [state.drivers, trip.driverId, breakdown?.rescuerId])

  const selectedRescuer = useMemo(() => {
    if (!rescuerLabel) return undefined
    return state.drivers.find(
      (r) => `${r.ownerName} · ${r.plate}` === rescuerLabel,
    )
  }, [state.drivers, rescuerLabel])

  const placeSuggestions = useMemo(() => {
    const query = breakdownPlace.trim().toLowerCase()
    const base = [...BREAKDOWN_PLACE_SUGGESTIONS]
    if (query && !base.some((item) => item.toLowerCase() === query)) {
      return [breakdownPlace.trim(), ...base]
    }
    return base
  }, [breakdownPlace])

  const submit = () => {
    if (!breakdownPlace.trim()) {
      showSnackbar("يرجى تحديد مكان العطل ⚠️")
      return
    }
    if (!selectedRescuer) {
      showSnackbar("يرجى اختيار البابور المسعف ⚠️")
      return
    }
    if (rescuerTripType !== "بدون" && !breakNum.trim()) {
      showSnackbar("يرجى إدخال رقم الفك للمسعف ⚠️")
      return
    }

    if (isEdit && breakdown) {
      dispatch({
        type: "UPDATE_BREAKDOWN",
        breakdownId: breakdown.id,
        patch: {
          location,
          breakdownPlace: breakdownPlace.trim(),
          action,
          notes,
          rescuerId: selectedRescuer.id,
          rescuerTripType,
          ...(rescuerTripType !== "بدون" ? { breakNum } : {}),
          compensationGiven: location === "بعيد" ? compensationGiven : 0,
        },
      })
      showSnackbar(`تم تحديث عطل ${driver?.ownerName ?? ""} ✅`)
      onClose()
      return
    }

    const snapshot = {
      drivers: state.drivers,
      trips: state.trips,
      breakdowns: state.breakdowns,
    }

    dispatch({
      type: "ADD_BREAKDOWN",
      breakdown: {
        tripId: trip.id,
        location,
        breakdownPlace: breakdownPlace.trim(),
        action,
        notes,
        rescuerId: selectedRescuer.id,
        rescuerTripType,
        ...(rescuerTripType !== "بدون" ? { breakNum } : {}),
        compensationGiven: location === "بعيد" ? compensationGiven : 0,
      },
    })

    const undo = () => dispatch({ type: "RESTORE_BREAKDOWN_STATE", snapshot })
    if (onSaved) {
      onSaved(undo)
    } else {
      showSnackbar(
        `تم تسجيل عطل (${location}) للسائق ${driver?.ownerName ?? ""} ✅`,
        undo,
      )
    }
    onClose()
  }

  const fieldLabel = {
    fontSize: 12,
    color: th.sub,
    margin: "0 0 8px",
    fontWeight: 600 as const,
  }
  const toggleBtn = (active: boolean, activeBg: string) => ({
    flex: 1,
    padding: "11px",
    borderRadius: 10,
    border: "none" as const,
    background: active ? activeBg : th.inputBg,
    color: active ? "#fff" : th.sub,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer" as const,
    fontFamily: "inherit" as const,
  })

  return (
    <BottomSheet
      title={isEdit ? "تعديل العطل" : "تسجيل عطل"}
      subtitle={`${driver?.ownerName ?? ""} · ${trip.type} · ${trip.breakNum}`}
      onClose={onClose}
      presentation="dialog"
    >
      <div
        style={{
          background: th.inputBg,
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        <p style={{ margin: 0, color: th.text, fontSize: 13, fontWeight: 700 }}>
          {driver?.ownerName ?? "—"} · {driver?.plate ?? "—"}
        </p>
        <p
          style={{
            margin: "6px 0 0",
            color: th.sub,
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          نوع البابور: {driver?.type ?? "—"} · الحمولة: {trip.payload || "—"} ·
          الوجهة: {trip.destination || trip.province || "—"}
        </p>
        <p style={{ margin: "4px 0 0", color: th.sub, fontSize: 11 }}>
          رقم الفك: {trip.breakNum || "—"} · تاريخ الخروج:{" "}
          {trip.completedAt ?? trip.createdAt}
        </p>
      </div>

      <p style={fieldLabel}>نوع العطل</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["قريب", "بعيد"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              setLocation(l)
              if (l === "بعيد") setAction("إبقاء_النهمة")
            }}
            style={toggleBtn(location === l, T.primary)}
          >
            <MonochromeIcon name="pin" size={15} />{" "}
            {l === "قريب" ? "قريب من المصنع" : "بعيد عن المصنع"}
          </button>
        ))}
      </div>

      <label style={{ ...fieldLabel, display: "block" }}>
        مكان العطل *
        <input
          list="breakdown-place-options"
          value={breakdownPlace}
          onChange={(e) => setBreakdownPlace(e.target.value)}
          placeholder="أدخل أو اختر مكان العطل..."
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
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
        <datalist id="breakdown-place-options">
          {placeSuggestions.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
      </label>

      <p style={{ ...fieldLabel, marginTop: 16 }}>
        مصير النهمة الأصلية *
        {location === "بعيد" && (
          <span
            style={{
              display: "block",
              marginTop: 4,
              color: th.muted,
              fontWeight: 400,
            }}
          >
            العطل البعيد يُبقي النهمة الأصلية مكتملة
          </span>
        )}
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(location === "بعيد"
          ? ["إبقاء_النهمة"] as const
          : ["إلغاء_النهمة", "إبقاء_النهمة"] as const
        ).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAction(a)}
            style={toggleBtn(
              action === a,
              a === "إلغاء_النهمة" ? T.danger : T.success,
            )}
          >
            {a === "إلغاء_النهمة" ? "إلغاء النهمة" : "إبقاء النهمة"}
          </button>
        ))}
      </div>

      <SearchableRosterField
        label="اختيار بابور مسعف *"
        query={rescuerSearch}
        onQueryChange={setRescuerSearch}
        selectedLabel={rescuerLabel || undefined}
        items={rescuers}
        getKey={(d) => d.id}
        formatLabel={(d) => d.ownerName}
        formatSubLabel={(d) =>
          `${d.plate} · ${d.status === "نشط" ? "نشط" : "غير نشط"}`
        }
        filterItem={(d, q) => matchesNameOrPlate(q, d.ownerName, d.plate)}
        onPick={(d) => setRescuerLabel(`${d.ownerName} · ${d.plate}`)}
        placeholder="ابحث بالاسم أو اللوحة..."
        emptyHint="لا يوجد مسعف مطابق (يُستبعد المخالفون)"
      />

      <div style={{ marginTop: 14 }}>
        <p style={fieldLabel}>نوع نهمة المسعف</p>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          {RESCUER_TRIP_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRescuerTripType(t)}
              style={{
                ...toggleBtn(rescuerTripType === t, T.primary),
                flex: t === "بدون" ? "1 1 100%" : 1,
                minWidth: 70,
              }}
            >
              {t === "بدون" ? "بدون (لا تُنشأ نهمة)" : t}
            </button>
          ))}
        </div>
      </div>

      {rescuerTripType !== "بدون" && (
        <label style={{ ...fieldLabel, display: "block", marginBottom: 12 }}>
          رقم الفك الجديد
          <input
            value={breakNum}
            onChange={(e) => setBreakNum(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
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
        </label>
      )}

      {location === "بعيد" && (
        <div style={{ marginBottom: 14 }}>
          <p style={fieldLabel}>عدد التعويضات للمسعف</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCompensationGiven(n)}
                style={{
                  ...toggleBtn(compensationGiven === n, T.warning),
                  flex: 1,
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <label style={{ ...fieldLabel, display: "block", marginBottom: 16 }}>
        ملاحظات
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="تفاصيل إضافية عن العطل..."
          style={{
            display: "block",
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${th.border}`,
            background: th.inputBg,
            color: th.text,
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </label>

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
          {isEdit ? (
            <>
              <MonochromeIcon name="check" size={15} /> حفظ التعديل
            </>
          ) : (
            <>
              <MonochromeIcon name="check" size={15} /> تأكيد تسجيل العطل
            </>
          )}
        </button>
      </div>
    </BottomSheet>
  )
}
