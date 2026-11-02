import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, CalendarDays, Users, Hotel, Minus, Plus } from 'lucide-react'
import { useStore } from '@/store'
import { cx } from '@/components/ui'
import { addDaysISO, today, nights, fmtDate } from '@/lib/format'
import { PriceCalendar } from './PriceCalendar'

export interface HotelQuery { city: string; from: string; to: string; adults: number; children: number; rooms: number }

export function defaultQuery(): HotelQuery {
  return { city: 'Phú Yên', from: today(), to: addDaysISO(today(), 1), adults: 2, children: 0, rooms: 1 }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function parseQuery(sp: URLSearchParams): HotelQuery {
  const d = defaultQuery()
  const iso = (k: string) => (sp.get(k) && /^\d{4}-\d{2}-\d{2}$/.test(sp.get(k)!) ? sp.get(k)! : undefined)
  const from = iso('from') ?? d.from
  let to = iso('to') ?? d.to
  if (to <= from) to = addDaysISO(from, 1)
  return {
    city: sp.get('city') || d.city, from, to,
    adults: clamp(Number(sp.get('adults')) || d.adults, 1, 16),
    children: clamp(Number(sp.get('children')) || 0, 0, 8),
    rooms: clamp(Number(sp.get('rooms')) || 1, 1, 8),
  }
}

export function toSearch(q: HotelQuery) {
  return `?city=${encodeURIComponent(q.city)}&from=${q.from}&to=${q.to}&adults=${q.adults}${q.children ? `&children=${q.children}` : ''}${q.rooms > 1 ? `&rooms=${q.rooms}` : ''}`
}

/** Popover đóng khi bấm ra ngoài hoặc Esc */
export function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return { open, setOpen, ref }
}

export function Stepper({ label, sub, value, min, max, onChange }: { label: string; sub?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div><div className="font-semibold">{label}</div>{sub && <div className="text-xs text-ink/60">{sub}</div>}</div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} className="grid h-8 w-8 place-items-center rounded-full border border-sea text-sea disabled:border-stone-200 disabled:text-stone-300" aria-label={`Giảm ${label}`}><Minus size={14} /></button>
        <span className="tnum w-5 text-center font-semibold">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className="grid h-8 w-8 place-items-center rounded-full border border-sea text-sea disabled:border-stone-200 disabled:text-stone-300" aria-label={`Tăng ${label}`}><Plus size={14} /></button>
      </div>
    </div>
  )
}

/**
 * Thanh tìm khách sạn liền khối kiểu OTA: Điểm đến | Ngày nhận – trả | Khách & phòng | nút tìm.
 * Gõ tên khách sạn trong gợi ý sẽ mở thẳng trang khách sạn đó.
 */
export function HotelSearchBar({ value, onSubmit, className }: { value?: HotelQuery; onSubmit?: (q: HotelQuery) => void; compact?: boolean; className?: string }) {
  const navigate = useNavigate()
  const partnerHotels = useStore((s) => s.partnerHotels)
  const hotelName = useStore((s) => s.settings.hotelName)
  const [q, setQ] = useState<HotelQuery>(value ?? defaultQuery())
  const [text, setText] = useState(q.city)
  const dest = usePopover(), dates = usePopover(), guests = usePopover()
  useEffect(() => { if (value) { setQ(value); setText(value.city) } }, [value])

  const cities = Array.from(new Set(['Phú Yên', ...partnerHotels.map((h) => h.city)]))
  const hotels = [{ id: 'thanh-long', name: hotelName, city: 'Phú Yên', area: 'Tuy Hoà' }, ...partnerHotels.map((h) => ({ id: h.id, name: h.name, city: h.city, area: h.area }))]
  const term = text.trim().toLowerCase()
  const cityHits = cities.filter((c) => !term || c.toLowerCase().includes(term) || c === q.city)
  const hotelHits = term ? hotels.filter((h) => h.name.toLowerCase().includes(term)).slice(0, 5) : hotels.filter((h) => h.city === q.city).slice(0, 4)
  const n = nights(q.from, q.to)

  const pickCity = (c: string) => { setQ({ ...q, city: c }); setText(c); dest.setOpen(false) }
  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    // Gõ đúng tên khách sạn → mở thẳng trang khách sạn
    const exact = hotels.find((h) => h.name.toLowerCase() === term)
    if (exact) return navigate(`/khach-san/${exact.id}${toSearch({ ...q, city: exact.city })}`)
    const city = cities.find((c) => c.toLowerCase() === term) ?? cities.find((c) => c.toLowerCase().includes(term)) ?? q.city
    const nq = { ...q, city, from: q.from < today() ? today() : q.from }
    if (nq.to <= nq.from) nq.to = addDaysISO(nq.from, 1)
    setText(city)
    if (onSubmit) onSubmit(nq)
    else navigate('/khach-san' + toSearch(nq))
  }

  const cell = 'flex h-14 w-full items-center gap-3 bg-white px-4 text-left'
  return (
    <form onSubmit={submit} className={cx('grid gap-2 md:grid-cols-[1.2fr_1.2fr_1fr_auto] md:gap-0', className)} noValidate role="search">
      {/* Điểm đến */}
      <div className="relative" ref={dest.ref}>
        <div className="mb-1.5 hidden text-sm font-semibold text-ink/80 md:block">Thành phố, điểm đến hoặc tên khách sạn</div>
        <label className={cx(cell, 'rounded-lg border-2 md:rounded-r-none', dest.open ? 'border-sea' : 'border-stone-300')}>
          <MapPin size={20} className="shrink-0 text-sea" />
          <input value={text} onChange={(e) => { setText(e.target.value); dest.setOpen(true) }} onFocus={() => dest.setOpen(true)}
            placeholder="Thành phố, khách sạn, nơi muốn đến" className="w-full bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-stone-400" aria-label="Điểm đến" />
        </label>
        {dest.open && (
          <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl bg-white text-sm shadow-xl ring-1 ring-stone-200 md:right-auto md:w-96">
            {cityHits.length > 0 && <div className="px-4 pb-1 pt-3 text-xs font-semibold uppercase text-ink/50">Điểm đến</div>}
            {cityHits.map((c) => <button type="button" key={c} onClick={() => pickCity(c)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sand"><MapPin size={16} className="text-ink/50" /><span><b>{c}</b><span className="block text-xs text-ink/60">Việt Nam</span></span></button>)}
            {hotelHits.length > 0 && <div className="border-t border-stone-100 px-4 pb-1 pt-3 text-xs font-semibold uppercase text-ink/50">Khách sạn</div>}
            {hotelHits.map((h) => (
              <button type="button" key={h.id} onClick={() => navigate(`/khach-san/${h.id}${toSearch({ ...q, city: h.city })}`)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sand">
                <Hotel size={16} className="text-ink/50" /><span><b>{h.name}</b>{h.id === 'thanh-long' && <span className="ml-2 rounded bg-sea px-1.5 text-[10px] font-bold text-white">Đối tác</span>}<span className="block text-xs text-ink/60">{h.area}, {h.city}</span></span>
              </button>
            ))}
            {!cityHits.length && !hotelHits.length && <p className="px-4 py-4 text-ink/60">Không tìm thấy “{text}”.</p>}
          </div>
        )}
      </div>

      {/* Ngày */}
      <div className="relative" ref={dates.ref}>
        <div className="mb-1.5 hidden text-sm font-semibold text-ink/80 md:block">Ngày nhận phòng & trả phòng</div>
        <button type="button" onClick={() => dates.setOpen(!dates.open)} className={cx(cell, 'rounded-lg border-2 md:rounded-none md:border-l-0', dates.open ? 'border-sea' : 'border-stone-300')} aria-expanded={dates.open} aria-label="Chọn ngày">
          <CalendarDays size={20} className="shrink-0 text-sea" />
          <span className="truncate text-base font-semibold">{fmtDate(q.from, 'EEE, dd/MM')} – {fmtDate(q.to, 'EEE, dd/MM')} <span className="font-normal text-ink/60">({n} đêm)</span></span>
        </button>
        {dates.open && (
          <div className="absolute left-0 z-30 mt-1 w-[min(92vw,640px)] rounded-xl bg-white p-4 shadow-xl ring-1 ring-stone-200 md:-left-40">
            <PriceCalendar roomTypeId="rt_std" from={q.from} to={q.to} onChange={(from, to) => { setQ({ ...q, from, to }); dates.setOpen(false) }} />
            <p className="mt-2 text-xs text-ink/60">Giá trên lịch là giá phòng Standard của Khách sạn Thanh Long.</p>
          </div>
        )}
      </div>

      {/* Khách & phòng */}
      <div className="relative" ref={guests.ref}>
        <div className="mb-1.5 hidden text-sm font-semibold text-ink/80 md:block">Khách và phòng</div>
        <button type="button" onClick={() => guests.setOpen(!guests.open)} className={cx(cell, 'rounded-lg border-2 md:rounded-none md:border-l-0', guests.open ? 'border-sea' : 'border-stone-300')} aria-expanded={guests.open} aria-label="Chọn số khách và phòng">
          <Users size={20} className="shrink-0 text-sea" />
          <span className="truncate text-base font-semibold">{q.adults} người lớn, {q.children} trẻ em, {q.rooms} phòng</span>
        </button>
        {guests.open && (
          <div className="absolute right-0 z-30 mt-1 w-80 rounded-xl bg-white px-4 py-2 shadow-xl ring-1 ring-stone-200">
            <Stepper label="Người lớn" sub="Từ 12 tuổi" value={q.adults} min={1} max={16} onChange={(v) => setQ({ ...q, adults: v, rooms: Math.min(q.rooms, v) })} />
            <Stepper label="Trẻ em" sub="Dưới 12 tuổi" value={q.children} min={0} max={8} onChange={(v) => setQ({ ...q, children: v })} />
            <Stepper label="Phòng" value={q.rooms} min={1} max={Math.min(8, q.adults)} onChange={(v) => setQ({ ...q, rooms: v })} />
            <button type="button" onClick={() => guests.setOpen(false)} className="mb-2 mt-1 w-full rounded-md bg-sea py-2 text-sm font-semibold text-white hover:bg-sea-dark">Xong</button>
          </div>
        )}
      </div>

      {/* Nút tìm */}
      <div className="flex flex-col">
        <div className="mb-1.5 hidden text-sm md:block">&nbsp;</div>
        <button type="submit" className="flex h-14 items-center justify-center gap-2 rounded-lg bg-sea px-5 font-semibold text-white hover:bg-sea-dark md:w-14 md:rounded-l-none md:px-0" aria-label="Tìm khách sạn">
          <Search size={22} /><span className="md:hidden">Tìm khách sạn</span>
        </button>
      </div>
    </form>
  )
}
