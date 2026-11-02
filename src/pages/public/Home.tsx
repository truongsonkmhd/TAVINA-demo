import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, MapPin, Copy, Ticket, Plane, Info, Hotel, Palmtree, Home as HomeIcon } from 'lucide-react'
import { useStore } from '@/store'
import { Button, cx } from '@/components/ui'
import { SERVICE_LABEL } from '@/lib/labels'
import { vnd, num, fmtDate, today, addDaysISO } from '@/lib/format'
import type { ServiceKey } from '@/types'
import { SERVICES } from '@/features/public/services'
import { SERVICE_ICON, SERVICE_ORDER, serviceHref } from '@/layouts/PublicLayout'
import { HotelSearchBar } from '@/features/public/components/HotelSearchBar'
import { ServicePanel } from '@/features/public/components/ServicePanel'
import { CouponCard } from '@/features/public/components/CouponCard'
import { Container, Img, pic } from '@/features/public/components/Shared'
import { Carousel, PillTabs } from '@/features/public/components/Carousel'
import { quoteAll, THANH_LONG_META } from '@/features/public/actions'

// Tuyến bay mẫu cho khối "Vé máy bay giá tốt" — giá tham khảo, đặt qua form tư vấn
const FLIGHT_DEALS: Record<string, { to: string; days: number; price: number; was?: number }[]> = {
  'Tuy Hoà': [
    { to: 'TP. Hồ Chí Minh', days: 6, price: 899000, was: 1150000 }, { to: 'Hà Nội', days: 10, price: 1390000, was: 1620000 },
    { to: 'Đà Nẵng', days: 14, price: 990000 }, { to: 'Hải Phòng', days: 20, price: 1450000, was: 1700000 }, { to: 'Vinh', days: 25, price: 1290000 },
  ],
  'Hà Nội': [
    { to: 'Tuy Hoà', days: 20, price: 1448000, was: 1541000 }, { to: 'Quy Nhơn', days: 47, price: 1047000, was: 1386000 }, { to: 'Nha Trang', days: 120, price: 1142000, was: 1285000 },
    { to: 'Phú Quốc', days: 14, price: 1249000 }, { to: 'Huế', days: 21, price: 1175000 },
  ],
  'TP. Hồ Chí Minh': [
    { to: 'Tuy Hoà', days: 9, price: 899000, was: 1090000 }, { to: 'Hà Nội', days: 12, price: 1190000 }, { to: 'Đà Lạt', days: 18, price: 690000, was: 820000 },
    { to: 'Côn Đảo', days: 30, price: 1690000 }, { to: 'Đà Nẵng', days: 8, price: 790000 },
  ],
}

const HOTEL_TABS = ['Phú Yên', 'Quy Nhơn', 'Nha Trang', 'Đà Lạt'] as const
type HotelTab = (typeof HOTEL_TABS)[number]

export default function Home() {
  const navigate = useNavigate()
  const toast = useStore((s) => s.toast)
  const cms = useStore((s) => s.cms)
  const settings = useStore((s) => s.settings)
  const roomTypes = useStore((s) => s.roomTypes)
  const rooms = useStore((s) => s.rooms)
  const bookings = useStore((s) => s.bookings)
  const ratePlans = useStore((s) => s.ratePlans)
  const allCoupons = useStore((s) => s.coupons)
  const allCombos = useStore((s) => s.combos)
  const allPromotions = useStore((s) => s.promotions)
  const partnerHotels = useStore((s) => s.partnerHotels)
  const [tab, setTab] = useState<ServiceKey>('hotel')
  const [flightFrom, setFlightFrom] = useState<string>('Tuy Hoà')
  const [hotelTab, setHotelTab] = useState<HotelTab>('Phú Yên')

  const T = today()
  const SVC_ORDER = ['hotel', 'flight', 'activity', 'bus', 'tour', 'sim', 'visa']
  const coupons = allCoupons.filter((c) => c.active && c.from <= T && c.to >= T && c.used < c.maxUses).sort((a, b) => SVC_ORDER.indexOf(a.service ?? 'hotel') - SVC_ORDER.indexOf(b.service ?? 'hotel'))
  const combos = allCombos.filter((c) => c.active)
  const promotions = allPromotions.filter((p) => p.active && p.to >= T)
  const quotes = useMemo(() => quoteAll({ rooms, bookings, ratePlans, roomTypes }, T, addDaysISO(T, 1)), [rooms, bookings, ratePlans, roomTypes, T])
  const tlPrice = Math.min(...quotes.map((q) => q.avg))
  const tlFree = quotes.reduce((x, q) => x + q.available, 0)
  const tabInfo = SERVICES.find((s) => s.key === tab)!
  const hotelsInTab = partnerHotels.filter((h) => h.city === hotelTab)

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => undefined)
    toast(`Đã sao chép mã ${code}`)
  }

  return (
    <div className="bg-white">
      {/* HERO: ảnh nền lớn, header trong suốt đè lên, khối tìm kiếm nổi */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <img src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=70" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/20 to-ink/40" />
        </div>
        <Container className="pb-12 pt-24 md:pb-16 lg:pt-28">
          <h1 className="mx-auto max-w-4xl text-center text-3xl font-extrabold leading-tight text-white drop-shadow md:text-[40px]">{cms.heroTitle}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-center text-base text-white/95 drop-shadow md:text-lg">{cms.heroSubtitle}</p>

          <div className="mx-auto mt-8 rounded-2xl bg-white p-4 shadow-2xl md:p-6">
            {/* Tab dịch vụ */}
            <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-stone-200 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Chọn dịch vụ">
              {SERVICE_ORDER.map((k) => {
                const Icon = SERVICE_ICON[k]
                return (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                    className={cx('flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors', tab === k ? 'bg-sea text-white' : 'text-ink/80 hover:bg-sand hover:text-sea')}>
                    <Icon size={20} /> {SERVICE_LABEL[k]}
                  </button>
                )
              })}
            </div>

            <div className="pt-4"><ServicePanel key={tab} service={tab} /></div>

            {/* Đối tác — tab Vé máy bay đã có dòng hãng bay riêng */}
            {tab !== 'flight' && (
            <div className="mt-5 flex items-center justify-center gap-x-8 overflow-hidden border-t border-stone-100 pt-4">
              <span className="shrink-0 text-xs italic text-ink/60">Đối tác tin cậy</span>
              {[settings.hotelName, ...partnerHotels.slice(0, 3).map((h) => h.name)].map((n, i) => (
                <span key={n} className={cx('whitespace-nowrap text-ink/70', i % 2 ? 'font-serif text-lg tracking-wide' : 'text-base font-extrabold uppercase tracking-[0.15em]')}>{n}</span>
              ))}
            </div>
            )}
          </div>
        </Container>
      </section>

      {/* Mã giảm giá */}
      {coupons.length > 0 && (
        <section className="pt-10">
          <Container>
            <h2 className="text-2xl font-bold">Mã giảm giá cho khách mới</h2>
            <p className="mt-1 text-ink/60">Dùng cho lần đặt đầu tiên trên web TAVINA — khách sạn, vé máy bay, vui chơi, xe, tour và SIM.</p>
            <div className="mt-4">
              <Carousel label="Mã giảm giá">
                {coupons.map((c) => <CouponCard key={c.id} coupon={c} className="w-[300px] shrink-0 snap-start md:w-[390px]" />)}
              </Carousel>
            </div>
          </Container>
        </section>
      )}

      {/* Khuyến mãi đang diễn ra */}
      <section className="pt-10">
        <Container>
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold">Khuyến mãi đang diễn ra</h2>
            <Link to="/khuyen-mai" className="text-sm font-semibold text-sea hover:underline">Xem tất cả</Link>
          </div>
          <div className="mt-4">
            <Carousel label="Khuyến mãi">
              {cms.banners.map((b) => (
                <Link key={b.id} to={b.link} className="group relative w-[85%] shrink-0 snap-start overflow-hidden rounded-xl sm:w-[460px]">
                  <Img src={b.image} alt={b.title} ratio="aspect-[2/1]" />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 to-transparent p-5 text-white">
                    <div className="text-xl font-extrabold">{b.title}</div>
                    <div className="text-sm text-white/90">{b.subtitle}</div>
                  </div>
                </Link>
              ))}
              {combos.map((c) => (
                <Link key={c.id} to={`/khach-san/thanh-long?combo=${c.id}`} className="group relative w-[85%] shrink-0 snap-start overflow-hidden rounded-xl sm:w-[460px]">
                  <Img src={c.image} alt={c.name} ratio="aspect-[2/1]" />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/70 to-transparent p-5 text-white">
                    <div className="text-xs font-semibold uppercase">Combo</div>
                    <div className="text-lg font-extrabold leading-snug">{c.name}</div>
                    <div className="mt-1 text-sm">Chỉ từ <span className="font-bold text-coral">{vnd(c.comboPrice)}</span></div>
                  </div>
                </Link>
              ))}
              {promotions.map((p) => (
                <Link key={p.id} to="/khuyen-mai" className="flex w-[85%] shrink-0 snap-start flex-col justify-between rounded-xl bg-sea p-5 text-white sm:w-[460px]">
                  <div>
                    <div className="text-xs font-semibold uppercase text-white/80">Ưu đãi Khách sạn Thanh Long</div>
                    <div className="mt-2 text-2xl font-extrabold">{p.name}</div>
                    <div className="mt-1 text-sm text-white/90">{p.description}</div>
                  </div>
                  <div className="mt-4 text-sm text-white/80">Đến {fmtDate(p.to)}</div>
                </Link>
              ))}
            </Carousel>
          </div>
        </Container>
      </section>

      {/* Khách sạn giá tốt */}
      <section className="pt-12">
        <Container>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Khách sạn giá tốt</h2>
              <p className="mt-1 text-ink/60">Giá tham khảo cho 1 đêm, 2 người lớn.</p>
            </div>
            <Link to={`/khach-san?city=${encodeURIComponent(hotelTab)}`} className="text-sm font-semibold text-sea hover:underline">Xem thêm</Link>
          </div>
          <div className="mt-4">
            <PillTabs tabs={HOTEL_TABS.map((t) => ({ id: t, label: t }))} value={hotelTab} onChange={setHotelTab} />
            <Carousel label="Khách sạn giá tốt">
              {hotelTab === 'Phú Yên' && (
                <Link to="/khach-san/thanh-long" className="group w-[240px] shrink-0 snap-start overflow-hidden rounded-xl border-2 border-sea bg-white md:w-[260px]">
                  <div className="relative">
                    <Img src={THANH_LONG_META.images[0]} alt={settings.hotelName} ratio="aspect-[4/3]" />
                    <span className="absolute left-2 top-2 rounded bg-sea px-2 py-0.5 text-xs font-bold text-white">Đối tác TAVINA</span>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1 text-xs text-ink/60"><MapPin size={12} /> Tuy Hoà</div>
                    <h3 className="mt-1 line-clamp-2 font-bold leading-snug group-hover:text-sea">{settings.hotelName}</h3>
                    <div className="mt-1 text-xs"><span className="font-bold text-sea">8.9/10</span> <span className="text-ink/60">· còn {tlFree} phòng đêm nay</span></div>
                    <div className="tnum mt-2 text-lg font-extrabold text-coral">{vnd(tlPrice)}</div>
                  </div>
                </Link>
              )}
              {hotelsInTab.map((h) => {
                const was = Math.round((h.priceFrom * 1.3) / 1000) * 1000
                return (
                  <Link key={h.id} to={`/khach-san/${h.id}`} className="group w-[240px] shrink-0 snap-start overflow-hidden rounded-xl border border-stone-200 bg-white md:w-[260px]">
                    <div className="relative">
                      <Img src={h.image} alt={h.name} ratio="aspect-[4/3]" />
                      <span className="absolute left-2 top-2 rounded bg-coral px-2 py-0.5 text-xs font-bold text-white">Tiết kiệm 23%</span>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-1 text-xs text-ink/60"><MapPin size={12} /> {h.area}</div>
                      <h3 className="mt-1 line-clamp-2 font-bold leading-snug group-hover:text-sea">{h.name}</h3>
                      <div className="mt-1 text-xs"><span className="font-bold text-sea">{h.rating}/10</span> <span className="text-ink/60">· {num(h.reviews)} đánh giá</span></div>
                      <div className="tnum mt-2 text-xs text-ink/50 line-through">{vnd(was)}</div>
                      <div className="tnum text-lg font-extrabold text-coral">{vnd(h.priceFrom)}</div>
                    </div>
                  </Link>
                )
              })}
              {hotelTab !== 'Phú Yên' && hotelsInTab.length === 0 && <p className="py-8 text-ink/60">Chưa có khách sạn đối tác ở {hotelTab}.</p>}
            </Carousel>
          </div>
        </Container>
      </section>

      {/* Vé máy bay giá tốt */}
      <section className="pt-12">
        <Container>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Vé máy bay giá tốt</h2>
              <p className="mt-1 text-ink/60">Giá một chiều tham khảo. Tư vấn viên giữ chỗ và xuất vé cho bạn.</p>
            </div>
            <Link to={serviceHref('flight')} className="text-sm font-semibold text-sea hover:underline">Xem thêm</Link>
          </div>
          <div className="mt-4">
            <PillTabs tabs={Object.keys(FLIGHT_DEALS).map((t) => ({ id: t, label: `Từ ${t}` }))} value={flightFrom} onChange={setFlightFrom} />
            <Carousel label="Vé máy bay giá tốt">
              {FLIGHT_DEALS[flightFrom].map((f) => (
                <Link key={f.to} to={`${serviceHref('flight')}?tu=${encodeURIComponent(flightFrom)}&den=${encodeURIComponent(f.to)}`} className="group w-[240px] shrink-0 snap-start overflow-hidden rounded-xl border border-stone-200 bg-white md:w-[260px]">
                  <Img src={pic(`fl-${f.to}`, 600, 400)} alt={f.to} ratio="aspect-[16/10]" />
                  <div className="p-3">
                    <div className="flex items-center gap-1 text-xs font-semibold text-ink/60"><Plane size={12} /> Một chiều</div>
                    <h3 className="mt-1 font-bold group-hover:text-sea">{flightFrom} – {f.to}</h3>
                    <div className="text-xs text-ink/60">{fmtDate(addDaysISO(T, f.days))}</div>
                    <div className="mt-2 text-xs text-ink/60">Giá tốt chỉ từ</div>
                    {f.was && <div className="tnum text-xs text-ink/50 line-through">{vnd(f.was)}</div>}
                    <div className="tnum text-lg font-extrabold text-coral">{vnd(f.price)}</div>
                  </div>
                </Link>
              ))}
            </Carousel>
          </div>
        </Container>
      </section>

      {/* Khám phá dịch vụ */}
      <section className="pt-12">
        <Container>
          <h2 className="text-2xl font-bold">Khám phá dịch vụ TAVINA</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {SERVICE_ORDER.map((k) => {
              const s = SERVICES.find((x) => x.key === k)!
              const Icon = SERVICE_ICON[k]
              return (
                <Link key={k} to={serviceHref(k)} className="group flex flex-col items-center gap-2 rounded-xl border border-stone-200 p-4 text-center hover:border-sea hover:shadow-sm">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-sand text-sea"><Icon size={24} /></span>
                  <span className="font-semibold group-hover:text-sea">{SERVICE_LABEL[k]}</span>
                  <span className="line-clamp-2 text-xs text-ink/60">{s.subcategories.map((c) => c.name).slice(0, 2).join(' · ')}</span>
                </Link>
              )
            })}
          </div>
        </Container>
      </section>

      {/* Cẩm nang */}
      <section className="pt-12">
        <Container>
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold">Cẩm nang du lịch Phú Yên</h2>
            <Link to="/cam-nang" className="text-sm font-semibold text-sea hover:underline">Xem tất cả</Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {cms.posts.slice(0, 3).map((p) => (
              <Link key={p.id} to={`/cam-nang?post=${p.id}`} className="group overflow-hidden rounded-xl border border-stone-200">
                <Img src={p.image} alt={p.title} ratio="aspect-[16/10]" />
                <div className="p-4">
                  <div className="text-xs text-ink/60">{fmtDate(p.date)}</div>
                  <h3 className="mt-1 font-bold leading-snug group-hover:text-sea">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/70">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </div>
  )
}
