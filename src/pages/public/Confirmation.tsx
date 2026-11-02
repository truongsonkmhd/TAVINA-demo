import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, CalendarPlus, MessageCircle, ClipboardList, AlertTriangle, MapPin, Phone } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui'
import { vnd, fmtDate, nights } from '@/lib/format'
import { BOOKING_STATUS_LABEL } from '@/lib/labels'
import type { Booking } from '@/types'
import { Container, FakeQR } from '@/features/public/components/Shared'
import { ROOM_IMG, Steps } from '@/features/public/hotel'

const icsDate = (d: string, time: string) => `${d.replace(/-/g, '')}T${time.replace(':', '')}00`

export default function Confirmation() {
  const { bookingId = '' } = useParams()
  const [sp] = useSearchParams()
  const allBookings = useStore((s) => s.bookings)
  const guests = useStore((s) => s.guests)
  const roomTypes = useStore((s) => s.roomTypes)
  const payments = useStore((s) => s.payments)
  const combos = useStore((s) => s.combos)
  const settings = useStore((s) => s.settings)

  const ids = [bookingId, ...(sp.get('also')?.split(',').filter(Boolean) ?? [])]
  const items = ids.map((id) => allBookings.find((b) => b.id === id)).filter(Boolean) as Booking[]
  const main = items[0]
  if (!main) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy đơn đặt phòng</h1>
        <Link to="/tai-khoan" className="mt-4 inline-block font-semibold text-sea hover:underline">Xem đơn của tôi</Link>
      </Container>
    )
  }
  const guest = guests.find((g) => g.id === main.guestId)
  const n = nights(main.checkIn, main.checkOut)
  const paid = payments.filter((p) => ids.includes(p.bookingId)).reduce((s, p) => s + p.amount, 0)
  const totalOf = (b: Booking) => {
    const combo = b.comboId ? combos.find((c) => c.id === b.comboId) : undefined
    const base = combo ? combo.comboPrice : b.nightlyRate * n
    return Math.round(base * (1 - (b.discountStatus === 'approved' ? b.discountPct : 0) / 100))
  }
  const total = items.reduce((s, b) => s + totalOf(b), 0)
  const overbooked = items.some((b) => b.overbooked)
  const ok = items.every((b) => b.status === 'confirmed' || b.status === 'checked-in')

  const addToCalendar = () => {
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TAVINA//Booking//VI', 'BEGIN:VEVENT', `UID:${main.code}@tavina.vn`,
      `DTSTART:${icsDate(main.checkIn, settings.checkInTime)}`, `DTEND:${icsDate(main.checkOut, settings.checkOutTime)}`,
      `SUMMARY:${settings.hotelName} — ${main.code}`, `LOCATION:${settings.address}`, `DESCRIPTION:Mã đặt phòng ${main.code}. Hotline ${settings.phone}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `${main.code}.ics`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-ground pb-12">
      <div className="border-b border-stone-200 bg-white"><Container className="py-3"><Steps current={3} /></Container></div>
      <Container className="max-w-3xl pt-6">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-stone-200/70">
          {ok ? <CheckCircle2 size={48} className="mx-auto text-emerald-600" /> : <AlertTriangle size={48} className="mx-auto text-amber-500" />}
          <h1 className="mt-3 text-2xl font-extrabold">{ok ? 'Đặt phòng thành công!' : `Trạng thái: ${BOOKING_STATUS_LABEL[main.status]}`}</h1>
          <p className="mt-1 text-ink/70">Xác nhận đã gửi tới <b>{guest?.email ?? 'email của bạn'}</b> và Zalo <b>{guest?.phone}</b>.</p>
          {overbooked && (
            <div className="mx-auto mt-4 max-w-lg rounded-lg bg-amber-50 p-3 text-left text-sm text-amber-900 ring-1 ring-amber-200">
              Khách sạn cần kiểm tra lại phòng cho đơn này. Lễ tân sẽ gọi bạn trong vòng 1 giờ để xác nhận hoặc đề xuất phương án thay thế.
            </div>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 p-5">
            <div>
              <div className="text-sm text-ink/60">Mã đặt phòng</div>
              <div className="tnum text-2xl font-extrabold tracking-wide text-sea">{main.code}</div>
              {items.length > 1 && <div className="text-xs text-ink/60">+ {items.slice(1).map((b) => b.code).join(', ')}</div>}
              <div className="mt-2 text-sm text-ink/70">Xuất trình mã hoặc QR khi nhận phòng</div>
            </div>
            <FakeQR code={main.code} size={112} />
          </div>
          <div className="p-5">
            <div className="font-bold">{settings.hotelName}</div>
            <div className="mt-1 flex items-center gap-1 text-sm text-ink/70"><MapPin size={14} />{settings.address}</div>
            <div className="mt-1 flex items-center gap-1 text-sm text-ink/70"><Phone size={14} />{settings.phone}</div>
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-ground p-4 text-sm">
              <div><div className="text-xs text-ink/60">Nhận phòng</div><div className="font-semibold">{fmtDate(main.checkIn, 'EEE, dd/MM/yyyy')}</div><div className="text-xs text-ink/60">Từ {settings.checkInTime}</div></div>
              <div><div className="text-xs text-ink/60">Trả phòng</div><div className="font-semibold">{fmtDate(main.checkOut, 'EEE, dd/MM/yyyy')}</div><div className="text-xs text-ink/60">Trước {settings.checkOutTime}</div></div>
            </div>
            <ul className="mt-4 divide-y divide-stone-100 text-sm">
              {items.map((b) => {
                const rt = roomTypes.find((r) => r.id === b.roomTypeId)
                return (
                  <li key={b.id} className="flex items-center gap-3 py-3">
                    <img src={rt ? ROOM_IMG[rt.id] ?? rt.image : ''} alt="" className="h-12 w-12 rounded object-cover" />
                    <div className="flex-1"><div className="font-semibold">Phòng {rt?.name}{b.comboId ? ' · Combo' : ''}</div><div className="text-xs text-ink/60">{b.adults} người lớn · {n} đêm · {b.code}</div></div>
                    <div className="tnum font-semibold">{vnd(totalOf(b))}</div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-2 space-y-1 border-t border-stone-100 pt-3 text-sm">
              <div className="flex justify-between font-bold"><span>Tổng tiền</span><span className="tnum text-coral">{vnd(total)}</span></div>
              <div className="flex justify-between text-ink/70"><span>Đã thanh toán</span><span className="tnum">{vnd(paid)}</span></div>
              {total - paid > 0 && <div className="flex justify-between text-ink/70"><span>Thanh toán tại khách sạn</span><span className="tnum">{vnd(total - paid)}</span></div>}
            </div>
            {main.note && <p className="mt-3 rounded bg-ground p-3 text-xs text-ink/70">Ghi chú: {main.note}</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Button tone="secondary" onClick={addToCalendar}><CalendarPlus size={18} /> Thêm vào lịch</Button>
          <a href="https://zalo.me/0905000001" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-stone-200 px-4 text-sm font-medium hover:bg-stone-300"><MessageCircle size={18} /> Chat Zalo với khách sạn</a>
          <Link to="/tai-khoan" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-sea px-4 text-sm font-medium text-white hover:bg-sea-dark"><ClipboardList size={18} /> Quản lý đơn</Link>
        </div>
        <p className="mt-4 text-center text-xs text-ink/60">Mang theo CCCD hoặc hộ chiếu của mỗi khách khi nhận phòng để khách sạn khai báo lưu trú theo quy định.</p>
      </Container>
    </div>
  )
}
