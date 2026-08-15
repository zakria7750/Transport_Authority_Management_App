import { useState, useMemo } from 'react'
import { useApp, type Screen } from '../context'
import { useTheme, T, Toggle, useDebounce, StatusChip, OFFICE_BRAND, APP_FULL_BRAND, APP_TAGLINE, StandardAppBar, MonochromeIcon } from '../components'
import type { ThemePreference } from '../context'

// ══════════════════════════════════════════════════════════
//  MORE SCREEN — المستخدمون + الإعدادات فقط (§3)
// ══════════════════════════════════════════════════════════
export function MoreScreen() {
  const { navigate, dispatch, isManager, state } = useApp()
  const th = useTheme()

  const items: { icon: string; label: string; screen: Screen }[] = [
    ...(isManager ? [{ icon: 'users', label: 'إدارة المستخدمين', screen: 'users' as Screen }] : []),
    { icon: 'settings', label: 'الإعدادات', screen: 'settings' as Screen },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <StandardAppBar title="المزيد" />

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
            {state.user?.role === 'مدير_مكتب' ? 'مدير مكتب' : state.user?.role === 'موظف_تسجيل' ? 'موظف تسجيل' : 'موظف نهمة'}
            {' · '}{OFFICE_BRAND}
          </p>
        </div>
        <button onClick={() => dispatch({ type: 'LOGOUT' })}
          style={{
            marginRight: 'auto', background: 'rgba(239,68,68,0.2)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
            color: '#FCA5A5', padding: '8px 12px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}><MonochromeIcon name="logout" size={15} /> خروج</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: th.card, borderTop: `1px solid ${th.border}`, borderBottom: `1px solid ${th.border}`, marginTop: 16 }}>
          {items.map((item, idx) => (
            <button key={item.screen}
              onClick={() => navigate(item.screen)}
              style={{
                width: '100%', padding: '14px 20px',
                border: 'none', borderBottom: idx < items.length - 1 ? `1px solid ${th.border}` : 'none',
                background: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 14, textAlign: 'right',
              }}>
              <span style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: th.dark ? '#2C2C2C' : '#F1F5F9',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
               }}><MonochromeIcon name={item.icon} size={18} /></span>
              <span style={{ fontSize: 14, fontWeight: 500, color: th.text, flex: 1 }}>{item.label}</span>
              <span style={{ color: th.muted, fontSize: 12 }}>‹</span>
            </button>
          ))}
        </div>

        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: th.muted, margin: 0 }}>{APP_FULL_BRAND}</p>
          <p style={{ fontSize: 10, color: th.muted, margin: '4px 0 0' }}>{APP_TAGLINE}</p>
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

  const themeLabel =
    state.themePreference === 'auto'
      ? 'تلقائي (حسب الجهاز)'
      : state.darkMode
        ? 'الوضع الداكن'
        : 'الوضع الفاتح'

  const settings = [
    {
      title: 'عن التطبيق',
      items: [
        {
           icon: 'building',
          label: APP_FULL_BRAND,
          desc: APP_TAGLINE,
        },
      ],
    },
    {
      title: 'المظهر والألوان',
      items: [
        {
           icon: 'theme',
          label: 'وضع المظهر',
          desc: themeLabel,
          control: (
            <select
              value={state.themePreference}
              onChange={(e) => dispatch({ type: 'SET_THEME', preference: e.target.value as ThemePreference })}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: `1px solid ${th.border}`,
                background: th.inputBg,
                color: th.text,
                fontSize: 12,
                fontFamily: 'inherit',
              }}
            >
              <option value="auto">تلقائي</option>
              <option value="light">فاتح</option>
              <option value="dark">داكن</option>
            </select>
          ),
        },
        {
           icon: 'moon',
          label: 'الوضع الداكن',
          desc: state.darkMode ? 'مفعّل (#121212)' : 'معطّل',
          control: <Toggle checked={state.darkMode} onChange={() => dispatch({ type: 'TOGGLE_DARK' })} />,
        },
      ],
    },
    {
      title: 'الأمان',
      items: [
        {
           icon: 'fingerprint',
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
           icon: 'refresh', label: 'المزامنة التلقائية', desc: 'مزامنة البيانات تلقائياً',
          control: <Toggle checked={autoSync} onChange={() => setAutoSync(!autoSync)} />,
        },
        {
           icon: 'save', label: 'النسخ الاحتياطي التلقائي', desc: 'نسخ يومي تلقائي',
          control: <Toggle checked={autoBackup} onChange={() => setAutoBackup(!autoBackup)} />,
        },
      ],
    },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <StandardAppBar title="الإعدادات" back="home" />

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
                    background: th.dark ? '#2C2C2C' : '#F1F5F9',
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 }}><MonochromeIcon name={item.icon} size={18} /></span>
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
           <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: th.text }}><MonochromeIcon name="refresh" size={15} /> حالة المزامنة — {OFFICE_BRAND}</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: th.sub }}>
            {state.pendingSyncCount > 0
              ? `${state.pendingSyncCount} عملية بانتظار المزامنة مع خادم ${OFFICE_BRAND}`
              : `جميع بيانات ${OFFICE_BRAND} متزامنة`}
          </p>
        </div>

        <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => void handleSync()}
            style={{ padding: '14px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.card, color: T.primary, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
             <MonochromeIcon name="refresh" size={16} /> مزامنة يدوية {state.pendingSyncCount > 0 ? `(${state.pendingSyncCount})` : ''}
          </button>
          <button onClick={() => showSnackbar('تم إنشاء نسخة احتياطية ✅')}
            style={{ padding: '14px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.card, color: T.success, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
             <MonochromeIcon name="save" size={16} /> نسخ احتياطي الآن
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
  const [separator, setSeparator] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const debouncedSep = useDebounce(separator, 300)

  const results = useMemo(() => {
    const hasQuery = debouncedQuery.trim().length >= 2
    const hasSep = debouncedSep.trim().length >= 1
    if (!hasQuery && !hasSep) return { active: [], inactive: [] }

    const match = (d: typeof state.drivers[0]) => {
      const q = debouncedQuery.toLowerCase()
      const byText =
        !hasQuery ||
        d.ownerName.includes(q) ||
        d.plate.includes(q) ||
        d.phone.includes(q)
      const bySep = !hasSep || d.separator.includes(debouncedSep.trim())
      return byText && bySep
    }

    const active = state.drivers.filter((d) => d.status === 'نشط' && match(d))
    const inactive = state.drivers.filter((d) => d.status === 'غير_نشط' && match(d))
    return { active, inactive }
  }, [debouncedQuery, debouncedSep, state.drivers])

  const total = results.active.length + results.inactive.length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <StandardAppBar title="البحث الشامل" back="home" />

      <div style={{ padding: '12px 16px', background: th.card, borderBottom: `1px solid ${th.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Task 70-71: Search with plate separator and status chip */}
        <div style={{ position: 'relative' }}>
           <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}><MonochromeIcon name="search" size={18} /></span>
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
        </div>
        <div style={{ position: 'relative' }}>
           <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}><MonochromeIcon name="hash" size={16} /></span>
          <input
            value={separator}
            onChange={e => setSeparator(e.target.value.replace(/[^\d\u0660-\u0669]/g, ''))}
            placeholder="ابحث بالفاصل..."
            style={{
              width: '100%', padding: '13px 46px 13px 14px',
              border: `1px solid ${th.border}`, borderRadius: 12,
              background: th.inputBg, color: th.text,
              fontSize: 14, outline: 'none',
              boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl', inputMode: 'numeric',
            }}
          />
        </div>
        <input
          value={separator}
          onChange={e => setSeparator(e.target.value.replace(/[^\d\u0660-\u0669]/g, ''))}
          placeholder="فاصل اللوحة (رقم)"
          inputMode="numeric"
          style={{
            width: '100%', padding: '11px 14px',
            border: `1px solid ${th.border}`, borderRadius: 12,
            background: th.inputBg, color: th.text,
            fontSize: 14, outline: 'none',
            boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!query.trim() && !separator.trim() ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
             <MonochromeIcon name="search" size={48} />
            <p style={{ color: th.sub, fontSize: 14 }}>ابحث عن سائق بالاسم أو رقم اللوحة أو فاصل اللوحة</p>
          </div>
        ) : total === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
             <MonochromeIcon name="inbox" size={48} />
            <p style={{ color: th.sub, fontSize: 14 }}>لا توجد نتائج</p>
          </div>
        ) : (
          <>
            {results.active.length > 0 && (
              <>
                <div style={{ padding: '12px 16px 6px', background: th.bg }}>
                   <span style={{ fontSize: 12, fontWeight: 700, color: T.success }}><MonochromeIcon name="check" size={14} /> في الكشف النشط ({results.active.length})</span>
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
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: th.sub }}>{d.plate} · ف {d.separator} · {d.phone}</p>
                    </div>
                    <StatusChip driver={d} />
                  </button>
                ))}
              </>
            )}

            {results.inactive.length > 0 && (
              <>
                <div style={{ padding: '12px 16px 6px', background: th.bg }}>
                   <span style={{ fontSize: 12, fontWeight: 700, color: th.sub }}><MonochromeIcon name="pause" size={14} /> غير النشطين ({results.inactive.length})</span>
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
                    }}>—</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{d.ownerName}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: th.sub }}>
                        {d.plate} · ف {d.separator}
                      </p>
                    </div>
                    <StatusChip driver={d} />
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

// ══════════════════════════════════════════════════════════
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
      <StandardAppBar
        title="الإشعارات"
        back="home"
        extraRight={
          unread.length > 0 ? (
            <button
              type="button"
              onClick={() => dispatch({ type: 'READ_ALL_NOTIFICATIONS' })}
              style={{ background: 'none', border: 'none', color: T.primary, cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              تعليم الكل
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

      <div style={{ padding: '8px 16px', background: th.card, borderBottom: `1px solid ${th.border}`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 10, color: th.muted }}>{APP_FULL_BRAND}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {visible.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
             <MonochromeIcon name="bell" size={48} />
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
               <span style={{ flexShrink: 0 }}><MonochromeIcon name={n.icon} size={n.read ? 20 : 22} /></span>
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
                   <MonochromeIcon name="close" size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
