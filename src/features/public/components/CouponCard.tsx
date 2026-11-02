// Thẻ mã giảm giá kiểu vé: biểu tượng màu theo dịch vụ, đường cắt nét đứt, nút SAO CHÉP.
import { Copy, Info } from 'lucide-react'
import { useStore } from '@/store'
import { vnd, fmtDate } from '@/lib/format'
import { SERVICE_LABEL } from '@/lib/labels'
import { SERVICE_ICON } from '@/layouts/PublicLayout'
import type { Coupon, ServiceKey } from '@/types'

/** Màu biểu tượng theo dịch vụ */
export const SERVICE_TINT: Record<ServiceKey, string> = {
  flight: 'bg-sky-500', hotel: 'bg-indigo-700', activity: 'bg-rose-500', bus: 'bg-emerald-600', tour: 'bg-orange-500', sim: 'bg-violet-600', visa: 'bg-teal-600',
}

export const couponTitle = (c: Coupon) => c.title ?? (c.type === 'percent' ? `Giảm ${c.value}% tiền phòng` : `Giảm ${vnd(c.value)} khi đặt phòng`)

export function CouponCard({ coupon: c, className = '' }: { coupon: Coupon; className?: string }) {
  const toast = useStore((s) => s.toast)
  const service = c.service ?? 'hotel'
  const Icon = SERVICE_ICON[service]
  const copy = () => { navigator.clipboard?.writeText(c.code).catch(() => undefined); toast(`Đã sao chép mã ${c.code}`) }
  const howTo = service === 'hotel' ? 'Nhập ở bước thanh toán khi đặt phòng' : 'Nhập khi gửi yêu cầu — tư vấn viên áp vào báo giá'
  return (
    <div className={`relative flex flex-col rounded-xl bg-white shadow-[0_2px_10px_rgba(3,18,26,0.12)] ${className}`}>
      <div className="flex flex-1 items-start gap-3 p-4">
        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${SERVICE_TINT[service]}`}><Icon size={13} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-ink">{couponTitle(c)}</div>
          <div className="mt-0.5 truncate text-xs text-ink/60">{c.note ?? `${SERVICE_LABEL[service]} · đặt trên web`}</div>
        </div>
        <span className="group relative mt-0.5 shrink-0">
          <Info size={16} className="text-ink/40" aria-label="Điều kiện" />
          <span className="pointer-events-none absolute right-0 top-6 z-20 hidden w-60 rounded-lg bg-ink p-3 text-xs text-white shadow-lg group-hover:block">
            {SERVICE_LABEL[service]} · HSD {fmtDate(c.to)} · còn {c.maxUses - c.used} lượt. {howTo}.
          </span>
        </span>
      </div>
      {/* đường cắt vé */}
      <div className="relative mx-4 border-t-2 border-dashed border-stone-200">
        <span className="absolute -left-6 -top-2.5 h-5 w-5 rounded-full bg-white shadow-[inset_-3px_0_4px_rgba(3,18,26,0.08)]" />
        <span className="absolute -right-6 -top-2.5 h-5 w-5 rounded-full bg-white shadow-[inset_3px_0_4px_rgba(3,18,26,0.08)]" />
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-bold tracking-wide text-ink/80"><Copy size={14} className="text-ink/50" />{c.code}</span>
        <button onClick={copy} className="rounded-full bg-sand px-4 py-1.5 text-sm font-bold text-sea hover:bg-sea hover:text-white">SAO CHÉP</button>
      </div>
    </div>
  )
}
