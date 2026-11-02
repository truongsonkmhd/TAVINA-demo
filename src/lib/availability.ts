import type { Booking, ISODate, Room } from '@/types'
import { overlaps, eachNight } from './format'

export const OCCUPYING: Booking['status'][] = ['hold', 'confirmed', 'checked-in']

/** Booking đang chiếm phòng trong khoảng ngày (RULE-01) */
export function bookingsOccupying(bookings: Booking[], checkIn: ISODate, checkOut: ISODate, exceptId?: string) {
  return bookings.filter(
    (b) => b.id !== exceptId && OCCUPYING.includes(b.status) && overlaps(b.checkIn, b.checkOut, checkIn, checkOut),
  )
}

export function roomIsOOO(room: Room, checkIn: ISODate, checkOut: ISODate) {
  if (room.status !== 'ooo') return false
  if (!room.oooUntil) return true
  return checkIn <= room.oooUntil
}

/** Phòng vật lý còn trống cho hạng phòng trong khoảng ngày */
export function freeRooms(rooms: Room[], bookings: Booking[], roomTypeId: string, checkIn: ISODate, checkOut: ISODate, exceptBookingId?: string) {
  const busy = new Set(
    bookingsOccupying(bookings, checkIn, checkOut, exceptBookingId)
      .filter((b) => b.roomId)
      .map((b) => b.roomId as string),
  )
  return rooms.filter((r) => r.roomTypeId === roomTypeId && !busy.has(r.id) && !roomIsOOO(r, checkIn, checkOut))
}

/** Tồn theo hạng phòng từng đêm = tổng phòng − phòng OOO − booking chiếm (kể cả chưa xếp phòng) (RULE-02) */
export function availabilityByNight(rooms: Room[], bookings: Booking[], roomTypeId: string, checkIn: ISODate, checkOut: ISODate, buffer = 0) {
  const typeRooms = rooms.filter((r) => r.roomTypeId === roomTypeId)
  return eachNight(checkIn, checkOut).map((night) => {
    const next = addOne(night)
    const occ = bookingsOccupying(bookings, night, next).filter((b) => b.roomTypeId === roomTypeId).length
    const ooo = typeRooms.filter((r) => roomIsOOO(r, night, next)).length
    return { night, available: Math.max(0, typeRooms.length - ooo - occ - buffer), occupied: occ, ooo }
  })
}

export function minAvailability(rooms: Room[], bookings: Booking[], roomTypeId: string, checkIn: ISODate, checkOut: ISODate, buffer = 0) {
  return Math.min(...availabilityByNight(rooms, bookings, roomTypeId, checkIn, checkOut, buffer).map((n) => n.available))
}

/** Phòng có xung đột với booking khác nếu gán vào khoảng ngày này? Trả về booking xung đột */
export function conflictFor(bookings: Booking[], roomId: string, checkIn: ISODate, checkOut: ISODate, exceptId?: string) {
  return bookingsOccupying(bookings, checkIn, checkOut, exceptId).find((b) => b.roomId === roomId)
}

function addOne(d: ISODate) {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() + 1)
  return dt.toISOString().slice(0, 10)
}
