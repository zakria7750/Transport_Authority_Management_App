import { useState, useMemo } from 'react'
import { useApp, type Screen } from '../context'
import { AppBar, useTheme, T, Toggle, useDebounce } from '../components'

// ══════════════════════════════════════════════════════════
//  MORE SCREEN
// ══════════════════════════════════════════════════════════
export function MoreScreen() {
  const { navigate, dispatch, isManager, state } = useApp()
  const th = useTheme()

  const sections = [
    {
      title: 'العمليات اليومية',
      items: [
        { icon: '📝', label: 'كشف التحضير', screen: 'attendance' as Screen },
        { icon: '⚠️', label: 'المخالفات', screen: 'violations' as Screen },
        { icon: '🔧', label: 'الأعطال', screen: 'breakdowns' as Screen },
        { icon: '🏦', label: 'الضمانات', screen: 'guarantees' as Screen },
      ]
    },
    ...(isManager ? [{
      title: 'صلاحيات المدير',
      items: [
        { icon: '📊', label: 'التقارير', screen: 'reports' as Screen },
        { icon: '👥', label: 'إدارة المستخدمين', screen: 'users' as Screen },
      ]
    }] : []),
    {
      title: 'عام',
      items: [
        { icon: '🔍', label: 'البحث الشامل', screen: 'search' as Screen },
        { icon: '🔔', label: 'الإشعارات', screen: 'notifications' as Screen },
        { icon: '⚙️', label: 'الإعدادات', screen: 'settings' as Screen },
      ]
    }
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="المزيد" />

      {/* User Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2040 0%, #1D4ED8 100%)',
        padding: '20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 800, color: '#F1F5F9',
          border: '2px solid rgba(255,255,255,0.2)',
        }}>{state.user?.avatar}</div>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#F1F5F9' }}>{state.user?.name}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>
            {state.user?.role === 'مدير_مكتب' ? '🔑 مدير مكتب' : '👤 موظف نهمة'}
          </p>
        </div>
        <button onClick={() => dispatch({ type: 'LOGOUT' })}
          style={{
            marginRight: 'auto', background: 'rgba(239,68,68,0.2)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
            color: '#FCA5A5', padding: '8px 12px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>خروج 🚪</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sections.map(section => (
          <div key={section.title}>
            <p style={{ padding: '16px 16px 8px', margin: 0, fontSize: 11, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1 }}>
              {section.title}
            </p>
            <div style={{ background: th.card, borderTop: `1px solid ${th.border}`, borderBottom: `1px solid ${th.border}` }}>
              {section.items.map((item, idx) => (
                <button key={item.screen}
                  onClick={() => navigate(item.screen)}
                  style={{
                    width: '100%', padding: '14px 20px',
                    border: 'none', borderBottom: idx < section.items.length - 1 ? `1px solid ${th.border}` : 'none',
                    background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 14, textAlign: 'right',
                  }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: th.dark ? '#1E2D40' : '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>{item.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: th.text, flex: 1 }}>{item.label}</span>
                  <span style={{ color: th.muted, fontSize: 12 }}>‹</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: th.muted, margin: 0 }}>هيئة النقل · نظام البوابير v2.0</p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  SETTINGS SCREEN
// ══════════════════════════════════════════════════════════
export function SettingsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [autoSync, setAutoSync] = useState(true)
  const [autoBackup, setAutoBackup] = useState(false)

  const handleSync = async () => {
    await new Promise((r) => setTimeout(r, 600))
    dispatch({ type: 'SYNC_NOW' })
    showSnackbar('تمت المزامنة بنجاح ✅')
  }

  const settings = [
    {
      title: 'المظهر والألوان',
      items: [
        {
          icon: '🌙', label: 'الوضع الداكن', desc: state.darkMode ? 'الوضع الداكن مفعّل' : 'الوضع الفاتح مفعّل',
          control: <Toggle checked={state.darkMode} onChange={() => dispatch({ type: 'TOGGLE_DARK' })} />,
        },
      ],
    },
    {
      title: 'الأمان',
      items: [
        {
          icon: '👆',
          label: 'الدخول بالبصمة',
          desc: state.biometricEnabled
            ? 'يظهر زر البصمة في شاشة الدخول'
            : 'معطّل — فعّله للدخول السريع',
          control: (
            <Toggle
              checked={state.biometricEnabled}
              onChange={() => dispatch({ type: 'SET_BIOMETRIC', enabled: !state.biometricEnabled })}
            />
          ),
        },
      ],
    },
    {
      title: 'البيانات',
      items: [
        {
          icon: '🔄', label: 'المزامنة التلقائية', desc: 'مزامنة البيانات تلقائياً',
          control: <Toggle checked={autoSync} onChange={() => setAutoSync(!autoSync)} />,
        },
        {
          icon: '💾', label: 'النسخ الاحتياطي التلقائي', desc: 'نسخ يومي تلقائي',
          control: <Toggle checked={autoBackup} onChange={() => setAutoBackup(!autoBackup)} />,
        },
      ],
    },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="الإعدادات" back="more" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {settings.map(section => (
          <div key={section.title}>
            <p style={{ padding: '16px 16px 8px', margin: 0, fontSize: 11, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1 }}>
              {section.title}
            </p>
            <div style={{ background: th.card, borderTop: `1px solid ${th.border}`, borderBottom: `1px solid ${th.border}` }}>
              {section.items.map((item, idx) => (
                <div key={item.label} style={{
                  padding: '14px 20px',
                  borderBottom: idx < section.items.length - 1 ? `1px solid ${th.border}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: th.dark ? '#1E2D40' : '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: th.text }}>{item.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: th.sub }}>{item.desc}</p>
                  </div>
                  {item.control}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{
          margin: '0 16px 12px',
          padding: '14px 16px',
          background: state.pendingSyncCount > 0 ? (th.dark ? 'rgba(245,158,11,0.12)' : '#FEF9C3') : th.card,
          borderRadius: 12,
          border: `1px solid ${state.pendingSyncCount > 0 ? '#F59E0B' : th.border}`,
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: th.text }}>📡 حالة المزامنة</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: th.sub }}>
            {state.pendingSyncCount > 0
              ? `${state.pendingSyncCount} عملية بانتظار المزامنة مع الخادم`
              : 'جميع البيانات متزامنة'}
          </p>
        </div>

        <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => void handleSync()}
            style={{ padding: '14px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.card, color: T.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            🔄 مزامنة يدوية {state.pendingSyncCount > 0 ? `(${state.pendingSyncCount})` : ''}
          </button>
          <button onClick={() => showSnackbar('تم إنشاء نسخة احتياطية ✅')}
            style={{ padding: '14px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.card, color: T.success, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            💾 نسخ احتياطي الآن
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  GLOBAL SEARCH SCREEN
// ══════════════════════════════════════════════════════════
export function SearchScreen() {
  const { state, navigate } = useApp()
  const th = useTheme()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const results = useMemo(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) return { active: [], inactive: [] }
    const q = debouncedQuery.toLowerCase()
    const active = state.drivers.filter(d =>
      d.status === 'نشط' && (d.ownerName.includes(q) || d.plate.includes(q) || d.phone.includes(q))
    )
    const inactive = state.drivers.filter(d =>
      d.status === 'غير_نشط' && (d.ownerName.includes(q) || d.plate.includes(q) || d.phone.includes(q))
    )
    return { active, inactive }
  }, [debouncedQuery, state.drivers])

  const total = results.active.length + results.inactive.length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="البحث الشامل" back="more" />

      {/* Search Bar */}
      <div style={{ padding: '12px 16px', background: th.card, borderBottom: `1px solid ${th.border}` }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو اللوحة أو الهاتف..."
            style={{
              width: '100%', padding: '13px 46px 13px 14px',
              border: `1px solid ${th.border}`, borderRadius: 12,
              background: th.inputBg, color: th.text,
              fontSize: 14, outline: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: th.muted, cursor: 'pointer', fontSize: 16 }}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!query.trim() ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🔍</span>
            <p style={{ color: th.sub, fontSize: 14 }}>ابحث عن سائق بالاسم أو رقم اللوحة أو رقم الهاتف</p>
          </div>
        ) : total === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>😔</span>
            <p style={{ color: th.sub, fontSize: 14 }}>لا توجد نتائج لـ "{debouncedQuery}"</p>
          </div>
        ) : (
          <>
            {results.active.length > 0 && (
              <>
                <div style={{ padding: '12px 16px 6px', background: th.bg }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.success }}>✅ في الكشف النشط ({results.active.length})</span>
                </div>
                {results.active.map(d => (
                  <button key={d.id}
                    onClick={() => navigate('driver-profile', { driverId: d.id })}
                    style={{
                      width: '100%', padding: '14px 20px', border: 'none',
                      borderBottom: `1px solid ${th.border}`, background: th.card,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: T.primary,
                    }}>م{d.seq}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{d.ownerName}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: th.sub }}>{d.plate} · {d.phone}</p>
                    </div>
                    <span style={{ color: th.muted }}>‹</span>
                  </button>
                ))}
              </>
            )}

            {results.inactive.length > 0 && (
              <>
                <div style={{ padding: '12px 16px 6px', background: th.bg }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: th.sub }}>⏸ غير النشطين ({results.inactive.length})</span>
                </div>
                {results.inactive.map(d => (
                  <button key={d.id}
                    onClick={() => navigate('driver-profile', { driverId: d.id })}
                    style={{
                      width: '100%', padding: '14px 20px', border: 'none',
                      borderBottom: `1px solid ${th.border}`, background: th.card,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, color: th.sub,
                    }}>م{d.seq}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{d.ownerName}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: th.sub }}>
                        {d.plate} · {d.statusReason?.replace('_', ' ')}
                      </p>
                    </div>
                    <span style={{ color: th.muted }}>‹</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════���══════
//  NOTIFICATIONS SCREEN
// ══════════════════════════════════════════════════════════
export function NotificationsScreen() {
  const { state, dispatch } = useApp()
  const th = useTheme()
  const [tab, setTab] = useState<'unread' | 'read' | 'all'>('all')

  const unread = state.notifications.filter(n => !n.read)
  const read = state.notifications.filter(n => n.read)
  const visible =
    tab === 'unread' ? unread : tab === 'read' ? read : state.notifications

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <AppBar title="الإشعارات" back="home"
        rightSlot={
          unread.length > 0 ? (
            <button onClick={() => dispatch({ type: 'READ_ALL_NOTIFICATIONS' })}
              style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              تعليم الكل مقروء
            </button>
          ) : undefined
        }
      />

      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, display: 'flex' }}>
        {[
          ['all', 'الكل', state.notifications.length],
          ['unread', 'غير مقروءة', unread.length],
          ['read', 'مقروءة', read.length],
        ].map(([k, l, count]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k as typeof tab)}
            style={{
              flex: 1,
              padding: '12px 4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: tab === k ? T.primary : th.sub,
              borderBottom: `2px solid ${tab === k ? T.primary : 'transparent'}`,
              fontSize: 11,
              fontWeight: tab === k ? 700 : 400,
            }}
          >
            {l} ({count as number})
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {visible.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🔔</span>
            <p style={{ color: th.sub, fontSize: 14 }}>لا توجد إشعارات في هذا التبويب</p>
          </div>
        ) : (
          visible.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && dispatch({ type: 'READ_NOTIFICATION', id: n.id })}
              style={{
                padding: '14px 20px',
                borderBottom: `1px solid ${th.border}`,
                background: !n.read ? (th.dark ? 'rgba(29,78,216,0.1)' : '#EFF6FF') : 'transparent',
                cursor: !n.read ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                opacity: n.read ? 0.85 : 1,
              }}
            >
              <span style={{ fontSize: n.read ? 20 : 22, flexShrink: 0 }}>{n.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: n.read ? 600 : 700, color: th.text }}>{n.title}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: th.sub, lineHeight: 1.4 }}>{n.message}</p>
                <p style={{ margin: '4px 0 0', fontSize: 10, color: th.muted }}>{n.date}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: T.primary }} />}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_NOTIFICATION', id: n.id }) }}
                  style={{ background: 'none', border: 'none', color: th.muted, cursor: 'pointer', fontSize: 14 }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
