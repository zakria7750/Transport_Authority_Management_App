import { useState } from "react"
import { useApp } from "../context"
import { StandardAppBar, StatusChip, useTheme, T, Card, Input, Btn } from "../components"
import type { Driver, DriverType, DriverImages } from "../data"

type Tab = "info" | "guarantees" | "trips" | "violations"

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function DriverProfileScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const driverId = state.screenParams.driverId as number
  const driver: Driver | undefined = state.drivers.find((d) => d.id === driverId)
  const [tab, setTab] = useState<Tab>("info")
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    ownerName: "",
    plate: "",
    phone: "",
    type: "ع" as DriverType,
    separator: "",
  })
  const [editImages, setEditImages] = useState<DriverImages>({})

  if (!driver) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: th.bg }}>
        <p style={{ color: th.sub }}>السائق غير موجود</p>
      </div>
    )
  }

  const driverTrips = state.trips.filter((t) => t.driverId === driver.id)
  const driverViolations = state.violations.filter((v) => v.driverId === driver.id)
  const minG = state.minGuarantors

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "info", label: "المعلومات", icon: "👤" },
    { key: "guarantees", label: "الضمانات", icon: "🏦" },
    { key: "trips", label: "النهمات", icon: "🚛" },
    { key: "violations", label: "المخالفات", icon: "⚠️" },
  ]

  const openEdit = () => {
    setEditForm({
      ownerName: driver.ownerName,
      plate: driver.plate,
      phone: driver.phone,
      type: driver.type,
      separator: driver.separator,
    })
    setEditImages(driver.images ?? {})
    setEditing(true)
  }

  const saveEdit = () => {
    if (!editForm.ownerName || !editForm.plate || !editForm.phone) {
      showSnackbar("يرجى تعبئة الحقول المطلوبة ⚠️")
      return
    }
    const updated: Driver = {
      ...driver,
      ...editForm,
      images: Object.keys(editImages).length ? editImages : driver.images,
    }
    dispatch({ type: "UPDATE_DRIVER", driver: updated })
    if (Object.keys(editImages).length) {
      dispatch({ type: "SET_DRIVER_IMAGES", driverId: driver.id, images: editImages })
    }
    setEditing(false)
    showSnackbar("تم حفظ التعديلات ✅")
  }

  const handleImage = async (key: keyof DriverImages, file: File | undefined) => {
    if (!file) return
    const data = await readImageFile(file)
    setEditImages((prev) => ({ ...prev, [key]: data }))
  }

  const imageFields: { key: keyof DriverImages; label: string }[] = [
    { key: "frontId", label: "بطاقة (أمام)" },
    { key: "backId", label: "بطاقة (خلف)" },
    { key: "licenseImg", label: "رخصة / قعادة" },
    { key: "guaranteeImg", label: "صورة الضمانة" },
  ]

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden", position: "relative" }}>
      <StandardAppBar
        title="ملف السائق"
        back="drivers"
        extraRight={
          <button
            type="button"
            onClick={openEdit}
            style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
          >
            ✏️
          </button>
        }
      />

      <div
        style={{
          background: "linear-gradient(135deg, #0F2040 0%, #1D4ED8 100%)",
          padding: "20px 20px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              background: driver.type === "س" ? "rgba(59,130,246,0.3)" : "rgba(16,185,129,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              border: "2px solid rgba(255,255,255,0.15)",
              overflow: "hidden",
            }}
          >
            {driver.images?.licenseImg ? (
              <img src={driver.images.licenseImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              "🚗"
            )}
          </div>
          <div>
            <h2 style={{ color: "#F1F5F9", fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>{driver.ownerName}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: driver.type === "س" ? "#1D4ED8" : "#059669",
                  color: "#fff",
                }}
              >
                {driver.type}
              </span>
              <span style={{ color: "#94A3B8", fontSize: 12 }}>م {driver.seq || "—"}</span>
              <span style={{ color: "#94A3B8", fontSize: 12 }}>{driver.plate}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <StatusChip driver={driver} />
            </div>
          </div>
        </div>

        {driver.compensationBalance > 0 && (
          <div
            style={{
              marginTop: 16,
              background: "rgba(245,158,11,0.15)",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "#FCD34D", fontSize: 12 }}>💰 رصيد التعويض</span>
            <span style={{ color: "#FCD34D", fontSize: 18, fontWeight: 800 }}>
              {driver.compensationBalance.toLocaleString()} ريال
            </span>
          </div>
        )}
      </div>

      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, display: "flex", flexShrink: 0 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: "12px 4px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              color: tab === t.key ? T.primary : th.sub,
              borderBottom: `2px solid ${tab === t.key ? T.primary : "transparent"}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: tab === t.key ? 700 : 400,
            }}
          >
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "info" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: th.sub, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>
                  البيانات الأساسية
                </p>
                {[
                  { label: "اسم المالك", value: driver.ownerName },
                  { label: "رقم اللوحة", value: driver.plate },
                  { label: "نوع البابور", value: driver.type === "س" ? "سكس" : "عادي" },
                  { label: "رقم الهاتف", value: driver.phone },
                  { label: "الفاصل", value: driver.separator },
                  { label: "تاريخ الانضمام", value: driver.joinDate },
                  { label: "الرقم التسلسلي", value: driver.seq ? `م ${driver.seq}` : "—" },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: `1px solid ${th.border}`,
                    }}
                  >
                    <span style={{ fontSize: 12, color: th.sub }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {driver.images && Object.keys(driver.images).length > 0 && (
              <Card>
                <div style={{ padding: "14px 16px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: th.sub, margin: "0 0 12px" }}>📷 المرفقات</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {imageFields.map(({ key, label }) =>
                      driver.images?.[key] ? (
                        <div key={key}>
                          <p style={{ margin: "0 0 6px", fontSize: 10, color: th.sub }}>{label}</p>
                          <img
                            src={driver.images![key]}
                            alt={label}
                            style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 10, border: `1px solid ${th.border}` }}
                          />
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              </Card>
            )}

            <Card>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: th.sub, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>
                  الحالة الحالية
                </p>
                <StatusChip driver={driver} />
              </div>
            </Card>
          </div>
        )}

        {tab === "guarantees" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                background: driver.guarantors.filter((g) => g.status === "فعال" && !g.suspended).length >= minG ? "#D1FAE5" : "#FEE2E2",
                borderRadius: 12,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>
                {driver.guarantors.filter((g) => g.status === "فعال" && !g.suspended).length >= minG ? "✅" : "❌"}
              </span>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: th.text }}>
                  {driver.guarantors.filter((g) => g.status === "فعال" && !g.suspended).length >= minG ? "مستوفي الضمانات" : "ناقص الضمانات"}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: th.sub }}>
                  {driver.guarantors.filter((g) => g.status === "فعال" && !g.suspended).length} من {minG} ضامن مطلوب
                </p>
              </div>
            </div>

            {driver.guarantors.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: th.sub, fontSize: 13 }}>لا يوجد ضامنون مسجلون</div>
            ) : (
              driver.guarantors.map((g) => (
                <Card key={g.id}>
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
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: th.sub }}>{g.phone}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: th.muted }}>رقم الهوية: {g.nationalId}</p>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 99,
                        background: g.suspended ? "#FEE2E2" : g.status === "فعال" ? "#D1FAE5" : "#FEE2E2",
                        color: g.suspended ? T.danger : g.status === "فعال" ? "#065F46" : "#991B1B",
                        fontWeight: 700,
                      }}
                    >
                      {g.suspended ? "معلّق" : g.status}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "trips" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {driverTrips.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: th.sub, fontSize: 13 }}>لا توجد نهمات مسجلة</div>
            ) : (
              driverTrips.slice(0, 20).map((trip) => (
                <Card key={trip.id}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 99, background: T.primary, color: "#fff" }}>
                          {trip.type}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: trip.status.includes("مكتمل") ? T.success : T.warning,
                            background: trip.status.includes("مكتمل") ? "#D1FAE5" : "#FEF9C3",
                            padding: "2px 8px",
                            borderRadius: 99,
                          }}
                        >
                          {trip.status}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: th.sub }}>{trip.createdAt}</span>
                    </div>
                    {trip.type !== "تعويض" && (
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: th.sub }}>📦 {trip.payload}</span>
                        <span style={{ fontSize: 12, color: th.sub }}>
                          📍 {trip.province} · {trip.destinationType}: {trip.destination}
                        </span>
                        <span style={{ fontSize: 12, color: th.sub }}>🔩 {trip.breakNum}</span>
                      </div>
                    )}
                    {trip.compensationAmount != null && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.warning }}>
                        💰 {trip.compensationAmount.toLocaleString()} ريال
                      </span>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "violations" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {driverViolations.length === 0 ? (
              <div style={{ textAlign: "center", padding: 32, color: th.sub, fontSize: 13 }}>لا توجد مخالفات مسجلة</div>
            ) : (
              driverViolations.map((v) => (
                <Card key={v.id}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span
                        style={{
                          fontSize: 13,
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
                          padding: "3px 10px",
                          borderRadius: 99,
                          background: v.raised ? "#D1FAE5" : "#FEE2E2",
                          color: v.raised ? "#065F46" : "#991B1B",
                          fontWeight: 700,
                        }}
                      >
                        {v.raised ? "مرفوعة" : "مفتوحة"}
                      </span>
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: th.text }}>{v.note}</p>
                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: th.sub }}>📅 {v.date}</span>
                      {v.raisedDate && <span style={{ fontSize: 11, color: T.success }}>✅ رُفعت {v.raisedDate}</span>}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {editing && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setEditing(false)} />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: th.card,
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
              maxHeight: "90%",
              overflowY: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 16px", color: th.text, fontSize: 16 }}>تعديل بيانات السائق</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Input label="اسم المالك *" value={editForm.ownerName} onChange={(e) => setEditForm((p) => ({ ...p, ownerName: e.target.value }))} />
              <Input label="رقم اللوحة *" value={editForm.plate} onChange={(e) => setEditForm((p) => ({ ...p, plate: e.target.value }))} />
              <Input label="رقم الهاتف *" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
              <Input label="الفاصل" value={editForm.separator} onChange={(e) => setEditForm((p) => ({ ...p, separator: e.target.value }))} />
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 8 }}>نوع البابور</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["ع", "س"] as DriverType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditForm((p) => ({ ...p, type: t }))}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        border: `2px solid ${editForm.type === t ? T.primary : th.border}`,
                        background: editForm.type === t ? "#EFF6FF" : "none",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {t === "س" ? "سكس" : "عادي"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>📷 المرفقات</span>
                {imageFields.map(({ key, label }) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: `1px dashed ${th.border}`,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {label}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => void handleImage(key, e.target.files?.[0])} />
                    <span style={{ color: editImages[key] || driver.images?.[key] ? T.success : T.primary, fontWeight: 700 }}>
                      {editImages[key] || driver.images?.[key] ? "✓ مرفق" : "رفع"}
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn variant="ghost" fullWidth onClick={() => setEditing(false)}>
                  إلغاء
                </Btn>
                <Btn fullWidth onClick={saveEdit}>
                  حفظ ✓
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
