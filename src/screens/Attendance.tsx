import { useState, useMemo } from 'react'
import { useApp } from '../context'
import { AppBar, useTheme, T } from '../components'

export default function AttendanceScreen() {
  const { state, showSnackbar } = useApp()
  const th = useTheme()
  const [search, setSearch] = useState('')
  const [attendance, setAttendance] = useState<Record<number, { m1: boolean; m2: boolean; t: boolean }>>({})
  const [saving, setSaving] = useState(false)

  const activeDrivers = useMemo(() => {
    return state.drivers.filter(d => {
      if (d.status !== 'نشط') return false
      if (!search) return true
      return d.ownerName.includes(search) || d.plate.includes(search)
    })
  }, [state.drivers, search])

  const toggle = (id: number, field: 'm1' | 'm2' | 't') => {
    setAttendance(prev => ({
      ...prev,
      [id]: {
        m1: prev[id]?.m1 ?? true,
        m2: prev[id]?.m2 ?? true,
        t: prev[id]?.t ?? false,
        [field]: !(prev[id]?.[field] ?? (field === 't' ? false : true)),
      }
    }))
  }

  const getVal = (id: number, field: 'm1' | 'm2' | 't') => {
    if (field === 't') return attendance[id]?.t ?? false
    return attendance[id]?.[field] ?? true
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 900))
    setSaving(false)
    showSnackbar('تم حفظ كشف التحضير بنجاح ✅', () => setAttendance({}))
  }

  const presentCount = activeDrivers.filter(d => getVal(d.id, 'm1') || getVal(d.id, 'm2')).length

  const handlePrintAttendance = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showSnackbar('يرجى السماح بفتح نافذة جديدة للطباعة')
      return
    }
    const date = new Date().toLocaleDateString('ar-SA')
    let html = `<html dir="rtl"><head><style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { text-align: center; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { border: 1px solid #000; padding: 8px; text-align: center; }
      th { background: #f0f0f0; font-weight: bold; }
      @media print { body { margin: 0; padding: 10px; } }
    </style></head><body>`
    html += `<h1>كشف التحضير - ${date}</h1>`
    html += `<table><thead><tr><th>م</th><th>المالك</th><th>النوع</th><th>اللوحة</th><th>م1</th><th>م2</th><th>ملاحظة</th></tr></thead><tbody>`
    activeDrivers.forEach(driver => {
      const m1 = getVal(driver.id, 'm1') ? '✓' : '✕'
      const m2 = getVal(driver.id, 'm2') ? '✓' : '✕'
      const note = getVal(driver.id, 't') ? 'مخالفة' : 'حضر'
      html += `<tr><td>${driver.seq}</td><td>${driver.ownerName}</td><td>${driver.type}</td><td>${driver.plate}</td><td>${m1}</td><td>${m2}</td><td>${note}</td></tr>`
    })
    html += `</tbody></table></body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
    showSnackbar('تم فتح نافذة الطباعة ✅')
  }

  const handlePrintTrips = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showSnackbar('يرجى السماح بفتح نافذة جديدة للطباعة')
      return
    }
    const date = new Date().toLocaleDateString('ar-SA')
    let html = `<html dir="rtl"><head><style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { text-align: center; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th, td { border: 1px solid #000; padding: 8px; text-align: center; }
      th { background: #f0f0f0; font-weight: bold; }
      @media print { body { margin: 0; padding: 10px; } }
    </style></head><body>`
    html += `<h1>كشف النهمات - ${date}</h1>`
    html += `<table><thead><tr><th>م</th><th>المالك</th><th>النوع</th><th>اللوحة</th><th>الحالة</th><th>الوقت</th></tr></thead><tbody>`
    state.trips.filter(t => t.status !== 'ملغاة').forEach((trip, idx) => {
      const driver = state.drivers.find(d => d.id === trip.driverId)
      html += `<tr><td>${idx + 1}</td><td>${driver?.ownerName}</td><td>${trip.type}</td><td>${driver?.plate}</td><td>${trip.status}</td><td>${trip.createdAt}</td></tr>`
    })
    html += `</tbody></table></body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
    showSnackbar('تم فتح نافذة الطباعة ✅')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="كشف التحضير" back="more" />

      {/* Search */}
      <div style={{ padding: '10px 16px', background: th.card, borderBottom: `1px solid ${th.border}` }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث بالاسم أو رقم اللوحة..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${th.border}`, background: th.inputBg,
            color: th.text, fontSize: 13, outline: 'none',
            boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
          }}
        />
      </div>

      {/* Stats */}
      <div style={{
        background: T.appbar, padding: '8px 20px',
        display: 'flex', gap: 20, alignItems: 'center',
      }}>
        <span style={{ color: '#94A3B8', fontSize: 12 }}>إجمالي نشطين: <b style={{ color: '#F1F5F9' }}>{activeDrivers.length}</b></span>
        <span style={{ color: '#94A3B8', fontSize: 12 }}>حضر: <b style={{ color: '#4ADE80' }}>{presentCount}</b></span>
        <span style={{ color: '#94A3B8', fontSize: 12 }}>غياب: <b style={{ color: '#F87171' }}>{activeDrivers.length - presentCount}</b></span>
      </div>

      {/* Table Header */}
      <div style={{
        background: th.dark ? '#1E2D40' : '#F1F5F9',
        borderBottom: `2px solid ${T.primary}`,
        padding: '8px 16px',
        display: 'grid',
        gridTemplateColumns: '32px 1fr 48px 80px 40px 40px 40px',
        gap: 8, alignItems: 'center',
      }}>
        {['م', 'المالك', 'النوع', 'اللوحة', 'م1', 'م2', 'ت'].map(h => (
          <span key={h} style={{ fontSize: 11, fontWeight: 800, color: th.sub, textAlign: 'center' }}>{h}</span>
        ))}
      </div>

      {/* Table Rows */}
      <div style={{ flex: 1, overflowY: 'auto', background: th.card }}>
        {activeDrivers.map((driver, idx) => (
          <div key={driver.id} style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 48px 80px 40px 40px 40px',
            gap: 8, alignItems: 'center',
            padding: '10px 16px',
            borderBottom: `1px solid ${th.border}`,
            background: idx % 2 === 0 ? 'transparent' : (th.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.primary, textAlign: 'center' }}>{driver.seq}</span>
            <span style={{ fontSize: 12, color: th.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {driver.ownerName}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 800, textAlign: 'center',
              padding: '2px 4px', borderRadius: 6,
              background: driver.type === 'س' ? '#DBEAFE' : '#D1FAE5',
              color: driver.type === 'س' ? T.primary : T.success,
            }}>{driver.type}</span>
            <span style={{ fontSize: 10, color: th.sub, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>{driver.plate}</span>

            {/* Checkboxes */}
            {(['m1', 'm2'] as const).map(field => (
              <div key={field} style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  onClick={() => toggle(driver.id, field)}
                  style={{
                    width: 24, height: 24, borderRadius: 6,
                    border: `2px solid ${getVal(driver.id, field) ? T.success : th.border}`,
                    background: getVal(driver.id, field) ? T.success : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                  {getVal(driver.id, field) && <span style={{ color: '#fff', fontSize: 14, lineHeight: 1 }}>✓</span>}
                </div>
              </div>
            ))}

            {/* Violation checkbox */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                onClick={() => toggle(driver.id, 't')}
                style={{
                  width: 24, height: 24, borderRadius: 6,
                  border: `2px solid ${getVal(driver.id, 't') ? T.danger : th.border}`,
                  background: getVal(driver.id, 't') ? T.danger : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                {getVal(driver.id, 't') && <span style={{ color: '#fff', fontSize: 14, lineHeight: 1 }}>✓</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{
        padding: '12px 16px', background: th.card,
        borderTop: `1px solid ${th.border}`,
        display: 'flex', gap: 8,
        flexShrink: 0,
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2, padding: '12px', borderRadius: 12, border: 'none',
            background: saving ? '#334155' : T.primary,
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
          {saving ? '⏳ جاري الحفظ...' : '💾 حفظ التحضير'}
        </button>
        <button
          onClick={handlePrintAttendance}
          style={{
            flex: 1, padding: '12px', borderRadius: 12,
            border: `1px solid ${th.border}`, background: 'none',
            color: th.sub, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>🖨️ طباعة التحضير</button>
        <button
          onClick={handlePrintTrips}
          style={{
            flex: 1, padding: '12px', borderRadius: 12,
            border: `1px solid ${th.border}`, background: 'none',
            color: th.sub, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
          }}>🖨️ طباعة النهمات</button>
      </div>
    </div>
  )
}
