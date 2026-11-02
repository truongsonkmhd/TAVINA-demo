import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LogIn, LogOut, XCircle, UserX, BedDouble, CalendarPlus, Receipt, Trash2, UserPlus, AlertTriangle, Check, X } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty } from '@/components/ui'
import { vnd, fmtDate, fmtDateTime, nights, today, addDaysISO } from '@/lib/format'
import { freeRooms } from '@/lib/availability'
import { PAYMENT_LABEL, ROOM_STATUS_LABEL } from '@/lib/labels'
import type { FolioLineType, Guest, PaymentMethod } from '@/types'
import { addOccupant, removeOccupant, updateBooking, updateGuest, approveDiscount } from '@/features/pms/actions'
import { StatusBadge, ChannelTag, usePerm, useRun, bookingTotal } from '@/features/pms/components/common'

const LINE_LABEL: Record<FolioLineType, string> = { room: 'Tiền phòng', service: 'Dịch vụ', minibar: 'Minibar', surcharge: 'Phụ thu', discount: 'Giảm giá' }

export default function BookingDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const s = useStore()
  const perm = usePerm()
  const run = useRun()
  const b = s.bookings.find((x) => x.id === id)
  const [modal, setModal] = useState<'guest' | 'occupant' | 'move' | 'extend' | 'line' | 'pay' | undefined>()
  if (!b) return <Empty title="Không tìm thấy booking" action={<Link to="/admin/bookings" className="text-sea hover:underline">Về danh sách</Link>} />

  const guest = s.guests.find((g) => g.id === b.guestId)!
  const occupants = b.occupantIds.map((gid) => s.guests.find((g) => g.id === gid)).filter(Boolean) as Guest[]
  const room = s.rooms.find((r) => r.id === b.roomId)
  const rt = s.roomTypes.find((r) => r.id === b.roomTypeId)
  const group = b.groupId ? s.groups.find((g) => g.id === b.groupId) : undefined
  const groupBookings = group ? s.bookings.filter((x) => x.groupId === group.id) : []
  const lines = s.folioLines.filter((f) => f.bookingId === b.id).sort((a, c) => a.date.localeCompare(c.date))
  const pays = s.payments.filter((p) => p.bookingId === b.id)
  const folioTotal = lines.reduce((x, f) => x + f.amount, 0)
  const total = bookingTotal(b, folioTotal)
  const paid = pays.reduce((x, p) => x + p.amount, 0)
  const logs = s.auditLogs.filter((l) => l.entityId === b.id)
  const canEdit = perm('bookings', 'edit') && !['checked-out', 'cancelled', 'expired'].includes(b.status)
  const canApprove = perm('rates', 'approve') || perm('bookings', 'approve')
  const missingId = occupants.filter((g) => !g.idNumber)

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-ink"><ArrowLeft size={16} /> Quay lại</button>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold">{b.code}</h1>
            <StatusBadge status={b.status} /><ChannelTag channel={b.source} />
            {b.overbooked && <Badge tone="err">Overbooked</Badge>}
            {b.discountStatus === 'pending' && <Badge tone="warn">Chờ duyệt CK {b.discountPct}%</Badge>}
          </div>
          <p className="mt-1 text-sm text-stone-600">Tạo {fmtDateTime(b.createdAt)}{b.otaRef ? ` · Mã OTA ${b.otaRef}` : ''}</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {b.status === 'confirmed' && <Button onClick={() => run(s.checkIn(b.id), `Đã check-in ${b.code}`)}><LogIn size={16} /> Check-in</Button>}
            {b.status === 'checked-in' && <Button onClick={() => run(s.checkOut(b.id), `Đã check-out ${b.code}`)}><LogOut size={16} /> Check-out</Button>}
            <Button tone="secondary" onClick={() => setModal('move')}><BedDouble size={16} /> {room ? 'Đổi phòng' : 'Xếp phòng'}</Button>
            <Button tone="secondary" onClick={() => setModal('extend')}><CalendarPlus size={16} /> Đổi ngày / gia hạn</Button>
            {['confirmed', 'hold'].includes(b.status) && <Button tone="ghost" onClick={() => { if (confirm(`Huỷ booking ${b.code}?`)) { s.setBookingStatus(b.id, 'cancelled'); s.toast('Đã huỷ booking', 'warn') } }}><XCircle size={16} /> Huỷ</Button>}
            {b.status === 'confirmed' && b.checkIn <= today() && <Button tone="ghost" onClick={() => { if (confirm('Đánh dấu khách không đến?')) s.setBookingStatus(b.id, 'no-show') }}><UserX size={16} /> No-show</Button>}
          </div>
        )}
      </div>

      {b.discountStatus === 'pending' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
          <span><AlertTriangle size={16} className="mr-1 inline text-amber-600" />Chiết khấu <b>{b.discountPct}%</b> vượt hạn mức, lý do: “{b.discountReason ?? '—'}”.</span>
          {canApprove ? <span className="flex gap-2"><Button size="sm" onClick={() => approveDiscount(b.id, true)}><Check size={14} /> Duyệt</Button><Button size="sm" tone="secondary" onClick={() => approveDiscount(b.id, false)}><X size={14} /> Từ chối</Button></span>
            : <span className="text-amber-800">Chờ quản lý duyệt</span>}
        </div>
      )}
      {b.overbooked && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">Booking bị overbooked — chưa có phòng trống. Xếp sang phòng khác, đổi ngày hoặc liên hệ khách/OTA để xử lý.</div>}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <Card title="Lưu trú">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-stone-500">Nhận phòng</dt><dd className="font-semibold">{fmtDate(b.checkIn, 'EEE dd/MM/yyyy')}</dd></div>
              <div><dt className="text-stone-500">Trả phòng</dt><dd className="font-semibold">{fmtDate(b.checkOut, 'EEE dd/MM/yyyy')}</dd></div>
              <div><dt className="text-stone-500">Phòng</dt><dd className="font-semibold">{room ? `${room.number} · ${ROOM_STATUS_LABEL[room.status]}` : <span className="text-red-600">Chưa xếp</span>}</dd></div>
              <div><dt className="text-stone-500">Hạng</dt><dd>{rt?.name} · {nights(b.checkIn, b.checkOut)} đêm</dd></div>
              <div><dt className="text-stone-500">Khách</dt><dd>{b.adults} người lớn{b.children ? `, ${b.children} trẻ em` : ''}</dd></div>
              <div><dt className="text-stone-500">Giá TB/đêm</dt><dd className="tnum">{vnd(b.nightlyRate)}{b.discountPct && b.discountStatus === 'approved' ? ` (−${b.discountPct}%)` : ''}</dd></div>
            </dl>
            <div className="mt-3"><Field label="Ghi chú"><Textarea rows={2} defaultValue={b.note} disabled={!canEdit} onBlur={(e) => e.target.value !== (b.note ?? '') && updateBooking(b.id, { note: e.target.value })} /></Field></div>
          </Card>

          <Card title="Khách đặt" actions={canEdit && <Button size="sm" tone="ghost" onClick={() => setModal('guest')}>Sửa</Button>}>
            <div className="text-sm">
              <div className="font-semibold">{guest.name}</div>
              <div className="text-stone-600">{guest.phone}{guest.email ? ` · ${guest.email}` : ''}</div>
              <div className="text-stone-600">{guest.idType === 'passport' ? 'Hộ chiếu' : 'CCCD'}: {guest.idNumber ?? <span className="text-red-600">chưa có</span>} · {guest.nationality}</div>
              {guest.company && <div className="mt-1 text-stone-600">Xuất HĐ: {guest.company.name} · MST {guest.company.taxCode}</div>}
            </div>
          </Card>

          <Card title={`Khách lưu trú (${occupants.length})`} actions={canEdit && <Button size="sm" tone="ghost" onClick={() => setModal('occupant')}><UserPlus size={14} /> Thêm</Button>}>
            {missingId.length > 0 && <p className="mb-2 text-xs text-red-600">{missingId.length} khách thiếu số giấy tờ — cần bổ sung trước khi check-in (khai báo lưu trú).</p>}
            <ul className="divide-y divide-stone-100 text-sm">
              {occupants.map((g) => (
                <li key={g.id} className="flex items-center justify-between py-2">
                  <span><b>{g.name}</b> <span className="text-stone-500">· {g.nationality} · {g.idNumber ?? <span className="text-red-600">thiếu giấy tờ</span>}</span></span>
                  {canEdit && g.id !== b.guestId && <button onClick={() => removeOccupant(b.id, g.id)} className="text-stone-400 hover:text-red-600" aria-label={`Bỏ ${g.name}`}><Trash2 size={14} /></button>}
                </li>
              ))}
            </ul>
          </Card>

          {group && (
            <Card title={`Đoàn: ${group.name}`}>
              <p className="text-sm text-stone-600">Liên hệ {group.contactName} · {group.contactPhone} · cọc {vnd(group.deposit)} · hạn {fmtDate(group.dueDate)} · hoá đơn {group.invoiceMode === 'merged' ? 'gộp' : 'tách'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {groupBookings.map((x) => <Link key={x.id} to={`/admin/bookings/${x.id}`} className={`rounded border px-2 py-1 text-xs ${x.id === b.id ? 'border-sea bg-sand font-semibold' : 'border-stone-200 hover:border-sea'}`}>{s.rooms.find((r) => r.id === x.roomId)?.number ?? 'Chưa xếp'} · {x.code.slice(-4)}</Link>)}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Folio" actions={<div className="flex gap-2">
            {canEdit && <Button size="sm" tone="ghost" onClick={() => setModal('line')}>+ Thêm dòng</Button>}
            {perm('invoices', 'create') && lines.length > 0 && <Button size="sm" onClick={() => navigate(`/admin/invoices?booking=${b.id}`)}><Receipt size={14} /> Phát hành hoá đơn</Button>}
          </div>}>
            {lines.length === 0 ? <p className="text-sm text-stone-500">Folio tiền phòng được tạo khi check-in. Dự kiến: <b className="tnum">{vnd(total)}</b></p> : (
              <Table head={['Ngày', 'Loại', 'Mô tả', 'SL', 'Đơn giá', 'Thành tiền', 'HĐ']}>
                {lines.map((l) => (
                  <tr key={l.id}>
                    <Td className="whitespace-nowrap">{fmtDate(l.date, 'dd/MM')}</Td><Td>{LINE_LABEL[l.type]}</Td><Td>{l.description}</Td>
                    <Td className="tnum">{l.qty}</Td><Td className="tnum text-right">{vnd(l.unitPrice)}</Td>
                    <Td className={`tnum text-right font-medium ${l.amount < 0 ? 'text-emerald-700' : ''}`}>{vnd(l.amount)}</Td>
                    <Td>{l.invoiceId ? <Badge tone="ok">Đã xuất</Badge> : ''}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>

          <Card title="Thanh toán" actions={canEdit || b.status === 'checked-out' ? <Button size="sm" tone="ghost" onClick={() => setModal('pay')}>+ Thu tiền</Button> : undefined}>
            {pays.length === 0 ? <p className="text-sm text-stone-500">Chưa có thanh toán.</p> : (
              <ul className="divide-y divide-stone-100 text-sm">
                {pays.map((p) => <li key={p.id} className="flex justify-between py-2"><span>{fmtDate(p.date)} · {PAYMENT_LABEL[p.method]}{p.note ? <span className="text-stone-500"> · {p.note}</span> : ''}</span><span className="tnum font-semibold">{vnd(p.amount)}</span></li>)}
              </ul>
            )}
            <dl className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
              <div className="flex justify-between"><dt>Tổng phải thu</dt><dd className="tnum font-semibold">{vnd(total)}</dd></div>
              <div className="flex justify-between"><dt>Đã thu</dt><dd className="tnum">{vnd(paid)}</dd></div>
              <div className={`flex justify-between text-base font-bold ${total - paid > 0 ? 'text-red-600' : 'text-emerald-700'}`}><dt>{total - paid >= 0 ? 'Còn lại' : 'Thừa'}</dt><dd className="tnum">{vnd(Math.abs(total - paid))}</dd></div>
            </dl>
          </Card>

          <Card title="Nhật ký">
            {logs.length === 0 ? <p className="text-sm text-stone-500">Chưa có thao tác.</p> : (
              <ul className="space-y-2 text-sm">
                {logs.slice(0, 12).map((l) => <li key={l.id} className="flex gap-3"><span className="tnum shrink-0 text-xs text-stone-500">{fmtDateTime(l.at)}</span><span><b>{l.userName}</b> — {l.action}</span></li>)}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {modal === 'guest' && <GuestModal guest={guest} onClose={() => setModal(undefined)} />}
      {modal === 'occupant' && <OccupantModal bookingId={b.id} onClose={() => setModal(undefined)} />}
      {modal === 'move' && <MoveModal bookingId={b.id} onClose={() => setModal(undefined)} />}
      {modal === 'extend' && <ExtendModal bookingId={b.id} onClose={() => setModal(undefined)} />}
      {modal === 'line' && <LineModal bookingId={b.id} onClose={() => setModal(undefined)} />}
      {modal === 'pay' && <PayModal bookingId={b.id} remaining={Math.max(0, total - paid)} onClose={() => setModal(undefined)} />}
    </div>
  )
}

function GuestModal({ guest, onClose }: { guest: Guest; onClose: () => void }) {
  const [g, setG] = useState({ ...guest, coName: guest.company?.name ?? '', coTax: guest.company?.taxCode ?? '', coAddr: guest.company?.address ?? '' })
  const save = () => {
    updateGuest(guest.id, { name: g.name, phone: g.phone, email: g.email, idType: g.idType, idNumber: g.idNumber || undefined, nationality: g.nationality, dob: g.dob, address: g.address,
      company: g.coName ? { name: g.coName, taxCode: g.coTax, address: g.coAddr, email: g.email } : undefined })
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Sửa thông tin khách" wide footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Họ tên"><Input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></Field>
        <Field label="SĐT"><Input value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={g.email ?? ''} onChange={(e) => setG({ ...g, email: e.target.value })} /></Field>
        <Field label="Quốc tịch"><Input value={g.nationality} onChange={(e) => setG({ ...g, nationality: e.target.value })} /></Field>
        <Field label="Loại giấy tờ"><Select value={g.idType ?? 'cccd'} onChange={(e) => setG({ ...g, idType: e.target.value as Guest['idType'] })}><option value="cccd">CCCD</option><option value="passport">Hộ chiếu</option></Select></Field>
        <Field label="Số giấy tờ"><Input value={g.idNumber ?? ''} onChange={(e) => setG({ ...g, idNumber: e.target.value })} /></Field>
        <Field label="Ngày sinh"><Input type="date" value={g.dob ?? ''} onChange={(e) => setG({ ...g, dob: e.target.value })} /></Field>
        <Field label="Địa chỉ"><Input value={g.address ?? ''} onChange={(e) => setG({ ...g, address: e.target.value })} /></Field>
        <Field label="Công ty xuất HĐ"><Input value={g.coName} onChange={(e) => setG({ ...g, coName: e.target.value })} /></Field>
        <Field label="Mã số thuế"><Input value={g.coTax} onChange={(e) => setG({ ...g, coTax: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Địa chỉ công ty"><Input value={g.coAddr} onChange={(e) => setG({ ...g, coAddr: e.target.value })} /></Field></div>
      </div>
    </Modal>
  )
}

function OccupantModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const [g, setG] = useState({ name: '', phone: '', idType: 'cccd' as Guest['idType'], idNumber: '', nationality: 'Việt Nam', dob: '', gender: '' as Guest['gender'] | '' })
  const [err, setErr] = useState<string>()
  const save = () => {
    if (!g.name.trim() || !g.idNumber.trim()) return setErr('Nhập họ tên và số giấy tờ')
    addOccupant(bookingId, { name: g.name.trim(), phone: g.phone.trim() || `occ-${Date.now()}`, idType: g.idType, idNumber: g.idNumber.trim(), nationality: g.nationality, dob: g.dob || undefined, gender: (g.gender || undefined) as Guest['gender'] })
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Thêm khách lưu trú" footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Thêm</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Họ tên" required><Input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} /></Field>
        <Field label="SĐT"><Input value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} /></Field>
        <Field label="Loại giấy tờ"><Select value={g.idType} onChange={(e) => setG({ ...g, idType: e.target.value as Guest['idType'] })}><option value="cccd">CCCD</option><option value="passport">Hộ chiếu</option></Select></Field>
        <Field label="Số giấy tờ" required><Input value={g.idNumber} onChange={(e) => setG({ ...g, idNumber: e.target.value })} /></Field>
        <Field label="Quốc tịch"><Input value={g.nationality} onChange={(e) => setG({ ...g, nationality: e.target.value })} /></Field>
        <Field label="Ngày sinh"><Input type="date" value={g.dob} onChange={(e) => setG({ ...g, dob: e.target.value })} /></Field>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </Modal>
  )
}

function MoveModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const s = useStore()
  const run = useRun()
  const b = s.bookings.find((x) => x.id === bookingId)!
  const [typeId, setTypeId] = useState(b.roomTypeId)
  const free = freeRooms(s.rooms, s.bookings, typeId, b.checkIn, b.checkOut, b.id)
  const [roomId, setRoomId] = useState(free[0]?.id ?? '')
  return (
    <Modal open onClose={onClose} title="Xếp / đổi phòng" footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button disabled={!roomId} onClick={() => { if (run(s.moveBooking(b.id, roomId, b.checkIn, b.checkOut), 'Đã đổi phòng')) onClose() }}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Hạng phòng" hint={typeId !== b.roomTypeId ? 'Đổi hạng: giá giữ nguyên, điều chỉnh qua folio nếu cần' : undefined}><Select value={typeId} onChange={(e) => { setTypeId(e.target.value); setRoomId('') }}>{s.roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
        <Field label={`Phòng trống (${free.length})`}><Select value={roomId} onChange={(e) => setRoomId(e.target.value)}><option value="">— Chọn —</option>{free.map((r) => <option key={r.id} value={r.id}>{r.number} · {ROOM_STATUS_LABEL[r.status]}</option>)}</Select></Field>
      </div>
      {free.length === 0 && <p className="mt-3 text-sm text-red-600">Không còn phòng trống hạng này trong khoảng ngày của booking.</p>}
    </Modal>
  )
}

function ExtendModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const s = useStore()
  const run = useRun()
  const b = s.bookings.find((x) => x.id === bookingId)!
  const [ci, setCi] = useState(b.checkIn)
  const [co, setCo] = useState(b.checkOut)
  const locked = b.status === 'checked-in'
  return (
    <Modal open onClose={onClose} title="Đổi ngày / gia hạn" footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={() => { if (run(s.moveBooking(b.id, b.roomId, ci, co), 'Đã cập nhật ngày lưu trú')) onClose() }}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nhận phòng" hint={locked ? 'Khách đã nhận phòng' : undefined}><Input type="date" value={ci} disabled={locked} onChange={(e) => setCi(e.target.value)} /></Field>
        <Field label="Trả phòng" hint={`${nights(ci, co)} đêm`}><Input type="date" min={addDaysISO(ci, 1)} value={co} onChange={(e) => setCo(e.target.value)} /></Field>
      </div>
      <p className="mt-3 text-xs text-stone-500">Nếu phòng hiện tại đã có khách khác trong ngày mới, hệ thống sẽ báo xung đột — hãy đổi phòng trước.</p>
    </Modal>
  )
}

function LineModal({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const s = useStore()
  const [l, setL] = useState({ type: 'service' as FolioLineType, description: '', qty: 1, unitPrice: 0 })
  const save = () => {
    if (!l.description.trim() || !l.unitPrice) return
    const sign = l.type === 'discount' ? -1 : 1
    s.addFolioLine({ bookingId, date: today(), type: l.type, description: l.description.trim(), qty: l.qty, unitPrice: sign * Math.abs(l.unitPrice), amount: sign * Math.abs(l.unitPrice) * l.qty })
    s.audit(`Thêm folio: ${l.description}`, 'booking', bookingId, undefined, l)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Thêm dòng folio" footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Thêm</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Loại"><Select value={l.type} onChange={(e) => setL({ ...l, type: e.target.value as FolioLineType })}>{(['service', 'minibar', 'surcharge', 'discount'] as FolioLineType[]).map((t) => <option key={t} value={t}>{LINE_LABEL[t]}</option>)}</Select></Field>
        <Field label="Mô tả"><Input value={l.description} onChange={(e) => setL({ ...l, description: e.target.value })} placeholder="VD: Giặt ủi, ăn tối, nhận phòng sớm" /></Field>
        <Field label="Số lượng"><Input type="number" min={1} value={l.qty} onChange={(e) => setL({ ...l, qty: Number(e.target.value) })} /></Field>
        <Field label="Đơn giá"><Input type="number" min={0} step={5000} value={l.unitPrice} onChange={(e) => setL({ ...l, unitPrice: Number(e.target.value) })} /></Field>
      </div>
      <p className="mt-3 text-sm">Thành tiền: <b className="tnum">{vnd((l.type === 'discount' ? -1 : 1) * l.qty * l.unitPrice)}</b></p>
    </Modal>
  )
}

function PayModal({ bookingId, remaining, onClose }: { bookingId: string; remaining: number; onClose: () => void }) {
  const s = useStore()
  const perm = usePerm()
  const [p, setP] = useState({ method: 'cash' as PaymentMethod, amount: remaining, note: '' })
  const methods: PaymentMethod[] = ['cash', 'transfer', 'card', 'ota', ...(perm('invoices', 'create') || perm('bookings', 'approve') ? ['debt' as PaymentMethod] : [])]
  return (
    <Modal open onClose={onClose} title="Thu tiền" footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button disabled={p.amount <= 0} onClick={() => { s.addPayment({ bookingId, date: today(), method: p.method, amount: p.amount, note: p.note || undefined }); s.toast(`Đã thu ${vnd(p.amount)}`); onClose() }}>Ghi nhận</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phương thức" hint={p.method === 'debt' ? 'Ghi công nợ cho đoàn/đại lý (theo dõi ở Hoá đơn & công nợ)' : undefined}><Select value={p.method} onChange={(e) => setP({ ...p, method: e.target.value as PaymentMethod })}>{methods.map((m) => <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>)}</Select></Field>
        <Field label="Số tiền" hint={`Còn lại ${vnd(remaining)}`}><Input type="number" min={0} step={10000} value={p.amount} onChange={(e) => setP({ ...p, amount: Number(e.target.value) })} /></Field>
        <div className="sm:col-span-2"><Field label="Ghi chú"><Input value={p.note} onChange={(e) => setP({ ...p, note: e.target.value })} /></Field></div>
      </div>
    </Modal>
  )
}
