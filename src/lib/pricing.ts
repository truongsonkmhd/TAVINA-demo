import type { Channel, ISODate, RatePlan, Coupon, Promotion } from '@/types'
import { eachNight, isWeekend } from './format'

/** Chọn gói giá áp dụng: active, đúng kênh, đúng loại khách, ưu tiên cao nhất (RULE FR-04 AC2) */
export function pickRatePlan(
  plans: RatePlan[],
  channel: Channel,
  guestType: RatePlan['guestType'] = 'retail',
): RatePlan | undefined {
  return plans
    .filter((p) => p.active && p.channels.includes(channel) && p.guestType === guestType)
    .sort((a, b) => b.priority - a.priority)[0]
}

/** Giá một đêm cho hạng phòng theo gói giá, mùa và cuối tuần */
export function nightlyPrice(plan: RatePlan, roomTypeId: string, date: ISODate, extraAdults = 0): number {
  const base = plan.prices[roomTypeId] ?? 0
  const season = plan.seasons.find((s) => date >= s.from && date <= s.to)
  let price = base * (season?.multiplier ?? 1)
  if (isWeekend(date)) price *= plan.weekendMultiplier
  price += extraAdults * plan.extraAdultFee
  return Math.round(price / 1000) * 1000
}

export function stayTotal(plan: RatePlan, roomTypeId: string, checkIn: ISODate, checkOut: ISODate, extraAdults = 0) {
  const perNight = eachNight(checkIn, checkOut).map((d) => ({ date: d, price: nightlyPrice(plan, roomTypeId, d, extraAdults) }))
  return { perNight, total: perNight.reduce((s, n) => s + n.price, 0) }
}

export function couponDiscount(coupon: Coupon | undefined, subtotal: number, channel: Channel, date: ISODate) {
  if (!coupon || !coupon.active) return { amount: 0, error: 'Mã không tồn tại hoặc đã tắt' }
  if (coupon.service && coupon.service !== 'hotel') return { amount: 0, error: 'Mã này dành cho dịch vụ khác, không áp dụng cho đặt phòng' }
  if (!coupon.channels.includes(channel)) return { amount: 0, error: 'Mã không áp dụng cho kênh này' }
  if (date < coupon.from || date > coupon.to) return { amount: 0, error: 'Mã đã hết hạn' }
  if (coupon.used >= coupon.maxUses) return { amount: 0, error: 'Mã đã hết lượt sử dụng' }
  const amount = coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal)
  return { amount, error: undefined }
}

export function applicablePromotions(promos: Promotion[], channel: Channel, checkIn: ISODate, nightsCount: number) {
  return promos.filter(
    (p) => p.active && p.channels.includes(channel) && checkIn >= p.from && checkIn <= p.to && nightsCount >= p.minStay && p.used < p.maxUses,
  )
}
