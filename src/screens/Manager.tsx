import { useState } from 'react'
import { useApp } from '../context'
import { AppBar, useTheme, T, Card, EmptyState } from '../components'

// ══════════════════════════════════════════════════════════
//  VIOLATIONS SCREEN
// ══════════════════════════════════════════════════════════
export function ViolationsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [filterRaised, setFilterRaised] = useState<'all' | 'open' | 'raised'>('all')

  const filtered = state.violations.filter(v => {
    if (filterRaised === 'open') return !v.raised
    if (filterRaised === 'raised') return v.raised
    return true
  })

  const raise = (id: number, driverName: string) => {
    dispatch({ type: 'RAISE_VIOLATION', violationId: id })
    showSnackbar(`تم رفع مخالفة السائق ${driverName} ✅`)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="المخالفات" back="more" />

      {/* Filter tabs */}
      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, padding: '10px 16px', display: 'flex', gap: 8 }}>
        {[['all', 'الكل'], ['open', 'مفتوحة'], ['raised', 'مرفوعة']] .map(([k, l]) => (
          <button key={k} onClick={() => setFilterRaised(k as typeof filterRaised)}
            style={{
              padding: '6px 16px', borderRadius: 99, border: 'none',
              background: filterRaised === k ? T.danger : (th.dark ? '#1E2D40' : '#F1F5F9'),
              color: filterRaised === k ? '#fff' : th.sub,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>{l}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <EmptyState icon="✅" text="لا توجد مخالفات في هذا التصنيف" />
        ) : (
          filtered.map(v => (
            <Card key={v.id}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{v.driverName}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: th.sub }}>{v.note}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: th.muted }}>📅 {v.date}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 99,
                      background: v.type === 'ت' ? '#FEE2E2' : '#FFF7ED',
                      color: v.type === 'ت' ? T.danger : T.warning,
                    }}>مخالفة ({v.type})</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                      background: v.raised ? '#D1FAE5' : '#FEE2E2',
                      color: v.raised ? '#065F46' : '#991B1B',
                    }}>{v.raised ? '✅ مرفوعة' : '🔴 مفتوحة'}</span>
                  </div>
                </div>
                {!v.raised && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => raise(v.id, v.driverName)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                        background: T.success, color: '#fff',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}>✅ رفع المخالفة</button>
                    <button onClick={() => showSnackbar('تم إرسال إشعار الاستثناء')}
                      style={{
                        padding: '10px 14px', borderRadius: 10,
                        border: `1px solid ${th.border}`, background: 'none',
                        color: th.sub, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      }}>🔔 استثناء</button>
                  </div>
                )}
                {v.raisedDate && (
                  <p style={{ margin: '8px 0 0', fontSize: 11, color: T.success }}>✅ رُفعت بتاريخ {v.raisedDate}</p>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  GUARANTEES SCREEN
// ══════════════════════════════════════════════════════════
export function GuaranteesScreen() {
  const { state, dispatch } = useApp()
  const th = useTheme()
  const [tab, setTab] = useState<'guaranteed' | 'guarantors'>('guaranteed')
  const [minGuarantors, setMinGuarantors] = useState(state.minGuarantors)

  const driversWithGuarantors = state.drivers.filter(d => d.guarantors.length > 0)
  const allGuarantors = state.drivers.flatMap(d => d.guarantors.map(g => ({ ...g, driverName: d.ownerName })))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="الضمانات" back="more" />

      {/* Min setting */}
      <div style={{
        background: th.card, borderBottom: `1px solid ${th.border}`,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>🎯 الحد الأدنى للضامنين</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { setMinGuarantors(p => Math.max(1, p - 1)); dispatch({ type: 'SET_MIN_GUARANTORS', min: Math.max(1, minGuarantors - 1) }) }}
            style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.text, cursor: 'pointer', fontSize: 16 }}>−</button>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.primary, minWidth: 24, textAlign: 'center' }}>{minGuarantors}</span>
          <button onClick={() => { setMinGuarantors(p => p + 1); dispatch({ type: 'SET_MIN_GUARANTORS', min: minGuarantors + 1 }) }}
            style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${th.border}`, background: 'none', color: th.text, cursor: 'pointer', fontSize: 16 }}>+</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, display: 'flex' }}>
        {[['guaranteed', '🏦 المضمونون'], ['guarantors', '👥 الضامنون']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            style={{
              flex: 1, padding: '12px', border: 'none', background: 'none',
              color: tab === k ? T.primary : th.sub,
              borderBottom: `2px solid ${tab === k ? T.primary : 'transparent'}`,
              fontSize: 13, fontWeight: tab === k ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit',
            }}>{l}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tab === 'guaranteed' ? (
          driversWithGuarantors.map(driver => (
            <Card key={driver.id}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{driver.ownerName}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: th.sub }}>{driver.plate}</p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                    background: driver.guarantors.length >= minGuarantors ? '#D1FAE5' : '#FEE2E2',
                    color: driver.guarantors.length >= minGuarantors ? '#065F46' : '#991B1B',
                  }}>{driver.guarantors.length}/{minGuarantors} ضامن</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {driver.guarantors.map(g => (
                    <span key={g.id} style={{
                      fontSize: 11, padding: '4px 10px', borderRadius: 99,
                      background: g.status === 'فعال' ? '#DBEAFE' : '#F1F5F9',
                      color: g.status === 'فعال' ? T.primary : th.sub,
                      fontWeight: 600,
                    }}>🏦 {g.name}</span>
                  ))}
                </div>
              </div>
            </Card>
          ))
        ) : (
          allGuarantors.map(g => (
            <Card key={g.id}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏦</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{g.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: th.sub }}>{g.phone} · يضمن: {g.driverName}</p>
                </div>
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700,
                  background: g.status === 'فعال' ? '#D1FAE5' : '#F1F5F9',
                  color: g.status === 'فعال' ? '#065F46' : th.sub,
                }}>{g.status}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  BREAKDOWNS SCREEN
// ══════════════════════════════════════════════════════════
export function BreakdownsScreen() {
  const { state, showSnackbar } = useApp()
  const th = useTheme()
  const [showForm, setShowForm] = useState(false)
  const [bLocation, setBLocation] = useState<'قريب' | 'بعيد'>('قريب')
  const [bAction, setBAction] = useState<'إلغاء_النهمة' | 'إبقاء_النهمة'>('إبقاء_النهمة')

  const completedTrips = state.trips.filter(t => t.status === 'مكتملة')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="الأعطال" back="more" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Completed trips */}
        <div style={{ padding: '12px 16px 0' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
            النهمات المكتملة
          </p>
        </div>

        {completedTrips.map(trip => {
          const driver = state.drivers.find(d => d.id === trip.driverId)
          const breakdown = state.breakdowns.find(b => b.tripId === trip.id)
          return (
            <div key={trip.id} style={{
              margin: '0 16px 10px',
              background: th.card, borderRadius: 14, border: `1px solid ${th.border}`,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{driver?.ownerName}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: th.sub }}>{trip.type} · {trip.breakNum}</p>
                  {trip.type !== 'تعويض' && <p style={{ margin: '2px 0 0', fontSize: 11, color: th.muted }}>{trip.province} → {trip.destination}</p>}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: breakdown ? '#FEF9C3' : '#D1FAE5',
                  color: breakdown ? '#B45309' : '#065F46',
                }}>{breakdown ? '🔧 عطل مسجل' : '✅ سليم'}</span>
              </div>

              {breakdown && (
                <div style={{
                  marginTop: 10, background: th.dark ? '#1E2D40' : '#FEF9C3',
                  borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#92400E',
                }}>
                  📍 {breakdown.location} · {breakdown.action?.replace('_', ' ')}
                  {breakdown.rescuerName && ` · مسعف: ${breakdown.rescuerName}`}
                  {breakdown.compensation && ` · تعويض: ${breakdown.compensation} ر`}
                </div>
              )}

              {!breakdown && (
                <button onClick={() => setShowForm(true)}
                  style={{
                    width: '100%', marginTop: 10, padding: '8px', borderRadius: 10,
                    border: `1px solid ${th.border}`, background: 'none',
                    color: T.warning, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>🔧 تسجيل عطل</button>
              )}
            </div>
          )
        })}

        {/* Breakdown Log */}
        {state.breakdowns.length > 0 && (
          <div style={{ padding: '12px 16px 0' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
              سجل الأعطال
            </p>
            {state.breakdowns.map(b => (
              <div key={b.id} style={{
                margin: '0 0 10px',
                background: th.card, borderRadius: 14, border: `1px solid ${th.border}`,
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{b.driverName}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: th.sub }}>{b.plate} · {b.tripType} · {b.date}</p>
                  </div>
                  <span style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700,
                    background: b.status === 'نشط' ? '#FEF9C3' : '#F1F5F9',
                    color: b.status === 'نشط' ? '#B45309' : th.sub,
                  }}>{b.status}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: th.sub }}>
                  📍 {b.location} {b.action && `· ${b.action.replace('_', ' ')}`}
                  {b.rescuerName && ` · مسعف: ${b.rescuerName}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Breakdown Form (modal) */}
      {showForm && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 150 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: th.card, borderRadius: '20px 20px 0 0',
            padding: '20px 20px 32px',
            animation: 'slideUp 0.3s ease',
          }}>
            <h3 style={{ color: th.text, margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>تسجيل عطل</h3>

            <p style={{ fontSize: 12, color: th.sub, margin: '0 0 8px' }}>موقع العطل</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['قريب', 'بعيد'] as const).map(l => (
                <button key={l} onClick={() => setBLocation(l)}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                    background: bLocation === l ? T.primary : (th.dark ? '#1E2D40' : '#F1F5F9'),
                    color: bLocation === l ? '#fff' : th.sub,
                    fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{l === 'قريب' ? '📍 قريب' : '🗺️ بعيد'}</button>
              ))}
            </div>

            {bLocation === 'قريب' && (
              <>
                <p style={{ fontSize: 12, color: th.sub, margin: '0 0 8px' }}>حالة النهمة</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {(['إلغاء_النهمة', 'إبقاء_النهمة'] as const).map(a => (
                    <button key={a} onClick={() => setBAction(a)}
                      style={{
                        flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                        background: bAction === a ? (a === 'إلغاء_النهمة' ? T.danger : T.success) : (th.dark ? '#1E2D40' : '#F1F5F9'),
                        color: bAction === a ? '#fff' : th.sub,
                        fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      }}>{a.replace('_', ' ')}</button>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.sub, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                إلغاء
              </button>
              <button onClick={() => { setShowForm(false); showSnackbar('تم تسجيل العطل بنجاح ✅') }}
                style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: T.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                تأكيد التسجيل ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  REPORTS SCREEN
// ══════════════════════════════════════════════════════════
export function ReportsScreen() {
  const { state, showSnackbar } = useApp()
  const th = useTheme()
  const [period, setPeriod] = useState('week')

  const totalDrivers = state.drivers.length
  const activeDrivers = state.drivers.filter(d => d.status === 'نشط').length
  const completedTrips = state.trips.filter(t => t.status === 'مكتملة').length
  const totalViolations = state.violations.length
  const totalComp = state.drivers.reduce((s, d) => s + d.compensationBalance, 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="التقارير" back="more" />

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {/* Period selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر'], ['year', 'سنة']].map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
                background: period === k ? T.primary : (th.dark ? '#1E2D40' : '#F1F5F9'),
                color: period === k ? '#fff' : th.sub,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{l}</button>
          ))}
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'إجمالي البوابير', value: totalDrivers, icon: '🚛', color: T.primary },
            { label: 'النشطين', value: activeDrivers, icon: '✅', color: T.success },
            { label: 'النهمات المكتملة', value: completedTrips, icon: '🚀', color: T.accent },
            { label: 'المخالفات', value: totalViolations, icon: '⚠️', color: T.danger },
            { label: 'التعويضات (ر)', value: totalComp.toLocaleString(), icon: '💰', color: T.warning },
            { label: 'الأعطال', value: state.breakdowns.length, icon: '🔧', color: '#8B5CF6' },
          ].map(s => (
            <Card key={s.label}>
              <div style={{ padding: '14px 16px' }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: '6px 0 2px' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: th.sub }}>{s.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Export buttons */}
        <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
          تصدير
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: '📄 تصدير PDF', color: '#DC2626' },
            { label: '📊 تصدير Excel', color: '#16A34A' },
            { label: '💾 تصدير قاعدة البيانات', color: T.primary },
            { label: '📥 استيراد قاعدة البيانات', color: '#7C3AED' },
          ].map(btn => (
            <button key={btn.label}
              onClick={() => showSnackbar(`${btn.label} — تم الإرسال ✅`)}
              style={{
                padding: '14px 16px', borderRadius: 12,
                border: `1px solid ${th.border}`, background: th.card,
                color: btn.color, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>{btn.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  USERS SCREEN
// ══════════════════════════════════════════════════════════
export function UsersScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'موظف_نهمة' as 'موظف_نهمة' | 'مدير_مكتب' })

  const handleAdd = () => {
    if (!newUser.username || !newUser.password || !newUser.name) return
    dispatch({ type: 'ADD_USER', user: { ...newUser, id: Date.now(), avatar: newUser.name.charAt(0) } })
    showSnackbar(`تم إضافة المستخدم ${newUser.name} ✅`)
    setShowAdd(false)
    setNewUser({ username: '', password: '', name: '', role: 'موظف_نهمة' })
  }

  const handleDelete = (userId: number, name: string) => {
    dispatch({ type: 'DELETE_USER', userId })
    showSnackbar(`تم حذف المستخدم ${name}`, () => {})
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="إدارة المستخدمين" back="more"
        leftSlot={
          <button onClick={() => setShowAdd(true)}
            style={{ background: T.primary, border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            + إضافة
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {state.users.map(user => (
          <Card key={user.id}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: user.role === 'مدير_مكتب' ? '#DBEAFE' : '#F0FDF4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800,
                color: user.role === 'مدير_مكتب' ? T.primary : T.success,
              }}>{user.avatar}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{user.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: th.sub }}>@{user.username}</p>
                <span style={{
                  display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 99,
                  background: user.role === 'مدير_مكتب' ? '#DBEAFE' : '#F0FDF4',
                  color: user.role === 'مدير_مكتب' ? T.primary : T.success,
                }}>{user.role === 'مدير_مكتب' ? 'مدير مكتب' : 'موظف نهمة'}</span>
              </div>
              {user.id !== state.user?.id && (
                <button onClick={() => handleDelete(user.id, user.name)}
                  style={{ background: '#FEE2E2', border: 'none', borderRadius: 8, padding: '8px 10px', color: T.danger, cursor: 'pointer', fontSize: 14 }}>
                  🗑
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 150 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowAdd(false)} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: th.card, borderRadius: '20px 20px 0 0',
            padding: '20px 20px 32px',
            animation: 'slideUp 0.3s ease',
          }}>
            <h3 style={{ color: th.text, margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>إضافة مستخدم جديد</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'الاسم الكامل', key: 'name', placeholder: 'أدخل الاسم' },
                { label: 'اسم المستخدم', key: 'username', placeholder: 'موظف3' },
                { label: 'كلمة المرور', key: 'password', placeholder: '••••••' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: th.sub, display: 'block', marginBottom: 6, fontWeight: 600 }}>{f.label}</label>
                  <input
                    value={newUser[f.key as keyof typeof newUser] as string}
                    onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    type={f.key === 'password' ? 'password' : 'text'}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${th.border}`, background: th.inputBg,
                      color: th.text, fontSize: 14, outline: 'none',
                      boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
                    }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: th.sub, display: 'block', marginBottom: 6, fontWeight: 600 }}>الدور</label>
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as typeof newUser.role }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', direction: 'rtl' }}>
                  <option value="موظف_نهمة">موظف نهمة</option>
                  <option value="مدير_مكتب">مدير مكتب</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowAdd(false)}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.sub, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
                <button onClick={handleAdd}
                  style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: T.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✅ حفظ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
