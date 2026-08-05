import { useState, useMemo } from 'react'
import { useApp } from '../context'
import { useTheme } from '../components'

export function AttendanceSheet() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  
  const [attendance, setAttendance] = useState<Record<number, boolean>>({})
  const [printing, setPrinting] = useState<'none' | 'attendance' | 'trips'>('none')

  // Load active drivers only
  const activeDrivers = useMemo(() => {
    return state.drivers.filter(d => d.status === 'نشط')
  }, [state.drivers])

  // Initialize attendance on mount
  useMemo(() => {
    const init: Record<number, boolean> = {}
    activeDrivers.forEach(d => {
      init[d.id] = true // Default to present (صح)
    })
    setAttendance(init)
  }, [activeDrivers])

  const handleSaveAttendance = () => {
    // Find absent drivers (false in attendance)
    const absentDrivers = activeDrivers.filter(d => !attendance[d.id])
    
    if (absentDrivers.length === 0) {
      showSnackbar('تم حفظ التحضير ✅')
      return
    }

    // Record violations for absent drivers
    absentDrivers.forEach(driver => {
      dispatch({
        type: 'ADD_VIOLATION',
        violation: {
          id: Math.random(),
          driverId: driver.id,
          driverName: driver.ownerName,
          type: 'ت',
          date: new Date().toLocaleDateString('ar-SA'),
          raised: false,
          recordedBy: state.currentUser?.name || 'النظام',
        }
      })
      
      // Set driver status to inactive
      dispatch({
        type: 'SET_DRIVER_STATUS',
        driverId: driver.id,
        status: 'غير_نشط',
        reason: 'مخالف(ت)',
      })
    })

    // Re-index active drivers
    const remainingActive = state.drivers.filter(d => d.status === 'نشط')
    remainingActive.forEach((d, idx) => {
      const updated = { ...d, seq: idx + 1 }
      dispatch({
        type: 'UPDATE_DRIVER',
        driver: updated,
      })
    })

    showSnackbar(`تم حفظ التحضير - ${absentDrivers.length} غياب ✅`)
  }

  const handlePrintAttendance = () => {
    const html = `
      <html dir="rtl">
        <head>
          <title>كشف التحضير</title>
          <style>
            body { font-family: Arial; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background: #f0f0f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>كشف التحضير</h2>
          <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
          <table>
            <tr>
              <th>م</th>
              <th>النوع</th>
              <th>المالك</th>
              <th>اللوحة</th>
              <th>م</th>
              <th>النوع</th>
              <th>المالك</th>
              <th>اللوحة</th>
            </tr>
            ${activeDrivers.map((d, i) => {
              const d2 = activeDrivers[i + activeDrivers.length / 2]
              return `
                <tr>
                  <td>${d.seq}</td>
                  <td>${d.type}</td>
                  <td>${d.ownerName}</td>
                  <td>${d.plate}</td>
                  <td>${d2?.seq || ''}</td>
                  <td>${d2?.type || ''}</td>
                  <td>${d2?.ownerName || ''}</td>
                  <td>${d2?.plate || ''}</td>
                </tr>
              `
            }).join('')}
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
    const html = `
      <html dir="rtl">
        <head>
          <title>كشف النهمات</title>
          <style>
            body { font-family: Arial; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background: #f0f0f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>كشف النهمات</h2>
          <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
          <table>
            <tr>
              <th>م</th>
              <th>النوع</th>
              <th>المالك</th>
              <th>اللوحة</th>
              <th>ف</th>
              <th>م1</th>
              <th>م2</th>
              <th>م</th>
              <th>النوع</th>
              <th>المالك</th>
              <th>اللوحة</th>
              <th>ف</th>
              <th>م1</th>
              <th>م2</th>
            </tr>
            ${activeDrivers.map((d, i) => {
              const d2 = activeDrivers[i + Math.ceil(activeDrivers.length / 2)]
              return `
                <tr>
                  <td>${d.seq}</td>
                  <td>${d.type}</td>
                  <td>${d.ownerName}</td>
                  <td>${d.plate}</td>
                  <td>${d.separator}</td>
                  <td>${d.currentTrip?.type === 'م1' ? 'ن' : ''}</td>
                  <td>${d.currentTrip?.type === 'م2' ? 'ن' : ''}</td>
                  <td>${d2?.seq || ''}</td>
                  <td>${d2?.type || ''}</td>
                  <td>${d2?.ownerName || ''}</td>
                  <td>${d2?.plate || ''}</td>
                  <td>${d2?.separator || ''}</td>
                  <td>${d2?.currentTrip?.type === 'م1' ? 'ن' : ''}</td>
                  <td>${d2?.currentTrip?.type === 'م2' ? 'ن' : ''}</td>
                </tr>
              `
            }).join('')}
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
                <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: th.text }}>ت</th>
              </tr>
            </thead>
            <tbody>
              {activeDrivers.map((driver, idx) => (
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
                      checked={attendance[driver.id] ?? true}
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
          حفظ التحضير ✅
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
          طباعة كشف التحضير 📄
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
          طباعة كشف النهمات 📄
        </button>
      </div>
    </div>
  )
}
