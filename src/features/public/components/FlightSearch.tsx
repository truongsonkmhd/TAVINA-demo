// Ô tìm vé máy bay kiểu OTA: một chiều/khứ hồi, bay thẳng, hành khách, hạng ghế,
// chọn sân bay (thành phố + tên sân bay), nút đổi chiều, ngày đi/ngày về, gợi ý chặng bay.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, PlaneTakeoff, PlaneLanding, CalendarDays, Users, ArrowLeftRight, Armchair, Check, ChevronDown } from 'lucide-react'
import { cx } from '@/components/ui'
import { today, addDaysISO, fmtDate } from '@/lib/format'
import { Stepper, usePopover } from './HotelSearchBar'
import type { ServiceSearchResult } from './ServiceSearch'

interface Airport { code: string; city: string; name: string; intl?: boolean }
const AIRPORTS: Airport[] = [
  { code: 'TBB', city: 'Tuy Hoà', name: 'Sân bay Tuy Hoà' },
  { code: 'SGN', city: 'TP. Hồ Chí Minh', name: 'Sân bay Tân Sơn Nhất' },
  { code: 'HAN', city: 'Hà Nội', name: 'Sân bay Nội Bài' },
  { code: 'DAD', city: 'Đà Nẵng', name: 'Sân bay Đà Nẵng' },
  { code: 'CXR', city: 'Nha Trang', name: 'Sân bay Cam Ranh' },
  { code: 'UIH', city: 'Quy Nhơn', name: 'Sân bay Phù Cát' },
  { code: 'DLI', city: 'Đà Lạt', name: 'Sân bay Liên Khương' },
  { code: 'PQC', city: 'Phú Quốc', name: 'Sân bay Phú Quốc' },
  { code: 'HUI', city: 'Huế', name: 'Sân bay Phú Bài' },
  { code: 'HPH', city: 'Hải Phòng', name: 'Sân bay Cát Bi' },
  { code: 'VII', city: 'Vinh', name: 'Sân bay Vinh' },
  { code: 'VCS', city: 'Côn Đảo', name: 'Sân bay Côn Đảo' },
  { code: 'BKK', city: 'Bangkok', name: 'Sân bay Suvarnabhumi', intl: true },
  { code: 'SIN', city: 'Singapore', name: 'Sân bay Changi', intl: true },
  { code: 'ICN', city: 'Seoul', name: 'Sân bay Incheon', intl: true },
  { code: 'NRT', city: 'Tokyo', name: 'Sân bay Narita', intl: true },
]
const CLASSES = ['Phổ thông', 'Phổ thông đặc biệt', 'Thương gia', 'Hạng nhất']
const POPULAR: [string, string][] = [['TBB', 'SGN'], ['TBB', 'HAN'], ['SGN', 'TBB'], ['HAN', 'TBB'], ['TBB', 'DAD']]
const AIRLINES = ['Vietnam Airlines', 'Vietjet Air', 'Bamboo Airways', 'Vietravel Airlines', 'Pacific Airlines']

const byCode = (c: string) => AIRPORTS.find((a) => a.code === c)!
/** Nhận "Tuy Hoà" / "TBB" / "Hà Nội" → sân bay */
const findAirport = (q?: string) => {
  if (!q) return undefined
  const t = q.trim().toLowerCase()
  return AIRPORTS.find((a) => a.code.toLowerCase() === t || a.city.toLowerCase() === t || t.includes(a.city.toLowerCase()))
}

function AirportPicker({ label, value, onChange, icon: Icon, exclude, className }: { label: string; value: Airport; onChange: (a: Airport) => void; icon: typeof PlaneTakeoff; exclude?: string; className?: string }) {
  const p = usePopover()
  const [q, setQ] = useState('')
  const t = q.trim().toLowerCase()
  const list = AIRPORTS.filter((a) => a.code !== exclude && (!t || a.city.toLowerCase().includes(t) || a.code.toLowerCase().includes(t) || a.name.toLowerCase().includes(t)))
  return (
    <div className={cx('relative', className)} ref={p.ref}>
      <button type="button" onClick={() => { p.setOpen(!p.open); setQ('') }} className={cx('flex h-16 w-full items-center gap-3 px-4 text-left', p.open && 'rounded-lg ring-2 ring-sea')} aria-label={`${label}: ${value.city}`} aria-expanded={p.open}>
        <Icon size={22} className="shrink-0 text-sea" />
        <span className="min-w-0">
          <span className="block truncate text-base font-bold text-ink">{value.city} ({value.code})</span>
          <span className="block truncate text-xs text-ink/60">{value.name}</span>
        </span>
      </button>
      {p.open && (
        <div className="absolute left-0 z-30 mt-1 w-80 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-stone-200">
          <div className="border-b border-stone-100 p-3"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm thành phố hoặc sân bay" className="h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-sea" aria-label={`Tìm ${label.toLowerCase()}`} /></div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {list.map((a) => (
              <li key={a.code}>
                <button type="button" onClick={() => { onChange(a); p.setOpen(false) }} className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-sand">
                  <span><b className="text-ink">{a.city}</b><span className="block text-xs text-ink/60">{a.name}{a.intl ? ' · Quốc tế' : ''}</span></span>
                  <span className="rounded bg-ground px-1.5 py-0.5 text-xs font-bold text-ink/70">{a.code}</span>
                </button>
              </li>
            ))}
            {!list.length && <li className="px-4 py-3 text-sm text-ink/60">Không tìm thấy sân bay.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

export function FlightSearch({ onSubmit, initial }: { onSubmit?: (r: ServiceSearchResult) => void; initial?: Record<string, string> }) {
  const navigate = useNavigate()
  const [roundTrip, setRoundTrip] = useState(false)
  const [direct, setDirect] = useState(false)
  const [from, setFrom] = useState<Airport>(findAirport(initial?.from) ?? byCode('TBB'))
  const [to, setTo] = useState<Airport>(findAirport(initial?.to) ?? byCode('SGN'))
  const [date, setDate] = useState(addDaysISO(today(), 7))
  const [back, setBack] = useState(addDaysISO(today(), 9))
  const [pax, setPax] = useState({ adults: 1, children: 0, infants: 0 })
  const [cabin, setCabin] = useState(CLASSES[0])
  const [err, setErr] = useState<string>()
  const paxPop = usePopover(), cabinPop = usePopover()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (from.code === to.code) return setErr('Điểm đi và điểm đến phải khác nhau')
    if (date < today()) return setErr('Ngày đi không được ở quá khứ')
    if (roundTrip && back < date) return setErr('Ngày về phải sau ngày đi')
    setErr(undefined)
    const paxText = [`${pax.adults} người lớn`, pax.children && `${pax.children} trẻ em`, pax.infants && `${pax.infants} em bé`].filter(Boolean).join(', ')
    const need = `Vé ${roundTrip ? 'khứ hồi' : 'một chiều'} ${from.city} (${from.code}) → ${to.city} (${to.code}), đi ${fmtDate(date)}${roundTrip ? `, về ${fmtDate(back)}` : ''}, ${paxText}, hạng ${cabin}${direct ? ', chỉ bay thẳng' : ''}`
    const sub = from.intl || to.intl ? 'Quốc tế' : 'Nội địa'
    const total = pax.adults + pax.children + pax.infants
    if (onSubmit) onSubmit({ need, date, pax: total, sub })
    else navigate(`/dich-vu/ve-may-bay?need=${encodeURIComponent(need)}&date=${date}&pax=${total}&muc=${encodeURIComponent(sub)}`)
  }

  const pill = (on: boolean) => cx('rounded-full border px-4 py-1.5 text-sm font-semibold', on ? 'border-sea bg-sand text-sea' : 'border-stone-200 text-sea hover:border-sea')
  return (
    <form onSubmit={submit} noValidate role="search">
      {/* Hàng tuỳ chọn */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setRoundTrip(false)} className={pill(!roundTrip)} aria-pressed={!roundTrip}>Một chiều</button>
        <button type="button" onClick={() => setRoundTrip(true)} className={pill(roundTrip)} aria-pressed={roundTrip}>Khứ hồi</button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 px-2 text-sm font-semibold text-ink">
            <input type="checkbox" checked={direct} onChange={(e) => setDirect(e.target.checked)} className="h-4 w-4 accent-sea" />Chỉ bay thẳng
          </label>
          <div className="relative" ref={paxPop.ref}>
            <button type="button" onClick={() => paxPop.setOpen(!paxPop.open)} className="flex h-10 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-bold text-ink hover:border-sea" aria-expanded={paxPop.open}>
              <Users size={16} className="text-ink/60" />{pax.adults} người lớn, {pax.children} trẻ em, {pax.infants} em bé<ChevronDown size={14} className="text-ink/50" />
            </button>
            {paxPop.open && (
              <div className="absolute right-0 z-30 mt-1 w-80 rounded-xl bg-white px-4 py-2 shadow-xl ring-1 ring-stone-200">
                <Stepper label="Người lớn" sub="Từ 12 tuổi" value={pax.adults} min={1} max={9} onChange={(v) => setPax({ ...pax, adults: v, infants: Math.min(pax.infants, v) })} />
                <Stepper label="Trẻ em" sub="2–11 tuổi" value={pax.children} min={0} max={8} onChange={(v) => setPax({ ...pax, children: v })} />
                <Stepper label="Em bé" sub="Dưới 2 tuổi, ngồi cùng người lớn" value={pax.infants} min={0} max={pax.adults} onChange={(v) => setPax({ ...pax, infants: v })} />
                <button type="button" onClick={() => paxPop.setOpen(false)} className="mb-2 mt-1 w-full rounded-md bg-sea py-2 text-sm font-semibold text-white hover:bg-sea-dark">Xong</button>
              </div>
            )}
          </div>
          <div className="relative" ref={cabinPop.ref}>
            <button type="button" onClick={() => cabinPop.setOpen(!cabinPop.open)} className="flex h-10 min-w-40 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm font-bold text-ink hover:border-sea" aria-expanded={cabinPop.open}>
              <Armchair size={16} className="text-ink/60" />{cabin}<ChevronDown size={14} className="ml-auto text-ink/50" />
            </button>
            {cabinPop.open && (
              <ul className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-stone-200">
                {CLASSES.map((c) => <li key={c}><button type="button" onClick={() => { setCabin(c); cabinPop.setOpen(false) }} className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-ink hover:bg-sand">{c}{c === cabin && <Check size={16} className="text-sea" />}</button></li>)}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Hàng chính */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <div>
          <div className="mb-1.5 hidden grid-cols-2 text-sm font-semibold text-ink/80 lg:grid"><span>Từ</span><span className="pl-4">Đến</span></div>
          <div className="relative grid rounded-xl border border-stone-300 sm:grid-cols-2">
            <AirportPicker label="Từ" value={from} onChange={setFrom} icon={PlaneTakeoff} exclude={to.code} className="border-b border-stone-200 sm:border-b-0 sm:border-r" />
            <AirportPicker label="Đến" value={to} onChange={setTo} icon={PlaneLanding} exclude={from.code} className="sm:pl-4" />
            <button type="button" onClick={() => { setFrom(to); setTo(from) }} className="absolute right-4 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-stone-300 bg-white text-sea shadow-sm hover:border-sea sm:left-1/2 sm:right-auto sm:-translate-x-1/2" aria-label="Đổi chiều đi – đến"><ArrowLeftRight size={16} /></button>
          </div>
        </div>
        <div>
          <div className="mb-1.5 hidden grid-cols-2 text-sm font-semibold text-ink/80 lg:grid">
            <span>Ngày đi</span>
            <label className="flex cursor-pointer items-center gap-2 pl-4"><input type="checkbox" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} className="h-4 w-4 accent-sea" /><span className={roundTrip ? 'font-bold text-ink' : ''}>Ngày về</span></label>
          </div>
          <div className="grid grid-cols-2 rounded-xl border border-stone-300">
            <label className="flex h-16 items-center gap-3 border-r border-stone-200 px-4">
              <CalendarDays size={20} className="shrink-0 text-sea" />
              <span className="min-w-0"><span className="block text-xs text-ink/60 lg:hidden">Ngày đi</span>
                <input type="date" value={date} min={today()} onChange={(e) => { setDate(e.target.value); if (back < e.target.value) setBack(addDaysISO(e.target.value, 2)) }} className="w-full bg-transparent text-base font-bold text-ink outline-none" aria-label="Ngày đi" /></span>
            </label>
            <label className={cx('flex h-16 items-center gap-3 px-4', !roundTrip && 'cursor-pointer bg-ground/70')} onClick={() => !roundTrip && setRoundTrip(true)}>
              <CalendarDays size={20} className={cx('shrink-0', roundTrip ? 'text-sea' : 'text-ink/30')} />
              <span className="min-w-0"><span className="block text-xs text-ink/60 lg:hidden">Ngày về</span>
                {roundTrip ? <input type="date" value={back} min={date} onChange={(e) => setBack(e.target.value)} className="w-full bg-transparent text-base font-bold text-ink outline-none" aria-label="Ngày về" />
                  : <span className="text-sm font-semibold text-ink/40">Thêm ngày về</span>}</span>
            </label>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="mb-1.5 hidden text-sm lg:block">&nbsp;</div>
          <button type="submit" className="flex h-16 items-center justify-center gap-2 rounded-xl bg-sea px-5 font-semibold text-white hover:bg-sea-dark lg:w-16 lg:px-0" aria-label="Tìm chuyến bay">
            <Search size={22} /><span className="lg:hidden">Tìm chuyến bay</span>
          </button>
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}

      {/* Gợi ý chặng bay */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-ink">Chặng phổ biến</span>
        {POPULAR.map(([a, b]) => (
          <button type="button" key={a + b} onClick={() => { setFrom(byCode(a)); setTo(byCode(b)) }} className="rounded-md bg-ink/60 px-3 py-1.5 text-sm font-semibold text-white hover:bg-ink/80">
            {byCode(a).city} → {byCode(b).city}
          </button>
        ))}
      </div>

      {/* Hãng bay */}
      <div className="mt-5 flex items-center justify-center gap-x-8 gap-y-2 overflow-hidden border-t border-stone-100 pt-4">
        <span className="shrink-0 text-xs italic text-ink/60">Hãng bay</span>
        {AIRLINES.map((n, i) => <span key={n} className={cx('whitespace-nowrap text-sm text-ink/70', i % 2 ? 'font-serif italic' : 'font-extrabold uppercase tracking-wider')}>{n}</span>)}
      </div>
    </form>
  )
}
