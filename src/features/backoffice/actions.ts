// Hành động riêng cho các module hậu cần (hoá đơn, công nợ, khai báo, kho, chấm công, CRM, inbox, lead, CMS, cài đặt, ưu đãi).
// Không sửa store.ts — mọi mutation đi qua useStore.setState / getState().
import { useStore, type StoreState } from '@/store'
import type {
  Attendance, Campaign, Combo, Conversation, Coupon, Debt, Declaration, Expense, Guest, Invoice, Item, Lead, Message, Promotion,
  Role, RoleId, Module, Action, Settings, Shift, ShiftCode, Staff, CmsContent, User, ConversationChannel,
} from '@/types'
import { uid, nowISO, invoiceNumber } from '@/lib/ids'
import { today, addDaysISO } from '@/lib/format'
import { DEFAULT_ROLES } from '@/lib/permissions'

const S = () => useStore.getState()
const set = useStore.setState

// ---------- Tiện ích chung ----------
/** Tải file CSV UTF-8 có BOM (Excel mở đúng tiếng Việt). */
export function downloadCsv(filename: string, rows: (string | number | undefined | null)[][]) {
  const esc = (v: string | number | undefined | null) => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const text = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
  downloadBlob(filename, new Blob([text], { type: 'text/csv;charset=utf-8' }))
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** In một khung HTML (dùng cho "PDF"). */
export function printHtml(title: string, innerHtml: string) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) { S().toast('Trình duyệt chặn cửa sổ in — cho phép popup rồi thử lại', 'warn'); return }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:system-ui,sans-serif;color:#1c1917;padding:24px;font-size:13px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #d6d3d1;padding:6px 8px;text-align:left}th{background:#f5f5f4}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 6px}.tnum{font-variant-numeric:tabular-nums}.r{text-align:right}.muted{color:#78716c}</style>
  </head><body>${innerHtml}<script>window.onload=function(){window.print()}</script></body></html>`)
  w.document.close()
}

export const normPhone = (p: string) => p.replace(/[\s.\-()]/g, '').replace(/^\+84/, '0')

function patchItem<K extends keyof StoreState>(key: K, id: string, fn: (x: any) => any) {
  set((s) => ({ [key]: (s[key] as any[]).map((x) => (x.id === id ? fn(x) : x)) }) as any)
}

// ---------- FR-10 Hoá đơn ----------
export function issueInvoice(input: { bookingIds: string[]; lineIds: string[]; buyer: Invoice['buyer']; vatPct: number; simulateFail?: boolean; note?: string; saveCompanyToGuestId?: string }) {
  const s = S()
  const lines = s.folioLines.filter((l) => input.lineIds.includes(l.id))
  if (!lines.length) return { error: 'Chưa chọn dòng folio nào' }
  if (lines.some((l) => l.invoiceId)) return { error: 'Có dòng đã nằm trong hoá đơn khác' }
  if (!input.buyer.name.trim()) return { error: 'Thiếu tên người mua' }
  const subtotal = lines.reduce((x, l) => x + l.amount, 0)
  const total = Math.round(subtotal * (1 + input.vatPct / 100))
  const ok = !input.simulateFail
  const inv: Invoice = {
    id: uid('inv'), number: ok ? invoiceNumber(s.invoiceSeq) : '', bookingIds: input.bookingIds, buyer: input.buyer, lineIds: input.lineIds,
    subtotal, vatPct: input.vatPct, total, status: ok ? 'issued' : 'pending',
    cqtCode: ok ? fakeCqt() : undefined, issuedAt: ok ? nowISO() : undefined, createdAt: nowISO(), note: input.note ?? (ok ? undefined : 'NCC HĐĐT lỗi: timeout 30s — sẽ tự thử lại'),
  }
  set((st) => ({
    invoices: [inv, ...st.invoices],
    invoiceSeq: ok ? st.invoiceSeq + 1 : st.invoiceSeq,
    folioLines: st.folioLines.map((l) => (input.lineIds.includes(l.id) ? { ...l, invoiceId: inv.id } : l)),
    guests: input.saveCompanyToGuestId && input.buyer.taxCode
      ? st.guests.map((g) => (g.id === input.saveCompanyToGuestId ? { ...g, company: { name: input.buyer.name, taxCode: input.buyer.taxCode ?? '', address: input.buyer.address ?? '', email: input.buyer.email } } : g))
      : st.guests,
  }))
  s.audit(ok ? 'Phát hành hoá đơn' : 'Hoá đơn chờ phát hành (NCC lỗi)', 'invoice', inv.id, undefined, { number: inv.number, total, bookings: input.bookingIds.length, lines: lines.length })
  return { invoice: inv }
}

const fakeCqt = () => `M1-26-${Math.floor(10000 + Math.random() * 89999)}-${Math.floor(1e10 + Math.random() * 8.9e10)}`

export function retryInvoice(id: string) {
  const s = S()
  const inv = s.invoices.find((i) => i.id === id)
  if (!inv || inv.status !== 'pending') return
  const number = invoiceNumber(s.invoiceSeq)
  set((st) => ({ invoiceSeq: st.invoiceSeq + 1, invoices: st.invoices.map((i) => (i.id === id ? { ...i, status: 'issued', number, cqtCode: fakeCqt(), issuedAt: nowISO(), note: undefined } : i)) }))
  s.audit('Thử lại phát hành hoá đơn', 'invoice', id, { status: 'pending' }, { status: 'issued', number })
  s.toast(`Đã phát hành ${number}`)
}

/** Điều chỉnh/thay thế: tạo hoá đơn mới tham chiếu hoá đơn cũ, đổi trạng thái cũ (RULE-07). */
export function adjustInvoice(id: string, mode: 'adjusted' | 'replaced', reason: string, newTotal?: number) {
  const s = S()
  const old = s.invoices.find((i) => i.id === id)
  if (!old || old.status !== 'issued') return { error: 'Chỉ điều chỉnh/thay thế hoá đơn đã phát hành' }
  const subtotal = newTotal !== undefined ? Math.round(newTotal / (1 + old.vatPct / 100)) : old.subtotal
  const inv: Invoice = {
    ...old, id: uid('inv'), number: invoiceNumber(s.invoiceSeq), subtotal, total: newTotal ?? old.total, status: 'issued', cqtCode: fakeCqt(), issuedAt: nowISO(), createdAt: nowISO(),
    note: `${mode === 'adjusted' ? 'Điều chỉnh' : 'Thay thế'} cho ${old.number}: ${reason}`,
  }
  set((st) => ({
    invoiceSeq: st.invoiceSeq + 1,
    invoices: [inv, ...st.invoices.map((i) => (i.id === id ? { ...i, status: mode, note: `${mode === 'adjusted' ? 'Đã điều chỉnh bởi' : 'Đã thay thế bởi'} ${inv.number}` } : i))],
    folioLines: mode === 'replaced' ? st.folioLines.map((l) => (l.invoiceId === id ? { ...l, invoiceId: inv.id } : l)) : st.folioLines,
  }))
  s.audit(mode === 'adjusted' ? 'Điều chỉnh hoá đơn' : 'Thay thế hoá đơn', 'invoice', id, { number: old.number, total: old.total, status: 'issued' }, { number: inv.number, total: inv.total, status: mode })
  return { invoice: inv }
}

// ---------- FR-10 Công nợ ----------
export function recordDebtPayment(debtId: string, amount: number, note?: string) {
  const s = S()
  const d = s.debts.find((x) => x.id === debtId)
  if (!d) return { error: 'Không tìm thấy công nợ' }
  if (amount <= 0) return { error: 'Số tiền phải > 0' }
  const remaining = d.amount - d.paid
  const prepaid = amount > remaining
  patchItem('debts', debtId, (x: Debt) => ({ ...x, paid: x.paid + amount }))
  s.audit('Ghi thanh toán công nợ', 'debt', debtId, { paid: d.paid }, { paid: d.paid + amount, prepaid: prepaid ? amount - remaining : 0, note })
  return { prepaid: prepaid ? amount - remaining : 0 }
}

export function addDebt(input: Omit<Debt, 'id' | 'createdAt' | 'paid'>) {
  const s = S()
  const d: Debt = { ...input, id: uid('debt'), paid: 0, createdAt: nowISO() }
  set((st) => ({ debts: [d, ...st.debts] }))
  s.audit('Tạo công nợ', 'debt', d.id, undefined, { partyName: d.partyName, amount: d.amount })
  return d
}

/** Ghi công nợ từ booking trả sau: tạo payment method 'debt' phần còn thiếu + dòng công nợ. */
export function debtFromBooking(bookingId: string, partyType: Debt['partyType'], partyName: string, dueDate: string) {
  const s = S()
  const b = s.bookings.find((x) => x.id === bookingId)
  if (!b) return { error: 'Không tìm thấy booking' }
  const total = s.folioLines.filter((f) => f.bookingId === bookingId).reduce((x, f) => x + f.amount, 0)
  const paid = s.payments.filter((p) => p.bookingId === bookingId).reduce((x, p) => x + p.amount, 0)
  const due = total - paid
  if (due <= 0) return { error: 'Booking không còn số dư để ghi nợ' }
  s.addPayment({ bookingId, date: today(), method: 'debt', amount: due, note: `Trả sau — ${partyName}` })
  const d = addDebt({ partyType, partyName, bookingIds: [bookingId], amount: due, dueDate })
  return { debt: d }
}

// ---------- FR-09 Khai báo lưu trú ----------
export function updateGuest(id: string, patch: Partial<Guest>, auditLabel = 'Cập nhật hồ sơ khách') {
  const s = S()
  const g = s.guests.find((x) => x.id === id)
  if (!g) return
  patchItem('guests', id, (x: Guest) => ({ ...x, ...patch }))
  const before: Record<string, unknown> = {}, after: Record<string, unknown> = {}
  for (const k of Object.keys(patch) as (keyof Guest)[]) { before[k] = g[k]; after[k] = patch[k] }
  s.audit(auditLabel, 'guest', id, before, after)
}

export function createDeclaration(input: { date: string; bookingIds: string[]; guestIds: string[]; foreign: boolean }) {
  const s = S()
  const d: Declaration = { id: uid('dc'), ...input, exportedAt: nowISO(), by: s.currentUser.id }
  set((st) => ({
    declarations: [d, ...st.declarations],
    bookings: st.bookings.map((b) => (input.bookingIds.includes(b.id) ? { ...b, declaredAt: nowISO() } : b)),
  }))
  s.audit('Xuất khai báo lưu trú', 'declaration', d.id, undefined, { date: input.date, guests: input.guestIds.length, foreign: input.foreign })
  return d
}

export function submitDeclarationPortal(id: string) {
  const s = S()
  const code = `DVC-${today().replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 899999)}`
  patchItem('declarations', id, (d: Declaration) => ({ ...d, receiptCode: code }))
  s.audit('Gửi cổng dịch vụ công (mô phỏng)', 'declaration', id, undefined, { receiptCode: code })
  return code
}

// ---------- FR-07 Kho ----------
export function upsertItem(item: Partial<Item> & Pick<Item, 'name' | 'group' | 'unit'>) {
  const s = S()
  if (item.id) {
    const old = s.items.find((i) => i.id === item.id)
    patchItem('items', item.id, (x: Item) => ({ ...x, ...item }))
    s.audit('Sửa vật tư', 'item', item.id, old, item)
    return item.id
  }
  const created: Item = { id: uid('it'), sku: item.sku ?? `SKU-${Date.now().toString(36).toUpperCase()}`, cost: 0, minStock: 0, stock: 0, ...item } as Item
  set((st) => ({ items: [...st.items, created] }))
  s.audit('Thêm vật tư', 'item', created.id, undefined, { sku: created.sku, name: created.name })
  return created.id
}

export function addExpense(e: Omit<Expense, 'id'>) {
  set((st) => ({ expenses: [{ ...e, id: uid('ex') }, ...st.expenses] }))
}

// ---------- FR-08 Chấm công ----------
export function setShift(staffId: string, date: string, shift: ShiftCode | '') {
  const s = S()
  const existing = s.shifts.find((x) => x.staffId === staffId && x.date === date)
  if (!shift) {
    if (existing) set((st) => ({ shifts: st.shifts.filter((x) => x.id !== existing.id) }))
  } else if (existing) {
    patchItem('shifts', existing.id, (x: Shift) => ({ ...x, shift }))
  } else {
    set((st) => ({ shifts: [...st.shifts, { id: uid('sh'), staffId, date, shift }] }))
  }
  s.audit('Phân ca', 'shift', `${staffId}/${date}`, { shift: existing?.shift }, { shift: shift || null })
}

const hhmm = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

export function clockIn(staffId: string, outsideGps: boolean) {
  const s = S()
  const date = today()
  if (s.attendance.some((a) => a.staffId === staffId && a.date === date && a.checkIn)) return { error: 'Hôm nay đã chấm vào rồi' }
  const a: Attendance = { id: uid('at'), staffId, date, checkIn: hhmm(), flagged: outsideGps || undefined, note: outsideGps ? 'Chấm công ngoài bán kính GPS — chờ duyệt' : undefined }
  set((st) => ({ attendance: [...st.attendance, a] }))
  s.audit('Chấm công vào', 'attendance', a.id, undefined, { checkIn: a.checkIn, flagged: !!a.flagged })
  return { attendance: a }
}

export function clockOut(staffId: string, outsideGps: boolean) {
  const s = S()
  const date = today()
  const a = s.attendance.find((x) => x.staffId === staffId && x.date === date && x.checkIn)
  if (!a) return { error: 'Chưa chấm vào hôm nay' }
  if (a.checkOut) return { error: 'Đã chấm ra rồi' }
  const flagged = a.flagged || outsideGps || undefined
  patchItem('attendance', a.id, (x: Attendance) => ({ ...x, checkOut: hhmm(), flagged, note: outsideGps ? [x.note, 'Chấm ra ngoài bán kính GPS'].filter(Boolean).join('; ') : x.note }))
  s.audit('Chấm công ra', 'attendance', a.id, { checkOut: undefined }, { checkOut: hhmm(), flagged: !!flagged })
  return {}
}

export function editAttendance(id: string, patch: Pick<Attendance, 'checkIn' | 'checkOut'>, reason: string) {
  const s = S()
  const a = s.attendance.find((x) => x.id === id)
  if (!a) return
  patchItem('attendance', id, (x: Attendance) => ({ ...x, ...patch, note: [x.note, `Sửa công: ${reason}`].filter(Boolean).join('; ') }))
  s.audit('Sửa công', 'attendance', id, { checkIn: a.checkIn, checkOut: a.checkOut }, { ...patch, reason })
}

export function approveAttendance(id: string) {
  const s = S()
  patchItem('attendance', id, (x: Attendance) => ({ ...x, flagged: false, note: [x.note, 'Đã duyệt'].filter(Boolean).join('; ') }))
  s.audit('Duyệt chấm công gắn cờ', 'attendance', id, { flagged: true }, { flagged: false })
}

// ---------- FR-12 CRM ----------
export function mergeGuests(keepId: string, removeId: string) {
  const s = S()
  const keep = s.guests.find((g) => g.id === keepId), rm = s.guests.find((g) => g.id === removeId)
  if (!keep || !rm || keepId === removeId) return
  const merged: Guest = {
    ...keep, email: keep.email || rm.email, idNumber: keep.idNumber || rm.idNumber, idType: keep.idType || rm.idType, dob: keep.dob || rm.dob, gender: keep.gender || rm.gender,
    address: keep.address || rm.address, company: keep.company || rm.company, points: keep.points + rm.points, marketingOptIn: keep.marketingOptIn || rm.marketingOptIn,
    notes: [keep.notes, rm.notes].filter(Boolean).join(' | ') || undefined,
  }
  merged.tier = merged.points >= s.settings.loyalty.goldPoints ? 'gold' : merged.points >= s.settings.loyalty.silverPoints ? 'silver' : merged.tier
  set((st) => ({
    guests: st.guests.filter((g) => g.id !== removeId).map((g) => (g.id === keepId ? merged : g)),
    bookings: st.bookings.map((b) => ({ ...b, guestId: b.guestId === removeId ? keepId : b.guestId, occupantIds: b.occupantIds.map((o) => (o === removeId ? keepId : o)) })),
    conversations: st.conversations.map((c) => (c.guestId === removeId ? { ...c, guestId: keepId } : c)),
  }))
  s.audit('Gộp hồ sơ khách trùng', 'guest', keepId, { removed: { id: rm.id, name: rm.name, phone: rm.phone } }, { points: merged.points })
}

/** Ẩn danh hoá theo NĐ 13 — giữ số liệu kế toán (booking/folio/payment vẫn trỏ về id này). */
export function anonymizeGuest(id: string) {
  const s = S()
  const g = s.guests.find((x) => x.id === id)
  if (!g) return
  patchItem('guests', id, (x: Guest) => ({ ...x, name: 'Đã xoá', phone: 'Đã xoá', email: undefined, idNumber: undefined, dob: undefined, address: undefined, company: undefined, notes: 'Ẩn danh hoá theo yêu cầu khách (NĐ 13)', marketingOptIn: false }))
  s.audit('Ẩn danh hoá hồ sơ khách (NĐ 13)', 'guest', id, { name: g.name, phone: g.phone }, { name: 'Đã xoá' })
}

export const CAMPAIGN_UNIT_COST: Record<Campaign['channel'], number> = { zalo: 800, sms: 700, email: 50 }

export function segmentGuests(guests: Guest[], bookings: StoreState['bookings'], segment: Campaign['segment']) {
  const cutoff = segment.lastStayBeforeDays ? addDaysISO(today(), -segment.lastStayBeforeDays) : undefined
  return guests.filter((g) => {
    if (!g.marketingOptIn) return false // AC3: không có ngoại lệ
    if (g.name === 'Đã xoá') return false
    if (segment.tiers.length && !segment.tiers.includes(g.tier)) return false
    if (cutoff) {
      const stays = bookings.filter((b) => b.guestId === g.id && ['checked-out', 'checked-in'].includes(b.status)).map((b) => b.checkOut).sort()
      const last = stays[stays.length - 1]
      if (!last || last > cutoff) return false
    }
    return true
  })
}

export function sendCampaign(input: Omit<Campaign, 'id' | 'createdAt' | 'recipients' | 'opened' | 'bookings' | 'cost'>) {
  const s = S()
  const recipients = segmentGuests(s.guests, s.bookings, input.segment).length
  const cost = recipients * CAMPAIGN_UNIT_COST[input.channel]
  const c: Campaign = { ...input, id: uid('cm'), recipients, opened: Math.round(recipients * 0.45), bookings: Math.round(recipients * 0.08), cost, createdAt: nowISO() }
  set((st) => ({ campaigns: [c, ...st.campaigns] }))
  if (cost > 0) addExpense({ date: today(), category: 'Marketing', amount: cost, note: `Chiến dịch ${c.name} (${input.channel.toUpperCase()}, ${recipients} người)` })
  s.audit('Gửi chiến dịch (mô phỏng)', 'campaign', c.id, undefined, { name: c.name, channel: c.channel, recipients, cost })
  return c
}

// ---------- FR-13 Inbox ----------
export function replyConversation(id: string, text: string) {
  const s = S()
  const m: Message = { id: uid('m'), from: 'staff', text, at: nowISO() }
  patchItem('conversations', id, (c: Conversation) => ({ ...c, messages: [...c.messages, m], status: c.status === 'new' ? 'in-progress' : c.status, assignedTo: c.assignedTo ?? s.currentUser.id, updatedAt: nowISO() }))
}

export function patchConversation(id: string, patch: Partial<Conversation>, auditLabel?: string) {
  const s = S()
  patchItem('conversations', id, (c: Conversation) => ({ ...c, ...patch, updatedAt: nowISO() }))
  if (auditLabel) s.audit(auditLabel, 'conversation', id, undefined, patch)
}

export function createConversation(input: { channel: ConversationChannel; contactName: string; contactRef: string; text: string; from?: Message['from']; guestId?: string; status?: Conversation['status'] }) {
  const s = S()
  const guest = input.guestId ? s.guests.find((g) => g.id === input.guestId) : s.guests.find((g) => normPhone(g.phone) === normPhone(input.contactRef) || (g.email && g.email === input.contactRef))
  const c: Conversation = {
    id: uid('cv'), channel: input.channel, guestId: guest?.id, contactName: input.contactName || guest?.name || input.contactRef, contactRef: input.contactRef,
    messages: [{ id: uid('m'), from: input.from ?? 'guest', text: input.text, at: nowISO() }], status: input.status ?? 'new', assignedTo: input.channel === 'phone' ? s.currentUser.id : undefined, updatedAt: nowISO(),
  }
  set((st) => ({ conversations: [c, ...st.conversations] }))
  return c
}

const DEMO_INCOMING: { channel: ConversationChannel; name: string; ref: string; text: string }[] = [
  { channel: 'zalo', name: 'Minh Tuấn', ref: '0912 888 777', text: 'Cho em hỏi phòng Deluxe cuối tuần này còn không ạ? 2 người lớn.' },
  { channel: 'messenger', name: 'Lan Anh', ref: 'fb_55012', text: 'Khách sạn có đưa đón sân bay không? Giá bao nhiêu?' },
  { channel: 'email', name: 'Sarah Chen', ref: 'sarah.chen@example.com', text: 'Hello, do you have a family room available from the 15th for 3 nights? Breakfast included?' },
  { channel: 'zalo', name: 'Hữu Phước', ref: '0978 333 444', text: 'Mình muốn đặt 2 phòng Standard cho đoàn công ty, có giá đoàn không?' },
  { channel: 'messenger', name: 'Quỳnh Như', ref: 'fb_77301', text: 'Phòng có cho mang thú cưng không ạ?' },
]

export function simulateIncoming() {
  const pick = DEMO_INCOMING[Math.floor(Math.random() * DEMO_INCOMING.length)]
  return createConversation({ channel: pick.channel, contactName: pick.name, contactRef: pick.ref, text: pick.text })
}

// ---------- Leads ----------
export function updateLead(id: string, patch: Partial<Lead>, auditLabel = 'Cập nhật lead') {
  const s = S()
  const old = s.leads.find((l) => l.id === id)
  patchItem('leads', id, (l: Lead) => ({ ...l, ...patch }))
  if (old) s.audit(auditLabel, 'lead', id, { status: old.status, assignedTo: old.assignedTo }, patch)
}

// ---------- CMS ----------
export function updateCms(patch: Partial<CmsContent>) {
  const s = S()
  set((st) => ({ cms: { ...st.cms, ...patch } }))
  s.audit('Cập nhật nội dung web', 'cms', undefined, undefined, Object.keys(patch))
}

// ---------- Cài đặt ----------
export function updateSettings(patch: Partial<Settings>) {
  const s = S()
  const before: Record<string, unknown> = {}
  for (const k of Object.keys(patch) as (keyof Settings)[]) before[k] = s.settings[k]
  set((st) => ({ settings: { ...st.settings, ...patch } }))
  s.audit('Cập nhật cài đặt khách sạn', 'settings', undefined, before, patch)
}

export function upsertStaff(st: Partial<Staff> & Pick<Staff, 'name' | 'roleId' | 'phone'>) {
  const s = S()
  if (st.id) {
    const old = s.staff.find((x) => x.id === st.id)
    set((state) => ({
      staff: state.staff.map((x) => (x.id === st.id ? { ...x, ...st } : x)),
      users: state.users.map((u) => (u.id === st.id ? { ...u, name: st.name, roleId: st.roleId } : u)),
      currentUser: state.currentUser.id === st.id ? { ...state.currentUser, name: st.name, roleId: st.roleId } : state.currentUser,
    }))
    s.audit('Sửa nhân sự', 'staff', st.id, old ? { roleId: old.roleId, active: old.active } : undefined, { roleId: st.roleId, active: st.active })
    return st.id
  }
  const created: Staff = { id: uid('u'), active: true, ...st } as Staff
  const user: User = { id: created.id, name: created.name, roleId: created.roleId }
  set((state) => ({ staff: [...state.staff, created], users: [...state.users, user] }))
  s.audit('Thêm nhân sự', 'staff', created.id, undefined, { name: created.name, roleId: created.roleId })
  return created.id
}

export function setRolePermission(roleId: RoleId, module: Module, action: Action, enabled: boolean) {
  const s = S()
  const role = s.roles.find((r) => r.id === roleId)
  if (!role) return
  const cur = role.permissions[module] ?? []
  const next = enabled ? Array.from(new Set([...cur, action])) : cur.filter((a) => a !== action)
  // Luôn giữ 'view' nếu còn hành động khác
  if (next.length && !next.includes('view')) next.unshift('view')
  const permissions = { ...role.permissions, [module]: next }
  if (!next.length) delete permissions[module]
  set((st) => ({ roles: st.roles.map((r) => (r.id === roleId ? { ...r, permissions } : r)) }))
  s.audit('Cập nhật quyền', 'role', roleId, { [module]: cur }, { [module]: next })
}

export function resetRoles() {
  const s = S()
  set({ roles: JSON.parse(JSON.stringify(DEFAULT_ROLES)) as Role[] })
  s.audit('Khôi phục phân quyền mặc định', 'role', undefined)
}

export function exportStoreJson() {
  const s = S()
  const data = Object.fromEntries(Object.entries(s).filter(([k, v]) => typeof v !== 'function' && k !== 'toasts'))
  downloadBlob(`tavina-demo-${today()}.json`, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
}

export function importStoreJson(text: string) {
  const s = S()
  let data: Record<string, unknown>
  try { data = JSON.parse(text) } catch { return { error: 'File không phải JSON hợp lệ' } }
  if (!data || !Array.isArray((data as any).bookings) || !Array.isArray((data as any).rooms)) return { error: 'JSON không đúng cấu trúc dữ liệu demo (thiếu bookings/rooms)' }
  const clean = Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'toasts' && k in s && typeof (s as any)[k] !== 'function'))
  set(clean as Partial<StoreState>)
  S().audit('Nhập dữ liệu demo từ JSON', 'settings', undefined, undefined, { keys: Object.keys(clean).length })
  return {}
}

// ---------- FR-05 Ưu đãi / combo / mã ----------
function upsertIn<T extends { id: string }>(key: 'promotions' | 'combos' | 'coupons', item: Partial<T> & { id?: string }, prefix: string, label: string) {
  const s = S()
  if (item.id) {
    const old = (s[key] as unknown as T[]).find((x) => x.id === item.id)
    patchItem(key, item.id, (x: T) => ({ ...x, ...item }))
    s.audit(`Sửa ${label}`, key, item.id, old, item)
    return item.id
  }
  const created = { ...item, id: uid(prefix) } as T
  set((st) => ({ [key]: [...(st[key] as unknown as T[]), created] }) as any)
  s.audit(`Tạo ${label}`, key, created.id, undefined, item)
  return created.id
}
export const upsertPromotion = (p: Partial<Promotion>) => upsertIn<Promotion>('promotions', p, 'pr', 'ưu đãi')
export const upsertCombo = (c: Partial<Combo>) => upsertIn<Combo>('combos', c, 'cb', 'combo')
export const upsertCoupon = (c: Partial<Coupon>) => upsertIn<Coupon>('coupons', c, 'cp', 'mã giảm giá')
export function removeFrom(key: 'promotions' | 'combos' | 'coupons', id: string) {
  const s = S()
  set((st) => ({ [key]: (st[key] as { id: string }[]).filter((x) => x.id !== id) }) as any)
  s.audit(`Xoá ${key === 'promotions' ? 'ưu đãi' : key === 'combos' ? 'combo' : 'mã giảm giá'}`, key, id)
}
