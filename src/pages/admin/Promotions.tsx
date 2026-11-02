import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Textarea, Modal, PageHeader, Table, Td, Tabs, Badge, Empty } from '@/components/ui'
import { vnd, fmtDate, today, addDaysISO, overlaps } from '@/lib/format'
import { CHANNEL_LABEL } from '@/lib/labels'
import type { Channel, Combo, Coupon, Promotion } from '@/types'
import { upsertPromotion, upsertCombo, upsertCoupon, removeFrom } from '@/features/backoffice/actions'
import { usePerm } from '@/features/pms/components/common'

type Tab = 'promo' | 'combo' | 'coupon'
const CHANNELS = Object.keys(CHANNEL_LABEL) as Channel[]
const PROMO_TYPE: Record<Promotion['type'], string> = { percent: 'Giảm %', amount: 'Giảm tiền', 'free-night': 'Tặng đêm', gift: 'Quà tặng' }

function ChannelPicker({ value, onChange }: { value: Channel[]; onChange: (v: Channel[]) => void }) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      {CHANNELS.map((c) => <label key={c} className="flex items-center gap-1.5"><input type="checkbox" className="accent-sea" checked={value.includes(c)} onChange={(e) => onChange(e.target.checked ? [...value, c] : value.filter((x) => x !== c))} />{CHANNEL_LABEL[c]}</label>)}
    </div>
  )
}

export default function Promotions() {
  const s = useStore()
  const perm = usePerm()
  const canEdit = perm('promotions', 'edit')
  const [tab, setTab] = useState<Tab>('promo')
  const [editPromo, setEditPromo] = useState<Partial<Promotion>>()
  const [editCombo, setEditCombo] = useState<Partial<Combo>>()
  const [editCoupon, setEditCoupon] = useState<Partial<Coupon>>()
  const T = today()

  // Cảnh báo: 2 ưu đãi không cộng dồn, cùng kênh, trùng khoảng ngày
  const conflicts: string[] = []
  const actives = s.promotions.filter((p) => p.active && !p.stackable)
  for (let i = 0; i < actives.length; i++) for (let j = i + 1; j < actives.length; j++) {
    const a = actives[i], b = actives[j]
    if (a.channels.some((c) => b.channels.includes(c)) && overlaps(a.from, addDaysISO(a.to, 1), b.from, addDaysISO(b.to, 1))) conflicts.push(`“${a.name}” và “${b.name}”`)
  }
  const remove = (key: Tab, id: string, name: string) => confirm(`Xoá ${name}?`) && removeFrom(key === 'promo' ? 'promotions' : key === 'combo' ? 'combos' : 'coupons', id)
  const state = (from: string, to: string, active: boolean, full: boolean) => !active ? <Badge>Tắt</Badge> : full ? <Badge tone="warn">Hết lượt</Badge> : to < T ? <Badge>Hết hạn</Badge> : from > T ? <Badge tone="info">Sắp chạy</Badge> : <Badge tone="ok">Đang chạy</Badge>

  return (
    <div>
      <PageHeader title="Ưu đãi & combo" subtitle="Chương trình ưu đãi khách sạn, combo phòng + dịch vụ TAVINA, mã giảm giá"
        actions={canEdit && <Button onClick={() => tab === 'promo' ? setEditPromo({}) : tab === 'combo' ? setEditCombo({}) : setEditCoupon({})}><Plus size={16} /> Thêm {tab === 'promo' ? 'ưu đãi' : tab === 'combo' ? 'combo' : 'mã'}</Button>} />
      <Card>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'promo', label: 'Ưu đãi', count: s.promotions.length }, { id: 'combo', label: 'Combo', count: s.combos.length }, { id: 'coupon', label: 'Mã giảm giá', count: s.coupons.length }]} />
        <div className="mt-4">
          {tab === 'promo' && (
            <>
              {conflicts.length > 0 && <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200"><AlertTriangle size={16} className="mt-0.5 shrink-0" />Ưu đãi không cộng dồn đang chồng kênh và ngày: {conflicts.join('; ')}. Khách chỉ được áp một ưu đãi.</div>}
              {s.promotions.length === 0 ? <Empty title="Chưa có ưu đãi" /> : (
                <Table head={['Tên', 'Loại', 'Giá trị', 'Hiệu lực', 'Điều kiện', 'Kênh', 'Lượt', 'Trạng thái', '']}>
                  {s.promotions.map((p) => (
                    <tr key={p.id}>
                      <Td><b>{p.name}</b><div className="text-xs text-stone-500">{p.description}</div></Td>
                      <Td>{PROMO_TYPE[p.type]}</Td>
                      <Td className="tnum">{p.type === 'percent' ? `${p.value}%` : p.type === 'amount' ? vnd(p.value) : '—'}</Td>
                      <Td className="whitespace-nowrap">{fmtDate(p.from, 'dd/MM/yy')} → {fmtDate(p.to, 'dd/MM/yy')}</Td>
                      <Td>Từ {p.minStay} đêm{p.stackable ? ' · cộng dồn' : ''}</Td>
                      <Td className="text-xs">{p.channels.map((c) => CHANNEL_LABEL[c]).join(', ')}</Td>
                      <Td className="tnum">{p.used}/{p.maxUses}</Td>
                      <Td>{state(p.from, p.to, p.active, p.used >= p.maxUses)}</Td>
                      <Td>{canEdit && <div className="flex gap-1"><Button size="sm" tone="ghost" onClick={() => setEditPromo(p)} aria-label="Sửa"><Pencil size={14} /></Button><Button size="sm" tone="ghost" onClick={() => remove('promo', p.id, p.name)} aria-label="Xoá"><Trash2 size={14} /></Button></div>}</Td>
                    </tr>
                  ))}
                </Table>
              )}
            </>
          )}
          {tab === 'combo' && (s.combos.length === 0 ? <Empty title="Chưa có combo" /> : (
            <Table head={['Combo', 'Phòng', 'Dịch vụ', 'Giá lẻ', 'Giá combo', 'Tiết kiệm', 'Trạng thái', '']}>
              {s.combos.map((c) => {
                const rt = s.roomTypes.find((r) => r.id === c.roomTypeId)
                const retail = (rt?.basePrice ?? 0) * c.nights + c.services.reduce((x, y) => x + y.price, 0)
                return (
                  <tr key={c.id}>
                    <Td><b>{c.name}</b></Td>
                    <Td className="whitespace-nowrap">{rt?.name} × {c.nights} đêm</Td>
                    <Td className="text-xs">{c.services.map((x) => x.name).join('; ')}</Td>
                    <Td className="tnum">{vnd(retail)}</Td>
                    <Td className="tnum font-semibold">{vnd(c.comboPrice)}</Td>
                    <Td className={`tnum ${retail - c.comboPrice > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{vnd(retail - c.comboPrice)}</Td>
                    <Td><Badge tone={c.active ? 'ok' : 'neutral'}>{c.active ? 'Đang bán' : 'Tắt'}</Badge></Td>
                    <Td>{canEdit && <div className="flex gap-1"><Button size="sm" tone="ghost" onClick={() => setEditCombo(c)} aria-label="Sửa"><Pencil size={14} /></Button><Button size="sm" tone="ghost" onClick={() => remove('combo', c.id, c.name)} aria-label="Xoá"><Trash2 size={14} /></Button></div>}</Td>
                  </tr>
                )
              })}
            </Table>
          ))}
          {tab === 'coupon' && (s.coupons.length === 0 ? <Empty title="Chưa có mã giảm giá" /> : (
            <Table head={['Mã', 'Giảm', 'Hiệu lực', 'Kênh', 'Lượt', 'Trạng thái', '']}>
              {s.coupons.map((c) => (
                <tr key={c.id}>
                  <Td className="font-mono font-bold">{c.code}</Td>
                  <Td className="tnum">{c.type === 'percent' ? `${c.value}%` : vnd(c.value)}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(c.from, 'dd/MM/yy')} → {fmtDate(c.to, 'dd/MM/yy')}</Td>
                  <Td className="text-xs">{c.channels.map((x) => CHANNEL_LABEL[x]).join(', ')}</Td>
                  <Td className="tnum">{c.used}/{c.maxUses}</Td>
                  <Td>{state(c.from, c.to, c.active, c.used >= c.maxUses)}</Td>
                  <Td>{canEdit && <div className="flex gap-1"><Button size="sm" tone="ghost" onClick={() => setEditCoupon(c)} aria-label="Sửa"><Pencil size={14} /></Button><Button size="sm" tone="ghost" onClick={() => remove('coupon', c.id, c.code)} aria-label="Xoá"><Trash2 size={14} /></Button></div>}</Td>
                </tr>
              ))}
            </Table>
          ))}
        </div>
      </Card>
      {editPromo && <PromoModal value={editPromo} onClose={() => setEditPromo(undefined)} />}
      {editCombo && <ComboModal value={editCombo} onClose={() => setEditCombo(undefined)} />}
      {editCoupon && <CouponModal value={editCoupon} onClose={() => setEditCoupon(undefined)} />}
    </div>
  )
}

function dateErr(from?: string, to?: string) { return !from || !to ? 'Nhập ngày hiệu lực' : to < from ? 'Ngày kết thúc phải sau ngày bắt đầu' : undefined }

function PromoModal({ value, onClose }: { value: Partial<Promotion>; onClose: () => void }) {
  const [p, setP] = useState<Partial<Promotion>>({ type: 'percent', value: 10, from: today(), to: addDaysISO(today(), 30), minStay: 1, channels: ['web'], maxUses: 100, used: 0, stackable: false, active: true, name: '', description: '', ...value })
  const [err, setErr] = useState<string>()
  const save = () => {
    const e = !p.name?.trim() ? 'Nhập tên ưu đãi' : dateErr(p.from, p.to) ?? (p.type === 'percent' && (p.value! <= 0 || p.value! > 100) ? 'Giá trị % phải trong 1–100' : p.type === 'amount' && p.value! <= 0 ? 'Số tiền giảm phải > 0' : !p.channels?.length ? 'Chọn ít nhất một kênh' : (p.maxUses ?? 0) < (p.used ?? 0) ? `Số lượt tối đa không nhỏ hơn số đã dùng (${p.used})` : undefined)
    if (e) return setErr(e)
    upsertPromotion(p); onClose()
  }
  return (
    <Modal open onClose={onClose} title={value.id ? 'Sửa ưu đãi' : 'Ưu đãi mới'} wide footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2"><Field label="Tên"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field></div>
        <Field label="Loại"><Select value={p.type} onChange={(e) => setP({ ...p, type: e.target.value as Promotion['type'] })}>{Object.entries(PROMO_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <div className="sm:col-span-3"><Field label="Mô tả"><Textarea rows={2} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field></div>
        <Field label={p.type === 'percent' ? 'Giá trị (%)' : 'Giá trị (đ)'}><Input type="number" disabled={p.type === 'gift' || p.type === 'free-night'} value={p.value} onChange={(e) => setP({ ...p, value: Number(e.target.value) })} /></Field>
        <Field label="Từ ngày"><Input type="date" value={p.from} onChange={(e) => setP({ ...p, from: e.target.value })} /></Field>
        <Field label="Đến ngày"><Input type="date" value={p.to} onChange={(e) => setP({ ...p, to: e.target.value })} /></Field>
        <Field label="Số đêm tối thiểu"><Input type="number" min={1} value={p.minStay} onChange={(e) => setP({ ...p, minStay: Number(e.target.value) })} /></Field>
        <Field label="Số lượt tối đa" hint={`Đã dùng ${p.used ?? 0}`}><Input type="number" min={1} value={p.maxUses} onChange={(e) => setP({ ...p, maxUses: Number(e.target.value) })} /></Field>
        <div className="flex items-end gap-4 pb-2 text-sm"><label className="flex items-center gap-1.5"><input type="checkbox" className="accent-sea" checked={p.stackable} onChange={(e) => setP({ ...p, stackable: e.target.checked })} />Cộng dồn</label><label className="flex items-center gap-1.5"><input type="checkbox" className="accent-sea" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} />Bật</label></div>
      </div>
      <div className="mt-3 text-sm font-medium">Kênh áp dụng</div><div className="mt-1"><ChannelPicker value={p.channels ?? []} onChange={(channels) => setP({ ...p, channels })} /></div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </Modal>
  )
}

function ComboModal({ value, onClose }: { value: Partial<Combo>; onClose: () => void }) {
  const roomTypes = useStore((s) => s.roomTypes)
  const [c, setC] = useState<Partial<Combo>>({ name: '', roomTypeId: roomTypes[0]?.id, nights: 2, services: [{ name: '', price: 0 }], comboPrice: 0, description: '', image: 'https://picsum.photos/seed/combo-new/1200/800', active: true, ...value })
  const [err, setErr] = useState<string>()
  const rt = roomTypes.find((r) => r.id === c.roomTypeId)
  const retail = (rt?.basePrice ?? 0) * (c.nights ?? 0) + (c.services ?? []).reduce((x, y) => x + y.price, 0)
  const setSvc = (i: number, k: 'name' | 'price', v: string) => setC({ ...c, services: c.services!.map((x, j) => (j === i ? { ...x, [k]: k === 'price' ? Number(v) : v } : x)) })
  const save = () => {
    const services = (c.services ?? []).filter((x) => x.name.trim())
    const e = !c.name?.trim() ? 'Nhập tên combo' : !services.length ? 'Thêm ít nhất một dịch vụ' : !c.comboPrice || c.comboPrice <= 0 ? 'Nhập giá combo' : (c.nights ?? 0) < 1 ? 'Số đêm ≥ 1' : undefined
    if (e) return setErr(e)
    upsertCombo({ ...c, services }); onClose()
  }
  return (
    <Modal open onClose={onClose} title={value.id ? 'Sửa combo' : 'Combo mới'} wide footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3"><Field label="Tên combo"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field></div>
        <Field label="Hạng phòng"><Select value={c.roomTypeId} onChange={(e) => setC({ ...c, roomTypeId: e.target.value })}>{roomTypes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
        <Field label="Số đêm"><Input type="number" min={1} value={c.nights} onChange={(e) => setC({ ...c, nights: Number(e.target.value) })} /></Field>
        <Field label="Giá combo"><Input type="number" step={10000} value={c.comboPrice} onChange={(e) => setC({ ...c, comboPrice: Number(e.target.value) })} /></Field>
        <div className="sm:col-span-3"><Field label="Mô tả"><Textarea rows={2} value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} /></Field></div>
      </div>
      <div className="mt-3 text-sm font-medium">Dịch vụ kèm theo</div>
      <div className="mt-1 space-y-2">
        {c.services!.map((x, i) => (
          <div key={i} className="flex gap-2">
            <Input value={x.name} onChange={(e) => setSvc(i, 'name', e.target.value)} placeholder="Tên dịch vụ (tour, vé, xe…)" />
            <Input type="number" className="w-36" value={x.price} onChange={(e) => setSvc(i, 'price', e.target.value)} />
            <Button tone="ghost" onClick={() => setC({ ...c, services: c.services!.filter((_, j) => j !== i) })} aria-label="Xoá dịch vụ"><Trash2 size={14} /></Button>
          </div>
        ))}
        <Button size="sm" tone="secondary" onClick={() => setC({ ...c, services: [...c.services!, { name: '', price: 0 }] })}>+ Dịch vụ</Button>
      </div>
      <p className="mt-3 text-sm">Giá lẻ {vnd(retail)} · Combo {vnd(c.comboPrice ?? 0)} · <b className={retail - (c.comboPrice ?? 0) > 0 ? 'text-emerald-700' : 'text-red-600'}>Tiết kiệm {vnd(retail - (c.comboPrice ?? 0))}</b></p>
      <label className="mt-2 flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-sea" checked={c.active} onChange={(e) => setC({ ...c, active: e.target.checked })} />Đang bán</label>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </Modal>
  )
}

function CouponModal({ value, onClose }: { value: Partial<Coupon>; onClose: () => void }) {
  const coupons = useStore((s) => s.coupons)
  const [c, setC] = useState<Partial<Coupon>>({ code: '', type: 'percent', value: 10, maxUses: 100, used: 0, from: today(), to: addDaysISO(today(), 30), channels: ['web'], active: true, ...value })
  const [err, setErr] = useState<string>()
  const save = () => {
    const code = (c.code ?? '').trim().toUpperCase()
    const e = !/^[A-Z0-9]{4,20}$/.test(code) ? 'Mã gồm 4–20 chữ in hoa hoặc số' : coupons.some((x) => x.code === code && x.id !== c.id) ? 'Mã đã tồn tại' : dateErr(c.from, c.to) ?? (c.type === 'percent' && (c.value! <= 0 || c.value! > 100) ? 'Giá trị % phải trong 1–100' : c.value! <= 0 ? 'Giá trị phải > 0' : (c.maxUses ?? 0) < (c.used ?? 0) ? `Số lượt không nhỏ hơn số đã dùng (${c.used})` : undefined)
    if (e) return setErr(e)
    upsertCoupon({ ...c, code }); onClose()
  }
  return (
    <Modal open onClose={onClose} title={value.id ? 'Sửa mã giảm giá' : 'Mã giảm giá mới'} footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mã"><Input className="font-mono uppercase" value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} /></Field>
        <Field label="Loại"><Select value={c.type} onChange={(e) => setC({ ...c, type: e.target.value as Coupon['type'] })}><option value="percent">Giảm %</option><option value="amount">Giảm tiền</option></Select></Field>
        <Field label="Giá trị"><Input type="number" value={c.value} onChange={(e) => setC({ ...c, value: Number(e.target.value) })} /></Field>
        <Field label="Số lượt tối đa" hint={`Đã dùng ${c.used ?? 0}`}><Input type="number" min={1} value={c.maxUses} onChange={(e) => setC({ ...c, maxUses: Number(e.target.value) })} /></Field>
        <Field label="Từ ngày"><Input type="date" value={c.from} onChange={(e) => setC({ ...c, from: e.target.value })} /></Field>
        <Field label="Đến ngày"><Input type="date" value={c.to} onChange={(e) => setC({ ...c, to: e.target.value })} /></Field>
      </div>
      <div className="mt-3 text-sm font-medium">Kênh</div><div className="mt-1"><ChannelPicker value={c.channels ?? []} onChange={(channels) => setC({ ...c, channels })} /></div>
      <label className="mt-3 flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-sea" checked={c.active} onChange={(e) => setC({ ...c, active: e.target.checked })} />Bật</label>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </Modal>
  )
}
