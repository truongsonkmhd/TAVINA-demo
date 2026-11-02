// Panel chi tiết booking dùng trong Lịch (bên phải desktop / Modal mobile)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { Button, Badge, Select, cx } from '@/components/ui'
import { CHANNEL_LABEL, CHANNEL_COLOR, BOOKING_STATUS_LABEL, ROOM_STATUS_LABEL, ROOM_STATUS_COLOR } from '@/lib/labels'
import { fmtDate, nights, vnd } from '@/lib/format'
import { freeRooms } from '@/lib/availability'
import { can } from '@/lib/permissions'
import type { Booking } from '@/types'

export function BookingPanel({ booking, onClose }: { booking: Booking; onClose?: () => void }) {
  const navigate = useNavigate()
  const s = useStore()
  const roleId = s.currentUser.roleId
  const canEdit = can(s.roles, roleId, 'bookings', 'edit')
  const guest = s.guests.find((g) => g.id === booking.guestId)
  const room = s.rooms.find((r) => r.id === booking.roomId)
  const rt = s.roomTypes.find((r) => r.id === booking.roomTypeId)
  const total = s.folioLines.filter((f) => f.bookingId === booking.id).reduce((x, f) => x + f.amount, 0) || booking.nightlyRate * nights(booking.checkIn, booking.checkOut)
  const paid = s.payments.filter((p) => p.bookingId === booking.id).reduce((x, p) => x + p.amount, 0)
  const [moving, setMoving] = useState(false)
  const [target, setTarget] = useState('')
  const free = freeRooms(s.rooms, s.bookings, booking.roomTypeId, booking.checkIn, booking.checkOut, booking.id)

  const run = (fn: () => { error?: string } | void, ok: string) => {
    const r = fn()
    if (r && r.error) s.toast(r.error, 'err')
    else s.toast(ok, 'ok')
  }

  return (
    <div className="flex h-full flex-col gap-3 text-sm">
      <div>
        <div className="flex items-center gap-2">
          <span className={cx('inline-block h-3 w-3 rounded-sm', CHANNEL_COLOR[booking.source])} />
          <span className="font-mono font-semibold">{booking.code}</span>
          {booking.overbooked && <Badge tone="err">Overbooked</Badge>}
          {booking.discountStatus === 'pending' && <Badge tone="warn">Chờ duyệt CK</Badge>}
        </div>
        <div className="mt-1 text-base font-semibold">{guest?.name}</div>
        <div className="text-stone-600">{guest?.phone} · {CHANNEL_LABEL[booking.source]} · <Badge>{BOOKING_STATUS_LABEL[booking.status]}</Badge></div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md bg-stone-50 p-3">
        <dt className="text-stone-500">Ngày</dt><dd className="tnum">{fmtDate(booking.checkIn, 'dd/MM')} → {fmtDate(booking.checkOut, 'dd/MM')} · {nights(booking.checkIn, booking.checkOut)} đêm</dd>
        <dt className="text-stone-500">Phòng</dt><dd>{room ? `${room.number} · ${rt?.name}` : <span className="text-amber-700">Chưa xếp phòng · {rt?.name}</span>}</dd>
        <dt className="text-stone-500">Khách</dt><dd>{booking.adults} NL{booking.children ? ` · ${booking.children} TE` : ''}</dd>
        <dt className="text-stone-500">Giá/đêm</dt><dd className="tnum">{vnd(booking.nightlyRate)}{booking.discountPct ? ` · CK ${booking.discountPct}%` : ''}</dd>
        <dt className="text-stone-500">Tổng / đã thu</dt><dd className="tnum">{vnd(total)} / <span className={paid >= total ? 'text-emerald-700' : 'text-amber-700'}>{vnd(paid)}</span></dd>
        {room && <><dt className="text-stone-500">Buồng</dt><dd><span className={cx('rounded px-1.5 py-0.5 text-xs', ROOM_STATUS_COLOR[room.status])}>{ROOM_STATUS_LABEL[room.status]}</span></dd></>}
        {booking.note && <><dt className="text-stone-500">Ghi chú</dt><dd>{booking.note}</dd></>}
      </dl>
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {booking.status === 'confirmed' && <Button size="sm" onClick={() => run(() => s.checkIn(booking.id), `Đã check-in ${booking.code}`)}>Check-in</Button>}
          {booking.status === 'checked-in' && <Button size="sm" onClick={() => run(() => s.checkOut(booking.id), `Đã check-out ${booking.code}`)}>Check-out</Button>}
          {['confirmed', 'checked-in', 'hold'].includes(booking.status) && <Button size="sm" tone="secondary" onClick={() => setMoving((v) => !v)}>Đổi phòng</Button>}
          {['confirmed', 'hold'].includes(booking.status) && <Button size="sm" tone="danger" onClick={() => { if (confirm(`Huỷ booking ${booking.code}?`)) { s.setBookingStatus(booking.id, 'cancelled'); s.toast('Đã huỷ booking', 'warn'); onClose?.() } }}>Huỷ</Button>}
          <Button size="sm" tone="ghost" onClick={() => navigate(`/admin/bookings/${booking.id}`)}>Mở chi tiết</Button>
        </div>
      )}
      {moving && (
        <div className="rounded-md border border-stone-200 p-3">
          <div className="mb-2 font-medium">Chọn phòng trống cùng hạng ({free.length})</div>
          <div className="flex gap-2">
            <Select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Phòng mới">
              <option value="">— chọn phòng —</option>
              {free.map((r) => <option key={r.id} value={r.id}>{r.number} · {ROOM_STATUS_LABEL[r.status]}</option>)}
            </Select>
            <Button size="md" disabled={!target} onClick={() => { run(() => s.moveBooking(booking.id, target, booking.checkIn, booking.checkOut), 'Đã đổi phòng'); setMoving(false); setTarget('') }}>Lưu</Button>
          </div>
          {!free.length && <p className="mt-2 text-xs text-red-700">Không còn phòng trống cùng hạng trong khoảng ngày này.</p>}
        </div>
      )}
      <div className="mt-auto text-xs text-stone-500">
        Nhật ký: {s.auditLogs.filter((a) => a.entityId === booking.id).slice(0, 3).map((a) => <div key={a.id}>{fmtDate(a.at, 'dd/MM HH:mm')} · {a.userName}: {a.action}</div>)}
        {!s.auditLogs.some((a) => a.entityId === booking.id) && <span>Chưa có.</span>}
      </div>
    </div>
  )
}
