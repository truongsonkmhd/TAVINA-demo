import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarDays, Users, Check, Wifi, Coffee, Car, Waves, Utensils, ShieldCheck, Clock, Baby, Cigarette, PawPrint, Maximize2, BedDouble, Images, Gift, BadgeCheck } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Modal, Select, cx } from '@/components/ui'
import { vnd, fmtDate, nights, today, addDaysISO } from '@/lib/format'
import { parseQuery, toSearch } from '@/features/public/components/HotelSearchBar'
import { Container, Img, Breadcrumb } from '@/features/public/components/Shared'
import { PriceCalendar } from '@/features/public/components/PriceCalendar'
import { LeadForm } from '@/features/public/components/LeadForm'
import { quoteAll, THANH_LONG_ID, THANH_LONG_META } from '@/features/public/actions'
import { TL_GALLERY, ROOM_IMG, partnerImg, refPrice, RatingBadge, StarRow, Area, ratingWord } from '@/features/public/hotel'

const FACILITIES = [
  { icon: Wifi, label: 'Wifi miễn phí' }, { icon: Coffee, label: 'Bữa sáng' }, { icon: Car, label: 'Đỗ xe miễn phí' }, { icon: Waves, label: 'Gần biển 300 m' },
  { icon: Utensils, label: 'Nhà hàng' }, { icon: ShieldCheck, label: 'Lễ tân 24 giờ' }, { icon: Car, label: 'Đưa đón sân bay' }, { icon: Clock, label: 'Nhận phòng nhanh' },
]
const NEARBY = [['Biển Tuy Hoà', '300 m'], ['Tháp Nhạn', '1,8 km'], ['Chợ Tuy Hoà', '1,2 km'], ['Sân bay Tuy Hoà', '7 km'], ['Gành Đá Đĩa', '42 km'], ['Mũi Điện', '35 km']]
const SECTIONS = [['tong-quan', 'Tổng quan'], ['phong', 'Phòng'], ['tien-nghi', 'Tiện nghi'], ['chinh-sach', 'Chính sách'], ['vi-tri', 'Vị trí']] as const

export default function HotelDetail() {
  const { id = '' } = useParams()
  return id === THANH_LONG_ID ? <ThanhLong /> : <PartnerDetail id={id} />
}

function Gallery({ images, name }: { images: string[]; name: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="relative grid h-[260px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl md:h-[400px]">
        <button onClick={() => setOpen(true)} className="col-span-4 row-span-2 md:col-span-2"><img src={images[0]} alt={name} className="h-full w-full object-cover" /></button>
        {images.slice(1, 5).map((src, i) => (
          <button key={src + i} onClick={() => setOpen(true)} className="hidden md:block"><img src={src} alt={`${name} ảnh ${i + 2}`} loading="lazy" className="h-full w-full object-cover" /></button>
        ))}
        <button onClick={() => setOpen(true)} className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-1.5 text-sm font-semibold shadow"><Images size={16} /> Xem tất cả {images.length} ảnh</button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={`Ảnh — ${name}`} wide>
        <div className="grid gap-2 sm:grid-cols-2">{images.map((src, i) => <img key={src + i} src={src} alt={`${name} ảnh ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full rounded object-cover" />)}</div>
      </Modal>
    </>
  )
}

function SectionNav() {
  return (
    <nav className="sticky top-16 z-30 -mx-4 mt-4 overflow-x-auto border-b border-stone-200 bg-white px-4 lg:top-[108px] [scrollbar-width:none]" aria-label="Mục">
      <div className="flex gap-1">
        {SECTIONS.map(([idx, label]) => <a key={idx} href={`#${idx}`} className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-ink/70 hover:border-sea hover:text-sea">{label}</a>)}
      </div>
    </nav>
  )
}

function ThanhLong() {
  const navigate = useNavigate()
  const [sp, setSp] = useSearchParams()
  const q = parseQuery(sp)
  const settings = useStore((s) => s.settings)
  const rooms = useStore((s) => s.rooms)
  const bookings = useStore((s) => s.bookings)
  const ratePlans = useStore((s) => s.ratePlans)
  const roomTypes = useStore((s) => s.roomTypes)
  const combos = useStore((s) => s.combos)
  const createBooking = useStore((s) => s.createBooking)
  const upsertGuest = useStore((s) => s.upsertGuest)
  const toast = useStore((s) => s.toast)

  const combo = combos.find((c) => c.id === sp.get('combo') && c.active)
  const [qty, setQty] = useState<Record<string, number>>({})
  const [dateOpen, setDateOpen] = useState(false)
  const [calType, setCalType] = useState(roomTypes[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  // combo: khoá số đêm theo combo, chọn sẵn 1 phòng hạng tương ứng
  useEffect(() => {
    if (!combo) return
    if (nights(q.from, q.to) !== combo.nights) setSp((p) => { const n = new URLSearchParams(p); n.set('to', addDaysISO(q.from, combo.nights)); return n }, { replace: true })
    setQty({ [combo.roomTypeId]: 1 })
  }, [combo?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const n = nights(q.from, q.to)
  const quotes = useMemo(() => quoteAll({ rooms, bookings, ratePlans, roomTypes }, q.from, q.to, Math.min(q.adults, 2)), [rooms, bookings, ratePlans, roomTypes, q.from, q.to, q.adults])
  const open = quotes.filter((x) => x.available > 0)
  const priceFrom = (open.length ? open : quotes).reduce((m, x) => Math.min(m, x.avg), Infinity)
  const picked = quotes.filter((x) => (qty[x.rt.id] ?? 0) > 0)
  const roomsPicked = picked.reduce((s, x) => s + qty[x.rt.id], 0)
  const capacity = picked.reduce((s, x) => s + x.rt.capacity * qty[x.rt.id], 0)
  const roomTotal = picked.reduce((s, x) => s + x.total * qty[x.rt.id], 0)
  const comboExtra = combo ? combo.services.reduce((s, x) => s + x.price, 0) : 0
  const total = combo && picked.some((x) => x.rt.id === combo.roomTypeId) ? combo.comboPrice + (roomTotal - (quotes.find((x) => x.rt.id === combo.roomTypeId)?.total ?? 0)) : roomTotal
  const capacityShort = roomsPicked > 0 && capacity < q.adults

  const setDates = (from: string, to: string) => {
    setSp((p) => { const nx = new URLSearchParams(p); nx.set('from', from); nx.set('to', to); return nx }, { replace: true })
    setQty({})
    setDateOpen(false)
  }

  const book = () => {
    if (!roomsPicked || busy) return
    setBusy(true)
    const tmp = upsertGuest({ name: 'Khách web', phone: `tmp-${Date.now()}` })
    const ids: string[] = []
    const perRoomAdults = Math.max(1, Math.ceil(q.adults / roomsPicked))
    for (const x of picked) {
      for (let i = 0; i < qty[x.rt.id]; i++) {
        const r = createBooking({ source: 'web', status: 'hold', guestId: tmp.id, roomTypeId: x.rt.id, checkIn: q.from, checkOut: q.to, adults: Math.min(perRoomAdults, x.rt.capacity), comboId: combo && x.rt.id === combo.roomTypeId && i === 0 ? combo.id : undefined })
        if (r.error || !r.booking) {
          // huỷ các hold đã tạo trong lượt này
          for (const bid of ids) useStore.getState().setBookingStatus(bid, 'expired')
          toast(r.error ?? 'Không giữ được phòng, vui lòng thử lại', 'err')
          setBusy(false)
          return
        }
        ids.push(r.booking.id)
      }
    }
    navigate(`/dat-phong/${ids[0]}${ids.length > 1 ? `?also=${ids.slice(1).join(',')}` : ''}`)
  }

  const scrollToRooms = () => document.getElementById('phong')?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div className="bg-ground pb-28">
      <Container className="pt-4">
        <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Khách sạn', to: `/khach-san${toSearch(q)}` }, { label: settings.hotelName }]} />

        <div className="mt-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-sea px-2 py-0.5 text-xs font-bold text-white">Đối tác TAVINA</span>
                <StarRow n={THANH_LONG_META.stars} />
              </div>
              <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{settings.hotelName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3"><Area text={settings.address} /><RatingBadge rating={THANH_LONG_META.rating} reviews={THANH_LONG_META.reviews} /></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink/60">Giá mỗi đêm từ</div>
              <div className="tnum text-2xl font-extrabold text-coral">{Number.isFinite(priceFrom) ? vnd(priceFrom) : '—'}</div>
              <Button tone="accent" className="mt-2" onClick={scrollToRooms}>Chọn phòng</Button>
            </div>
          </div>
          <div className="mt-4"><Gallery images={TL_GALLERY} name={settings.hotelName} /></div>
        </div>

        <SectionNav />

        {/* Tổng quan */}
        <section id="tong-quan" className="scroll-mt-40 pt-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 lg:col-span-2">
              <h2 className="text-lg font-bold">Giới thiệu</h2>
              <p className="mt-2 text-ink/80">Khách sạn {THANH_LONG_META.stars} sao ở trung tâm Tuy Hoà, cách biển 300 m. 24 phòng Standard, Deluxe và Family, phù hợp cho cặp đôi, gia đình và đoàn công tác. Giá và phòng trống trên trang này lấy trực tiếp từ hệ thống quản lý của khách sạn.</p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {THANH_LONG_META.highlights.map((h) => <li key={h} className="flex items-start gap-2 text-sm"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />{h}</li>)}
              </ul>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
              <div className="flex items-center gap-3">
                <span className="tnum rounded-lg bg-sea px-3 py-2 text-2xl font-extrabold text-white">{THANH_LONG_META.rating}</span>
                <div><div className="font-bold text-sea">{ratingWord(THANH_LONG_META.rating)}</div><div className="text-sm text-ink/60">{THANH_LONG_META.reviews} đánh giá</div></div>
              </div>
              {[['Sạch sẽ', 9.1], ['Vị trí', 9.3], ['Phục vụ', 8.8], ['Đáng giá tiền', 8.7]].map(([k, v]) => (
                <div key={k} className="mt-3 text-sm">
                  <div className="flex justify-between"><span>{k}</span><span className="tnum font-semibold">{v}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-stone-200"><div className="h-full rounded-full bg-sea" style={{ width: `${(Number(v) / 10) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Phòng */}
        <section id="phong" className="scroll-mt-40 pt-8">
          <h2 className="text-xl font-bold">Chọn phòng</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-200/70">
            <button onClick={() => setDateOpen(true)} className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm hover:border-sea">
              <CalendarDays size={16} className="text-sea" /><span className="font-semibold">{fmtDate(q.from)} – {fmtDate(q.to)}</span><span className="text-ink/60">· {n} đêm</span>
            </button>
            <label className="flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-1 text-sm">
              <Users size={16} className="text-sea" />
              <Select className="h-8 border-0 px-1 focus:ring-0" value={q.adults} onChange={(e) => setSp((p) => { const nx = new URLSearchParams(p); nx.set('adults', e.target.value); return nx }, { replace: true })} aria-label="Số khách">
                {[1, 2, 3, 4, 5, 6, 8].map((k) => <option key={k} value={k}>{k} người lớn</option>)}
              </Select>
            </label>
            <span className="text-xs text-ink/60">Đổi ngày để xem giá và phòng trống khác</span>
          </div>

          {combo && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-coral/40 bg-orange-50 p-4 text-sm">
              <Gift size={20} className="text-coral" />
              <div className="flex-1">
                <div className="font-bold">Đang đặt combo: {combo.name}</div>
                <div className="text-ink/70">{combo.nights} đêm phòng {roomTypes.find((r) => r.id === combo.roomTypeId)?.name} + {combo.services.map((s) => s.name).join(', ')}. Giá combo <span className="font-bold text-coral">{vnd(combo.comboPrice)}</span> (dịch vụ trị giá {vnd(comboExtra)}).</div>
              </div>
              <Link to="/khach-san/thanh-long" className="font-semibold text-sea hover:underline">Bỏ combo</Link>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {quotes.map((x) => {
              const soldOut = x.available <= 0
              const sel = qty[x.rt.id] ?? 0
              return (
                <article key={x.rt.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
                  <h3 className="border-b border-stone-100 px-4 py-3 text-lg font-bold">Phòng {x.rt.name}</h3>
                  <div className="grid md:grid-cols-[280px_1fr]">
                    <div className="p-4">
                      <Img src={ROOM_IMG[x.rt.id] ?? x.rt.image} alt={`Phòng ${x.rt.name}`} ratio="aspect-[4/3]" className="rounded-lg" />
                      <ul className="mt-3 space-y-1.5 text-sm text-ink/80">
                        <li className="flex items-center gap-2"><Maximize2 size={14} className="text-ink/50" />{x.rt.sizeM2} m²</li>
                        <li className="flex items-center gap-2"><Users size={14} className="text-ink/50" />Tối đa {x.rt.capacity} khách</li>
                        <li className="flex items-center gap-2"><BedDouble size={14} className="text-ink/50" />{x.rt.capacity > 2 ? '1 giường đôi + 2 giường đơn' : '1 giường đôi hoặc 2 giường đơn'}</li>
                      </ul>
                      <div className="mt-3 flex flex-wrap gap-1.5">{x.rt.amenities.map((a) => <span key={a} className="rounded bg-ground px-2 py-0.5 text-xs">{a}</span>)}</div>
                    </div>
                    <div className="border-t border-stone-100 md:border-l md:border-t-0">
                      <div className="hidden grid-cols-[1fr_160px_120px] gap-3 bg-ground px-4 py-2 text-xs font-semibold text-ink/60 md:grid">
                        <span>Lựa chọn</span><span className="text-right">Giá / đêm</span><span className="text-right">Số phòng</span>
                      </div>
                      <div className="grid gap-3 p-4 md:grid-cols-[1fr_160px_120px] md:items-center">
                        <div className="text-sm">
                          <div className="font-semibold">Chỉ phòng · {x.plan?.name ?? 'Giá web'}</div>
                          <ul className="mt-1 space-y-1 text-ink/70">
                            <li className="flex items-center gap-1.5 text-emerald-700"><ShieldCheck size={14} />{x.plan?.cancelPolicy ?? 'Huỷ miễn phí trước 48h'}</li>
                            <li className="flex items-center gap-1.5"><BadgeCheck size={14} className="text-sea" />Xác nhận ngay sau khi thanh toán</li>
                          </ul>
                          {!soldOut && x.available <= 3 && <div className="mt-2 text-xs font-semibold text-red-600">Chỉ còn {x.available} phòng</div>}
                        </div>
                        <div className="text-left md:text-right">
                          {soldOut ? <span className="text-sm font-semibold text-red-600">Hết phòng</span> : (
                            <>
                              <div className="tnum text-xs text-ink/50 line-through">{vnd(refPrice(x.avg, 15))}</div>
                              <div className="tnum text-xl font-extrabold text-coral">{vnd(x.avg)}</div>
                              <div className="tnum text-xs text-ink/60">Tổng {n} đêm: {vnd(x.total)}</div>
                            </>
                          )}
                        </div>
                        <div className="md:text-right">
                          {soldOut ? (
                            <button onClick={() => { setCalType(x.rt.id); setDateOpen(true) }} className="text-sm font-semibold text-sea hover:underline">Xem ngày khác</button>
                          ) : (
                            <Select className={cx('w-full md:w-24 md:ml-auto', sel > 0 && 'border-sea ring-2 ring-sea/30')} value={sel} onChange={(e) => setQty({ ...qty, [x.rt.id]: Number(e.target.value) })} aria-label={`Số phòng ${x.rt.name}`}>
                              {Array.from({ length: Math.min(x.available, 5) + 1 }).map((_, k) => <option key={k} value={k}>{k} phòng</option>)}
                            </Select>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Tiện nghi */}
        <section id="tien-nghi" className="scroll-mt-40 pt-8">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
            <h2 className="text-xl font-bold">Tiện nghi khách sạn</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {FACILITIES.map((f) => <div key={f.label} className="flex items-center gap-2 text-sm"><f.icon size={18} className="text-sea" />{f.label}</div>)}
            </div>
          </div>
        </section>

        {/* Chính sách */}
        <section id="chinh-sach" className="scroll-mt-40 pt-8">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
            <h2 className="text-xl font-bold">Chính sách</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div className="flex gap-3"><Clock size={18} className="shrink-0 text-sea" /><div><dt className="font-semibold">Nhận / trả phòng</dt><dd className="text-ink/70">Nhận từ {settings.checkInTime}, trả trước {settings.checkOutTime}</dd></div></div>
              <div className="flex gap-3"><ShieldCheck size={18} className="shrink-0 text-sea" /><div><dt className="font-semibold">Huỷ phòng</dt><dd className="text-ink/70">Miễn phí trước 48 giờ, sau đó tính 1 đêm</dd></div></div>
              <div className="flex gap-3"><Baby size={18} className="shrink-0 text-sea" /><div><dt className="font-semibold">Trẻ em</dt><dd className="text-ink/70">Dưới 6 tuổi miễn phí khi ngủ chung giường</dd></div></div>
              <div className="flex gap-3"><Users size={18} className="shrink-0 text-sea" /><div><dt className="font-semibold">Giấy tờ</dt><dd className="text-ink/70">CCCD hoặc hộ chiếu của mỗi khách khi nhận phòng (khai báo lưu trú)</dd></div></div>
              <div className="flex gap-3"><Cigarette size={18} className="shrink-0 text-sea" /><div><dt className="font-semibold">Hút thuốc</dt><dd className="text-ink/70">Không hút thuốc trong phòng</dd></div></div>
              <div className="flex gap-3"><PawPrint size={18} className="shrink-0 text-sea" /><div><dt className="font-semibold">Thú cưng</dt><dd className="text-ink/70">Không nhận thú cưng</dd></div></div>
            </dl>
          </div>
        </section>

        {/* Vị trí */}
        <section id="vi-tri" className="scroll-mt-40 pt-8">
          <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 lg:grid-cols-[1.4fr_1fr]">
            <iframe title="Bản đồ Khách sạn Thanh Long" className="h-64 w-full rounded-lg border-0 md:h-80" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=109.28%2C13.07%2C109.33%2C13.11&layer=mapnik&marker=13.0955%2C109.3005" />
            <div>
              <h2 className="text-xl font-bold">Vị trí</h2>
              <p className="mt-1 text-sm text-ink/70">{settings.address}</p>
              <ul className="mt-4 divide-y divide-stone-100 text-sm">
                {NEARBY.map(([k, v]) => <li key={k} className="flex justify-between py-2"><span>{k}</span><span className="tnum text-ink/60">{v}</span></li>)}
              </ul>
            </div>
          </div>
        </section>
      </Container>

      {/* Thanh đặt phòng dính dưới */}
      {roomsPicked > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white shadow-[0_-4px_16px_rgba(3,18,26,0.08)]">
          <Container className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="text-sm">
              <div className="font-semibold">{picked.map((x) => `${qty[x.rt.id]} × ${x.rt.name}`).join(', ')} · {n} đêm</div>
              {capacityShort ? <div className="text-xs font-semibold text-red-600">Số phòng đã chọn chỉ đủ {capacity} khách — chọn thêm phòng cho {q.adults} khách</div>
                : <div className="text-xs text-ink/60">Giữ chỗ {settings.holdMinutes} phút khi bấm Đặt ngay</div>}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right"><div className="text-xs text-ink/60">Tổng cộng</div><div className="tnum text-xl font-extrabold text-coral">{vnd(total)}</div></div>
              <Button tone="accent" size="lg" onClick={book} disabled={busy || capacityShort}>Đặt ngay</Button>
            </div>
          </Container>
        </div>
      )}

      <Modal open={dateOpen} onClose={() => setDateOpen(false)} title="Chọn ngày lưu trú" wide>
        <div className="mb-3 flex flex-wrap gap-2">
          {roomTypes.map((rt) => <button key={rt.id} onClick={() => setCalType(rt.id)} className={cx('rounded-full px-3 py-1.5 text-sm font-semibold', calType === rt.id ? 'bg-sea text-white' : 'bg-sand text-sea')}>Giá phòng {rt.name}</button>)}
        </div>
        <PriceCalendar roomTypeId={calType} from={q.from < today() ? today() : q.from} to={q.to} onChange={setDates} />
      </Modal>
    </div>
  )
}

function PartnerDetail({ id }: { id: string }) {
  const [sp] = useSearchParams()
  const q = parseQuery(sp)
  const partnerHotels = useStore((s) => s.partnerHotels)
  const h = partnerHotels.find((x) => x.id === id)
  if (!h) {
    return (
      <Container className="py-16 text-center">
        <h1 className="text-2xl font-bold">Không tìm thấy khách sạn</h1>
        <Link to="/khach-san" className="mt-4 inline-block font-semibold text-sea hover:underline">Quay lại danh sách khách sạn</Link>
      </Container>
    )
  }
  const images = [partnerImg(h), ...TL_GALLERY.slice(3, 7)]
  const n = nights(q.from, q.to)
  return (
    <div className="bg-ground pb-10">
      <Container className="pt-4">
        <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Khách sạn', to: `/khach-san${toSearch({ ...q, city: h.city })}` }, { label: h.name }]} />
        <div className="mt-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <StarRow n={h.stars} />
              <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">{h.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3"><Area text={`${h.area}, ${h.city}`} /><RatingBadge rating={h.rating} reviews={h.reviews} /></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink/60">Giá tham khảo mỗi đêm từ</div>
              <div className="tnum text-xs text-ink/50 line-through">{vnd(refPrice(h.priceFrom))}</div>
              <div className="tnum text-2xl font-extrabold text-coral">{vnd(h.priceFrom)}</div>
              <div className="tnum text-xs text-ink/60">≈ {vnd(h.priceFrom * n)} cho {n} đêm</div>
            </div>
          </div>
          <div className="mt-4"><Gallery images={images} name={h.name} /></div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
              <h2 className="text-lg font-bold">Giới thiệu</h2>
              <p className="mt-2 text-ink/80">{h.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">{h.amenities.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded bg-ground px-2 py-1 text-sm"><Check size={14} className="text-emerald-600" />{a}</span>)}</div>
              {h.freeCancel && <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><ShieldCheck size={16} /> Có lựa chọn huỷ miễn phí</p>}
            </div>
            <div className="rounded-xl border border-sea/30 bg-sand p-5 text-sm">
              <div className="font-bold text-sea">Đặt khách sạn đối tác qua TAVINA</div>
              <p className="mt-1 text-ink/80">Giá phòng của khách sạn này được lấy từ nhà cung cấp đối tác. Gửi yêu cầu, tư vấn viên kiểm tra phòng trống theo ngày của bạn và gửi xác nhận trong 30 phút. Đặt trực tuyến tức thì sẽ có ở giai đoạn sau.</p>
            </div>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70 lg:sticky lg:top-32 lg:self-start">
            <LeadForm service="hotel" subcategories={[h.name]} defaultSubcategory={h.name} title="Yêu cầu đặt phòng" compact
              needPlaceholder={`VD: ${n} đêm từ ${fmtDate(q.from)}, ${q.adults} người lớn, 1 phòng đôi`} />
          </div>
        </div>
      </Container>
    </div>
  )
}
