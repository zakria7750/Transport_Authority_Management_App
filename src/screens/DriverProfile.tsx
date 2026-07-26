import { useState } from 'react'
import { useApp } from '../context'
import { AppBar, StatusChip, useTheme, T, Card } from '../components'
import type { Driver } from '../data'

type Tab = 'info' | 'guarantees' | 'trips' | 'violations'

export default function DriverProfileScreen() {
  const { state } = useApp()
  const th = useTheme()
  const driverId = state.screenParams.driverId as number
  const driver: Driver | undefined = state.drivers.find(d => d.id === driverId)
  const [tab, setTab] = useState<Tab>('info')

  if (!driver) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: th.bg }}>
      <p style={{ color: th.sub }}>السائق غير موجود</p>
    </div>
  )

  const driverTrips = state.trips.filter(t => t.driverId === driver.id)
  const driverViolations = state.violations.filter(v => v.driverId === driver.id)

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'info', label: 'المعلومات', icon: '👤' },
    { key: 'guarantees', label: 'الضمانات', icon: '🏦' },
    { key: 'trips', label: 'النهمات', icon: '🚛' },
    { key: 'violations', label: 'المخالفات', icon: '⚠️' },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar
        title="ملف السائق"
        back="drivers"
        rightSlot={
          <button onClick={() => {}}
            style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 13 }}>
            ✏️ تعديل
          </button>
        }
      />

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2040 0%, #1D4ED8 100%)',
        padding: '20px 20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: driver.type === 'س' ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, border: '2px solid rgba(255,255,255,0.15)',
          }}>🚗</div>
          <div>
            <h2 style={{ color: '#F1F5F9', fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>
              {driver.ownerName}
            </h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                background: driver.type === 'س' ? '#1D4ED8' : '#059669', color: '#fff',
              }}>{driver.type}</span>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>م {driver.seq}</span>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>{driver.plate}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <StatusChip driver={driver} />
            </div>
          </div>
        </div>

        {/* Compensation */}
        {driver.compensationBalance > 0 && (
          <div style={{
            marginTop: 16, background: 'rgba(245,158,11,0.15)',
            borderRadius: 12, padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#FCD34D', fontSize: 12 }}>💰 رصيد التعويض</span>
            <span style={{ color: '#FCD34D', fontSize: 18, fontWeight: 800 }}>
              {driver.compensationBalance.toLocaleString()} ريال
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, display: 'flex', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '12px 4px', border: 'none', background: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              color: tab === t.key ? T.primary : th.sub,
              borderBottom: `2px solid ${tab === t.key ? T.primary : 'transparent'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: tab === t.key ? 700 : 400,
              transition: 'all 0.2s',
            }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Info Tab */}
        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card>
              <div style={{ padding: '14px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>
                  البيانات الأساسية
                </p>
                {[
                  { label: 'اسم المالك', value: driver.ownerName },
                  { label: 'رقم اللوحة', value: driver.plate },
                  { label: 'نوع البابور', value: driver.type === 'س' ? 'سكس' : 'عادي' },
                  { label: 'رقم الهاتف', value: driver.phone },
                  { label: 'الفاصل', value: driver.separator },
                  { label: 'تاريخ الانضمام', value: driver.joinDate },
                  { label: 'الرقم التسلسلي', value: `م ${driver.seq}` },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: `1px solid ${th.border}`,
                  }}>
                    <span style={{ fontSize: 12, color: th.sub }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={{ padding: '14px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>
                  الحالة الحالية
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <StatusChip driver={driver} />
                  {driver.currentTrip && (
                    <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 99, background: '#FEF9C3', color: '#B45309', fontWeight: 600 }}>
                      نهمة: {driver.currentTrip}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Guarantees Tab */}
        {tab === 'guarantees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              background: driver.guarantors.length >= 2 ? '#D1FAE5' : '#FEE2E2',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{driver.guarantors.length >= 2 ? '✅' : '❌'}</span>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: driver.guarantors.length >= 2 ? '#065F46' : '#991B1B' }}>
                  {driver.guarantors.length >= 2 ? 'مستوفي الضمانات' : 'ناقص الضمانات'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: driver.guarantors.length >= 2 ? '#047857' : '#B91C1C' }}>
                  {driver.guarantors.length} من {2} ضامن مطلوب
                </p>
              </div>
            </div>

            {driver.guarantors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: th.sub, fontSize: 13 }}>
                لا يوجد ضامنون مسجلون
              </div>
            ) : (
              driver.guarantors.map(g => (
                <Card key={g.id}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: '#DBEAFE', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    }}>🏦</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{g.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: th.sub }}>{g.phone}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: th.muted }}>رقم الهوية: {g.nationalId}</p>
                    </div>
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 99,
                      background: g.status === 'فعال' ? '#D1FAE5' : '#FEE2E2',
                      color: g.status === 'فعال' ? '#065F46' : '#991B1B',
                      fontWeight: 700,
                    }}>{g.status}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Trips Tab */}
        {tab === 'trips' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {driverTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: th.sub, fontSize: 13 }}>لا توجد نهمات مسجلة</div>
            ) : (
              driverTrips.slice(0, 20).map(trip => (
                <Card key={trip.id}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{
                          fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
                          background: T.primary, color: '#fff',
                        }}>{trip.type}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: trip.status === 'معلقة' ? T.warning : trip.status === 'مكتملة' ? T.success : T.danger,
                          background: trip.status === 'معلقة' ? '#FEF9C3' : trip.status === 'مكتملة' ? '#D1FAE5' : '#FEE2E2',
                          padding: '2px 8px', borderRadius: 99,
                        }}>{trip.status}</span>
                      </div>
                      <span style={{ fontSize: 11, color: th.sub }}>{trip.createdAt}</span>
                    </div>
                    {trip.type !== 'تعويض' && (
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: th.sub }}>📦 {trip.payload}</span>
                        <span style={{ fontSize: 12, color: th.sub }}>📍 {trip.province} → {trip.destination}</span>
                        <span style={{ fontSize: 12, color: th.sub }}>🔩 {trip.breakNum}</span>
                      </div>
                    )}
                    {trip.compensationAmount && (
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

        {/* Violations Tab */}
        {tab === 'violations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {driverViolations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: th.sub, fontSize: 13 }}>لا توجد مخالفات مسجلة</div>
            ) : (
              driverViolations.map(v => (
                <Card key={v.id}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{
                          fontSize: 13, fontWeight: 800, padding: '4px 12px', borderRadius: 99,
                          background: v.type === 'ت' ? '#FEE2E2' : '#FFF7ED',
                          color: v.type === 'ت' ? T.danger : T.warning,
                        }}>مخالفة ({v.type})</span>
                      </div>
                      <span style={{
                        fontSize: 11, padding: '3px 10px', borderRadius: 99,
                        background: v.raised ? '#D1FAE5' : '#FEE2E2',
                        color: v.raised ? '#065F46' : '#991B1B',
                        fontWeight: 700,
                      }}>{v.raised ? 'مرفوعة' : 'مفتوحة'}</span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: th.text }}>{v.note}</p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
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
    </div>
  )
}
