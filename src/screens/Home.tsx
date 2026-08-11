import { useState, useRef, useEffect } from 'react'
import { useApp, useSaveScrollPosition, useGetScrollPosition } from '../context'
import { AppBar, useTheme, T, PullToRefresh, AppBarStandardSlots, APP_FULL_BRAND, MonochromeIcon } from '../components'
import { isPendingTripStatus, violatorCount } from '../domain'
import type { Screen } from '../context'

export default function HomeScreen() {
  const { state, navigate, dispatch, isManager, showSnackbar } = useApp()
  const th = useTheme()
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const saveScroll = useSaveScrollPosition('home')
  const savedScroll = useGetScrollPosition('home')

  useEffect(() => {
    if (scrollRef.current && savedScroll > 0) {
      scrollRef.current.scrollTop = savedScroll
    }
  }, [savedScroll])

  const handleScroll = () => {
    if (scrollRef.current) {
      saveScroll(scrollRef.current.scrollTop)
    }
  }

  const handleRefresh = async () => {
    await new Promise(r => setTimeout(r, 800))
    showSnackbar('تم تحديث البيانات بنجاح ✅')
  }

  const drivers = state.drivers
  const activeCount = drivers.filter(d => d.status === 'نشط').length
  const inactiveCount = drivers.filter(d => d.status === 'غير_نشط').length
  const violatorsCount = violatorCount(drivers)
  const totalCompensation = drivers.reduce((s, d) => s + d.compensationBalance, 0)
  const pendingViolations = state.violations.filter(v => !v.raised).length
  const pendingTrips = state.trips.filter(t => isPendingTripStatus(t.status)).length

  const stats: { label: string; value: string | number; icon: string; color: string; bg: string; screen?: Screen; filter?: string }[] = [
    { label: 'البوابير النشطة', value: activeCount, icon: 'check', color: T.success, bg: '#D1FAE5', screen: 'drivers', filter: 'نشط' },
    { label: 'غير النشطة', value: inactiveCount, icon: 'pause', color: T.sub, bg: '#F1F5F9', screen: 'drivers', filter: 'غير_نشط' },
    { label: 'المخالفين', value: violatorsCount, icon: 'warning', color: T.danger, bg: '#FEE2E2', screen: 'violations' },
    { label: 'التعويضات', value: `${totalCompensation.toLocaleString()} ر`, icon: 'money', color: T.warning, bg: '#FEF9C3', screen: 'guarantees' },
  ]

  const roleLabel =
    state.user?.role === 'مدير_مكتب'
      ? 'مدير المكتب'
      : state.user?.role === 'موظف_تسجيل'
        ? 'موظف تسجيل'
        : 'موظف نهمة'

  const { rightSlot, leftSlot } = AppBarStandardSlots({
    onQuickAdd: () => setShowQuickMenu(!showQuickMenu),
  })

  // Screens for manager/trip officer
  const availableScreens: { label: string; icon: string; screen: Screen; roles: any[] }[] = [
    { label: 'كشف البوابير', icon: 'clipboard', screen: 'drivers', roles: ['موظف_نهمة', 'مدير_مكتب'] },
    { label: 'كشف التحضير', icon: 'note', screen: 'attendance-sheet', roles: ['موظف_نهمة', 'مدير_مكتب'] },
    { label: 'النهمات المعلقة', icon: 'truck', screen: 'pending-trips', roles: ['موظف_نهمة', 'مدير_مكتب'] },
    { label: 'سجل الأعطال', icon: 'wrench', screen: 'breakdowns', roles: ['موظف_نهمة', 'مدير_مكتب'] },
    ...(isManager ? [
      { label: 'المخالفات', icon: 'warning', screen: 'violations' as Screen, roles: ['مدير_مكتب'] },
      { label: 'الضمانات', icon: 'bank', screen: 'guarantees' as Screen, roles: ['مدير_مكتب'] },
      { label: 'التقارير', icon: 'chart', screen: 'reports' as Screen, roles: ['مدير_مكتب'] },
      { label: 'المستخدمين', icon: 'users', screen: 'users' as Screen, roles: ['مدير_مكتب'] },
      { label: 'إدارة السائقين', icon: 'car', screen: 'driver-management' as Screen, roles: ['مدير_مكتب'] },
    ] : []),
  ]

  return (
    <PullToRefresh onRefresh={handleRefresh} containerRef={scrollRef}>
      <div ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', background: th.bg, display: 'flex', flexDirection: 'column' }}>
        <AppBar
        title="الرئيسية"
        rightSlot={rightSlot}
        leftSlot={
          <div style={{ position: 'relative' }}>
            {leftSlot}
            {showQuickMenu && (
              <div style={{
                position: 'absolute', left: 0, top: 38, zIndex: 100,
                background: '#1E293B', borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                minWidth: 180, border: '1px solid #334155',
              }}>
                {[
                  { label: 'تسجيل مالك جديد', icon: 'user', action: () => { navigate('registration', { tab: 'register' }); setShowQuickMenu(false) } },
                  { label: 'إضافة مالك للكشف', icon: 'clipboard', action: () => { navigate('registration', { tab: 'add' }); setShowQuickMenu(false) } },
                  { label: 'كشف التحضير', icon: 'note', action: () => { navigate('attendance-sheet'); setShowQuickMenu(false) } },
                  ...(isManager ? [
                    { label: 'إضافة مخالفة', icon: 'warning', action: () => { navigate('violations'); setShowQuickMenu(false) } },
                    { label: 'إضافة مستخدم', icon: 'key', action: () => { navigate('users'); setShowQuickMenu(false) } },
                  ] : []),
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    style={{
                      width: '100%', padding: '12px 16px', border: 'none',
                      background: 'none', color: '#F1F5F9', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      fontSize: 13, textAlign: 'right', fontFamily: 'inherit',
                      borderBottom: '1px solid #334155',
                    }}>
                    <MonochromeIcon name={item.icon} size={17} />{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* Hero greeting */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2040 0%, #1D4ED8 100%)',
        padding: '20px 20px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -30, right: -10, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <p style={{ color: '#94A3B8', fontSize: 13, margin: '0 0 4px' }}>مرحباً،</p>
        <h2 style={{ color: '#F1F5F9', fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>{state.user?.name}</h2>
        <p style={{ color: '#64748B', fontSize: 12, margin: 0 }}>
          {roleLabel} · {APP_FULL_BRAND} ·&nbsp;
          {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {stats.map(s => (
          <button
            key={s.label}
            type="button"
            onClick={() => s.screen && navigate(s.screen, s.filter ? { filter: s.filter } : undefined)}
            disabled={!s.screen}
            style={{
              background: th.card, borderRadius: 14, padding: '14px 16px',
              border: `1px solid ${th.border}`,
              display: 'flex', flexDirection: 'column', gap: 8,
              cursor: s.screen ? 'pointer' : 'default',
              fontFamily: 'inherit', textAlign: 'right',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <MonochromeIcon name={s.icon} size={22} />
              <div style={{ padding: '2px 8px', borderRadius: 99, background: s.bg, fontSize: 10, fontWeight: 700, color: s.color }}>
                اليوم
              </div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: th.text, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: th.sub, marginTop: 4 }}>{s.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Screens Grid - ShortCuts */}
      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
          الشاشات المتاحة
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {availableScreens.map(screen => (
            <button
              key={screen.screen}
              type="button"
              onClick={() => navigate(screen.screen)}
              style={{
                background: th.card,
                border: `1px solid ${th.border}`,
                borderRadius: 12,
                padding: '16px 12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'inherit',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                const elem = e.currentTarget as HTMLElement
                elem.style.background = th.border
                elem.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                const elem = e.currentTarget as HTMLElement
                elem.style.background = th.card
                elem.style.transform = 'scale(1)'
              }}
            >
              <MonochromeIcon name={screen.icon} size={24} />
              <span style={{ fontSize: 12, fontWeight: 600, color: th.text }}>{screen.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Manager Quick Actions — hidden from the home screen without changing its handlers */}
      {isManager && (
        <div style={{ display: 'none', padding: '0 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
            إجراءات سريعة
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={() => {
                dispatch({ type: 'RAISE_ALL_VIOLATIONS' })
                showSnackbar(`تم رفع ${pendingViolations} مخالفة بنجاح ✅`)
              }}
              style={{
                background: T.danger, border: 'none', borderRadius: 12,
                padding: '13px 16px', color: '#fff', fontWeight: 700,
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              <span>رفع جميع المخالفات القابلة للرفع</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '2px 10px', fontSize: 12 }}>
                {pendingViolations}
              </span>
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  await new Promise(r => setTimeout(r, 600))
                  dispatch({ type: 'SYNC_NOW' })
                  showSnackbar('تمت المزامنة بنجاح ✅')
                }}
                style={{
                  flex: 1, background: T.primary, border: 'none',
                  borderRadius: 12, padding: '12px', color: '#fff', fontWeight: 700,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                🔄 مزامنة الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Nav Grid — hidden from the home screen without changing its navigation */}
      <div style={{ display: 'none', padding: '16px 16px 0' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
          وصول سريع
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { icon: '📋', label: 'الكشف', screen: 'drivers' as const },
            { icon: '🚛', label: 'النهمات', screen: 'pending-trips' as const },
            { icon: '📝', label: 'التحضير', screen: 'attendance' as const },
            { icon: '⚠️', label: 'المخالفات', screen: 'violations' as const },
            { icon: '🔧', label: 'الأعطال', screen: 'breakdowns' as const },
            { icon: '🏦', label: 'الضمانات', screen: 'guarantees' as const },
            ...(isManager ? [
              { icon: '📊', label: 'التقارير', screen: 'reports' as const },
              { icon: '👥', label: 'المستخدمون', screen: 'users' as const },
            ] : [
              { icon: '🔍', label: 'بحث', screen: 'search' as const },
              { icon: '⚙️', label: 'الإعدادات', screen: 'settings' as const },
            ]),
          ].map(item => (
            <button key={item.label}
              onClick={() => navigate(item.screen)}
              style={{
                background: th.card, border: `1px solid ${th.border}`,
                borderRadius: 12, padding: '12px 8px',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'transform 0.1s',
              }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: th.sub, textAlign: 'center' }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px' }}>
          آخر النشاطات
        </p>
        <div style={{ background: th.card, borderRadius: 14, border: `1px solid ${th.border}`, overflow: 'hidden' }}>
          {state.notifications.slice(0, 4).map((n, i) => (
            <div key={n.id} style={{
              padding: '12px 16px',
              borderBottom: i < 3 ? `1px solid ${th.border}` : 'none',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: !n.read ? (th.dark ? 'rgba(29,78,216,0.08)' : '#EFF6FF') : 'transparent',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: th.text }}>{n.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: th.sub, lineHeight: 1.4 }}>{n.message}</p>
              </div>
              {!n.read && (
                <div style={{ width: 8, height: 8, borderRadius: 4, background: T.primary, flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary footer */}
      <div style={{ padding: '12px 16px 24px' }}>
        <div style={{
          background: th.card, borderRadius: 14, border: `1px solid ${th.border}`,
          padding: '14px 16px', display: 'flex', justifyContent: 'space-around',
        }}>
          {[
            { label: 'نهمات معلقة', value: pendingTrips, color: T.warning },
            { label: 'مخالفات مفتوحة', value: pendingViolations, color: T.danger },
            { label: 'إجمالي البوابير', value: drivers.length, color: T.primary },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: th.sub, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 10, color: th.muted, textAlign: 'center' }}>{APP_FULL_BRAND}</p>
      </div>
      </div>
    </PullToRefresh>
  )
}
