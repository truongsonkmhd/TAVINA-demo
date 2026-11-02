// Ô tìm kiếm liền khối cho các dịch vụ chưa bán online (vé máy bay, xe, vui chơi, tour, SIM, visa).
// Bấm tìm → chuyển nội dung thành yêu cầu tư vấn điền sẵn ở trang dịch vụ.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, PlaneTakeoff, PlaneLanding, CalendarDays, Users, MapPin, Flag, Clock, ArrowLeftRight, type LucideIcon } from 'lucide-react'
import type { ServiceKey } from '@/types'
import { SERVICE_SLUG } from '@/layouts/PublicLayout'
import { today, addDaysISO, fmtDate } from '@/lib/format'
import { cx } from '@/components/ui'

export interface ServiceSearchResult { need: string; date?: string; pax: number; sub?: string }

type Field = { key: string; label: string; icon: LucideIcon; type: 'text' | 'date' | 'number' | 'select'; placeholder?: string; options?: string[]; optional?: boolean; min?: number; max?: number }

const FIELDS: Record<Exclude<ServiceKey, 'hotel'>, { fields: Field[]; button: string; need: (v: Record<string, string>) => string }> = {
  flight: {
    button: 'Tìm chuyến bay',
    fields: [
      { key: 'from', label: 'Từ', icon: PlaneTakeoff, type: 'text', placeholder: 'Tuy Hoà (TBB)' },
      { key: 'to', label: 'Đến', icon: PlaneLanding, type: 'text', placeholder: 'Hà Nội (HAN)' },
      { key: 'date', label: 'Ngày đi', icon: CalendarDays, type: 'date' },
      { key: 'back', label: 'Ngày về', icon: CalendarDays, type: 'date', optional: true },
      { key: 'pax', label: 'Hành khách', icon: Users, type: 'number', min: 1, max: 9 },
    ],
    need: (v) => `Vé ${v.back ? 'khứ hồi' : 'một chiều'} ${v.from} – ${v.to}, đi ${fmtDate(v.date)}${v.back ? `, về ${fmtDate(v.back)}` : ''}, ${v.pax} hành khách`,
  },
  bus: {
    button: 'Tìm chuyến xe',
    fields: [
      { key: 'from', label: 'Điểm đi', icon: MapPin, type: 'text', placeholder: 'Sân bay Tuy Hoà' },
      { key: 'to', label: 'Điểm đến', icon: Flag, type: 'text', placeholder: 'Khách sạn Thanh Long' },
      { key: 'date', label: 'Ngày đi', icon: CalendarDays, type: 'date' },
      { key: 'pax', label: 'Số khách', icon: Users, type: 'number', min: 1, max: 45 },
    ],
    need: (v) => `Xe ${v.from} → ${v.to} ngày ${fmtDate(v.date)}, ${v.pax} khách`,
  },
  activity: {
    button: 'Tìm hoạt động',
    fields: [
      { key: 'what', label: 'Điểm đến hoặc hoạt động', icon: MapPin, type: 'text', placeholder: 'Gành Đá Đĩa, lặn Hòn Chùa…' },
      { key: 'date', label: 'Ngày tham quan', icon: CalendarDays, type: 'date' },
      { key: 'pax', label: 'Số khách', icon: Users, type: 'number', min: 1, max: 50 },
    ],
    need: (v) => `Vé/hoạt động: ${v.what}, ngày ${fmtDate(v.date)}, ${v.pax} khách`,
  },
  tour: {
    button: 'Tìm tour',
    fields: [
      { key: 'where', label: 'Điểm đến', icon: MapPin, type: 'text', placeholder: 'Phú Yên, Quy Nhơn, Đà Lạt…' },
      { key: 'date', label: 'Ngày khởi hành', icon: CalendarDays, type: 'date' },
      { key: 'days', label: 'Thời gian', icon: Clock, type: 'select', options: ['1 ngày', '2N1Đ', '3N2Đ', '4N3Đ', '5 ngày trở lên'] },
      { key: 'pax', label: 'Số khách', icon: Users, type: 'number', min: 1, max: 60 },
    ],
    need: (v) => `Tour ${v.where} ${v.days}, khởi hành ${fmtDate(v.date)}, ${v.pax} khách`,
  },
  sim: {
    button: 'Tìm SIM / eSIM',
    fields: [
      { key: 'country', label: 'Quốc gia', icon: Flag, type: 'text', placeholder: 'Nhật Bản, Hàn Quốc, Việt Nam…' },
      { key: 'date', label: 'Ngày bắt đầu dùng', icon: CalendarDays, type: 'date' },
      { key: 'days', label: 'Số ngày', icon: Clock, type: 'select', options: ['3 ngày', '5 ngày', '7 ngày', '10 ngày', '15 ngày', '30 ngày'] },
      { key: 'pax', label: 'Số SIM', icon: Users, type: 'number', min: 1, max: 20 },
    ],
    need: (v) => `SIM/eSIM ${v.country}, ${v.days} từ ${fmtDate(v.date)}, ${v.pax} SIM`,
  },
  visa: {
    button: 'Kiểm tra visa',
    fields: [
      { key: 'country', label: 'Nước cần xin visa', icon: Flag, type: 'text', placeholder: 'Hàn Quốc, Nhật Bản, Schengen…' },
      { key: 'purpose', label: 'Mục đích', icon: ArrowLeftRight, type: 'select', options: ['Du lịch', 'Thăm thân', 'Công tác', 'Du học'] },
      { key: 'date', label: 'Ngày dự kiến đi', icon: CalendarDays, type: 'date' },
      { key: 'pax', label: 'Số người', icon: Users, type: 'number', min: 1, max: 30 },
    ],
    need: (v) => `Visa ${v.purpose.toLowerCase()} ${v.country}, dự kiến đi ${fmtDate(v.date)}, ${v.pax} người`,
  },
}

export function ServiceSearch({ service, sub, onSubmit, initial }: { service: Exclude<ServiceKey, 'hotel'>; sub?: string; onSubmit?: (r: ServiceSearchResult) => void; initial?: Record<string, string> }) {
  const navigate = useNavigate()
  const cfg = FIELDS[service]
  const [v, setV] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = { date: addDaysISO(today(), 7), pax: '2' }
    for (const f of cfg.fields) if (f.type === 'select') d[f.key] = f.options![0]
    return { ...d, ...initial }
  })
  const [err, setErr] = useState<string>()
  const swap = () => setV({ ...v, from: v.to ?? '', to: v.from ?? '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const missing = cfg.fields.find((f) => !f.optional && !String(v[f.key] ?? '').trim())
    if (missing) return setErr(`Nhập ${missing.label.toLowerCase()}`)
    if (v.date < today()) return setErr('Ngày không được ở quá khứ')
    if (v.back && v.back < v.date) return setErr('Ngày về phải sau ngày đi')
    setErr(undefined)
    const r = { need: cfg.need(v), date: v.date, pax: Math.max(1, Number(v.pax) || 1) }
    if (onSubmit) onSubmit(r)
    else navigate(`/dich-vu/${SERVICE_SLUG[service]}?need=${encodeURIComponent(r.need)}&date=${r.date}&pax=${r.pax}${sub ? `&muc=${encodeURIComponent(sub)}` : ''}`)
  }

  const n = cfg.fields.length
  return (
    <form onSubmit={submit} noValidate role="search">
      <div className={cx('grid gap-2 md:gap-0', n === 5 ? 'md:grid-cols-[1.2fr_1.2fr_1fr_1fr_0.8fr_auto]' : n === 4 ? 'md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]' : 'md:grid-cols-[1.8fr_1fr_0.8fr_auto]')}>
        {cfg.fields.map((f, i) => (
          <div key={f.key} className="relative">
            <div className="mb-1.5 hidden text-sm font-semibold text-ink/80 md:block">{f.label}{f.optional && <span className="font-normal text-ink/50"> (không bắt buộc)</span>}</div>
            <label className={cx('flex h-14 items-center gap-3 border-2 border-stone-300 bg-white px-4 focus-within:z-10 focus-within:border-sea', 'rounded-lg md:rounded-none', i === 0 && 'md:rounded-l-lg', i > 0 && 'md:-ml-0.5')}>
              <f.icon size={20} className="shrink-0 text-sea" />
              <span className="sr-only md:hidden">{f.label}</span>
              {f.type === 'select' ? (
                <select value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className="w-full bg-transparent text-base font-semibold outline-none" aria-label={f.label}>
                  {f.options!.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type} value={v[f.key] ?? ''} min={f.type === 'date' ? today() : f.min} max={f.max} placeholder={f.placeholder ?? f.label}
                  onChange={(e) => setV({ ...v, [f.key]: e.target.value })} aria-label={f.label}
                  className="w-full min-w-0 bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-stone-400" />
              )}
            </label>
            {service === 'flight' && f.key === 'from' && (
              <button type="button" onClick={swap} className="absolute -right-4 bottom-3 z-20 hidden h-8 w-8 place-items-center rounded-full border border-stone-300 bg-white text-sea shadow-sm hover:border-sea md:grid" aria-label="Đổi chiều đi – đến"><ArrowLeftRight size={14} /></button>
            )}
          </div>
        ))}
        <div className="flex flex-col">
          <div className="mb-1.5 hidden text-sm md:block">&nbsp;</div>
          <button type="submit" className="flex h-14 items-center justify-center gap-2 rounded-lg bg-sea px-5 font-semibold text-white hover:bg-sea-dark md:-ml-0.5 md:w-14 md:rounded-l-none md:px-0" aria-label={cfg.button}>
            <Search size={22} /><span className="md:hidden">{cfg.button}</span>
          </button>
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}
      <p className="mt-3 text-xs text-ink/60">Bấm tìm, để lại số điện thoại — tư vấn viên TAVINA gửi lựa chọn và giá trong 30 phút.</p>
    </form>
  )
}
