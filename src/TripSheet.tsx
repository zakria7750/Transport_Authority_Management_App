import { useState, useMemo } from "react"
import { useApp } from "./context"
import { BottomSheet, useTheme, T, SearchableField, MonochromeIcon } from "./components"
import { YEMEN_PROVINCES, PAYLOAD_OPTIONS, DESTINATION_TYPES, DESTINATION_SUGGESTIONS } from "./constants"
import { suggestNextBreakNum, formatPayload } from "./domain"
import type { Driver, Trip, TripType, DestinationType } from "./data"

type Props = {
  driver: Driver
  existingTrip?: Trip
  onClose: () => void
}

export default function TripSheet({ driver, existingTrip, onClose }: Props) {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const isEdit = !!existingTrip

  const [tripType, setTripType] = useState<TripType>(existingTrip?.type ?? "فرزة")
  const [payloadItems, setPayloadItems] = useState<string[]>(
    existingTrip?.payload ? existingTrip.payload.split("، ").filter(Boolean) : [],
  )
  const [province, setProvince] = useState(existingTrip?.province ?? "صنعاء")
  const [destinationType, setDestinationType] = useState<DestinationType>(
    existingTrip?.destinationType ?? "فرع",
  )
  const [destination, setDestination] = useState(existingTrip?.destination ?? "")
  const [breakNum, setBreakNum] = useState(
    existingTrip?.breakNum ?? suggestNextBreakNum(state.trips),
  )
  const [compensationCount, setCompensationCount] = useState(
    String(existingTrip?.compensationAmount ?? 1),
  )

  const togglePayload = (item: string) => {
    setPayloadItems((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item],
    )
  }

  const selectAllPayload = () => setPayloadItems([...PAYLOAD_OPTIONS])

  const payloadStr = useMemo(() => formatPayload(payloadItems), [payloadItems])

  const confirm = () => {
    const count = Number.parseInt(compensationCount, 10)
    if (tripType === "تعويض" && (!Number.isInteger(count) || count < 1)) {
      showSnackbar("أدخل عدد تعويضات صحيحاً")
      return
    }
    if (tripType === "تعويض" && driver.compensationBalance < count) {
      showSnackbar("رصيد التعويضات غير كافٍ")
      return
    }
    if (isEdit && existingTrip) {
      dispatch({
        type: "EDIT_TRIP",
        edit: {
          tripId: existingTrip.id,
          payload: payloadStr,
          province,
          destinationType,
          destination,
          breakNum,
        },
      })
      showSnackbar(`تم تحديث نهمة ${driver.ownerName} ✅`)
      onClose()
      return
    }
    dispatch({
      type: "CREATE_TRIP",
      trip: {
        driverId: driver.id,
        tripType,
        payload: payloadStr,
        province,
        destinationType,
        destination,
        breakNum,
        asDraft: false,
        compensationAmount: tripType === "تعويض" ? count : undefined,
      },
    })
    showSnackbar(`تم إنشاء نهمة (${tripType}) للسائق ${driver.ownerName} ✅`)
    onClose()
  }

  return (
    <BottomSheet
      title={isEdit ? "تعديل النهمة" : "إنشاء نهمة"}
      subtitle={`${driver.ownerName} · ${driver.plate}`}
      onClose={onClose}
      presentation="dialog"
    >
      {!isEdit && (
        <>
          <p style={{ fontSize: 12, fontWeight: 600, color: th.sub, margin: "0 0 8px" }}>نوع النهمة</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            {(["فرزة", "م1", "م2", "تعويض"] as TripType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTripType(t)}
                style={{
                  padding: "10px 4px",
                  borderRadius: 10,
                  border: "none",
                  background: tripType === t ? T.primary : th.inputBg,
                  color: tripType === t ? "#fff" : th.text,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      {tripType === "تعويض" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <div style={{ padding: "12px 14px", borderRadius: 12, background: th.inputBg, border: `1px solid ${th.border}` }}>
            <p style={{ margin: 0, fontSize: 12, color: th.sub }}>رصيد التعويضات المتاح</p>
            <strong style={{ display: "block", marginTop: 4, color: th.text }}>{driver.compensationBalance} تعويض</strong>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600, color: th.sub }}>عدد التعويضات</label>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={compensationCount}
            onChange={(e) => setCompensationCount(e.target.value.replace(/[^0-9]/g, ""))}
            style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, outline: "none" }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.sub }}>الحمولة</label>
              <button
                type="button"
                onClick={selectAllPayload}
                style={{
                  background: "none",
                  border: "none",
                  color: T.primary,
                  fontSize: 11,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                منوع (الكل)
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PAYLOAD_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePayload(p)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 99,
                    border: `1px solid ${payloadItems.includes(p) ? T.primary : th.border}`,
                    background: payloadItems.includes(p) ? "#DBEAFE" : th.inputBg,
                    color: th.text,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <SearchableField
            label="المحافظة"
            value={province}
            onChange={setProvince}
            options={[...YEMEN_PROVINCES]}
            placeholder="ابحث عن محافظة..."
          />

          <SearchableField
            label="نوع الوجهة"
            value={destinationType}
            onChange={(v) => {
              if ((DESTINATION_TYPES as readonly string[]).includes(v)) {
                setDestinationType(v as DestinationType)
              }
            }}
            options={[...DESTINATION_TYPES]}
            placeholder="ابحث عن نوع الوجهة (وكيل، فرع، تصدير)..."
          />

          <SearchableField
            label="الوجهة"
            value={destination}
            onChange={setDestination}
            options={[...DESTINATION_SUGGESTIONS]}
            placeholder="ابحث عن وجهة..."
            allowCustom
          />

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 6 }}>
              رقم الفك
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
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                direction: "rtl",
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={confirm}
          disabled={tripType === "تعويض" && (driver.compensationBalance <= 0 || !Number.isInteger(Number.parseInt(compensationCount, 10)) || Number.parseInt(compensationCount, 10) < 1)}
          style={{
            flex: 1,
            padding: "13px",
            borderRadius: 12,
            border: "none",
            background: tripType === "تعويض" && driver.compensationBalance <= 0 ? th.border : T.primary,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            cursor: tripType === "تعويض" && driver.compensationBalance <= 0 ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {isEdit ? <><MonochromeIcon name="check" size={15} /> حفظ التعديل</> : <><MonochromeIcon name="check" size={15} /> تأكيد مبدئي</>}
        </button>
      </div>
    </BottomSheet>
  )
}
