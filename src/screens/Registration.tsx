import { useState } from 'react'
import { useApp } from '../context'
import { AppBar, useTheme, T, Input, Btn, EmptyState } from '../components'
import type { Driver, DriverType } from '../data'

type Tab = 'register' | 'add'

export default function RegistrationScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [tab, setTab] = useState<Tab>('register')

  // Register form state
  const [form, setForm] = useState({
    ownerName: '', plate: '', phone: '', type: 'ع' as DriverType, separator: '',
  })
  const [guarantorSearch, setGuarantorSearch] = useState('')
  const [guarantors, setGuarantors] = useState<{ id: number; name: string; phone: string; nationalId: string }[]>([])
  const [saving, setSaving] = useState(false)

  // Add tab state
  const [addSearch, setAddSearch] = useState('')

  const inactiveNonViolators = state.drivers.filter(
    d => d.status === 'غير_نشط' && !d.violation && d.statusReason !== 'ملغي'
  )

  const filteredInactive = inactiveNonViolators.filter(d =>
    !addSearch || d.ownerName.includes(addSearch) || d.plate.includes(addSearch)
  )

  const handleRegister = async () => {
    if (!form.ownerName || !form.plate || !form.phone) {
      showSnackbar('يرجى تعبئة جميع الحقول المطلوبة ⚠️')
      return
    }
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    const newSeq = Math.max(...state.drivers.map(d => d.seq)) + 1
    const newDriver: Driver = {
      id: Date.now(),
      seq: newSeq,
      ownerName: form.ownerName,
      type: form.type,
      plate: form.plate,
      phone: form.phone,
      status: guarantors.length >= state.minGuarantors ? 'نشط' : 'غير_نشط',
      statusReason: guarantors.length < state.minGuarantors ? 'بدون_ضمانة' : null,
      currentTrip: null,
      violation: null,
      compensationBalance: 0,
      separator: form.separator || form.ownerName.charAt(0),
      joinDate: new Date().toLocaleDateString('ar-SA'),
      guarantors: guarantors.map((g, i) => ({ ...g, status: 'فعال' as const, id: Date.now() + i })),
    }
    dispatch({ type: 'ADD_DRIVER', driver: newDriver })
    setSaving(false)
    setForm({ ownerName: '', plate: '', phone: '', type: 'ع', separator: '' })
    setGuarantors([])
    showSnackbar(`تم تسجيل المالك ${form.ownerName} بنجاح ✅`)
  }

  const handleActivate = (driverId: number, driverName: string) => {
    dispatch({ type: 'ACTIVATE_DRIVER', driverId })
    showSnackbar(`تم إضافة ${driverName} للكشف النشط ✅`, () => {
      dispatch({ type: 'NAVIGATE', screen: 'registration', params: {} })
    })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="تسجيل جديد" />

      {/* Segmented Control */}
      <div style={{ padding: '12px 16px', background: th.card, borderBottom: `1px solid ${th.border}` }}>
        <div style={{
          background: th.dark ? '#1E2D40' : '#F1F5F9',
          borderRadius: 12, padding: 4,
          display: 'flex', gap: 4,
        }}>
          {[{ key: 'register', label: '📝 تسجيل مالك' }, { key: 'add', label: '➕ إضافة مالك' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as Tab)}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                background: tab === t.key ? T.primary : 'transparent',
                color: tab === t.key ? '#fff' : th.sub,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* ── Tab: Register ──────────────────────────── */}
        {tab === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Driver Type */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: 'block', marginBottom: 8 }}>نوع البابور</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ val: 'ع', label: 'عادي' }, { val: 'س', label: 'سكس' }].map(t => (
                  <button key={t.val} onClick={() => setForm(p => ({ ...p, type: t.val as DriverType }))}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 12,
                      border: `2px solid ${form.type === t.val ? T.primary : th.border}`,
                      background: form.type === t.val ? '#EFF6FF' : 'none',
                      color: form.type === t.val ? T.primary : th.sub,
                      fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}>
                    {t.val === 'ع' ? '🚛 ' : '🚚 '}{t.label}
                  </button>
                ))}
              </div>
            </div>

            <Input label="اسم المالك *" value={form.ownerName}
              onChange={e => setForm(p => ({ ...p, ownerName: e.target.value }))}
              placeholder="أدخل الاسم الكامل" icon="👤" />

            <Input label="رقم اللوحة *" value={form.plate}
              onChange={e => setForm(p => ({ ...p, plate: e.target.value }))}
              placeholder="مثال: ع ب ج 1234" icon="🚗" />

            <Input label="رقم الهاتف *" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="05xxxxxxxx" icon="📞" />

            <Input label="الفاصل" value={form.separator}
              onChange={e => setForm(p => ({ ...p, separator: e.target.value }))}
              placeholder="الحرف الفاصل" icon="🔤" />

            {/* Guarantors Section */}
            <div style={{
              background: th.card, borderRadius: 14, border: `1px solid ${th.border}`,
              padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>الضامنون</span>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 99,
                  background: guarantors.length >= state.minGuarantors ? '#D1FAE5' : '#FEE2E2',
                  color: guarantors.length >= state.minGuarantors ? '#065F46' : '#991B1B',
                  fontWeight: 700,
                }}>{guarantors.length}/{state.minGuarantors} مطلوب</span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <input value={guarantorSearch}
                  onChange={e => setGuarantorSearch(e.target.value)}
                  placeholder="ابحث عن ضامن بالاسم..."
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10,
                    border: `1px solid ${th.border}`, background: th.inputBg,
                    color: th.text, fontSize: 13, outline: 'none',
                    fontFamily: 'inherit', direction: 'rtl',
                  }} />
                <button
                  onClick={() => {
                    if (!guarantorSearch.trim()) return
                    const newG = {
                      id: Date.now(),
                      name: guarantorSearch,
                      phone: '05' + Math.floor(10000000 + Math.random() * 90000000),
                      nationalId: '10' + Math.floor(10000000 + Math.random() * 90000000),
                    }
                    setGuarantors(p => [...p, newG])
                    setGuarantorSearch('')
                  }}
                  style={{
                    padding: '10px 16px', borderRadius: 10, border: 'none',
                    background: T.primary, color: '#fff', fontSize: 13,
                    fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>+ إضافة</button>
              </div>

              {guarantors.map(g => (
                <div key={g.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: th.dark ? '#1E2D40' : '#F8FAFC',
                  borderRadius: 10, padding: '10px 12px',
                }}>
                  <span style={{ fontSize: 16 }}>🏦</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: th.text }}>{g.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: th.sub }}>{g.phone}</p>
                  </div>
                  <button onClick={() => setGuarantors(p => p.filter(x => x.id !== g.id))}
                    style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 18 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <Btn onClick={handleRegister} fullWidth disabled={saving}>
              {saving ? '⏳ جاري الحفظ...' : '✅ حفظ وتسجيل'}
            </Btn>
          </div>
        )}

        {/* ── Tab: Add ───────────────────────────────── */}
        {tab === 'add' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input
              value={addSearch}
              onChange={e => setAddSearch(e.target.value)}
              placeholder="🔍 بحث بالاسم أو رقم اللوحة..."
              icon="🔍"
            />

            {filteredInactive.length === 0 ? (
              <EmptyState icon="📭" text="لا يوجد بوابير يمكن إضافتها للكشف" />
            ) : (
              filteredInactive.map(driver => (
                <div key={driver.id} style={{
                  background: th.card, borderRadius: 14,
                  border: `1px solid ${th.border}`, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: driver.type === 'س' ? '#DBEAFE' : '#F0FDF4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                    color: driver.type === 'س' ? T.primary : T.success,
                  }}>م{driver.seq}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: th.text }}>{driver.ownerName}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: th.sub }}>
                      {driver.plate} · {driver.statusReason?.replace('_', ' ') ?? driver.status}
                    </p>
                  </div>
                  <button
                    onClick={() => handleActivate(driver.id, driver.ownerName)}
                    style={{
                      padding: '8px 14px', borderRadius: 10, border: 'none',
                      background: T.primary, color: '#fff',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>إضافة ✓</button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
