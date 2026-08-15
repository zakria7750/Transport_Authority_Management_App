import { useState, useMemo, useRef, type ReactNode } from "react"
import { jsPDF } from "jspdf"
import amiriFontUrl from "../assets/Amiri-Regular.ttf?url"
import * as XLSX from "xlsx"
import { useApp } from "../context"
import { useTheme, T, Card, EmptyState, SkeletonRow, SearchableField, SearchableRosterField, APP_FULL_BRAND, StandardAppBar, MonochromeIcon } from "../components"
import {
  countActiveGuarantors,
  canBeGuarantor,
  canPersonGuarantee,
  guarantorFromRosterDriver,
  matchesNameOrPlate,
  eligibleGuarantorDrivers,
} from "../domain"
import type { Violation, ViolationType, UserRole, Trip, Guarantor, Driver } from "../data"
import { nextId } from "../domain"
import { dateKey, formatDateForReport, isDateInRange, shiftDateKey, todayKey } from "../reportUtils"

let amiriFontBase64Promise: Promise<string> | null = null

const loadAmiriFontBase64 = async () => {
  if (!amiriFontBase64Promise) {
    amiriFontBase64Promise = fetch(amiriFontUrl).then(async (response) => {
      if (!response.ok) throw new Error("تعذر تحميل الخط العربي")
      const bytes = new Uint8Array(await response.arrayBuffer())
      let binary = ""
      const chunkSize = 0x8000
      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
      }
      return btoa(binary)
    })
  }
  return amiriFontBase64Promise
}

// ══════════════════════════════════════════════════════════
//  VIOLATIONS SCREEN
// ══════════════════════════════════════════════════════════
type ViolationStatusFilter = "all" | "open" | "raised"
type ViolationTypeFilter = "all" | ViolationType

function formatViolationDate(value?: string) {
  if (!value) return "—"
  const [date] = value.split("T")
  const [year, month, day] = date.split("-")
  return year && month && day ? `${day}/${month}/${year}` : value
}

function cloneDrivers(drivers: Driver[]) {
  return drivers.map((driver) => ({
    ...driver,
    guarantors: driver.guarantors.map((guarantor) => ({ ...guarantor })),
  }))
}

export function ViolationsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [statusFilter, setStatusFilter] = useState<ViolationStatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<ViolationTypeFilter>("all")
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [driverSearch, setDriverSearch] = useState("")
  const [addType, setAddType] = useState<ViolationType>("ت")
  const [addDate, setAddDate] = useState(() => todayKey())
  const [raiseDialog, setRaiseDialog] = useState<Violation | null>(null)
  const [raiseReason, setRaiseReason] = useState("")
  const [editDialog, setEditDialog] = useState<Violation | null>(null)
  const [editType, setEditType] = useState<ViolationType>("ت")
  const [deleteDialog, setDeleteDialog] = useState<Violation | null>(null)
  const [details, setDetails] = useState<Violation | null>(null)

  const driverById = useMemo(
    () => new Map(state.drivers.map((driver) => [driver.id, driver])),
    [state.drivers],
  )
  const eligibleDrivers = useMemo(
    () =>
      state.drivers.filter(
        (driver) =>
          (driver.status === "نشط" || driver.status === "غير_نشط") &&
          !driver.violation &&
          !state.violations.some(
            (violation) => violation.driverId === driver.id && !violation.raised,
          ),
      ),
    [state.drivers, state.violations],
  )
  const selectedDriver = selectedDriverId
    ? driverById.get(selectedDriverId)
    : undefined

  const driverLabel = (driver: Driver) =>
    `${driver.ownerName} · ${driver.plate} · ${driver.status === "نشط" ? "نشط" : "غير نشط"}`

  const filtered = useMemo(
    () =>
      state.violations.filter((violation) => {
        const driver = driverById.get(violation.driverId)
        const plate = driver?.plate ?? ""
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "open" && !violation.raised) ||
          (statusFilter === "raised" && violation.raised)
        const matchesType =
          typeFilter === "all" || violation.type === typeFilter
        const matchesSearch = matchesNameOrPlate(
          search,
          violation.driverName,
          plate,
        )
        return matchesStatus && matchesType && matchesSearch
      }),
    [driverById, search, state.violations, statusFilter, typeFilter],
  )

  const openAdd = () => {
    setSelectedDriverId(null)
    setDriverSearch("")
    setAddType("ت")
    setAddDate(todayKey())
    setShowAdd(true)
  }

  const closeAdd = () => {
    setShowAdd(false)
    setSelectedDriverId(null)
    setDriverSearch("")
  }

  const handleAdd = () => {
    if (!selectedDriver) {
      showSnackbar("اختر السائق أو المالك أولًا ⚠️")
      return
    }
    if (!addDate) {
      showSnackbar("حدد تاريخ المخالفة أولًا ⚠️")
      return
    }
    const driverId = selectedDriver.id
    dispatch({
      type: "ADD_VIOLATION",
      driverId,
      vType: addType,
      date: addDate,
      recordedBy: state.user?.name,
    })
    showSnackbar("تم تسجيل المخالفة بنجاح — تراجع", () =>
      dispatch({ type: "UNDO_VIOLATION_BY_DRIVER", driverId }),
    )
    closeAdd()
  }

  const handleRaise = () => {
    if (!raiseDialog) return
    const reason = raiseReason.trim()
    if (!reason) {
      showSnackbar("سبب رفع المخالفة مطلوب ⚠️")
      return
    }
    const violationId = raiseDialog.id
    dispatch({ type: "RAISE_VIOLATION", violationId, reason })
    showSnackbar("تم رفع المخالفة — تراجع", () =>
      dispatch({ type: "UNDO_RAISE_VIOLATION", violationId }),
    )
    setRaiseDialog(null)
    setRaiseReason("")
  }

  const handleEdit = () => {
    if (!editDialog || editDialog.raised) return
    const previousType = editDialog.type
    const violationId = editDialog.id
    dispatch({ type: "EDIT_VIOLATION", violationId, vType: editType })
    showSnackbar("تم تعديل المخالفة بنجاح — تراجع", () =>
      dispatch({
        type: "UNDO_EDIT_VIOLATION",
        violationId,
        previousType,
      }),
    )
    setEditDialog(null)
  }

  const handleDelete = () => {
    if (!deleteDialog) return
    const violation = deleteDialog
    const previousDrivers = cloneDrivers(state.drivers)
    dispatch({ type: "DELETE_VIOLATION", violationId: violation.id })
    showSnackbar("تم حذف المخالفة — تراجع", () =>
      dispatch({
        type: "RESTORE_VIOLATION",
        violation,
        drivers: previousDrivers,
      }),
    )
    setDeleteDialog(null)
    setDetails(null)
  }

  const openEdit = (violation: Violation) => {
    setEditType(violation.type)
    setEditDialog(violation)
  }

  const statusLabel = (violation: Violation) =>
    violation.raised ? "مرفوعة" : "غير مرفوعة"

  const openCount = state.violations.filter((violation) => !violation.raised).length
  const raisedCount = state.violations.filter((violation) => violation.raised).length

  const modal = (
    title: string,
    content: ReactNode,
    onClose: () => void,
  ) => (
    <div className="violation-modal-layer" role="presentation">
      <button
        type="button"
        className="violation-modal-backdrop"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="violation-modal" role="dialog" aria-modal="true" aria-label={title}>
        {content}
      </div>
    </div>
  )

  return (
    <div className="violations-screen" style={{ background: th.bg }}>
      <StandardAppBar
        title="إدارة المخالفات"
        back="home"
        extraLeft={
          <button type="button" className="violation-add-button" onClick={openAdd}>
            <MonochromeIcon name="plus" size={15} /> إضافة مخالفة
          </button>
        }
      />

      <div className="violations-toolbar" style={{ background: th.card, borderColor: th.border }}>
        <div className="violations-summary">
          <div><strong>{state.violations.length}</strong><span>إجمالي المخالفات</span></div>
          <div><strong>{openCount}</strong><span>غير مرفوعة</span></div>
          <div><strong>{raisedCount}</strong><span>مرفوعة</span></div>
        </div>
        <div className="violations-search">
          <MonochromeIcon name="search" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث باسم السائق أو رقم اللوحة..."
            aria-label="بحث المخالفات"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="مسح البحث">
              <MonochromeIcon name="close" size={14} />
            </button>
          )}
        </div>
        <div className="violations-filters">
          <label>
            <span>الحالة</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ViolationStatusFilter)}>
              <option value="all">كل الحالات</option>
              <option value="open">غير مرفوعة</option>
              <option value="raised">مرفوعة</option>
            </select>
          </label>
          <label>
            <span>النوع</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ViolationTypeFilter)}>
              <option value="all">كل الأنواع</option>
              <option value="ت">ت — تحضير</option>
              <option value="ح">ح — حمول</option>
            </select>
          </label>
        </div>
      </div>

      <div className="violations-tabs" style={{ background: th.card, borderColor: th.border }}>
        {[
          ["all", "الكل", state.violations.length],
          ["open", "غير مرفوعة", openCount],
          ["raised", "مرفوعة", raisedCount],
        ].map(([key, label, count]) => (
          <button
            type="button"
            key={key}
            onClick={() => setStatusFilter(key as ViolationStatusFilter)}
            className={statusFilter === key ? "active" : ""}
          >
            <span>{label}</span><b>{count}</b>
          </button>
        ))}
      </div>

      <div className="violations-list">
        {filtered.length === 0 ? (
          <EmptyState
            icon="inbox"
            text={
              state.violations.length === 0
                ? "لا توجد مخالفات"
                : statusFilter === "open" && openCount === 0
                  ? "لا توجد مخالفات غير مرفوعة"
                  : statusFilter === "raised" && raisedCount === 0
                    ? "لا توجد مخالفات مرفوعة"
                    : "لا توجد مخالفات مطابقة للبحث والفلاتر"
            }
          />
        ) : (
          filtered.map((violation) => {
            const driver = driverById.get(violation.driverId)
            const isRaised = violation.raised
            return (
              <article
                key={violation.id}
                className="violation-card"
                style={{ background: th.card, borderColor: th.border }}
                role="button"
                tabIndex={0}
                onClick={() => setDetails(violation)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setDetails(violation)
                }}
              >
                <div className="violation-card-main">
                  <div className={`violation-mark ${isRaised ? "raised" : "open"}`}>
                    <MonochromeIcon name={isRaised ? "check" : "warning"} size={19} />
                  </div>
                  <div className="violation-card-content">
                    <div className="violation-card-heading">
                      <div>
                        <button
                          type="button"
                          className="violation-driver-name"
                          onClick={(event) => {
                            event.stopPropagation()
                            setDetails(violation)
                          }}
                        >
                          {violation.driverName}
                        </button>
                        <p>{driver?.plate ?? "اللوحة غير متاحة"}</p>
                      </div>
                      <div className="violation-card-badges">
                        <span className={`violation-type-badge type-${violation.type}`}>{violation.type}</span>
                        <span className={`violation-status-badge ${isRaised ? "raised" : "open"}`}>
                          {statusLabel(violation)}
                        </span>
                      </div>
                    </div>
                    <div className="violation-meta-grid">
                      <span><MonochromeIcon name="calendar" size={13} /> {formatViolationDate(violation.date)}</span>
                      <span><MonochromeIcon name="user" size={13} /> {violation.recordedBy ?? "غير مسجل"}</span>
                      {isRaised && <span><MonochromeIcon name="upload" size={13} /> رفع: {formatViolationDate(violation.raisedDate)}</span>}
                    </div>
                    <p className="violation-note">{violation.note}</p>
                    {isRaised && violation.raiseReason && (
                      <div className="violation-raise-reason">سبب الرفع: {violation.raiseReason}</div>
                    )}
                  </div>
                </div>
                <div className="violation-card-actions">
                  {!isRaised && (
                    <button
                      type="button"
                      className="violation-action raise"
                      onClick={(event) => {
                        event.stopPropagation()
                        setRaiseDialog(violation)
                        setRaiseReason("")
                      }}
                    >
                      <MonochromeIcon name="upload" size={14} /> رفع
                    </button>
                  )}
                  <button
                    type="button"
                    className="violation-action"
                    onClick={(event) => {
                      event.stopPropagation()
                      openEdit(violation)
                    }}
                  >
                    <MonochromeIcon name="edit" size={14} /> تعديل
                  </button>
                  <button
                    type="button"
                    className="violation-action danger"
                    onClick={(event) => {
                      event.stopPropagation()
                      setDeleteDialog(violation)
                    }}
                  >
                    <MonochromeIcon name="trash" size={14} /> حذف
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>

      {showAdd && modal(
        "إضافة مخالفة",
        <>
          <div className="violation-modal-header">
            <div><span className="modal-eyebrow">سجل جديد</span><h2>إضافة مخالفة</h2></div>
            <button type="button" onClick={closeAdd} aria-label="إغلاق"><MonochromeIcon name="close" size={18} /></button>
          </div>
          <div className="violation-form">
            <SearchableRosterField
              label="السائق / المالك"
              query={driverSearch}
              onQueryChange={(query) => {
                setDriverSearch(query)
                setSelectedDriverId(null)
              }}
              selectedLabel={selectedDriver ? driverLabel(selectedDriver) : undefined}
              items={eligibleDrivers}
              getKey={(driver) => driver.id}
              formatLabel={(driver) => driver.ownerName}
              formatSubLabel={(driver) => `${driver.plate} · ${driver.status === "نشط" ? "نشط" : "غير نشط"}`}
              filterItem={(driver, query) => matchesNameOrPlate(query, driver.ownerName, driver.plate)}
              onPick={(driver) => {
                setSelectedDriverId(driver.id)
                setDriverSearch(driverLabel(driver))
              }}
              placeholder="ابحث بالاسم أو رقم اللوحة..."
              emptyHint="لا يوجد سائق صالح للاختيار"
            />
            <div className="violation-form-grid">
              <label>
                <span>نوع المخالفة</span>
                <select value={addType} onChange={(event) => setAddType(event.target.value as ViolationType)}>
                  <option value="ت">ت — مخالفة تحضير</option>
                  <option value="ح">ح — مخالفة حمول</option>
                </select>
              </label>
              <label>
                <span>تاريخ المخالفة</span>
                <input type="date" value={addDate} onChange={(event) => setAddDate(event.target.value)} />
              </label>
            </div>
          </div>
          <div className="violation-modal-actions">
            <button type="button" className="secondary" onClick={closeAdd}>إلغاء</button>
            <button type="button" className="primary" onClick={handleAdd}>حفظ المخالفة</button>
          </div>
        </>,
        closeAdd,
      )}

      {raiseDialog && modal(
        "رفع المخالفة",
        <>
          <div className="violation-modal-header">
            <div><span className="modal-eyebrow">تحديث الحالة</span><h2>رفع المخالفة</h2></div>
            <button type="button" onClick={() => setRaiseDialog(null)} aria-label="إغلاق"><MonochromeIcon name="close" size={18} /></button>
          </div>
          <p className="modal-description">سيصبح السائق غير نشط وقابلًا للإضافة، ولن يعود تلقائيًا إلى الكشف النشط.</p>
          <div className="modal-driver-highlight"><strong>{raiseDialog.driverName}</strong><span>مخالفة {raiseDialog.type}</span></div>
          <label className="modal-field">
            <span>سبب رفع المخالفة <b>*</b></span>
            <textarea value={raiseReason} onChange={(event) => setRaiseReason(event.target.value)} placeholder="اكتب سبب الرفع..." autoFocus />
          </label>
          <div className="violation-modal-actions">
            <button type="button" className="secondary" onClick={() => setRaiseDialog(null)}>إلغاء</button>
            <button type="button" className="success" onClick={handleRaise}>تأكيد الرفع</button>
          </div>
        </>,
        () => setRaiseDialog(null),
      )}

      {editDialog && modal(
        "تعديل المخالفة",
        <>
          <div className="violation-modal-header">
            <div><span className="modal-eyebrow">تعديل مسموح</span><h2>تعديل نوع المخالفة</h2></div>
            <button type="button" onClick={() => setEditDialog(null)} aria-label="إغلاق"><MonochromeIcon name="close" size={18} /></button>
          </div>
          <p className="modal-description">{editDialog.driverName} · يمكن تعديل النوع فقط طالما أن المخالفة غير مرفوعة.</p>
          <div className="violation-type-selector">
            {(["ت", "ح"] as ViolationType[]).map((type) => (
              <button type="button" key={type} className={editType === type ? "selected" : ""} onClick={() => setEditType(type)}>
                <strong>{type}</strong><span>{type === "ت" ? "تحضير" : "حمول"}</span>
              </button>
            ))}
          </div>
          <div className="violation-modal-actions">
            <button type="button" className="secondary" onClick={() => setEditDialog(null)}>إلغاء</button>
            <button type="button" className="primary" onClick={handleEdit}>حفظ التعديل</button>
          </div>
        </>,
        () => setEditDialog(null),
      )}

      {deleteDialog && modal(
        "تأكيد حذف المخالفة",
        <>
          <div className="violation-modal-header">
            <div><span className="modal-eyebrow danger-text">إجراء نهائي</span><h2>حذف المخالفة؟</h2></div>
            <button type="button" onClick={() => setDeleteDialog(null)} aria-label="إغلاق"><MonochromeIcon name="close" size={18} /></button>
          </div>
          <p className="modal-description">سيتم حذف سجل المخالفة وإعادة السائق إلى حالته الأصلية قبل تسجيلها، بما في ذلك التسلسل والضمانات المحفوظة.</p>
          <div className="modal-driver-highlight danger-highlight"><strong>{deleteDialog.driverName}</strong><span>مخالفة {deleteDialog.type}</span></div>
          <div className="violation-modal-actions">
            <button type="button" className="secondary" onClick={() => setDeleteDialog(null)}>إلغاء</button>
            <button type="button" className="danger-button" onClick={handleDelete}>حذف المخالفة</button>
          </div>
        </>,
        () => setDeleteDialog(null),
      )}

      {details && (() => {
        const driver = driverById.get(details.driverId)
        const activeGuarantees = driver?.guarantors.filter((g) => g.status === "فعال" && !g.suspended).length ?? 0
        const totalGuarantees = driver?.guarantors.length ?? 0
        const suspendedGuarantees = driver?.guarantors.filter((g) => g.suspended).length ?? 0
        const timeline = [
          { label: "تسجيل المخالفة", show: true },
          { label: "تغيير حالة السائق إلى غير نشط", show: Boolean(details.undoSnapshot) },
          { label: "تعليق الضمانات", show: Boolean(details.guaranteesSuspended) },
          { label: "رفع المخالفة", show: details.raised },
          { label: "إزالة المخالفة عن السائق", show: details.raised },
          { label: "إعادة تفعيل الضمانات", show: details.raised && Boolean(details.guaranteesSuspended) },
        ].filter((event) => event.show)
        return modal(
          "تفاصيل المخالفة",
          <>
            <div className="violation-modal-header">
              <div><span className="modal-eyebrow">سجل المخالفة #{details.id}</span><h2>تفاصيل المخالفة</h2></div>
              <button type="button" onClick={() => setDetails(null)} aria-label="إغلاق"><MonochromeIcon name="close" size={18} /></button>
            </div>
            <div className="details-identity">
              <div className="details-avatar"><MonochromeIcon name="user" size={22} /></div>
              <div><strong>{details.driverName}</strong><span>{driver?.plate ?? "اللوحة غير متاحة"}</span></div>
              <span className={`violation-status-badge ${details.raised ? "raised" : "open"}`}>{statusLabel(details)}</span>
            </div>
            <div className="details-section">
              <h3>بيانات المخالفة</h3>
              <div className="details-grid">
                <span>النوع <b>{details.type === "ت" ? "ت — تحضير" : "ح — حمول"}</b></span>
                <span>التاريخ <b>{formatViolationDate(details.date)}</b></span>
                <span>المسجل <b>{details.recordedBy ?? "غير مسجل"}</b></span>
                {details.raised && <span>تاريخ الرفع <b>{formatViolationDate(details.raisedDate)}</b></span>}
              </div>
              <p className="details-note">{details.note}</p>
              {details.raiseReason && <p className="details-note">سبب الرفع: {details.raiseReason}</p>}
            </div>
            <div className="details-section">
              <h3>حالة السائق والضمانات</h3>
              <div className="details-grid">
                <span>الحالة الحالية <b>{driver?.status === "نشط" ? "نشط" : driver?.statusReason === "قابل_للإضافة" ? "غير نشط · قابل للإضافة" : "غير نشط"}</b></span>
                <span>الضمانات الفعالة <b>{activeGuarantees} من {totalGuarantees}</b></span>
                <span>المعلقة الآن <b>{suspendedGuarantees}</b></span>
                <span>تأثرت بالمخالفة <b>{details.guaranteesSuspended ? "نعم" : "لا"}</b></span>
              </div>
            </div>
            <div className="details-section">
              <h3>سجل العمليات</h3>
              <ol className="violation-timeline">
                {timeline.map((event, index) => <li key={event.label}><i>{index + 1}</i><span>{event.label}</span></li>)}
              </ol>
            </div>
            <div className="violation-modal-actions">
              {!details.raised && <button type="button" className="success" onClick={() => { setDetails(null); setRaiseDialog(details); setRaiseReason("") }}>رفع المخالفة</button>}
              <button type="button" className="secondary" onClick={() => { setDetails(null); openEdit(details) }}>تعديل</button>
              <button type="button" className="danger-button" onClick={() => { setDetails(null); setDeleteDialog(details) }}>حذف</button>
            </div>
          </>,
          () => setDetails(null),
        )
      })()}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  DRIVER MANAGEMENT SCREEN (Task 73-75)
// ══════════════════════════════════════════════════════════
export function DriverManagementScreen() {
  const { state, dispatch, showSnackbar, navigate } = useApp()
  const th = useTheme()
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all")
  const [search, setSearch] = useState("")

  const filtered = state.drivers.filter((d) => {
    const matchFilter = filter === "all" || (filter === "active" ? d.status === "نشط" : d.status === "غير_نشط")
    const matchSearch = !search || d.ownerName.includes(search) || d.plate.includes(search)
    return matchFilter && matchSearch
  })

  const canDelete = (driver: Driver) => {
    // Task 74: Cannot delete if has active trips/violations/guarantees
    const hasTrips = state.trips.some((t) => t.driverId === driver.id && (t.status === "مؤكدة_مبدئياً" || t.status === "معلقة"))
    const hasViolations = state.violations.some((v) => v.driverId === driver.id && !v.raised)
    const hasGuarantees = driver.guarantors.some((g) => g.status === "فعال")
    return !hasTrips && !hasViolations && !hasGuarantees
  }

  const handleDelete = (driverId: number, name: string) => {
    if (!canDelete(state.drivers.find((d) => d.id === driverId)!)) {
      showSnackbar("لا يمكن حذف السائق — لديه نهمات أو مخالفات أو ضمانات نشطة ⚠️")
      return
    }
    if (!window.confirm(`⚠️ هل أنت متأكد من حذف ${name}؟\nسيتم حذف السائق من الكشف، ولا يجب تنفيذ هذه العملية إلا إذا كنت متأكداً.`)) return
    dispatch({ type: "DELETE_DRIVER", driverId })
    showSnackbar(`تم حذف ${name} ✅`)
  }

  const handleDisable = (driverId: number, name: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في تعطيل هذا السائق؟")) return
    dispatch({ type: "DISABLE_DRIVER", driverId })
    showSnackbar(`تم تعطيل ${name} مع الاحتفاظ ببياناته ✅`)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden" }}>
      <StandardAppBar title="إدارة السائقين" back="home" />

      <div style={{ padding: "12px 16px", background: th.card, borderBottom: `1px solid ${th.border}`, display: "flex", gap: 8 }}>
        {[
          ["all", "الكل"],
          ["active", "النشطين"],
          ["inactive", "غير النشطين"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k as typeof filter)}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 10,
              border: "none",
              background: filter === k ? T.primary : th.dark ? "#1E2D40" : "#F1F5F9",
              color: filter === k ? "#fff" : th.sub,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 16px", background: th.card, borderBottom: `1px solid ${th.border}` }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex" }}><MonochromeIcon name="search" size={16} /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو اللوحة..."
            style={{
              width: "100%",
              padding: "10px 40px 10px 12px",
              borderRadius: 10,
              border: `1px solid ${th.border}`,
              background: th.inputBg,
              color: th.text,
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              direction: "rtl",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 14, color: th.sub }}>لا يوجد سائقين مطابقين</p>
          </div>
        ) : (
          filtered.map((driver) => (
            <div
              key={driver.id}
              style={{
                margin: "10px 16px",
                border: `1px solid ${th.border}`,
                borderRadius: 14,
                padding: "14px",
                background: th.card,
                boxShadow: "0 4px 14px rgba(15,23,42,.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: driver.status === "نشط" ? "#D1FAE5" : "#FEE2E2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <MonochromeIcon name={driver.status === "نشط" ? "check" : "close"} size={17} />
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate("driver-profile", { driverId: driver.id })}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text }}>{driver.ownerName}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: th.sub }}>
                  {driver.plate} · نوع البابور: {driver.type} · {driver.status === "نشط" ? "نشط" : "غير نشط"}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: th.muted }}>الهاتف: {driver.phone || "غير مسجل"}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => navigate("driver-profile", { driverId: driver.id })} style={{ flex: 1, padding: "8px 6px", borderRadius: 9, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>تعديل</button>
              <button type="button" onClick={() => handleDisable(driver.id, driver.ownerName)} disabled={driver.status !== "نشط"} style={{ flex: 1, padding: "8px 6px", borderRadius: 9, border: "none", background: driver.status === "نشط" ? "#FEF3C7" : th.inputBg, color: driver.status === "نشط" ? T.warning : th.muted, fontSize: 11, fontWeight: 700, cursor: driver.status === "نشط" ? "pointer" : "not-allowed", fontFamily: "inherit" }}>تعطيل</button>
              <button type="button" onClick={() => handleDelete(driver.id, driver.ownerName)} disabled={!canDelete(driver)} style={{ flex: 1, padding: "8px 6px", borderRadius: 9, border: "none", background: canDelete(driver) ? "#FEE2E2" : th.inputBg, color: canDelete(driver) ? T.danger : th.muted, fontSize: 11, fontWeight: 700, cursor: canDelete(driver) ? "pointer" : "not-allowed", fontFamily: "inherit" }}>حذف</button>
            </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
//  GUARANTEES SCREEN
// ══════════════════════════════════════════════════════════

type GuarantorGroup = {
  nationalId: string
  name: string
  phone: string
  sourceDriverId?: number
  entries: { driverId: number; driverName: string; plate: string; guarantorId: number }[]
}

function buildGuarantorGroups(drivers: Driver[]): GuarantorGroup[] {
  const map = new Map<string, GuarantorGroup>()
  for (const d of drivers) {
    for (const g of d.guarantors) {
      if (g.status !== "فعال" || g.suspended) continue
      let group = map.get(g.nationalId)
      if (!group) {
        group = {
          nationalId: g.nationalId,
          name: g.name,
          phone: g.phone,
          sourceDriverId: g.sourceDriverId,
          entries: [],
        }
        map.set(g.nationalId, group)
      }
      group.entries.push({
        driverId: d.id,
        driverName: d.ownerName,
        plate: d.plate,
        guarantorId: g.id,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"))
}

function ActionIconBtn({
  icon,
  title,
  color,
  bg,
  onClick,
}: {
  icon: string
  title: string
  color: string
  bg: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        border: "none",
        background: bg,
        color,
        fontSize: 15,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  )
}

export function GuaranteesScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [tab, setTab] = useState<"guaranteed" | "guarantors">("guaranteed")
  const [guaranteeFilter, setGuaranteeFilter] = useState<"all" | "complete" | "incomplete">("all")
  const [guaranteeSearch, setGuaranteeSearch] = useState("")
  const [editDriverId, setEditDriverId] = useState<number | null>(null)
  const [editGuarantors, setEditGuarantors] = useState<Guarantor[]>([])
  const [addGuarantorSearch, setAddGuarantorSearch] = useState("")
  const [editGuarantorGroup, setEditGuarantorGroup] = useState<GuarantorGroup | null>(null)
  const [editGuaranteedIds, setEditGuaranteedIds] = useState<number[]>([])
  const [addGuaranteedSearch, setAddGuaranteedSearch] = useState("")

  const guarantorCandidates = useMemo(
    () => eligibleGuarantorDrivers(state.drivers).filter(canBeGuarantor),
    [state.drivers],
  )

  const driversWithGuarantors = state.drivers.filter((d) => {
    const activeGuarantors = d.guarantors.filter((g) => g.status === "فعال" && !g.suspended)
    const q = guaranteeSearch.trim().toLocaleLowerCase("ar")
    const matchesSearch = !q || `${d.ownerName} ${d.plate} ${activeGuarantors.map((g) => g.name).join(" ")}`.toLocaleLowerCase("ar").includes(q)
    if (!matchesSearch) return false
    if (activeGuarantors.length === 0 && guaranteeFilter !== "all") return false
    const count = countActiveGuarantors(d)
    if (guaranteeFilter === "complete") return count >= state.minGuarantors
    if (guaranteeFilter === "incomplete") return count < state.minGuarantors && activeGuarantors.length > 0
    return activeGuarantors.length > 0 || guaranteeFilter === "all"
  })

  const guarantorGroups = useMemo(() => buildGuarantorGroups(state.drivers).filter((group) => {
    const q = guaranteeSearch.trim().toLocaleLowerCase("ar")
    return !q || `${group.name} ${group.phone} ${group.entries.map((entry) => entry.driverName).join(" ")}`.toLocaleLowerCase("ar").includes(q)
  }), [state.drivers, guaranteeSearch])

  const editDriver = editDriverId !== null ? state.drivers.find((d) => d.id === editDriverId) : undefined

  const openGuaranteedEdit = (driverId: number) => {
    const driver = state.drivers.find((d) => d.id === driverId)
    if (!driver) return
    setEditDriverId(driverId)
    setEditGuarantors(
      driver.guarantors.filter((g) => g.status === "فعال" && !g.suspended).map((g) => ({ ...g })),
    )
    setAddGuarantorSearch("")
  }

  const saveGuaranteedEdit = () => {
    if (editDriverId === null || !editDriver) return
    const activeIds = new Set(editGuarantors.map((g) => g.id))
    const historical = editDriver.guarantors.filter((g) => g.status === "منتهي")
    const newlyEnded = editDriver.guarantors
      .filter((g) => g.status === "فعال" && !activeIds.has(g.id))
      .map((g) => ({ ...g, status: "منتهي" as const, suspended: false }))
    dispatch({
      type: "UPDATE_GUARANTORS",
      driverId: editDriverId,
      guarantors: [...historical, ...newlyEnded, ...editGuarantors],
    })
    showSnackbar(`تم حفظ ضامنين ${editDriver.ownerName} ✅`)
    setEditDriverId(null)
  }

  const deleteGuaranteesForDriver = (driverId: number, name: string) => {
    if (!window.confirm(`حذف جميع ضمانات ${name}؟`)) return
    const driver = state.drivers.find((d) => d.id === driverId)
    if (!driver) return
    const ended = driver.guarantors
      .filter((g) => g.status === "فعال")
      .map((g) => ({ ...g, status: "منتهي" as const, suspended: false }))
    const historical = driver.guarantors.filter((g) => g.status === "منتهي")
    dispatch({ type: "UPDATE_GUARANTORS", driverId, guarantors: [...historical, ...ended] })
    showSnackbar(`تم حذف جميع ضمانات ${name}`)
  }

  const addGuarantorToEdit = (source: Driver) => {
    if (!canBeGuarantor(source)) {
      showSnackbar("لا يمكن للمخالف أن يكون ضامناً ⚠️")
      return
    }
    if (source.id === editDriverId) {
      showSnackbar("لا يمكن للمالك أن يضمن نفسه ⚠️")
      return
    }
    if (editGuarantors.some((g) => g.sourceDriverId === source.id || g.name === source.ownerName)) {
      showSnackbar("الضامن مضاف مسبقاً")
      return
    }
    setEditGuarantors((p) => [...p, guarantorFromRosterDriver(source, nextId())])
    setAddGuarantorSearch("")
    showSnackbar(`تمت إضافة ${source.ownerName} كضامن`)
  }

  const openGuarantorEdit = (group: GuarantorGroup) => {
    setEditGuarantorGroup(group)
    setEditGuaranteedIds(group.entries.map((e) => e.driverId))
    setAddGuaranteedSearch("")
  }

  const saveGuarantorEdit = () => {
    if (!editGuarantorGroup) return
    const template = {
      name: editGuarantorGroup.name,
      phone: editGuarantorGroup.phone,
      nationalId: editGuarantorGroup.nationalId,
      sourceDriverId: editGuarantorGroup.sourceDriverId,
    }
    if (editGuaranteedIds.length > 0 && !canPersonGuarantee(state.drivers, template)) {
      showSnackbar("لا يمكن للمخالف ضمان الآخرين ⚠️")
      return
    }
    dispatch({
      type: "SET_GUARANTOR_TARGETS",
      template,
      targetDriverIds: editGuaranteedIds,
    })
    showSnackbar(`تم حفظ مضمونين ${editGuarantorGroup.name} ✅`)
    setEditGuarantorGroup(null)
  }

  const cancelAllForGuarantor = (nationalId: string, name: string) => {
    if (!window.confirm(`إلغاء ضمان ${name} لجميع المالكين المضمونين؟`)) return
    dispatch({ type: "CANCEL_GUARANTOR", guarantorNationalId: nationalId })
    showSnackbar(`تم إلغاء جميع ضمانات ${name} لكل المالكين`)
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: th.bg, overflow: "hidden", position: "relative" }}>
      <StandardAppBar title="الضمانات" back="home" />

      <div
        style={{
          background: th.card,
          borderBottom: `1px solid ${th.border}`,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: th.text, display: "flex", alignItems: "center", gap: 6 }}><MonochromeIcon name="target" size={16} /> الحد الأدنى للضامنين</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_MIN_GUARANTORS", min: Math.max(0, state.minGuarantors - 1) })}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: `1px solid ${th.border}`,
              background: "none",
              color: th.text,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            −
          </button>
          <span style={{ fontSize: 18, fontWeight: 800, color: T.primary, minWidth: 24, textAlign: "center" }}>
            {state.minGuarantors}
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: "SET_MIN_GUARANTORS", min: state.minGuarantors + 1 })}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: `1px solid ${th.border}`,
              background: "none",
              color: th.text,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            +
          </button>
        </div>
      </div>

      <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, display: "flex" }}>
        {[
          ["guaranteed", "المضمونون", "bank"],
          ["guarantors", "الضامنون", "users"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k as typeof tab)}
            style={{
              flex: 1,
              padding: "12px",
              border: "none",
              background: "none",
              color: tab === k ? T.primary : th.sub,
              borderBottom: `2px solid ${tab === k ? T.primary : "transparent"}`,
              fontSize: 13,
              fontWeight: tab === k ? 700 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div style={{ padding: "10px 16px", background: th.bg }}>
        <input value={guaranteeSearch} onChange={(e) => setGuaranteeSearch(e.target.value)} placeholder="بحث باسم المالك أو الضامن أو اللوحة..." aria-label="بحث الضمانات" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, direction: "rtl", fontFamily: "inherit" }} />
      </div>

      {tab === "guaranteed" && (
        <div style={{ background: th.card, borderBottom: `1px solid ${th.border}`, padding: "8px 16px", display: "flex", gap: 8, overflowX: "auto" }}>
          {[
            ["all", "الكل"],
            ["complete", "مكتمل"],
            ["incomplete", "ناقص"],
          ].map(([k, l, icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setGuaranteeFilter(k as typeof guaranteeFilter)}
              style={{
                padding: "5px 14px",
                borderRadius: 99,
                border: "none",
                background: guaranteeFilter === k ? T.primary : th.inputBg,
                color: guaranteeFilter === k ? "#fff" : th.sub,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
            <MonochromeIcon name={icon} size={15} /> {l}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {tab === "guaranteed" ? (
          driversWithGuarantors.length === 0 ? (
            <EmptyState icon="bank" text="لا يوجد مضمونون في هذا التصنيف" />
          ) : (
            driversWithGuarantors.map((driver) => {
              const active = countActiveGuarantors(driver)
              const activeGuarantors = driver.guarantors.filter((g) => g.status === "فعال" && !g.suspended)
              return (
                <Card key={driver.id}>
                  <article style={{ padding: "14px 16px", minWidth: 0, width: "100%" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, minWidth: 0, marginBottom: 12 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text, overflowWrap: "anywhere" }}>{driver.ownerName}</p>
                        <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: th.sub, overflowWrap: "anywhere" }}><MonochromeIcon name="car" size={13} /> {driver.plate}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: active >= state.minGuarantors ? T.success : T.danger, overflowWrap: "anywhere" }}>
                            {active >= state.minGuarantors ? "ضمانات مكتملة" : "ضمانات ناقصة"}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          flexShrink: 0,
                          minWidth: 42,
                          minHeight: 32,
                          padding: "5px 7px",
                          borderRadius: 8,
                          background: active >= state.minGuarantors ? "#D1FAE5" : "#FEE2E2",
                          color: active >= state.minGuarantors ? "#065F46" : "#991B1B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {active}/{state.minGuarantors}
                      </div>
                    </div>
                    <div style={{ background: th.dark ? "#1E2D40" : "#F8FAFC", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5, marginBottom: 12, color: th.sub }}>
                      <span style={{ fontSize: 11, overflowWrap: "anywhere" }}><MonochromeIcon name="users" size={13} /> الضامنون ({activeGuarantors.length})</span>
                      {activeGuarantors.length === 0 ? (
                        <span style={{ fontSize: 11, overflowWrap: "anywhere" }}>لا يوجد ضامنون نشطون</span>
                      ) : (
                        activeGuarantors.map((g) => (
                          <span key={g.id} style={{ fontSize: 11, lineHeight: 1.5, overflowWrap: "anywhere" }}>
                            • {g.name}
                          </span>
                        ))
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => openGuaranteedEdit(driver.id)}
                        style={{
                          width: "100%",
                          minWidth: 0,
                           minHeight: 42,
                           padding: "9px 8px",
                          border: `1px solid ${th.border}`,
                          borderRadius: 9,
                          background: th.inputBg,
                          color: th.text,
                          fontSize: 11,
                           lineHeight: 1.4,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                        }}
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteGuaranteesForDriver(driver.id, driver.ownerName)}
                        style={{
                          width: "100%",
                          minWidth: 0,
                           minHeight: 42,
                           padding: "9px 8px",
                          border: "none",
                          borderRadius: 9,
                          background: "#FEE2E2",
                          color: T.danger,
                          fontSize: 11,
                           lineHeight: 1.4,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                        }}
                      >
                        إلغاء الضمانات
                      </button>
                    </div>
                  </article>
                </Card>
              )
            })
          )
        ) : guarantorGroups.length === 0 ? (
          <EmptyState icon="users" text="لا يوجد ضامنون مسجلون" />
        ) : (
          guarantorGroups.map((group) => (
            <Card key={group.nationalId}>
              <article style={{ padding: "14px 16px", minWidth: 0, width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, minWidth: 0, marginBottom: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: th.text, overflowWrap: "anywhere" }}>{group.name}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: th.sub, overflowWrap: "anywhere" }}><MonochromeIcon name="phone" size={13} /> {group.phone || "غير مسجل"}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: T.success, overflowWrap: "anywhere" }}>{group.entries.length} مضمون</span>
                    </div>
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      minWidth: 32,
                      minHeight: 32,
                      padding: "5px 8px",
                      borderRadius: 8,
                      background: "#D1FAE5",
                      color: "#065F46",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {group.entries.length}
                  </div>
                </div>
                <div style={{ background: th.dark ? "#1E2D40" : "#F8FAFC", borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 5, marginBottom: 12, color: th.sub }}>
                  <span style={{ fontSize: 11, overflowWrap: "anywhere" }}><MonochromeIcon name="users" size={13} /> المضمونون</span>
                  {group.entries.map((entry) => (
                    <span
                      key={`${entry.driverId}-${entry.guarantorId}`}
                      style={{ color: th.text, fontSize: 11, lineHeight: 1.5, overflowWrap: "anywhere" }}
                    >
                      • {entry.driverName} · {entry.plate}
                    </span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => openGuarantorEdit(group)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                       minHeight: 42,
                       padding: "9px 8px",
                      border: `1px solid ${th.border}`,
                      borderRadius: 9,
                      background: th.inputBg,
                      color: th.text,
                      fontSize: 11,
                       lineHeight: 1.4,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    }}
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelAllForGuarantor(group.nationalId, group.name)}
                    style={{
                      width: "100%",
                      minWidth: 0,
                       minHeight: 42,
                       padding: "9px 8px",
                      border: "none",
                      borderRadius: 9,
                      background: "#FEE2E2",
                      color: T.danger,
                      fontSize: 11,
                       lineHeight: 1.4,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    }}
                  >
                    إلغاء الضمانات
                  </button>
                </div>
              </article>
            </Card>
          ))
        )}
      </div>

      {editDriverId !== null && editDriver && (
        <div style={{ position: "absolute", inset: 0, zIndex: 150 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setEditDriverId(null)} />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: th.card,
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
              maxHeight: "85%",
              overflowY: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 4px", color: th.text, fontSize: 16 }}>تعديل ضامنين — {editDriver.ownerName}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: th.sub }}>{editDriver.plate}</p>

            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: th.sub }}>الضامنون الحاليون</p>
            {editGuarantors.length === 0 ? (
              <p style={{ margin: "0 0 12px", fontSize: 12, color: th.sub }}>لا يوجد ضامنون — أضف من الكشف</p>
            ) : (
              editGuarantors.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: th.dark ? "#1E2D40" : "#F8FAFC",
                    marginBottom: 8,
                    border: `1px solid ${th.border}`,
                  }}
                >
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: th.text }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: th.sub }}>{g.phone}</span>
                  <button
                    type="button"
                    onClick={() => setEditGuarantors((p) => p.filter((x) => x.id !== g.id))}
                    style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 16 }}
                    title="إلغاء الضامن"
                  >
                    <MonochromeIcon name="close" size={16} />
                  </button>
                </div>
              ))
            )}

            <SearchableRosterField
              label="إضافة ضامن من الكشف"
              query={addGuarantorSearch}
              onQueryChange={setAddGuarantorSearch}
              items={guarantorCandidates.filter(
                (d) =>
                  d.id !== editDriver.id &&
                  !editGuarantors.some((g) => g.sourceDriverId === d.id || g.name === d.ownerName),
              )}
              getKey={(d) => d.id}
              formatLabel={(d) => d.ownerName}
              formatSubLabel={(d) => `${d.plate} · ${d.status === "نشط" ? "نشط" : "غير نشط"}`}
              filterItem={(d, q) => matchesNameOrPlate(q, d.ownerName, d.plate)}
              onAction={addGuarantorToEdit}
              actionLabel="إضافة"
              placeholder="ابحث بالاسم أو اللوحة..."
              emptyHint="لا يوجد ضامن مطابق — المخالفون غير مسموح"
            />

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setEditDriverId(null)}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: 12,
                  border: `1px solid ${th.border}`,
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={saveGuaranteedEdit}
                style={{
                  flex: 2,
                  padding: "13px",
                  borderRadius: 12,
                  border: "none",
                  background: T.primary,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <MonochromeIcon name="check" size={15} /> حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {editGuarantorGroup && (
        <div style={{ position: "absolute", inset: 0, zIndex: 150 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setEditGuarantorGroup(null)} />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: th.card,
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
              maxHeight: "85%",
              overflowY: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 4px", color: th.text, fontSize: 16 }}>تعديل مضمونين — {editGuarantorGroup.name}</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: th.sub }}>{editGuarantorGroup.phone}</p>
            {!canPersonGuarantee(state.drivers, editGuarantorGroup) && (
              <p
                style={{
                  margin: "0 0 12px",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#FEE2E2",
                  color: "#991B1B",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <MonochromeIcon name="warning" size={15} /> هذا الضامن مخالف — يمكنك إلغاء المضمونين فقط، لا إضافة جدد
              </p>
            )}

            <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: th.sub }}>المالكون المضمونون حالياً</p>
            {editGuaranteedIds.length === 0 ? (
              <p style={{ margin: "0 0 12px", fontSize: 12, color: th.sub }}>لا يوجد مضمونون — أضف من الكشف</p>
            ) : (
              editGuaranteedIds.map((driverId) => {
                const d = state.drivers.find((x) => x.id === driverId)
                if (!d) return null
                return (
                  <div
                    key={driverId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: th.dark ? "#1E2D40" : "#F8FAFC",
                      marginBottom: 8,
                      border: `1px solid ${th.border}`,
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: th.text }}>{d.ownerName}</span>
                    <span style={{ fontSize: 11, color: th.sub }}>{d.plate}</span>
                    <button
                      type="button"
                      onClick={() => setEditGuaranteedIds((p) => p.filter((id) => id !== driverId))}
                      style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 16 }}
                      title="إلغاء الضمان"
                    >
                      <MonochromeIcon name="close" size={16} />
                    </button>
                  </div>
                )
              })
            )}

            <SearchableRosterField
              label="إضافة مضمون (مالك) من الكشف"
              query={addGuaranteedSearch}
              onQueryChange={setAddGuaranteedSearch}
              items={state.drivers.filter((d) => !editGuaranteedIds.includes(d.id))}
              getKey={(d) => d.id}
              formatLabel={(d) => d.ownerName}
              formatSubLabel={(d) => `${d.plate} · ${d.status === "نشط" ? "نشط" : "غير نشط"}`}
              filterItem={(d, q) => matchesNameOrPlate(q, d.ownerName, d.plate)}
              onAction={(d) => {
                if (!canPersonGuarantee(state.drivers, editGuarantorGroup)) {
                  showSnackbar("لا يمكن للمخالف ضمان الآخرين ⚠️")
                  return
                }
                if (editGuaranteedIds.includes(d.id)) return
                setEditGuaranteedIds((p) => [...p, d.id])
                setAddGuaranteedSearch("")
                showSnackbar(`تمت إضافة ${d.ownerName} كمضمون`)
              }}
              actionLabel="إضافة"
              placeholder="ابحث بالاسم أو اللوحة..."
            />

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setEditGuarantorGroup(null)}
                style={{
                  flex: 1,
                  padding: "13px",
                  borderRadius: 12,
                  border: `1px solid ${th.border}`,
                  background: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={saveGuarantorEdit}
                style={{
                  flex: 2,
                  padding: "13px",
                  borderRadius: 12,
                  border: "none",
                  background: T.primary,
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <MonochromeIcon name="check" size={15} /> حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { BreakdownsScreen } from "./BreakdownsManagement"

// ══════════════════════════════════════════════════════════
//  REPORTS SCREEN
// ══════════════════════════════════════════════════════════
function EmptyReport({ text, onChangePeriod }: { text: string; onChangePeriod?: () => void }) {
  return (
    <div className="report-empty">
      <p>{text}</p>
      {onChangePeriod && (
        <button type="button" className="report-reset" onClick={onChangePeriod}>تغيير الفترة</button>
      )}
    </div>
  )
}

function ReportSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
  badge,
  action,
  excludeFromPdf,
  forceOpen,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
  action?: React.ReactNode
  excludeFromPdf?: boolean
  forceOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const isOpen = forceOpen ?? open
  return (
    <section className="report-card report-collapsible" {...(excludeFromPdf ? { "data-pdf-exclude": "" } : {})}>
      <button type="button" className="report-collapsible-trigger" onClick={() => setOpen((v) => !v)} aria-expanded={isOpen}>
        <div className="report-card-header report-collapsible-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="report-collapsible-meta">
            {badge}
            {action}
            <span className="report-collapse-icon">{isOpen ? "▾" : "◂"}</span>
          </div>
        </div>
      </button>
      {isOpen && <div className="report-collapsible-body">{children}</div>}
    </section>
  )
}

export function ReportsScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const importInputRef = useRef<HTMLInputElement>(null)
  const reportContentRef = useRef<HTMLDivElement>(null)
  const periodFilterRef = useRef<HTMLElement>(null)
  const th = useTheme()
  const [period, setPeriod] = useState("week")
  const [reportType, setReportType] = useState("النهمات")
  const [query, setQuery] = useState("")
  const [detailFilters, setDetailFilters] = useState<Record<number, string>>({})
  const [detailSortIndex, setDetailSortIndex] = useState(0)
  const [detailSortDirection, setDetailSortDirection] = useState<"asc" | "desc">("asc")
  const [showAllRows, setShowAllRows] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [pdfExportMode, setPdfExportMode] = useState(false)
  const periodLabels: Record<string, string> = {
    day: "اليوم",
    week: "هذا الأسبوع",
    month: "هذا الشهر",
    year: "هذه السنة",
    custom: "فترة مخصصة",
  }
  const pdfGeneratedAt = new Date().toLocaleString("ar-YE", { dateStyle: "medium", timeStyle: "short" })
  const referenceDate = todayKey()
  const [fromDate, setFromDate] = useState(() => {
    return shiftDateKey(referenceDate, -6)
  })
  const [toDate, setToDate] = useState(referenceDate)

  const inRange = (value: string) => isDateInRange(value, fromDate, toDate)
  const rangedTrips = state.trips.filter((trip) => inRange(trip.completedAt ?? trip.createdAt))
  const rangedViolations = state.violations.filter((violation) => inRange(violation.date))
  const rangedBreakdowns = state.breakdowns.filter((breakdown) => inRange(breakdown.date))
  const activeDrivers = state.drivers.filter((driver) => driver.status === "نشط").length
  const inactiveDrivers = state.drivers.filter((driver) => driver.status === "غير_نشط").length
  const completedTrips = rangedTrips.filter((trip) => trip.status === "مكتملة").length
  const cancelledTrips = rangedTrips.filter((trip) => trip.status === "ملغاة").length
  const pendingTrips = rangedTrips.filter((trip) => ["مسودة", "مؤكدة_مبدئياً", "معلقة"].includes(trip.status)).length
  const totalViolations = rangedViolations.length
  const raisedViolations = rangedViolations.filter((violation) => violation.raised).length
  const closeBreakdowns = rangedBreakdowns.filter((breakdown) => breakdown.location === "قريب").length
  const farBreakdowns = rangedBreakdowns.filter((breakdown) => breakdown.location === "بعيد").length
  const finishedBreakdowns = rangedBreakdowns.filter((breakdown) => breakdown.status === "منتهي").length
  const activeGuarantors = state.drivers.reduce((sum, driver) => sum + driver.guarantors.filter((guarantor) => guarantor.status === "فعال" && !guarantor.suspended).length, 0)
  const uniqueGuarantorCount = useMemo(() => {
    const ids = new Set<string>()
    state.drivers.forEach((driver) => {
      driver.guarantors.forEach((guarantor) => {
        if (guarantor.status === "فعال" && !guarantor.suspended) ids.add(guarantor.nationalId)
      })
    })
    return ids.size
  }, [state.drivers])
  const completeGuarantees = state.drivers.filter((driver) => driver.guarantors.filter((guarantor) => guarantor.status === "فعال" && !guarantor.suspended).length >= state.minGuarantors).length
  const driversWithGuarantees = state.drivers.filter((driver) => driver.guarantors.some((guarantor) => guarantor.status === "فعال" && !guarantor.suspended)).length

  const countBy = (values: string[]) => Object.entries(values.reduce<Record<string, number>>((counts, value) => {
    counts[value || "بدون"] = (counts[value || "بدون"] ?? 0) + 1
    return counts
  }, {})).sort((a, b) => b[1] - a[1])
  const tripStatusCounts = [
    { label: "مكتملة", value: completedTrips, color: T.success },
    { label: "معلقة", value: rangedTrips.filter((trip) => trip.status === "معلقة").length, color: T.warning },
    { label: "ملغاة", value: cancelledTrips, color: T.danger },
  ]
  const tripTypeCounts: Array<{ label: string; value: number }> = [
    ...(["فرزة", "م1", "م2"] as const).map((type) => ({
      label: type,
      value: rangedTrips.filter((trip) => trip.type === type).length,
    })),
    {
      label: "بدون",
      // «بدون» means a distant breakdown where no rescue trip was created.
      // It is deliberately not inferred from the trip type itself.
      value: rangedBreakdowns.filter((breakdown) => breakdown.rescuerTripType === "بدون").length,
    },
  ]
  const cargoKeywords = ["زيت", "صابون", "سمن"] as const
  const cargoCounts = cargoKeywords.map((keyword) => ({
    label: keyword,
    value: rangedTrips.filter((trip) => trip.payload.includes(keyword)).length,
  })).filter((item) => item.value > 0)
  const payloadCounts = cargoCounts.length
    ? cargoCounts.map((item) => [item.label, item.value] as [string, number])
    : countBy(rangedTrips.map((trip) => trip.payload)).slice(0, 5)
  const topBreakdownDrivers = countBy(rangedBreakdowns.map((breakdown) => breakdown.driverName)).slice(0, 5)
  const topBreakdownDestinations = countBy(
    rangedBreakdowns.flatMap((breakdown) => {
      const trip = state.trips.find((item) => item.id === breakdown.tripId)
      return trip ? [trip.destination || trip.province] : []
    }),
  ).slice(0, 5)
  const violationChart = [
    { label: "نوع ت", value: rangedViolations.filter((violation) => violation.type === "ت").length, color: T.danger },
    { label: "نوع ح", value: rangedViolations.filter((violation) => violation.type === "ح").length, color: T.warning },
    { label: "مرفوعة", value: raisedViolations, color: T.success },
    { label: "غير مرفوعة", value: totalViolations - raisedViolations, color: th.sub },
  ]
  const hasPeriodData = rangedTrips.length + rangedViolations.length + rangedBreakdowns.length > 0
  const focusPeriodFilter = () => {
    setPeriod("custom")
    periodFilterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }
  const activatedByGuarantee = state.drivers.filter(
    (driver) => driver.status === "نشط"
      && driver.guarantors.filter((guarantor) => guarantor.status === "فعال" && !guarantor.suspended).length >= state.minGuarantors,
  ).length
  const provinceCounts = countBy(rangedTrips.map((trip) => trip.province)).slice(0, 5)
  const topViolators = Object.values(rangedViolations.reduce<Record<string, { name: string; plate: string; count: number; types: string[]; date: string }>>((result, violation) => {
    const driver = state.drivers.find((item) => item.id === violation.driverId)
    const current = result[String(violation.driverId)] ?? {
      name: violation.driverName,
      plate: driver?.plate ?? "—",
      count: 0,
      types: [],
      date: violation.date,
    }
    current.count += 1
    if (!current.types.includes(violation.type)) current.types.push(violation.type)
    if (violation.date > current.date) current.date = violation.date
    result[String(violation.driverId)] = current
    return result
  }, {})).sort((a, b) => b.count - a.count).slice(0, 5)

  const chartValues = useMemo(() => {
    const groups = new Map<string, number>()
    const bucketKey = (date: string) => {
      const normalized = dateKey(date)
      if (!normalized) return date
      const value = new Date(`${normalized}T12:00:00`)
      if (period === "year") return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`
      if (period === "month") {
        const weekStart = new Date(value)
        weekStart.setDate(value.getDate() - value.getDay())
        return weekStart.toISOString().slice(0, 10)
      }
      return date
    }
    rangedTrips.forEach((trip) => {
      const date = dateKey(trip.completedAt ?? trip.createdAt)
      if (!date) return
      const key = bucketKey(date)
      groups.set(key, (groups.get(key) ?? 0) + 1)
    })
    const dates = [...groups.keys()].sort()
    const limit = period === "year" ? 12 : period === "month" ? 8 : 7
    return (dates.length ? dates : [fromDate, toDate].filter((date, index, all) => date && all.indexOf(date) === index)).slice(-limit).map((date) => ({
      label: period === "year" ? date.slice(0, 7) : date.slice(5).replace("-", "/"),
      value: groups.get(date) ?? 0,
    }))
  }, [rangedTrips, fromDate, toDate, period])
  const maxChartValue = Math.max(1, ...chartValues.map((item) => item.value))

  const setPreset = (value: string) => {
    setPeriod(value)
    if (value === "custom") return
    const end = referenceDate
    const [year, month] = end.split("-").map(Number)
    const start = value === "day"
      ? end
      : value === "week"
        ? shiftDateKey(end, -6)
        : value === "month"
          ? `${year}-${String(month).padStart(2, "0")}-01`
          : `${year}-01-01`
    setFromDate(start)
    setToDate(end)
  }
  const resetRange = () => setPreset("week")
  const download = (content: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new()
    const summaryRows = [
      ["الفترة", `${formatDateForReport(fromDate)} إلى ${formatDateForReport(toDate)}`],
      ["نوع التقرير التفصيلي", reportType],
      ["إجمالي النهمات", rangedTrips.length],
      ["النهمات المكتملة", completedTrips],
      ["النهمات الملغاة", cancelledTrips],
      ["النهمات المعلقة", pendingTrips],
      ["إجمالي الأعطال", rangedBreakdowns.length],
      ["الأعطال القريبة", closeBreakdowns],
      ["الأعطال البعيدة", farBreakdowns],
      ["إجمالي المخالفات", totalViolations],
      ["المخالفات المرفوعة", raisedViolations],
      ["إجمالي الضمانات", uniqueGuarantorCount],
      ["السائقون النشطون", activeDrivers],
      ["السائقون غير النشطين", inactiveDrivers],
    ]
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), "الملخص")

    const tripsRows = rangedTrips.map((trip) => [
      trip.breakNum,
      state.drivers.find((driver) => driver.id === trip.driverId)?.ownerName ?? "—",
      trip.province,
      trip.type,
      trip.status,
      formatDateForReport(trip.completedAt ?? trip.createdAt),
    ])
    const breakdownRows = rangedBreakdowns.map((breakdown) => [
      breakdown.driverName,
      breakdown.plate,
      breakdown.location,
      breakdown.status,
      formatDateForReport(breakdown.date),
      breakdown.rescuerName ?? "—",
      breakdown.rescuerTripType ?? "—",
    ])
    const violationRows = rangedViolations.map((violation) => [
      violation.driverName,
      violation.type,
      violation.raised ? "مرفوعة" : "غير مرفوعة",
      formatDateForReport(violation.date),
      violation.note,
    ])
    const driverRows = state.drivers.map((driver) => [
      driver.ownerName,
      driver.plate,
      driver.status === "نشط" ? "نشط" : "غير نشط",
      driver.violation ?? "—",
      driver.guarantors.filter((guarantor) => guarantor.status === "فعال" && !guarantor.suspended).length,
    ])
    const guaranteeRows = state.drivers.flatMap((driver) => driver.guarantors.map((guarantor) => [
      guarantor.name,
      driver.ownerName,
      guarantor.status,
      guarantor.suspended ? "موقوف" : "فعال",
      guarantor.phone,
    ]))
    const sheets: Array<[string, string[], unknown[][]]> = [
      ["النهمات", ["رقم النهمة", "المالك", "المحافظة", "النوع", "الحالة", "التاريخ"], tripsRows],
      ["الأعطال", ["السائق", "اللوحة", "الموقع", "الحالة", "التاريخ", "المسعف", "نوع نهمة المسعف"], breakdownRows],
      ["المخالفات", ["السائق", "النوع", "المعالجة", "التاريخ", "الملاحظات"], violationRows],
      ["السائقون", ["المالك", "اللوحة", "الحالة", "المخالفة", "الضمانات الفعالة"], driverRows],
      ["الضمانات", ["الضامن", "المضمون", "الحالة", "الإجراء", "الهاتف"], guaranteeRows],
    ]
    for (const [name, headers, rows] of sheets) {
      const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
      sheet["!autofilter"] = { ref: `A1:${String.fromCharCode(64 + headers.length)}${Math.max(1, rows.length + 1)}` }
      XLSX.utils.book_append_sheet(workbook, sheet, name)
    }
    XLSX.writeFile(workbook, `تقرير_${fromDate}_${toDate}.xlsx`)
    showSnackbar("تم تصدير ملف Excel التفصيلي")
  }
  const refreshReportData = () => {
    if (refreshing) return
    setRefreshing(true)
    window.setTimeout(() => {
      setRefreshing(false)
      showSnackbar("تم تحديث بيانات التقرير")
    }, 450)
  }
  const exportBackup = () => {
    download(JSON.stringify({
      exportDate: new Date().toISOString(),
      drivers: state.drivers,
      trips: state.trips,
      violations: state.violations,
      breakdowns: state.breakdowns,
      users: state.users,
      notifications: state.notifications,
      minGuarantors: state.minGuarantors,
    }, null, 2), `backup_${new Date().toISOString().slice(0, 10)}.json`, "application/json")
    showSnackbar("تم تصدير قاعدة البيانات")
  }
  const exportPdf = async () => {
    const reportContent = reportContentRef.current
    if (!reportContent || exportingPdf) return

    const screenStage = reportContent.closest(".screen-stage") as HTMLElement | null
    const savedScroll = { content: reportContent.scrollTop, stage: screenStage?.scrollTop ?? 0 }

    setExportingPdf(true)
    try {
      const pdfTripsRows = rangedTrips.map((trip) => [
        trip.breakNum,
        state.drivers.find((driver) => driver.id === trip.driverId)?.ownerName ?? "—",
        trip.province,
        trip.type,
        trip.status,
        formatDateForReport(trip.completedAt ?? trip.createdAt),
      ])
      const pdfBreakdownRows = rangedBreakdowns.map((breakdown) => [
        breakdown.driverName,
        breakdown.plate,
        breakdown.location,
        breakdown.status,
        formatDateForReport(breakdown.date),
        breakdown.rescuerName ?? "—",
        breakdown.rescuerTripType ?? "—",
      ])
      const pdfViolationRows = rangedViolations.map((violation) => [
        violation.driverName,
        violation.type,
        violation.raised ? "مرفوعة" : "غير مرفوعة",
        formatDateForReport(violation.date),
        violation.note,
      ])
      const pdfDriverRows = state.drivers.map((driver) => [
        driver.ownerName,
        driver.plate,
        driver.status === "نشط" ? "نشط" : "غير نشط",
        driver.violation ?? "—",
        driver.guarantors.filter((guarantor) => guarantor.status === "فعال" && !guarantor.suspended).length,
      ])
      const pdfGuaranteeRows = state.drivers.flatMap((driver) => driver.guarantors.map((guarantor) => [
        guarantor.name,
        driver.ownerName,
        guarantor.status,
        guarantor.suspended ? "موقوف" : "فعال",
        guarantor.phone,
      ]))
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true })
      const amiriFontBase64 = await loadAmiriFontBase64()
      pdf.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64)
      pdf.addFont("Amiri-Regular.ttf", "Amiri", "normal")
      pdf.setFont("Amiri", "normal")
      const pageWidth = 210
      const pageHeight = 297
      const margin = 14
      const contentWidth = pageWidth - margin * 2
      const rtl = (value: unknown) => {
        const text = String(value ?? "—")
        return typeof pdf.processArabic === "function" ? pdf.processArabic(text) : text
      }
      const textRight = (value: unknown, x: number, y: number, size = 9) => {
        pdf.setFontSize(size)
        pdf.setTextColor(32, 42, 58)
        pdf.text(rtl(value), x, y, { align: "right" })
      }
      const addFooter = () => {
        pdf.setDrawColor(220, 226, 235)
        pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14)
        pdf.setFontSize(7)
        pdf.setTextColor(120, 130, 145)
        pdf.text(rtl(`تقرير حركة النظام · ${fromDate} — ${toDate}`), pageWidth - margin, pageHeight - 7, { align: "right" })
      }
      const addPageTitle = (title: string, subtitle?: string) => {
        pdf.setFillColor(36, 87, 214)
        pdf.roundedRect(margin, 16, contentWidth, 18, 4, 4, "F")
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(14)
        pdf.text(rtl(title), pageWidth - margin - 6, 27, { align: "right" })
        if (subtitle) {
          pdf.setFontSize(8)
          pdf.text(rtl(subtitle), pageWidth - margin - 6, 31, { align: "right" })
        }
        addFooter()
      }
      const addTable = (title: string, headers: string[], rows: unknown[][]) => {
        let y = 44
        if (pdf.getNumberOfPages() > 1) {
          pdf.addPage()
          addPageTitle(title, `${rows.length} سجل`)
        } else {
          addPageTitle(title, `${rows.length} سجل`)
        }
        const rowHeight = 8
        const columnWidth = contentWidth / headers.length
        const drawRow = (cells: unknown[], header = false) => {
          if (y > pageHeight - 24) {
            addFooter()
            pdf.addPage()
            addPageTitle(title, `${rows.length} سجل`)
            y = 44
          }
          cells.forEach((cell, index) => {
            const x = pageWidth - margin - (index + 1) * columnWidth
            pdf.setFillColor(header ? 231 : (index % 2 ? 249 : 255), header ? 239 : (index % 2 ? 249 : 255), header ? 255 : 255)
            pdf.setDrawColor(220, 226, 235)
            pdf.rect(x, y, columnWidth, rowHeight, "FD")
            pdf.setTextColor(header ? 36 : 45, header ? 87 : 55, header ? 150 : 70)
            pdf.setFontSize(header ? 7 : 6.5)
            const content = rtl(cell)
            const clipped = content.length > 24 ? `${content.slice(0, 23)}…` : content
            pdf.text(clipped, x + columnWidth / 2, y + 5.2, { align: "center" })
          })
          y += rowHeight
        }
        drawRow(headers, true)
        rows.forEach((row) => drawRow(row))
      }

      // The PDF is assembled from report data, not a screenshot. This keeps
      // rows selectable, gives tables predictable page breaks, and includes
      // every record in the selected range.
      pdf.setFillColor(15, 32, 65)
      pdf.rect(0, 0, pageWidth, pageHeight, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(11)
      pdf.text(rtl("مكتب تعز — نظام إدارة البوابير"), pageWidth - margin, 60, { align: "right" })
      pdf.setFontSize(24)
      pdf.text(rtl("تقرير حركة النظام"), pageWidth - margin, 82, { align: "right" })
      pdf.setFontSize(11)
      pdf.text(rtl(`الفترة: ${fromDate} إلى ${toDate}`), pageWidth - margin, 98, { align: "right" })
      pdf.text(rtl(`التقرير التفصيلي المحدد: ${reportType}`), pageWidth - margin, 108, { align: "right" })
      pdf.setFontSize(9)
      pdf.setTextColor(183, 199, 228)
      pdf.text(rtl("تقرير إداري قابل للبحث والفرز والطباعة"), pageWidth - margin, 120, { align: "right" })
      pdf.addPage()
      addPageTitle("المؤشرات الرئيسية", `${fromDate} — ${toDate}`)
      const summary = [
        ["إجمالي النهمات", rangedTrips.length],
        ["النهمات المكتملة", completedTrips],
        ["النهمات الملغاة", cancelledTrips],
        ["النهمات المعلقة", pendingTrips],
        ["إجمالي الأعطال", rangedBreakdowns.length],
        ["الأعطال القريبة", closeBreakdowns],
        ["الأعطال البعيدة", farBreakdowns],
        ["إجمالي المخالفات", totalViolations],
        ["إجمالي الضمانات", uniqueGuarantorCount],
        ["السائقون النشطون", activeDrivers],
        ["السائقون غير النشطين", inactiveDrivers],
      ]
      let summaryY = 52
      summary.forEach(([label, value], index) => {
        const x = margin + (index % 2) * (contentWidth / 2)
        const y = summaryY + Math.floor(index / 2) * 19
        pdf.setFillColor(index % 2 ? 245 : 238, 245, 255)
        pdf.roundedRect(x, y, contentWidth / 2 - 7, 13, 3, 3, "F")
        textRight(label, x + contentWidth / 2 - 14, y + 5, 8)
        pdf.setFontSize(13)
        pdf.setTextColor(36, 87, 214)
        pdf.text(String(value), x + 10, y + 8, { align: "left" })
      })
      addFooter()
      addTable("تفاصيل النهمات", ["رقم النهمة", "المالك", "المحافظة", "النوع", "الحالة", "التاريخ"], pdfTripsRows)
      addTable("تفاصيل الأعطال", ["السائق", "اللوحة", "الموقع", "الحالة", "التاريخ", "المسعف", "نوع نهمة المسعف"], pdfBreakdownRows)
      addTable("تفاصيل المخالفات", ["السائق", "النوع", "المعالجة", "التاريخ", "الملاحظات"], pdfViolationRows)
      addTable("حالة السائقين", ["المالك", "اللوحة", "الحالة", "المخالفة", "الضمانات الفعالة"], pdfDriverRows)
      addTable("تفاصيل الضمانات", ["الضامن", "المضمون", "الحالة", "الإجراء", "الهاتف"], pdfGuaranteeRows)
      const pageCount = pdf.getNumberOfPages()
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page)
        pdf.setFontSize(7)
        pdf.setTextColor(120, 130, 145)
        pdf.text(rtl(`صفحة ${page} من ${pageCount}`), margin, pageHeight - 7, { align: "left" })
      }

      pdf.setProperties({
        title: `تقرير حركة النظام ${fromDate} - ${toDate}`,
        subject: "تقرير التقارير الإدارية",
        author: "نظام البوابير",
      })
      pdf.save(`تقرير_التقارير_${fromDate}_${toDate}.pdf`)
      showSnackbar("تم تنزيل ملف PDF الجاهز للطباعة")
    } catch {
      showSnackbar("تعذر إنشاء ملف PDF، حاول مرة أخرى")
    } finally {
      document.body.classList.remove("reports-exporting")
      setPdfExportMode(false)
      reportContent.scrollTop = savedScroll.content
      if (screenStage) screenStage.scrollTop = savedScroll.stage
      setExportingPdf(false)
    }
  }
  const importBackup = async (file: File) => {
    if (!window.confirm("استعادة النسخة الاحتياطية قد تستبدل البيانات الحالية. هل تريد المتابعة؟")) return
    try {
      const parsed = JSON.parse(await file.text()) as Record<string, unknown>
      const required = ["drivers", "trips", "violations", "breakdowns", "users"]
      if (!required.every((key) => Array.isArray(parsed[key]))) throw new Error("invalid")
      dispatch({ type: "IMPORT_DATA", data: {
        drivers: parsed.drivers as typeof state.drivers,
        trips: parsed.trips as typeof state.trips,
        violations: parsed.violations as typeof state.violations,
        breakdowns: parsed.breakdowns as typeof state.breakdowns,
        users: parsed.users as typeof state.users,
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications as typeof state.notifications : state.notifications,
        minGuarantors: typeof parsed.minGuarantors === "number" ? parsed.minGuarantors : state.minGuarantors,
      } })
      showSnackbar("تم استيراد النسخة الاحتياطية")
    } catch {
      showSnackbar("ملف النسخة الاحتياطية غير صالح")
    }
  }

  const detailRows = useMemo(() => {
    if (reportType === "النهمات") return rangedTrips.map((trip) => ({
      id: trip.id,
      cells: [trip.breakNum, state.drivers.find((driver) => driver.id === trip.driverId)?.ownerName ?? "—", trip.province, trip.type, trip.status],
      search: `${trip.breakNum} ${state.drivers.find((driver) => driver.id === trip.driverId)?.ownerName ?? ""} ${trip.province} ${trip.type} ${trip.status}`,
    }))
    if (reportType === "الأعطال") return rangedBreakdowns.map((breakdown) => ({
      id: breakdown.id,
      cells: [breakdown.driverName, breakdown.plate, breakdown.breakdownPlace ?? breakdown.location, breakdown.status, breakdown.date],
      search: `${breakdown.driverName} ${breakdown.plate} ${breakdown.breakdownPlace ?? breakdown.location} ${breakdown.status}`,
    }))
    if (reportType === "المخالفات") return rangedViolations.map((violation) => ({
      id: violation.id,
      cells: [violation.driverName, violation.type, violation.raised ? "مرفوعة" : "غير مرفوعة", violation.date, violation.note],
      search: `${violation.driverName} ${violation.type} ${violation.note}`,
    }))
    if (reportType === "السائقون") return state.drivers.map((driver) => ({
      id: driver.id,
      cells: [driver.ownerName, driver.plate, driver.status === "نشط" ? "نشط" : "غير نشط", driver.violation ?? "—", driver.guarantors.length],
      search: `${driver.ownerName} ${driver.plate} ${driver.status} ${driver.violation ?? ""}`,
    }))
    return state.drivers.flatMap((driver) => driver.guarantors.map((guarantor) => ({
      id: guarantor.id,
      cells: [guarantor.name, driver.ownerName, guarantor.status, guarantor.suspended ? "موقوف" : "فعال", guarantor.phone],
      search: `${guarantor.name} ${driver.ownerName} ${guarantor.status}`,
    })))
  }, [reportType, rangedTrips, rangedBreakdowns, rangedViolations, state.drivers])
  const normalizedQuery = query.trim().toLocaleLowerCase("ar")
  const filteredDetailRows = detailRows
    .filter((row) => !normalizedQuery || row.search.toLocaleLowerCase("ar").includes(normalizedQuery))
    .filter((row) => Object.entries(detailFilters).every(([index, value]) => {
      const normalizedFilter = value.trim().toLocaleLowerCase("ar")
      return !normalizedFilter || String(row.cells[Number(index)] ?? "").toLocaleLowerCase("ar").includes(normalizedFilter)
    }))
    .sort((a, b) => {
      const left = String(a.cells[detailSortIndex] ?? "").toLocaleLowerCase("ar")
      const right = String(b.cells[detailSortIndex] ?? "").toLocaleLowerCase("ar")
      const comparison = left.localeCompare(right, "ar", { numeric: true })
      return detailSortDirection === "asc" ? comparison : -comparison
    })
  const visibleRows = pdfExportMode || showAllRows ? filteredDetailRows : filteredDetailRows.slice(0, 30)
  const detailHeaders: Record<string, string[]> = {
    النهمات: ["رقم النهمة", "المالك", "المحافظة", "النوع", "الحالة"],
    الأعطال: ["السائق", "اللوحة", "مكان العطل", "الحالة", "التاريخ"],
    المخالفات: ["السائق", "النوع", "المعالجة", "التاريخ", "الملاحظات"],
    السائقون: ["المالك", "اللوحة", "الحالة", "المخالفة", "الضمانات"],
    الضمانات: ["الضامن", "المضمون", "الحالة", "الإجراء", "الهاتف"],
  }
  const changeDetailType = (nextType: string) => {
    setReportType(nextType)
    setQuery("")
    setDetailFilters({})
    setDetailSortIndex(0)
    setDetailSortDirection("asc")
    setShowAllRows(false)
  }
  const toggleDetailSort = (index: number) => {
    if (detailSortIndex === index) {
      setDetailSortDirection((value) => value === "asc" ? "desc" : "asc")
    } else {
      setDetailSortIndex(index)
      setDetailSortDirection("asc")
    }
  }
  const totalStatus = tripStatusCounts.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className={`reports-screen${pdfExportMode ? " reports-pdf-capture" : ""}`} style={{ background: th.bg }}>
      <StandardAppBar title="التقارير" back="home" />
      {exportingPdf && (
        <div className="reports-pdf-overlay" data-pdf-exclude>
          <div className="reports-pdf-overlay-card">
            <span className="reports-pdf-spinner" />
            <strong>جارٍ إعداد التقرير للطباعة...</strong>
            <small>يتم تجميع جميع الأقسام والبيانات</small>
          </div>
        </div>
      )}
      <div className="reports-content" ref={reportContentRef}>
        <div className="reports-pdf-cover" data-pdf-only>
          <div>
            <p>مكتب تعز — نظام إدارة البوابير</p>
            <h2>تقرير حركة النظام</h2>
          </div>
          <div className="reports-pdf-cover-meta">
            <span><b>الفترة:</b> {periodLabels[period] ?? period}</span>
            <span><b>من</b> {fromDate} <b>إلى</b> {toDate}</span>
            <span><b>تاريخ الإنشاء:</b> {pdfGeneratedAt}</span>
            <span><b>نوع التقرير التفصيلي:</b> {reportType}</span>
          </div>
        </div>

        <header className="reports-heading">
          <div>
            <p className="reports-eyebrow">لوحة تحكم المدير</p>
            <h1>ملخص حركة النظام</h1>
            <p>نظرة سريعة على النهمات والسائقين والعمليات التشغيلية</p>
          </div>
          <div className="reports-heading-meta" data-pdf-exclude>
            <span className="reports-live-dot" /> محدث الآن
          </div>
        </header>

        <section ref={periodFilterRef} className="report-filter-card" aria-label="اختيار الفترة الزمنية" data-pdf-exclude>
          <div className="report-filter-title"><span className="report-icon"><MonochromeIcon name="calendar" size={17} /></span><div><strong>الفترة الزمنية</strong><small>تتحدث جميع المؤشرات تلقائيًا</small></div></div>
          <select value={period} onChange={(event) => setPreset(event.target.value)} aria-label="الفترة الزمنية">
            <option value="day">اليوم</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
            <option value="year">هذه السنة</option>
            <option value="custom">فترة مخصصة</option>
          </select>
          <button type="button" className="report-reset" onClick={resetRange}>إعادة تعيين</button>
          <button type="button" className="report-reset" onClick={refreshReportData} disabled={refreshing}>
            <MonochromeIcon name="refresh" size={14} /> {refreshing ? "جارٍ التحميل..." : "تحديث البيانات"}
          </button>
          <div className="report-export-inline" data-pdf-exclude>
            <button type="button" onClick={() => void exportPdf()} disabled={exportingPdf}><MonochromeIcon name="note" size={15} /> {exportingPdf ? "PDF..." : "PDF"}</button>
            <button type="button" onClick={exportExcel}><MonochromeIcon name="chart" size={15} /> Excel</button>
          </div>
          {period === "custom" && (
            <div className="custom-date-fields">
              <label>من تاريخ<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
              <label>إلى تاريخ<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
            </div>
          )}
          <span className="report-range-label">{fromDate} — {toDate}</span>
        </section>

        {!hasPeriodData && !pdfExportMode && (
          <EmptyReport text="لا توجد بيانات خلال الفترة المحددة" onChangePeriod={focusPeriodFilter} />
        )}

        <div className="report-section-label"><span>المؤشرات الرئيسية</span><small>{rangedTrips.length + rangedBreakdowns.length + totalViolations} عملية في الفترة</small></div>
        <section className="stats-grid">
          {[
            ["إجمالي النهمات", rangedTrips.length, "chart", T.primary],
            ["النهمات المكتملة", completedTrips, "check", T.success],
            ["النهمات الملغاة", cancelledTrips, "close", T.danger],
            ["النهمات المعلقة", pendingTrips, "pause", T.warning],
            ["إجمالي الأعطال", rangedBreakdowns.length, "wrench", "#7C3AED"],
            ["الأعطال القريبة", closeBreakdowns, "pin", T.warning],
            ["الأعطال البعيدة", farBreakdowns, "pin", T.danger],
            ["إجمالي المخالفات", totalViolations, "warning", T.danger],
            ["إجمالي الضمانات", uniqueGuarantorCount, "key", "#0EA5E9"],
            ["السائقون النشطون", activeDrivers, "users", T.success],
            ["السائقون غير النشطين", inactiveDrivers, "user", th.sub],
          ].map(([label, value, icon, color]) => (
            <article className="report-stat-card" key={String(label)} style={{ color: color as string }}>
              <span className="stat-icon" style={{ color: color as string, background: `${color as string}16` }}><MonochromeIcon name={icon as string} size={18} /></span>
              <strong style={{ color: color as string }}>{value as number}</strong>
              <span>{label}</span>
            </article>
          ))}
        </section>

        <ReportSection forceOpen={pdfExportMode} title="إحصائيات النهمات" subtitle="عدد النهمات خلال الفترة المحددة — التجميع تلقائي حسب الفترة" badge={<span className="chart-badge">تلقائي</span>}>
          {hasPeriodData ? (
            <div className="reports-grid reports-grid-main reports-grid-inner">
              <section className="report-card chart-card inner-card">
                <div className="line-chart" aria-label="رسم بياني للنهمات">
                  <div className="chart-y-labels"><span>{maxChartValue}</span><span>{Math.round(maxChartValue / 2)}</span><span>0</span></div>
                  <svg viewBox="0 0 520 170" preserveAspectRatio="none" role="img">
                    {[30, 85, 140].map((y) => <line key={y} x1="8" x2="510" y1={y} y2={y} stroke={th.border} strokeDasharray="3 4" />)}
                    {chartValues.length > 1 && <polyline fill="none" stroke={T.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={chartValues.map((item, index) => `${12 + (index * 496) / Math.max(1, chartValues.length - 1)},${150 - (item.value / maxChartValue) * 120}`).join(" ")} />}
                    {chartValues.map((item, index) => <circle key={`${item.label}-${index}`} cx={12 + (index * 496) / Math.max(1, chartValues.length - 1)} cy={150 - (item.value / maxChartValue) * 120} r="4.5" fill={th.card} stroke={T.primary} strokeWidth="3" />)}
                  </svg>
                  <div className="chart-x-labels">{chartValues.map((item) => <span key={item.label}>{item.label}</span>)}</div>
                </div>
              </section>
              <section className="report-card status-card inner-card">
                <div className="report-card-header compact-header"><div><h3>حالة النهمات</h3><p>التوزيع حسب الحالة</p></div></div>
                <div className="donut-layout">
                  <div className="donut" style={{ background: `conic-gradient(${T.success} 0 ${(completedTrips / Math.max(1, totalStatus)) * 100}%, ${T.warning} ${(completedTrips / Math.max(1, totalStatus)) * 100}% ${((completedTrips + tripStatusCounts[1].value) / Math.max(1, totalStatus)) * 100}%, ${T.danger} ${((completedTrips + tripStatusCounts[1].value) / Math.max(1, totalStatus)) * 100}% 100%)` }}><div><strong>{rangedTrips.length}</strong><span>نهمة</span></div></div>
                  <div className="legend-list">{tripStatusCounts.map((item) => <div key={item.label}><span><i style={{ background: item.color }} />{item.label}</span><strong>{item.value}</strong></div>)}</div>
                </div>
              </section>
            </div>
          ) : (
            <EmptyReport text="لا توجد نهمات خلال الفترة المحددة" onChangePeriod={focusPeriodFilter} />
          )}
        </ReportSection>

        <ReportSection forceOpen={pdfExportMode} title="تحليل النهمات" subtitle="النوع والمحافظات والحمولات">
          <div className="reports-grid reports-grid-three reports-grid-inner">
            <section className="report-card inner-card"><div className="report-card-header compact-header"><div><h3>حسب نوع النهمة</h3></div></div><div className="bar-list">{tripTypeCounts.map((item) => <div className="bar-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${(item.value / Math.max(1, ...tripTypeCounts.map((value) => value.value))) * 100}%` }} /></div><strong>{item.value}</strong></div>)}</div></section>
            <section className="report-card inner-card"><div className="report-card-header compact-header"><div><h3>توزيع المحافظات</h3></div></div><div className="rank-list">{provinceCounts.length ? provinceCounts.map(([name, value], index) => <div key={name}><b>{index + 1}</b><span>{name}</span><strong>{value}</strong></div>) : <EmptyReport text="لا توجد بيانات" onChangePeriod={focusPeriodFilter} />}</div></section>
            <section className="report-card inner-card"><div className="report-card-header compact-header"><div><h3>الحمولات</h3></div></div><div className="bar-list">{payloadCounts.length ? payloadCounts.map(([name, value]) => <div className="bar-row" key={name}><span>{name}</span><div><i style={{ width: `${(value / Math.max(1, ...payloadCounts.map((item) => item[1]))) * 100}%`, background: "#0EA5E9" }} /></div><strong>{value}</strong></div>) : <EmptyReport text="لا توجد بيانات" onChangePeriod={focusPeriodFilter} />}</div></section>
          </div>
        </ReportSection>

        <div className="reports-grid reports-grid-two">
          <ReportSection forceOpen={pdfExportMode} title="الأعطال" subtitle="قريب وبعيد عن المصنع" badge={<span className="section-total">{rangedBreakdowns.length}</span>} defaultOpen={false}>
            {rangedBreakdowns.length ? (
              <>
                <div className="mini-metrics"><div><strong>{rangedBreakdowns.length}</strong><span>إجمالي</span></div><div><strong>{closeBreakdowns}</strong><span>قريب</span></div><div><strong>{farBreakdowns}</strong><span>بعيد</span></div><div><strong>{finishedBreakdowns}</strong><span>منتهي</span></div></div>
                <div className="comparison-track"><i style={{ width: `${(closeBreakdowns / Math.max(1, rangedBreakdowns.length)) * 100}%` }} /><i style={{ width: `${(farBreakdowns / Math.max(1, rangedBreakdowns.length)) * 100}%` }} /></div>
                <div className="comparison-legend"><span><i className="near" /> قريب من المصنع</span><span><i className="far" /> بعيد عن المصنع</span></div>
                {topBreakdownDrivers.length > 0 && (
                  <div className="rank-subsection">
                    <h3>أكثر البوابير تعرضًا للأعطال</h3>
                    <div className="rank-list">{topBreakdownDrivers.map(([name, value], index) => <div key={name}><b>{index + 1}</b><span>{name}</span><strong>{value}</strong></div>)}</div>
                  </div>
                )}
                {topBreakdownDestinations.length > 0 && (
                  <div className="rank-subsection">
                    <h3>أكثر الوجهات التي حدثت فيها أعطال</h3>
                    <div className="rank-list">{topBreakdownDestinations.map(([name, value], index) => <div key={name}><b>{index + 1}</b><span>{name}</span><strong>{value}</strong></div>)}</div>
                  </div>
                )}
              </>
            ) : (
              <EmptyReport text="لا توجد أعطال خلال الفترة المحددة" onChangePeriod={focusPeriodFilter} />
            )}
          </ReportSection>

          <ReportSection forceOpen={pdfExportMode} title="المخالفات" subtitle="الأنواع وحالة المعالجة" badge={<span className="section-total">{totalViolations}</span>} defaultOpen={false}>
            {totalViolations ? (
              <>
                <div className="mini-metrics"><div><strong>{totalViolations}</strong><span>إجمالي</span></div><div><strong>{rangedViolations.filter((violation) => violation.type === "ت").length}</strong><span>نوع ت</span></div><div><strong>{rangedViolations.filter((violation) => violation.type === "ح").length}</strong><span>نوع ح</span></div><div><strong>{raisedViolations}</strong><span>مرفوعة</span></div><div><strong>{totalViolations - raisedViolations}</strong><span>غير مرفوعة</span></div></div>
                <div className="bar-list violation-bars">{violationChart.map((item) => <div className="bar-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${(item.value / Math.max(1, totalViolations)) * 100}%`, background: item.color }} /></div><strong>{item.value}</strong></div>)}</div>
              </>
            ) : (
              <EmptyReport text="لا توجد مخالفات خلال الفترة المحددة" onChangePeriod={focusPeriodFilter} />
            )}
          </ReportSection>
        </div>

        <ReportSection
          forceOpen={pdfExportMode}
          title="أكثر البوابير مخالفة"
          subtitle="ترتيب تنازلي حسب عدد المخالفات خلال الفترة"
           action={<button type="button" className="text-action" onClick={() => changeDetailType("المخالفات")}>عرض الكل</button>}
          defaultOpen={false}
        >
          {topViolators.length ? (
            <div className="violators-list">{topViolators.map((item, index) => (
              <div className="violator-row" key={`${item.name}-${item.plate}`}>
                <b className="rank-number">{index + 1}</b>
                <span className="violator-avatar">{item.name.slice(0, 1)}</span>
                <div className="violator-name"><strong>{item.name}</strong><small>{item.plate}</small></div>
                <span className="violation-type">{item.types.join(" · ")}</span>
                <strong className="violation-count">{item.count} مخالفات</strong>
                <small className="last-date">آخرها {item.date}</small>
              </div>
            ))}</div>
          ) : (
            <EmptyReport text="لا توجد مخالفات خلال الفترة المحددة" onChangePeriod={focusPeriodFilter} />
          )}
        </ReportSection>

        <div className="reports-grid reports-grid-two">
          <ReportSection forceOpen={pdfExportMode} title="حالة السائقين" subtitle="ملخص أسطول السائقين" defaultOpen={false}>
            <div className="driver-summary">
              <div className="driver-progress"><div style={{ width: `${(activeDrivers / Math.max(1, state.drivers.length)) * 100}%` }} /></div>
              <strong>{state.drivers.length} <small>إجمالي السائقين</small></strong>
              <div className="summary-pills"><span>نشط {activeDrivers}</span><span>غير نشط {inactiveDrivers}</span></div>
            </div>
            <div className="info-grid">
              <span>القابلون للإضافة <b>{state.drivers.filter((driver) => driver.statusReason === "قابل_للإضافة").length}</b></span>
              <span>لديهم مخالفات <b>{state.drivers.filter((driver) => driver.violation).length}</b></span>
              <span>لديهم ضمانات <b>{driversWithGuarantees}</b></span>
            </div>
          </ReportSection>

          <ReportSection forceOpen={pdfExportMode} title="الضمانات" subtitle="حالة الضامنين والحد الأدنى" defaultOpen={false}>
            <div className="guarantee-highlight"><strong>{completeGuarantees}</strong><span>مضمونون بضمانات مكتملة</span></div>
            <div className="info-grid">
              <span>إجمالي المضمونين <b>{driversWithGuarantees}</b></span>
              <span>بدون ضمانة <b>{state.drivers.length - driversWithGuarantees}</b></span>
              <span>إجمالي الضامنين <b>{uniqueGuarantorCount}</b></span>
              <span>عدد الضمانات المسجلة <b>{activeGuarantors}</b></span>
              <span>نشطون بعد اكتمال الضمانات <b>{activatedByGuarantee}</b></span>
              <span>الحد الأدنى المطلوب <b>{state.minGuarantors}</b></span>
            </div>
          </ReportSection>
        </div>

        <ReportSection forceOpen={pdfExportMode} title="التقرير التفصيلي" subtitle="ابحث وفلتر بيانات الفترة المحددة">
          <div className="detail-controls detail-controls-block" data-pdf-exclude>
            <select value={reportType} onChange={(event) => changeDetailType(event.target.value)} aria-label="نوع التقرير">{Object.keys(detailHeaders).map((type) => <option key={type}>{type}</option>)}</select>
            <div className="report-search"><MonochromeIcon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث في التقرير..." /></div>
            <span className="detail-count">{filteredDetailRows.length} نتيجة</span>
            {filteredDetailRows.length > 30 && (
              <button type="button" className="report-reset" onClick={() => setShowAllRows((value) => !value)}>
                {showAllRows ? "عرض أول 30" : "عرض الكل"}
              </button>
            )}
          </div>
          <div className="detail-field-filters" data-pdf-exclude>
            {detailHeaders[reportType].map((header, index) => (
              <label key={header}>
                <span>{header}</span>
                <input
                  value={detailFilters[index] ?? ""}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, [index]: event.target.value }))}
                  placeholder={`فلترة ${header}`}
                />
              </label>
            ))}
          </div>
          {visibleRows.length ? (
            <div className="detail-table-wrap"><table><thead><tr>{detailHeaders[reportType].map((header, index) => <th key={header}><button type="button" className="detail-sort-button" onClick={() => toggleDetailSort(index)}>{header} {detailSortIndex === index ? (detailSortDirection === "asc" ? "↑" : "↓") : "↕"}</button></th>)}</tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id}>{row.cells.map((cell, index) => <td key={`${row.id}-${index}`} data-label={detailHeaders[reportType][index]}>{String(cell)}</td>)}</tr>)}</tbody></table></div>
          ) : (
            <EmptyReport text="لا توجد بيانات خلال الفترة المحددة" onChangePeriod={focusPeriodFilter} />
          )}
        </ReportSection>

        <ReportSection title="التصدير" subtitle="احفظ التقرير بصيغة PDF أو Excel" defaultOpen={false} excludeFromPdf>
          <div className="action-buttons">
            <button type="button" onClick={() => void exportPdf()} disabled={exportingPdf}><MonochromeIcon name="note" size={17} /> {exportingPdf ? "جارٍ إنشاء PDF..." : "تصدير PDF"}</button>
            <button type="button" onClick={exportExcel}><MonochromeIcon name="chart" size={17} /> تصدير Excel</button>
          </div>
        </ReportSection>

        <ReportSection title="النسخ الاحتياطي والاستعادة" subtitle="تصدير أو استيراد قاعدة البيانات" defaultOpen={false} excludeFromPdf>
          <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.target.value = "" }} />
          <div className="action-buttons backup-actions">
            <button type="button" onClick={exportBackup}><MonochromeIcon name="save" size={17} /> تصدير قاعدة البيانات</button>
            <button type="button" onClick={() => importInputRef.current?.click()}><MonochromeIcon name="refresh" size={17} /> استيراد قاعدة البيانات</button>
          </div>
          <div className="backup-warning"><MonochromeIcon name="warning" size={17} /><span>تنبيه: استعادة النسخة الاحتياطية قد تستبدل البيانات الحالية. تأكد من تصدير نسخة قبل الاستيراد.</span></div>
        </ReportSection>
      </div>
    </div>
  )
}

// ═══════════════════════════════════���══════════════════════
//  USERS SCREEN
// ══════════════════════════════════════════════════════════
export function UsersScreen() {
  const { state, dispatch, showSnackbar } = useApp()
  const th = useTheme()
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    role: "موظف_نهمة" as UserRole,
  })

  const handleAdd = () => {
    if (!newUser.username || !newUser.password || !newUser.name) return
    dispatch({ type: "ADD_USER", user: { ...newUser, id: nextId(), avatar: newUser.name.charAt(0) } })
    showSnackbar(`تم إضافة المستخدم ${newUser.name} ✅`)
    setShowAdd(false)
    setNewUser({ username: "", password: "", name: "", role: "موظف_نهمة" })
  }

  const handleDelete = (userId: number, name: string) => {
    dispatch({ type: 'DELETE_USER', userId })
    showSnackbar(`تم حذف المستخدم ${name}`, () => {})
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: th.bg, overflow: 'hidden' }}>
      <StandardAppBar
        title="إدارة المستخدمين"
        back="home"
        extraLeft={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{ background: T.primary, border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
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
                background: user.role === 'مدير_م��تب' ? '#DBEAFE' : '#F0FDF4',
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
                }}>{user.role === "مدير_مكتب" ? "مدير مكتب" : user.role === "موظف_تسجيل" ? "موظف تسجيل" : "موظف نهمة"}</span>
              </div>
              {user.id !== state.user?.id && (
                <button onClick={() => handleDelete(user.id, user.name)}
                  style={{ background: '#FEE2E2', border: 'none', borderRadius: 8, padding: '8px 10px', color: T.danger, cursor: 'pointer', fontSize: 14 }}>
                   <MonochromeIcon name="trash" size={15} />
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
                  <option value="موظف_تسجيل">موظف تسجيل</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowAdd(false)}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${th.border}`, background: 'none', color: th.sub, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
                <button onClick={handleAdd}
                   style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: T.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}><MonochromeIcon name="check" size={15} /> حفظ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
