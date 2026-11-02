// Mutation riêng của module PMS (Dashboard/Calendar/Rooms/Bookings/Rates/Channels).
// Dùng useStore.getState()/setState — không sửa store.ts.
import { useStore } from '@/store'
import type { Booking, BookingGroup, Channel, ChannelConfig, Guest, RatePlan, RoleId, Season, SyncLog } from '@/types'
import { uid, nowISO } from '@/lib/ids'
import { today, addDaysISO, overlaps } from '@/lib/format'
import { freeRooms } from '@/lib/availability'
import { CHANNEL_LABEL } from '@/lib/labels'

const S = () => useStore.getState()

// ---------- Chiết khấu (FR-04 US-07) ----------
export function approveDiscount(bookingId: string, approve: boolean) {
  const s = S()
  const b = s.bookings.find((x) => x.id === bookingId)
  if (!b || b.discountStatus !== 'pending') return { error: 'Booking không ở trạng thái chờ duyệt chiết khấu' }
  const status = approve ? 'approved' : 'rejected'
  useStore.setState({ bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, discountStatus: status, discountPct: approve ? x.discountPct : 0 } : x)) })
  s.audit(approve ? 'Duyệt chiết khấu' : 'Từ chối chiết khấu', 'booking', bookingId, { discountPct: b.discountPct, discountStatus: 'pending' }, { discountStatus: status, reason: b.discountReason })
  s.toast(approve ? `Đã duyệt chiết khấu ${b.discountPct}% cho ${b.code}` : `Đã từ chối chiết khấu cho ${b.code}`, approve ? 'ok' : 'warn')
  return {}
}

// ---------- Booking / khách ----------
export function updateBooking(id: string, patch: Partial<Booking>) {
  const s = S()
  const b = s.bookings.find((x) => x.id === id)
  if (!b) return
  useStore.setState({ bookings: s.bookings.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  s.audit('Cập nhật booking', 'booking', id, pickKeys(b, Object.keys(patch) as (keyof Booking)[]), patch)
}

export function updateGuest(id: string, patch: Partial<Guest>) {
  const s = S()
  const g = s.guests.find((x) => x.id === id)
  if (!g) return
  useStore.setState({ guests: s.guests.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  s.audit('Cập nhật khách', 'guest', id, pickKeys(g, Object.keys(patch) as (keyof Guest)[]), patch)
}

/** Thêm khách ở cùng (occupant) vào booking — cần giấy tờ để khai báo lưu trú */
export function addOccupant(bookingId: string, guest: Partial<Guest> & Pick<Guest, 'name' | 'phone'>) {
  const s = S()
  const g = s.upsertGuest(guest)
  const b = S().bookings.find((x) => x.id === bookingId)
  if (!b) return
  if (b.occupantIds.includes(g.id)) return g
  useStore.setState({ bookings: S().bookings.map((x) => (x.id === bookingId ? { ...x, occupantIds: [...x.occupantIds, g.id] } : x)) })
  s.audit('Thêm khách ở cùng', 'booking', bookingId, undefined, { guestId: g.id, name: g.name })
  return g
}

export function removeOccupant(bookingId: string, guestId: string) {
  const s = S()
  const b = s.bookings.find((x) => x.id === bookingId)
  if (!b || b.guestId === guestId) return
  useStore.setState({ bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, occupantIds: x.occupantIds.filter((g) => g !== guestId) } : x)) })
  s.audit('Bỏ khách ở cùng', 'booking', bookingId, { guestId }, undefined)
}

export function addGroup(g: Omit<BookingGroup, 'id' | 'createdAt'>) {
  const s = S()
  const group: BookingGroup = { ...g, id: uid('grp'), createdAt: nowISO() }
  useStore.setState({ groups: [...s.groups, group] })
  s.audit('Tạo booking đoàn', 'group', group.id, undefined, { name: g.name })
  return group
}

/** Gán phòng tự động cho booking chưa xếp phòng (phòng trống cùng hạng) */
export function autoAssignRoom(bookingId: string) {
  const s = S()
  const b = s.bookings.find((x) => x.id === bookingId)
  if (!b) return { error: 'Không tìm thấy booking' }
  const free = freeRooms(s.rooms, s.bookings, b.roomTypeId, b.checkIn, b.checkOut, b.id)
  if (!free.length) return { error: 'Không còn phòng trống cùng hạng trong khoảng ngày này' }
  return s.moveBooking(bookingId, free[0].id, b.checkIn, b.checkOut)
}

// ---------- Mô phỏng OTA đổ booking (FR-02 AC1/AC3) ----------
export function simulateOtaBooking(channel?: Channel) {
  const s = S()
  const otas: Channel[] = ['ota:booking', 'ota:agoda', 'ota:traveloka']
  const ch = channel ?? otas[Math.floor(Math.random() * otas.length)]
  const rt = s.roomTypes[Math.floor(Math.random() * s.roomTypes.length)]
  const guestsPool = s.guests.filter((g) => !g.company)
  const guest = guestsPool[Math.floor(Math.random() * guestsPool.length)]
  const start = Math.floor(Math.random() * 6)
  const checkIn = addDaysISO(today(), start)
  const checkOut = addDaysISO(checkIn, 1 + Math.floor(Math.random() * 3))
  const otaRef = String(Math.floor(1000000000 + Math.random() * 9000000000))
  const free = freeRooms(s.rooms, s.bookings, rt.id, checkIn, checkOut)
  const res = s.createBooking({
    guestId: guest.id, roomTypeId: rt.id, roomId: free[0]?.id, checkIn, checkOut, adults: Math.min(2, rt.capacity), source: ch,
    otaRef, allowOverbook: true, note: `Nhận từ channel manager — mã OTA ${otaRef}`,
  })
  if (res.error) { s.toast(res.error, 'err'); return res }
  const b = res.booking!
  s.pushSync(ch, 'pull-booking', `Booking mới #${otaRef} — ${rt.name} ${checkIn} → ${checkOut}${b.overbooked ? ' (OVERBOOKED)' : free[0] ? ` → xếp phòng ${free[0].number}` : ''}`)
  if (!b.overbooked) s.toast(`${CHANNEL_LABEL[ch]} gửi booking ${b.code} (${rt.name}, ${checkIn})`, 'ok')
  return res
}

// ---------- Buồng phòng (FR-06) ----------
export function assignHousekeeping(roomId: string, staffId: string | undefined) {
  const s = S()
  const room = s.rooms.find((r) => r.id === roomId)
  if (!room) return
  useStore.setState({ rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, assignedTo: staffId } : r)) })
  s.audit(`Phân công phòng ${room.number}`, 'room', roomId, { assignedTo: room.assignedTo }, { assignedTo: staffId })
}

/** Chia đều phòng Dirty (và đang dọn chưa ai nhận) cho nhân viên buồng phòng đang hoạt động */
export function autoAssignHousekeeping() {
  const s = S()
  const hk = s.staff.filter((x) => x.roleId === 'housekeeping' && x.active)
  if (!hk.length) return { error: 'Không có nhân viên buồng phòng' }
  const dirty = s.rooms.filter((r) => r.status === 'dirty' || r.status === 'cleaning').sort((a, b) => a.number.localeCompare(b.number))
  const load: Record<string, number> = Object.fromEntries(hk.map((h) => [h.id, 0]))
  const rooms = s.rooms.map((r) => ({ ...r, assignedTo: dirty.some((d) => d.id === r.id) ? undefined : r.assignedTo }))
  for (const r of dirty) {
    const target = hk.slice().sort((a, b) => load[a.id] - load[b.id])[0]
    load[target.id]++
    const idx = rooms.findIndex((x) => x.id === r.id)
    rooms[idx] = { ...rooms[idx], assignedTo: target.id }
  }
  useStore.setState({ rooms })
  s.audit('Phân công tự động buồng phòng', 'room', undefined, undefined, load)
  s.toast(`Đã chia ${dirty.length} phòng cho ${hk.length} nhân viên`, 'ok')
  return { assigned: dirty.length }
}

/** Ghi minibar: cộng folio cho booking đang ở trong phòng + xuất kho */
export function recordMinibar(roomId: string, itemId: string, qty: number) {
  const s = S()
  const room = s.rooms.find((r) => r.id === roomId)
  const item = s.items.find((i) => i.id === itemId)
  if (!room || !item) return { error: 'Thiếu phòng hoặc vật tư' }
  const b = s.bookings.find((x) => x.roomId === roomId && x.status === 'checked-in')
  if (!b) return { error: `Phòng ${room.number} không có khách đang ở — không ghi được minibar` }
  const out = s.addStockMove({ itemId, type: 'out', qty, date: today(), by: s.currentUser.id, ref: roomId, note: `Minibar phòng ${room.number} — ${b.code}` })
  if (out.error) return out
  const price = item.sellPrice ?? item.cost
  s.addFolioLine({ bookingId: b.id, date: today(), type: 'minibar', description: `Minibar: ${item.name}`, qty, unitPrice: price, amount: price * qty })
  s.audit(`Minibar phòng ${room.number}`, 'booking', b.id, undefined, { item: item.name, qty })
  return {}
}

// ---------- Gói giá & mùa (FR-04 US-06) ----------
export function updateRatePlan(id: string, patch: Partial<RatePlan>) {
  const s = S()
  const p = s.ratePlans.find((x) => x.id === id)
  if (!p) return
  useStore.setState({ ratePlans: s.ratePlans.map((x) => (x.id === id ? { ...x, ...patch } : x)) })
  s.audit(`Sửa gói giá ${p.name}`, 'ratePlan', id, pickKeys(p, Object.keys(patch) as (keyof RatePlan)[]), patch)
}

export function addRatePlan(p: Omit<RatePlan, 'id'>) {
  const s = S()
  const plan: RatePlan = { ...p, id: uid('rp') }
  useStore.setState({ ratePlans: [...s.ratePlans, plan] })
  s.audit('Tạo gói giá', 'ratePlan', plan.id, undefined, { name: p.name })
  return plan
}

export function deleteRatePlan(id: string) {
  const s = S()
  const p = s.ratePlans.find((x) => x.id === id)
  if (!p) return
  useStore.setState({ ratePlans: s.ratePlans.filter((x) => x.id !== id) })
  s.audit(`Xoá gói giá ${p.name}`, 'ratePlan', id, { name: p.name }, undefined)
}

/** Thêm/sửa mùa — báo lỗi nếu trùng khoảng ngày với mùa khác cùng gói (FR-04 AC3) */
export function upsertSeason(planId: string, season: Omit<Season, 'id'> & { id?: string }) {
  const s = S()
  const p = s.ratePlans.find((x) => x.id === planId)
  if (!p) return { error: 'Không tìm thấy gói giá' }
  if (season.to < season.from) return { error: 'Ngày kết thúc phải sau ngày bắt đầu' }
  if (season.multiplier <= 0) return { error: 'Hệ số phải lớn hơn 0' }
  const clash = p.seasons.find((x) => x.id !== season.id && overlaps(x.from, addDaysISO(x.to, 1), season.from, addDaysISO(season.to, 1)))
  if (clash) return { error: `Trùng khoảng ngày với mùa "${clash.name}" (${clash.from} → ${clash.to}) trong cùng gói — không lưu` }
  const seasons = season.id ? p.seasons.map((x) => (x.id === season.id ? { ...x, ...season, id: x.id } : x)) : [...p.seasons, { ...season, id: uid('ss') }]
  useStore.setState({ ratePlans: s.ratePlans.map((x) => (x.id === planId ? { ...x, seasons } : x)) })
  s.audit(season.id ? `Sửa mùa ${season.name}` : `Thêm mùa ${season.name}`, 'ratePlan', planId, undefined, season)
  return {}
}

export function deleteSeason(planId: string, seasonId: string) {
  const s = S()
  const p = s.ratePlans.find((x) => x.id === planId)
  if (!p) return
  const ss = p.seasons.find((x) => x.id === seasonId)
  useStore.setState({ ratePlans: s.ratePlans.map((x) => (x.id === planId ? { ...x, seasons: x.seasons.filter((y) => y.id !== seasonId) } : x)) })
  s.audit(`Xoá mùa ${ss?.name ?? ''}`, 'ratePlan', planId, ss, undefined)
}

export function updateDiscountLimits(limits: Record<RoleId, number>) {
  const s = S()
  for (const v of Object.values(limits)) if (v < 0 || v > 100) return { error: 'Hạn mức phải trong khoảng 0–100%' }
  useStore.setState({ settings: { ...s.settings, discountLimits: limits } })
  s.audit('Cập nhật hạn mức chiết khấu', 'settings', 'discountLimits', s.settings.discountLimits, limits)
  return {}
}

// ---------- Kênh phân phối (FR-02) ----------
export function updateChannelConfig(channel: Channel, patch: Partial<ChannelConfig>) {
  const s = S()
  const c = s.channelConfigs.find((x) => x.channel === channel)
  if (!c) return
  useStore.setState({ channelConfigs: s.channelConfigs.map((x) => (x.channel === channel ? { ...x, ...patch } : x)) })
  s.audit(`Cấu hình kênh ${CHANNEL_LABEL[channel]}`, 'channel', channel, pickKeys(c, Object.keys(patch) as (keyof ChannelConfig)[]), patch)
  if (patch.buffer || patch.enabled !== undefined || patch.closedDates) {
    for (const rt of S().roomTypes) S().syncAvailability(rt.id, today(), addDaysISO(today(), 30))
  }
}

export function toggleClosedDate(channel: Channel, date: string) {
  const c = S().channelConfigs.find((x) => x.channel === channel)
  if (!c) return
  const closed = c.closedDates.includes(date) ? c.closedDates.filter((d) => d !== date) : [...c.closedDates, date].sort()
  updateChannelConfig(channel, { closedDates: closed })
}

export function retrySync(logId: string) {
  const s = S()
  const log = s.syncLogs.find((l) => l.id === logId)
  if (!log) return
  useStore.setState({ syncLogs: s.syncLogs.map((l) => (l.id === logId ? { ...l, status: 'ok' as SyncLog['status'], detail: `${l.detail} — thử lại thủ công OK` } : l)) })
  s.pushSync(log.channel, log.type, `Thử lại thủ công cho ${log.id}: thành công`)
  s.audit('Thử lại đồng bộ kênh', 'sync', logId, { status: log.status }, { status: 'ok' })
  s.toast(`Đồng bộ lại ${CHANNEL_LABEL[log.channel]} thành công`, 'ok')
}

export function resyncAll() {
  const s = S()
  for (const rt of s.roomTypes) s.syncAvailability(rt.id, today(), addDaysISO(today(), 30))
  for (const c of s.channelConfigs.filter((x) => x.enabled && x.channel.startsWith('ota'))) s.pushSync(c.channel, 'push-rate', 'Đẩy lại toàn bộ bảng giá 30 ngày (3 hạng)')
  s.audit('Đẩy đồng bộ lại toàn bộ', 'sync', undefined)
  s.toast('Đã đẩy lại tồn & giá 30 ngày lên các kênh OTA', 'ok')
}

// ---------- Hàng đợi offline (mô phỏng FR-06 AC3) ----------
export interface QueuedOp { id: string; label: string; run: () => { error?: string } | void }
let queue: QueuedOp[] = [] // thay mảng mới mỗi lần đổi để useSyncExternalStore nhận snapshot ổn định
const listeners = new Set<() => void>()
export const offlineQueue = {
  list: () => queue,
  push: (label: string, run: QueuedOp['run']) => { queue = [...queue, { id: uid('q'), label, run }]; listeners.forEach((l) => l()) },
  flush: () => {
    const ops = queue
    queue = []
    for (const op of ops) { const r = op.run(); if (r && r.error) S().toast(r.error, 'err') }
    listeners.forEach((l) => l())
    if (ops.length) S().toast(`Đã đồng bộ ${ops.length} thao tác chờ`, 'ok')
  },
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } },
}

function pickKeys<T extends object>(obj: T, keys: (keyof T)[]) {
  const out: Partial<T> = {}
  for (const k of keys) out[k] = obj[k]
  return out
}
