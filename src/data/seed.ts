// Dữ liệu mẫu cho demo — sinh tương đối theo ngày hôm nay để lịch luôn "sống"
import type {
  Attendance, AuditLog, Booking, BookingGroup, Campaign, ChannelConfig, CmsContent, Combo, Conversation, Coupon, Debt,
  Declaration, Expense, FolioLine, Guest, HousekeepingLog, Invoice, Item, Lead, PartnerHotel, Payment, Promotion, RatePlan,
  Room, RoomType, Settings, Shift, Staff, StockMove, SyncLog, User,
} from '@/types'
import { addDaysISO, eachNight, today, toISODate } from '@/lib/format'
import { DEFAULT_ROLES } from '@/lib/permissions'
import { nightlyPrice } from '@/lib/pricing'

// PRNG xác định để dữ liệu ổn định giữa các lần reset
let s = 20261103
const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
const rint = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
const img = (seed: string, w = 1200, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`

const T = today()
const D = (n: number) => addDaysISO(T, n)
const ISO = (n: number, h = 9) => { const d = new Date(D(n) + `T${String(h).padStart(2, '0')}:00:00`); return d.toISOString() }

export const roomTypes: RoomType[] = [
  { id: 'rt_std', name: 'Standard', capacity: 2, sizeM2: 22, basePrice: 700000, description: 'Phòng tiêu chuẩn, giường đôi hoặc 2 giường đơn, cửa sổ hướng phố.', amenities: ['Điều hoà', 'Wifi', 'TV', 'Minibar', 'Nước nóng'], image: img('tl-std') },
  { id: 'rt_dlx', name: 'Deluxe', capacity: 2, sizeM2: 28, basePrice: 900000, description: 'Phòng rộng có ban công, hướng biển một phần, bàn làm việc.', amenities: ['Điều hoà', 'Wifi', 'TV', 'Minibar', 'Ban công', 'Bồn tắm'], image: img('tl-dlx') },
  { id: 'rt_fam', name: 'Family', capacity: 4, sizeM2: 36, basePrice: 1400000, description: 'Phòng gia đình 1 giường đôi + 2 giường đơn, góc trẻ em.', amenities: ['Điều hoà', 'Wifi', 'TV', 'Minibar', 'Ban công', 'Bếp nhỏ'], image: img('tl-fam') },
]

export const rooms: Room[] = []
const layout: [number, string[], string][] = [
  [1, ['101','102','103','104','105','106','107','108'], 'rt_std'],
  [2, ['201','202','203','204'], 'rt_std'],
  [2, ['205','206','207','208'], 'rt_dlx'],
  [3, ['301','302','303','304'], 'rt_dlx'],
  [3, ['305','306','307','308'], 'rt_fam'],
]
for (const [floor, nums, rt] of layout) for (const n of nums) rooms.push({ id: `room_${n}`, number: n, floor, roomTypeId: rt, status: 'clean' })
rooms.find((r) => r.number === '105')!.status = 'ooo'
rooms.find((r) => r.number === '105')!.oooNote = 'Điều hoà hỏng, chờ linh kiện'
rooms.find((r) => r.number === '105')!.oooUntil = D(3)

export const settings: Settings = {
  hotelName: 'Khách sạn Thanh Long', address: '12 Độc Lập, P. 7, Tuy Hoà, Phú Yên', phone: '0257 3 888 999',
  checkInTime: '14:00', checkOutTime: '12:00', nightAuditHour: 2, holdMinutes: 15, vatPct: 8,
  discountLimits: { owner: 100, manager: 15, receptionist: 5, housekeeping: 0, accountant: 0, storekeeper: 0 },
  loyalty: { pointsPerVnd: 10000, silverPoints: 500, goldPoints: 1500 }, staffCommissionPct: 2,
}

export const ratePlans: RatePlan[] = [
  { id: 'rp_web', name: 'Giá web & quầy (khách lẻ)', guestType: 'retail', channels: ['web', 'front-desk'], prices: { rt_std: 700000, rt_dlx: 900000, rt_fam: 1400000 },
    seasons: [ { id: 'ss_high', name: 'Cao điểm hè', from: `${T.slice(0,4)}-06-01`, to: `${T.slice(0,4)}-08-31`, multiplier: 1.25 }, { id: 'ss_tet', name: 'Tết', from: `${+T.slice(0,4)+1}-02-14`, to: `${+T.slice(0,4)+1}-02-20`, multiplier: 1.6 } ],
    weekendMultiplier: 1.15, minStay: 1, cancelPolicy: 'Huỷ miễn phí trước 48h, sau đó tính 1 đêm', extraAdultFee: 150000, priority: 10, active: true },
  { id: 'rp_ota', name: 'Giá OTA', guestType: 'retail', channels: ['ota:booking', 'ota:agoda', 'ota:traveloka'], prices: { rt_std: 780000, rt_dlx: 990000, rt_fam: 1550000 },
    seasons: [ { id: 'ss_high2', name: 'Cao điểm hè', from: `${T.slice(0,4)}-06-01`, to: `${T.slice(0,4)}-08-31`, multiplier: 1.25 } ],
    weekendMultiplier: 1.15, minStay: 1, cancelPolicy: 'Theo chính sách OTA', extraAdultFee: 150000, priority: 10, active: true },
  { id: 'rp_group', name: 'Giá đoàn (≥ 5 phòng)', guestType: 'group', channels: ['front-desk', 'partner'], prices: { rt_std: 600000, rt_dlx: 780000, rt_fam: 1200000 },
    seasons: [], weekendMultiplier: 1, minStay: 1, cancelPolicy: 'Cọc 30%, huỷ trước 7 ngày hoàn cọc', extraAdultFee: 120000, priority: 20, active: true },
  { id: 'rp_agent', name: 'Giá đại lý / công ty lữ hành', guestType: 'agent', channels: ['partner'], prices: { rt_std: 630000, rt_dlx: 810000, rt_fam: 1260000 },
    seasons: [], weekendMultiplier: 1.1, minStay: 1, cancelPolicy: 'Theo hợp đồng đại lý', extraAdultFee: 150000, priority: 15, active: true },
]

const firstNames = ['Nguyễn Văn An','Trần Thị Bích','Lê Minh Châu','Phạm Quốc Dũng','Hoàng Thu Hà','Vũ Đức Huy','Đặng Ngọc Lan','Bùi Thanh Long','Đỗ Mai Phương','Ngô Gia Bảo','Dương Khánh Linh','Lý Hoàng Nam','Phan Thu Trang','Trịnh Văn Tùng','Võ Thị Yến','Tạ Quang Vinh','Mai Anh Thư','Cao Bá Quát','Lưu Hồng Nhung','Hồ Sỹ Đạt','Đinh Thị Hạnh','Lâm Gia Hân','Tô Văn Kiên','Chu Thị Mỹ']
const cities = ['Hà Nội','TP. Hồ Chí Minh','Đà Nẵng','Nha Trang','Quy Nhơn','Huế','Cần Thơ']

export const guests: Guest[] = firstNames.map((name, i) => ({
  id: `g_${i + 1}`, name, phone: `09${rint(10000000, 99999999)}`, email: `${name.split(' ').pop()!.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}${i}@gmail.com`,
  idNumber: `0${rint(10000000000, 99999999999)}`, idType: 'cccd', nationality: 'Việt Nam', dob: `${rint(1970, 2000)}-${String(rint(1,12)).padStart(2,'0')}-${String(rint(1,28)).padStart(2,'0')}`,
  gender: i % 2 ? 'F' : 'M', address: pick(cities), points: 0, tier: 'standard', marketingOptIn: i % 3 !== 0, createdAt: ISO(-rint(30, 400)),
}))
guests.push({ id: 'g_25', name: 'John Miller', phone: '+44 7700 900123', email: 'john.miller@example.com', idNumber: 'GB1234567', idType: 'passport', nationality: 'Anh', dob: '1985-04-12', gender: 'M', address: 'London', points: 0, tier: 'standard', marketingOptIn: true, createdAt: ISO(-5) })
guests.push({ id: 'g_26', name: 'Công ty Du lịch Xanh Phú Yên', phone: '0257 3 777 666', email: 'booking@dulichxanh.vn', nationality: 'Việt Nam', points: 0, tier: 'gold', company: { name: 'Công ty TNHH Du lịch Xanh Phú Yên', taxCode: '4401234567', address: '45 Hùng Vương, Tuy Hoà', email: 'ketoan@dulichxanh.vn' }, marketingOptIn: false, createdAt: ISO(-300) })
guests[0].company = { name: 'Công ty CP Công nghệ ABC', taxCode: '0101234567', address: '1 Láng Hạ, Hà Nội', email: 'ketoan@abc.vn' }

export const groups: BookingGroup[] = [
  { id: 'grp_1', name: 'Đoàn Công ty ABC — team building', contactName: 'Nguyễn Văn An', contactPhone: guests[0].phone, deposit: 6000000, dueDate: D(10), invoiceMode: 'merged', note: 'Ăn sáng 7h, xe đón sân bay', createdAt: ISO(-12) },
  { id: 'grp_2', name: 'Đoàn Du lịch Xanh — tour Gành Đá Đĩa', contactName: 'Chị Hạnh (ĐL)', contactPhone: '0257 3 777 666', deposit: 4000000, dueDate: D(20), invoiceMode: 'split', createdAt: ISO(-6) },
]

export const bookings: Booking[] = []
export const folioLines: FolioLine[] = []
export const payments: Payment[] = []
let seq = 1
const chans: Booking['source'][] = ['web', 'web', 'front-desk', 'front-desk', 'ota:booking', 'ota:booking', 'ota:agoda', 'ota:traveloka', 'partner']

function addBooking(partial: Partial<Booking> & Pick<Booking, 'guestId' | 'roomTypeId' | 'checkIn' | 'checkOut' | 'source' | 'status'>) {
  const plan = partial.source.startsWith('ota') ? ratePlans[1] : partial.groupId ? ratePlans[2] : partial.source === 'partner' ? ratePlans[3] : ratePlans[0]
  const n = eachNight(partial.checkIn, partial.checkOut)
  const rate = Math.round(n.reduce((sum, d) => sum + nightlyPrice(plan, partial.roomTypeId, d), 0) / n.length)
  const b: Booking = {
    id: `bk_${seq}`, code: `TL-${partial.checkIn.slice(2,4)}${partial.checkIn.slice(5,7)}${partial.checkIn.slice(8,10)}-${String(seq).padStart(4,'0')}`,
    adults: Math.min(2, roomTypes.find((r) => r.id === partial.roomTypeId)!.capacity), children: 0, nightlyRate: rate, ratePlanId: plan.id, discountPct: 0,
    occupantIds: [partial.guestId], createdAt: ISO(-rint(1, 20)), createdBy: partial.source === 'front-desk' ? 'u_rec' : 'system',
    otaRef: partial.source.startsWith('ota') ? String(rint(1000000000, 9999999999)) : undefined,
    ...partial,
  }
  seq++
  bookings.push(b)
  // folio: tiền phòng từng đêm cho booking đã/đang ở
  if (b.status === 'checked-in' || b.status === 'checked-out') {
    for (const d of n) folioLines.push({ id: `fl_${b.id}_${d}`, bookingId: b.id, date: d, type: 'room', description: `Tiền phòng ${roomTypes.find((r) => r.id === b.roomTypeId)!.name} ${b.roomId ? rooms.find((r) => r.id === b.roomId)!.number : ''}`, qty: 1, unitPrice: nightlyPrice(plan, b.roomTypeId, d), amount: nightlyPrice(plan, b.roomTypeId, d) })
    if (rnd() > 0.5) folioLines.push({ id: `fl_${b.id}_mb`, bookingId: b.id, date: b.checkIn, type: 'minibar', description: 'Minibar: 2 nước suối, 1 bia', qty: 1, unitPrice: 75000, amount: 75000 })
  }
  if (b.status === 'checked-out') {
    const total = folioLines.filter((f) => f.bookingId === b.id).reduce((x, f) => x + f.amount, 0)
    payments.push({ id: `pay_${b.id}`, bookingId: b.id, date: b.checkOut, method: b.source.startsWith('ota') ? 'ota' : pick(['cash', 'transfer', 'card']), amount: total })
  } else if (b.source === 'web' && (b.status === 'confirmed' || b.status === 'checked-in')) {
    payments.push({ id: `pay_${b.id}`, bookingId: b.id, date: b.createdAt.slice(0, 10), method: 'gateway', amount: rate * n.length })
  }
  return b
}

// Quá khứ: đã trả phòng (để báo cáo có số liệu 30 ngày)
const stdRooms = rooms.filter((r) => r.roomTypeId === 'rt_std'), dlxRooms = rooms.filter((r) => r.roomTypeId === 'rt_dlx'), famRooms = rooms.filter((r) => r.roomTypeId === 'rt_fam')
const roomsOf = (rt: string) => (rt === 'rt_std' ? stdRooms : rt === 'rt_dlx' ? dlxRooms : famRooms)
for (let day = -30; day < -1; day++) {
  const count = rint(10, 19)
  const used = new Set<string>()
  for (let i = 0; i < count; i++) {
    const rt = pick(['rt_std','rt_std','rt_std','rt_dlx','rt_dlx','rt_fam'])
    const room = pick(roomsOf(rt))
    if (used.has(room.id)) continue
    // tránh trùng với booking đã tạo ở ngày trước còn kéo dài
    const nightsN = rint(1, 3)
    const ci = D(day), co = D(day + nightsN)
    if (bookings.some((b) => b.roomId === room.id && b.checkIn < co && ci < b.checkOut)) continue
    used.add(room.id)
    if (co > T) continue
    addBooking({ guestId: pick(guests.slice(0, 24)).id, roomTypeId: rt, roomId: room.id, checkIn: ci, checkOut: co, source: pick(chans), status: 'checked-out' })
  }
}
// Hiện tại: đang ở
const inhouse: [string, string, number, number, Booking['source']][] = [
  ['room_101','g_1',-2,1,'web'], ['room_102','g_2',-1,2,'ota:booking'], ['room_104','g_3',-1,1,'front-desk'], ['room_106','g_4',-3,1,'ota:agoda'],
  ['room_201','g_5',-1,3,'web'], ['room_205','g_6',-2,2,'ota:traveloka'], ['room_206','g_25',-1,4,'ota:booking'], ['room_301','g_7',-1,1,'front-desk'],
  ['room_305','g_8',-2,1,'web'], ['room_306','g_9',-1,2,'partner'],
]
for (const [room, g, from, len, src] of inhouse) addBooking({ guestId: g, roomTypeId: rooms.find((r) => r.id === room)!.roomTypeId, roomId: room, checkIn: D(from), checkOut: D(from + len), source: src, status: 'checked-in' })
// Đến hôm nay (confirmed)
const arriving: [string, string, number, Booking['source']][] = [['room_103','g_10',2,'web'], ['room_107','g_11',1,'ota:agoda'], ['room_207','g_12',3,'ota:booking'], ['room_302','g_13',2,'front-desk'], ['room_307','g_14',2,'web']]
for (const [room, g, len, src] of arriving) addBooking({ guestId: g, roomTypeId: rooms.find((r) => r.id === room)!.roomTypeId, roomId: room, checkIn: T, checkOut: D(len), source: src, status: 'confirmed' })
// Tương lai
const future: [string | undefined, string, number, number, Booking['source']][] = [
  ['room_101','g_15',1,2,'ota:booking'], ['room_108','g_16',2,2,'web'], ['room_202','g_17',3,1,'front-desk'], ['room_208','g_18',2,3,'ota:traveloka'], ['room_303','g_19',4,2,'web'],
  ['room_304','g_20',5,2,'ota:agoda'], ['room_308','g_21',6,3,'web'], [undefined,'g_22',3,2,'ota:booking'], ['room_102','g_23',7,2,'web'], ['room_104','g_24',8,1,'front-desk'],
  ['room_206','g_1',9,2,'ota:booking'], ['room_301','g_2',10,3,'web'], ['room_106','g_3',12,2,'ota:agoda'], ['room_205','g_4',14,2,'web'],
]
for (const [room, g, from, len, src] of future) addBooking({ guestId: g, roomTypeId: room ? rooms.find((r) => r.id === room)!.roomTypeId : 'rt_std', roomId: room, checkIn: D(from), checkOut: D(from + len), source: src, status: 'confirmed' })
// Đoàn ABC: 5 phòng Deluxe/Standard từ D+10..D+12
for (const room of ['room_201','room_202','room_203','room_204','room_205']) addBooking({ guestId: 'g_1', roomTypeId: rooms.find((r) => r.id === room)!.roomTypeId, roomId: room, checkIn: D(10), checkOut: D(12), source: 'front-desk', status: 'confirmed', groupId: 'grp_1', adults: 2 })
// Đoàn Du lịch Xanh: 3 Family D+20..D+22
for (const room of ['room_305','room_306','room_307']) addBooking({ guestId: 'g_26', roomTypeId: 'rt_fam', roomId: room, checkIn: D(20), checkOut: D(22), source: 'partner', status: 'confirmed', groupId: 'grp_2', adults: 4 })
// Overbooked (OTA đổ về khi hết Standard ngày D+1)
addBooking({ guestId: 'g_11', roomTypeId: 'rt_std', checkIn: D(1), checkOut: D(2), source: 'ota:agoda', status: 'confirmed', overbooked: true, note: 'OTA đổ về khi tồn Standard = 0 — cần xử lý' })
// Chờ duyệt chiết khấu
addBooking({ guestId: 'g_17', roomTypeId: 'rt_dlx', roomId: 'room_207', checkIn: D(5), checkOut: D(7), source: 'front-desk', status: 'confirmed', discountPct: 10, discountStatus: 'pending', discountReason: 'Khách quen, ở lần 4' })
// Hold từ web đang chờ thanh toán
addBooking({ guestId: 'g_20', roomTypeId: 'rt_dlx', checkIn: D(15), checkOut: D(17), source: 'web', status: 'hold', holdExpiresAt: new Date(Date.now() + 12 * 60000).toISOString() })
// Huỷ & no-show
addBooking({ guestId: 'g_21', roomTypeId: 'rt_std', roomId: 'room_103', checkIn: D(-4), checkOut: D(-2), source: 'ota:booking', status: 'cancelled' })
addBooking({ guestId: 'g_22', roomTypeId: 'rt_std', roomId: 'room_107', checkIn: D(-3), checkOut: D(-2), source: 'web', status: 'no-show' })

// Trạng thái buồng hôm nay: phòng vừa trả → bẩn; phòng đang ở sạch; vài phòng đang dọn
for (const n of ['103', '107', '302']) rooms.find((r) => r.number === n)!.status = 'dirty'
for (const n of ['207']) { const r = rooms.find((x) => x.number === n)!; r.status = 'cleaning'; r.cleaningStartedAt = new Date(Date.now() - 12 * 60000).toISOString() }
rooms.find((r) => r.number === '307')!.status = 'dirty'

export const staff: Staff[] = [
  { id: 'u_owner', name: 'Trương Sơn', roleId: 'owner', phone: '0905 000 001', active: true },
  { id: 'u_mgr', name: 'Lê Thị Quản', roleId: 'manager', phone: '0905 000 002', active: true },
  { id: 'u_rec', name: 'Nguyễn Lễ Tân', roleId: 'receptionist', phone: '0905 000 003', active: true },
  { id: 'u_rec2', name: 'Phạm Thu Hằng', roleId: 'receptionist', phone: '0905 000 004', active: true },
  { id: 'u_hk1', name: 'Trần Thị Lan', roleId: 'housekeeping', phone: '0905 000 005', active: true },
  { id: 'u_hk2', name: 'Võ Thị Hoa', roleId: 'housekeeping', phone: '0905 000 006', active: true },
  { id: 'u_acc', name: 'Đỗ Kế Toán', roleId: 'accountant', phone: '0905 000 007', active: true },
  { id: 'u_store', name: 'Hồ Thủ Kho', roleId: 'storekeeper', phone: '0905 000 008', active: true },
]
export const users: User[] = staff.map((s) => ({ id: s.id, name: s.name, roleId: s.roleId }))

// Phân công buồng phòng hôm nay
for (const n of ['103', '107', '207']) rooms.find((r) => r.number === n)!.assignedTo = 'u_hk1'
for (const n of ['302', '307']) rooms.find((r) => r.number === n)!.assignedTo = 'u_hk2'

export const housekeepingLogs: HousekeepingLog[] = [
  { id: 'hk_1', roomId: 'room_207', from: 'dirty', to: 'cleaning', by: 'u_hk1', at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 'hk_2', roomId: 'room_108', from: 'cleaning', to: 'clean', by: 'u_hk1', at: ISO(0, 9) },
  { id: 'hk_3', roomId: 'room_202', from: 'dirty', to: 'cleaning', by: 'u_hk2', at: ISO(0, 8) },
  { id: 'hk_4', roomId: 'room_202', from: 'cleaning', to: 'clean', by: 'u_hk2', at: ISO(0, 8) },
]

export const items: Item[] = [
  { id: 'it_1', sku: 'MB-WATER', name: 'Nước suối 500ml', group: 'minibar', unit: 'chai', cost: 5000, sellPrice: 15000, minStock: 100, stock: 240, perRoomNorm: 2 },
  { id: 'it_2', sku: 'MB-BEER', name: 'Bia Tiger lon', group: 'minibar', unit: 'lon', cost: 15000, sellPrice: 35000, minStock: 48, stock: 36 },
  { id: 'it_3', sku: 'MB-COKE', name: 'Coca-Cola lon', group: 'minibar', unit: 'lon', cost: 9000, sellPrice: 25000, minStock: 48, stock: 90 },
  { id: 'it_4', sku: 'MB-SNACK', name: 'Snack khoai tây', group: 'minibar', unit: 'gói', cost: 12000, sellPrice: 30000, minStock: 30, stock: 52 },
  { id: 'it_5', sku: 'AM-SHAMPOO', name: 'Dầu gội 30ml', group: 'amenity', unit: 'chai', cost: 3500, minStock: 200, stock: 410, perRoomNorm: 2 },
  { id: 'it_6', sku: 'AM-SOAP', name: 'Xà phòng bánh', group: 'amenity', unit: 'bánh', cost: 2500, minStock: 200, stock: 180, perRoomNorm: 2 },
  { id: 'it_7', sku: 'AM-TOOTH', name: 'Bộ bàn chải kem đánh răng', group: 'amenity', unit: 'bộ', cost: 4000, minStock: 200, stock: 320, perRoomNorm: 2 },
  { id: 'it_8', sku: 'LN-TOWEL', name: 'Khăn tắm trắng', group: 'linen', unit: 'cái', cost: 85000, minStock: 60, stock: 96 },
  { id: 'it_9', sku: 'LN-SHEET', name: 'Ga giường 1m6', group: 'linen', unit: 'bộ', cost: 220000, minStock: 30, stock: 44 },
  { id: 'it_10', sku: 'CH-FLOOR', name: 'Nước lau sàn 5L', group: 'chemical', unit: 'can', cost: 120000, minStock: 4, stock: 3 },
  { id: 'it_11', sku: 'CH-GLASS', name: 'Nước lau kính 1L', group: 'chemical', unit: 'chai', cost: 45000, minStock: 6, stock: 9 },
]

export const stockMoves: StockMove[] = [
  { id: 'sm_1', itemId: 'it_1', type: 'in', qty: 240, unitCost: 5000, date: D(-20), by: 'u_store', ref: 'NCC Nước Phú Yên', note: 'PN-0021' },
  { id: 'sm_2', itemId: 'it_2', type: 'in', qty: 96, unitCost: 15000, date: D(-18), by: 'u_store', ref: 'Đại lý bia Tuy Hoà', note: 'PN-0022' },
  { id: 'sm_3', itemId: 'it_2', type: 'out', qty: 60, date: D(-5), by: 'u_hk1', ref: 'Minibar các phòng', note: 'Tổng hợp tuần' },
  { id: 'sm_4', itemId: 'it_5', type: 'in', qty: 500, unitCost: 3500, date: D(-25), by: 'u_store', ref: 'Amenities VN' },
  { id: 'sm_5', itemId: 'it_5', type: 'out', qty: 90, date: D(-3), by: 'u_hk2', ref: 'Buồng phòng tầng 2-3' },
  { id: 'sm_6', itemId: 'it_10', type: 'out', qty: 2, date: D(-2), by: 'u_hk1', ref: 'Vệ sinh sảnh' },
  { id: 'sm_7', itemId: 'it_8', type: 'count', qty: 96, date: D(-7), by: 'u_store', note: 'Kiểm kê tháng: khớp' },
]

export const shifts: Shift[] = []
export const attendance: Attendance[] = []
for (let d = -7; d <= 7; d++) {
  const date = D(d)
  const plan: [string, Shift['shift']][] = [['u_rec', d % 2 ? 'morning' : 'afternoon'], ['u_rec2', d % 2 ? 'afternoon' : 'morning'], ['u_hk1', 'morning'], ['u_hk2', 'morning'], ['u_mgr', 'morning'], ['u_acc', 'morning'], ['u_store', 'morning']]
  for (const [staffId, shift] of plan) {
    shifts.push({ id: `sh_${staffId}_${date}`, staffId, date, shift })
    if (d < 0 || (d === 0 && shift === 'morning')) {
      const late = rnd() > 0.85
      attendance.push({ id: `at_${staffId}_${date}`, staffId, date, checkIn: shift === 'morning' ? (late ? '06:' + rint(10, 40) : '05:5' + rint(0, 9)) : '13:5' + rint(0, 9), checkOut: d < 0 ? (shift === 'morning' ? '14:0' + rint(0, 9) : '22:0' + rint(0, 9)) : undefined, flagged: late && rnd() > 0.5, note: late ? 'Chấm công ngoài bán kính' : undefined })
    }
  }
}

export const declarations: Declaration[] = [
  { id: 'dc_1', date: D(-1), bookingIds: bookings.filter((b) => b.checkIn === D(-1) && b.status === 'checked-in').map((b) => b.id), guestIds: ['g_2','g_3','g_5','g_7','g_9'], foreign: false, exportedAt: ISO(-1, 22), by: 'u_rec' },
]

export const invoices: Invoice[] = []
let invSeq = 1
for (const b of bookings.filter((x) => x.status === 'checked-out').slice(0, 25)) {
  const lines = folioLines.filter((f) => f.bookingId === b.id)
  const sub = lines.reduce((x, f) => x + f.amount, 0)
  const g = guests.find((x) => x.id === b.guestId)!
  const inv: Invoice = { id: `inv_${invSeq}`, number: `1C26TTL-${String(invSeq).padStart(6, '0')}`, bookingIds: [b.id], buyer: g.company ? { ...g.company } : { name: g.name, address: g.address }, lineIds: lines.map((l) => l.id), subtotal: sub, vatPct: 8, total: Math.round(sub * 1.08), status: 'issued', cqtCode: `M1-26-${rint(10000, 99999)}-${rint(10000000000, 99999999999)}`, issuedAt: ISO(Number(b.checkOut.slice(8, 10)) - Number(T.slice(8, 10)), 12), createdAt: ISO(-1) }
  lines.forEach((l) => (l.invoiceId = inv.id))
  invoices.push(inv)
  invSeq++
}

export const debts: Debt[] = [
  { id: 'debt_1', partyType: 'group', partyName: 'Công ty CP Công nghệ ABC', bookingIds: bookings.filter((b) => b.groupId === 'grp_1').map((b) => b.id), amount: 8400000, paid: 6000000, dueDate: D(10), createdAt: ISO(-12) },
  { id: 'debt_2', partyType: 'agent', partyName: 'Công ty TNHH Du lịch Xanh Phú Yên', bookingIds: bookings.filter((b) => b.groupId === 'grp_2').map((b) => b.id), amount: 7200000, paid: 4000000, dueDate: D(20), createdAt: ISO(-6) },
  { id: 'debt_3', partyType: 'ota', partyName: 'Agoda (thu hộ tháng trước)', bookingIds: bookings.filter((b) => b.source === 'ota:agoda' && b.status === 'checked-out').slice(0, 6).map((b) => b.id), amount: 9800000, paid: 0, dueDate: D(-3), createdAt: ISO(-20) },
]

export const expenses: Expense[] = []
for (let d = -30; d <= 0; d++) {
  if (d % 7 === 0) expenses.push({ id: `ex_${d}_1`, date: D(d), category: 'Điện nước', amount: rint(1800000, 2600000) })
  if (d % 10 === 0) expenses.push({ id: `ex_${d}_2`, date: D(d), category: 'Giặt là', amount: rint(900000, 1500000) })
  if (d === -15) expenses.push({ id: `ex_${d}_3`, date: D(d), category: 'Lương', amount: 48000000 })
  if (d % 5 === 0) expenses.push({ id: `ex_${d}_4`, date: D(d), category: 'Marketing', amount: rint(300000, 900000), note: 'ZNS, quảng cáo Facebook' })
}

export const promotions: Promotion[] = [
  { id: 'pr_1', name: 'Ở 3 đêm giảm 15%', type: 'percent', value: 15, description: 'Áp dụng cho booking web từ 3 đêm, ngày thường', from: D(-10), to: D(60), minStay: 3, channels: ['web', 'front-desk'], maxUses: 100, used: 12, stackable: false, active: true },
  { id: 'pr_2', name: 'Đặt sớm 30 ngày -10%', type: 'percent', value: 10, description: 'Đặt trước ngày đến ≥ 30 ngày', from: D(0), to: D(120), minStay: 1, channels: ['web'], maxUses: 200, used: 3, stackable: false, active: true },
  { id: 'pr_3', name: 'Tặng bữa sáng cuối tuần', type: 'gift', value: 0, description: 'Tặng 2 suất ăn sáng cho khách đặt Deluxe cuối tuần', from: D(-30), to: D(30), minStay: 1, channels: ['web', 'front-desk'], maxUses: 50, used: 50, stackable: true, active: false },
]

export const combos: Combo[] = [
  { id: 'cb_1', name: 'Phòng Deluxe 2 đêm + Tour Gành Đá Đĩa – Bãi Xép', roomTypeId: 'rt_dlx', nights: 2, services: [{ name: 'Tour Gành Đá Đĩa – Bãi Xép (1 ngày, 2 khách)', price: 1200000 }, { name: 'Đưa đón sân bay Tuy Hoà', price: 300000 }], comboPrice: 2990000, description: 'Tiết kiệm 310.000đ so với mua lẻ. Bao gồm ăn sáng.', image: img('combo-ganhdadia'), active: true },
  { id: 'cb_2', name: 'Family 3 đêm + Vé Vịnh Vũng Rô + SIM 4G', roomTypeId: 'rt_fam', nights: 3, services: [{ name: 'Vé cano Vịnh Vũng Rô (4 khách)', price: 1600000 }, { name: 'SIM 4G 7 ngày', price: 150000 }], comboPrice: 5690000, description: 'Dành cho gia đình 4 người, tiết kiệm 260.000đ.', image: img('combo-vungro'), active: true },
]

export const coupons: Coupon[] = [
  { id: 'cp_1', code: 'TAVINA10', type: 'percent', value: 10, maxUses: 100, used: 24, from: D(-30), to: D(60), channels: ['web'], active: true },
  { id: 'cp_2', code: 'HELLO200', type: 'amount', value: 200000, maxUses: 50, used: 50, from: D(-30), to: D(30), channels: ['web'], active: true },
  { id: 'cp_3', code: 'TET2027', type: 'percent', value: 5, maxUses: 500, used: 0, from: D(90), to: D(120), channels: ['web', 'front-desk'], active: true },
  { id: 'cp_4', code: 'KHACHMOI250', type: 'amount', value: 250000, maxUses: 300, used: 41, from: D(-10), to: D(80), channels: ['web'], active: true, service: 'hotel', title: 'Giảm 250.000đ cho lần đặt phòng đầu tiên', note: 'Dành cho khách mới đặt trên web' },
  { id: 'cp_5', code: 'BAYXA75', type: 'amount', value: 75000, maxUses: 500, used: 88, from: D(-10), to: D(80), channels: ['web'], active: true, service: 'flight', title: 'Giảm đến 75.000đ cho vé máy bay', note: 'Áp dụng khi gửi yêu cầu đặt vé' },
  { id: 'cp_6', code: 'VUICHOI10', type: 'percent', value: 10, maxUses: 300, used: 17, from: D(-10), to: D(80), channels: ['web'], active: true, service: 'activity', title: 'Giảm 10% vé tham quan & vui chơi', note: 'Gành Đá Đĩa, lặn Hòn Chùa, cano Vũng Rô' },
  { id: 'cp_7', code: 'DONSANBAY12', type: 'percent', value: 12, maxUses: 200, used: 9, from: D(-10), to: D(80), channels: ['web'], active: true, service: 'bus', title: 'Giảm 12% xe đưa đón sân bay Tuy Hoà', note: 'Xe 4–16 chỗ, đón tại cửa đến' },
  { id: 'cp_8', code: 'TOURPY8', type: 'percent', value: 8, maxUses: 150, used: 22, from: D(-10), to: D(80), channels: ['web'], active: true, service: 'tour', title: 'Giảm 8% tour Phú Yên 1–3 ngày', note: 'Tour ghép và tour riêng' },
  { id: 'cp_9', code: 'ESIM15', type: 'percent', value: 15, maxUses: 400, used: 63, from: D(-10), to: D(80), channels: ['web'], active: true, service: 'sim', title: 'Giảm 15% SIM & eSIM du lịch', note: 'Nhận mã QR trong 5 phút' },
]

export const campaigns: Campaign[] = [
  { id: 'cm_1', name: 'Mời khách Vàng quay lại mùa thu', channel: 'zalo', segment: { tiers: ['gold', 'silver'], lastStayBeforeDays: 60 }, template: 'Chào {ten}, Thanh Long gửi bạn mã {ma} giảm 10% cho kỳ nghỉ mùa thu Phú Yên.', couponCode: 'TAVINA10', recipients: 86, opened: 41, bookings: 7, cost: 68800, createdAt: ISO(-20) },
]

export const conversations: Conversation[] = [
  { id: 'cv_1', channel: 'zalo', guestId: 'g_10', contactName: 'Ngô Gia Bảo', contactRef: guests[9].phone, status: 'new', updatedAt: new Date(Date.now() - 8 * 60000).toISOString(),
    messages: [ { id: 'm1', from: 'guest', text: 'Chào khách sạn, mình đến tầm 11h trưa nay có nhận phòng sớm được không ạ?', at: new Date(Date.now() - 8 * 60000).toISOString() } ] },
  { id: 'cv_2', channel: 'messenger', contactName: 'Thu Hiền', contactRef: 'fb_10293', status: 'in-progress', assignedTo: 'u_rec', updatedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    messages: [ { id: 'm2', from: 'guest', text: 'Cho mình hỏi phòng Family cuối tuần sau còn không, 2 người lớn 2 trẻ em?', at: new Date(Date.now() - 50 * 60000).toISOString() }, { id: 'm3', from: 'staff', text: 'Dạ còn 2 phòng Family ạ, giá 1.610.000đ/đêm cuối tuần. Chị cho em xin SĐT để giữ phòng nhé.', at: new Date(Date.now() - 45 * 60000).toISOString() } ] },
  { id: 'cv_3', channel: 'email', guestId: 'g_25', contactName: 'John Miller', contactRef: 'john.miller@example.com', status: 'new', updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    messages: [ { id: 'm4', from: 'guest', text: 'Hi, could you arrange an airport pickup for my wife arriving tomorrow at 15:40 (VN flight from HCMC)? Room 206.', at: new Date(Date.now() - 3 * 3600000).toISOString() } ] },
  { id: 'cv_4', channel: 'phone', guestId: 'g_26', contactName: 'Chị Hạnh — Du lịch Xanh', contactRef: '0257 3 777 666', status: 'done', assignedTo: 'u_rec2', updatedAt: ISO(-1, 15),
    messages: [ { id: 'm5', from: 'staff', text: 'Ghi chú cuộc gọi: xác nhận đoàn 3 phòng Family ngày ' + D(20) + ', cọc đã chuyển 4tr.', at: ISO(-1, 15) } ] },
]

export const leads: Lead[] = [
  { id: 'ld_1', service: 'flight', subcategory: 'Nội địa', name: 'Lê Hoàng', phone: '0912 345 678', email: 'lehoang@gmail.com', need: '2 vé HAN–TBB ngày ' + D(14) + ', về ' + D(18) + ', ưu tiên bay sáng', travelDate: D(14), pax: 2, status: 'new', createdAt: ISO(0, 8) },
  { id: 'ld_2', service: 'visa', subcategory: 'Visa Hàn Quốc', name: 'Trần Mỹ Linh', phone: '0987 654 321', need: 'Visa du lịch Hàn Quốc 5 năm, hộ chiếu còn hạn 3 năm', travelDate: D(45), pax: 1, status: 'contacted', assignedTo: 'u_mgr', createdAt: ISO(-1, 14) },
  { id: 'ld_3', service: 'tour', subcategory: 'Tour Phú Yên', name: 'Phạm Văn Đức', phone: '0933 111 222', need: 'Tour Phú Yên 3N2Đ cho gia đình 6 người, có trẻ em', travelDate: D(21), pax: 6, status: 'quoted', assignedTo: 'u_mgr', note: 'Đã gửi báo giá 14,5tr', createdAt: ISO(-2, 10) },
  { id: 'ld_4', service: 'sim', subcategory: 'eSIM Nhật Bản', name: 'Nguyễn An', phone: '0909 000 111', need: 'eSIM Nhật 10 ngày, 2 người', travelDate: D(7), pax: 2, status: 'won', assignedTo: 'u_rec2', createdAt: ISO(-4, 9) },
  { id: 'ld_5', service: 'bus', subcategory: 'Đưa đón sân bay', name: 'Hồ Thị Thu', phone: '0978 222 333', need: 'Xe 7 chỗ đón sân bay Tuy Hoà về KS Thanh Long ' + D(2), travelDate: D(2), pax: 4, status: 'new', createdAt: ISO(0, 7) },
]

export const auditLogs: AuditLog[] = [
  { id: 'al_1', at: ISO(0, 7), userId: 'u_rec', userName: 'Nguyễn Lễ Tân', action: 'Tạo booking', entity: 'booking', entityId: bookings.find((b) => b.discountStatus === 'pending')?.id, after: { discountPct: 10, status: 'pending' } },
  { id: 'al_2', at: ISO(-1, 16), userId: 'u_mgr', userName: 'Lê Thị Quản', action: 'Sửa gói giá', entity: 'ratePlan', entityId: 'rp_web', before: { rt_dlx: 850000 }, after: { rt_dlx: 900000 } },
  { id: 'al_3', at: ISO(-1, 10), userId: 'system', userName: 'Channel manager', action: 'Nhận booking OTA', entity: 'booking', entityId: 'bk_overbooked', after: { overbooked: true } },
  { id: 'al_4', at: ISO(-2, 9), userId: 'u_owner', userName: 'Trương Sơn', action: 'Cập nhật quyền', entity: 'role', entityId: 'receptionist', before: { rates: ['view'] }, after: { rates: ['view'] } },
]

export const syncLogs: SyncLog[] = [
  { id: 'sl_1', at: new Date(Date.now() - 2 * 60000).toISOString(), channel: 'ota:booking', type: 'push-availability', status: 'ok', detail: 'Standard ' + D(1) + ': tồn 0; Deluxe: 3; Family: 2' },
  { id: 'sl_2', at: new Date(Date.now() - 2 * 60000).toISOString(), channel: 'ota:agoda', type: 'push-availability', status: 'ok', detail: 'Standard ' + D(1) + ': tồn 0' },
  { id: 'sl_3', at: new Date(Date.now() - 6 * 60000).toISOString(), channel: 'ota:traveloka', type: 'push-rate', status: 'retry', detail: 'Timeout 30s, thử lại lần 2/5' },
  { id: 'sl_4', at: ISO(-1, 10), channel: 'ota:agoda', type: 'pull-booking', status: 'ok', detail: 'Booking mới #' + rint(1000000000, 9999999999) + ' — Standard ' + D(1) + ' (OVERBOOKED)' },
  { id: 'sl_5', at: ISO(-1, 8), channel: 'ota:booking', type: 'push-rate', status: 'failed', detail: 'Mapping hạng phòng Family chưa khai báo trên kênh' },
]

export const channelConfigs: ChannelConfig[] = [
  { channel: 'ota:booking', enabled: true, commissionPct: 15, priceMultiplier: 1.1, roomTypeMapping: { rt_std: 'BK-STD-01', rt_dlx: 'BK-DLX-02', rt_fam: '' }, buffer: { rt_std: 1, rt_dlx: 0, rt_fam: 0 }, closedDates: [] },
  { channel: 'ota:agoda', enabled: true, commissionPct: 17, priceMultiplier: 1.1, roomTypeMapping: { rt_std: 'AG-1001', rt_dlx: 'AG-1002', rt_fam: 'AG-1003' }, buffer: { rt_std: 1, rt_dlx: 0, rt_fam: 0 }, closedDates: [] },
  { channel: 'ota:traveloka', enabled: true, commissionPct: 15, priceMultiplier: 1.1, roomTypeMapping: { rt_std: 'TVLK-S', rt_dlx: 'TVLK-D', rt_fam: 'TVLK-F' }, buffer: { rt_std: 0, rt_dlx: 0, rt_fam: 0 }, closedDates: [] },
  { channel: 'partner', enabled: true, commissionPct: 10, priceMultiplier: 1, roomTypeMapping: {}, buffer: {}, closedDates: [] },
  { channel: 'web', enabled: true, commissionPct: 0, priceMultiplier: 1, roomTypeMapping: {}, buffer: {}, closedDates: [] },
  { channel: 'front-desk', enabled: true, commissionPct: 0, priceMultiplier: 1, roomTypeMapping: {}, buffer: {}, closedDates: [] },
]

export const partnerHotels: PartnerHotel[] = [
  { id: 'ph_1', name: 'Sala Grand Tuy Hoà', city: 'Phú Yên', area: 'Tuy Hoà', stars: 4, rating: 8.6, reviews: 412, priceFrom: 1250000, image: img('ph1'), amenities: ['Hồ bơi', 'Bữa sáng', 'Gym'], freeCancel: true, description: 'Khách sạn 4 sao ven biển, hồ bơi tầng thượng.' },
  { id: 'ph_2', name: 'Stelia Beach Resort', city: 'Phú Yên', area: 'Bãi Xép', stars: 5, rating: 9.1, reviews: 268, priceFrom: 3200000, image: img('ph2'), amenities: ['Bãi biển riêng', 'Spa', 'Hồ bơi'], freeCancel: false, description: 'Resort biệt lập trên bãi biển Bãi Xép.' },
  { id: 'ph_3', name: 'Homestay Gành Đá Đĩa', city: 'Phú Yên', area: 'Tuy An', stars: 2, rating: 8.9, reviews: 97, priceFrom: 450000, image: img('ph3'), amenities: ['Bếp chung', 'Xe đạp'], freeCancel: true, description: 'Homestay gần Gành Đá Đĩa, chủ nhà thân thiện.' },
  { id: 'ph_4', name: 'Quy Nhơn Seaside Hotel', city: 'Quy Nhơn', area: 'Trung tâm', stars: 3, rating: 8.2, reviews: 530, priceFrom: 680000, image: img('ph4'), amenities: ['Bữa sáng', 'Wifi'], freeCancel: true, description: 'Đối diện biển Quy Nhơn, gần quảng trường.' },
  { id: 'ph_5', name: 'Nha Trang Horizon', city: 'Nha Trang', area: 'Trần Phú', stars: 4, rating: 8.4, reviews: 1203, priceFrom: 1100000, image: img('ph5'), amenities: ['Hồ bơi', 'Gym', 'Bữa sáng'], freeCancel: true, description: 'Khách sạn cao tầng view vịnh Nha Trang.' },
  { id: 'ph_6', name: 'Đà Lạt Pine Villa', city: 'Đà Lạt', area: 'Hồ Xuân Hương', stars: 3, rating: 8.7, reviews: 342, priceFrom: 890000, image: img('ph6'), amenities: ['Lò sưởi', 'Vườn', 'Bữa sáng'], freeCancel: true, description: 'Villa phong cách Pháp giữa rừng thông.' },
]

export const cms: CmsContent = {
  heroTitle: 'Phú Yên, đi là nhớ.',
  heroSubtitle: 'TAVINA lo trọn chuyến đi: vé, phòng, xe, tour và visa — một nơi, một người phụ trách.',
  banners: [
    { id: 'bn_1', title: 'Ở 3 đêm giảm 15%', subtitle: 'Khách sạn Thanh Long, áp dụng đến hết tháng', image: img('bn1', 1200, 600), link: '/khach-san/thanh-long' },
    { id: 'bn_2', title: 'Combo Deluxe + Tour Gành Đá Đĩa', subtitle: 'Từ 2.990.000đ cho 2 khách', image: img('bn2', 1200, 600), link: '/khuyen-mai' },
  ],
  posts: [
    { id: 'po_1', title: 'Một ngày ở Gành Đá Đĩa và Bãi Xép', excerpt: 'Lịch trình gọn cho người chỉ có một ngày, từ 6h sáng đến hoàng hôn.', image: img('po1', 800, 500), date: D(-12) },
    { id: 'po_2', title: 'Ăn gì ở Tuy Hoà: 7 quán người địa phương hay đi', excerpt: 'Mắt cá ngừ đại dương, bánh canh hẹ, sò huyết đầm Ô Loan…', image: img('po2', 800, 500), date: D(-25) },
    { id: 'po_3', title: 'Mùa nào đẹp nhất để đến Phú Yên?', excerpt: 'Tháng 1–8 biển êm; tháng 9–12 mưa nhưng vắng và rẻ.', image: img('po3', 800, 500), date: D(-40) },
  ],
}

// Tích điểm/hạng theo lịch sử
for (const g of guests) {
  const spent = payments.filter((p) => bookings.find((b) => b.id === p.bookingId)?.guestId === g.id).reduce((x, p) => x + p.amount, 0)
  g.points = Math.floor(spent / settings.loyalty.pointsPerVnd)
  g.tier = g.points >= settings.loyalty.goldPoints ? 'gold' : g.points >= settings.loyalty.silverPoints ? 'silver' : 'standard'
}
guests.find((g) => g.id === 'g_26')!.tier = 'gold'

export const seed = {
  roomTypes, rooms, settings, ratePlans, guests, groups, bookings, folioLines, payments, staff, users, housekeepingLogs, items, stockMoves,
  shifts, attendance, declarations, invoices, debts, expenses, promotions, combos, coupons, campaigns, conversations, leads, auditLogs, syncLogs,
  channelConfigs, partnerHotels, cms, roles: DEFAULT_ROLES, bookingSeq: seq, invoiceSeq: invSeq,
}
export type SeedData = typeof seed
void toISODate
