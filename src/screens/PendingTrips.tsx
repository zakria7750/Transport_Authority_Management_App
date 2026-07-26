import { useState } from 'react'
import { useApp } from '../context'
import { AppBar, useTheme, T, Card, EmptyState } from '../components'
import type { TripType } from '../data'

const TRIP_TYPE_COLORS: Record<TripType, { bg: string; color: string; icon: string }> = {
  'فرزة':  { bg: '#DBEAFE', color: '#1D4ED8', icon: '🔵' },
  'م1':    { bg: '#D1FAE5', color: '#065F46', icon: '🟢' },
  'م2':    { bg: '#FEF9C3', color: '#B45309', icon: '🟡' },
  'تعويض': { bg: '#FEE2E2', color: '#991B1B', icon: '🔴' },
}

export default function PendingTripsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [openSections, setOpenSections] = useState<Record<TripType, boolean>>({
    'فرزة': true, 'م1': true, 'م2': true, 'تعويض': true
  })

  const pendingTrips = state.trips.filter(t => t.status === 'معلقة')
  const types: TripType[] = ['فرزة', 'م1', 'م2', 'تعويض']

  const toggleSection = (t: TripType) => setOpenSections(p => ({ ...p, [t]: !p[t] }))

  const confirmExit = (driverId: number, driverName: string) => {
    dispatch({ type: 'COMPLETE_TRIP', driverId })
    showSnackbar(`تم تأكيد خروج النهمة للسائق ${driverName} ✅`, () => {
      dispatch({ type: 'CANCEL_TRIP', driverId })
    })
  }

  const cancelTrip = (driverId: number, driverName: string) => {
    dispatch({ type: 'CANCEL_TRIP', driverId })
    showSnackbar(`تم إلغاء نهمة السائق ${driverName}`, () => {
      // Undo: set trip back — simplified
    })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="النهمات المعلقة" />

      {/* Summary bar */}
      <div style={{
        background: T.appbar, padding: '10px 20px',
        display: 'flex', gap: 16, overflowX: 'auto',
      }}>
        {types.map(t => {
          const count = pendingTrips.filter(tr => tr.type === t).length
          const meta = TRIP_TYPE_COLORS[t]
          return (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>{meta.icon}</span>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>{t}</span>
              <span style={{
                background: meta.bg, color: meta.color,
                fontSize: 12, fontWeight: 800, borderRadius: 99,
                padding: '1px 8px',
              }}>{count}</span>
            </div>
          )
        })}
        <div style={{ marginRight: 'auto', color: '#64748B', fontSize: 12, flexShrink: 0 }}>
          الإجمالي: {pendingTrips.length}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {pendingTrips.length === 0 ? (
          <EmptyState icon="🚛" text="لا توجد نهمات معلقة حالياً" />
        ) : (
          types.map(tripType => {
            const trips = pendingTrips.filter(t => t.type === tripType)
            if (trips.length === 0) return null
            const meta = TRIP_TYPE_COLORS[tripType]
            const isOpen = openSections[tripType]

            return (
              <div key={tripType} style={{ marginBottom: 4 }}>
                {/* Accordion Header */}
                <button
                  onClick={() => toggleSection(tripType)}
                  style={{
                    width: '100%', padding: '14px 20px',
                    background: th.card, border: 'none',
                    borderBottom: `1px solid ${th.border}`,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                  <span style={{ fontSize: 18 }}>{meta.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: th.text, flex: 1, textAlign: 'right' }}>
                    {tripType === 'م1' ? 'مصروف أول' : tripType === 'م2' ? 'مصروف ثاني' : tripType}
                  </span>
                  <span style={{
                    background: meta.bg, color: meta.color,
                    fontSize: 12, fontWeight: 800, borderRadius: 99, padding: '3px 12px',
                  }}>{trips.length}</span>
                  <span style={{ color: th.muted, fontSize: 14, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▼
                  </span>
                </button>

                {/* Trip Cards */}
                {isOpen && (
                  <div style={{ background: th.bg, padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {trips.map(trip => {
                      const driver = state.drivers.find(d => d.id === trip.driverId)
                      if (!driver) return null

                      return (
                        <Card key={trip.id} style={{ overflow: 'visible' }}>
                          <div style={{ padding: '14px 16px' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                              <div>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{driver.ownerName}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 12, color: th.sub }}>🚗 {driver.plate} · {driver.type}</p>
                              </div>
                              <div style={{ textAlign: 'left' }}>
                                <span style={{
                                  background: meta.bg, color: meta.color,
                                  fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
                                }}>{tripType}</span>
                                <p style={{ margin: '4px 0 0', fontSize: 10, color: th.muted, textAlign: 'left' }}>{trip.createdAt}</p>
                              </div>
                            </div>

                            {/* Trip Details */}
                            {trip.type !== 'تعويض' ? (
                              <div style={{
                                background: th.dark ? '#1E2D40' : '#F8FAFC',
                                borderRadius: 10, padding: '10px 12px',
                                display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12,
                              }}>
                                <span style={{ fontSize: 11, color: th.sub }}>📦 {trip.payload}</span>
                                <span style={{ fontSize: 11, color: th.sub }}>📍 {trip.province}</span>
                                <span style={{ fontSize: 11, color: th.sub }}>🎯 {trip.destination}</span>
                                <span style={{ fontSize: 11, color: th.sub }}>🔩 {trip.breakNum}</span>
                              </div>
                            ) : (
                              <div style={{
                                background: '#FEF9C3', borderRadius: 10, padding: '10px 12px',
                                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
                              }}>
                                <span>💰</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#B45309' }}>
                                  {trip.compensationAmount?.toLocaleString()} ريال
                                </span>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => confirmExit(driver.id, driver.ownerName)}
                                style={{
                                  flex: 2, padding: '10px', borderRadius: 10, border: 'none',
                                  background: T.success, color: '#fff',
                                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                                }}>✅ تأكيد الخروج</button>
                              <button
                                onClick={() => {}}
                                style={{
                                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                                  background: th.dark ? '#1E2D40' : '#F1F5F9', color: T.primary,
                                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                }}>✏️ تعديل</button>
                              <button
                                onClick={() => cancelTrip(driver.id, driver.ownerName)}
                                style={{
                                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                                  background: '#FEE2E2', color: T.danger,
                                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                }}>❌ إلغاء</button>
                              <button
                                onClick={() => {}}
                                style={{
                                  padding: '10px', borderRadius: 10,
                                  border: `1px solid ${th.border}`, background: 'none',
                                  color: th.sub, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                                }}>🔧</button>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
