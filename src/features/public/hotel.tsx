// Phần dùng chung cho các trang khách sạn (kết quả, chi tiết, checkout, xác nhận)
import { Star, MapPin } from 'lucide-react'
import { cx } from '@/components/ui'
import type { PartnerHotel } from '@/types'

const U = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`

/** Ảnh Khách sạn Thanh Long (ảnh minh hoạ cho demo) */
export const TL_GALLERY = [
  U('1566073771259-6a8506099945', 1600), // hồ bơi
  U('1551882547-ff40c63fe5fa'), // mặt tiền
  U('1582719478250-c89cae4dc85b'), // phòng
  U('1590490360182-c33d57733427'), // phòng
  U('1520250497591-112f2f40a3f4'), // khu nghỉ
  U('1611892440504-42a792e24d32'),
  U('1596394516093-501ba68a0ba6'),
  U('1542314831-068cd1dbfeeb'),
]

/** Ảnh theo hạng phòng — ghi đè ảnh picsum trong dữ liệu mẫu */
export const ROOM_IMG: Record<string, string> = {
  rt_std: U('1611892440504-42a792e24d32', 900),
  rt_dlx: U('1590490360182-c33d57733427', 900),
  rt_fam: U('1631049307264-da0ec9d70304', 900),
}

const PARTNER_IMG: Record<string, string> = {
  ph_1: U('1542314831-068cd1dbfeeb', 900),
  ph_2: U('1520250497591-112f2f40a3f4', 900),
  ph_3: U('1596394516093-501ba68a0ba6', 900),
  ph_4: U('1551882547-ff40c63fe5fa', 900),
  ph_5: U('1566073771259-6a8506099945', 900),
  ph_6: U('1582719478250-c89cae4dc85b', 900),
}
export const partnerImg = (h: PartnerHotel) => PARTNER_IMG[h.id] ?? h.image

/** Giá gốc tham khảo để hiển thị gạch ngang (demo) */
export const refPrice = (price: number, pct = 23) => Math.round(price / (1 - pct / 100) / 1000) * 1000

export const ratingWord = (r: number) => (r >= 9 ? 'Xuất sắc' : r >= 8.5 ? 'Tuyệt vời' : r >= 8 ? 'Rất tốt' : r >= 7 ? 'Tốt' : 'Hài lòng')

export function RatingBadge({ rating, reviews, className }: { rating: number; reviews?: number; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2 text-sm', className)}>
      <span className="rounded bg-sea px-1.5 py-0.5 text-xs font-bold text-white tnum">{rating.toFixed(1)}</span>
      <span className="font-semibold text-sea">{ratingWord(rating)}</span>
      {reviews !== undefined && <span className="text-ink/60">({reviews.toLocaleString('vi-VN')} đánh giá)</span>}
    </span>
  )
}

export function StarRow({ n }: { n: number }) {
  return <span className="inline-flex text-amber-400" aria-label={`${n} sao`}>{Array.from({ length: n }).map((_, i) => <Star key={i} size={14} fill="currentColor" strokeWidth={0} />)}</span>
}

export function Area({ text }: { text: string }) {
  return <span className="inline-flex items-center gap-1 text-sm text-ink/70"><MapPin size={14} className="text-sea" />{text}</span>
}

/** Thanh bước kiểu OTA: Đặt → Thanh toán → Hoàn tất */
export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Chọn phòng', 'Điền thông tin & thanh toán', 'Hoàn tất']
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Các bước đặt phòng">
      {steps.map((s, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const done = n < current, active = n === current
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className={cx('h-px w-6 sm:w-10', done || active ? 'bg-sea' : 'bg-stone-300')} />}
            <span className={cx('grid h-6 w-6 place-items-center rounded-full text-xs font-bold', done ? 'bg-sea text-white' : active ? 'bg-sea text-white ring-4 ring-sea/20' : 'bg-stone-200 text-ink/60')}>{n}</span>
            <span className={cx('hidden sm:inline', active ? 'font-semibold text-ink' : 'text-ink/60')}>{s}</span>
          </li>
        )
      })}
    </ol>
  )
}
