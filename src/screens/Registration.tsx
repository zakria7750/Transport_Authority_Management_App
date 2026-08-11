import { useState, useEffect } from "react"
import { useApp } from "../context"
import { StandardAppBar, useTheme, T, Input, Btn, EmptyState, SearchableRosterField, MonochromeIcon } from "../components"
import { ADDABLE_STATUS_REASONS } from "../constants"
import { countActiveGuarantors, eligibleGuarantorDrivers, canBeGuarantor, guarantorFromRosterDriver, matchesNameOrPlate } from "../domain"
import { nextId } from "../domain"
import type { Driver, DriverType, DriverImages, Guarantor } from "../data"

type Tab = "register" | "add"

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function RegistrationScreen() {
  const { state, dispatch, showSnackbar, navigate } = useApp()
  const th = useTheme()
  const initialTab = (state.screenParams.tab as Tab) ?? "register"
  const [tab, setTab] = useState<Tab>(initialTab)

  useEffect(() => {
    if (state.screenParams.tab === "add" || state.screenParams.tab === "register") {
      setTab(state.screenParams.tab as Tab)
    }
  }, [state.screenParams.tab])

  const [form, setForm] = useState({
    ownerName: "",
    plate: "",
    phone: "",
    type: "ع" as DriverType,
    separator: "",
    separatorNum: "", // Numeric separator field
  })
  const [images, setImages] = useState<DriverImages>({})
  const [guarantorSearch, setGuarantorSearch] = useState("")
  const [guarantors, setGuarantors] = useState<Omit<Guarantor, "status">[]>([])
  const [saving, setSaving] = useState(false)
  const [addSearch, setAddSearch] = useState("")
  const [guarantorDialog, setGuarantorDialog] = useState<{ driverId: number; name: string } | null>(null)
  const [extraGuarantorName, setExtraGuarantorName] = useState("")

  const addableDrivers = state.drivers.filter(
    (d) =>
      d.status === "غير_نشط" &&
      !d.violation &&
      d.statusReason &&
      ADDABLE_STATUS_REASONS.includes(d.statusReason as (typeof ADDABLE_STATUS_REASONS)[number]),
  )

  const filteredInactive = addableDrivers.filter(
    (d) => !addSearch || matchesNameOrPlate(addSearch, d.ownerName, d.plate),
  )

  const handleImage = async (key: keyof DriverImages, file: File | undefined) => {
    if (!file) return
    const data = await readImageFile(file)
    setImages((prev) => ({ ...prev, [key]: data }))
  }

  const guarantorCandidates = eligibleGuarantorDrivers(state.drivers)

  const addGuarantorFromDriver = (driver: Driver) => {
    if (!canBeGuarantor(driver)) {
      showSnackbar("لا يمكن للمخالف أن يكون ضامناً ⚠️")
      return
    }
    if (guarantors.some((g) => g.name === driver.ownerName)) {
      showSnackbar("الضامن مضاف مسبقاً")
      return
    }
    setGuarantors((p) => [...p, guarantorFromRosterDriver(driver, nextId())])
    setGuarantorSearch("")
    showSnackbar(`تم إضافة ${driver.ownerName} كضامن ✅`)
  }

  const handleRegister = async () => {
    // Task 29: Validate separator as numeric
    if (!form.ownerName || !form.plate || !form.phone || !form.separator) {
      showSnackbar("يرجى تعبئة جميع الحقول المطلوبة ⚠️")
      return
    }
    // Task 30: Validate front and back ID cards are required
    if (!images.frontId || !images.backId) {
      showSnackbar("يرجى إرفاق صورة البطاقة (أمام وخلف) ⚠️")
      return
    }
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    const meetsMin = guarantors.length >= state.minGuarantors
    const newDriver: Driver = {
      id: nextId(),
      seq: 0,
      ownerName: form.ownerName,
      type: form.type,
      plate: form.plate,
      phone: form.phone,
      status: meetsMin ? "نشط" : "غير_نشط",
      statusReason: meetsMin ? null : "بدون_ضمانة",
      currentTrip: null,
      violation: null,
      compensationBalance: 0,
      separator: form.separator,
      joinDate: new Date().toLocaleDateString("ar-SA"),
      guarantors: guarantors.map((g, i) => ({
        ...g,
        status: "فعال" as const,
        id: nextId() + i,
      })),
      images: Object.keys(images).length ? images : undefined,
    }
    const name = form.ownerName
    dispatch({ type: "ADD_DRIVER", driver: newDriver })
    setSaving(false)
    setForm({ ownerName: "", plate: "", phone: "", type: "ع", separator: "", separatorNum: "" })
    setGuarantors([])
    setImages({})
    showSnackbar(`تم تسجيل ${name} بنجاح ✅`)
    // Task 34: Navigate home (or appropriate screen) after registration
    setTimeout(() => navigate("home"), 800)
  }

  const tryActivate = (driver: Driver) => {
    if (countActiveGuarantors(driver) < state.minGuarantors) {
      setGuarantorDialog({ driverId: driver.id, name: driver.ownerName })
      return
    }
    dispatch({ type: "RE_REGISTER_DRIVER", driverId: driver.id })
    showSnackbar(`تم إعادة تسجيل ${driver.ownerName} في الكشف النشط ✅`)
  }

  const addGuarantorToDriver = () => {
    if (!guarantorDialog || !extraGuarantorName.trim()) return
    const driver = state.drivers.find((d) => d.id === guarantorDialog.driverId)
    if (!driver) return
    const newG: Guarantor = {
      id: nextId(),
      name: extraGuarantorName,
      phone: "05" + Math.floor(10000000 + Math.random() * 90000000),
      nationalId: "10" + Math.floor(10000000 + Math.random() * 90000000),
      status: "فعال",
    }
    const updated = [...driver.guarantors, newG]
    dispatch({ type: "UPDATE_GUARANTORS", driverId: driver.id, guarantors: updated })
    setExtraGuarantorName("")
    setGuarantorDialog(null)
    if (updated.filter((g) => g.status === "فعال" && !g.suspended).length >= state.minGuarantors) {
      showSnackbar(`تم إضافة ${driver.ownerName} للكشف بعد اكتمال الضمانات ✅`)
    } else {
      showSnackbar("تم إضافة الضامن — لا يزال العدد ناقصاً")
    }
  }

  const imageFields: { key: keyof DriverImages; label: string }[] = [
    { key: "frontId", label: "بطاقة (أمام)" },
    { key: "backId", label: "بطاقة (خلف)" },
    { key: "licenseImg", label: "رخصة / قعادة" },
    { key: "guaranteeImg", label: "صورة الضمانة" },
  ]

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden" }}>
      <StandardAppBar title="تسجيل جديد" back={state.user?.role === "موظف_تسجيل" ? undefined : "home"} />

      <div style={{ padding: "12px 16px", background: th.card, borderBottom: `1px solid ${th.border}` }}>
        <div
          style={{
            background: th.dark ? "#1E2D40" : "#F1F5F9",
            borderRadius: 12,
            padding: 4,
            display: "flex",
            gap: 4,
          }}
        >
          {[
            { key: "register", label: "تسجيل مالك", icon: "note" },
            { key: "add", label: "إضافة مالك", icon: "plus" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key as Tab)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 10,
                border: "none",
                background: tab === t.key ? T.primary : "transparent",
                color: tab === t.key ? "#fff" : th.sub,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <MonochromeIcon name={t.icon} size={15} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "register" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 8 }}>
                نوع البابور
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { val: "ع", label: "عادي" },
                  { val: "س", label: "سكس" },
                ].map((t) => (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, type: t.val as DriverType }))}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: 12,
                      border: `2px solid ${form.type === t.val ? T.primary : th.border}`,
                      background: form.type === t.val ? "#EFF6FF" : "none",
                      color: form.type === t.val ? T.primary : th.sub,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <MonochromeIcon name="truck" size={16} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="اسم المالك *"
              value={form.ownerName}
              onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))}
              placeholder="أدخل الاسم الكامل"
              icon="👤"
            />
            <Input
              label="رقم اللوحة *"
              value={form.plate}
              onChange={(e) => setForm((p) => ({ ...p, plate: e.target.value }))}
              placeholder="مثال: ع ب ج 1234"
              icon="🚗"
            />
            <Input
              label="رقم الهاتف *"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="05xxxxxxxx"
              icon="📞"
            />
            <Input
              label="الفاصل (رقم) *"
              value={form.separator}
              onChange={(e) => setForm((p) => ({ ...p, separator: e.target.value.replace(/[^\d\u0660-\u0669]/g, "") }))}
              placeholder="مثال: 12"
              icon="🔢"
              inputMode="numeric"
            />

            <div
              style={{
                background: th.card,
                borderRadius: 14,
                border: `1px solid ${th.border}`,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: th.text, display: "flex", alignItems: "center", gap: 6 }}><MonochromeIcon name="camera" size={16} /> المرفقات (إلزامي: أمام + خلف)</span>
              {imageFields.map(({ key, label }) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: `1px dashed ${(key === "frontId" || key === "backId") && !images[key] ? T.danger : th.border}`,
                    cursor: "pointer",
                    fontSize: 12,
                    color: th.sub,
                  }}
                >
                  {label}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => void handleImage(key, e.target.files?.[0])}
                  />
                  <span style={{ color: images[key] ? T.success : T.primary, fontWeight: 700 }}>
                    {images[key] ? "✓ مرفق" : "رفع"}
                  </span>
                </label>
              ))}
            </div>

            <div
              style={{
                background: th.card,
                borderRadius: 14,
                border: `1px solid ${th.border}`,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>الضامنون</span>
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 99,
                    background: guarantors.length >= state.minGuarantors ? "#D1FAE5" : "#FEE2E2",
                    color: guarantors.length >= state.minGuarantors ? "#065F46" : "#991B1B",
                    fontWeight: 700,
                  }}
                >
                  {guarantors.length}/{state.minGuarantors} مطلوب
                </span>
              </div>
              <SearchableRosterField
                label="بحث ضامن من الكشف"
                query={guarantorSearch}
                onQueryChange={setGuarantorSearch}
                items={guarantorCandidates.filter(canBeGuarantor).filter(
                  (d) => !guarantors.some((g) => g.name === d.ownerName),
                )}
                getKey={(d) => d.id}
                formatLabel={(d) => d.ownerName}
                formatSubLabel={(d) => `${d.plate} · ${d.status === "نشط" ? "نشط" : "غير نشط"}`}
                filterItem={(d, q) => matchesNameOrPlate(q, d.ownerName, d.plate)}
                onAction={addGuarantorFromDriver}
                actionLabel="إضافة"
                placeholder="ابحث بالاسم أو اللوحة..."
                emptyHint="لا يوجد ضامن مطابق — جرّب اسم أو لوحة أخرى"
              />
              {guarantors.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: th.dark ? "#1E2D40" : "#F8FAFC",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                   <MonochromeIcon name="bank" size={16} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: th.text }}>{g.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: th.sub }}>{g.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGuarantors((p) => p.filter((x) => x.id !== g.id))}
                    style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 18 }}
                  >
                     <MonochromeIcon name="close" size={16} />
                  </button>
                </div>
              ))}
            </div>

            <Btn onClick={handleRegister} fullWidth disabled={saving}>
              {saving ? <><MonochromeIcon name="loading" size={16} /> جاري الحفظ...</> : <><MonochromeIcon name="check" size={16} /> حفظ وتسجيل</>}
            </Btn>
          </div>
        )}

        {tab === "add" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Input
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              placeholder="بحث بالاسم أو رقم اللوحة..."
              icon="🔍"
            />
            {filteredInactive.length === 0 ? (
              <EmptyState icon="📭" text="لا يوجد بوابير يمكن إضافتها للكشف" />
            ) : (
              filteredInactive.map((driver) => (
                <div
                  key={driver.id}
                  style={{
                    background: th.card,
                    borderRadius: 14,
                    border: `1px solid ${th.border}`,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: driver.type === "س" ? "#DBEAFE" : "#F0FDF4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      color: driver.type === "س" ? T.primary : T.success,
                    }}
                  >
                    {driver.statusReason === "قابل_للإضافة" ? <MonochromeIcon name="plus" size={18} /> : "—"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: th.text }}>
                      {driver.ownerName}
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: th.sub }}>
                      {driver.plate} · {driver.statusReason?.replace("_", " ")}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 10, color: th.muted }}>
                      ضامنون: {countActiveGuarantors(driver)}/{state.minGuarantors}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => tryActivate(driver)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "none",
                      background: T.primary,
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    إضافة <MonochromeIcon name="check" size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {guarantorDialog && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200 }}>
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }}
            onClick={() => setGuarantorDialog(null)}
          />
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
            <h3 style={{ margin: "0 0 8px", color: th.text, fontSize: 16 }}>ضمانات ناقصة</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: th.sub }}>
              {guarantorDialog.name} لا يستوفي الحد الأدنى — أضف ضامناً أو انتقل لشاشة الضمانات
            </p>
            <input
              value={extraGuarantorName}
              onChange={(e) => setExtraGuarantorName(e.target.value)}
              placeholder="اسم الضامن الجديد"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${th.border}`,
                marginBottom: 12,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setGuarantorDialog(null)
                  navigate("guarantees")
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  border: `1px solid ${th.border}`,
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                شاشة الضمانات
              </button>
              <button
                type="button"
                onClick={addGuarantorToDriver}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  background: T.primary,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                إضافة ضامن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
