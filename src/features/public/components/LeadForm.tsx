import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Field, Input, Select, Textarea } from '@/components/ui'
import type { ServiceKey } from '@/types'
import { SERVICE_LABEL } from '@/lib/labels'
import { today } from '@/lib/format'
import { addLead, normPhone, validEmail, validPhone } from '../actions'

interface Props {
  service: ServiceKey
  subcategories?: string[]
  defaultSubcategory?: string
  title?: string
  compact?: boolean
  needPlaceholder?: string
  defaultNeed?: string
  defaultDate?: string
  defaultPax?: number
}

/** Form Yêu cầu tư vấn — tạo Lead trong store, hiển thị mã yêu cầu sau khi gửi */
export function LeadForm({ service, subcategories = [], defaultSubcategory, title = 'Yêu cầu tư vấn', compact, needPlaceholder, defaultNeed, defaultDate, defaultPax }: Props) {
  const toast = useStore((s) => s.toast)
  const coupons = useStore((s) => s.coupons)
  const guest = useStore((s) => s.guests.find((g) => g.id === s.webGuestId))
  const [f, setF] = useState({ name: guest?.name ?? '', phone: guest?.phone ?? '', email: guest?.email ?? '', sub: defaultSubcategory ?? subcategories[0] ?? '', date: defaultDate ?? '', pax: String(defaultPax ?? 2), need: defaultNeed ?? '', coupon: '' })
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [done, setDone] = useState<{ id: string; name: string } | undefined>()
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const er: Record<string, string> = {}
    if (f.name.trim().length < 2) er.name = 'Nhập họ tên'
    if (!validPhone(f.phone)) er.phone = 'SĐT gồm 10 chữ số, bắt đầu bằng 0'
    if (f.email && !validEmail(f.email)) er.email = 'Email không hợp lệ'
    if (f.need.trim().length < 5) er.need = 'Mô tả nhu cầu ít nhất 5 ký tự'
    if (f.date && f.date < today()) er.date = 'Ngày đi không ở quá khứ'
    const code = f.coupon.trim().toUpperCase()
    const cp = code ? coupons.find((c) => c.code === code) : undefined
    if (code && (!cp || !cp.active || cp.to < today() || cp.used >= cp.maxUses)) er.coupon = 'Mã không tồn tại hoặc đã hết hạn'
    else if (cp && (cp.service ?? 'hotel') !== service) er.coupon = 'Mã này không dành cho dịch vụ này'
    setErrs(er)
    if (Object.keys(er).length) return
    const lead = addLead({ service, subcategory: f.sub || undefined, name: f.name.trim(), phone: normPhone(f.phone), email: f.email || undefined, need: f.need.trim() + (code ? ` · Mã giảm giá: ${code}` : ''), travelDate: f.date || undefined, pax: f.pax ? Number(f.pax) : undefined })
    toast(`Đã gửi yêu cầu ${SERVICE_LABEL[service].toLowerCase()} — TAVINA sẽ gọi lại trong 30 phút`)
    setDone({ id: lead.id, name: lead.name })
  }

  if (done) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200/70">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-lg font-bold">Đã nhận yêu cầu của {done.name}</h3>
            <p className="mt-1 text-ink/70">Mã yêu cầu <span className="tnum font-semibold text-ink">{done.id.toUpperCase()}</span>. Tư vấn viên TAVINA sẽ liên hệ qua SĐT/Zalo trong giờ làm việc (8:00–21:00).</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button tone="secondary" onClick={() => { setDone(undefined); setF((x) => ({ ...x, need: '' })) }}>Gửi yêu cầu khác</Button>
              <Link to="/tai-khoan" className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium text-sea hover:bg-stone-100">Theo dõi yêu cầu</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 md:p-6">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-1 text-sm text-ink/70">Điền thông tin, TAVINA gọi lại trong 30 phút với báo giá cụ thể. Không mất phí tư vấn.</p>
      <div className={compact ? 'mt-4 grid gap-4' : 'mt-4 grid gap-4 sm:grid-cols-2'}>
        <Field label="Họ tên" required error={errs.name}><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Nguyễn Văn A" autoComplete="name" /></Field>
        <Field label="Số điện thoại" required error={errs.phone}><Input value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="09xx xxx xxx" inputMode="tel" autoComplete="tel" /></Field>
        <Field label="Email" error={errs.email}><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="ban@example.com" autoComplete="email" /></Field>
        {subcategories.length > 0 && (
          <Field label="Danh mục">
            <Select value={f.sub} onChange={(e) => set('sub', e.target.value)}>{subcategories.map((s) => <option key={s} value={s}>{s}</option>)}</Select>
          </Field>
        )}
        <Field label="Ngày đi dự kiến" error={errs.date}><Input type="date" min={today()} value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Số khách"><Input type="number" min={1} max={99} value={f.pax} onChange={(e) => set('pax', e.target.value)} /></Field>
        <Field label="Mã giảm giá" error={errs.coupon} hint="Không bắt buộc"><Input value={f.coupon} onChange={(e) => set('coupon', e.target.value)} placeholder="VD: BAYXA75" className="uppercase" /></Field>
        <div className={compact ? '' : 'sm:col-span-2'}>
          <Field label="Nhu cầu của bạn" required error={errs.need}><Textarea value={f.need} onChange={(e) => set('need', e.target.value)} placeholder={needPlaceholder ?? 'Ví dụ: 2 vé Hà Nội – Tuy Hoà ngày 20/11, ưu tiên bay sáng, hành lý 20 kg'} /></Field>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" tone="accent" size="lg">Gửi yêu cầu tư vấn</Button>
        <span className="text-xs text-ink/60">Bằng việc gửi, bạn đồng ý để TAVINA liên hệ qua SĐT/Zalo đã cung cấp.</span>
      </div>
    </form>
  )
}
