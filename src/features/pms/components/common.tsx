// Phần dùng chung cho các trang PMS
import { useStore } from '@/store'
import { Badge, cx } from '@/components/ui'
import { BOOKING_STATUS_LABEL, CHANNEL_COLOR, CHANNEL_LABEL } from '@/lib/labels'
import { nights } from '@/lib/format'
import { can } from '@/lib/permissions'
import type { Action, Booking, BookingStatus, Channel, Module } from '@/types'

export const STATUS_TONE: Record<BookingStatus, 'neutral' | 'ok' | 'warn' | 'err' | 'info'> = {
  hold: 'warn', confirmed: 'ok', 'checked-in': 'info', 'checked-out': 'neutral', cancelled: 'err', 'no-show': 'err', expired: 'neutral',
}

export const StatusBadge = ({ status }: { status: BookingStatus }) => <Badge tone={STATUS_TONE[status]}>{BOOKING_STATUS_LABEL[status]}</Badge>

export const ChannelTag = ({ channel }: { channel: Channel }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs"><span className={cx('h-2.5 w-2.5 rounded-sm', CHANNEL_COLOR[channel])} />{CHANNEL_LABEL[channel]}</span>
)

/** Hook kiểm tra quyền của người dùng hiện tại */
export function usePerm() {
  const roles = useStore((s) => s.roles)
  const roleId = useStore((s) => s.currentUser.roleId)
  return (m: Module, a: Action = 'view') => can(roles, roleId, m, a)
}

/** Tổng tiền dự kiến của booking: folio nếu đã có, ngược lại giá/đêm × số đêm trừ chiết khấu đã duyệt */
export function bookingTotal(b: Booking, folioTotal: number) {
  if (folioTotal) return folioTotal
  return Math.round(b.nightlyRate * nights(b.checkIn, b.checkOut) * (1 - (b.discountStatus === 'approved' ? b.discountPct : 0) / 100))
}

/** Gói kết quả {error?} thành toast */
export function useRun() {
  const toast = useStore((s) => s.toast)
  return (r: { error?: string } | void | undefined, ok?: string) => {
    if (r && 'error' in r && r.error) { toast(r.error, 'err'); return false }
    if (ok) toast(ok)
    return true
  }
}
