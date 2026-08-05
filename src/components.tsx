import React, { useState, useEffect, useRef, type ReactNode } from "react"
import { useApp, type Screen } from "./context"
import type { Driver } from "./data"
import { isViolator } from "./domain"
import { OFFICE_BRAND, APP_FULL_BRAND } from "./constants"

export { OFFICE_BRAND, APP_FULL_BRAND, APP_SHORT_BRAND, APP_TAGLINE, TRANSPORT_AUTHORITY, APP_NAME, APP_PRINT_HEADER } from "./constants"

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

export function usePagination<T>(items: T[], itemsPerPage: number = 20) {
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [items.length])
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))
  const startIdx = (page - 1) * itemsPerPage
  const paginatedItems = items.slice(startIdx, startIdx + itemsPerPage)

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

export function useInfiniteScroll<T>(
  items: T[],
  itemsPerPage: number = 20,
  containerRef?: React.RefObject<HTMLDivElement | null>,
) {
  const [visibleCount, setVisibleCount] = useState(itemsPerPage)
  useEffect(() => setVisibleCount(itemsPerPage), [items.length, itemsPerPage])

  useEffect(() => {
    const el = containerRef?.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        setVisibleCount((c) => Math.min(c + itemsPerPage, items.length))
      }
    }
    el.addEventListener("scroll", onScroll)
    return () => el.removeEventListener("scroll", onScroll)
  }, [containerRef, items.length, itemsPerPage])

  return {
    visibleItems: items.slice(0, visibleCount),
    totalItems: items.length,
    hasMore: visibleCount < items.length,
    loadMore: () => setVisibleCount((c) => Math.min(c + itemsPerPage, items.length)),
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
  // Dark mode (Material-style per spec)
  dbg: '#121212',
  dcard: '#1E1E1E',
  dborder: '#2C2C2C',
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
    inputBg: d ? '#2C2C2C' : '#F8FAFC',
  }
}

export function SearchableField({
  label,
  value,
  onChange,
  options,
  placeholder = "ابحث أو اختر...",
  allowCustom = false,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  allowCustom?: boolean
}) {
  const th = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => setQuery(value), [value])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const normalized = (s: string) => s.trim().toLowerCase()
  const filtered = options.filter((o) => normalized(o).includes(normalized(query)))

  const pick = (v: string) => {
    onChange(v)
    setQuery(v)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 6 }}>
          {label}
        </label>
      )}
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (allowCustom) onChange(e.target.value)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${th.border}`,
          background: th.inputBg,
          color: th.text,
          fontSize: 14,
          fontFamily: "inherit",
          boxSizing: "border-box",
          direction: "rtl",
          outline: "none",
        }}
      />
      {open && query.trim() && filtered.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 120,
            background: th.card,
            border: `1px solid ${th.border}`,
            borderRadius: 10,
            marginTop: 4,
            padding: "12px",
            fontSize: 12,
            color: th.sub,
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          لا توجد نتائج
        </div>
      )}
      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 120,
            background: th.card,
            border: `1px solid ${th.border}`,
            borderRadius: 10,
            marginTop: 4,
            maxHeight: 180,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => pick(o)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderBottom: `1px solid ${th.border}`,
                background: o === value ? (th.dark ? "#2C2C2C" : "#EFF6FF") : "transparent",
                color: th.text,
                textAlign: "right",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function SearchableRosterField<T>({
  label,
  query,
  onQueryChange,
  selectedLabel,
  items,
  getKey,
  formatLabel,
  formatSubLabel,
  filterItem,
  onPick,
  onAction,
  actionLabel = "إضافة",
  placeholder = "ابحث بالاسم أو اللوحة...",
  emptyHint = "لا توجد نتائج مطابقة",
}: {
  label?: string
  query: string
  onQueryChange: (q: string) => void
  selectedLabel?: string
  items: T[]
  getKey: (item: T) => string | number
  formatLabel: (item: T) => string
  formatSubLabel?: (item: T) => string
  filterItem: (item: T, q: string) => boolean
  onPick?: (item: T) => void
  onAction?: (item: T) => void
  actionLabel?: string
  placeholder?: string
  emptyHint?: string
}) {
  const th = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const filtered = query.trim()
    ? items.filter((item) => filterItem(item, query))
    : items.slice(0, 8)

  const displayValue = open ? query : (selectedLabel ?? query)

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: "block", marginBottom: 6 }}>
          {label}
        </label>
      )}
      <input
        value={displayValue}
        onChange={(e) => {
          onQueryChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${th.border}`,
          background: th.inputBg,
          color: th.text,
          fontSize: 14,
          fontFamily: "inherit",
          boxSizing: "border-box",
          direction: "rtl",
          outline: "none",
        }}
      />
      {selectedLabel && !open && (
        <p style={{ margin: "4px 0 0", fontSize: 11, color: T.success }}>✓ {selectedLabel}</p>
      )}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 120,
            background: th.card,
            border: `1px solid ${th.border}`,
            borderRadius: 10,
            marginTop: 4,
            maxHeight: 220,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
        >
          {filtered.length === 0 ? (
            <p style={{ margin: 0, padding: "12px", fontSize: 12, color: th.sub, textAlign: "center" }}>
              {emptyHint}
            </p>
          ) : (
            filtered.map((item) => (
              <div
                key={getKey(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderBottom: `1px solid ${th.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (onPick) {
                      onPick(item)
                      onQueryChange("")
                      setOpen(false)
                    }
                  }}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    color: th.text,
                    textAlign: "right",
                    cursor: onPick ? "pointer" : "default",
                    fontFamily: "inherit",
                    padding: 0,
                  }}
                >
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{formatLabel(item)}</span>
                  {formatSubLabel && (
                    <span style={{ display: "block", fontSize: 11, color: th.sub, marginTop: 2 }}>
                      {formatSubLabel(item)}
                    </span>
                  )}
                </button>
                {onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      onAction(item)
                      onQueryChange("")
                      setOpen(false)
                    }}
                    style={{
                      flexShrink: 0,
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "none",
                      background: T.primary,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    + {actionLabel}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function AppBarStandardSlots({
  onQuickAdd,
  showBell = true,
}: {
  onQuickAdd?: () => void
  showBell?: boolean
}) {
  const { navigate, dispatch, isManager, state, showSnackbar, unreadCount } = useApp()

  const bellBtn = showBell ? (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => navigate("notifications")}
        style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4 }}
        title="الإشعارات"
      >
        🔔
      </button>
      {unreadCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            background: T.danger,
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 99,
            minWidth: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3px",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </div>
      )}
    </div>
  ) : null

  const syncBtn = isManager ? (
    <button
      type="button"
      onClick={async () => {
        await new Promise((r) => setTimeout(r, 500))
        dispatch({ type: "SYNC_NOW" })
        showSnackbar("تمت المزامنة بنجاح ✅")
      }}
      style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 18, padding: 4, position: "relative" }}
      title={`مزامنة — ${OFFICE_BRAND}`}
    >
      🔄
      {state.pendingSyncCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            background: T.warning,
            color: "#fff",
            fontSize: 8,
            fontWeight: 700,
            borderRadius: 99,
            minWidth: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {state.pendingSyncCount > 9 ? "9+" : state.pendingSyncCount}
        </span>
      )}
    </button>
  ) : null

  return {
    rightSlot: (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => navigate("settings")}
          style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 18, padding: 4 }}
          title="الإعدادات"
        >
          ⚙️
        </button>
        <button
          type="button"
          onClick={() => navigate("search")}
          style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 18, padding: 4 }}
          title="بحث شامل"
        >
          🔍
        </button>
      </div>
    ),
    leftSlot: (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {bellBtn}
        {syncBtn}
        {onQuickAdd ? (
          <button
            type="button"
            onClick={onQuickAdd}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: T.primaryLight,
              border: "none",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 300,
            }}
          >
            +
          </button>
        ) : null}
      </div>
    ),
  }
}

// ─── StatusChip ───────────────────────────────────────────
export function StatusChip({ driver }: { driver: Driver }) {
  let label = ""
  let bg = ""
  let color = ""

  if (driver.status === "غير_نشط") {
    if (driver.statusReason === "قابل_للإضافة") {
      label = "قابل للإضافة"
      bg = "#E2E8F0"
      color = "#475569"
    } else if (isViolator(driver) || driver.statusReason?.includes("مخالف")) {
      label = `مخالف (${driver.violation ?? (driver.statusReason === "مخالف_ح" ? "ح" : "ت")})`
      bg = "#FEE2E2"
      color = T.danger
    } else {
      label = driver.statusReason === "مفروز" ? "مفروز" : driver.statusReason === "بدون_ضمانة" ? "بدون ضمانة" : "غير نشط"
      bg = "#F1F5F9"
      color = T.sub
    }
  } else if (driver.currentTrip) {
    label = `لديه نهمة · ${driver.currentTrip}`
    bg = "#FEF9C3"
    color = "#B45309"
  } else {
    label = "جاهز"
    bg = "#D1FAE5"
    color = "#065F46"
  }

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: bg,
        color,
        whiteSpace: "nowrap",
        animation: "fadeIn 0.3s ease",
      }}
    >
      {label}
    </span>
  )
}

export function BottomSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  const th = useTheme()
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 150 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: th.card,
          borderRadius: "20px 20px 0 0",
          padding: "0 0 24px",
          animation: "slideUp 0.3s ease",
          maxHeight: "85%",
          overflowY: "auto",
        }}
      >
        <div style={{ padding: "12px 0 8px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: th.border }} />
        </div>
        <div style={{ padding: "0 20px" }}>
          <h3 style={{ color: th.text, fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>{title}</h3>
          {subtitle && <p style={{ color: th.sub, fontSize: 12, margin: "0 0 16px" }}>{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
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
export function AppBar({ title, back, rightSlot, leftSlot, hideBell }: AppBarProps & { hideBell?: boolean }) {
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
        {!hideBell && state.screen !== 'login' && !leftSlot && (
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
  const { state, navigate, isRegistrationClerk } = useApp()
  const th = useTheme()

  const HIDDEN: Screen[] = ["login", "driver-profile"]
  if (HIDDEN.includes(state.screen)) return null

  const items = isRegistrationClerk
    ? [
        { screen: "registration" as Screen, icon: "➕", label: "تسجيل" },
        { screen: "settings" as Screen, icon: "⚙️", label: "إعدادات" },
      ]
    : NAV_ITEMS

  return (
    <div style={{
      background: th.card,
      borderTop: `1px solid ${th.border}`,
      display: 'flex',
      flexShrink: 0,
    }}>
      {items.map(item => {
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
    fontFamily: 'inherit', transition: 'opacity 0.2s, transform 0.15s ease',
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
  return (
    <button
      {...props}
      style={{ ...baseStyle, ...variants[variant], ...style }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.96)'
        props.onMouseDown?.(e)
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        props.onMouseUp?.(e)
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        props.onMouseLeave?.(e)
      }}
    >
      {children}
    </button>
  )
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
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function PullToRefresh({ onRefresh, children, containerRef }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startYRef = useRef<number>(0)

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
