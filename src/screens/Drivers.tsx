import { useState, useMemo } from 'react'
import { useApp } from '../context'
import { AppBar, StatusChip, SkeletonRow, useTheme, T, EmptyState } from '../components'
import type { Driver, TripType, ViolationType } from '../data'

type Filter = 'الكل' | 'نشط' | 'غير_نشط' | 'مخالف'
type SubFilter = 'الكل_نشط' | 'جاهز' | 'لديه_نهمة'

// ─── Create Trip Bottom Sheet ──────────────────────────────
function CreateTripSheet({ driver, onClose }: { driver: Driver; onClose: () => void }) {
  const { dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [tripType, setTripType] = useState<TripType>('فرزة')
  const [payload, setPayload] = useState('')
  const [province, setProvince] = useState('')
  const [destination, setDestination] = useState('')
  const [breakNum, setBreakNum] = useState('')

  const confirm = () => {
    dispatch({ type: 'SET_TRIP', driverId: driver.id, tripType })
    showSnackbar(`تم إنشاء نهمة (${tripType}) للسائق ${driver.ownerName} ✅`)
    onClose()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 150 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: th.card, borderRadius: '20px 20px 0 0',
        padding: '0 0 24px',
        animation: 'slideUp 0.3s ease',
        maxHeight: '85%', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ padding: '12px 0 8px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: th.border }} />
        </div>
        <div style={{ padding: '0 20px' }}>
          <h3 style={{ color: th.text, fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>إنشاء نهمة</h3>
          <p style={{ color: th.sub, fontSize: 12, margin: '0 0 20px' }}>
            {driver.ownerName} · {driver.plate}
          </p>

          {/* Trip Type */}
          <p style={{ fontSize: 12, fontWeight: 600, color: th.sub, margin: '0 0 8px' }}>نوع النهمة</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {(['فرزة', 'م1', 'م2', 'تعويض'] as TripType[]).map(t => (
              <button key={t} onClick={() => setTripType(t)}
                style={{
                  padding: '10px 4px', borderRadius: 10, border: 'none',
                  background: tripType === t ? T.primary : th.inputBg,
                  color: tripType === t ? '#fff' : th.text,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>{t}</button>
            ))}
          </div>

          {/* Compensation Balance */}
          {tripType === 'تعويض' && (
            <div style={{
              background: '#FEF9C3', borderRadius: 12, padding: '14px 16px',
              marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 24 }}>💰</span>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: '#92400E' }}>رصيد التعويض المتاح</p>
                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800, color: '#B45309' }}>
                  {driver.compensationBalance.toLocaleString()} ريال
                </p>
              </div>
            </div>
          )}

          {tripType !== 'تعويض' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'الحمولة', value: payload, set: setPayload, placeholder: 'نوع البضاعة' },
                { label: 'المحافظة', value: province, set: setProvince, placeholder: 'المحافظة' },
                { label: 'الوجهة', value: destination, set: setDestination, placeholder: 'المقصد' },
                { label: 'رقم الفك', value: breakNum, set: setBreakNum, placeholder: 'رقم الفك' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      border: `1px solid ${th.border}`, background: th.inputBg,
                      color: th.text, fontSize: 14, outline: 'none',
                      boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
                    }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose}
              style={{
                flex: 1, padding: '13px', borderRadius: 12,
                border: `1px solid ${th.border}`, background: 'none',
                color: th.sub, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>حفظ كمسودة</button>
            <button onClick={confirm}
              style={{
                flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                background: T.primary, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>تأكيد مبدئي ✓</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Driver Row ────────────────────────────────────────────
function DriverRow({ driver, isManager, onNahma, onViolation, highlighted }: {
  driver: Driver
  isManager: boolean
  onNahma: (d: Driver) => void
  onViolation: (d: Driver, type: ViolationType) => void
  highlighted: boolean
}) {
  const { navigate, showSnackbar, dispatch } = useApp()
  const th = useTheme()
  const [showMenu, setShowMenu] = useState(false)

  const canNahma = driver.status === 'نشط' && !driver.currentTrip && !driver.violation
  const canViolate = driver.status === 'نشط' && !driver.violation

  return (
    <div style={{ position: 'relative' }}>
      <div
        onContextMenu={e => { e.preventDefault(); setShowMenu(true) }}
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${th.border}`,
          background: highlighted ? (th.dark ? 'rgba(29,78,216,0.15)' : '#EFF6FF') : th.card,
          transition: 'background 0.5s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Seq */}
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: driver.type === 'س' ? '#DBEAFE' : '#F0FDF4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800,
            color: driver.type === 'س' ? T.primary : T.success,
          }}>{driver.seq}</div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }} onClick={() => navigate('driver-profile', { driverId: driver.id })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: th.text, cursor: 'pointer' }}>
                {driver.ownerName}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                background: driver.type === 'س' ? '#DBEAFE' : '#F0FDF4',
                color: driver.type === 'س' ? T.primary : T.success,
              }}>{driver.type}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: th.sub }}>🚗 {driver.plate}</span>
              {driver.compensationBalance > 0 && (
                <span style={{ fontSize: 11, color: T.warning }}>💰 {driver.compensationBalance.toLocaleString()}</span>
              )}
            </div>
            <div style={{ marginTop: 6 }}>
              <StatusChip driver={driver} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {canNahma && (
              <button onClick={() => onNahma(driver)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: T.primary, color: '#fff',
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                }}>ن</button>
            )}
            {canViolate && (
              <button onClick={() => onViolation(driver, 'ت')}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none',
                  background: '#FEE2E2', color: T.danger,
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                }}>ت</button>
            )}
            {isManager && canViolate && (
              <button onClick={() => onViolation(driver, 'ح')}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none',
                  background: '#FFF7ED', color: T.warning,
                  fontSize: 11, fontWeight: 800, cursor: 'pointer',
                }}>ح</button>
            )}
            {driver.violation && (
              <button onClick={() => {
                dispatch({ type: 'ADD_NOTIFICATION', notification: { icon: '🔔', type: 'استثناء', title: 'طلب استثناء', message: `طلب استثناء مقدم من السائق ${driver.ownerName}` } })
                showSnackbar('تم إرسال طلب الاستثناء ✅')
              }}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none',
                  background: '#F0FDF4', color: T.success,
                  fontSize: 10, fontWeight: 700, cursor: 'pointer',
                }}>استثناء</button>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 80 }} onClick={() => setShowMenu(false)} />
          <div style={{
            position: 'absolute', left: 16, top: '50%', zIndex: 90,
            background: '#1E293B', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            border: '1px solid #334155', minWidth: 160,
          }}>
            {canNahma && (
              <button onClick={() => { onNahma(driver); setShowMenu(false) }}
                style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', color: '#F1F5F9', cursor: 'pointer', textAlign: 'right', fontSize: 13, fontFamily: 'inherit', display: 'flex', gap: 8 }}>
                🚛 نهمة
              </button>
            )}
            {canViolate && (
              <button onClick={() => { onViolation(driver, 'ت'); setShowMenu(false) }}
                style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', color: '#FCA5A5', cursor: 'pointer', textAlign: 'right', fontSize: 13, fontFamily: 'inherit', display: 'flex', gap: 8, borderTop: '1px solid #334155' }}>
                ⚠️ تسجيل مخالفة (ت)
              </button>
            )}
            <button onClick={() => { navigate('driver-profile', { driverId: driver.id }); setShowMenu(false) }}
              style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', textAlign: 'right', fontSize: 13, fontFamily: 'inherit', display: 'flex', gap: 8, borderTop: '1px solid #334155' }}>
              👤 ملف السائق
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Screen ───────────────────────────────────────────
export default function DriversScreen() {
  const { state, dispatch, showSnackbar, isManager } = useApp()
  const th = useTheme()
  const [filter, setFilter] = useState<Filter>('الكل')
  const [subFilter, setSubFilter] = useState<SubFilter>('الكل_نشط')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [loading] = useState(false)

  const filtered = useMemo(() => {
    let list = state.drivers
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(d => d.ownerName.includes(q) || d.plate.includes(q) || d.phone.includes(q))
    }
    if (filter === 'نشط') {
      list = list.filter(d => d.status === 'نشط')
      if (subFilter === 'جاهز') list = list.filter(d => !d.currentTrip && !d.violation)
      if (subFilter === 'لديه_نهمة') list = list.filter(d => d.currentTrip)
    } else if (filter === 'غير_نشط') {
      list = list.filter(d => d.status === 'غير_نشط' && !d.violation)
    } else if (filter === 'مخالف') {
      list = list.filter(d => d.violation)
    }
    return list
  }, [state.drivers, filter, subFilter, search])

  const handleViolation = (driver: Driver, vType: 'ت' | 'ح') => {
    dispatch({ type: 'ADD_VIOLATION', driverId: driver.id, vType })
    showSnackbar(`تم تسجيل مخالفة (${vType}) للسائق ${driver.ownerName}`, () => {
      dispatch({ type: 'UNDO_VIOLATION', driverId: driver.id, vType })
    })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden', position: 'relative' }}>
      <AppBar
        title="كشف البوابير"
        rightSlot={
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowSearch(!showSearch)}
              style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 18, padding: 4 }}>🔍</button>
          </div>
        }
      />

      {/* Search Bar */}
      {showSearch && (
        <div style={{ padding: '8px 16px', background: T.appbar }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="البحث بالاسم، اللوحة، الهاتف..."
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#F1F5F9', fontSize: 14, outline: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
            }}
          />
        </div>
      )}

      {/* Filters */}
      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto' }}>
          {(['الكل', 'نشط', 'غير_نشط', 'مخالف'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px', borderRadius: 99, border: 'none', whiteSpace: 'nowrap',
                background: filter === f ? T.primary : (th.dark ? '#1E2D40' : '#F1F5F9'),
                color: filter === f ? '#fff' : th.sub,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {f === 'غير_نشط' ? 'غير نشط' : f}
            </button>
          ))}
        </div>
        {filter === 'نشط' && (
          <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px' }}>
            {([['الكل_نشط', 'الكل'], ['جاهز', 'جاهز'], ['لديه_نهمة', 'لديه نهمة']] as [SubFilter, string][]).map(([val, label]) => (
              <button key={val} onClick={() => setSubFilter(val)}
                style={{
                  padding: '4px 12px', borderRadius: 99, border: 'none',
                  background: subFilter === val ? T.success : (th.dark ? '#1E2D40' : '#F0FDF4'),
                  color: subFilter === val ? '#fff' : T.success,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Count */}
      <div style={{ padding: '8px 16px', background: th.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: th.sub }}>{filtered.length} بابور</span>
        <span style={{ fontSize: 11, color: th.muted }}>اضغط مطولاً على الصف للخيارات</span>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', background: th.card }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} dark={th.dark} />)
        ) : filtered.length === 0 ? (
          <EmptyState icon="📋" text="لا توجد نتائج" />
        ) : (
          filtered.map(driver => (
            <DriverRow
              key={driver.id}
              driver={driver}
              isManager={isManager}
              onNahma={setSelectedDriver}
              onViolation={handleViolation}
              highlighted={state.lastHighlightedDriverId === driver.id}
            />
          ))
        )}
      </div>

      {/* Create Trip Bottom Sheet */}
      {selectedDriver && (
        <CreateTripSheet
          driver={selectedDriver}
          onClose={() => {
            dispatch({ type: 'SET_HIGHLIGHT', driverId: selectedDriver.id })
            setSelectedDriver(null)
            setTimeout(() => dispatch({ type: 'SET_HIGHLIGHT', driverId: null }), 2000)
          }}
        />
      )}
    </div>
  )
}
