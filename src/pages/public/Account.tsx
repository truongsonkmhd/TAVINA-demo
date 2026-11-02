import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ClipboardList, User, Award, MessageSquareText, LogOut, CalendarDays, ChevronRight, Phone } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useStore } from '@/store'
import { Button, Field, Input, Select, Modal, Empty, Badge, cx } from '@/components/ui'
import { vnd, fmtDate, nights, today } from '@/lib/format'
import { BOOKING_STATUS_LABEL, SERVICE_LABEL, TIER_LABEL } from '@/lib/labels'
import type { Booking, Guest } from '@/types'
import { Container } from '@/features/public/components/Shared'
import { normPhone, validEmail, validPhone, STATUS_TONE } from '@/features/public/actions'
import { ROOM_IMG } from '@/features/public/hotel'

type Section = 'bookings' | 'profile' | 'points' | 'leads'
const LEAD_STATUS: Record<string, string> = { new: 'Mới gửi', contacted: 'Đã liên hệ', quoted: 'Đã báo giá', won: 'Hoàn tất', lost: 'Đã đóng' }
const DEMO_GUESTS = ['g_1', 'g_5', 'g_25']

export default function Account() {
  const guest = useStore((s) => s.guests.find((g) => g.id === s.webGuestId))
  return guest ? <Dashboard guest={guest} /> : <Login />
}

/* ---------------- Đăng nhập / đăng ký (demo) ---------------- */
function Login() {
  const guests = useStore((s) => s.guests)
  const login = useStore((s) => s.loginWebGuest)
  const upsertGuest = useStore((s) => s.upsertGuest)
  const toast = useStore((s) => s.toast)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [reg, setReg] = useState({ name: '', phone: '', email: '' })
  const [err, setErr] = useState<Record<string, string>>({})

  const doLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const p = normPhone(phone)
    const g = guests.find((x) => normPhone(x.phone) === p)
    if (!g) { setErr({ phone: 'Chưa có tài khoản với số này — hãy đăng ký' }); return }
    login(g.id); toast(`Xin chào ${g.name}`)
  }
  const doRegister = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (reg.name.trim().length < 2) er.name = 'Nhập họ tên'
    if (!validPhone(reg.phone)) er.rphone = 'SĐT gồm 10 số, bắt đầu bằng 0'
    if (!validEmail(reg.email)) er.email = 'Email chưa đúng định dạng'
    if (!er.rphone && guests.some((x) => normPhone(x.phone) === normPhone(reg.phone))) er.rphone = 'Số này đã có tài khoản — hãy đăng nhập'
    setErr(er)
    if (Object.keys(er).length) return
    const g = upsertGuest({ name: reg.name.trim(), phone: normPhone(reg.phone), email: reg.email.trim(), marketingOptIn: true })
    login(g.id); toast('Tạo tài khoản thành công')
  }

  return (
    <div className="bg-ground py-10">
      <Container className="max-w-md">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200/70">
          <div className="grid grid-cols-2 rounded-lg bg-ground p-1 text-sm font-semibold" role="tablist">
            {(['login', 'register'] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr({}) }} className={cx('rounded-md py-2', mode === m ? 'bg-white text-sea shadow-sm' : 'text-ink/60')}>{m === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button>
            ))}
          </div>
          {mode === 'login' ? (
            <form onSubmit={doLogin} noValidate className="mt-5 space-y-4">
              <h1 className="text-xl font-bold">Đăng nhập để xem đặt chỗ</h1>
              <Field label="Số điện thoại" error={err.phone}><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="Số điện thoại đã dùng khi đặt" /></Field>
              <Button type="submit" tone="accent" size="lg" className="w-full">Tiếp tục</Button>
              <p className="text-xs text-ink/60">Bản demo đăng nhập bằng SĐT, không cần mật khẩu hay mã OTP.</p>
              <div className="border-t border-stone-100 pt-4">
                <div className="text-sm font-semibold">Dùng nhanh tài khoản mẫu</div>
                <div className="mt-2 space-y-2">
                  {DEMO_GUESTS.map((id) => guests.find((g) => g.id === id)).filter(Boolean).map((g) => (
                    <button key={g!.id} type="button" onClick={() => { login(g!.id); toast(`Xin chào ${g!.name}`) }} className="flex w-full items-center justify-between rounded-lg border border-stone-200 px-3 py-2 text-left text-sm hover:border-sea">
                      <span><span className="font-semibold">{g!.name}</span><span className="block text-xs text-ink/60">{g!.phone} · hạng {TIER_LABEL[g!.tier]}</span></span>
                      <ChevronRight size={16} className="text-ink/40" />
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={doRegister} noValidate className="mt-5 space-y-4">
              <h1 className="text-xl font-bold">Tạo tài khoản TAVINA</h1>
              <Field label="Họ và tên" required error={err.name}><Input value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} autoComplete="name" /></Field>
              <Field label="Số điện thoại" required error={err.rphone}><Input value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} inputMode="tel" autoComplete="tel" /></Field>
              <Field label="Email" required error={err.email}><Input type="email" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} autoComplete="email" /></Field>
              <Button type="submit" tone="accent" size="lg" className="w-full">Đăng ký</Button>
              <p className="text-xs text-ink/60">Thành viên được tích điểm cho mỗi lần lưu trú và nhận ưu đãi riêng.</p>
            </form>
          )}
        </div>
      </Container>
    </div>
  )
}

/* ---------------- Khu vực tài khoản ---------------- */
function Dashboard({ guest }: { guest: Guest }) {
  const [sp, setSp] = useSearchParams()
  const section = (sp.get('muc') as Section) || 'bookings'
  const go = (s: Section) => setSp(s === 'bookings' ? {} : { muc: s }, { replace: true })
  const login = useStore((s) => s.loginWebGuest)
  const allBookings = useStore((s) => s.bookings)
  const allLeads = useStore((s) => s.leads)
  const myBookings = allBookings.filter((b) => b.guestId === guest.id && b.status !== 'expired')
  const myLeads = allLeads.filter((l) => normPhone(l.phone) === normPhone(guest.phone))

  const menu: { id: Section; label: string; icon: typeof User; count?: number }[] = [
    { id: 'bookings', label: 'Đặt chỗ của tôi', icon: ClipboardList, count: myBookings.length },
    { id: 'profile', label: 'Hồ sơ', icon: User },
    { id: 'points', label: 'Điểm thưởng', icon: Award },
    { id: 'leads', label: 'Yêu cầu tư vấn', icon: MessageSquareText, count: myLeads.length },
  ]

  return (
    <div className="bg-ground py-6">
      <Container className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit min-w-0 rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
          <div className="flex items-center gap-3 border-b border-stone-100 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-sea text-lg font-bold text-white">{guest.name.split(' ').slice(-1)[0][0]}</span>
            <div><div className="font-bold">{guest.name}</div><div className="text-xs text-ink/60">Hạng {TIER_LABEL[guest.tier]} · {guest.points.toLocaleString('vi-VN')} điểm</div></div>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col [scrollbar-width:none]" aria-label="Tài khoản">
            {menu.map((m) => (
              <button key={m.id} onClick={() => go(m.id)} aria-current={section === m.id} className={cx('flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold', section === m.id ? 'bg-sand text-sea' : 'text-ink/80 hover:bg-ground')}>
                <m.icon size={18} />{m.label}{m.count !== undefined && m.count > 0 && <span className="ml-auto rounded-full bg-ground px-2 text-xs text-ink/60">{m.count}</span>}
              </button>
            ))}
            <button onClick={() => login(undefined)} className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={18} />Đăng xuất</button>
          </nav>
        </aside>
        <div className="min-w-0">
          {section === 'bookings' && <MyBookings bookings={myBookings} />}
          {section === 'profile' && <Profile guest={guest} />}
          {section === 'points' && <Points guest={guest} bookings={myBookings} />}
          {section === 'leads' && <MyLeads leads={myLeads} />}
        </div>
      </Container>
    </div>
  )
}

function useTotal() {
  const combos = useStore((s) => s.combos)
  return (b: Booking) => {
    const combo = b.comboId ? combos.find((c) => c.id === b.comboId) : undefined
    const base = combo ? combo.comboPrice : b.nightlyRate * nights(b.checkIn, b.checkOut)
    return Math.round(base * (1 - (b.discountStatus === 'approved' ? b.discountPct : 0) / 100))
  }
}

function MyBookings({ bookings }: { bookings: Booking[] }) {
  const roomTypes = useStore((s) => s.roomTypes)
  const hotelName = useStore((s) => s.settings.hotelName)
  const setStatus = useStore((s) => s.setBookingStatus)
  const toast = useStore((s) => s.toast)
  const totalOf = useTotal()
  const [tab, setTab] = useState<'upcoming' | 'done' | 'cancelled'>('upcoming')
  const [cancelling, setCancelling] = useState<Booking>()
  const T = today()

  const groups = useMemo(() => ({
    upcoming: bookings.filter((b) => ['hold', 'confirmed', 'checked-in'].includes(b.status)).sort((a, b) => a.checkIn.localeCompare(b.checkIn)),
    done: bookings.filter((b) => b.status === 'checked-out').sort((a, b) => b.checkIn.localeCompare(a.checkIn)),
    cancelled: bookings.filter((b) => b.status === 'cancelled' || b.status === 'no-show').sort((a, b) => b.checkIn.localeCompare(a.checkIn)),
  }), [bookings])
  const list = groups[tab]
  const daysBefore = (b: Booking) => differenceInCalendarDays(parseISO(b.checkIn), parseISO(T))

  const confirmCancel = () => {
    if (!cancelling) return
    const free = daysBefore(cancelling) >= 2
    setStatus(cancelling.id, 'cancelled', `${cancelling.note ? cancelling.note + ' · ' : ''}Khách huỷ trên web${free ? '' : ' (trong 48h — tính phí 1 đêm)'}`)
    toast(`Đã huỷ ${cancelling.code}${free ? '' : '. Phí huỷ 1 đêm sẽ được trừ khi hoàn tiền'}`, free ? 'ok' : 'warn')
    setCancelling(undefined)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Đặt chỗ của tôi</h1>
      <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist">
        {([['upcoming', 'Sắp tới'], ['done', 'Đã hoàn tất'], ['cancelled', 'Đã huỷ']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold', tab === k ? 'bg-sea text-white' : 'bg-white text-ink/70 ring-1 ring-stone-200')}>{l} ({groups[k].length})</button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {list.length === 0 && <Empty title={tab === 'upcoming' ? 'Bạn chưa có chuyến đi sắp tới' : 'Không có đơn nào'} action={<Link to="/khach-san/thanh-long" className="font-semibold text-sea hover:underline">Đặt phòng Khách sạn Thanh Long</Link>} />}
        {list.map((b) => {
          const rt = roomTypes.find((r) => r.id === b.roomTypeId)
          const canCancel = b.status === 'confirmed' && b.checkIn > T
          return (
            <article key={b.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
              <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-ground/60 px-4 py-2 text-xs">
                <span className="text-ink/60">Mã đặt chỗ <b className="tnum text-ink">{b.code}</b></span>
                <Badge tone={STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 p-4">
                <img src={rt ? ROOM_IMG[rt.id] ?? rt.image : ''} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{hotelName}</div>
                  <div className="text-sm text-ink/70">Phòng {rt?.name}{b.comboId ? ' · Combo' : ''} · {b.adults} người lớn</div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-ink/70"><CalendarDays size={14} />{fmtDate(b.checkIn, 'EEE dd/MM')} – {fmtDate(b.checkOut, 'EEE dd/MM/yyyy')} · {nights(b.checkIn, b.checkOut)} đêm</div>
                  {b.status === 'confirmed' && daysBefore(b) >= 0 && daysBefore(b) <= 3 && <div className="mt-1 text-xs font-semibold text-sea">{daysBefore(b) === 0 ? 'Nhận phòng hôm nay' : `Còn ${daysBefore(b)} ngày nữa`}</div>}
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink/60">Tổng tiền</div>
                  <div className="tnum text-lg font-extrabold text-coral">{vnd(totalOf(b))}</div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 px-4 py-3">
                {b.status === 'hold' && <Link to={`/dat-phong/${b.id}`} className="inline-flex h-9 items-center rounded-md bg-coral px-3 text-sm font-semibold text-white hover:bg-coral-dark">Tiếp tục thanh toán</Link>}
                {canCancel && <Button tone="ghost" size="sm" className="text-red-600" onClick={() => setCancelling(b)}>Huỷ phòng</Button>}
                <Link to={`/xac-nhan/${b.id}`} className="inline-flex h-8 items-center rounded-md px-3 text-sm font-semibold text-sea hover:bg-sand">Xem chi tiết</Link>
              </div>
            </article>
          )
        })}
      </div>

      <Modal open={!!cancelling} onClose={() => setCancelling(undefined)} title={`Huỷ đặt phòng ${cancelling?.code ?? ''}`}
        footer={<><Button tone="secondary" onClick={() => setCancelling(undefined)}>Giữ lại</Button><Button tone="danger" onClick={confirmCancel}>Xác nhận huỷ</Button></>}>
        {cancelling && (daysBefore(cancelling) >= 2
          ? <p className="text-sm">Bạn huỷ trước ngày nhận phòng {daysBefore(cancelling)} ngày nên <b className="text-emerald-700">được huỷ miễn phí</b>. Tiền đã thanh toán sẽ được hoàn trong 3–7 ngày làm việc.</p>
          : <p className="text-sm">Bạn huỷ trong vòng 48 giờ trước ngày nhận phòng. Theo chính sách, <b className="text-red-600">khách sạn tính phí 1 đêm</b> ({vnd(cancelling.nightlyRate)}). Phần còn lại được hoàn trong 3–7 ngày làm việc.</p>)}
      </Modal>
    </div>
  )
}

function Profile({ guest }: { guest: Guest }) {
  const upsertGuest = useStore((s) => s.upsertGuest)
  const toast = useStore((s) => s.toast)
  const [f, setF] = useState({
    name: guest.name, email: guest.email ?? '', dob: guest.dob ?? '', gender: guest.gender ?? '', nationality: guest.nationality, idType: guest.idType ?? 'cccd', idNumber: guest.idNumber ?? '', address: guest.address ?? '',
    coName: guest.company?.name ?? '', coTax: guest.company?.taxCode ?? '', coAddr: guest.company?.address ?? '', marketingOptIn: guest.marketingOptIn,
  })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (f.name.trim().length < 2) er.name = 'Nhập họ tên'
    if (f.email && !validEmail(f.email)) er.email = 'Email chưa đúng định dạng'
    if (f.coTax && !/^\d{10}(-\d{3})?$/.test(f.coTax.trim())) er.coTax = 'Mã số thuế gồm 10 số'
    setErr(er)
    if (Object.keys(er).length) return
    upsertGuest({
      id: guest.id, name: f.name.trim(), phone: guest.phone, email: f.email.trim() || undefined, dob: f.dob || undefined, gender: (f.gender || undefined) as Guest['gender'],
      nationality: f.nationality, idType: f.idType as Guest['idType'], idNumber: f.idNumber.trim() || undefined, address: f.address.trim() || undefined, marketingOptIn: f.marketingOptIn,
      company: f.coName.trim() ? { name: f.coName.trim(), taxCode: f.coTax.trim(), address: f.coAddr.trim(), email: f.email.trim() || undefined } : undefined,
    })
    toast('Đã lưu hồ sơ')
  }
  return (
    <form onSubmit={save} noValidate className="space-y-4">
      <h1 className="text-2xl font-bold">Hồ sơ</h1>
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
        <h2 className="font-bold">Thông tin cá nhân</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên" required error={err.name}><Input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Số điện thoại" hint="Dùng để đăng nhập, không đổi được trong bản demo"><Input value={guest.phone} disabled /></Field>
          <Field label="Email" error={err.email}><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Ngày sinh"><Input type="date" value={f.dob} onChange={(e) => set('dob', e.target.value)} /></Field>
          <Field label="Giới tính"><Select value={f.gender} onChange={(e) => set('gender', e.target.value)}><option value="">—</option><option value="M">Nam</option><option value="F">Nữ</option><option value="O">Khác</option></Select></Field>
          <Field label="Quốc tịch"><Input value={f.nationality} onChange={(e) => set('nationality', e.target.value)} /></Field>
          <Field label="Loại giấy tờ"><Select value={f.idType} onChange={(e) => set('idType', e.target.value as typeof f.idType)}><option value="cccd">CCCD</option><option value="passport">Hộ chiếu</option></Select></Field>
          <Field label="Số giấy tờ" hint="Giúp nhận phòng nhanh hơn (khai báo lưu trú)"><Input value={f.idNumber} onChange={(e) => set('idNumber', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Địa chỉ"><Input value={f.address} onChange={(e) => set('address', e.target.value)} /></Field></div>
        </div>
      </section>
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
        <h2 className="font-bold">Thông tin xuất hoá đơn</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Tên công ty"><Input value={f.coName} onChange={(e) => set('coName', e.target.value)} /></Field></div>
          <Field label="Mã số thuế" error={err.coTax}><Input value={f.coTax} onChange={(e) => set('coTax', e.target.value)} inputMode="numeric" /></Field>
          <Field label="Địa chỉ công ty"><Input value={f.coAddr} onChange={(e) => set('coAddr', e.target.value)} /></Field>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.marketingOptIn} onChange={(e) => set('marketingOptIn', e.target.checked)} className="h-4 w-4 accent-sea" />Nhận ưu đãi qua Zalo, SMS và email</label>
      </section>
      <div className="flex justify-end"><Button type="submit" tone="accent" size="lg">Lưu thay đổi</Button></div>
    </form>
  )
}

function Points({ guest, bookings }: { guest: Guest; bookings: Booking[] }) {
  const loyalty = useStore((s) => s.settings.loyalty)
  const payments = useStore((s) => s.payments)
  const next = guest.tier === 'standard' ? { name: 'Bạc', at: loyalty.silverPoints } : guest.tier === 'silver' ? { name: 'Vàng', at: loyalty.goldPoints } : undefined
  const base = guest.tier === 'silver' ? loyalty.silverPoints : guest.tier === 'gold' ? loyalty.goldPoints : 0
  const progress = next ? Math.min(100, ((guest.points - base) / (next.at - base)) * 100) : 100
  const history = bookings.filter((b) => b.status === 'checked-out').map((b) => {
    const paid = payments.filter((p) => p.bookingId === b.id).reduce((s, p) => s + p.amount, 0)
    return { b, pts: Math.floor(paid / loyalty.pointsPerVnd) }
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Điểm thưởng</h1>
      <section className="rounded-xl bg-sea p-6 text-white shadow-sm">
        <div className="text-sm text-white/80">Hạng thành viên</div>
        <div className="text-3xl font-extrabold">{TIER_LABEL[guest.tier]}</div>
        <div className="tnum mt-4 text-4xl font-extrabold">{guest.points.toLocaleString('vi-VN')} <span className="text-base font-semibold text-white/80">điểm</span></div>
        {next ? (
          <>
            <div className="mt-4 h-2 rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></div>
            <div className="mt-2 text-sm text-white/90">Thêm {(next.at - guest.points).toLocaleString('vi-VN')} điểm để lên hạng {next.name}</div>
          </>
        ) : <div className="mt-4 text-sm text-white/90">Bạn đang ở hạng cao nhất.</div>}
      </section>
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 text-sm">
        <h2 className="font-bold">Cách tích điểm</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-ink/70">
          <li>Mỗi {vnd(loyalty.pointsPerVnd)} thanh toán tiền phòng = 1 điểm, cộng sau khi trả phòng.</li>
          <li>Hạng Bạc từ {loyalty.silverPoints.toLocaleString('vi-VN')} điểm, hạng Vàng từ {loyalty.goldPoints.toLocaleString('vi-VN')} điểm.</li>
          <li>Thành viên Bạc/Vàng nhận ưu đãi riêng qua Zalo và email.</li>
        </ul>
      </section>
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
        <h2 className="font-bold">Lịch sử cộng điểm</h2>
        {history.length === 0 ? <p className="mt-2 text-sm text-ink/60">Chưa có lần lưu trú nào hoàn tất.</p> : (
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {history.map(({ b, pts }) => <li key={b.id} className="flex justify-between py-2"><span>{b.code} · {fmtDate(b.checkIn)}</span><span className="tnum font-semibold text-emerald-700">+{pts}</span></li>)}
          </ul>
        )}
      </section>
    </div>
  )
}

function MyLeads({ leads }: { leads: ReturnType<typeof useStore.getState>['leads'] }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Yêu cầu tư vấn</h1>
      <div className="mt-4 space-y-3">
        {leads.length === 0 && <Empty title="Bạn chưa gửi yêu cầu tư vấn nào" action={<Link to="/dich-vu/ve-may-bay" className="font-semibold text-sea hover:underline">Gửi yêu cầu vé máy bay</Link>} />}
        {leads.map((l) => (
          <article key={l.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold">{SERVICE_LABEL[l.service]}{l.subcategory ? ` · ${l.subcategory}` : ''}</div>
              <Badge tone={l.status === 'won' ? 'ok' : l.status === 'lost' ? 'neutral' : l.status === 'new' ? 'warn' : 'info'}>{LEAD_STATUS[l.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink/80">{l.need}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink/60">
              <span>Mã {l.id.toUpperCase()}</span><span>Gửi {fmtDate(l.createdAt)}</span>{l.travelDate && <span>Ngày đi {fmtDate(l.travelDate)}</span>}
              <span className="flex items-center gap-1"><Phone size={12} />Tư vấn viên liên hệ qua {l.phone}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
