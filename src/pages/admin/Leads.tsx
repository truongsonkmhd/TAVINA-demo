import { useState } from 'react'
import { useStore } from '@/store'
import { Button, Field, Select, Textarea, Modal, PageHeader, Badge, cx } from '@/components/ui'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { SERVICE_LABEL } from '@/lib/labels'
import type { Lead, ServiceKey } from '@/types'
import { updateLead } from '@/features/backoffice/actions'
import { usePerm } from '@/features/pms/components/common'

const COLS: { id: Lead['status']; label: string }[] = [
  { id: 'new', label: 'Mới' }, { id: 'contacted', label: 'Đã liên hệ' }, { id: 'quoted', label: 'Đã báo giá' }, { id: 'won', label: 'Chốt' }, { id: 'lost', label: 'Không thành' },
]
const ageH = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3600000

export default function Leads() {
  const s = useStore()
  const [service, setService] = useState<ServiceKey | ''>('')
  const [open, setOpen] = useState<string>()
  const leads = s.leads.filter((l) => !service || l.service === service)
  const late = leads.filter((l) => l.status === 'new' && ageH(l.createdAt) > 2).length

  return (
    <div>
      <PageHeader title="Yêu cầu tư vấn" subtitle="Lead từ web cho vé máy bay, xe, vé vui chơi, SIM, visa, tour và khách sạn đối tác"
        actions={<Select className="h-9 w-48" value={service} onChange={(e) => setService(e.target.value as ServiceKey | '')} aria-label="Dịch vụ"><option value="">Mọi dịch vụ</option>{Object.entries(SERVICE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>} />
      {late > 0 && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{late} yêu cầu mới quá 2 giờ chưa liên hệ (SLA 30 phút trong giờ làm việc).</p>}
      <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-5">
        {COLS.map((col) => {
          const items = leads.filter((l) => l.status === col.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          return (
            <section key={col.id} className="min-w-56 rounded-lg bg-stone-200/60 p-2">
              <h2 className="mb-2 flex justify-between px-1 text-sm font-semibold">{col.label}<span className="text-stone-500">{items.length}</span></h2>
              <ul className="space-y-2">
                {items.map((l) => (
                  <li key={l.id}>
                    <button onClick={() => setOpen(l.id)} className={cx('w-full rounded-md bg-white p-3 text-left text-sm shadow-sm hover:ring-2 hover:ring-sea', l.status === 'new' && ageH(l.createdAt) > 2 && 'ring-2 ring-red-400')}>
                      <div className="flex justify-between gap-2"><b className="truncate">{l.name}</b><Badge>{SERVICE_LABEL[l.service]}</Badge></div>
                      <p className="mt-1 line-clamp-2 text-xs text-stone-600">{l.need}</p>
                      <div className="mt-2 flex justify-between text-[11px] text-stone-500"><span>{fmtDateTime(l.createdAt)}</span><span>{s.staff.find((x) => x.id === l.assignedTo)?.name.split(' ').slice(-1)[0] ?? 'Chưa giao'}</span></div>
                    </button>
                  </li>
                ))}
                {items.length === 0 && <li className="px-1 py-3 text-center text-xs text-stone-500">Trống</li>}
              </ul>
            </section>
          )
        })}
      </div>
      {open && <LeadModal id={open} onClose={() => setOpen(undefined)} />}
    </div>
  )
}

function LeadModal({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore()
  const perm = usePerm()
  const l = s.leads.find((x) => x.id === id)!
  const [f, setF] = useState({ status: l.status, assignedTo: l.assignedTo ?? '', note: l.note ?? '' })
  const [quote, setQuote] = useState('')
  const canEdit = perm('leads', 'edit')
  const save = () => { updateLead(l.id, { status: f.status, assignedTo: f.assignedTo || undefined, note: f.note || undefined }); s.toast('Đã cập nhật yêu cầu'); onClose() }
  const addQuote = () => { if (!quote.trim()) return; const note = [f.note, `[Báo giá ${fmtDate(new Date().toISOString())}] ${quote.trim()}`].filter(Boolean).join('\n'); setF({ ...f, note, status: 'quoted' }); setQuote('') }
  return (
    <Modal open onClose={onClose} title={`${SERVICE_LABEL[l.service]}${l.subcategory ? ` · ${l.subcategory}` : ''}`} wide footer={canEdit && <><Button tone="secondary" onClick={onClose}>Đóng</Button><Button onClick={save}>Lưu</Button></>}>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-stone-500">Khách</dt><dd className="font-semibold">{l.name}</dd></div>
        <div><dt className="text-stone-500">Liên hệ</dt><dd><a href={`tel:${l.phone}`} className="text-sea hover:underline">{l.phone}</a>{l.email ? ` · ${l.email}` : ''}</dd></div>
        <div><dt className="text-stone-500">Ngày đi</dt><dd>{l.travelDate ? fmtDate(l.travelDate) : '—'} · {l.pax ?? '—'} khách</dd></div>
        <div><dt className="text-stone-500">Gửi lúc</dt><dd>{fmtDateTime(l.createdAt)} <span className="text-xs text-stone-500">({Math.round(ageH(l.createdAt))} giờ trước)</span></dd></div>
        <div className="sm:col-span-2"><dt className="text-stone-500">Nhu cầu</dt><dd className="rounded bg-stone-50 p-2">{l.need}</dd></div>
      </dl>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Trạng thái"><Select disabled={!canEdit} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Lead['status'] })}>{COLS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
        <Field label="Phụ trách"><Select disabled={!canEdit} value={f.assignedTo} onChange={(e) => setF({ ...f, assignedTo: e.target.value })}><option value="">Chưa giao</option>{s.staff.filter((x) => ['owner', 'manager', 'receptionist'].includes(x.roleId)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
        <div className="sm:col-span-2"><Field label="Ghi chú"><Textarea rows={3} disabled={!canEdit} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field></div>
      </div>
      {canEdit && (
        <div className="mt-3 flex gap-2">
          <Textarea rows={1} className="min-h-10" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Nội dung báo giá, VD: 2 vé TBB–HAN 17/11 VN1626, 3.480.000đ" aria-label="Báo giá" />
          <Button tone="secondary" onClick={addQuote}>Tạo báo giá</Button>
        </div>
      )}
    </Modal>
  )
}
