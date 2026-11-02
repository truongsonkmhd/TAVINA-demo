// Store duy nhất, lưu localStorage (key tavina-demo-v1). Các hành động lõi dùng chung ở đây;
// hành động riêng của từng module đặt trong features/<module>/actions.ts và gọi useStore.setState.
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AuditLog, Booking, BookingStatus, FolioLine, Payment, Room, RoomStatus, User, HousekeepingLog, StockMove, SyncLog, Guest,
} from '@/types'
import { seed, type SeedData } from '@/data/seed'
import { uid, nowISO } from '@/lib/ids'
import { today, eachNight, addDaysISO } from '@/lib/format'
import { conflictFor, minAvailability } from '@/lib/availability'
import { nightlyPrice, pickRatePlan } from '@/lib/pricing'
import { ROOM_STATUS_LABEL } from '@/lib/labels'

export interface StoreState extends SeedData {
  currentUser: User
  webGuestId?: string // khách đang "đăng nhập" trên web public
  toasts: { id: string; text: string; tone: 'ok' | 'warn' | 'err' }[]

  // tiện ích
  setUser: (u: User) => void
  loginWebGuest: (guestId?: string) => void
  toast: (text: string, tone?: 'ok' | 'warn' | 'err') => void
  dismissToast: (id: string) => void
  audit: (action: string, entity: string, entityId?: string, before?: unknown, after?: unknown) => void
  resetDemo: () => void
  patch: (fn: (s: StoreState) => Partial<StoreState>) => void

  // nghiệp vụ lõi
  upsertGuest: (g: Partial<Guest> & Pick<Guest, 'name' | 'phone'>) => Guest
  createBooking: (input: CreateBookingInput) => { booking?: Booking; error?: string }
  setBookingStatus: (id: string, status: BookingStatus, note?: string) => void
  moveBooking: (id: string, roomId: string | undefined, checkIn: string, checkOut: string) => { error?: string }
  setRoomStatus: (roomId: string, status: RoomStatus, note?: string, until?: string) => { error?: string }
  checkIn: (bookingId: string) => { error?: string }
  checkOut: (bookingId: string) => { error?: string }
  addFolioLine: (line: Omit<FolioLine, 'id'>) => void
  addPayment: (p: Omit<Payment, 'id'>) => void
  addStockMove: (m: Omit<StockMove, 'id'>) => { error?: string }
  pushSync: (channel: SyncLog['channel'], type: SyncLog['type'], detail: string, status?: SyncLog['status']) => void
  syncAvailability: (roomTypeId: string, checkIn: string, checkOut: string) => void
  confirmHold: (bookingId: string) => { error?: string }
  expireHolds: () => void
}

export interface CreateBookingInput {
  guestId: string
  roomTypeId: string
  roomId?: string
  checkIn: string
  checkOut: string
  adults: number
  children?: number
  source: Booking['source']
  status?: BookingStatus
  nightlyRate?: number
  ratePlanId?: string
  discountPct?: number
  discountReason?: string
  groupId?: string
  couponCode?: string
  comboId?: string
  note?: string
  otaRef?: string
  guestType?: 'retail' | 'group' | 'agent'
  allowOverbook?: boolean
}

const initial = (): SeedData => JSON.parse(JSON.stringify(seed))

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initial(),
      currentUser: seed.users[0],
      webGuestId: undefined,
      toasts: [],

      setUser: (u) => set({ currentUser: u }),
      loginWebGuest: (guestId) => set({ webGuestId: guestId }),
      toast: (text, tone = 'ok') => {
        const id = uid('t')
        set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }))
        setTimeout(() => get().dismissToast(id), 3500)
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      audit: (action, entity, entityId, before, after) => {
        const u = get().currentUser
        const log: AuditLog = { id: uid('al'), at: nowISO(), userId: u.id, userName: u.name, action, entity, entityId, before, after }
        set((s) => ({ auditLogs: [log, ...s.auditLogs] }))
      },
      resetDemo: () => set({ ...initial(), currentUser: seed.users[0], webGuestId: undefined }),
      patch: (fn) => set((s) => fn(s)),

      upsertGuest: (g) => {
        const s = get()
        const existing = g.id ? s.guests.find((x) => x.id === g.id) : s.guests.find((x) => x.phone.replace(/\s/g, '') === g.phone.replace(/\s/g, ''))
        if (existing) {
          const merged = { ...existing, ...g, id: existing.id }
          set({ guests: s.guests.map((x) => (x.id === existing.id ? merged : x)) })
          return merged
        }
        const created: Guest = { id: uid('g'), nationality: 'Việt Nam', points: 0, tier: 'standard', marketingOptIn: false, createdAt: nowISO(), ...g }
        set({ guests: [...s.guests, created] })
        return created
      },

      createBooking: (input) => {
        const s = get()
        const nightsList = eachNight(input.checkIn, input.checkOut)
        if (input.checkOut <= input.checkIn) return { error: 'Ngày trả phòng phải sau ngày nhận phòng' }
        const plan = input.ratePlanId ? s.ratePlans.find((p) => p.id === input.ratePlanId) : pickRatePlan(s.ratePlans, input.source, input.guestType ?? (input.groupId ? 'group' : 'retail'))
        const rt = s.roomTypes.find((r) => r.id === input.roomTypeId)
        if (!rt) return { error: 'Hạng phòng không tồn tại' }
        const extra = Math.max(0, input.adults - rt.capacity)
        const rate = input.nightlyRate ?? (plan ? Math.round(nightsList.reduce((x, d) => x + nightlyPrice(plan, input.roomTypeId, d, extra), 0) / nightsList.length) : rt.basePrice)
        const status = input.status ?? 'confirmed'
        let overbooked = false
        if (status !== 'cancelled') {
          if (input.roomId) {
            const c = conflictFor(s.bookings, input.roomId, input.checkIn, input.checkOut)
            if (c) return { error: `Phòng ${s.rooms.find((r) => r.id === input.roomId)?.number} đã có booking ${c.code} (${c.checkIn} → ${c.checkOut})` }
          } else if (minAvailability(s.rooms, s.bookings, input.roomTypeId, input.checkIn, input.checkOut) <= 0) {
            if (!input.allowOverbook) return { error: `Hạng ${rt.name} đã hết phòng trong khoảng ngày này` }
            overbooked = true
          }
        }
        // hạn mức chiết khấu (RULE-04)
        const limit = s.settings.discountLimits[s.currentUser.roleId] ?? 0
        const discountPct = input.discountPct ?? 0
        const discountStatus = discountPct > 0 ? (discountPct <= limit || input.source === 'web' ? 'approved' : 'pending') : undefined
        const b: Booking = {
          id: uid('bk'), code: `TL-${today().slice(2, 4)}${today().slice(5, 7)}${today().slice(8, 10)}-${String(s.bookingSeq).padStart(4, '0')}`,
          source: input.source, status, guestId: input.guestId, roomTypeId: input.roomTypeId, roomId: input.roomId, checkIn: input.checkIn, checkOut: input.checkOut,
          adults: input.adults, children: input.children ?? 0, nightlyRate: rate, ratePlanId: plan?.id, discountPct, discountStatus, discountReason: input.discountReason,
          groupId: input.groupId, overbooked: overbooked || undefined, otaRef: input.otaRef, couponCode: input.couponCode, comboId: input.comboId, note: input.note,
          occupantIds: [input.guestId], holdExpiresAt: status === 'hold' ? new Date(Date.now() + s.settings.holdMinutes * 60000).toISOString() : undefined,
          createdAt: nowISO(), createdBy: input.source === 'web' ? 'web' : s.currentUser.id,
        }
        set({ bookings: [...s.bookings, b], bookingSeq: s.bookingSeq + 1 })
        if (input.couponCode) set((st) => ({ coupons: st.coupons.map((c) => (c.code === input.couponCode ? { ...c, used: c.used + 1 } : c)) }))
        get().audit('Tạo booking', 'booking', b.id, undefined, { code: b.code, status, source: input.source, discountPct })
        get().syncAvailability(b.roomTypeId, b.checkIn, b.checkOut)
        if (overbooked) get().toast(`Booking ${b.code} bị OVERBOOKED — đã đưa vào hàng chờ xử lý`, 'warn')
        if (discountStatus === 'pending') get().toast(`Chiết khấu ${discountPct}% vượt hạn mức, chờ quản lý duyệt`, 'warn')
        return { booking: b }
      },

      setBookingStatus: (id, status, note) => {
        const s = get()
        const b = s.bookings.find((x) => x.id === id)
        if (!b) return
        set({ bookings: s.bookings.map((x) => (x.id === id ? { ...x, status, note: note ?? x.note } : x)) })
        get().audit('Đổi trạng thái booking', 'booking', id, { status: b.status }, { status })
        get().syncAvailability(b.roomTypeId, b.checkIn, b.checkOut)
      },

      moveBooking: (id, roomId, checkIn, checkOut) => {
        const s = get()
        const b = s.bookings.find((x) => x.id === id)
        if (!b) return { error: 'Không tìm thấy booking' }
        if (checkOut <= checkIn) return { error: 'Khoảng ngày không hợp lệ' }
        if (roomId) {
          const c = conflictFor(s.bookings, roomId, checkIn, checkOut, id)
          if (c) return { error: `Phòng ${s.rooms.find((r) => r.id === roomId)?.number} đã có booking ${c.code} (${c.checkIn} → ${c.checkOut})` }
        }
        const roomTypeId = roomId ? s.rooms.find((r) => r.id === roomId)!.roomTypeId : b.roomTypeId
        set({ bookings: s.bookings.map((x) => (x.id === id ? { ...x, roomId, roomTypeId, checkIn, checkOut, overbooked: roomId ? undefined : x.overbooked } : x)) })
        get().audit('Đổi phòng/ngày booking', 'booking', id, { roomId: b.roomId, checkIn: b.checkIn, checkOut: b.checkOut }, { roomId, checkIn, checkOut })
        get().syncAvailability(roomTypeId, checkIn, checkOut)
        return {}
      },

      setRoomStatus: (roomId, status, note, until) => {
        const s = get()
        const room = s.rooms.find((r) => r.id === roomId)
        if (!room) return { error: 'Không tìm thấy phòng' }
        if (status === 'ooo') {
          const end = until ?? addDaysISO(today(), 1)
          const affected = s.bookings.filter((b) => b.roomId === roomId && ['confirmed', 'checked-in'].includes(b.status) && b.checkIn <= end && b.checkOut > today())
          if (affected.length) return { error: `Phòng đang có booking ${affected.map((b) => b.code).join(', ')} — đổi phòng cho khách trước` }
        }
        const log: HousekeepingLog = { id: uid('hk'), roomId, from: room.status, to: status, by: s.currentUser.id, at: nowISO(), note }
        set({
          rooms: s.rooms.map((r) => (r.id === roomId ? { ...r, status, oooNote: status === 'ooo' ? note : undefined, oooUntil: status === 'ooo' ? until : undefined, cleaningStartedAt: status === 'cleaning' ? nowISO() : undefined } : r)),
          housekeepingLogs: [log, ...s.housekeepingLogs],
        })
        get().audit(`Phòng ${room.number}: ${ROOM_STATUS_LABEL[room.status]} → ${ROOM_STATUS_LABEL[status]}`, 'room', roomId, { status: room.status }, { status })
        if (status === 'ooo' || room.status === 'ooo') get().syncAvailability(room.roomTypeId, today(), until ?? addDaysISO(today(), 1))
        return {}
      },

      checkIn: (bookingId) => {
        const s = get()
        const b = s.bookings.find((x) => x.id === bookingId)
        if (!b) return { error: 'Không tìm thấy booking' }
        if (!b.roomId) return { error: 'Chưa xếp phòng cho booking này' }
        const room = s.rooms.find((r) => r.id === b.roomId)!
        if (room.status !== 'clean') return { error: `Phòng ${room.number} đang ${ROOM_STATUS_LABEL[room.status].toLowerCase()} — chỉ check-in khi phòng Sẵn sàng (RULE-05)` }
        const occupants = s.guests.filter((g) => b.occupantIds.includes(g.id))
        if (occupants.some((g) => !g.idNumber)) return { error: 'Khách thiếu số giấy tờ tuỳ thân — cần bổ sung để khai báo lưu trú (RULE-08)' }
        const plan = s.ratePlans.find((p) => p.id === b.ratePlanId)
        const lines: FolioLine[] = eachNight(b.checkIn, b.checkOut).map((d) => {
          const price = plan ? nightlyPrice(plan, b.roomTypeId, d) : b.nightlyRate
          const net = Math.round(price * (1 - (b.discountStatus === 'approved' ? b.discountPct : 0) / 100))
          return { id: uid('fl'), bookingId: b.id, date: d, type: 'room', description: `Tiền phòng ${s.roomTypes.find((r) => r.id === b.roomTypeId)?.name} ${room.number}`, qty: 1, unitPrice: net, amount: net }
        })
        set({
          bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, status: 'checked-in' } : x)),
          folioLines: [...s.folioLines.filter((f) => f.bookingId !== bookingId || f.type !== 'room'), ...lines],
        })
        get().audit('Check-in', 'booking', bookingId, { status: b.status }, { status: 'checked-in', room: room.number })
        return {}
      },

      checkOut: (bookingId) => {
        const s = get()
        const b = s.bookings.find((x) => x.id === bookingId)
        if (!b) return { error: 'Không tìm thấy booking' }
        const total = s.folioLines.filter((f) => f.bookingId === bookingId).reduce((x, f) => x + f.amount, 0)
        const paid = s.payments.filter((p) => p.bookingId === bookingId).reduce((x, p) => x + p.amount, 0)
        if (paid < total - 1) return { error: `Folio còn thiếu ${new Intl.NumberFormat('vi-VN').format(total - paid)}đ — thu tiền hoặc ghi công nợ trước khi trả phòng` }
        // tích điểm (FR-12)
        const pts = Math.floor(paid / s.settings.loyalty.pointsPerVnd)
        set({
          bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, status: 'checked-out' } : x)),
          rooms: s.rooms.map((r) => (r.id === b.roomId ? { ...r, status: 'dirty' } : r)),
          guests: s.guests.map((g) => {
            if (g.id !== b.guestId) return g
            const points = g.points + pts
            const tier = points >= s.settings.loyalty.goldPoints ? 'gold' : points >= s.settings.loyalty.silverPoints ? 'silver' : 'standard'
            return { ...g, points, tier }
          }),
          housekeepingLogs: b.roomId ? [{ id: uid('hk'), roomId: b.roomId, from: 'clean', to: 'dirty', by: 'system', at: nowISO(), note: 'Tự động sau check-out' }, ...s.housekeepingLogs] : s.housekeepingLogs,
        })
        get().audit('Check-out', 'booking', bookingId, { status: b.status }, { status: 'checked-out', paid })
        return {}
      },

      addFolioLine: (line) => set((s) => ({ folioLines: [...s.folioLines, { ...line, id: uid('fl') }] })),
      addPayment: (p) => {
        set((s) => ({ payments: [...s.payments, { ...p, id: uid('pay') }] }))
        get().audit('Thu tiền', 'booking', p.bookingId, undefined, { amount: p.amount, method: p.method })
      },

      addStockMove: (m) => {
        const s = get()
        const item = s.items.find((i) => i.id === m.itemId)
        if (!item) return { error: 'Không tìm thấy vật tư' }
        let stock = item.stock
        if (m.type === 'in') stock += m.qty
        else if (m.type === 'out') { if (m.qty > item.stock && !m.note?.includes('[cho âm kho]')) return { error: `Tồn ${item.name} chỉ còn ${item.stock} ${item.unit} — không đủ xuất ${m.qty}` }; stock -= m.qty }
        else stock = m.qty
        set({ items: s.items.map((i) => (i.id === m.itemId ? { ...i, stock } : i)), stockMoves: [{ ...m, id: uid('sm') }, ...s.stockMoves] })
        get().audit(`Kho: ${m.type === 'in' ? 'nhập' : m.type === 'out' ? 'xuất' : 'kiểm kê'} ${item.name}`, 'item', m.itemId, { stock: item.stock }, { stock })
        return {}
      },

      pushSync: (channel, type, detail, status = 'ok') =>
        set((s) => ({ syncLogs: [{ id: uid('sl'), at: nowISO(), channel, type, status, detail }, ...s.syncLogs].slice(0, 200) })),

      syncAvailability: (roomTypeId, checkIn, checkOut) => {
        const s = get()
        const rt = s.roomTypes.find((r) => r.id === roomTypeId)
        if (!rt) return
        for (const cfg of s.channelConfigs.filter((c) => c.enabled && c.channel.startsWith('ota'))) {
          const avail = minAvailability(s.rooms, s.bookings, roomTypeId, checkIn, checkOut, cfg.buffer[roomTypeId] ?? 0)
          get().pushSync(cfg.channel, 'push-availability', `${rt.name} ${checkIn} → ${checkOut}: tồn ${avail}${cfg.buffer[roomTypeId] ? ` (buffer ${cfg.buffer[roomTypeId]})` : ''}`)
        }
      },

      confirmHold: (bookingId) => {
        const s = get()
        const b = s.bookings.find((x) => x.id === bookingId)
        if (!b) return { error: 'Không tìm thấy booking' }
        if (b.status !== 'hold') return { error: 'Booking không ở trạng thái giữ chỗ' }
        const expired = b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < Date.now()
        let overbooked = false
        if (expired && minAvailability(s.rooms, s.bookings.filter((x) => x.id !== b.id), b.roomTypeId, b.checkIn, b.checkOut) <= 0) overbooked = true
        set({ bookings: s.bookings.map((x) => (x.id === bookingId ? { ...x, status: 'confirmed', overbooked: overbooked || undefined, holdExpiresAt: undefined } : x)) })
        get().audit('Xác nhận thanh toán web', 'booking', bookingId, { status: 'hold' }, { status: 'confirmed', overbooked })
        get().syncAvailability(b.roomTypeId, b.checkIn, b.checkOut)
        return {}
      },

      expireHolds: () => {
        const now = Date.now()
        const s = get()
        const expired = s.bookings.filter((b) => b.status === 'hold' && b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < now)
        if (!expired.length) return
        set({ bookings: s.bookings.map((b) => (expired.some((e) => e.id === b.id) ? { ...b, status: 'expired' } : b)) })
        for (const b of expired) get().syncAvailability(b.roomTypeId, b.checkIn, b.checkOut)
      },
    }),
    {
      name: 'tavina-demo-v1',
      version: 2,
      // v2: thêm mã giảm giá theo dịch vụ — bổ sung mã mới vào dữ liệu đã lưu, giữ nguyên các thay đổi khác
      migrate: (persisted, version) => {
        const st = persisted as StoreState
        if (version < 2 && st?.coupons) {
          const have = new Set(st.coupons.map((c) => c.id))
          st.coupons = [...st.coupons, ...seed.coupons.filter((c) => !have.has(c.id))]
        }
        return st
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([k, v]) => typeof v !== 'function' && k !== 'toasts')) as StoreState,
    },
  ),
)

// Selector tiện dụng
export const useRoom = (id?: string) => useStore((s) => s.rooms.find((r) => r.id === id))
export const useGuest = (id?: string) => useStore((s) => s.guests.find((g) => g.id === id))
export const useRoomType = (id?: string) => useStore((s) => s.roomTypes.find((r) => r.id === id))
export const useCan = () => {
  const roles = useStore((s) => s.roles)
  const user = useStore((s) => s.currentUser)
  return (module: Parameters<typeof import('@/lib/permissions').can>[2], action?: Parameters<typeof import('@/lib/permissions').can>[3]) =>
    // import tĩnh để tránh vòng lặp
    canFn(roles, user.roleId, module, action)
}
import { can as canFn } from '@/lib/permissions'
