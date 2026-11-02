import type { BookingStatus, Channel, RoomStatus, RoleId, ServiceKey, GuestTier, PaymentMethod, Module } from '@/types'

export const CHANNEL_LABEL: Record<Channel, string> = {
  web: 'Web TAVINA',
  'front-desk': 'Lễ tân',
  'ota:booking': 'Booking.com',
  'ota:agoda': 'Agoda',
  'ota:traveloka': 'Traveloka',
  partner: 'Đối tác / đại lý',
}

export const CHANNEL_COLOR: Record<Channel, string> = {
  web: 'bg-teal-600',
  'front-desk': 'bg-stone-600',
  'ota:booking': 'bg-blue-700',
  'ota:agoda': 'bg-rose-600',
  'ota:traveloka': 'bg-sky-500',
  partner: 'bg-amber-600',
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  hold: 'Giữ chỗ',
  confirmed: 'Đã xác nhận',
  'checked-in': 'Đang ở',
  'checked-out': 'Đã trả phòng',
  cancelled: 'Đã huỷ',
  'no-show': 'Không đến',
  expired: 'Hết hạn giữ chỗ',
}

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  clean: 'Sẵn sàng',
  dirty: 'Bẩn',
  cleaning: 'Đang dọn',
  ooo: 'Bảo trì',
}

export const ROOM_STATUS_COLOR: Record<RoomStatus, string> = {
  clean: 'bg-emerald-600 text-white',
  dirty: 'bg-red-600 text-white',
  cleaning: 'bg-amber-500 text-stone-900',
  ooo: 'bg-stone-400 text-stone-900',
}

export const ROLE_LABEL: Record<RoleId, string> = {
  owner: 'Chủ khách sạn',
  manager: 'Quản lý',
  receptionist: 'Lễ tân',
  housekeeping: 'Buồng phòng',
  accountant: 'Kế toán',
  storekeeper: 'Thủ kho',
}

export const SERVICE_LABEL: Record<ServiceKey, string> = {
  flight: 'Vé máy bay',
  hotel: 'Khách sạn',
  bus: 'Vé xe',
  activity: 'Vé vui chơi',
  sim: 'SIM du lịch',
  visa: 'Visa',
  tour: 'Tour du lịch',
}

export const TIER_LABEL: Record<GuestTier, string> = { standard: 'Thường', silver: 'Bạc', gold: 'Vàng' }

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  card: 'Thẻ',
  gateway: 'Cổng online',
  ota: 'OTA thu hộ',
  debt: 'Công nợ',
}

export const MODULE_LABEL: Record<Module, string> = {
  dashboard: 'Tổng quan',
  calendar: 'Lịch đặt phòng',
  bookings: 'Booking',
  rooms: 'Sơ đồ phòng',
  rates: 'Giá & chiết khấu',
  promotions: 'Ưu đãi & combo',
  inventory: 'Kho',
  attendance: 'Chấm công',
  declaration: 'Khai báo lưu trú',
  invoices: 'Hoá đơn & công nợ',
  reports: 'Báo cáo',
  crm: 'Khách hàng',
  inbox: 'Hộp thư CSKH',
  channels: 'Kênh phân phối',
  settings: 'Cài đặt',
  audit: 'Nhật ký',
  leads: 'Yêu cầu tư vấn',
  cms: 'Nội dung web',
}
