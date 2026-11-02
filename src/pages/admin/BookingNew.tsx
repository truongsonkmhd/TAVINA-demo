import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Textarea, PageHeader, Table, Td, cx } from '@/components/ui'
import { vnd, today, addDaysISO, nights } from '@/lib/format'
import { pickRatePlan, stayTotal } from '@/lib/pricing'
import { minAvailability, freeRooms } from '@/lib/availability'
import { PAYMENT_LABEL, ROLE_LABEL } from '@/lib/labels'
import type { Channel, Guest, PaymentMethod } from '@/types'
import { addGroup, addOccupant } from '@/features/pms/actions'

type GuestType = 'retail' | 'group' | 'agent'
const phoneOk = (p: string) => /^(0|\+)\d{8,13}$/.test(p.replace(/[\s.]/g, ''))

export default function BookingNew() {
  const [sp] = useSearchParams()
  return sp.get('type') === 'group' ? <GroupForm /> : <SingleForm />
}

/** Ô chọn khách: tìm theo SĐT/tên, hoặc nhập khách mới */
function GuestPicker({ value, onChange }: { value: Partial<Guest>; onChange: (g: Partial<Guest>) => void }) {
  const guests = useStore((s) => s.guests)
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase().replace(/\s/g, '')
  const matches = term.length >= 2 ? guests.filter((g) => g.phone.replace(/\s/g, '').includes(term) || g.name.toLowerCase().replace(/\s/g, '').includes(term)).slice(0, 6) : []
  return (
    <div className="space-y-3">
      {!value.id && (
        <div className="relative">
          <Field label="Tìm khách cũ theo SĐT hoặc tên">
            <div className="relative"><Search size={16} className="absolute left-3 top-3 text-stone-400" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Gõ ít nhất 2 ký tự" /></div>
          </Field>
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-stone-200">
              {matches.map((g) => (
                <li key={g.id}><button type="button" onClick={() => { onChange(g); setQ('') }} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-stone-50">
                  <span><b>{g.name}</b> <span className="text-stone-500">{g.phone}</span></span><span className="text-xs text-stone-500">{g.idNumber ? 'Có giấy tờ' : 'Thiếu giấy tờ'}</span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
      )}
      {value.id && <div className="flex items-center justify-between rounded-md bg-sand px-3 py-2 text-sm"><span>Khách cũ: <b>{value.name}</b> · {value.phone}</span><button type="button" onClick={() => onChange({})} className="text-sea hover:underline">Đổi khách</button></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Họ tên" required><Input value={value.name ?? ''} onChange={(e) => onChange({ ...value, name: e.target.value })} /></Field>
        <Field label="Số điện thoại" required><Input value={value.phone ?? ''} onChange={(e) => onChange({ ...value, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={value.email ?? ''} onChange={(e) => onChange({ ...value, email: e.target.value })} /></Field>
        <Field label="Quốc tịch"><Input value={value.nationality ?? 'Việt Nam'} onChange={(e) => onChange({ ...value, nationality: e.target.value })} /></Field>
        <Field label="Loại giấy tờ"><Select value={value.idType ?? 'cccd'} onChange={(e) => onChange({ ...value, idType: e.target.value as Guest['idType'] })}><option value="cccd">CCCD</option><option value="passport">Hộ chiếu</option></Select></Field>
        <Field label="Số giấy tờ" hint="Bắt buộc khi check-in (khai báo lưu trú)"><Input value={value.idNumber ?? ''} onChange={(e) => onChange({ ...value, idNumber: e.target.value })} /></Field>
      </div>
    </div>
  )
}

function SingleForm() {
  const s = useStore()
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const presetRoom = s.rooms.find((r) => r.id === sp.get('roomId'))
  const presetGuest = s.guests.find((g) => g.id === sp.get('guestId'))
  const ci0 = sp.get('checkIn') && sp.get('checkIn')! >= today() ? sp.get('checkIn')! : today()
  const [f, setF] = useState({ checkIn: ci0, checkOut: addDaysISO(ci0, 1), adults: 2, children: 0, channel: 'front-desk' as Channel, guestType: 'retail' as GuestType })
  const [roomTypeId, setRoomTypeId] = useState(presetRoom?.roomTypeId ?? '')
  const [roomId, setRoomId] = useState(presetRoom?.id ?? '')
  const [guest, setGuest] = useState<Partial<Guest>>(presetGuest ?? {})
  const [discount, setDiscount] = useState(0)
  const [reason, setReason] = useState('')
  const [pay, setPay] = useState<{ method: PaymentMethod; amount: number }>({ method: 'cash', amount: 0 })
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string>()
  const limit = s.settings.discountLimits[s.currentUser.roleId] ?? 0
  const n = f.checkOut > f.checkIn ? nights(f.checkIn, f.checkOut) : 0

  const options = useMemo(() => {
    if (!n) return []
    const plan = pickRatePlan(s.ratePlans, f.channel, f.guestType) ?? pickRatePlan(s.ratePlans, f.channel)
    return s.roomTypes.map((rt) => {
      const st = plan ? stayTotal(plan, rt.id, f.checkIn, f.checkOut, Math.max(0, f.adults - rt.capacity)) : { total: rt.basePrice * n, perNight: [] }
      return { rt, plan, total: st.total, avg: Math.round(st.total / n), avail: minAvailability(s.rooms, s.bookings, rt.id, f.checkIn, f.checkOut), free: freeRooms(s.rooms, s.bookings, rt.id, f.checkIn, f.checkOut) }
    })
  }, [s.ratePlans, s.roomTypes, s.rooms, s.bookings, f, n])
  const chosen = options.find((o) => o.rt.id === roomTypeId)
  const total = chosen ? Math.round(chosen.total * (1 - discount / 100)) : 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(undefined)
    if (!n) return setErr('Ngày trả phòng phải sau ngày nhận phòng')
    if (!chosen) return setErr('Chọn hạng phòng')
    if (!guest.name?.trim() || !guest.phone || !phoneOk(guest.phone)) return setErr('Nhập họ tên và số điện thoại hợp lệ của khách')
    if (discount < 0 || discount > 100) return setErr('Chiết khấu phải từ 0 đến 100%')
    if (discount > limit && !reason.trim()) return setErr('Chiết khấu vượt hạn mức cần ghi lý do để quản lý duyệt')
    const g = s.upsertGuest({ ...guest, name: guest.name.trim(), phone: guest.phone } as Guest)
    const r = s.createBooking({ guestId: g.id, roomTypeId, roomId: roomId || undefined, checkIn: f.checkIn, checkOut: f.checkOut, adults: f.adults, children: f.children, source: f.channel, guestType: f.guestType, ratePlanId: chosen.plan?.id, discountPct: discount, discountReason: reason || undefined, note: note || undefined })
    if (r.error || !r.booking) return setErr(r.error)
    if (pay.amount > 0) s.addPayment({ bookingId: r.booking.id, date: today(), method: pay.method, amount: pay.amount, note: 'Đặt cọc khi tạo booking' })
    s.toast(`Đã tạo booking ${r.booking.code}`)
    navigate(`/admin/bookings/${r.booking.id}`)
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Booking mới — khách lẻ" subtitle="Tạo đặt phòng tại quầy hoặc qua điện thoại" actions={<Button type="button" tone="secondary" onClick={() => navigate('/admin/bookings/new?type=group')}>Chuyển sang booking đoàn</Button>} />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card title="1. Ngày & số khách">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nhận phòng"><Input type="date" value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value, checkOut: e.target.value >= f.checkOut ? addDaysISO(e.target.value, 1) : f.checkOut })} /></Field>
              <Field label="Trả phòng" hint={n ? `${n} đêm` : undefined}><Input type="date" min={addDaysISO(f.checkIn, 1)} value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Người lớn"><Input type="number" min={1} max={8} value={f.adults} onChange={(e) => setF({ ...f, adults: Number(e.target.value) })} /></Field>
                <Field label="Trẻ em"><Input type="number" min={0} max={6} value={f.children} onChange={(e) => setF({ ...f, children: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Kênh"><Select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value as Channel })}><option value="front-desk">Lễ tân / điện thoại</option><option value="partner">Đối tác / đại lý</option></Select></Field>
              <Field label="Loại khách"><Select value={f.guestType} onChange={(e) => setF({ ...f, guestType: e.target.value as GuestType })}><option value="retail">Khách lẻ</option><option value="agent">Đại lý</option></Select></Field>
            </div>
          </Card>

          <Card title="2. Chọn phòng">
            <Table head={['Hạng', 'Giá TB/đêm', 'Tổng', 'Còn', '']}>
              {options.map((o) => (
                <tr key={o.rt.id} className={cx(roomTypeId === o.rt.id && 'bg-sand/60')}>
                  <Td><b>{o.rt.name}</b><div className="text-xs text-stone-500">{o.plan?.name ?? 'Giá cơ bản'} · tối đa {o.rt.capacity} khách</div></Td>
                  <Td className="tnum">{vnd(o.avg)}</Td>
                  <Td className="tnum font-semibold">{vnd(o.total)}</Td>
                  <Td className={cx('tnum font-semibold', o.avail <= 0 ? 'text-red-600' : o.avail <= 2 ? 'text-amber-700' : 'text-emerald-700')}>{o.avail}</Td>
                  <Td>{o.avail > 0 ? <Button type="button" size="sm" tone={roomTypeId === o.rt.id ? 'primary' : 'secondary'} onClick={() => { setRoomTypeId(o.rt.id); setRoomId(o.free[0]?.id ?? '') }}>{roomTypeId === o.rt.id ? 'Đã chọn' : 'Chọn'}</Button> : <span className="text-xs text-red-600">Hết phòng</span>}</Td>
                </tr>
              ))}
            </Table>
            {chosen && (
              <div className="mt-3 max-w-xs">
                <Field label="Phòng cụ thể" hint={`${chosen.free.length} phòng trống cùng hạng`}>
                  <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                    <option value="">Để hệ thống xếp sau</option>
                    {chosen.free.map((r) => <option key={r.id} value={r.id}>Phòng {r.number} (tầng {r.floor})</option>)}
                  </Select>
                </Field>
              </div>
            )}
            {chosen && f.adults > chosen.rt.capacity && <p className="mt-2 flex items-center gap-1 text-sm text-amber-700"><AlertTriangle size={14} />Vượt sức chứa {chosen.rt.capacity} khách — đã tính phụ thu người thêm.</p>}
          </Card>

          <Card title="3. Khách đặt"><GuestPicker value={guest} onChange={setGuest} /></Card>
        </div>

        <div className="space-y-4">
          <Card title="Chiết khấu & thanh toán">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Chiết khấu (%)" hint={`Hạn mức ${ROLE_LABEL[s.currentUser.roleId]}: ${limit}%`}><Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></Field>
              <Field label="Lý do chiết khấu"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: khách quen" /></Field>
            </div>
            {discount > limit && <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-800">Vượt hạn mức {limit}% — booking sẽ ở trạng thái <b>chờ quản lý duyệt chiết khấu</b>.</p>}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Thu cọc"><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as PaymentMethod })}>{(['cash', 'transfer', 'card'] as PaymentMethod[]).map((m) => <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>)}</Select></Field>
              <Field label="Số tiền cọc"><Input type="number" min={0} step={50000} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })} /></Field>
            </div>
            <div className="mt-3"><Field label="Ghi chú"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>
          </Card>
          <Card title="Tóm tắt">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Hạng phòng</dt><dd className="font-semibold">{chosen?.rt.name ?? '—'}{roomId ? ` · ${s.rooms.find((r) => r.id === roomId)?.number}` : ''}</dd></div>
              <div className="flex justify-between"><dt>Số đêm</dt><dd className="tnum">{n}</dd></div>
              <div className="flex justify-between"><dt>Tiền phòng</dt><dd className="tnum">{vnd(chosen?.total ?? 0)}</dd></div>
              {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Chiết khấu {discount}%</dt><dd className="tnum">−{vnd((chosen?.total ?? 0) - total)}</dd></div>}
              <div className="flex justify-between border-t border-stone-100 pt-2 text-base font-bold"><dt>Tổng</dt><dd className="tnum">{vnd(total)}</dd></div>
            </dl>
            {err && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700" role="alert">{err}</p>}
            <Button type="submit" size="lg" className="mt-4 w-full">Tạo booking</Button>
          </Card>
        </div>
      </div>
    </form>
  )
}

function GroupForm() {
  const s = useStore()
  const navigate = useNavigate()
  const [g, setG] = useState({ name: '', contactName: '', contactPhone: '', deposit: 0, dueDate: addDaysISO(today(), 7), invoiceMode: 'merged' as 'merged' | 'split', note: '' })
  const [dates, setDates] = useState({ checkIn: addDaysISO(today(), 7), checkOut: addDaysISO(today(), 9) })
  const [qty, setQty] = useState<Record<string, number>>({})
  const [rooming, setRooming] = useState('')
  const [err, setErr] = useState<string>()
  const n = dates.checkOut > dates.checkIn ? nights(dates.checkIn, dates.checkOut) : 0
  const plan = pickRatePlan(s.ratePlans, 'front-desk', 'group')
  const rows = s.roomTypes.map((rt) => ({ rt, avail: n ? minAvailability(s.rooms, s.bookings, rt.id, dates.checkIn, dates.checkOut) : 0, total: plan && n ? stayTotal(plan, rt.id, dates.checkIn, dates.checkOut).total : 0 }))
  const shortages = rows.filter((r) => (qty[r.rt.id] ?? 0) > r.avail)
  const totalRooms = rows.reduce((x, r) => x + (qty[r.rt.id] ?? 0), 0)
  const grand = rows.reduce((x, r) => x + (qty[r.rt.id] ?? 0) * r.total, 0)
  const roomingLines = rooming.split('\n').map((l) => l.split(/\t|,|;/).map((c) => c.trim())).filter((c) => c[0])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(undefined)
    if (!g.name.trim() || !g.contactName.trim() || !phoneOk(g.contactPhone)) return setErr('Nhập tên đoàn, người liên hệ và SĐT hợp lệ')
    if (!n) return setErr('Ngày trả phòng phải sau ngày nhận phòng')
    if (!totalRooms) return setErr('Chọn số phòng cho đoàn')
    if (shortages.length) return setErr(`Không đủ phòng: ${shortages.map((r) => `thiếu ${(qty[r.rt.id] ?? 0) - r.avail} phòng ${r.rt.name}`).join(', ')}`)
    const contact = s.upsertGuest({ name: g.contactName.trim(), phone: g.contactPhone })
    const group = addGroup({ name: g.name.trim(), contactName: g.contactName.trim(), contactPhone: g.contactPhone, deposit: g.deposit, dueDate: g.dueDate, invoiceMode: g.invoiceMode, note: g.note || undefined })
    const created: string[] = []
    for (const r of rows) {
      const free = freeRooms(useStore.getState().rooms, useStore.getState().bookings, r.rt.id, dates.checkIn, dates.checkOut)
      for (let i = 0; i < (qty[r.rt.id] ?? 0); i++) {
        const res = useStore.getState().createBooking({ guestId: contact.id, roomTypeId: r.rt.id, roomId: free[i]?.id, checkIn: dates.checkIn, checkOut: dates.checkOut, adults: Math.min(2, r.rt.capacity), source: 'front-desk', guestType: 'group', groupId: group.id, ratePlanId: plan?.id })
        if (res.error || !res.booking) return setErr(res.error)
        created.push(res.booking.id)
      }
    }
    // Rooming list: mỗi dòng "Họ tên, SĐT, Số giấy tờ" gán lần lượt vào các phòng
    roomingLines.forEach((cols, i) => {
      const bid = created[i % created.length]
      addOccupant(bid, { name: cols[0], phone: cols[1] || `rl-${Date.now()}-${i}`, idNumber: cols[2] || undefined })
    })
    if (g.deposit > 0) s.addPayment({ bookingId: created[0], date: today(), method: 'transfer', amount: g.deposit, note: `Cọc đoàn ${g.name}` })
    s.toast(`Đã tạo đoàn ${g.name} với ${created.length} phòng`)
    navigate(`/admin/bookings/${created[0]}`)
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Booking đoàn" subtitle="Nhiều phòng, một hợp đồng, giá đoàn" actions={<Button type="button" tone="secondary" onClick={() => navigate('/admin/bookings/new')}>Chuyển sang khách lẻ</Button>} />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card title="Thông tin đoàn">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Tên đoàn / đơn vị" required><Input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} placeholder="VD: Đoàn Công ty X — hội nghị" /></Field></div>
              <Field label="Người liên hệ" required><Input value={g.contactName} onChange={(e) => setG({ ...g, contactName: e.target.value })} /></Field>
              <Field label="SĐT liên hệ" required><Input value={g.contactPhone} onChange={(e) => setG({ ...g, contactPhone: e.target.value })} /></Field>
              <Field label="Nhận phòng"><Input type="date" value={dates.checkIn} onChange={(e) => setDates({ checkIn: e.target.value, checkOut: e.target.value >= dates.checkOut ? addDaysISO(e.target.value, 1) : dates.checkOut })} /></Field>
              <Field label="Trả phòng" hint={n ? `${n} đêm` : undefined}><Input type="date" value={dates.checkOut} onChange={(e) => setDates({ ...dates, checkOut: e.target.value })} /></Field>
            </div>
          </Card>
          <Card title="Số phòng theo hạng" actions={<span className="text-xs text-stone-500">Giá: {plan?.name ?? '—'}</span>}>
            <Table head={['Hạng', 'Còn trống', 'Giá/phòng cả kỳ', 'Số phòng']}>
              {rows.map((r) => (
                <tr key={r.rt.id}>
                  <Td className="font-semibold">{r.rt.name}</Td>
                  <Td className="tnum">{r.avail}</Td>
                  <Td className="tnum">{vnd(r.total)}</Td>
                  <Td><Input type="number" min={0} max={24} className={cx('w-24', (qty[r.rt.id] ?? 0) > r.avail && 'border-red-500')} value={qty[r.rt.id] ?? 0} onChange={(e) => setQty({ ...qty, [r.rt.id]: Number(e.target.value) })} />
                    {(qty[r.rt.id] ?? 0) > r.avail && <div className="mt-1 text-xs text-red-600">Thiếu {(qty[r.rt.id] ?? 0) - r.avail} phòng</div>}</Td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title="Rooming list (tuỳ chọn)">
            <p className="text-sm text-stone-600">Dán từ Excel: mỗi dòng <code>Họ tên ⇥ SĐT ⇥ Số giấy tờ</code>. Khách được gán lần lượt vào các phòng.</p>
            <Textarea rows={5} className="mt-2 font-mono text-xs" value={rooming} onChange={(e) => setRooming(e.target.value)} placeholder={'Nguyễn Văn A\t0905111222\t079123456789\nTrần Thị B\t0905333444\t079987654321'} />
            {roomingLines.length > 0 && <p className="mt-1 text-xs text-stone-500">{roomingLines.length} khách sẽ được thêm vào {Math.min(totalRooms, roomingLines.length)} phòng</p>}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Hợp đồng & thanh toán">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tiền cọc"><Input type="number" min={0} step={100000} value={g.deposit} onChange={(e) => setG({ ...g, deposit: Number(e.target.value) })} /></Field>
              <Field label="Hạn thanh toán"><Input type="date" value={g.dueDate} onChange={(e) => setG({ ...g, dueDate: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Hoá đơn"><Select value={g.invoiceMode} onChange={(e) => setG({ ...g, invoiceMode: e.target.value as 'merged' | 'split' })}><option value="merged">Gộp — một hoá đơn cho đơn vị</option><option value="split">Tách — từng phòng tự thanh toán phụ thu</option></Select></Field></div>
              <div className="sm:col-span-2"><Field label="Ghi chú"><Textarea rows={2} value={g.note} onChange={(e) => setG({ ...g, note: e.target.value })} /></Field></div>
            </div>
          </Card>
          <Card title="Tóm tắt">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Số phòng</dt><dd className="tnum font-semibold">{totalRooms}</dd></div>
              <div className="flex justify-between"><dt>Số đêm</dt><dd className="tnum">{n}</dd></div>
              <div className="flex justify-between border-t border-stone-100 pt-2 text-base font-bold"><dt>Tổng tiền phòng</dt><dd className="tnum">{vnd(grand)}</dd></div>
              <div className="flex justify-between text-stone-600"><dt>Cọc ({grand ? Math.round((g.deposit / grand) * 100) : 0}%)</dt><dd className="tnum">{vnd(g.deposit)}</dd></div>
            </dl>
            {err && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700" role="alert">{err}</p>}
            <Button type="submit" size="lg" className="mt-4 w-full">Tạo booking đoàn</Button>
          </Card>
        </div>
      </div>
    </form>
  )
}
