import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Merge, Send, EyeOff } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Textarea, Modal, PageHeader, Table, Td, Tabs, Badge, Stat, Empty, cx } from '@/components/ui'
import { vnd, num, fmtDate, fmtDateTime } from '@/lib/format'
import { TIER_LABEL } from '@/lib/labels'
import type { Campaign, Guest, GuestTier } from '@/types'
import { mergeGuests, anonymizeGuest, updateGuest, segmentGuests, sendCampaign, CAMPAIGN_UNIT_COST, normPhone } from '@/features/backoffice/actions'
import { StatusBadge, usePerm } from '@/features/pms/components/common'

const TIER_TONE: Record<GuestTier, 'neutral' | 'info' | 'warn'> = { standard: 'neutral', silver: 'info', gold: 'warn' }

export default function Crm() {
  const [tab, setTab] = useState<'guests' | 'campaigns'>('guests')
  return (
    <div>
      <PageHeader title="Khách hàng" subtitle="Hồ sơ khách hợp nhất từ web, OTA, quầy; tích điểm, phân hạng, chiến dịch tái sales" />
      <Card><Tabs value={tab} onChange={setTab} tabs={[{ id: 'guests', label: 'Khách hàng' }, { id: 'campaigns', label: 'Chiến dịch' }]} /><div className="mt-4">{tab === 'guests' ? <Guests /> : <Campaigns />}</div></Card>
    </div>
  )
}

function Guests() {
  const s = useStore()
  const perm = usePerm()
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<GuestTier | ''>('')
  const [open, setOpen] = useState<string>()

  const stats = useMemo(() => {
    const m = new Map<string, { stays: number; spent: number; last?: string }>()
    for (const b of s.bookings) {
      if (!['checked-in', 'checked-out'].includes(b.status)) continue
      const x = m.get(b.guestId) ?? { stays: 0, spent: 0 }
      x.stays++
      x.spent += s.payments.filter((p) => p.bookingId === b.id).reduce((a, p) => a + p.amount, 0)
      if (!x.last || b.checkIn > x.last) x.last = b.checkIn
      m.set(b.guestId, x)
    }
    return m
  }, [s.bookings, s.payments])

  // Gợi ý trùng: cùng SĐT chuẩn hoá hoặc cùng email
  const dupes = useMemo(() => {
    const out: [Guest, Guest][] = []
    const real = s.guests.filter((g) => g.name !== 'Đã xoá' && !/^(tmp|stay|occ|rl)-/.test(g.phone))
    for (let i = 0; i < real.length; i++) for (let j = i + 1; j < real.length; j++) {
      const a = real[i], b = real[j]
      if (normPhone(a.phone) === normPhone(b.phone) || (a.email && a.email.toLowerCase() === b.email?.toLowerCase())) out.push([a, b])
    }
    return out
  }, [s.guests])

  const term = q.trim().toLowerCase()
  const list = s.guests
    .filter((g) => !/^(tmp|stay|occ|rl)-/.test(g.phone))
    .filter((g) => !tier || g.tier === tier)
    .filter((g) => !term || g.name.toLowerCase().includes(term) || normPhone(g.phone).includes(normPhone(term)) || g.email?.toLowerCase().includes(term))
    .sort((a, b) => (stats.get(b.id)?.spent ?? 0) - (stats.get(a.id)?.spent ?? 0))

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Khách hàng" value={num(list.length)} />
        <Stat label="Hạng Vàng" value={s.guests.filter((g) => g.tier === 'gold').length} />
        <Stat label="Hạng Bạc" value={s.guests.filter((g) => g.tier === 'silver').length} />
        <Stat label="Đồng ý nhận tin" value={s.guests.filter((g) => g.marketingOptIn).length} />
      </div>
      {dupes.length > 0 && perm('crm', 'edit') && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
          <div className="font-semibold text-amber-900">Gợi ý gộp hồ sơ trùng ({dupes.length})</div>
          <ul className="mt-2 space-y-1">
            {dupes.slice(0, 5).map(([a, b]) => (
              <li key={a.id + b.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{a.name} ({a.phone}) ↔ {b.name} ({b.phone})</span>
                <Button size="sm" tone="secondary" onClick={() => confirm(`Gộp "${b.name}" vào "${a.name}"? Booking và điểm được chuyển sang hồ sơ giữ lại.`) && mergeGuests(a.id, b.id)}><Merge size={14} /> Gộp</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="relative w-full max-w-sm"><Search size={16} className="absolute left-3 top-3 text-stone-400" /><Input className="pl-9" placeholder="Tên, SĐT, email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm khách" /></label>
        <Select className="w-40" value={tier} onChange={(e) => setTier(e.target.value as GuestTier | '')} aria-label="Hạng"><option value="">Mọi hạng</option>{Object.entries(TIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
      </div>
      {list.length === 0 ? <Empty title="Không tìm thấy khách" /> : (
        <Table head={['Khách', 'SĐT', 'Hạng', 'Điểm', 'Lần ở', 'Chi tiêu', 'Lần ở cuối', 'Nhận tin']}>
          {list.slice(0, 60).map((g) => {
            const st = stats.get(g.id)
            return (
              <tr key={g.id} className="cursor-pointer hover:bg-stone-50" onClick={() => setOpen(g.id)}>
                <Td><span className="font-medium text-sea">{g.name}</span>{g.company && <div className="text-xs text-stone-500">{g.company.name}</div>}</Td>
                <Td className="tnum whitespace-nowrap">{g.phone}</Td>
                <Td><Badge tone={TIER_TONE[g.tier]}>{TIER_LABEL[g.tier]}</Badge></Td>
                <Td className="tnum">{num(g.points)}</Td><Td className="tnum">{st?.stays ?? 0}</Td>
                <Td className="tnum text-right">{vnd(st?.spent ?? 0)}</Td>
                <Td>{st?.last ? fmtDate(st.last) : '—'}</Td>
                <Td>{g.marketingOptIn ? <Badge tone="ok">Có</Badge> : <Badge>Không</Badge>}</Td>
              </tr>
            )
          })}
        </Table>
      )}
      {open && <GuestModal id={open} onClose={() => setOpen(undefined)} />}
    </>
  )
}

function GuestModal({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore()
  const perm = usePerm()
  const g = s.guests.find((x) => x.id === id)
  const [f, setF] = useState(() => ({ name: g?.name ?? '', phone: g?.phone ?? '', email: g?.email ?? '', idNumber: g?.idNumber ?? '', nationality: g?.nationality ?? '', notes: g?.notes ?? '', coName: g?.company?.name ?? '', coTax: g?.company?.taxCode ?? '', coAddr: g?.company?.address ?? '', marketingOptIn: g?.marketingOptIn ?? false }))
  if (!g) return null
  const bookings = s.bookings.filter((b) => b.guestId === g.id || b.occupantIds.includes(g.id)).sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  const canEdit = perm('crm', 'edit')
  const save = () => {
    updateGuest(g.id, { name: f.name, phone: f.phone, email: f.email || undefined, idNumber: f.idNumber || undefined, nationality: f.nationality, notes: f.notes || undefined, marketingOptIn: f.marketingOptIn, company: f.coName ? { name: f.coName, taxCode: f.coTax, address: f.coAddr, email: f.email || undefined } : undefined })
    s.toast('Đã lưu hồ sơ'); onClose()
  }
  return (
    <Modal open onClose={onClose} title={g.name} wide footer={canEdit && <>
      <Button tone="ghost" className="mr-auto text-red-600" onClick={() => { if (confirm('Ẩn danh hoá hồ sơ theo yêu cầu khách (NĐ 13)? Thông tin cá nhân bị xoá, số liệu kế toán giữ nguyên.')) { anonymizeGuest(g.id); onClose() } }}><EyeOff size={14} /> Ẩn danh hoá</Button>
      <Button tone="secondary" onClick={onClose}>Đóng</Button><Button onClick={save}>Lưu</Button>
    </>}>
      <div className="mb-4 flex flex-wrap gap-2 text-sm"><Badge tone={TIER_TONE[g.tier]}>Hạng {TIER_LABEL[g.tier]}</Badge><Badge>{num(g.points)} điểm</Badge><Badge>Tạo {fmtDate(g.createdAt)}</Badge></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Họ tên"><Input disabled={!canEdit} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="SĐT"><Input disabled={!canEdit} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><Input disabled={!canEdit} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Số giấy tờ"><Input disabled={!canEdit} value={f.idNumber} onChange={(e) => setF({ ...f, idNumber: e.target.value })} /></Field>
        <Field label="Quốc tịch"><Input disabled={!canEdit} value={f.nationality} onChange={(e) => setF({ ...f, nationality: e.target.value })} /></Field>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" className="accent-sea" disabled={!canEdit} checked={f.marketingOptIn} onChange={(e) => setF({ ...f, marketingOptIn: e.target.checked })} />Đồng ý nhận tin</label>
        <Field label="Công ty xuất HĐ"><Input disabled={!canEdit} value={f.coName} onChange={(e) => setF({ ...f, coName: e.target.value })} /></Field>
        <Field label="MST"><Input disabled={!canEdit} value={f.coTax} onChange={(e) => setF({ ...f, coTax: e.target.value })} /></Field>
        <Field label="Địa chỉ công ty"><Input disabled={!canEdit} value={f.coAddr} onChange={(e) => setF({ ...f, coAddr: e.target.value })} /></Field>
        <div className="sm:col-span-3"><Field label="Ghi chú / sở thích"><Textarea rows={2} disabled={!canEdit} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="VD: thích phòng tầng cao, dị ứng hải sản" /></Field></div>
      </div>
      <div className="mt-4 text-sm font-semibold">Lịch sử lưu trú ({bookings.length})</div>
      <ul className="mt-1 divide-y divide-stone-100 text-sm">
        {bookings.slice(0, 10).map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-2 py-1.5">
            <Link to={`/admin/bookings/${b.id}`} className="font-mono text-xs text-sea hover:underline" onClick={onClose}>{b.code}</Link>
            <span>{fmtDate(b.checkIn, 'dd/MM/yy')} → {fmtDate(b.checkOut, 'dd/MM/yy')}</span>
            <StatusBadge status={b.status} />
          </li>
        ))}
        {bookings.length === 0 && <li className="py-2 text-stone-500">Chưa có lưu trú.</li>}
      </ul>
    </Modal>
  )
}

function Campaigns() {
  const s = useStore()
  const perm = usePerm()
  const [c, setC] = useState({ name: '', channel: 'zalo' as Campaign['channel'], tiers: ['silver', 'gold'] as GuestTier[], lastStayBeforeDays: 60, template: 'Chào {ten}, Khách sạn Thanh Long gửi bạn mã {ma} giảm giá cho kỳ nghỉ tới ở Phú Yên.', couponCode: s.coupons.find((x) => x.active)?.code ?? '' })
  const [err, setErr] = useState<string>()
  const segment = { tiers: c.tiers, lastStayBeforeDays: c.lastStayBeforeDays || undefined }
  const recipients = segmentGuests(s.guests, s.bookings, segment)
  const optedOut = s.guests.filter((g) => (!c.tiers.length || c.tiers.includes(g.tier)) && !g.marketingOptIn).length
  const preview = c.template.replace('{ten}', recipients[0]?.name.split(' ').slice(-1)[0] ?? 'An').replace('{ma}', c.couponCode || '—')
  const send = () => {
    if (!c.name.trim()) return setErr('Nhập tên chiến dịch')
    if (!recipients.length) return setErr('Không có người nhận phù hợp')
    sendCampaign({ name: c.name.trim(), channel: c.channel, segment, template: c.template, couponCode: c.couponCode || undefined })
    s.toast(`Đã gửi (mô phỏng) tới ${recipients.length} khách`); setErr(undefined); setC({ ...c, name: '' })
  }
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <div className="rounded-lg border border-stone-200 p-4">
        <div className="font-semibold">Tạo chiến dịch tái sales</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Tên chiến dịch"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="VD: Mời khách quay lại dịp Tết" /></Field></div>
          <Field label="Kênh" hint={`${vnd(CAMPAIGN_UNIT_COST[c.channel])}/tin`}><Select value={c.channel} onChange={(e) => setC({ ...c, channel: e.target.value as Campaign['channel'] })}><option value="zalo">Zalo ZNS</option><option value="sms">SMS brandname</option><option value="email">Email</option></Select></Field>
          <Field label="Lần ở cuối trước (ngày)"><Input type="number" min={0} value={c.lastStayBeforeDays} onChange={(e) => setC({ ...c, lastStayBeforeDays: Number(e.target.value) })} /></Field>
          <div className="sm:col-span-2 flex gap-4 text-sm">{(Object.keys(TIER_LABEL) as GuestTier[]).map((t) => <label key={t} className="flex items-center gap-1.5"><input type="checkbox" className="accent-sea" checked={c.tiers.includes(t)} onChange={(e) => setC({ ...c, tiers: e.target.checked ? [...c.tiers, t] : c.tiers.filter((x) => x !== t) })} />Hạng {TIER_LABEL[t]}</label>)}</div>
          <Field label="Mã giảm giá kèm theo"><Select value={c.couponCode} onChange={(e) => setC({ ...c, couponCode: e.target.value })}><option value="">Không</option>{s.coupons.filter((x) => x.active).map((x) => <option key={x.id} value={x.code}>{x.code}</option>)}</Select></Field>
          <div className="sm:col-span-2"><Field label="Nội dung" hint="Dùng {ten} và {ma}"><Textarea rows={3} value={c.template} onChange={(e) => setC({ ...c, template: e.target.value })} /></Field></div>
        </div>
        <div className="mt-3 rounded bg-stone-50 p-3 text-sm"><div className="text-xs text-stone-500">Xem trước</div>{preview}</div>
        <p className="mt-3 text-sm"><b className="tnum">{recipients.length}</b> người nhận · chi phí ước tính <b className="tnum">{vnd(recipients.length * CAMPAIGN_UNIT_COST[c.channel])}</b> · loại trừ {optedOut} khách chưa đồng ý nhận tin</p>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        {perm('crm', 'create') && <Button className="mt-3" onClick={send}><Send size={16} /> Gửi (mô phỏng)</Button>}
      </div>
      <div>
        <div className="mb-2 font-semibold">Chiến dịch đã gửi</div>
        {s.campaigns.length === 0 ? <Empty title="Chưa có chiến dịch" /> : (
          <Table head={['Chiến dịch', 'Kênh', 'Gửi', 'Mở', 'Đặt phòng', 'Chi phí', 'Ngày']}>
            {s.campaigns.map((x) => (
              <tr key={x.id}>
                <Td><b>{x.name}</b>{x.couponCode && <div className="text-xs text-stone-500">Mã {x.couponCode}</div>}</Td>
                <Td className="uppercase">{x.channel}</Td><Td className="tnum">{x.recipients}</Td>
                <Td className="tnum">{x.opened} <span className="text-xs text-stone-500">({x.recipients ? Math.round((x.opened / x.recipients) * 100) : 0}%)</span></Td>
                <Td className={cx('tnum font-semibold', x.bookings && 'text-emerald-700')}>{x.bookings}</Td>
                <Td className="tnum">{vnd(x.cost)}</Td><Td className="whitespace-nowrap">{fmtDateTime(x.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  )
}
