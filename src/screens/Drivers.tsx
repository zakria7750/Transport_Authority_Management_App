import { useState, useMemo, useRef, useEffect } from 'react'
import { useApp, useSaveScrollPosition, useGetScrollPosition } from '../context'
import { SkeletonRow, useTheme, T, EmptyState, PullToRefresh, useInfiniteScroll, StandardAppBar, MonochromeIcon } from '../components'
import TripSheet from '../TripSheet'
import { isViolator, sortDriversAllFilter } from '../domain'
import type { Driver, ViolationType } from '../data'

type Filter = 'الكل' | 'نشط' | 'غير_نشط' | 'مخالف'
type SubFilter = 'الكل_نشط' | 'جاهز' | 'لديه_نهمة'
function DriverRow({ driver, isManager, onNahma, onViolation, highlighted }: {
  driver: Driver
  isManager: boolean
  onNahma: (d: Driver) => void
  onViolation: (d: Driver, type: ViolationType) => void
  highlighted: boolean
}) {
  const { navigate } = useApp()
  const th = useTheme()
  const [showMenu, setShowMenu] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canNahma = driver.status === 'نشط' && !driver.currentTrip && !driver.violation
  const canViolate = !driver.violation

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const startLongPress = () => {
    clearLongPress()
    longPressTimer.current = setTimeout(() => setShowMenu(true), 500)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        onContextMenu={e => { e.preventDefault(); setShowMenu(true) }}
        onTouchStart={startLongPress}
        onTouchEnd={clearLongPress}
        onTouchMove={clearLongPress}
        onMouseDown={startLongPress}
        onMouseUp={clearLongPress}
        onMouseLeave={clearLongPress}
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
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: th.sub }}><MonochromeIcon name="car" size={13} /> {driver.plate}</span>
              <span style={{ fontSize: 11, color: th.muted }}>ف {driver.separator}</span>
              {driver.currentTrip && (
                <span style={{ fontSize: 10, fontWeight: 700, color: T.warning }}>نهمة: {driver.currentTrip}</span>
              )}
              {driver.compensationBalance > 0 && (
                <span style={{ fontSize: 11, color: T.warning }}><MonochromeIcon name="money" size={13} /> {driver.compensationBalance.toLocaleString()}</span>
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
                 <MonochromeIcon name="truck" size={16} /> نهمة
              </button>
            )}
            {canViolate && (
              <button onClick={() => { onViolation(driver, 'ت'); setShowMenu(false) }}
                style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', color: '#FCA5A5', cursor: 'pointer', textAlign: 'right', fontSize: 13, fontFamily: 'inherit', display: 'flex', gap: 8, borderTop: '1px solid #334155' }}>
               <MonochromeIcon name="warning" size={16} /> تسجيل مخالفة (ت)
              </button>
            )}
            <button onClick={() => { navigate('driver-profile', { driverId: driver.id }); setShowMenu(false) }}
              style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', textAlign: 'right', fontSize: 13, fontFamily: 'inherit', display: 'flex', gap: 8, borderTop: '1px solid #334155' }}>
               <MonochromeIcon name="user" size={16} /> ملف السائق
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Screen ───────────────────────────────────────────
export default function DriversScreen() {
  const { state, dispatch, showSnackbar, isManager, scheduleDeferredViolation } = useApp()
  const th = useTheme()
  const [filter, setFilter] = useState<Filter>(() => {
    const p = state.screenParams.filter as Filter | undefined
    return p && ['الكل', 'نشط', 'غير_نشط', 'مخالف'].includes(p) ? p : 'الكل'
  })
  const [subFilter, setSubFilter] = useState<SubFilter>('الكل_نشط')
  const [search, setSearch] = useState('')
  const [showSubFilters, setShowSubFilters] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveScroll = useSaveScrollPosition('drivers')
  const savedScroll = useGetScrollPosition('drivers')

  useEffect(() => {
    if (scrollRef.current && savedScroll > 0) {
      scrollRef.current.scrollTop = savedScroll
    }
  }, [savedScroll])

  useEffect(() => {
    const p = state.screenParams.filter as Filter | undefined
    if (p && ['الكل', 'نشط', 'غير_نشط', 'مخالف'].includes(p)) {
      setFilter(p)
    }
  }, [state.screenParams.filter])

  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 350)
    return () => clearTimeout(t)
  }, [filter, subFilter, search])

  const handleScroll = () => {
    if (scrollRef.current) {
      saveScroll(scrollRef.current.scrollTop)
    }
  }

  const handleRefresh = async () => {
    await new Promise(r => setTimeout(r, 800))
    showSnackbar('تم تحديث البيانات بنجاح ✅')
  }

  const filtered = useMemo(() => {
    let list = state.drivers
    if (search) {
      const q = search.trim().toLocaleLowerCase('ar')
      list = list.filter(d => `${d.ownerName} ${d.plate} ${d.phone}`.toLocaleLowerCase('ar').includes(q))
    }
    if (filter === 'نشط') {
      list = list.filter(d => d.status === 'نشط')
      if (subFilter === 'جاهز') list = list.filter(d => !d.currentTrip && !d.violation)
      if (subFilter === 'لديه_نهمة') list = list.filter(d => d.currentTrip)
    } else if (filter === 'غير_نشط') {
      list = list.filter(d => d.status === 'غير_نشط' && !d.violation)
    } else if (filter === 'مخالف') {
      list = list.filter(d => isViolator(d))
    } else if (filter === 'الكل') {
      list = sortDriversAllFilter(list)
    }
    return list
  }, [state.drivers, filter, subFilter, search])

  const { visibleItems, totalItems, hasMore } = useInfiniteScroll(filtered, 20, scrollRef)

  const handleViolation = (driver: Driver, vType: ViolationType) => {
    scheduleDeferredViolation(driver.id, vType, driver.ownerName)
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} containerRef={scrollRef}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden', position: 'relative' }}>
        <StandardAppBar
        title="كشف البوابير"
        extraRight={
          <button
            type="button"
            onClick={() => setShowSubFilters(!showSubFilters)}
            style={{
              background: showSubFilters || filter === 'نشط' ? 'rgba(255,255,255,0.15)' : 'none',
              border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 18, padding: 4,
              borderRadius: 6,
            }}
            title="فلتر"
          >
            <MonochromeIcon name="filter" size={18} />
          </button>
        }
      />

      {/* Search Bar */}
      <div style={{ padding: '8px 16px', background: th.card, borderBottom: `1px solid ${th.border}` }}>
        <input
          aria-label="فلترة الكشف بالاسم أو رقم اللوحة"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="فلترة بالاسم أو رقم اللوحة"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, boxSizing: 'border-box', direction: 'rtl' }}
        />
      </div>
      {/* Filters — الصف الأول دائماً مرئي (§4.1) */}
      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto' }}>
          {(['الكل', 'نشط', 'غير_نشط', 'مخالف'] as Filter[]).map(f => (
            <button key={f} onClick={() => { setFilter(f); if (f === 'نشط') setShowSubFilters(true) }}
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
        {filter === 'نشط' && showSubFilters && (
          <div style={{ display: 'flex', gap: 6, padding: '0 16px 10px' }}>
            {([['الكل_نشط', 'الكل'], ['جاهز', 'جاهز للنهمة'], ['لديه_نهمة', 'لديه نهمة']] as [SubFilter, string][]).map(([val, label]) => (
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
        <span style={{ fontSize: 12, color: th.sub }}>{totalItems} بابور · يُعرض {visibleItems.length}</span>
        <span style={{ fontSize: 11, color: th.muted }}>مرّر للأسفل للمزيد</span>
      </div>

      {/* List */}
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', background: th.card }}>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} dark={th.dark} />)
        ) : filtered.length === 0 ? (
          <EmptyState icon="📋" text="لا توجد نتائج" />
        ) : (
          <>
            {visibleItems.map(driver => (
              <DriverRow
                key={driver.id}
                driver={driver}
                isManager={isManager}
                onNahma={setSelectedDriver}
                onViolation={handleViolation}
                highlighted={state.lastHighlightedDriverId === driver.id}
              />
            ))}
            {hasMore && (
              <div style={{ padding: '12px 16px', textAlign: 'center', background: th.bg, borderTop: `1px solid ${th.border}` }}>
                <span style={{ fontSize: 11, color: th.muted }}>↓ مرّر للأسفل لتحميل المزيد ({visibleItems.length}/{totalItems})</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Trip Bottom Sheet */}
      {selectedDriver && (
        <TripSheet
          driver={selectedDriver}
          onClose={() => {
            dispatch({ type: 'SET_HIGHLIGHT', driverId: selectedDriver.id })
            setSelectedDriver(null)
            setTimeout(() => dispatch({ type: 'SET_HIGHLIGHT', driverId: null }), 2500)
          }}
        />
      )}
      </div>
    </PullToRefresh>
  )
}
