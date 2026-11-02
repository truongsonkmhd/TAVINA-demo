import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Timer, ShieldCheck, CreditCard, Landmark, Hotel, Ticket, Lock, CalendarDays, Users, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Field, Input, Select, Textarea, Modal, cx } from '@/components/ui'
import { vnd, fmtDate, nights, today } from '@/lib/format'
import { stayTotal, couponDiscount } from '@/lib/pricing'
import type { Booking, PaymentMethod } from '@/types'
import { Container, Img, Countdown, FakeQR } from '@/features/public/components/Shared'
import { attachGuestToBookings, consumeCoupon, removeTempGuest, validEmail, validPhone, normPhone } from '@/features/public/actions'
import { ROOM_IMG, TL_GALLERY, Steps } from '@/features/public/hotel'

type Pay = 'gateway' | 'transfer' | 'hotel'
const ARRIVAL = ['Chưa rõ', '12:00 – 14:00', '14:00 – 16:00', '16:00 – 18:00', '18:00 – 20:00', '20:00 – 22:00', 'Sau 22:00']
const REQUESTS = ['Phòng không hút thuốc', 'Tầng cao', 'Giường đôi', 'Phòng yên tĩnh', 'Nhận phòng sớm']

export default function Checkout() {
  const { bookingId = '' } = useParams()
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const allBookings = useStore((s) => s.bookings)
  const roomTypes = useStore((s) => s.roomTypes)
  const ratePlans = useStore((s) => s.ratePlans)
  const coupons = useStore((s) => s.coupons)
  const combos = useStore((s) => s.combos)
  const settings = useStore((s) => s.settings)
  const webGuest = useStore((s) => s.guests.find((g) => g.id === s.webGuestId))
  const expireHolds = useStore((s) => s.expireHolds)
  const toast = useStore((s) => s.toast)

  const ids = useMemo(() => [bookingId, ...(sp.get('also')?.split(',').filter(Boolean) ?? [])], [bookingId, sp])
  const items = ids.map((id) => allBookings.find((b) => b.id === id)).filter(Boolean) as Booking[]
  const main = items[0]

  const [f, setF] = useState({
    name: webGuest?.name ?? '', phone: webGuest?.phone ?? '', email: webGuest?.email ?? '', forOther: false, stayName: '',
    arrival: ARRIVAL[0], requests: [] as string[], note: '', invoice: !!webGuest?.company,
    coName: webGuest?.company?.name ?? '', coTax: webGuest?.company?.taxCode ?? '', coAddr: webGuest?.company?.address ?? '', coEmail: webGuest?.company?.email ?? '',
    pay: 'gateway' as Pay, agree: false,
  })
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [codeInput, setCodeInput] = useState('')
  const [applied, setApplied] = useState<string>()
  const [couponErr, setCouponErr] = useState<string>()
  const [gateway, setGateway] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }))
  const onExpire = useCallback(() => expireHolds(), [expireHolds])

  if (!main) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy đơn giữ chỗ</h1>
        <Link to="/khach-san/thanh-long" className="mt-4 inline-block font-semibold text-sea hover:underline">Chọn phòng lại</Link>
      </Container>
    )
  }
  if (items.every((b) => b.status === 'confirmed' || b.status === 'checked-in')) return <Navigate to={`/xac-nhan/${main.id}`} replace />

  const expired = items.some((b) => b.status === 'expired' || (b.status === 'hold' && b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < Date.now()))
  const n = nights(main.checkIn, main.checkOut)

  // Giá từng phòng: combo dùng giá combo, còn lại theo gói giá từng đêm
  const lines = items.map((b) => {
    const rt = roomTypes.find((r) => r.id === b.roomTypeId)!
    const combo = b.comboId ? combos.find((c) => c.id === b.comboId) : undefined
    const plan = ratePlans.find((p) => p.id === b.ratePlanId)
    const st = plan ? stayTotal(plan, b.roomTypeId, b.checkIn, b.checkOut) : { perNight: [], total: b.nightlyRate * n }
    return { b, rt, combo, plan, perNight: st.perNight, total: combo ? combo.comboPrice : st.total }
  })
  const subtotal = lines.reduce((s, l) => s + l.total, 0)
  const coupon = applied ? coupons.find((c) => c.code === applied) : undefined
  const discount = coupon ? couponDiscount(coupon, subtotal, 'web', today()).amount : 0
  const total = subtotal - discount
  const cancelPolicy = lines[0].plan?.cancelPolicy ?? 'Huỷ miễn phí trước 48 giờ'

  const applyCoupon = () => {
    const code = codeInput.trim().toUpperCase()
    const c = coupons.find((x) => x.code === code)
    const r = couponDiscount(c, subtotal, 'web', today())
    if (!c || r.error) { setCouponErr(c ? r.error : 'Mã không tồn tại'); setApplied(undefined); return }
    setCouponErr(undefined); setApplied(code); toast(`Đã áp dụng mã ${code}: giảm ${vnd(r.amount)}`)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 2) e.name = 'Nhập họ tên người đặt'
    if (!validPhone(f.phone)) e.phone = 'Số điện thoại gồm 10 số, bắt đầu bằng 0'
    if (!validEmail(f.email)) e.email = 'Email chưa đúng định dạng'
    if (f.forOther && f.stayName.trim().length < 2) e.stayName = 'Nhập tên khách lưu trú'
    if (f.invoice) {
      if (!f.coName.trim()) e.coName = 'Nhập tên công ty'
      if (!/^\d{10}(-\d{3})?$/.test(f.coTax.trim())) e.coTax = 'Mã số thuế gồm 10 số (hoặc 10 số + "-" + 3 số)'
      if (!f.coAddr.trim()) e.coAddr = 'Nhập địa chỉ công ty'
      if (f.coEmail && !validEmail(f.coEmail)) e.coEmail = 'Email nhận hoá đơn chưa đúng'
    }
    if (!f.agree) e.agree = 'Bạn cần đồng ý điều khoản để tiếp tục'
    setErrs(e)
    if (Object.keys(e).length) document.getElementById(`f-${Object.keys(e)[0]}`)?.focus()
    return !Object.keys(e).length
  }

  const finalize = (method?: PaymentMethod) => {
    const st = useStore.getState()
    const tmpGuestId = main.guestId
    const guest = st.upsertGuest({
      name: f.name.trim(), phone: normPhone(f.phone), email: f.email.trim(), marketingOptIn: true,
      company: f.invoice ? { name: f.coName.trim(), taxCode: f.coTax.trim(), address: f.coAddr.trim(), email: f.coEmail.trim() || f.email.trim() } : webGuest?.company,
    })
    const occupantIds = [guest.id]
    if (f.forOther) occupantIds.splice(0, 1, st.upsertGuest({ name: f.stayName.trim(), phone: `stay-${Date.now()}` }).id)
    const note = [f.arrival !== ARRIVAL[0] ? `Giờ đến: ${f.arrival}` : '', f.requests.join(', '), f.note.trim(), f.pay === 'hotel' ? 'Thanh toán tại khách sạn' : '', f.pay === 'transfer' ? 'Chuyển khoản — chờ đối soát' : ''].filter(Boolean).join(' · ')
    const pct = discount ? Math.round((discount / subtotal) * 10000) / 100 : undefined
    attachGuestToBookings(ids, guest, { occupantIds, note: note || undefined, couponCode: applied })
    if (pct) useStore.setState((s) => ({ bookings: s.bookings.map((b) => (ids.includes(b.id) ? { ...b, discountPct: pct, discountStatus: 'approved', discountReason: `Mã ${applied}` } : b)) }))
    if (applied) consumeCoupon(applied)
    for (const id of ids) {
      const r = useStore.getState().confirmHold(id)
      if (r.error) { toast(r.error, 'err'); return }
    }
    if (method) lines.forEach((l) => st.addPayment({ bookingId: l.b.id, date: today(), method, amount: Math.round(l.total * (1 - (pct ?? 0) / 100)), note: method === 'gateway' ? 'Thanh toán online qua web' : 'Chuyển khoản' }))
    st.loginWebGuest(guest.id)
    removeTempGuest(tmpGuestId)
    toast('Đặt phòng thành công')
    navigate(`/xac-nhan/${main.id}${ids.length > 1 ? `?also=${ids.slice(1).join(',')}` : ''}`)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (expired || !validate()) return
    if (f.pay === 'gateway') setGateway(true)
    else finalize(f.pay === 'transfer' ? 'transfer' : undefined)
  }

  return (
    <div className="bg-ground pb-12">
      <div className="border-b border-stone-200 bg-white">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-3"><Steps current={2} /></Container>
      </div>

      <Container className="pt-5">
        {expired ? (
          <div className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200/70">
            <AlertTriangle className="mx-auto text-amber-500" size={36} />
            <h1 className="mt-3 text-xl font-bold">Thời gian giữ chỗ đã hết</h1>
            <p className="mt-2 text-ink/70">Phòng đã được trả lại để khách khác đặt. Bạn có thể chọn lại ngày và phòng — giá và phòng trống luôn cập nhật theo thời gian thực.</p>
            <Button tone="accent" className="mt-5" onClick={() => navigate(`/khach-san/thanh-long?from=${main.checkIn}&to=${main.checkOut}&adults=${main.adults}`)}>Chọn phòng lại</Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-orange-50 px-4 py-3 text-sm ring-1 ring-coral/30">
                <Timer size={20} className="shrink-0 text-coral" />
                <span>Chúng tôi đang giữ phòng cho bạn. Hoàn tất trong <Countdown until={main.holdExpiresAt} onExpire={onExpire} /> để không mất phòng.</span>
              </div>

              <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
                <h2 className="text-lg font-bold">Thông tin liên hệ</h2>
                <p className="text-sm text-ink/60">Xác nhận đặt phòng sẽ gửi tới email và Zalo theo số điện thoại này.</p>
                {!webGuest && <p className="mt-2 text-sm"><Link to="/tai-khoan" className="font-semibold text-sea hover:underline">Đăng nhập</Link> để điền nhanh và tích điểm.</p>}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Họ và tên" required error={errs.name}><Input id="f-name" value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" placeholder="Như trên CCCD/hộ chiếu" /></Field></div>
                  <Field label="Số điện thoại" required error={errs.phone}><Input id="f-phone" value={f.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0905 123 456" /></Field>
                  <Field label="Email" required error={errs.email}><Input id="f-email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" placeholder="ban@email.com" /></Field>
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.forOther} onChange={(e) => set('forOther', e.target.checked)} className="h-4 w-4 accent-sea" />Tôi đặt cho người khác</label>
                {f.forOther && <div className="mt-3"><Field label="Họ tên khách lưu trú" required error={errs.stayName}><Input id="f-stayName" value={f.stayName} onChange={(e) => set('stayName', e.target.value)} /></Field></div>}
              </section>

              <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
                <h2 className="text-lg font-bold">Yêu cầu đặc biệt</h2>
                <p className="text-sm text-ink/60">Khách sạn cố gắng đáp ứng nhưng không đảm bảo.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {REQUESTS.map((r) => {
                    const on = f.requests.includes(r)
                    return <button key={r} type="button" aria-pressed={on} onClick={() => set('requests', on ? f.requests.filter((x) => x !== r) : [...f.requests, r])} className={cx('rounded-full border px-3 py-1.5 text-sm font-medium', on ? 'border-sea bg-sand text-sea' : 'border-stone-300 hover:border-sea')}>{r}</button>
                  })}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Giờ đến dự kiến"><Select value={f.arrival} onChange={(e) => set('arrival', e.target.value)}>{ARRIVAL.map((a) => <option key={a}>{a}</option>)}</Select></Field>
                  <Field label="Ghi chú khác"><Textarea rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="VD: kỷ niệm ngày cưới" /></Field>
                </div>
                <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.invoice} onChange={(e) => set('invoice', e.target.checked)} className="h-4 w-4 accent-sea" />Xuất hoá đơn công ty (VAT)</label>
                {f.invoice && (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Field label="Tên công ty" required error={errs.coName}><Input id="f-coName" value={f.coName} onChange={(e) => set('coName', e.target.value)} /></Field></div>
                    <Field label="Mã số thuế" required error={errs.coTax}><Input id="f-coTax" value={f.coTax} onChange={(e) => set('coTax', e.target.value)} inputMode="numeric" /></Field>
                    <Field label="Email nhận hoá đơn" error={errs.coEmail} hint="Để trống sẽ dùng email liên hệ"><Input id="f-coEmail" value={f.coEmail} onChange={(e) => set('coEmail', e.target.value)} /></Field>
                    <div className="sm:col-span-2"><Field label="Địa chỉ công ty" required error={errs.coAddr}><Input id="f-coAddr" value={f.coAddr} onChange={(e) => set('coAddr', e.target.value)} /></Field></div>
                  </div>
                )}
              </section>

              <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
                <h2 className="flex items-center gap-2 text-lg font-bold"><Ticket size={18} className="text-coral" /> Mã giảm giá</h2>
                <div className="mt-3 flex gap-2">
                  <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Nhập mã, ví dụ TAVINA10" aria-label="Mã giảm giá" className="uppercase" />
                  <Button type="button" tone="secondary" onClick={applyCoupon} disabled={!codeInput.trim()}>Áp dụng</Button>
                </div>
                {couponErr && <p className="mt-2 text-sm text-red-600" role="alert">{couponErr}</p>}
                {applied && <p className="mt-2 text-sm font-semibold text-emerald-700">Đã áp dụng {applied}: −{vnd(discount)} <button type="button" onClick={() => { setApplied(undefined); setCodeInput('') }} className="ml-2 font-normal text-ink/60 underline">Bỏ mã</button></p>}
              </section>

              <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
                <h2 className="text-lg font-bold">Phương thức thanh toán</h2>
                <div className="mt-3 space-y-2" role="radiogroup" aria-label="Phương thức thanh toán">
                  {([
                    ['gateway', CreditCard, 'Thanh toán online', 'VNPay, MoMo, ZaloPay, thẻ ATM/Visa/Mastercard. Xác nhận ngay.'],
                    ['transfer', Landmark, 'Chuyển khoản ngân hàng', 'Quét mã QR. Khách sạn xác nhận sau khi nhận tiền.'],
                    ['hotel', Hotel, 'Thanh toán tại khách sạn', 'Giữ phòng không cần trả trước. Có thể bị huỷ nếu không đến.'],
                  ] as [Pay, typeof CreditCard, string, string][]).map(([k, Icon, t, d]) => (
                    <label key={k} className={cx('flex cursor-pointer items-start gap-3 rounded-lg border p-3', f.pay === k ? 'border-sea bg-sand/60' : 'border-stone-200 hover:border-sea/50')}>
                      <input type="radio" name="pay" checked={f.pay === k} onChange={() => set('pay', k)} className="mt-1 h-4 w-4 accent-sea" />
                      <Icon size={20} className="mt-0.5 shrink-0 text-sea" />
                      <span><span className="block font-semibold">{t}</span><span className="text-sm text-ink/60">{d}</span></span>
                    </label>
                  ))}
                </div>
                {f.pay === 'transfer' && (
                  <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-ground p-4 text-sm">
                    <FakeQR code={`${main.code}-${total}`} size={120} />
                    <div className="space-y-1">
                      <div>Ngân hàng: <b>Vietcombank — CN Phú Yên</b></div>
                      <div>Số tài khoản: <b className="tnum">0761 000 888 999</b></div>
                      <div>Chủ tài khoản: <b>CONG TY TAVINA</b></div>
                      <div>Số tiền: <b className="tnum text-coral">{vnd(total)}</b></div>
                      <div>Nội dung: <b>{main.code}</b></div>
                    </div>
                  </div>
                )}
              </section>

              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
                <label className="flex items-start gap-2 text-sm">
                  <input id="f-agree" type="checkbox" checked={f.agree} onChange={(e) => set('agree', e.target.checked)} className="mt-0.5 h-4 w-4 accent-sea" />
                  <span>Tôi đồng ý với <a href="#" className="text-sea underline">điều khoản đặt phòng</a>, chính sách huỷ và <a href="#" className="text-sea underline">chính sách bảo vệ dữ liệu cá nhân</a> của TAVINA.</span>
                </label>
                {errs.agree && <p className="mt-1 text-xs text-red-600" role="alert">{errs.agree}</p>}
                <Button type="submit" tone="accent" size="lg" className="mt-4 w-full"><Lock size={18} /> {f.pay === 'hotel' ? 'Xác nhận đặt phòng' : `Thanh toán ${vnd(total)}`}</Button>
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-ink/60"><ShieldCheck size={14} /> Thông tin được mã hoá và bảo mật</p>
              </div>
            </div>

            {/* Tóm tắt đơn */}
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
                <div className="flex gap-3 p-4">
                  <Img src={TL_GALLERY[0]} alt={settings.hotelName} ratio="aspect-square" className="h-16 w-16 shrink-0 rounded-lg" />
                  <div><div className="font-bold">{settings.hotelName}</div><div className="text-xs text-ink/60">{settings.address}</div></div>
                </div>
                <div className="grid grid-cols-2 border-y border-stone-100 text-sm">
                  <div className="p-3"><div className="flex items-center gap-1 text-xs text-ink/60"><CalendarDays size={12} /> Nhận phòng</div><div className="font-semibold">{fmtDate(main.checkIn, 'EEE, dd/MM/yyyy')}</div><div className="text-xs text-ink/60">Từ {settings.checkInTime}</div></div>
                  <div className="border-l border-stone-100 p-3"><div className="flex items-center gap-1 text-xs text-ink/60"><CalendarDays size={12} /> Trả phòng</div><div className="font-semibold">{fmtDate(main.checkOut, 'EEE, dd/MM/yyyy')}</div><div className="text-xs text-ink/60">Trước {settings.checkOutTime}</div></div>
                </div>
                <div className="space-y-4 p-4 text-sm">
                  {lines.map((l) => (
                    <div key={l.b.id} className="flex gap-3">
                      <Img src={ROOM_IMG[l.rt.id] ?? l.rt.image} alt={l.rt.name} ratio="aspect-square" className="h-12 w-12 shrink-0 rounded" />
                      <div className="flex-1">
                        <div className="font-semibold">Phòng {l.rt.name}{l.combo ? ' · Combo' : ''}</div>
                        <div className="flex items-center gap-1 text-xs text-ink/60"><Users size={12} /> {l.b.adults} người lớn · {n} đêm</div>
                        {l.combo ? <div className="text-xs text-ink/60">{l.combo.name}</div> : (
                          <details className="text-xs text-ink/60"><summary className="cursor-pointer">Giá từng đêm</summary>
                            {l.perNight.map((p) => <div key={p.date} className="flex justify-between"><span>{fmtDate(p.date, 'dd/MM')}</span><span className="tnum">{vnd(p.price)}</span></div>)}
                          </details>
                        )}
                      </div>
                      <div className="tnum font-semibold">{vnd(l.total)}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 border-t border-stone-100 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-ink/70">Tạm tính</span><span className="tnum">{vnd(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Mã {applied}</span><span className="tnum">−{vnd(discount)}</span></div>}
                  <div className="flex justify-between text-ink/70"><span>Thuế & phí</span><span>Đã bao gồm</span></div>
                  <div className="flex items-end justify-between border-t border-stone-100 pt-3"><span className="font-bold">Tổng thanh toán</span><span className="tnum text-xl font-extrabold text-coral">{vnd(total)}</span></div>
                </div>
                <div className="flex items-start gap-2 bg-emerald-50 p-4 text-xs text-emerald-800"><ShieldCheck size={16} className="shrink-0" />{cancelPolicy}</div>
              </div>
            </aside>
          </form>
        )}
      </Container>

      <Modal open={gateway} onClose={() => setGateway(false)} title="Cổng thanh toán (mô phỏng)">
        <div className="rounded-lg bg-ground p-4 text-sm">
          <div className="flex justify-between"><span>Đơn hàng</span><b>{main.code}</b></div>
          <div className="mt-1 flex justify-between"><span>Số tiền</span><b className="tnum text-coral">{vnd(total)}</b></div>
        </div>
        <p className="mt-3 text-sm text-ink/70">Bản demo không kết nối cổng thanh toán thật. Chọn kết quả để mô phỏng phản hồi từ cổng (webhook).</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button tone="secondary" onClick={() => { setGateway(false); toast('Giao dịch bị huỷ — phòng vẫn đang được giữ', 'warn') }}>Giao dịch thất bại</Button>
          <Button tone="accent" onClick={() => { setGateway(false); finalize('gateway') }}>Thanh toán thành công</Button>
        </div>
      </Modal>
    </div>
  )
}
