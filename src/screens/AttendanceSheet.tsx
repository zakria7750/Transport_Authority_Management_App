import { useState, useMemo } from 'react'
import { useApp } from '../context'
import { useTheme, MonochromeIcon } from '../components'

import TripSheet from '../TripSheet'

export function AttendanceSheet() {
  const { state, dispatch, showSnackbar, scheduleDeferredAttendance } = useApp()
  const th = useTheme()
  
  const [attendance, setAttendance] = useState<Record<number, boolean>>({})
  const [showTripSheet, setShowTripSheet] = useState(false)

  // Load active drivers only
  const activeDrivers = useMemo(() => {
    return state.drivers.filter(d => d.status === 'نشط').sort((a, b) => a.seq - b.seq || a.id - b.id)
  }, [state.drivers])

  // Initialize attendance based on successful trips (م1 type)
  useMemo(() => {
    const init: Record<number, boolean> = {}
    activeDrivers.forEach(d => {
      // الحقل «ت» يبدأ صحيحاً، ولا يعتمد على وجود نهمة سابقة.
      init[d.id] = true
    })
    setAttendance(init)
  }, [activeDrivers, state.trips])

  const handleSaveAttendance = () => {
    // Find absent drivers (false in attendance)
    const absentDrivers = activeDrivers.filter(d => !attendance[d.id])
    
    if (absentDrivers.length === 0) {
      showSnackbar('تم حفظ التحضير ✅')
      return
    }

    scheduleDeferredAttendance(absentDrivers.map((driver) => driver.id))
  }

  const handlePrintAttendance = () => {
    // Format: م-المالك-النوع-اللوحة (البوابير النشطة)
    const rows = activeDrivers.map((d, i) => {
      const d2 = activeDrivers[i + Math.ceil(activeDrivers.length / 2)]
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d.seq}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d.ownerName}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d.type}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d.plate}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d2?.seq || ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d2?.ownerName || ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d2?.type || ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d2?.plate || ''}</td>
        </tr>
      `
    }).join('')
    
    const html = `
      <html dir="rtl">
        <head>
          <title>كشف التحضير</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { border: 1px solid #ddd; padding: 10px; text-align: right; background: #f0f0f0; font-weight: bold; }
            td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          </style>
        </head>
        <body>
          <h2>كشف التحضير</h2>
          <p style="text-align: center;">التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
          <table>
            <thead>
              <tr>
                <th>م</th>
                <th>المالك</th>
                <th>النوع</th>
                <th>اللوحة</th>
                <th>م</th>
                <th>المالك</th>
                <th>النوع</th>
                <th>اللوحة</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `
    
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }
  }

  const handlePrintTrips = () => {
    // Format: م-المالك-النوع-اللوحة-ف-م1-م2 (البوابير النشطة)
    const rows = activeDrivers.map((d, i) => {
      const d2 = activeDrivers[i + Math.ceil(activeDrivers.length / 2)]
      return `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d.seq}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d.ownerName}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d.type}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d.plate}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d.separator}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${d.currentTrip === 'م1' ? 'ن' : ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${d.currentTrip === 'م2' ? 'ن' : ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d2?.seq || ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d2?.ownerName || ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d2?.type || ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d2?.plate || ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${d2?.separator || ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${d2?.currentTrip === 'م1' ? 'ن' : ''}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${d2?.currentTrip === 'م2' ? 'ن' : ''}</td>
        </tr>
      `
    }).join('')
    
    const html = `
      <html dir="rtl">
        <head>
          <title>كشف النهمات</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; direction: rtl; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { border: 1px solid #ddd; padding: 10px; text-align: center; background: #f0f0f0; font-weight: bold; }
            td { border: 1px solid #ddd; padding: 8px; }
          </style>
        </head>
        <body>
          <h2>كشف النهمات</h2>
          <p style="text-align: center;">التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
          <table>
            <thead>
              <tr>
                <th>م</th>
                <th>المالك</th>
                <th>النوع</th>
                <th>اللوحة</th>
                <th>ف</th>
                <th>م1</th>
                <th>م2</th>
                <th>م</th>
                <th>المالك</th>
                <th>النوع</th>
                <th>اللوحة</th>
                <th>ف</th>
                <th>م1</th>
                <th>م2</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `
    
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      {/* AppBar */}
      <div style={{
        padding: '12px 16px',
        background: th.card,
        borderBottom: `1px solid ${th.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: th.text }}>كشف التحضير</h2>
      </div>

      {/* Attendance Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: 600,
          }}>
            <thead>
              <tr style={{ background: th.dark ? '#1E2D40' : '#F1F5F9', borderBottom: `2px solid ${th.border}` }}>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: th.text }}>م</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: th.text }}>النوع</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: th.text }}>المالك</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: th.text }}>اللوحة</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: th.text }}>م1</th>
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: th.text }}>م2</th>
                <th style={{ padding: '10px', textAlign: 'center', fontWeight: 700, color: th.text }}>ت</th>
              </tr>
            </thead>
            <tbody>
              {activeDrivers.map((driver) => (
                <tr key={driver.id} style={{ borderBottom: `1px solid ${th.border}` }}>
                  <td style={{ padding: '10px', textAlign: 'right', color: th.text }}>{driver.seq}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: th.text }}>{driver.type}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: th.text }}>{driver.ownerName}</td>
                  <td style={{ padding: '10px', textAlign: 'right', color: th.text }}>{driver.plate}</td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {driver.currentTrip?.type === 'م1' ? 'ن' : ''}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {driver.currentTrip?.type === 'م2' ? 'ن' : ''}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={attendance[driver.id] ?? false}
                      onChange={(e) => setAttendance({ ...attendance, [driver.id]: e.target.checked })}
                      style={{ width: 20, height: 20, cursor: 'pointer' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activeDrivers.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: th.sub }}>
            لا يوجد بوابير نشطة
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{
        padding: '16px',
        background: th.card,
        borderTop: `1px solid ${th.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <button
          onClick={handleSaveAttendance}
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            border: 'none',
            background: '#10B981',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <MonochromeIcon name="check" size={15} /> حفظ التحضير
        </button>
        <button
          onClick={handlePrintAttendance}
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            border: `1px solid ${th.border}`,
            background: th.card,
            color: th.text,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <MonochromeIcon name="note" size={15} /> طباعة كشف التحضير
        </button>
        <button
          onClick={handlePrintTrips}
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            border: `1px solid ${th.border}`,
            background: th.card,
            color: th.text,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <MonochromeIcon name="truck" size={15} /> طباعة كشف النهمات
        </button>
      </div>

      {/* Trip Sheet Modal */}
      {showTripSheet && selectedDriver && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            width: '100%',
            maxHeight: '85vh',
            background: th.bg,
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <TripSheet
              driver={selectedDriver}
              onClose={() => setShowTripSheet(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
