import { useApp, type Screen } from './context'
import type { Driver } from './data'

// ─── useDebounce Hook ─────────────────────────────────────
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// ─── usePagination Hook ───────────────────────────────────
export function usePagination<T>(items: T[], itemsPerPage: number = 20) {
  const [page, setPage] = React.useState(1)
  const totalPages = Math.ceil(items.length / itemsPerPage)
  const startIdx = (page - 1) * itemsPerPage
  const endIdx = startIdx + itemsPerPage
  const paginatedItems = items.slice(startIdx, endIdx)

  return {
    paginatedItems,
    page,
    setPage,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    totalItems: items.length,
  }
}

// ─── Tokens ───────────────────────────────────────────────
export const T = {
  // Light mode
  bg: '#F0F4F8',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  sub: '#64748B',
  muted: '#94A3B8',
  // Dark mode
  dbg: '#0B1120',
  dcard: '#161F2E',
  dborder: '#1E2D40',
  dtext: '#F1F5F9',
  dsub: '#94A3B8',
  // Brand
  primary: '#1D4ED8',
  primaryLight: '#3B82F6',
  accent: '#0EA5E9',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  // AppBar
  appbar: '#0F2040',
}

// ─── Hooks ────────────────────────────────────────────────
export function useTheme() {
  const { state } = useApp()
  const d = state.darkMode
  return {
    dark: d,
    bg: d ? T.dbg : T.bg,
    card: d ? T.dcard : T.card,
    border: d ? T.dborder : T.border,
    text: d ? T.dtext : T.text,
    sub: d ? T.dsub : T.sub,
    muted: d ? '#4B5563' : T.muted,
    inputBg: d ? '#1E2D40' : '#F8FAFC',
  }
}

// ─── StatusChip ───────────────────────────────────────────
export function StatusChip({ driver }: { driver: Driver }) {
  let label = '', bg = '', color = ''
  if (driver.status === 'غير_نشط') {
    label = driver.statusReason?.includes('مخالف') ? `مخالف (${driver.violation})` : (driver.statusReason ?? 'غير نشط')
    bg = driver.statusReason?.includes('مخالف') ? '#FEE2E2' : '#F1F5F9'
    color = driver.statusReason?.includes('مخالف') ? T.danger : T.sub
  } else if (driver.violation) {
    label = `مخالف (${driver.violation})`
    bg = '#FEE2E2'; color = T.danger
  } else if (driver.currentTrip) {
    label = `لديه نهمة · ${driver.currentTrip}`
    bg = '#FEF9C3'; color = '#B45309'
  } else {
    label = 'جاهز'; bg = '#D1FAE5'; color = '#065F46'
  }
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
      backgroundColor: bg, color, whiteSpace: 'nowrap',
      animation: 'fadeIn 0.3s ease',
    }}>{label}</span>
  )
}

// ─── SkeletonRow ──────────────────────────────────────────
export function SkeletonRow({ dark }: { dark: boolean }) {
  const bg = dark ? '#1E2D40' : '#E2E8F0'
  const shine = dark ? '#2D3F55' : '#F1F5F9'
  return (
    <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: bg }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 12, borderRadius: 6, background: shine, width: '60%' }} />
        <div style={{ height: 10, borderRadius: 6, background: bg, width: '40%' }} />
      </div>
      <div style={{ width: 56, height: 20, borderRadius: 99, background: bg }} />
    </div>
  )
}

// ─── AppBar ───────────────────────────────────────────────
interface AppBarProps {
  title: string
  back?: Screen | boolean
  rightSlot?: React.ReactNode
  leftSlot?: React.ReactNode
}
export function AppBar({ title, back, rightSlot, leftSlot }: AppBarProps) {
  const { navigate, state, unreadCount } = useApp()

  return (
    <div style={{
      background: T.appbar,
      padding: '0 16px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 80 }}>
        {back && (
          <button onClick={() => navigate(typeof back === 'string' ? back : 'home')}
            style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 4, fontSize: 18 }}>
            ‹
          </button>
        )}
        {rightSlot}
      </div>

      {/* Title */}
      <h1 style={{ color: '#F1F5F9', fontSize: 16, fontWeight: 700, margin: 0, flex: 1, textAlign: 'center' }}>
        {title}
      </h1>

      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80, justifyContent: 'flex-end' }}>
        {leftSlot}
        {state.screen !== 'login' && (
          <div style={{ position: 'relative' }}>
            <button onClick={() => navigate('notifications')}
              style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>
              🔔
            </button>
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute', top: 0, right: 0,
                background: T.danger, color: '#fff', fontSize: 9, fontWeight: 700,
                borderRadius: 99, minWidth: 14, height: 14, display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: '0 3px',
              }}>{unreadCount > 9 ? '9+' : unreadCount}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BottomNav ────────────────────────────────────────────
const NAV_ITEMS: { screen: Screen; icon: string; label: string }[] = [
  { screen: 'home',          icon: '🏠', label: 'الرئيسية' },
  { screen: 'drivers',       icon: '📋', label: 'الكشف' },
  { screen: 'registration',  icon: '➕', label: 'تسجيل' },
  { screen: 'pending-trips', icon: '🚛', label: 'النهمات' },
  { screen: 'more',          icon: '☰',  label: 'المزيد' },
]

export function BottomNav() {
  const { state, navigate } = useApp()
  const th = useTheme()

  const HIDDEN: Screen[] = ['login', 'driver-profile']
  if (HIDDEN.includes(state.screen)) return null

  return (
    <div style={{
      background: th.card,
      borderTop: `1px solid ${th.border}`,
      display: 'flex',
      flexShrink: 0,
    }}>
      {NAV_ITEMS.map(item => {
        const active = state.screen === item.screen
        return (
          <button key={item.screen}
            onClick={() => navigate(item.screen)}
            style={{
              flex: 1, border: 'none', background: 'none', cursor: 'pointer',
              padding: '8px 4px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: active ? T.primary : th.sub,
              transition: 'color 0.2s',
            }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{item.label}</span>
            {active && (
              <div style={{ width: 20, height: 2, borderRadius: 1, background: T.primary, position: 'absolute', bottom: 0 }} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Snackbar ─────────────────────────────────────────────
export function Snackbar() {
  const { state, dispatch } = useApp()
  if (!state.snackbar) return null

  return (
    <div style={{
      position: 'absolute', bottom: 72, left: 12, right: 12, zIndex: 200,
      background: '#1E293B', color: '#F1F5F9',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <span style={{ fontSize: 13, flex: 1 }}>{state.snackbar.message}</span>
      {state.snackbar.undoFn && (
        <button
          onClick={() => { state.snackbar?.undoFn?.(); dispatch({ type: 'HIDE_SNACKBAR' }) }}
          style={{ background: 'none', border: 'none', color: '#38BDF8', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginRight: 8, whiteSpace: 'nowrap' }}>
          تراجع
        </button>
      )}
      <button onClick={() => dispatch({ type: 'HIDE_SNACKBAR' })}
        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>
        ✕
      </button>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────
export function SectionHeader({ title, count }: { title: string; count?: number }) {
  const th = useTheme()
  return (
    <div style={{
      padding: '16px 16px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: th.sub, textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 12, fontWeight: 600, color: T.primary, background: '#EFF6FF', padding: '2px 8px', borderRadius: 99 }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: string
}
export function Input({ label, icon, style, ...props }: InputProps) {
  const th = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style as React.CSSProperties }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: th.sub }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: th.muted }}>
            {icon}
          </span>
        )}
        <input {...props} style={{
          width: '100%', padding: icon ? '10px 40px 10px 12px' : '10px 12px',
          border: `1px solid ${th.border}`, borderRadius: 10,
          background: th.inputBg, color: th.text,
          fontSize: 14, outline: 'none', boxSizing: 'border-box',
          fontFamily: 'inherit', direction: 'rtl',
        }} />
      </div>
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md'
  fullWidth?: boolean
}
export function Btn({ variant = 'primary', size = 'md', fullWidth, children, style, ...props }: BtnProps) {
  const baseStyle: React.CSSProperties = {
    border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 600,
    fontFamily: 'inherit', transition: 'opacity 0.2s',
    padding: size === 'sm' ? '6px 14px' : '11px 20px',
    fontSize: size === 'sm' ? 12 : 14,
    width: fullWidth ? '100%' : undefined,
  }
  const variants = {
    primary: { background: T.primary, color: '#fff' },
    danger: { background: T.danger, color: '#fff' },
    ghost: { background: 'transparent', color: T.primary, border: `1px solid ${T.primary}` },
    outline: { background: 'transparent', color: '#64748B', border: '1px solid #CBD5E1' },
  }
  return <button {...props} style={{ ...baseStyle, ...variants[variant], ...style }}>{children}</button>
}

// ─── Card ─────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const th = useTheme()
  return (
    <div style={{
      background: th.card, borderRadius: 14,
      border: `1px solid ${th.border}`,
      overflow: 'hidden', ...style
    }}>
      {children}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────
export function EmptyState({ icon, text }: { icon: string; text: string }) {
  const th = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <p style={{ color: th.sub, fontSize: 14, textAlign: 'center', margin: 0 }}>{text}</p>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────
export function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} style={{
      width: 44, height: 24, borderRadius: 12,
      background: checked ? T.primary : '#CBD5E1',
      cursor: 'pointer', position: 'relative',
      transition: 'background 0.2s',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 9, background: '#fff',
        position: 'absolute', top: 3,
        right: checked ? 4 : undefined,
        left: checked ? undefined : 4,
        transition: 'all 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </div>
  )
}

// ─── PullToRefresh ────────────────────────────────────────
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  containerRef: React.RefObject<HTMLDivElement>
}

export function PullToRefresh({ onRefresh, children, containerRef }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = React.useState(false)
  const [pullDistance, setPullDistance] = React.useState(0)
  const startYRef = React.useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current && containerRef.current && containerRef.current.scrollTop === 0) {
      const diff = e.touches[0].clientY - startYRef.current
      if (diff > 0) {
        setPullDistance(Math.min(diff, 100))
      }
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !refreshing) {
      setRefreshing(true)
      await onRefresh()
      setRefreshing(false)
    }
    setPullDistance(0)
    startYRef.current = 0
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', height: '100%' }}
    >
      {pullDistance > 0 && (
        <div style={{
          position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, textAlign: 'center',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            border: '3px solid ' + T.primary,
            borderTopColor: 'transparent',
            transform: `rotate(${(pullDistance / 100) * 360}deg)`,
            opacity: Math.min(1, pullDistance / 60),
          }} />
        </div>
      )}
      {children}
    </div>
  )
}
