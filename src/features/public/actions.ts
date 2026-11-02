// Hành động phụ cho web public — chỉ dùng useStore.setState / getState, không sửa store lõi.
import { useStore, type StoreState } from '@/store'
import type { Lead, Guest, ISODate, RoomType, RatePlan } from '@/types'
import { uid, nowISO } from '@/lib/ids'
import { eachNight } from '@/lib/format'
import { minAvailability, availabilityByNight } from '@/lib/availability'
import { pickRatePlan, nightlyPrice } from '@/lib/pricing'

export const THANH_LONG_ID = 'thanh-long'
export const THANH_LONG_META = {
  area: 'Tuy Hoà',
  city: 'Phú Yên',
  stars: 3,
  rating: 8.9,
  reviews: 356,
  highlights: ['Cách biển Tuy Hoà 300 m', 'Giá và phòng trống đồng bộ trực tiếp từ hệ thống khách sạn', 'Huỷ miễn phí trước 48 giờ'],
  images: ['tl-hero', 'tl-lobby', 'tl-pool', 'tl-room', 'tl-view'].map((s, i) => `https://picsum.photos/seed/${s}/${i === 0 ? 1600 : 800}/${i === 0 ? 1000 : 600}`),
  gallery: ['tl-hero', 'tl-lobby', 'tl-pool', 'tl-room', 'tl-view', 'tl-bf', 'tl-bar', 'tl-gym'],
}

/** Chuẩn hoá SĐT về chuỗi số */
export const normPhone = (p: string) => p.replace(/[^\d+]/g, '')
export const validPhone = (p: string) => /^0\d{9}$/.test(normPhone(p))
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

/** Thêm yêu cầu tư vấn (Lead) từ web */
export function addLead(input: Omit<Lead, 'id' | 'status' | 'createdAt'>): Lead {
  const lead: Lead = { ...input, id: uid('ld'), status: 'new', createdAt: nowISO() }
  useStore.setState((s) => ({ leads: [lead, ...s.leads] }))
  return lead
}

/** Gán khách thật vào các booking (sau checkout), kèm ghi chú và mã giảm giá */
export function attachGuestToBookings(bookingIds: string[], guest: Guest, opts: { occupantIds?: string[]; note?: string; couponCode?: string; discountPct?: number }) {
  useStore.setState((s) => ({
    bookings: s.bookings.map((b) => {
      if (!bookingIds.includes(b.id)) return b
      return {
        ...b,
        guestId: guest.id,
        occupantIds: opts.occupantIds && opts.occupantIds.length ? opts.occupantIds : [guest.id],
        note: opts.note ?? b.note,
        couponCode: b.id === bookingIds[0] ? opts.couponCode ?? b.couponCode : b.couponCode,
        discountPct: opts.discountPct !== undefined && b.id === bookingIds[0] ? opts.discountPct : b.discountPct,
        discountStatus: opts.discountPct ? 'approved' : b.discountStatus,
      }
    }),
  }))
}

/** Tăng lượt dùng mã giảm giá */
export function consumeCoupon(code: string) {
  useStore.setState((s) => ({ coupons: s.coupons.map((c) => (c.code === code ? { ...c, used: c.used + 1 } : c)) }))
}

/** Xoá khách tạm (tạo khi giữ chỗ) nếu không còn booking nào tham chiếu */
export function removeTempGuest(guestId: string) {
  const s = useStore.getState()
  const g = s.guests.find((x) => x.id === guestId)
  if (!g || !g.phone.startsWith('tmp-')) return
  if (s.bookings.some((b) => b.guestId === guestId || b.occupantIds.includes(guestId))) return
  useStore.setState({ guests: s.guests.filter((x) => x.id !== guestId) })
}

/** Báo giá một hạng phòng của Thanh Long cho khoảng ngày (gói giá kênh web) */
export interface RoomQuote {
  rt: RoomType
  plan?: RatePlan
  available: number
  perNight: { date: ISODate; price: number }[]
  total: number
  avg: number
  nightsCount: number
}

export function quoteRoomType(s: Pick<StoreState, 'rooms' | 'bookings' | 'ratePlans'>, rt: RoomType, checkIn: ISODate, checkOut: ISODate, adults = 2): RoomQuote {
  const plan = pickRatePlan(s.ratePlans, 'web', 'retail')
  const extra = Math.max(0, adults - rt.capacity)
  const nightsList = eachNight(checkIn, checkOut)
  const perNight = nightsList.map((d) => ({ date: d, price: plan ? nightlyPrice(plan, rt.id, d, extra) : rt.basePrice }))
  const total = perNight.reduce((x, n) => x + n.price, 0)
  const available = checkOut > checkIn ? minAvailability(s.rooms, s.bookings, rt.id, checkIn, checkOut) : 0
  return { rt, plan, available: Number.isFinite(available) ? available : 0, perNight, total, avg: Math.round(total / Math.max(1, perNight.length)), nightsCount: perNight.length }
}

export function quoteAll(s: Pick<StoreState, 'rooms' | 'bookings' | 'ratePlans' | 'roomTypes'>, checkIn: ISODate, checkOut: ISODate, adults = 2) {
  return s.roomTypes.map((rt) => quoteRoomType(s, rt, checkIn, checkOut, adults))
}

/** Bản đồ ngày → { giá thấp nhất, tồn } cho lịch 2 tháng */
export function calendarMap(s: Pick<StoreState, 'rooms' | 'bookings' | 'ratePlans'>, roomTypeId: string, from: ISODate, to: ISODate) {
  const plan = pickRatePlan(s.ratePlans, 'web', 'retail')
  const out = new Map<ISODate, { price: number; available: number }>()
  if (to <= from) return out
  for (const n of availabilityByNight(s.rooms, s.bookings, roomTypeId, from, to)) {
    out.set(n.night, { price: plan ? nightlyPrice(plan, roomTypeId, n.night) : 0, available: n.available })
  }
  return out
}

export const STATUS_TONE: Record<string, 'neutral' | 'ok' | 'warn' | 'err' | 'info'> = {
  hold: 'warn', confirmed: 'ok', 'checked-in': 'info', 'checked-out': 'neutral', cancelled: 'err', 'no-show': 'err', expired: 'neutral',
}
