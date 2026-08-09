/**
 * Registration Web Interface — Desktop Layout
 * § 14.76-79: Separate web layout for Registration Clerk
 * - Desktop layout (not same phone frame)
 * - Search: name + plate + separator
 * - "Re-registration" only — no edit/delete
 * - New active driver with sequential ID
 */

import { useState, useMemo } from 'react'
import { useApp } from '../context'
import { useTheme, T, Input, Btn, EmptyState, SkeletonRow } from '../components'
import { countActiveGuarantors, matchesNameOrPlate } from '../domain'
import { nextId } from '../domain'
import type { Driver, DriverType } from '../data'
import { ADDABLE_STATUS_REASONS } from '../constants'

// ─── Re-registration Web Component ─────────────────────────
export default function RegistrationWebPage() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()

  const [nameSearch, setNameSearch] = useState('')
  const [plateSearch, setPlateSearch] = useState('')
  const [separatorSearch, setSeparatorSearch] = useState('')
  const [loading, setLoading] = useState(false)

  // Task 77: search by name + plate + separator
  const addableDrivers = state.drivers.filter(
    (d) =>
      d.status === 'غير_نشط' &&
      !d.violation &&
      d.statusReason &&
      ADDABLE_STATUS_REASONS.includes(d.statusReason as (typeof ADDABLE_STATUS_REASONS)[number]),
  )

  const filtered = useMemo(() => {
    return addableDrivers.filter((d) => {
      const nameMatch = !nameSearch || d.ownerName.includes(nameSearch)
      const plateMatch = !plateSearch || d.plate.includes(plateSearch)
      const sepMatch = !separatorSearch || d.separator.includes(separatorSearch)
      return nameMatch && plateMatch && sepMatch
    })
  }, [nameSearch, plateSearch, separatorSearch, addableDrivers])

  // Task 78: Re-register only (no edit/delete)
  const handleReRegister = (driver: Driver) => {
    setLoading(true)
    setTimeout(() => {
      // Task 79: New active driver with sequential ID
      const newDriver: Driver = {
        id: nextId(),
        seq: state.drivers.filter((d) => d.status === 'نشط').length + 1,
        ownerName: driver.ownerName,
        type: driver.type,
        plate: driver.plate,
        phone: driver.phone,
        status: 'نشط',
        statusReason: null,
        currentTrip: null,
        violation: null,
        compensationBalance: 0,
        separator: driver.separator,
        joinDate: new Date().toLocaleDateString('ar-SA'),
        guarantors: driver.guarantors,
        images: driver.images,
      }

      dispatch({ type: 'ADD_DRIVER', driver: newDriver })
      showSnackbar(`تم إعادة تسجيل ${driver.ownerName} بنجاح ✅`)
      setLoading(false)
    }, 600)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: th.bg,
      padding: '40px',
      fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 800, color: th.text }}>
          إعادة تسجيل السائقين
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: th.sub }}>
          موظف التسجيل — البحث وإعادة تسجيل السائقين غير النشطين
        </p>

        {/* Search Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginTop: 32,
          marginBottom: 32,
        }}>
          <Input
            label="اسم المالك"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder="ابحث بالاسم..."
            icon="👤"
          />
          <Input
            label="رقم اللوحة"
            value={plateSearch}
            onChange={(e) => setPlateSearch(e.target.value)}
            placeholder="ابحث بالطبق..."
            icon="🚗"
          />
          <Input
            label="الفاصل"
            value={separatorSearch}
            onChange={(e) => setSeparatorSearch(e.target.value)}
            placeholder="ابحث بالفاصل..."
            icon="🔢"
          />
        </div>

        {/* Results Table */}
        <div style={{
          background: th.card,
          borderRadius: 16,
          border: `1px solid ${th.border}`,
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 32 }}>
              <SkeletonRow dark={th.dark} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState icon="📭" text="لا توجد نتائج مطابقة" />
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{
                  background: th.dark ? '#1E2D40' : '#F1F5F9',
                  borderBottom: `1px solid ${th.border}`,
                }}>
                  <th style={{ padding: 14, textAlign: 'right', fontSize: 13, fontWeight: 700, color: th.text }}>اسم المالك</th>
                  <th style={{ padding: 14, textAlign: 'right', fontSize: 13, fontWeight: 700, color: th.text }}>اللوحة</th>
                  <th style={{ padding: 14, textAlign: 'right', fontSize: 13, fontWeight: 700, color: th.text }}>النوع</th>
                  <th style={{ padding: 14, textAlign: 'right', fontSize: 13, fontWeight: 700, color: th.text }}>الفاصل</th>
                  <th style={{ padding: 14, textAlign: 'right', fontSize: 13, fontWeight: 700, color: th.text }}>الضامنون</th>
                  <th style={{ padding: 14, textAlign: 'right', fontSize: 13, fontWeight: 700, color: th.text }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((driver) => (
                  <tr key={driver.id} style={{
                    borderBottom: `1px solid ${th.border}`,
                    transition: 'background 0.2s',
                    '&:hover': { background: th.dark ? '#1E2D40' : '#F8FAFC' },
                  }}>
                    <td style={{ padding: 14, fontSize: 13, color: th.text, fontWeight: 600 }}>
                      {driver.ownerName}
                    </td>
                    <td style={{ padding: 14, fontSize: 13, color: th.sub }}>
                      {driver.plate}
                    </td>
                    <td style={{ padding: 14, fontSize: 13, color: th.sub }}>
                      {driver.type === 'س' ? '🚚 سكس' : '🚛 عادي'}
                    </td>
                    <td style={{ padding: 14, fontSize: 13, color: th.sub }}>
                      {driver.separator}
                    </td>
                    <td style={{ padding: 14, fontSize: 13, color: th.sub }}>
                      {countActiveGuarantors(driver)}/{state.minGuarantors}
                    </td>
                    <td style={{ padding: 14 }}>
                      <button
                        onClick={() => handleReRegister(driver)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: 'none',
                          background: T.primary,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        إعادة تسجيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary */}
        {filtered.length > 0 && (
          <div style={{
            marginTop: 24,
            padding: 16,
            background: th.dark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
            borderRadius: 12,
            border: `1px solid ${T.primary}`,
            fontSize: 13,
            color: th.text,
          }}>
            عدد النتائج: <strong>{filtered.length}</strong> سائق جاهز لإعادة التسجيل
          </div>
        )}
      </div>
    </div>
  )
}
