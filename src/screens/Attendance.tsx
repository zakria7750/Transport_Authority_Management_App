import { useState, useMemo } from "react"
import { useApp } from "../context"
import { StandardAppBar, useTheme, T, APP_PRINT_HEADER, MonochromeIcon } from "../components"
import { isPendingTripStatus } from "../domain"

export default function AttendanceScreen() {
  const { state, showSnackbar, scheduleDeferredAttendance } = useApp()
  const th = useTheme()
  const [search, setSearch] = useState("")
  const [attendance, setAttendance] = useState<Record<number, { m1: boolean; m2: boolean; t: boolean }>>({})
  const [saving, setSaving] = useState(false)

  const activeDrivers = useMemo(() => {
    return state.drivers.filter((d) => {
      if (d.status !== "نشط") return false
      if (!search) return true
      return d.ownerName.includes(search) || d.plate.includes(search)
    }).sort((a, b) => a.seq - b.seq || a.id - b.id)
  }, [state.drivers, search])

  const getDriverTripLabel = (driverId: number, slot: "م1" | "م2") => {
    const trip = state.trips.find(
      (t) => t.driverId === driverId && t.type === slot && isPendingTripStatus(t.status),
    )
    return trip ? trip.type : "—"
  }

  const toggle = (id: number, field: "m1" | "m2" | "t") => {
    setAttendance((prev) => ({
      ...prev,
      [id]: {
        m1: prev[id]?.m1 ?? true,
        m2: prev[id]?.m2 ?? true,
        t: prev[id]?.t ?? true,
        [field]: !(prev[id]?.[field] ?? (field === "t" ? true : true)),
      },
    }))
  }

  const getVal = (id: number, field: "m1" | "m2" | "t") => {
    if (field === "t") return attendance[id]?.t ?? true
    return attendance[id]?.[field] ?? true
  }

  const getAbsentIds = () =>
    activeDrivers
      .filter((d) => {
        const present = getVal(d.id, "t")
        const m1 = getVal(d.id, "m1")
        const m2 = getVal(d.id, "m2")
        return !present || (!m1 && !m2)
      })
      .map((d) => d.id)

  const handleSave = async () => {
    const absentIds = getAbsentIds()
    if (absentIds.length === 0) {
      showSnackbar("لا يوجد غياب لتسجيله")
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 400))
    setSaving(false)
    scheduleDeferredAttendance(absentIds, () => setAttendance({}))
  }

  const presentCount = activeDrivers.filter(
    (d) => getVal(d.id, "m1") || getVal(d.id, "m2"),
  ).length

  const printTwoColumnTable = (title: string, headers: string[], rows: string[][]) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      showSnackbar("يرجى السماح بفتح نافذة جديدة للطباعة")
      return
    }
    const date = new Date().toLocaleDateString("ar-SA")
    const half = Math.ceil(rows.length / 2)
    const left = rows.slice(0, half)
    const right = rows.slice(half)

    const tableHtml = (chunk: string[][], offset: number) => {
      if (chunk.length === 0) return ""
      let h = `<table><thead><tr>${headers.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>`
      chunk.forEach((row, i) => {
        h += `<tr><td>${offset + i + 1}</td>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`
      })
      return h + "</tbody></table>"
    }

    const html = `<html dir="rtl"><head><style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      .brand { text-align: center; font-size: 13px; color: #444; margin-bottom: 4px; }
      h1 { text-align: center; font-size: 18px; margin: 0 0 12px; }
      .cols { display: flex; gap: 16px; }
      .cols > div { flex: 1; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
      th, td { border: 1px solid #000; padding: 5px; text-align: center; }
      th { background: #eee; }
    </style></head><body>
      <p class="brand">${APP_PRINT_HEADER}</p>
      <h1>${title} — ${date}</h1>
      <div class="cols">
        <div>${tableHtml(left, 0)}</div>
        <div>${tableHtml(right, half)}</div>
      </div>
    </body></html>`

    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
    showSnackbar("تم فتح نافذة الطباعة ✅")
  }

  const handlePrintAttendance = () => {
    const rows = activeDrivers.map((d) => [
      String(d.seq),
      d.ownerName,
      d.type,
      d.plate,
      getVal(d.id, "m1") ? "✓" : "✕",
      getVal(d.id, "m2") ? "✓" : "✕",
      getVal(d.id, "t") ? "حضر" : "غياب",
    ])
    printTwoColumnTable("كشف التحضير", ["م", "المالك", "النوع", "اللوحة", "م1", "م2", "ملاحظة"], rows)
  }

  const handlePrintTrips = () => {
    const pending = state.trips.filter((t) => isPendingTripStatus(t.status))
    const rows = pending.map((trip) => {
      const driver = state.drivers.find((d) => d.id === trip.driverId)
      return [
        driver?.ownerName ?? "—",
        trip.type,
        driver?.plate ?? "—",
        trip.payload,
        trip.breakNum,
      ]
    })
    printTwoColumnTable("كشف النهمات", ["المالك", "النوع", "اللوحة", "الحمولة", "رقم الفك"], rows)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden" }}>
      <StandardAppBar title="كشف التحضير" back="home" />

      <div style={{ padding: "10px 16px", background: th.card, borderBottom: `1px solid ${th.border}` }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو رقم اللوحة..."
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
      </div>

      <div
        style={{
          background: T.appbar,
          padding: "8px 20px",
          display: "flex",
          gap: 20,
          alignItems: "center",
        }}
      >
        <span style={{ color: "#94A3B8", fontSize: 12 }}>
          إجمالي نشطين: <b style={{ color: "#F1F5F9" }}>{activeDrivers.length}</b>
        </span>
        <span style={{ color: "#94A3B8", fontSize: 12 }}>
          حضر: <b style={{ color: "#4ADE80" }}>{presentCount}</b>
        </span>
        <span style={{ color: "#94A3B8", fontSize: 12 }}>
          غياب: <b style={{ color: "#F87171" }}>{activeDrivers.length - presentCount}</b>
        </span>
      </div>

      <div
        style={{
          background: th.dark ? "#1E2D40" : "#F1F5F9",
          borderBottom: `2px solid ${T.primary}`,
          padding: "8px 16px",
          display: "grid",
          gridTemplateColumns: "32px 1fr 40px 72px 36px 36px 36px",
          gap: 6,
          alignItems: "center",
        }}
      >
        {["م", "المالك", "النوع", "اللوحة", "م1", "م2", "ت"].map((h) => (
          <span key={h} style={{ fontSize: 10, fontWeight: 800, color: th.sub, textAlign: "center" }}>
            {h}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", background: th.card }}>
        {activeDrivers.map((driver, idx) => (
          <div
            key={driver.id}
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 40px 72px 36px 36px 36px",
              gap: 6,
              alignItems: "center",
              padding: "10px 16px",
              borderBottom: `1px solid ${th.border}`,
              background: idx % 2 === 0 ? "transparent" : th.dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: T.primary, textAlign: "center" }}>
              {driver.seq}
            </span>
            <span
              style={{
                fontSize: 12,
                color: th.text,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {driver.ownerName}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                textAlign: "center",
                padding: "2px 4px",
                borderRadius: 6,
                background: driver.type === "س" ? "#DBEAFE" : "#D1FAE5",
                color: driver.type === "س" ? T.primary : T.success,
              }}
            >
              {driver.type}
            </span>
            <span style={{ fontSize: 10, color: th.sub, textAlign: "center" }}>{driver.plate}</span>

            {([
              ["m1", "م1"] as const,
              ["m2", "م2"] as const,
            ]).map(([field, tripType]) => (
              <div key={field} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div
                  onClick={() => toggle(driver.id, field)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    border: `2px solid ${getVal(driver.id, field) ? T.success : th.border}`,
                    background: getVal(driver.id, field) ? T.success : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {getVal(driver.id, field) && (
                     <MonochromeIcon name="check" size={13} />
                  )}
                </div>
                <span style={{ fontSize: 8, color: th.muted }}>{getDriverTripLabel(driver.id, tripType)}</span>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                onClick={() => toggle(driver.id, "t")}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: `2px solid ${getVal(driver.id, "t") ? T.success : T.danger}`,
                  background: getVal(driver.id, "t") ? T.success : T.danger,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {getVal(driver.id, "t") ? (
                   <MonochromeIcon name="check" size={13} />
                ) : (
                   <MonochromeIcon name="close" size={12} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "12px 16px",
          background: th.card,
          borderTop: `1px solid ${th.border}`,
          display: "flex",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2,
            padding: "12px",
            borderRadius: 12,
            border: "none",
            background: saving ? "#334155" : T.primary,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {saving ? <><MonochromeIcon name="loading" size={15} /> جاري الحفظ...</> : <><MonochromeIcon name="save" size={15} /> حفظ التحضير</>}
        </button>
        <button
          onClick={handlePrintAttendance}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 12,
            border: `1px solid ${th.border}`,
            background: "none",
            color: th.sub,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <MonochromeIcon name="note" size={15} /> التحضير
        </button>
        <button
          onClick={handlePrintTrips}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: 12,
            border: `1px solid ${th.border}`,
            background: "none",
            color: th.sub,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <MonochromeIcon name="truck" size={15} /> النهمات
        </button>
      </div>
    </div>
  )
}
