import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Ticket, Gift, Percent, CalendarDays, ArrowRight } from 'lucide-react'
import { useStore } from '@/store'
import { Empty, cx } from '@/components/ui'
import { vnd, fmtDate, today } from '@/lib/format'
import { CHANNEL_LABEL } from '@/lib/labels'
import type { Promotion } from '@/types'
import { Container, Img, Breadcrumb } from '@/features/public/components/Shared'
import { PillTabs } from '@/features/public/components/Carousel'
import { CouponCard } from '@/features/public/components/CouponCard'
import { ROOM_IMG } from '@/features/public/hotel'

type Tab = 'all' | 'combo' | 'promo' | 'coupon'
const promoValue = (p: Promotion) => (p.type === 'percent' ? `-${p.value}%` : p.type === 'amount' ? `-${vnd(p.value)}` : p.type === 'free-night' ? 'Tặng đêm' : 'Quà tặng')

export default function Promotions() {
  const toast = useStore((s) => s.toast)
  const allPromos = useStore((s) => s.promotions)
  const allCombos = useStore((s) => s.combos)
  const allCoupons = useStore((s) => s.coupons)
  const roomTypes = useStore((s) => s.roomTypes)
  const [tab, setTab] = useState<Tab>('all')
  const T = today()

  const promos = allPromos.filter((p) => p.active && p.to >= T && p.used < p.maxUses)
  const combos = allCombos.filter((c) => c.active)
  const coupons = allCoupons.filter((c) => c.active && c.to >= T && c.used < c.maxUses)
  const show = (t: Tab) => tab === 'all' || tab === t
  const copy = (code: string) => { navigator.clipboard?.writeText(code).catch(() => undefined); toast(`Đã sao chép mã ${code}`) }

  return (
    <div className="bg-ground pb-6">
      <section className="bg-sea text-white">
        <Container className="py-8 md:py-10">
          <div className="[&_a]:text-white/80 [&_span]:text-white/80"><Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Khuyến mãi' }]} /></div>
          <h1 className="mt-4 text-3xl font-extrabold md:text-4xl">Khuyến mãi & combo</h1>
          <p className="mt-2 max-w-2xl text-white/90">Ưu đãi khi đặt Khách sạn Thanh Long qua TAVINA và combo phòng kèm tour, vé, xe. Cập nhật theo thời gian thực.</p>
        </Container>
      </section>

      <Container className="pt-6">
        <PillTabs value={tab} onChange={setTab} tabs={[
          { id: 'all', label: 'Tất cả' }, { id: 'combo', label: `Combo (${combos.length})` },
          { id: 'promo', label: `Ưu đãi khách sạn (${promos.length})` }, { id: 'coupon', label: `Mã giảm giá (${coupons.length})` },
        ]} />

        {show('coupon') && (
          <section className="pt-4">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Ticket size={20} className="text-coral" /> Mã giảm giá</h2>
            {coupons.length === 0 ? <div className="mt-3"><Empty title="Hiện chưa có mã giảm giá" /></div> : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {coupons.map((c) => <CouponCard key={c.id} coupon={c} />)}
              </div>
            )}
          </section>
        )}

        {show('combo') && (
          <section className="pt-8">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Gift size={20} className="text-coral" /> Combo phòng + dịch vụ</h2>
            {combos.length === 0 ? <div className="mt-3"><Empty title="Chưa có combo nào đang mở bán" /></div> : (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {combos.map((c) => {
                  const rt = roomTypes.find((r) => r.id === c.roomTypeId)
                  const retail = (rt?.basePrice ?? 0) * c.nights + c.services.reduce((s, x) => s + x.price, 0)
                  const save = retail - c.comboPrice
                  return (
                    <article key={c.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
                      <div className="relative">
                        <Img src={ROOM_IMG[c.roomTypeId] ?? c.image} alt={c.name} ratio="aspect-[2/1]" />
                        {save > 0 && <span className="absolute left-3 top-3 rounded bg-coral px-2 py-1 text-xs font-bold text-white">Tiết kiệm {vnd(save)}</span>}
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold leading-snug">{c.name}</h3>
                        <p className="mt-1 text-sm text-ink/70">{c.description}</p>
                        <ul className="mt-3 space-y-1 text-sm">
                          <li className="flex justify-between"><span>Phòng {rt?.name} × {c.nights} đêm</span><span className="tnum text-ink/60">{vnd((rt?.basePrice ?? 0) * c.nights)}</span></li>
                          {c.services.map((s) => <li key={s.name} className="flex justify-between gap-3"><span>{s.name}</span><span className="tnum shrink-0 text-ink/60">{vnd(s.price)}</span></li>)}
                        </ul>
                        <div className="mt-4 flex items-end justify-between gap-3 border-t border-stone-100 pt-3">
                          <div>
                            {save > 0 && <div className="tnum text-xs text-ink/50 line-through">{vnd(retail)}</div>}
                            <div className="tnum text-2xl font-extrabold text-coral">{vnd(c.comboPrice)}</div>
                          </div>
                          <Link to={`/khach-san/thanh-long?combo=${c.id}`} className="inline-flex h-10 items-center gap-1 rounded-md bg-coral px-4 text-sm font-semibold text-white hover:bg-coral-dark">Đặt combo <ArrowRight size={16} /></Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {show('promo') && (
          <section className="pt-8">
            <h2 className="flex items-center gap-2 text-xl font-bold"><Percent size={20} className="text-coral" /> Ưu đãi Khách sạn Thanh Long</h2>
            {promos.length === 0 ? <div className="mt-3"><Empty title="Hiện chưa có ưu đãi nào đang chạy" /></div> : (
              <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {promos.map((p, i) => (
                  <Link key={p.id} to="/khach-san/thanh-long" className={cx('flex flex-col justify-between rounded-xl p-5 shadow-sm', i % 2 ? 'bg-white ring-1 ring-stone-200/70' : 'bg-sea text-white')}>
                    <div>
                      <span className={cx('inline-block rounded px-2 py-0.5 text-sm font-extrabold', i % 2 ? 'bg-sand text-sea' : 'bg-white text-sea')}>{promoValue(p)}</span>
                      <h3 className="mt-3 text-xl font-extrabold leading-snug">{p.name}</h3>
                      <p className={cx('mt-1 text-sm', i % 2 ? 'text-ink/70' : 'text-white/90')}>{p.description}</p>
                    </div>
                    <div className={cx('mt-5 space-y-1 text-xs', i % 2 ? 'text-ink/60' : 'text-white/80')}>
                      <div className="flex items-center gap-1"><CalendarDays size={12} /> {fmtDate(p.from)} – {fmtDate(p.to)}{p.minStay > 1 ? ` · từ ${p.minStay} đêm` : ''}</div>
                      <div>Kênh: {p.channels.map((ch) => CHANNEL_LABEL[ch]).join(', ')} · còn {p.maxUses - p.used} lượt{p.stackable ? ' · cộng dồn được' : ''}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </Container>
    </div>
  )
}
