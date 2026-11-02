import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Modal, PageHeader, Table, Td, Badge, Empty } from '@/components/ui'
import { vnd, fmtDate, today, addDaysISO, nights } from '@/lib/format'
import { pickRatePlan, stayTotal } from '@/lib/pricing'
import { CHANNEL_LABEL, ROLE_LABEL } from '@/lib/labels'
import type { Channel, RatePlan, RoleId, Season } from '@/types'
import { addRatePlan, updateRatePlan, deleteRatePlan, upsertSeason, deleteSeason, updateDiscountLimits, approveDiscount } from '@/features/pms/actions'
import { usePerm, useRun } from '@/features/pms/components/common'

const GUEST_TYPE: Record<RatePlan['guestType'], string> = { retail: 'Khách lẻ', group: 'Đoàn', agent: 'Đại lý' }
const ALL_CHANNELS = Object.keys(CHANNEL_LABEL) as Channel[]

export default function Rates() {
  const s = useStore()
  const perm = usePerm()
  const canEdit = perm('rates', 'edit')
  const [editing, setEditing] = useState<RatePlan | 'new'>()
  const [season, setSeason] = useState<{ planId: string; s?: Season }>()
  const pending = s.bookings.filter((b) => b.discountStatus === 'pending')

  return (
    <div>
      <PageHeader title="Giá & chiết khấu" subtitle="Gói giá theo loại khách, kênh, mùa; hạn mức chiết khấu theo vai trò" actions={canEdit && <Button onClick={() => setEditing('new')}><Plus size={16} /> Gói giá mới</Button>} />
      <div className="space-y-4">
        <Card title="Gói giá" actions={<span className="text-xs text-stone-500">Nhiều gói cùng thoả → áp dụng gói có ưu tiên cao nhất</span>}>
          <Table head={['Gói', 'Loại khách', 'Kênh', ...s.roomTypes.map((r) => r.name), 'Cuối tuần', 'Min', 'Ưu tiên', '', '']}>
            {s.ratePlans.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'opacity-50'}>
                <Td><b>{p.name}</b><div className="text-xs text-stone-500">{p.cancelPolicy}</div></Td>
                <Td>{GUEST_TYPE[p.guestType]}</Td>
                <Td className="text-xs">{p.channels.map((c) => CHANNEL_LABEL[c]).join(', ')}</Td>
                {s.roomTypes.map((r) => <Td key={r.id} className="tnum whitespace-nowrap">{vnd(p.prices[r.id] ?? 0)}</Td>)}
                <Td className="tnum">×{p.weekendMultiplier}</Td><Td className="tnum">{p.minStay}</Td><Td className="tnum">{p.priority}</Td>
                <Td><Badge tone={p.active ? 'ok' : 'neutral'}>{p.active ? 'Đang dùng' : 'Tắt'}</Badge></Td>
                <Td>{canEdit && <div className="flex gap-1"><Button size="sm" tone="ghost" onClick={() => setEditing(p)} aria-label="Sửa"><Pencil size={14} /></Button><Button size="sm" tone="ghost" onClick={() => confirm(`Xoá gói ${p.name}?`) && deleteRatePlan(p.id)} aria-label="Xoá"><Trash2 size={14} /></Button></div>}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Mùa giá">
          <div className="grid gap-4 lg:grid-cols-2">
            {s.ratePlans.map((p) => (
              <div key={p.id} className="rounded-lg border border-stone-200 p-3">
                <div className="flex items-center justify-between"><b className="text-sm">{p.name}</b>{canEdit && <Button size="sm" tone="ghost" onClick={() => setSeason({ planId: p.id })}><Plus size={14} /> Mùa</Button>}</div>
                {p.seasons.length === 0 ? <p className="mt-2 text-xs text-stone-500">Chưa có mùa — dùng giá cơ bản.</p> : (
                  <ul className="mt-2 divide-y divide-stone-100 text-sm">
                    {p.seasons.map((ss) => (
                      <li key={ss.id} className="flex items-center justify-between py-1.5">
                        <span>{ss.name} · {fmtDate(ss.from, 'dd/MM/yy')} → {fmtDate(ss.to, 'dd/MM/yy')} · <b className="tnum">×{ss.multiplier}</b></span>
                        {canEdit && <span className="flex gap-1"><button onClick={() => setSeason({ planId: p.id, s: ss })} className="text-stone-400 hover:text-sea" aria-label="Sửa mùa"><Pencil size={14} /></button><button onClick={() => deleteSeason(p.id, ss.id)} className="text-stone-400 hover:text-red-600" aria-label="Xoá mùa"><Trash2 size={14} /></button></span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <PricePreview />
          <div className="space-y-4">
            <DiscountLimits />
            <Card title={`Chiết khấu chờ duyệt (${pending.length})`}>
              {pending.length === 0 ? <p className="text-sm text-stone-500">Không có yêu cầu nào.</p> : (
                <ul className="divide-y divide-stone-100 text-sm">
                  {pending.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span><Link to={`/admin/bookings/${b.id}`} className="font-mono text-sea hover:underline">{b.code}</Link> · <b>{b.discountPct}%</b> · “{b.discountReason ?? '—'}” · {s.users.find((u) => u.id === b.createdBy)?.name ?? b.createdBy}</span>
                      {(perm('rates', 'approve') || perm('bookings', 'approve')) && <span className="flex gap-1"><Button size="sm" onClick={() => approveDiscount(b.id, true)}><Check size={14} /> Duyệt</Button><Button size="sm" tone="secondary" onClick={() => approveDiscount(b.id, false)}><X size={14} /></Button></span>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
      {editing && <PlanModal plan={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />}
      {season && <SeasonModal planId={season.planId} season={season.s} onClose={() => setSeason(undefined)} />}
    </div>
  )
}

function PlanModal({ plan, onClose }: { plan?: RatePlan; onClose: () => void }) {
  const roomTypes = useStore((s) => s.roomTypes)
  const [p, setP] = useState<Omit<RatePlan, 'id'>>(plan ?? { name: '', guestType: 'retail', channels: ['front-desk'], prices: Object.fromEntries(roomTypes.map((r) => [r.id, r.basePrice])), seasons: [], weekendMultiplier: 1, minStay: 1, cancelPolicy: 'Huỷ miễn phí trước 48h', extraAdultFee: 150000, priority: 10, active: true })
  const [err, setErr] = useState<string>()
  const save = () => {
    if (!p.name.trim()) return setErr('Nhập tên gói')
    if (!p.channels.length) return setErr('Chọn ít nhất một kênh')
    if (Object.values(p.prices).some((v) => v <= 0)) return setErr('Giá phải lớn hơn 0')
    if (plan) updateRatePlan(plan.id, p); else addRatePlan(p)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={plan ? `Sửa gói ${plan.name}` : 'Gói giá mới'} wide footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2"><Field label="Tên gói"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field></div>
        <Field label="Loại khách"><Select value={p.guestType} onChange={(e) => setP({ ...p, guestType: e.target.value as RatePlan['guestType'] })}>{Object.entries(GUEST_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        {roomTypes.map((r) => <Field key={r.id} label={`Giá ${r.name}/đêm`}><Input type="number" step={10000} value={p.prices[r.id] ?? 0} onChange={(e) => setP({ ...p, prices: { ...p.prices, [r.id]: Number(e.target.value) } })} /></Field>)}
        <Field label="Hệ số cuối tuần (T6, T7)"><Input type="number" step={0.05} value={p.weekendMultiplier} onChange={(e) => setP({ ...p, weekendMultiplier: Number(e.target.value) })} /></Field>
        <Field label="Số đêm tối thiểu"><Input type="number" min={1} value={p.minStay} onChange={(e) => setP({ ...p, minStay: Number(e.target.value) })} /></Field>
        <Field label="Phụ thu người thêm/đêm"><Input type="number" step={10000} value={p.extraAdultFee} onChange={(e) => setP({ ...p, extraAdultFee: Number(e.target.value) })} /></Field>
        <Field label="Ưu tiên"><Input type="number" value={p.priority} onChange={(e) => setP({ ...p, priority: Number(e.target.value) })} /></Field>
        <div className="sm:col-span-2"><Field label="Chính sách huỷ"><Input value={p.cancelPolicy} onChange={(e) => setP({ ...p, cancelPolicy: e.target.value })} /></Field></div>
      </div>
      <div className="mt-3 text-sm font-medium">Kênh áp dụng</div>
      <div className="mt-1 flex flex-wrap gap-3 text-sm">
        {ALL_CHANNELS.map((c) => <label key={c} className="flex items-center gap-1.5"><input type="checkbox" className="accent-sea" checked={p.channels.includes(c)} onChange={(e) => setP({ ...p, channels: e.target.checked ? [...p.channels, c] : p.channels.filter((x) => x !== c) })} />{CHANNEL_LABEL[c]}</label>)}
        <label className="ml-auto flex items-center gap-1.5 font-medium"><input type="checkbox" className="accent-sea" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} />Đang dùng</label>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </Modal>
  )
}

function SeasonModal({ planId, season, onClose }: { planId: string; season?: Season; onClose: () => void }) {
  const run = useRun()
  const [ss, setSs] = useState({ name: season?.name ?? '', from: season?.from ?? today(), to: season?.to ?? addDaysISO(today(), 30), multiplier: season?.multiplier ?? 1.2 })
  const [err, setErr] = useState<string>()
  const save = () => {
    if (!ss.name.trim()) return setErr('Nhập tên mùa')
    const r = upsertSeason(planId, { ...ss, id: season?.id })
    if (r.error) return setErr(r.error)
    run(r, 'Đã lưu mùa giá'); onClose()
  }
  return (
    <Modal open onClose={onClose} title={season ? 'Sửa mùa' : 'Thêm mùa'} footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Tên mùa"><Input value={ss.name} onChange={(e) => setSs({ ...ss, name: e.target.value })} placeholder="VD: Lễ 30/4 – 1/5" /></Field></div>
        <Field label="Từ ngày"><Input type="date" value={ss.from} onChange={(e) => setSs({ ...ss, from: e.target.value })} /></Field>
        <Field label="Đến ngày"><Input type="date" value={ss.to} onChange={(e) => setSs({ ...ss, to: e.target.value })} /></Field>
        <Field label="Hệ số giá" hint="1.25 = tăng 25% so với giá gói"><Input type="number" step={0.05} value={ss.multiplier} onChange={(e) => setSs({ ...ss, multiplier: Number(e.target.value) })} /></Field>
      </div>
      {err && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700" role="alert">{err}</p>}
    </Modal>
  )
}

function PricePreview() {
  const s = useStore()
  const [q, setQ] = useState({ roomTypeId: s.roomTypes[0]?.id ?? '', checkIn: today(), checkOut: addDaysISO(today(), 3), channel: 'web' as Channel, guestType: 'retail' as RatePlan['guestType'] })
  const plan = pickRatePlan(s.ratePlans, q.channel, q.guestType)
  const st = plan && q.checkOut > q.checkIn ? stayTotal(plan, q.roomTypeId, q.checkIn, q.checkOut) : undefined
  return (
    <Card title="Xem thử giá">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Hạng"><Select value={q.roomTypeId} onChange={(e) => setQ({ ...q, roomTypeId: e.target.value })}>{s.roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
        <Field label="Kênh"><Select value={q.channel} onChange={(e) => setQ({ ...q, channel: e.target.value as Channel })}>{ALL_CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</Select></Field>
        <Field label="Loại khách"><Select value={q.guestType} onChange={(e) => setQ({ ...q, guestType: e.target.value as RatePlan['guestType'] })}>{Object.entries(GUEST_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Nhận phòng"><Input type="date" value={q.checkIn} onChange={(e) => setQ({ ...q, checkIn: e.target.value })} /></Field>
        <Field label="Trả phòng"><Input type="date" value={q.checkOut} onChange={(e) => setQ({ ...q, checkOut: e.target.value })} /></Field>
      </div>
      {!plan ? <div className="mt-3"><Empty title="Không có gói giá phù hợp" hint="Kiểm tra kênh và loại khách của các gói" /></div> : st && (
        <div className="mt-3">
          <p className="text-sm">Gói áp dụng: <b>{plan.name}</b></p>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">{st.perNight.map((n) => <li key={n.date} className="flex justify-between py-1"><span>{fmtDate(n.date, 'EEE dd/MM')}</span><span className="tnum">{vnd(n.price)}</span></li>)}</ul>
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-bold"><span>Tổng {nights(q.checkIn, q.checkOut)} đêm</span><span className="tnum">{vnd(st.total)}</span></div>
        </div>
      )}
    </Card>
  )
}

function DiscountLimits() {
  const s = useStore()
  const run = useRun()
  const isOwner = s.currentUser.roleId === 'owner'
  const [lim, setLim] = useState(s.settings.discountLimits)
  return (
    <Card title="Hạn mức chiết khấu theo vai trò" actions={isOwner && <Button size="sm" onClick={() => run(updateDiscountLimits(lim), 'Đã lưu hạn mức')}>Lưu</Button>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(Object.keys(lim) as RoleId[]).map((r) => <Field key={r} label={ROLE_LABEL[r]}><Input type="number" min={0} max={100} disabled={!isOwner} value={lim[r]} onChange={(e) => setLim({ ...lim, [r]: Number(e.target.value) })} /></Field>)}
      </div>
      {!isOwner && <p className="mt-2 text-xs text-stone-500">Chỉ chủ khách sạn sửa được hạn mức.</p>}
    </Card>
  )
}
