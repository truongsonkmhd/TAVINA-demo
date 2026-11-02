import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Send, Phone, Mail, MessageCircle, Facebook, Zap, ArrowLeft, UserPlus, CheckCircle2, CalendarPlus, PhoneCall, RefreshCw } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Field, Input, Select, Textarea, Modal, PageHeader, Badge, cx } from '@/components/ui'
import { fmtDate, fmtDateTime, today } from '@/lib/format'
import type { Conversation, ConversationChannel } from '@/types'
import { replyConversation, patchConversation, createConversation, simulateIncoming, normPhone } from '@/features/backoffice/actions'
import { usePerm } from '@/features/pms/components/common'

const CH: Record<ConversationChannel, { label: string; icon: typeof Phone; cls: string }> = {
  zalo: { label: 'Zalo', icon: MessageCircle, cls: 'bg-sky-100 text-sky-800' },
  messenger: { label: 'Messenger', icon: Facebook, cls: 'bg-indigo-100 text-indigo-800' },
  email: { label: 'Email', icon: Mail, cls: 'bg-stone-200 text-stone-800' },
  phone: { label: 'Hotline', icon: Phone, cls: 'bg-emerald-100 text-emerald-800' },
}
const QUICK = [
  'Dạ khách sạn còn phòng ạ. Anh/chị cho em xin ngày đến, số khách và SĐT để em giữ phòng nhé.',
  'Khách sạn hỗ trợ nhận phòng sớm từ 11:00 nếu phòng sẵn sàng, phụ thu 30% giá phòng ạ.',
  'Xe đón sân bay Tuy Hoà 7 chỗ giá 250.000đ/chiều. Anh/chị gửi giúp em giờ hạ cánh nhé.',
  'Dạ em đã ghi nhận, lễ tân sẽ xác nhận lại trong 15 phút ạ.',
]
const STATUS: Record<Conversation['status'], string> = { new: 'Mới', 'in-progress': 'Đang xử lý', done: 'Đã xong' }
const ageMin = (iso: string) => (Date.now() - new Date(iso).getTime()) / 60000

export default function Inbox() {
  const s = useStore()
  const perm = usePerm()
  const navigate = useNavigate()
  const canReply = perm('inbox', 'edit')
  const [channel, setChannel] = useState<ConversationChannel | ''>('')
  const [status, setStatus] = useState<Conversation['status'] | ''>('')
  const [active, setActive] = useState<string | undefined>(s.conversations[0]?.id)
  const [text, setText] = useState('')
  const [callOpen, setCallOpen] = useState(false)
  const [zaloOk, setZaloOk] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const list = s.conversations.filter((c) => (!channel || c.channel === channel) && (!status || c.status === status)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const conv = s.conversations.find((c) => c.id === active)
  const guest = conv?.guestId ? s.guests.find((g) => g.id === conv.guestId) : undefined
  const upcoming = guest ? s.bookings.filter((b) => b.guestId === guest.id && ['confirmed', 'checked-in', 'hold'].includes(b.status) && b.checkOut >= today()) : []
  const overdue = (c: Conversation) => c.status === 'new' && ageMin(c.updatedAt) > 15
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [conv?.messages.length, active])

  const send = (t = text) => { if (!conv || !t.trim()) return; replyConversation(conv.id, t.trim()); setText('') }
  const linkGuest = () => {
    if (!conv) return
    const isPhone = /^[+\d][\d\s.]{7,}$/.test(conv.contactRef)
    const g = s.upsertGuest({ name: conv.contactName, phone: isPhone ? conv.contactRef : `${conv.channel}-${conv.contactRef}`, email: conv.channel === 'email' ? conv.contactRef : undefined })
    patchConversation(conv.id, { guestId: g.id }, 'Gắn hồ sơ khách cho hội thoại')
    s.toast(`Đã gắn hồ sơ ${g.name}`)
  }
  const existing = conv && !guest ? s.guests.find((g) => normPhone(g.phone) === normPhone(conv.contactRef) || g.email === conv.contactRef) : undefined

  return (
    <div>
      <PageHeader title="Hộp thư CSKH" subtitle="Zalo OA, Messenger, email và hotline về một nơi, gắn với hồ sơ khách"
        actions={<>
          <Button tone="secondary" onClick={() => setCallOpen(true)}><PhoneCall size={16} /> Ghi chú cuộc gọi</Button>
          <Button tone="secondary" onClick={() => { const c = simulateIncoming(); setActive(c.id) }}><Zap size={16} /> Mô phỏng tin nhắn mới</Button>
        </>} />
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {(['zalo', 'messenger', 'email', 'phone'] as ConversationChannel[]).map((c) => {
          const broken = c === 'zalo' && !zaloOk
          return <span key={c} className={cx('flex items-center gap-1 rounded-full px-2.5 py-1', broken ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
            <span className={cx('h-2 w-2 rounded-full', broken ? 'bg-red-500' : 'bg-emerald-500')} />{CH[c].label}: {broken ? 'token hết hạn' : 'đã kết nối'}
            {broken && perm('inbox', 'edit') && <button onClick={() => { setZaloOk(true); s.toast('Đã kết nối lại Zalo OA') }} className="ml-1 font-semibold underline"><RefreshCw size={10} className="inline" /> Kết nối lại</button>}
          </span>
        })}
      </div>

      <div className="grid h-[calc(100vh-240px)] min-h-[520px] overflow-hidden rounded-lg bg-white ring-1 ring-stone-200 lg:grid-cols-[300px_1fr_280px]">
        {/* Danh sách */}
        <aside className={cx('flex min-h-0 flex-col border-r border-stone-200', conv && 'hidden lg:flex')}>
          <div className="grid grid-cols-2 gap-2 border-b border-stone-200 p-2">
            <Select className="h-8 text-xs" value={channel} onChange={(e) => setChannel(e.target.value as ConversationChannel | '')} aria-label="Kênh"><option value="">Mọi kênh</option>{Object.entries(CH).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
            <Select className="h-8 text-xs" value={status} onChange={(e) => setStatus(e.target.value as Conversation['status'] | '')} aria-label="Trạng thái"><option value="">Mọi trạng thái</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {list.map((c) => {
              const Icon = CH[c.channel].icon
              const last = c.messages[c.messages.length - 1]
              return (
                <li key={c.id}>
                  <button onClick={() => setActive(c.id)} className={cx('flex w-full gap-3 border-b border-stone-100 p-3 text-left hover:bg-stone-50', active === c.id && 'bg-sand/70', overdue(c) && 'border-l-4 border-l-red-500')}>
                    <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', CH[c.channel].cls)}><Icon size={14} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2"><b className="truncate text-sm">{c.contactName}</b><span className="shrink-0 text-[11px] text-stone-500">{fmtDateTime(c.updatedAt).slice(-5)}</span></span>
                      <span className="block truncate text-xs text-stone-600">{last?.from === 'staff' ? 'Bạn: ' : ''}{last?.text}</span>
                      <span className="mt-1 flex gap-1">{c.status === 'new' && <Badge tone={overdue(c) ? 'err' : 'warn'}>{overdue(c) ? `Quá ${Math.round(ageMin(c.updatedAt))} phút` : 'Mới'}</Badge>}{c.status === 'done' && <Badge tone="ok">Xong</Badge>}</span>
                    </span>
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="p-6 text-center text-sm text-stone-500">Không có hội thoại.</li>}
          </ul>
        </aside>

        {/* Khung chat */}
        <section className={cx('flex min-h-0 flex-col', !conv && 'hidden lg:flex')}>
          {!conv ? <div className="grid flex-1 place-items-center text-sm text-stone-500">Chọn một hội thoại</div> : (
            <>
              <header className="flex items-center gap-2 border-b border-stone-200 p-3">
                <button className="lg:hidden" onClick={() => setActive(undefined)} aria-label="Quay lại"><ArrowLeft size={18} /></button>
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{conv.contactName}</div><div className="text-xs text-stone-500">{CH[conv.channel].label} · {conv.contactRef}</div></div>
                <Badge tone={conv.status === 'done' ? 'ok' : conv.status === 'new' ? 'warn' : 'info'}>{STATUS[conv.status]}</Badge>
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-stone-50 p-4">
                {conv.messages.map((m) => (
                  <div key={m.id} className={cx('flex', m.from === 'staff' && 'justify-end')}>
                    <div className={cx('max-w-[80%] rounded-lg px-3 py-2 text-sm', m.from === 'staff' ? 'bg-sea text-white' : 'bg-white ring-1 ring-stone-200')}>
                      <div className="whitespace-pre-wrap">{m.text}</div>
                      <div className={cx('mt-1 text-[10px]', m.from === 'staff' ? 'text-white/70' : 'text-stone-400')}>{fmtDateTime(m.at)}</div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {canReply && conv.channel !== 'phone' && (
                <div className="border-t border-stone-200 p-3">
                  <div className="mb-2 flex gap-1 overflow-x-auto [scrollbar-width:none]">{QUICK.map((q) => <button key={q} onClick={() => setText(q)} className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs hover:bg-stone-200">{q.slice(0, 32)}…</button>)}</div>
                  <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex gap-2">
                    <Textarea rows={1} className="min-h-10" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={conv.channel === 'zalo' && !zaloOk ? 'Zalo OA mất kết nối — kết nối lại để gửi' : `Trả lời qua ${CH[conv.channel].label}…`} disabled={conv.channel === 'zalo' && !zaloOk} aria-label="Nội dung trả lời" />
                    <Button type="submit" disabled={!text.trim() || (conv.channel === 'zalo' && !zaloOk)} aria-label="Gửi"><Send size={16} /></Button>
                  </form>
                </div>
              )}
            </>
          )}
        </section>

        {/* Hồ sơ */}
        <aside className="hidden min-h-0 overflow-y-auto border-l border-stone-200 p-4 text-sm lg:block">
          {conv && (
            <>
              <div className="font-semibold">Hồ sơ khách</div>
              {guest ? (
                <div className="mt-2 space-y-1">
                  <div className="font-medium">{guest.name}</div><div className="text-stone-600">{guest.phone}</div>{guest.email && <div className="text-stone-600">{guest.email}</div>}
                  <Badge tone="info">Hạng {guest.tier === 'gold' ? 'Vàng' : guest.tier === 'silver' ? 'Bạc' : 'Thường'} · {guest.points} điểm</Badge>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="text-stone-500">Chưa gắn hồ sơ.</p>
                  {existing ? <Button size="sm" tone="secondary" onClick={() => { patchConversation(conv.id, { guestId: existing.id }, 'Gắn hồ sơ khách'); s.toast(`Đã gắn ${existing.name}`) }}>Gắn với {existing.name}</Button>
                    : <Button size="sm" tone="secondary" onClick={linkGuest}><UserPlus size={14} /> Tạo hồ sơ</Button>}
                </div>
              )}
              {upcoming.length > 0 && (
                <div className="mt-4"><div className="font-semibold">Booking sắp tới</div>
                  <ul className="mt-1 space-y-1">{upcoming.map((b) => <li key={b.id}><Link to={`/admin/bookings/${b.id}`} className="text-sea hover:underline">{b.code}</Link> · {fmtDate(b.checkIn, 'dd/MM')}</li>)}</ul>
                </div>
              )}
              <div className="mt-4 space-y-2">
                {perm('bookings', 'create') && <Button size="sm" className="w-full" onClick={() => navigate(`/admin/bookings/new${guest ? `?guestId=${guest.id}` : ''}`)}><CalendarPlus size={14} /> Tạo booking</Button>}
                <Field label="Phân công"><Select className="h-8" value={conv.assignedTo ?? ''} onChange={(e) => patchConversation(conv.id, { assignedTo: e.target.value || undefined }, 'Phân công hội thoại')}><option value="">Chưa phân công</option>{s.staff.filter((x) => ['receptionist', 'manager', 'owner'].includes(x.roleId)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
                {conv.status !== 'done' ? <Button size="sm" tone="secondary" className="w-full" onClick={() => patchConversation(conv.id, { status: 'done' }, 'Đóng hội thoại')}><CheckCircle2 size={14} /> Đánh dấu đã xong</Button>
                  : <Button size="sm" tone="ghost" className="w-full" onClick={() => patchConversation(conv.id, { status: 'in-progress' })}>Mở lại</Button>}
              </div>
            </>
          )}
        </aside>
      </div>

      {callOpen && <CallModal onClose={() => setCallOpen(false)} onSaved={(id) => setActive(id)} />}
    </div>
  )
}

function CallModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const [f, setF] = useState({ name: '', phone: '', note: '' })
  const ok = f.phone.trim() && f.note.trim()
  return (
    <Modal open onClose={onClose} title="Ghi chú cuộc gọi hotline" footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button disabled={!ok} onClick={() => { const c = createConversation({ channel: 'phone', contactName: f.name, contactRef: f.phone.trim(), text: `Ghi chú cuộc gọi: ${f.note.trim()}`, from: 'staff', status: 'in-progress' }); onSaved(c.id); onClose() }}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Số gọi đến" required><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Tên khách"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Nội dung" required><Textarea rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field></div>
      </div>
    </Modal>
  )
}
