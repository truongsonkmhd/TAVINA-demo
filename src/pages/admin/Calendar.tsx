import { useMemo, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Select, Card, Modal, PageHeader, cx } from '@/components/ui'
import { today, addDaysISO, fmtDate, fmtWeekday, nights, isWeekend } from '@/lib/format'
import { availabilityByNight, OCCUPYING } from '@/lib/availability'
import { CHANNEL_LABEL, CHANNEL_COLOR, BOOKING_STATUS_LABEL } from '@/lib/labels'
import { can } from '@/lib/permissions'
import { BookingPanel } from '@/features/pms/components/BookingPanel'
import type { Booking, BookingStatus, Channel } from '@/types'

const COL = 72 // px / ngày
const LABEL_W = 96
const ROW_H = 40
const VISIBLE: BookingStatus[] = ['hold', 'confirmed', 'checked-in', 'checked-out']

export default function Calendar() {
  const s = useStore()
  const navigate = useNavigate()
  const T = today()
  const roleId = s.currentUser.roleId
  const canEdit = can(s.roles, roleId, 'calendar', 'edit')
  const canCreate = can(s.roles, roleId, 'calendar', 'create') || can(s.roles, roleId, 'bookings', 'create')

  const [start, setStart] = useState(addDaysISO(T, -1))
  const [span, setSpan] = useState(14)
  const [fType, setFType] = useState('')
  const [fSource, setFSource] = useState<'' | Channel>('')
  const [fStatus, setFStatus] = useState<'' | BookingStatus>('')
  const [selected, setSelected] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const days = useMemo(() => Array.from({ length: span }, (_, i) => addDaysISO(start, i)), [start, span])
  const end = addDaysISO(start, span)

  const visible = useMemo(() => s.bookings.filter((b) => {
    if (fStatus ? b.status !== fStatus : !VISIBLE.includes(b.status)) return false
    if (fSource && b.source !== fSource) return false
    if (fType && b.roomTypeId !== fType) return false
    return b.checkIn < end && b.checkOut > start
  }), [s.bookings, fStatus, fSource, fType, start, end])

  const roomTypes = s.roomTypes.filter((rt) => !fType || rt.id === fType)
  const selectedBooking = s.bookings.find((b) => b.id === selected)

  const idx = (d: string) => Math.round((new Date(d + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000)

  const onDropCell = (e: DragEvent, roomId: string | undefined, date: string, roomTypeId: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/booking') || dragId
    setDragId(null)
    if (!id || !canEdit) return
    const b = s.bookings.find((x) => x.id === id)
    if (!b) return
    if (!roomId && b.roomTypeId !== roomTypeId) { s.toast('Chỉ thả vào dòng "Chưa xếp phòng" của đúng hạng', 'err'); return }
    const n = nights(b.checkIn, b.checkOut)
    const newOut = addDaysISO(date, n)
    if (b.roomId === roomId && b.checkIn === date) return
    if (b.status === 'checked-in' && date !== b.checkIn) { s.toast('Khách đang ở — chỉ đổi phòng, không đổi ngày đến', 'err'); return }
    const r = s.moveBooking(id, roomId, date, newOut)
    if (r.error) s.toast(r.error, 'err')
    else s.toast(`Đã chuyển ${b.code} → ${roomId ? `phòng ${s.rooms.find((x) => x.id === roomId)?.number}` : 'chưa xếp phòng'}, ${fmtDate(date, 'dd/MM')}`, 'ok')
  }

  const gridW = LABEL_W + span * COL

  return (
    <div>
      <PageHeader title="Lịch đặt phòng" subtitle="Kéo thanh booking sang phòng/ngày khác để đổi; click ô trống để tạo nhanh." actions={canCreate && <><Button tone="secondary" onClick={() => navigate('/admin/bookings/new')}>+ Booking</Button><Button onClick={() => navigate('/admin/bookings/new?type=group')}>+ Booking đoàn</Button></>} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button size="sm" tone="secondary" onClick={() => setStart(addDaysISO(T, -1))}>Hôm nay</Button>
          <Button size="sm" tone="ghost" aria-label="Lùi" onClick={() => setStart(addDaysISO(start, -span))}><ChevronLeft size={16} /></Button>
          <span className="tnum min-w-36 text-center text-sm font-medium">{fmtDate(start, 'dd/MM')} → {fmtDate(addDaysISO(end, -1), 'dd/MM/yyyy')}</span>
          <Button size="sm" tone="ghost" aria-label="Tiến" onClick={() => setStart(addDaysISO(start, span))}><ChevronRight size={16} /></Button>
        </div>
        <Select className="h-8 w-28" value={span} onChange={(e) => setSpan(+e.target.value)} aria-label="Số ngày">{[7, 14, 30].map((n) => <option key={n} value={n}>{n} ngày</option>)}</Select>
        <Select className="h-8 w-36" value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Hạng phòng"><option value="">Mọi hạng</option>{s.roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
        <Select className="h-8 w-40" value={fSource} onChange={(e) => setFSource(e.target.value as Channel | '')} aria-label="Nguồn"><option value="">Mọi nguồn</option>{(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</Select>
        <Select className="h-8 w-40" value={fStatus} onChange={(e) => setFStatus(e.target.value as BookingStatus | '')} aria-label="Trạng thái"><option value="">Đang hiệu lực</option>{(Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[]).map((c) => <option key={c} value={c}>{BOOKING_STATUS_LABEL[c]}</option>)}</Select>
      </div>

      <div className="flex gap-4">
        <Card className="min-w-0 flex-1 p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <div style={{ width: gridW }} className="text-xs">
              {/* header ngày */}
              <div className="sticky top-0 z-10 flex border-b border-stone-200 bg-white">
                <div style={{ width: LABEL_W }} className="shrink-0 px-2 py-2 font-semibold text-stone-500">Phòng</div>
                {days.map((d) => (
                  <div key={d} style={{ width: COL }} className={cx('shrink-0 border-l border-stone-100 py-1 text-center', d === T && 'bg-sea/10 font-semibold text-sea', isWeekend(d) && d !== T && 'bg-stone-50')}>
                    <div>{fmtWeekday(d)}</div><div className="tnum">{fmtDate(d, 'dd/MM')}</div>
                  </div>
                ))}
              </div>

              {roomTypes.map((rt) => {
                const rooms = s.rooms.filter((r) => r.roomTypeId === rt.id)
                const unassigned = visible.filter((b) => b.roomTypeId === rt.id && !b.roomId)
                const avail = availabilityByNight(s.rooms, s.bookings, rt.id, start, end)
                return (
                  <div key={rt.id}>
                    <div className="flex border-b border-stone-200 bg-stone-50">
                      <div style={{ width: LABEL_W }} className="shrink-0 px-2 py-1.5 font-semibold">{rt.name}</div>
                      <div className="py-1.5 text-stone-500">{rooms.length} phòng</div>
                    </div>
                    {rooms.map((room) => (
                      <RowLine key={room.id} label={room.number} sub={room.status === 'ooo' ? 'Bảo trì' : undefined} days={days} T={T} ooo={room.status === 'ooo' ? { from: T, to: room.oooUntil ?? end } : undefined} idx={idx}
                        bookings={visible.filter((b) => b.roomId === room.id)} selected={selected} setSelected={setSelected} canEdit={canEdit}
                        onDrag={setDragId} onDrop={(e, d) => onDropCell(e, room.id, d, rt.id)}
                        onEmptyClick={(d) => canCreate && d >= T && navigate(`/admin/bookings/new?roomId=${room.id}&checkIn=${d}`)} guests={s.guests} />
                    ))}
                    <RowLine label="Chưa xếp" sub="phòng" days={days} T={T} idx={idx} bookings={unassigned} selected={selected} setSelected={setSelected} canEdit={canEdit} muted
                      onDrag={setDragId} onDrop={(e, d) => onDropCell(e, undefined, d, rt.id)} onEmptyClick={() => undefined} guests={s.guests} />
                    <div className="flex border-b-2 border-stone-200">
                      <div style={{ width: LABEL_W }} className="shrink-0 px-2 py-1.5 font-medium text-stone-600">Tồn/ngày</div>
                      {avail.map((a) => <div key={a.night} style={{ width: COL }} className={cx('tnum shrink-0 border-l border-stone-100 py-1.5 text-center font-semibold', a.available === 0 ? 'bg-red-50 text-red-700' : 'text-stone-700')}>{a.available}</div>)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 px-3 py-2 text-xs text-stone-600">
            <span className="font-medium">Chú giải:</span>
            {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => <span key={c} className="flex items-center gap-1"><span className={cx('h-3 w-3 rounded-sm', CHANNEL_COLOR[c])} />{CHANNEL_LABEL[c]}</span>)}
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border-2 border-red-600" />Overbooked</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-stone-300 [background-image:repeating-linear-gradient(45deg,transparent_0_3px,#a8a29e_3px_5px)]" />Bảo trì</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-stone-600 opacity-50" />Đã trả phòng</span>
          </div>
        </Card>

        {selectedBooking && (
          <aside className="hidden w-80 shrink-0 lg:block">
            <Card title="Chi tiết booking" actions={<Button size="sm" tone="ghost" onClick={() => setSelected(null)}>Đóng</Button>} className="sticky top-20">
              <BookingPanel booking={selectedBooking} onClose={() => setSelected(null)} />
            </Card>
          </aside>
        )}
      </div>
      <div className="lg:hidden">
        <Modal open={!!selectedBooking} onClose={() => setSelected(null)} title="Chi tiết booking">
          {selectedBooking && <BookingPanel booking={selectedBooking} onClose={() => setSelected(null)} />}
        </Modal>
      </div>
    </div>
  )
}

function RowLine({ label, sub, days, T, ooo, idx, bookings, selected, setSelected, canEdit, onDrag, onDrop, onEmptyClick, guests, muted }: {
  label: string; sub?: string; days: string[]; T: string; ooo?: { from: string; to: string }; idx: (d: string) => number
  bookings: Booking[]; selected: string | null; setSelected: (id: string) => void; canEdit: boolean
  onDrag: (id: string | null) => void; onDrop: (e: DragEvent, date: string) => void; onEmptyClick: (date: string) => void
  guests: { id: string; name: string }[]; muted?: boolean
}) {
  const [over, setOver] = useState<string | null>(null)
  // xếp làn để booking chồng nhau (dòng chưa xếp phòng) không đè lên nhau
  const lanes: Booking[][] = []
  for (const b of bookings.slice().sort((a, b) => a.checkIn.localeCompare(b.checkIn))) {
    let lane = lanes.find((l) => l.every((x) => x.checkOut <= b.checkIn || x.checkIn >= b.checkOut))
    if (!lane) { lane = []; lanes.push(lane) }
    lane.push(b)
  }
  const laneCount = Math.max(1, lanes.length)
  const h = ROW_H * laneCount
  return (
    <div className={cx('relative flex border-b border-stone-100', muted && 'bg-stone-50/60')} style={{ height: h }}>
      <div style={{ width: LABEL_W }} className="sticky left-0 z-[5] shrink-0 border-r border-stone-200 bg-white px-2 py-2 font-medium leading-tight">{label}{sub && <div className="text-[10px] font-normal text-stone-500">{sub}</div>}</div>
      <div className="relative" style={{ width: days.length * COL }}>
        {days.map((d) => (
          <div key={d} style={{ left: idx(d) * COL, width: COL }}
            className={cx('absolute inset-y-0 border-l border-stone-100', d === T && 'bg-sea/5', over === d && 'bg-sea/20', !muted && d >= T && 'cursor-pointer hover:bg-stone-100')}
            onClick={() => onEmptyClick(d)}
            onDragOver={(e) => { if (canEdit) { e.preventDefault(); setOver(d) } }} onDragLeave={() => setOver(null)} onDrop={(e) => { setOver(null); onDrop(e, d) }} />
        ))}
        {ooo && (() => { const a = Math.max(0, idx(ooo.from)); const b = Math.min(days.length, idx(ooo.to) + 1); return b > a ? <div className="pointer-events-none absolute inset-y-1 rounded bg-stone-300 [background-image:repeating-linear-gradient(45deg,transparent_0_4px,#a8a29e_4px_7px)]" style={{ left: a * COL, width: (b - a) * COL }} title="Bảo trì" /> : null })()}
        {lanes.map((lane, li) => lane.map((b) => {
          const a = Math.max(0, idx(b.checkIn)); const e = Math.min(days.length, idx(b.checkOut))
          if (e <= a) return null
          const g = guests.find((x) => x.id === b.guestId)
          const past = b.status === 'checked-out'
          return (
            <button key={b.id} type="button" draggable={canEdit && !past} onDragStart={(ev) => { ev.dataTransfer.setData('text/booking', b.id); ev.dataTransfer.effectAllowed = 'move'; onDrag(b.id) }} onDragEnd={() => onDrag(null)}
              onClick={(ev) => { ev.stopPropagation(); setSelected(b.id) }}
              title={`${b.code} · ${g?.name} · ${CHANNEL_LABEL[b.source]} · ${BOOKING_STATUS_LABEL[b.status]}`}
              style={{ left: a * COL + 3, width: (e - a) * COL - 6, top: li * ROW_H + 6, height: ROW_H - 12 }}
              className={cx('absolute truncate rounded px-2 text-left text-[11px] font-medium leading-7 text-white shadow-sm', CHANNEL_COLOR[b.source], past && 'opacity-50', b.status === 'hold' && 'opacity-80 [background-image:repeating-linear-gradient(45deg,transparent_0_6px,rgba(255,255,255,.25)_6px_12px)]',
                b.overbooked && 'ring-2 ring-red-600 ring-offset-1', selected === b.id && 'outline outline-2 outline-ink', canEdit && !past && 'cursor-grab active:cursor-grabbing')}>
              {g?.name}{b.groupId ? ' (đoàn)' : ''}{b.discountStatus === 'pending' ? ' · CK?' : ''}
            </button>
          )
        }))}
      </div>
    </div>
  )
}
