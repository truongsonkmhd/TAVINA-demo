// Mô hình dữ liệu demo — bám theo docs/ba/2026-11-03-pms-srs.md

export type ISODate = string // 'yyyy-MM-dd'
export type ISODateTime = string // new Date().toISOString()

export type Channel =
  | 'web'
  | 'front-desk'
  | 'ota:booking'
  | 'ota:agoda'
  | 'ota:traveloka'
  | 'partner'

export type BookingStatus =
  | 'hold'
  | 'confirmed'
  | 'checked-in'
  | 'checked-out'
  | 'cancelled'
  | 'no-show'
  | 'expired'

export type RoomStatus = 'clean' | 'dirty' | 'cleaning' | 'ooo'

export type RoleId = 'owner' | 'manager' | 'receptionist' | 'housekeeping' | 'accountant' | 'storekeeper'

export type Module =
  | 'dashboard'
  | 'calendar'
  | 'bookings'
  | 'rooms'
  | 'rates'
  | 'promotions'
  | 'inventory'
  | 'attendance'
  | 'declaration'
  | 'invoices'
  | 'reports'
  | 'crm'
  | 'inbox'
  | 'channels'
  | 'settings'
  | 'audit'
  | 'leads'
  | 'cms'

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'

export interface RoomType {
  id: string
  name: string
  capacity: number
  sizeM2: number
  basePrice: number
  description: string
  amenities: string[]
  image: string
}

export interface Room {
  id: string
  number: string
  floor: number
  roomTypeId: string
  status: RoomStatus
  oooNote?: string
  oooUntil?: ISODate
  assignedTo?: string // staffId buồng phòng
  cleaningStartedAt?: ISODateTime
}

export type GuestTier = 'standard' | 'silver' | 'gold'

export interface Guest {
  id: string
  name: string
  phone: string
  email?: string
  idNumber?: string
  idType?: 'cccd' | 'passport'
  nationality: string
  dob?: ISODate
  gender?: 'M' | 'F' | 'O'
  address?: string
  points: number
  tier: GuestTier
  company?: { name: string; taxCode: string; address: string; email?: string }
  marketingOptIn: boolean
  notes?: string
  createdAt: ISODateTime
}

export interface Booking {
  id: string
  code: string
  source: Channel
  status: BookingStatus
  guestId: string
  roomTypeId: string
  roomId?: string
  checkIn: ISODate
  checkOut: ISODate
  adults: number
  children: number
  nightlyRate: number
  ratePlanId?: string
  discountPct: number
  discountStatus?: 'pending' | 'approved' | 'rejected'
  discountReason?: string
  groupId?: string
  overbooked?: boolean
  otaRef?: string
  couponCode?: string
  comboId?: string
  note?: string
  occupantIds: string[] // guestIds ở trong phòng (để khai báo lưu trú)
  holdExpiresAt?: ISODateTime
  declaredAt?: ISODateTime
  createdAt: ISODateTime
  createdBy: string
}

export interface BookingGroup {
  id: string
  name: string
  contactName: string
  contactPhone: string
  deposit: number
  dueDate?: ISODate
  invoiceMode: 'merged' | 'split'
  note?: string
  createdAt: ISODateTime
}

export type FolioLineType = 'room' | 'service' | 'minibar' | 'surcharge' | 'discount'

export interface FolioLine {
  id: string
  bookingId: string
  date: ISODate
  type: FolioLineType
  description: string
  qty: number
  unitPrice: number
  amount: number
  invoiceId?: string
}

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'gateway' | 'ota' | 'debt'

export interface Payment {
  id: string
  bookingId: string
  date: ISODate
  method: PaymentMethod
  amount: number
  note?: string
}

export interface Invoice {
  id: string
  number: string
  bookingIds: string[]
  buyer: { name: string; taxCode?: string; address?: string; email?: string }
  lineIds: string[]
  subtotal: number
  vatPct: number
  total: number
  status: 'pending' | 'issued' | 'adjusted' | 'replaced'
  cqtCode?: string
  issuedAt?: ISODateTime
  createdAt: ISODateTime
  note?: string
}

export interface Season {
  id: string
  name: string
  from: ISODate
  to: ISODate
  multiplier: number
}

export interface RatePlan {
  id: string
  name: string
  guestType: 'retail' | 'group' | 'agent'
  channels: Channel[]
  prices: Record<string, number> // roomTypeId -> giá/đêm
  seasons: Season[]
  weekendMultiplier: number
  minStay: number
  cancelPolicy: string
  extraAdultFee: number
  priority: number
  active: boolean
}

export interface Promotion {
  id: string
  name: string
  type: 'percent' | 'amount' | 'free-night' | 'gift'
  value: number
  description: string
  from: ISODate
  to: ISODate
  minStay: number
  channels: Channel[]
  maxUses: number
  used: number
  stackable: boolean
  active: boolean
}

export interface Combo {
  id: string
  name: string
  roomTypeId: string
  nights: number
  services: { name: string; price: number }[]
  comboPrice: number
  description: string
  image: string
  active: boolean
}

export interface Coupon {
  id: string
  code: string
  type: 'percent' | 'amount'
  value: number
  maxUses: number
  used: number
  from: ISODate
  to: ISODate
  channels: Channel[]
  active: boolean
  /** Dịch vụ áp dụng; không có = khách sạn (áp ở checkout web). Dịch vụ khác: tư vấn viên áp vào báo giá. */
  service?: ServiceKey
  title?: string
  note?: string
}

export interface HousekeepingLog {
  id: string
  roomId: string
  from: RoomStatus
  to: RoomStatus
  by: string
  at: ISODateTime
  note?: string
}

export type ItemGroup = 'minibar' | 'amenity' | 'linen' | 'chemical' | 'other'

export interface Item {
  id: string
  sku: string
  name: string
  group: ItemGroup
  unit: string
  cost: number
  sellPrice?: number
  minStock: number
  stock: number
  perRoomNorm?: number
}

export interface StockMove {
  id: string
  itemId: string
  type: 'in' | 'out' | 'count'
  qty: number
  unitCost?: number
  date: ISODate
  by: string
  ref?: string // supplier / roomId / bookingId
  note?: string
}

export interface Staff {
  id: string
  name: string
  roleId: RoleId
  phone: string
  active: boolean
}

export type ShiftCode = 'morning' | 'afternoon' | 'night'

export interface Shift {
  id: string
  staffId: string
  date: ISODate
  shift: ShiftCode
}

export interface Attendance {
  id: string
  staffId: string
  date: ISODate
  checkIn?: string // 'HH:mm'
  checkOut?: string
  flagged?: boolean
  note?: string
}

export interface Declaration {
  id: string
  date: ISODate
  bookingIds: string[]
  guestIds: string[]
  foreign: boolean
  exportedAt: ISODateTime
  by: string
  receiptCode?: string
}

export interface Debt {
  id: string
  partyType: 'group' | 'agent' | 'ota'
  partyName: string
  bookingIds: string[]
  amount: number
  paid: number
  dueDate: ISODate
  createdAt: ISODateTime
}

export interface Expense {
  id: string
  date: ISODate
  category: string
  amount: number
  note?: string
}

export interface Campaign {
  id: string
  name: string
  channel: 'sms' | 'zalo' | 'email'
  segment: { tiers: GuestTier[]; lastStayBeforeDays?: number }
  template: string
  couponCode?: string
  recipients: number
  opened: number
  bookings: number
  cost: number
  createdAt: ISODateTime
}

export type ConversationChannel = 'zalo' | 'messenger' | 'email' | 'phone'

export interface Message {
  id: string
  from: 'guest' | 'staff'
  text: string
  at: ISODateTime
}

export interface Conversation {
  id: string
  channel: ConversationChannel
  guestId?: string
  contactName: string
  contactRef: string // số điện thoại / ID kênh / email
  messages: Message[]
  status: 'new' | 'in-progress' | 'done'
  assignedTo?: string
  updatedAt: ISODateTime
}

export interface Role {
  id: RoleId
  name: string
  permissions: Partial<Record<Module, Action[]>>
}

export interface AuditLog {
  id: string
  at: ISODateTime
  userId: string
  userName: string
  action: string
  entity: string
  entityId?: string
  before?: unknown
  after?: unknown
}

export type ServiceKey = 'flight' | 'hotel' | 'bus' | 'activity' | 'sim' | 'visa' | 'tour'

export interface Lead {
  id: string
  service: ServiceKey
  subcategory?: string
  name: string
  phone: string
  email?: string
  need: string
  travelDate?: ISODate
  pax?: number
  status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost'
  assignedTo?: string
  note?: string
  createdAt: ISODateTime
}

export interface SyncLog {
  id: string
  at: ISODateTime
  channel: Channel
  type: 'push-availability' | 'push-rate' | 'pull-booking'
  status: 'ok' | 'retry' | 'failed'
  detail: string
}

export interface ChannelConfig {
  channel: Channel
  enabled: boolean
  commissionPct: number
  priceMultiplier: number
  roomTypeMapping: Record<string, string> // roomTypeId -> mã trên OTA
  buffer: Record<string, number> // roomTypeId -> số phòng giữ lại
  closedDates: ISODate[]
}

export interface PartnerHotel {
  id: string
  name: string
  city: string
  area: string
  stars: number
  rating: number
  reviews: number
  priceFrom: number
  image: string
  amenities: string[]
  freeCancel: boolean
  description: string
}

export interface Settings {
  hotelName: string
  address: string
  phone: string
  checkInTime: string
  checkOutTime: string
  nightAuditHour: number
  holdMinutes: number
  vatPct: number
  discountLimits: Record<RoleId, number>
  loyalty: { pointsPerVnd: number; silverPoints: number; goldPoints: number }
  staffCommissionPct: number
}

export interface User {
  id: string
  name: string
  roleId: RoleId
}

export interface CmsContent {
  heroTitle: string
  heroSubtitle: string
  banners: { id: string; title: string; subtitle: string; image: string; link: string }[]
  posts: { id: string; title: string; excerpt: string; image: string; date: ISODate }[]
}

export interface Order {
  // Đơn hàng phía khách trên web (tài khoản khách)
  id: string
  bookingId: string
  guestId: string
  createdAt: ISODateTime
}
