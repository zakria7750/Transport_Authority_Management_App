import { useState, useMemo } from 'react'
import { useApp } from '../context'
import { StandardAppBar, useTheme, T } from '../components'
import type { Trip } from '../data'

type TabType = 'pending' | 'completed' | 'cancelled'

export function TripsManagementScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  
  const [tab, setTab] = useState<TabType>('pending')
  const [searchDriver, setSearchDriver] = useState('')
  const [searchPlate, setSearchPlate] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterDestination, setFilterDestination] = useState<string>('all')
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // Get trips by status
  const getTrips = () => {
    let trips = state.trips
    
    if (tab === 'pending') {
      trips = trips.filter(t => ['معلقة', 'مؤكدة_مبدئياً'].includes(t.status))
    } else if (tab === 'completed') {
      trips = trips.filter(t => t.status === 'مكتملة')
    } else if (tab === 'cancelled') {
      trips = trips.filter(t => t.status === 'ملغاة')
    }

    // Apply filters
    if (searchDriver) {
      const driver = state.drivers.find(d => d.id === state.trips.find(tr => tr.id === trips[0]?.id)?.driverId)
      trips = trips.filter(t => {
        const d = state.drivers.find(dr => dr.id === t.driverId)
        return d?.ownerName.includes(searchDriver)
      })
    }

    if (searchPlate) {
      trips = trips.filter(t => {
        const d = state.drivers.find(dr => dr.id === t.driverId)
        return d?.plate.includes(searchPlate)
      })
    }

    if (filterType !== 'all') {
      trips = trips.filter(t => t.type === filterType)
    }

    if (filterDestination !== 'all') {
      trips = trips.filter(t => t.destination === filterDestination)
    }

    return trips
  }

  const filteredTrips = useMemo(() => getTrips(), [tab, searchDriver, searchPlate, filterType, filterDestination, state.trips])

  const handleEditTrip = (trip: Trip) => {
    // Cannot edit if already confirmed exit
    if (trip.status === 'مكتملة') {
      showSnackbar('لا يمكن تعديل النهمة بعد التأكيد')
      return
    }
    setEditingTrip(trip)
    setShowEditDialog(true)
  }

  const handleSaveEdit = () => {
    if (!editingTrip) return
    dispatch({ type: 'UPDATE_TRIP', trip: editingTrip })
    showSnackbar('تم تحديث النهمة بنجاح ✅')
    setShowEditDialog(false)
    setEditingTrip(null)
  }

  const handleDeleteTrip = (trip: Trip) => {
    if (tab !== 'cancelled') {
      showSnackbar('يمكن حذف النهمات الملغاة فقط')
      return
    }
    
    if (!window.confirm('هل تريد حذف هذه النهمة؟')) return

    dispatch({ type: 'DELETE_TRIP', tripId: trip.id })
    showSnackbar('تم حذف النهمة بنجاح ✅')
  }

  const getDriverName = (driverId: number) => {
    return state.drivers.find(d => d.id === driverId)?.ownerName || 'غير معروف'
  }

  const getDriverPlate = (driverId: number) => {
    return state.drivers.find(d => d.id === driverId)?.plate || '-'
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <StandardAppBar title="إدارة النهمات" back="more" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${th.border}`, background: th.card }}>
        {[
          { key: 'pending', label: 'المعلقة', color: '#F59E0B' },
          { key: 'completed', label: 'المكتملة', color: '#10B981' },
          { key: 'cancelled', label: 'الملغاة', color: '#EF4444' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as TabType)}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: tab === t.key ? th.card : 'transparent',
              color: tab === t.key ? t.color : th.sub,
              borderBottom: tab === t.key ? `3px solid ${t.color}` : 'none',
              cursor: 'pointer',
              fontWeight: tab === t.key ? 700 : 500,
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 16px', background: th.card, borderBottom: `1px solid ${th.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="text"
          placeholder="ابحث باسم السائق..."
          value={searchDriver}
          onChange={(e) => setSearchDriver(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${th.border}`,
            background: th.inputBg,
            color: th.text,
            fontFamily: 'inherit',
            fontSize: 13,
            direction: 'rtl',
          }}
        />
        <input
          type="text"
          placeholder="ابحث برقم اللوحة..."
          value={searchPlate}
          onChange={(e) => setSearchPlate(e.target.value)}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${th.border}`,
            background: th.inputBg,
            color: th.text,
            fontFamily: 'inherit',
            fontSize: 13,
            direction: 'rtl',
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${th.border}`,
              background: th.inputBg,
              color: th.text,
              fontFamily: 'inherit',
              fontSize: 13,
            }}
          >
            <option value="all">جميع الأنواع</option>
            <option value="فرزة">فرزة</option>
            <option value="م1">م1</option>
            <option value="م2">م2</option>
            <option value="تعويض">تعويض</option>
          </select>
          <select
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${th.border}`,
              background: th.inputBg,
              color: th.text,
              fontFamily: 'inherit',
              fontSize: 13,
            }}
          >
            <option value="all">جميع الوجهات</option>
            <option value="عدن">عدن</option>
            <option value="تعز">تعز</option>
            <option value="صنعاء">صنعاء</option>
          </select>
        </div>
      </div>

      {/* Trips List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {filteredTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: th.sub }}>
            لا توجد نهمات
          </div>
        ) : (
          filteredTrips.map(trip => (
            <div
              key={trip.id}
              style={{
                background: th.card,
                border: `1px solid ${th.border}`,
                borderRadius: 12,
                padding: '14px',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: th.text }}>
                    {getDriverName(trip.driverId)}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: th.sub }}>
                    {getDriverPlate(trip.driverId)} · {trip.type}
                  </p>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 99,
                  background: trip.status === 'معلقة' ? '#FEF9C3' : trip.status === 'مكتملة' ? '#D1FAE5' : '#FEE2E2',
                  color: trip.status === 'معلقة' ? '#92400E' : trip.status === 'مكتملة' ? '#065F46' : '#991B1B',
                }}>
                  {trip.status}
                </span>
              </div>

              <div style={{ fontSize: 12, color: th.sub, marginBottom: '12px' }}>
                <p style={{ margin: '4px 0' }}>الحمولة: {trip.load}</p>
                <p style={{ margin: '4px 0' }}>المحافظة: {trip.province}</p>
                <p style={{ margin: '4px 0' }}>الوجهة: {trip.destination}</p>
                <p style={{ margin: '4px 0' }}>رقم الفك: {trip.exitNumber}</p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleEditTrip(trip)}
                  disabled={trip.status === 'مكتملة'}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: trip.status === 'مكتملة' ? '#E5E7EB' : '#3B82F6',
                    color: trip.status === 'مكتملة' ? '#9CA3AF' : '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: trip.status === 'مكتملة' ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  تعديل
                </button>
                {tab === 'cancelled' && (
                  <button
                    onClick={() => handleDeleteTrip(trip)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#DC2626',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    حذف
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      {showEditDialog && editingTrip && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div style={{
            width: '100%',
            maxHeight: '85vh',
            background: th.bg,
            borderRadius: '16px 16px 0 0',
            padding: '20px',
            overflowY: 'auto',
          }}>
            <h3 style={{ margin: 0, marginBottom: '16px', color: th.text }}>تعديل النهمة</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: 'block', marginBottom: 6 }}>
                  نوع النهمة
                </label>
                <select
                  value={editingTrip.type}
                  onChange={(e) => setEditingTrip({ ...editingTrip, type: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${th.border}`,
                    background: th.inputBg,
                    color: th.text,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  <option>فرزة</option>
                  <option>م1</option>
                  <option>م2</option>
                  <option>تعويض</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: 'block', marginBottom: 6 }}>
                  الحمولة
                </label>
                <input
                  type="text"
                  value={editingTrip.load}
                  onChange={(e) => setEditingTrip({ ...editingTrip, load: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${th.border}`,
                    background: th.inputBg,
                    color: th.text,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: 'block', marginBottom: 6 }}>
                  المحافظة
                </label>
                <input
                  type="text"
                  value={editingTrip.province}
                  onChange={(e) => setEditingTrip({ ...editingTrip, province: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${th.border}`,
                    background: th.inputBg,
                    color: th.text,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: 'block', marginBottom: 6 }}>
                  الوجهة
                </label>
                <select
                  value={editingTrip.destination}
                  onChange={(e) => setEditingTrip({ ...editingTrip, destination: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${th.border}`,
                    background: th.inputBg,
                    color: th.text,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  <option>عدن</option>
                  <option>تعز</option>
                  <option>صنعاء</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: th.sub, display: 'block', marginBottom: 6 }}>
                  رقم الفك
                </label>
                <input
                  type="text"
                  value={editingTrip.exitNumber}
                  onChange={(e) => setEditingTrip({ ...editingTrip, exitNumber: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${th.border}`,
                    background: th.inputBg,
                    color: th.text,
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  onClick={() => setShowEditDialog(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 8,
                    border: `1px solid ${th.border}`,
                    background: 'transparent',
                    color: th.sub,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 8,
                    border: 'none',
                    background: T.primary,
                    color: '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
