import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Check, Wifi, Waves, Coffee, Dumbbell, BadgeCheck } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Modal, cx } from '@/components/ui'
import { vnd, nights, fmtDate } from '@/lib/format'
import { HotelSearchBar, parseQuery, toSearch, type HotelQuery } from '@/features/public/components/HotelSearchBar'
import { Container, Img, Breadcrumb } from '@/features/public/components/Shared'
import { quoteAll, THANH_LONG_ID, THANH_LONG_META } from '@/features/public/actions'
import { TL_GALLERY, partnerImg, refPrice, RatingBadge, StarRow, Area } from '@/features/public/hotel'

interface Row {
  id: string
  name: string
  area: string
  stars: number
  rating: number
  reviews: number
  price: number // giá/đêm thấp nhất
  available?: number
  image: string
  amenities: string[]
  freeCancel: boolean
  partner: boolean // đối tác chiến lược (dữ liệu PMS)
  description: string
}

type Sort = 'recommended' | 'price' | 'rating'
interface Filters { maxPrice: number; stars: number[]; amenities: string[]; freeCancel: boolean; areas: string[] }
const EMPTY: Filters = { maxPrice: 0, stars: [], amenities: [], freeCancel: false, areas: [] }
const AMENITY_ICON: Record<string, typeof Wifi> = { Wifi, 'Hồ bơi': Waves, 'Bữa sáng': Coffee, Gym: Dumbbell }

export default function HotelSearch() {
  const [sp, setSp] = useSearchParams()
  const q = parseQuery(sp)
  const n = nights(q.from, q.to)
  const rooms = useStore((s) => s.rooms)
  const bookings = useStore((s) => s.bookings)
  const ratePlans = useStore((s) => s.ratePlans)
  const roomTypes = useStore((s) => s.roomTypes)
  const partnerHotels = useStore((s) => s.partnerHotels)
  const hotelName = useStore((s) => s.settings.hotelName)
  const [sort, setSort] = useState<Sort>('recommended')
  const [f, setF] = useState<Filters>(EMPTY)
  const [filterOpen, setFilterOpen] = useState(false)

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    if (q.city === 'Phú Yên') {
      const quotes = quoteAll({ rooms, bookings, ratePlans, roomTypes }, q.from, q.to, q.adults).filter((x) => x.rt.capacity >= Math.min(q.adults, 4))
      const open = quotes.filter((x) => x.available > 0)
      const cheapest = (open.length ? open : quotes).sort((a, b) => a.avg - b.avg)[0]
      out.push({
        id: THANH_LONG_ID, name: hotelName, area: THANH_LONG_META.area, stars: THANH_LONG_META.stars, rating: THANH_LONG_META.rating, reviews: THANH_LONG_META.reviews,
        price: cheapest?.avg ?? 0, available: open.reduce((x, r) => x + r.available, 0), image: TL_GALLERY[0], amenities: ['Wifi', 'Bữa sáng', 'Gần biển'],
        freeCancel: true, partner: true, description: THANH_LONG_META.highlights[0],
      })
    }
    for (const h of partnerHotels.filter((x) => x.city === q.city)) {
      out.push({ id: h.id, name: h.name, area: h.area, stars: h.stars, rating: h.rating, reviews: h.reviews, price: h.priceFrom, image: partnerImg(h), amenities: h.amenities, freeCancel: h.freeCancel, partner: false, description: h.description })
    }
    return out
  }, [q.city, q.from, q.to, q.adults, rooms, bookings, ratePlans, roomTypes, partnerHotels, hotelName])

  const maxPriceAll = Math.max(500000, ...rows.map((r) => r.price))
  const areas = [...new Set(rows.map((r) => r.area))]
  const amenityList = [...new Set(rows.flatMap((r) => r.amenities))]

  const shown = rows
    .filter((r) => (!f.maxPrice || r.price <= f.maxPrice) && (!f.stars.length || f.stars.includes(r.stars)) && (!f.freeCancel || r.freeCancel)
      && (!f.areas.length || f.areas.includes(r.area)) && f.amenities.every((a) => r.amenities.includes(a)))
    .sort((a, b) => {
      if (sort === 'price') return a.price - b.price
      if (sort === 'rating') return b.rating - a.rating
      return Number(b.partner) - Number(a.partner) || b.rating - a.rating
    })
  const activeCount = (f.maxPrice ? 1 : 0) + f.stars.length + f.amenities.length + (f.freeCancel ? 1 : 0) + f.areas.length

  const submit = (nq: HotelQuery) => setSp(new URLSearchParams(toSearch(nq).slice(1)))
  const toggle = <K extends 'stars' | 'amenities' | 'areas'>(k: K, v: Filters[K][number]) =>
    setF((x) => ({ ...x, [k]: (x[k] as unknown[]).includes(v) ? (x[k] as unknown[]).filter((y) => y !== v) : [...(x[k] as unknown[]), v] }))

  const filterPanel = (
    <div className="space-y-6 text-sm">
      <div>
        <div className="mb-2 font-bold">Giá mỗi đêm</div>
        <input type="range" min={300000} max={maxPriceAll} step={50000} value={f.maxPrice || maxPriceAll} onChange={(e) => setF({ ...f, maxPrice: Number(e.target.value) >= maxPriceAll ? 0 : Number(e.target.value) })} className="w-full accent-sea" aria-label="Giá tối đa" />
        <div className="mt-1 flex justify-between text-xs text-ink/60"><span>{vnd(300000)}</span><span>{f.maxPrice ? `≤ ${vnd(f.maxPrice)}` : 'Mọi mức giá'}</span></div>
      </div>
      <div>
        <div className="mb-2 font-bold">Hạng sao</div>
        <div className="flex flex-wrap gap-2">
          {[2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => toggle('stars', s)} aria-pressed={f.stars.includes(s)} className={cx('rounded-full border px-3 py-1.5 font-semibold', f.stars.includes(s) ? 'border-sea bg-sand text-sea' : 'border-stone-300 hover:border-sea')}>{s} ★</button>
          ))}
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 font-semibold">
        <input type="checkbox" checked={f.freeCancel} onChange={(e) => setF({ ...f, freeCancel: e.target.checked })} className="h-4 w-4 accent-sea" /> Huỷ miễn phí
      </label>
      {amenityList.length > 0 && (
        <div>
          <div className="mb-2 font-bold">Tiện nghi</div>
          {amenityList.map((a) => (
            <label key={a} className="flex cursor-pointer items-center gap-2 py-1"><input type="checkbox" checked={f.amenities.includes(a)} onChange={() => toggle('amenities', a)} className="h-4 w-4 accent-sea" />{a}</label>
          ))}
        </div>
      )}
      {areas.length > 1 && (
        <div>
          <div className="mb-2 font-bold">Khu vực</div>
          {areas.map((a) => (
            <label key={a} className="flex cursor-pointer items-center gap-2 py-1"><input type="checkbox" checked={f.areas.includes(a)} onChange={() => toggle('areas', a)} className="h-4 w-4 accent-sea" />{a}</label>
          ))}
        </div>
      )}
      {activeCount > 0 && <button onClick={() => setF(EMPTY)} className="font-semibold text-sea hover:underline">Xoá bộ lọc ({activeCount})</button>}
    </div>
  )

  return (
    <div className="bg-ground pb-10">
      <div className="bg-sea">
        <Container className="py-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <HotelSearchBar value={q} onSubmit={submit} compact />
          </div>
        </Container>
      </div>

      <Container className="pt-5">
        <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Khách sạn', to: '/khach-san' }, { label: q.city }]} />
        <div className="mt-4 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-32 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70">
              <div className="mb-4 flex items-center gap-2 text-base font-bold"><SlidersHorizontal size={18} /> Bộ lọc</div>
              {filterPanel}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold">{q.city}: {shown.length} khách sạn</h1>
                <p className="text-sm text-ink/60">{fmtDate(q.from)} – {fmtDate(q.to)} · {n} đêm · {q.adults} người lớn</p>
              </div>
              <Button tone="secondary" size="sm" className="lg:hidden" onClick={() => setFilterOpen(true)}><SlidersHorizontal size={16} /> Lọc{activeCount ? ` (${activeCount})` : ''}</Button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-stone-200/70 [scrollbar-width:none]" role="tablist" aria-label="Sắp xếp">
              {([['recommended', 'Phổ biến nhất'], ['price', 'Giá thấp nhất'], ['rating', 'Điểm cao nhất']] as [Sort, string][]).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={sort === k} onClick={() => setSort(k)} className={cx('flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold', sort === k ? 'bg-sand text-sea' : 'text-ink/70 hover:bg-ground')}>{l}</button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {shown.length === 0 && (
                <div className="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-200/70">
                  <p className="font-bold">Không có khách sạn phù hợp</p>
                  <p className="mt-1 text-sm text-ink/60">Thử bỏ bớt bộ lọc hoặc đổi điểm đến.</p>
                  {activeCount > 0 && <Button className="mt-4" onClick={() => setF(EMPTY)}>Xoá bộ lọc</Button>}
                </div>
              )}
              {shown.map((r) => {
                const href = r.partner ? `/khach-san/${r.id}${toSearch(q)}` : `/khach-san/${r.id}${toSearch(q)}`
                const soldOut = r.partner && !r.available
                return (
                  <Link key={r.id} to={href} className={cx('group grid overflow-hidden rounded-xl bg-white shadow-sm ring-1 transition-shadow hover:shadow-md sm:grid-cols-[240px_1fr] md:grid-cols-[260px_1fr_200px]', r.partner ? 'ring-2 ring-sea' : 'ring-stone-200/70')}>
                    <div className="relative">
                      <Img src={r.image} alt={r.name} ratio="aspect-[16/10] sm:aspect-auto sm:h-full" />
                      {r.partner && <span className="absolute left-0 top-3 rounded-r bg-sea px-2 py-1 text-xs font-bold text-white">Đối tác TAVINA</span>}
                    </div>
                    <div className="p-4">
                      <h2 className="text-lg font-bold leading-snug group-hover:text-sea">{r.name}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-3"><StarRow n={r.stars} /><Area text={`${r.area}, ${q.city}`} /></div>
                      <RatingBadge rating={r.rating} reviews={r.reviews} className="mt-2" />
                      <p className="mt-2 line-clamp-2 text-sm text-ink/70">{r.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.amenities.slice(0, 4).map((a) => {
                          const Icon = AMENITY_ICON[a] ?? Check
                          return <span key={a} className="inline-flex items-center gap-1 rounded bg-ground px-2 py-1 text-xs text-ink/80"><Icon size={12} />{a}</span>
                        })}
                      </div>
                      {r.partner && <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><BadgeCheck size={14} /> Giá và phòng trống cập nhật trực tiếp từ khách sạn</p>}
                    </div>
                    <div className="flex flex-col justify-end border-t border-stone-100 p-4 text-right sm:col-span-2 md:col-span-1 md:border-l md:border-t-0">
                      {r.freeCancel && <span className="mb-auto self-end rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Huỷ miễn phí</span>}
                      {soldOut ? (
                        <div className="mt-3 text-sm font-semibold text-red-600">Hết phòng ngày đã chọn</div>
                      ) : (
                        <>
                          {r.partner && r.available !== undefined && r.available <= 3 && <div className="mt-3 text-xs font-semibold text-red-600">Chỉ còn {r.available} phòng</div>}
                          <div className="tnum mt-3 text-xs text-ink/50 line-through">{vnd(refPrice(r.price, r.partner ? 15 : 23))}</div>
                          <div className="tnum text-xl font-extrabold text-coral">{vnd(r.price)}</div>
                          <div className="text-xs text-ink/60">/ phòng / đêm</div>
                          <div className="tnum text-xs text-ink/60">Tổng {n} đêm: {vnd(r.price * n)}</div>
                        </>
                      )}
                      <span className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-coral px-4 text-sm font-semibold text-white group-hover:bg-coral-dark">{r.partner ? 'Chọn phòng' : 'Xem chi tiết'}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </Container>

      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} title="Bộ lọc" footer={<Button onClick={() => setFilterOpen(false)}>Xem {shown.length} kết quả</Button>}>
        {filterPanel}
      </Modal>
    </div>
  )
}
