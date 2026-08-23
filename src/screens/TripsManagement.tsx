import { useMemo, useState } from 'react'
import { useApp } from '../context'
import { StandardAppBar, useTheme, T, EmptyState } from '../components'
import { YEMEN_PROVINCES, PAYLOAD_OPTIONS, DESTINATION_TYPES } from '../constants'
import type { Trip, TripType } from '../data'

type Tab = 'pending' | 'completed' | 'cancelled'

const tripTypes: TripType[] = ['فرزة', 'م1', 'م2', 'تعويض']

export function TripsManagementScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [tab, setTab] = useState<Tab>('pending')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [destinationFilter, setDestinationFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [editing, setEditing] = useState<Trip | null>(null)

  const trips = useMemo(() => state.trips.filter((trip) => {
    const driver = state.drivers.find((item) => item.id === trip.driverId)
    const statusMatch = tab === 'pending'
      ? ['معلقة', 'مؤكدة_مبدئياً', 'مسودة'].includes(trip.status)
      : tab === 'completed' ? trip.status === 'مكتملة' : trip.status === 'ملغاة'
    const normalizedQuery = query.trim().toLocaleLowerCase('ar')
    const searchMatch = !normalizedQuery || `${driver?.ownerName ?? ''} ${driver?.plate ?? ''}`.toLocaleLowerCase('ar').includes(normalizedQuery)
    const dateMatch = !dateFilter || trip.createdAt.slice(0, 10) === dateFilter || trip.createdAt.includes(dateFilter)
    return statusMatch && searchMatch && dateMatch && (typeFilter === 'all' || trip.type === typeFilter) && (destinationFilter === 'all' || trip.destination === destinationFilter)
  }), [state.trips, state.drivers, tab, query, typeFilter, destinationFilter, dateFilter])

  const update = (field: keyof Trip, value: string) => setEditing((current) => current ? { ...current, [field]: value } : current)
  const save = () => {
    if (!editing || editing.status === 'مكتملة') return
    dispatch({ type: 'UPDATE_TRIP', trip: editing })
    showSnackbar('تم تحديث بيانات النهمة')
    setEditing(null)
  }
  const remove = (trip: Trip) => {
    if (trip.status !== 'ملغاة') return showSnackbar('يسمح بحذف النهمات الملغاة فقط')
    if (window.confirm('هل تريد حذف النهمة الملغاة؟')) {
      dispatch({ type: 'DELETE_TRIP', tripId: trip.id })
      showSnackbar('تم حذف النهمة')
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
        <StandardAppBar title="إدارة النهمات" back="home" />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: th.card, borderBottom: `1px solid ${th.border}` }}>
        <input aria-label="بحث باسم السائق أو اللوحة" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث باسم السائق أو رقم اللوحة" style={{ padding: '11px 13px', borderRadius: 12, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, direction: 'rtl' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <select aria-label="نوع النهمة" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text }}><option value="all">كل الأنواع</option>{tripTypes.map((type) => <option key={type}>{type}</option>)}</select>
          <select aria-label="الوجهة" value={destinationFilter} onChange={(e) => setDestinationFilter(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text }}><option value="all">كل الوجهات</option>{Array.from(new Set(state.trips.map((trip) => trip.destination))).map((destination) => <option key={destination}>{destination}</option>)}</select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: th.sub, fontSize: 12 }}>
          التاريخ
          <input aria-label="تاريخ النهمة" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ flex: 1, minWidth: 0, padding: 9, borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text }} />
        </label>
      </div>
      <div style={{ display: 'flex', background: th.card, borderBottom: `1px solid ${th.border}` }}>{([['pending', 'المعلقة'], ['completed', 'المكتملة'], ['cancelled', 'الملغاة']] as [Tab, string][]).map(([key, label]) => <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: 12, border: 0, borderBottom: tab === key ? `3px solid ${T.primary}` : '3px solid transparent', background: 'transparent', color: tab === key ? T.primary : th.sub, fontWeight: 700 }}>{label}</button>)}</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {trips.length === 0 ? <EmptyState text="لا توجد نهمات مطابقة" /> : <div className="responsive-table-list">{trips.map((trip) => { const driver = state.drivers.find((item) => item.id === trip.driverId); return <article key={trip.id} style={{ background: th.card, border: `1px solid ${th.border}`, borderRadius: 16, padding: 14, marginBottom: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><strong style={{ color: th.text }}>{driver?.ownerName ?? 'غير معروف'}</strong><p style={{ margin: '4px 0', color: th.sub, fontSize: 12 }}>{driver?.plate} · {trip.type}</p></div><span style={{ color: th.sub, fontSize: 11 }}>{trip.status}</span></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, color: th.sub, fontSize: 12, margin: '10px 0' }}><span>الحمولة: {trip.payload || '-'}</span><span>المحافظة: {trip.province}</span><span>الوجهة: {trip.destination}</span><span>رقم الفك: {trip.breakNum}</span></div><div style={{ display: 'flex', gap: 8 }}><button disabled={trip.status === 'مكتملة'} onClick={() => setEditing({ ...trip })} style={{ flex: 1, padding: 9, border: 0, borderRadius: 10, background: trip.status === 'مكتملة' ? th.border : T.primary, color: '#fff' }}>تعديل</button>{trip.status === 'ملغاة' && <button onClick={() => remove(trip)} style={{ flex: 1, padding: 9, border: 0, borderRadius: 10, background: T.danger, color: '#fff' }}>حذف</button>}</div></article> })}</div>}
      </div>
      {editing && <div role="dialog" aria-modal="true" style={{ position: 'absolute', inset: 0, zIndex: 150, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end' }}><div style={{ width: '100%', maxHeight: '92%', overflowY: 'auto', background: th.card, borderRadius: '22px 22px 0 0', padding: 20 }}><h2 style={{ margin: '0 0 16px', color: th.text, fontSize: 18 }}>تعديل النهمة</h2><label style={{ display: 'block', color: th.sub, fontSize: 12 }}>نوع النهمة<select value={editing.type} onChange={(e) => update('type', e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: 11, borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text }}>{tripTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label style={{ display: 'block', color: th.sub, fontSize: 12, marginTop: 12 }}>الحمولة<input value={editing.payload} onChange={(e) => update('payload', e.target.value)} placeholder={PAYLOAD_OPTIONS.join('، ')} style={{ display: 'block', width: '100%', marginTop: 6, padding: 11, borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text }} /></label><label style={{ display: 'block', color: th.sub, fontSize: 12, marginTop: 12 }}>المحافظة<select value={editing.province} onChange={(e) => update('province', e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: 11, borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text }}>{YEMEN_PROVINCES.map((province) => <option key={province}>{province}</option>)}</select></label><label style={{ display: 'block', color: th.sub, fontSize: 12, marginTop: 12 }}>نوع الوجهة<select value={editing.destinationType} onChange={(e) => update('destinationType', e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: 11, borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text }}>{DESTINATION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label style={{ display: 'block', color: th.sub, fontSize: 12, marginTop: 12 }}>الوجهة<input value={editing.destination} onChange={(e) => update('destination', e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: 11, borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text }} /></label><label style={{ display: 'block', color: th.sub, fontSize: 12, marginTop: 12 }}>رقم الفك<input value={editing.breakNum} onChange={(e) => update('breakNum', e.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: 11, borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text }} /></label><div style={{ display: 'flex', gap: 8, marginTop: 18 }}><button onClick={() => setEditing(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${th.border}`, background: 'transparent', color: th.text }}>إلغاء</button><button onClick={save} style={{ flex: 1, padding: 12, borderRadius: 10, border: 0, background: T.primary, color: '#fff', fontWeight: 700 }}>حفظ التعديل</button></div></div></div>}
    </div>
  )
}
