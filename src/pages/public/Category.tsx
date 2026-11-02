import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useStore } from '@/store'
import { Empty, Modal, cx } from '@/components/ui'
import { SLUG_SERVICE, SERVICE_ICON } from '@/layouts/PublicLayout'
import { SERVICE_LABEL } from '@/lib/labels'
import { vnd } from '@/lib/format'
import { SERVICES } from '@/features/public/services'
import { LeadForm } from '@/features/public/components/LeadForm'
import { type ServiceSearchResult } from '@/features/public/components/ServiceSearch'
import { ServicePanel } from '@/features/public/components/ServicePanel'
import type { ServiceKey } from '@/types'
import { Breadcrumb, Container, Img } from '@/features/public/components/Shared'
import { ROOM_IMG } from '@/features/public/hotel'

const HERO_IMG: Record<string, string> = {
  flight: '1436491865332-7a61a109cc05', bus: '1544620347-c4fd4a3d5957', activity: '1530789253388-582c481c54b0',
  sim: '1512941937669-90a1b58e7e9c', visa: '1488646953014-85cb44e25828', tour: '1469854523086-cc02fe5d8800',
}
const heroSrc = (k: string) => `https://images.unsplash.com/photo-${HERO_IMG[k]}?auto=format&fit=crop&w=1920&q=70`

export default function Category() {
  const { slug = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const key = SLUG_SERVICE[slug]
  const [sub, setSub] = useState<string | undefined>(sp.get('muc') ?? undefined)
  // Kết quả ô tìm kiếm → mở hộp thoại gửi yêu cầu. Đến từ trang chủ (?need=) thì mở ngay.
  const [request, setRequest] = useState<ServiceSearchResult | undefined>(() => (sp.get('need') ? { need: sp.get('need')!, date: sp.get('date') ?? undefined, pax: Number(sp.get('pax')) || 2, sub: sp.get('muc') ?? undefined } : undefined))
  const allCombos = useStore((s) => s.combos)
  const roomTypes = useStore((s) => s.roomTypes)
  const combos = allCombos.filter((c) => c.active)

  if (key === 'hotel') return <Navigate to="/khach-san" replace />
  if (!key) {
    return (
      <Container className="py-16">
        <Empty title="Không tìm thấy danh mục" hint={`Đường dẫn /dich-vu/${slug} không tồn tại.`} action={<Link to="/" className="font-medium text-sea hover:underline">Về trang chủ</Link>} />
      </Container>
    )
  }
  const info = SERVICES.find((s) => s.key === key)!
  const label = SERVICE_LABEL[key]
  const Icon = SERVICE_ICON[key]
  const from = sp.get('tu'), to = sp.get('den') // từ khối "Vé máy bay giá tốt" trên trang chủ
  const close = () => { setRequest(undefined); if (sp.get('need')) setSp({}, { replace: true }) }

  return (
    <div className="bg-ground pb-6">
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <img src={heroSrc(key)} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/50 to-ink/30" />
        </div>
        <Container className="pb-12 pt-6 md:pb-16">
          <div className="[&_a]:text-white/80 [&_span]:text-white/90"><Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label }]} /></div>
          <h1 className="mt-5 flex items-center gap-3 text-3xl font-extrabold text-white drop-shadow md:text-4xl">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-sea"><Icon size={22} /></span>{label}
          </h1>
          <p className="mt-2 max-w-2xl text-white/90 drop-shadow md:text-lg">{info.tagline}</p>

          <div className="mt-6 rounded-2xl bg-white p-4 shadow-2xl md:p-6">
            <ServicePanel service={key} sub={sub} onSub={setSub} onSubmit={setRequest} initial={key === 'flight' && from && to ? { from, to } : undefined} />
          </div>
        </Container>
      </section>

      {key === 'tour' && combos.length > 0 && (
        <Container className="pt-10">
          <h2 className="text-2xl font-bold">Combo phòng Thanh Long + tour</h2>
          <p className="mt-1 text-ink/60">Đặt online, có giá ngay.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {combos.map((c) => {
              const rt = roomTypes.find((r) => r.id === c.roomTypeId)
              const retail = (rt?.basePrice ?? 0) * c.nights + c.services.reduce((s, x) => s + x.price, 0)
              return (
                <Link key={c.id} to={`/khach-san/thanh-long?combo=${c.id}`} className="group grid overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70 hover:shadow-md sm:grid-cols-[200px_1fr]">
                  <Img src={ROOM_IMG[c.roomTypeId] ?? c.image} alt={c.name} ratio="aspect-[16/10] sm:aspect-auto sm:h-full" />
                  <div className="p-4">
                    <span className="rounded bg-sand px-2 py-0.5 text-xs font-semibold text-sea">{rt?.name} · {c.nights} đêm</span>
                    <h3 className="mt-2 font-bold leading-snug group-hover:text-sea">{c.name}</h3>
                    <ul className="mt-2 text-sm text-ink/70">{c.services.map((s) => <li key={s.name}>+ {s.name}</li>)}</ul>
                    {retail > c.comboPrice && <div className="tnum mt-3 text-xs text-ink/50 line-through">{vnd(retail)}</div>}
                    <div className="tnum text-xl font-extrabold text-coral">{vnd(c.comboPrice)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </Container>
      )}

      <Modal open={!!request} onClose={close} title={`Gửi yêu cầu ${label.toLowerCase()}`} wide>
        {request && (
          <div className="[&>form]:p-0 [&>form]:shadow-none [&>form]:ring-0 [&>div]:p-0 [&>div]:shadow-none [&>div]:ring-0">
            <LeadForm service={key} subcategories={info.subcategories.map((c) => c.name)} defaultSubcategory={request.sub ?? sub} title="Thông tin liên hệ"
              defaultNeed={request.need} defaultDate={request.date} defaultPax={request.pax} />
          </div>
        )}
      </Modal>
    </div>
  )
}
