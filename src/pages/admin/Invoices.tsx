import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useStore, useCan } from '@/store'
import { Button, Card, Badge, Field, Input, Select, Textarea, Modal, PageHeader, Tabs, Table, Td, Empty, Stat, cx } from '@/components/ui'
import { vnd, fmtDate, fmtDateTime, today, addDaysISO } from '@/lib/format'
import { BOOKING_STATUS_LABEL, CHANNEL_LABEL } from '@/lib/labels'
import type { Invoice, Debt, FolioLine } from '@/types'
import { issueInvoice, retryInvoice, adjustInvoice, recordDebtPayment, debtFromBooking, downloadCsv, printHtml } from '@/features/backoffice/actions'

type Tab = 'invoices' | 'pending' | 'debts' | 'ota'
const INV_STATUS: Record<Invoice['status'], { label: string; tone: 'ok' | 'warn' | 'neutral' | 'info' }> = {
  issued: { label: 'Đã phát hành', tone: 'ok' }, pending: { label: 'Chờ phát hành', tone: 'warn' }, adjusted: { label: 'Đã điều chỉnh', tone: 'info' }, replaced: { label: 'Đã thay thế', tone: 'neutral' },
}

export default function Invoices() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('invoices')
  const invoices = useStore((s) => s.invoices)
  const debts = useStore((s) => s.debts)
  const can = useCan()
  const [issueOpen, setIssueOpen] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [adjustId, setAdjustId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const bookingParam = params.get('booking') ?? undefined
  useEffect(() => { if (bookingParam) setIssueOpen(true) }, [bookingParam])

  const pending = invoices.filter((i) => i.status === 'pending')
  const list = invoices.filter((i) => i.status !== 'pending').filter((i) => !q || i.number.toLowerCase().includes(q.toLowerCase()) || i.buyer.name.toLowerCase().includes(q.toLowerCase()))
  const overdue = debts.filter((d) => d.amount - d.paid > 0 && d.dueDate < today())

  return (
    <div>
      <PageHeader title="Hoá đơn & công nợ" subtitle="Phát hành hoá đơn điện tử từ folio (tách/gộp), theo dõi công nợ đoàn/đại lý/OTA và đối soát." actions={
        can('invoices', 'create') && <Button onClick={() => setIssueOpen(true)}>Phát hành hoá đơn</Button>
      } />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Hoá đơn đã phát hành" value={invoices.filter((i) => i.status === 'issued').length} />
        <Stat label="Chờ phát hành" value={pending.length} tone={pending.length ? 'warn' : undefined} sub={pending.length ? 'NCC HĐĐT lỗi, tự thử lại' : 'Không có tồn đọng'} />
        <Stat label="Công nợ còn lại" value={vnd(debts.reduce((x, d) => x + Math.max(0, d.amount - d.paid), 0))} />
        <Stat label="Quá hạn" value={overdue.length} tone={overdue.length ? 'err' : undefined} sub={overdue.length ? vnd(overdue.reduce((x, d) => x + d.amount - d.paid, 0)) : undefined} />
      </div>
      <Card>
        <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'invoices', label: 'Hoá đơn', count: list.length }, { id: 'pending', label: 'Chờ phát hành', count: pending.length }, { id: 'debts', label: 'Công nợ', count: debts.length }, { id: 'ota', label: 'Đối soát OTA' }]} />
        <div className="pt-4">
          {tab === 'invoices' && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Input className="w-64" placeholder="Tìm số hoá đơn, người mua…" value={q} onChange={(e) => setQ(e.target.value)} />
                {can('invoices', 'export') && <Button tone="secondary" size="sm" onClick={() => downloadCsv(`hoa-don-${today()}.csv`, [['Số', 'Ngày', 'Người mua', 'MST', 'Tiền trước thuế', 'VAT %', 'Tổng', 'Trạng thái', 'Mã CQT'], ...list.map((i) => [i.number, fmtDate(i.issuedAt), i.buyer.name, i.buyer.taxCode, i.subtotal, i.vatPct, i.total, INV_STATUS[i.status].label, i.cqtCode])])}>Xuất CSV</Button>}
              </div>
              {list.length ? (
                <Table head={['Số HĐ', 'Ngày', 'Người mua', 'Booking', 'Tổng', 'Trạng thái', '']}>
                  {list.map((i) => <InvoiceRow key={i.id} inv={i} onView={() => setViewId(i.id)} onAdjust={can('invoices', 'edit') ? () => setAdjustId(i.id) : undefined} />)}
                </Table>
              ) : <Empty title="Chưa có hoá đơn" />}
            </>
          )}
          {tab === 'pending' && (
            pending.length ? (
              <Table head={['Tạo lúc', 'Người mua', 'Tổng', 'Ghi chú', '']}>
                {pending.map((i) => (
                  <tr key={i.id}>
                    <Td className="tnum">{fmtDateTime(i.createdAt)}</Td>
                    <Td>{i.buyer.name}</Td>
                    <Td className="tnum">{vnd(i.total)}</Td>
                    <Td className="text-amber-700">{i.note}</Td>
                    <Td className="text-right"><div className="flex justify-end gap-2"><Button size="sm" tone="ghost" onClick={() => setViewId(i.id)}>Xem</Button>{can('invoices', 'create') && <Button size="sm" onClick={() => retryInvoice(i.id)}>Thử lại</Button>}</div></Td>
                  </tr>
                ))}
              </Table>
            ) : <Empty title="Không có hoá đơn chờ phát hành" hint="Khi nhà cung cấp HĐĐT lỗi, hoá đơn sẽ nằm ở đây và không chặn check-out (FR-10 AC4)." />
          )}
          {tab === 'debts' && <DebtsTab />}
          {tab === 'ota' && <OtaReconcile />}
        </div>
      </Card>

      {issueOpen && <IssueModal open onClose={() => { setIssueOpen(false); if (bookingParam) { params.delete('booking'); setParams(params, { replace: true }) } }} presetBookingId={bookingParam} />}
      {viewId && <InvoiceView id={viewId} onClose={() => setViewId(null)} />}
      {adjustId && <AdjustModal id={adjustId} onClose={() => setAdjustId(null)} />}
    </div>
  )
}

function InvoiceRow({ inv, onView, onAdjust }: { inv: Invoice; onView: () => void; onAdjust?: () => void }) {
  const bookings = useStore((s) => s.bookings)
  const codes = inv.bookingIds.map((id) => bookings.find((b) => b.id === id)?.code ?? id)
  return (
    <tr>
      <Td className="tnum font-medium">{inv.number || '—'}<div className="text-xs text-stone-500">{inv.cqtCode}</div></Td>
      <Td className="tnum">{fmtDate(inv.issuedAt)}</Td>
      <Td>{inv.buyer.name}{inv.buyer.taxCode && <div className="text-xs text-stone-500">MST {inv.buyer.taxCode}</div>}</Td>
      <Td className="text-xs">{codes.slice(0, 2).map((c, i) => <Link key={i} to={`/admin/bookings/${inv.bookingIds[i]}`} className="block text-sea hover:underline">{c}</Link>)}{codes.length > 2 && <span className="text-stone-500">+{codes.length - 2} booking</span>}</Td>
      <Td className="tnum">{vnd(inv.total)}</Td>
      <Td><Badge tone={INV_STATUS[inv.status].tone}>{INV_STATUS[inv.status].label}</Badge>{inv.note && <div className="mt-1 max-w-48 text-xs text-stone-500">{inv.note}</div>}</Td>
      <Td className="text-right"><div className="flex justify-end gap-1"><Button size="sm" tone="ghost" onClick={onView}>Xem</Button>{onAdjust && inv.status === 'issued' && <Button size="sm" tone="secondary" onClick={onAdjust}>Điều chỉnh / Thay thế</Button>}</div></Td>
    </tr>
  )
}

// ---------- Phát hành ----------
function IssueModal({ open, onClose, presetBookingId }: { open: boolean; onClose: () => void; presetBookingId?: string }) {
  const s = useStore()
  const can = useCan()
  const candidates = useMemo(() => s.bookings.filter((b) => ['checked-in', 'checked-out'].includes(b.status) && s.folioLines.some((f) => f.bookingId === b.id && !f.invoiceId)).sort((a, b) => b.checkIn.localeCompare(a.checkIn)), [s.bookings, s.folioLines])
  const [selBookings, setSelBookings] = useState<string[]>(presetBookingId && candidates.some((b) => b.id === presetBookingId) ? [presetBookingId] : [])
  const [selLines, setSelLines] = useState<string[]>([])
  const [buyer, setBuyer] = useState({ name: '', taxCode: '', address: '', email: '' })
  const [saveCompany, setSaveCompany] = useState(true)
  const [vat, setVat] = useState(s.settings.vatPct)
  const [err, setErr] = useState('')

  const lines = useMemo(() => s.folioLines.filter((f) => selBookings.includes(f.bookingId) && !f.invoiceId), [s.folioLines, selBookings])
  const primaryGuest = s.guests.find((g) => g.id === s.bookings.find((b) => b.id === selBookings[0])?.guestId)
  useEffect(() => { setSelLines(lines.map((l) => l.id)) }, [lines])
  useEffect(() => {
    if (!primaryGuest) return
    setBuyer(primaryGuest.company ? { name: primaryGuest.company.name, taxCode: primaryGuest.company.taxCode, address: primaryGuest.company.address, email: primaryGuest.company.email ?? '' } : { name: primaryGuest.name, taxCode: '', address: primaryGuest.address ?? '', email: primaryGuest.email ?? '' })
  }, [primaryGuest?.id])

  const toggleBooking = (id: string) => setSelBookings((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const groupId = s.bookings.find((b) => b.id === selBookings[0])?.groupId
  const groupMates = groupId ? candidates.filter((b) => b.groupId === groupId && !selBookings.includes(b.id)) : []
  const chosen = lines.filter((l) => selLines.includes(l.id))
  const subtotal = chosen.reduce((x, l) => x + l.amount, 0)
  const total = Math.round(subtotal * (1 + vat / 100))

  const submit = (simulateFail: boolean) => {
    const r = issueInvoice({ bookingIds: selBookings, lineIds: selLines, buyer: { name: buyer.name, taxCode: buyer.taxCode || undefined, address: buyer.address || undefined, email: buyer.email || undefined }, vatPct: vat, simulateFail, saveCompanyToGuestId: saveCompany && buyer.taxCode ? primaryGuest?.id : undefined })
    if (r.error) { setErr(r.error); return }
    s.toast(simulateFail ? 'NCC HĐĐT lỗi — hoá đơn vào hàng Chờ phát hành' : `Đã phát hành ${r.invoice!.number}`, simulateFail ? 'warn' : 'ok')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Phát hành hoá đơn điện tử" wide footer={<>
      <Button tone="ghost" onClick={onClose}>Đóng</Button>
      {can('invoices', 'create') && <Button tone="secondary" disabled={!chosen.length} onClick={() => submit(true)}>Mô phỏng NCC HĐĐT lỗi</Button>}
      {can('invoices', 'create') && <Button disabled={!chosen.length || !buyer.name} onClick={() => submit(false)}>Phát hành ({vnd(total)})</Button>}
    </>}>
      {err && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{err}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">1. Chọn booking (chọn nhiều booking cùng đoàn để gộp)</h3>
          <div className="max-h-56 overflow-y-auto rounded-md border border-stone-200 scrollbar-thin">
            {candidates.length === 0 && <p className="p-3 text-sm text-stone-500">Không có booking nào còn dòng folio chưa xuất hoá đơn.</p>}
            {candidates.map((b) => {
              const g = s.guests.find((x) => x.id === b.guestId)
              const un = s.folioLines.filter((f) => f.bookingId === b.id && !f.invoiceId).reduce((x, f) => x + f.amount, 0)
              return (
                <label key={b.id} className={cx('flex cursor-pointer items-center gap-2 border-b border-stone-100 px-3 py-2 text-sm hover:bg-stone-50', selBookings.includes(b.id) && 'bg-sea/5')}>
                  <input type="checkbox" checked={selBookings.includes(b.id)} onChange={() => toggleBooking(b.id)} />
                  <span className="tnum font-medium">{b.code}</span>
                  <span className="truncate text-stone-600">{g?.name}</span>
                  {b.groupId && <Badge tone="info">Đoàn</Badge>}
                  <span className="ml-auto text-xs text-stone-500">{BOOKING_STATUS_LABEL[b.status]}</span>
                  <span className="tnum text-xs">{vnd(un)}</span>
                </label>
              )
            })}
          </div>
          {groupMates.length > 0 && <Button size="sm" tone="secondary" className="mt-2" onClick={() => setSelBookings((p) => [...p, ...groupMates.map((b) => b.id)])}>Gộp cả đoàn (+{groupMates.length} booking)</Button>}

          <h3 className="mb-2 mt-4 text-sm font-semibold">2. Chọn dòng folio (bỏ chọn để tách hoá đơn)</h3>
          <div className="max-h-56 overflow-y-auto rounded-md border border-stone-200 scrollbar-thin">
            {lines.length === 0 && <p className="p-3 text-sm text-stone-500">Chọn booking trước.</p>}
            {lines.map((l) => <LineRow key={l.id} line={l} checked={selLines.includes(l.id)} onToggle={() => setSelLines((p) => (p.includes(l.id) ? p.filter((x) => x !== l.id) : [...p, l.id]))} />)}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">3. Người mua</h3>
          <div className="space-y-3">
            <Field label="Tên đơn vị / cá nhân" required><Input value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mã số thuế"><Input value={buyer.taxCode} onChange={(e) => setBuyer({ ...buyer, taxCode: e.target.value })} /></Field>
              <Field label="Email nhận HĐ"><Input value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} /></Field>
            </div>
            <Field label="Địa chỉ"><Input value={buyer.address} onChange={(e) => setBuyer({ ...buyer, address: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saveCompany} onChange={(e) => setSaveCompany(e.target.checked)} /> Lưu thông tin công ty vào hồ sơ khách {primaryGuest ? `(${primaryGuest.name})` : ''} để dùng lại</label>
            <Field label="Thuế GTGT (%)"><Input type="number" min={0} max={20} value={vat} onChange={(e) => setVat(Number(e.target.value))} className="w-28" /></Field>
          </div>
          <div className="mt-4 rounded-md bg-stone-50 p-3 text-sm">
            <div className="flex justify-between"><span>Số dòng</span><span className="tnum">{chosen.length}</span></div>
            <div className="flex justify-between"><span>Tiền trước thuế</span><span className="tnum">{vnd(subtotal)}</span></div>
            <div className="flex justify-between"><span>Thuế GTGT {vat}%</span><span className="tnum">{vnd(total - subtotal)}</span></div>
            <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-semibold"><span>Tổng cộng</span><span className="tnum">{vnd(total)}</span></div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function LineRow({ line, checked, onToggle }: { line: FolioLine; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 border-b border-stone-100 px-3 py-1.5 text-sm hover:bg-stone-50">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="tnum w-20 text-xs text-stone-500">{fmtDate(line.date, 'dd/MM')}</span>
      <span className="truncate">{line.description}</span>
      <span className="tnum ml-auto">{vnd(line.amount)}</span>
    </label>
  )
}

// ---------- Xem / in ----------
function InvoiceView({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useStore()
  const inv = s.invoices.find((i) => i.id === id)
  if (!inv) return null
  const lines = s.folioLines.filter((l) => inv.lineIds.includes(l.id))
  const html = `<h1>HOÁ ĐƠN GIÁ TRỊ GIA TĂNG</h1><p class="muted">Số: <b>${inv.number || '(chờ cấp số)'}</b> · Ngày: ${fmtDate(inv.issuedAt || inv.createdAt)} · Mã CQT: ${inv.cqtCode ?? '—'}</p>
  <h2>Đơn vị bán</h2><p>${s.settings.hotelName}<br>${s.settings.address}<br>ĐT: ${s.settings.phone}</p>
  <h2>Người mua</h2><p>${inv.buyer.name}${inv.buyer.taxCode ? `<br>MST: ${inv.buyer.taxCode}` : ''}${inv.buyer.address ? `<br>${inv.buyer.address}` : ''}</p>
  <table><thead><tr><th>STT</th><th>Ngày</th><th>Diễn giải</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr></thead><tbody>
  ${lines.map((l, i) => `<tr><td>${i + 1}</td><td>${fmtDate(l.date)}</td><td>${l.description}</td><td class="r tnum">${l.qty}</td><td class="r tnum">${vnd(l.unitPrice)}</td><td class="r tnum">${vnd(l.amount)}</td></tr>`).join('')}
  </tbody></table>
  <p class="r">Cộng tiền hàng: <b class="tnum">${vnd(inv.subtotal)}</b><br>Thuế GTGT ${inv.vatPct}%: <b class="tnum">${vnd(inv.total - inv.subtotal)}</b><br>Tổng thanh toán: <b class="tnum">${vnd(inv.total)}</b></p>
  ${inv.note ? `<p class="muted">${inv.note}</p>` : ''}`
  return (
    <Modal open onClose={onClose} title={`Hoá đơn ${inv.number || '(chờ phát hành)'}`} wide footer={<><Button tone="ghost" onClick={onClose}>Đóng</Button><Button onClick={() => printHtml(`Hoá đơn ${inv.number}`, html)}>In / Lưu PDF</Button></>}>
      <div className="rounded-md border border-stone-200 p-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><div className="text-base font-bold">HOÁ ĐƠN GIÁ TRỊ GIA TĂNG</div><div className="text-xs text-stone-500">Mẫu số 1/001 · Ký hiệu 1C26TTL</div></div>
          <div className="text-right text-xs"><div>Số: <span className="tnum font-semibold">{inv.number || '—'}</span></div><div>Ngày: {fmtDate(inv.issuedAt || inv.createdAt)}</div><div>Mã CQT: <span className="tnum">{inv.cqtCode ?? '—'}</span></div><Badge tone={INV_STATUS[inv.status].tone}>{INV_STATUS[inv.status].label}</Badge></div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><div className="text-xs font-semibold uppercase text-stone-500">Đơn vị bán</div><div>{s.settings.hotelName}</div><div className="text-stone-600">{s.settings.address}</div></div>
          <div><div className="text-xs font-semibold uppercase text-stone-500">Người mua</div><div>{inv.buyer.name}</div>{inv.buyer.taxCode && <div className="text-stone-600">MST {inv.buyer.taxCode}</div>}{inv.buyer.address && <div className="text-stone-600">{inv.buyer.address}</div>}</div>
        </div>
        <Table className="mt-3" head={['#', 'Ngày', 'Diễn giải', 'SL', 'Đơn giá', 'Thành tiền']}>
          {lines.map((l, i) => <tr key={l.id}><Td>{i + 1}</Td><Td className="tnum">{fmtDate(l.date)}</Td><Td>{l.description}</Td><Td className="tnum text-right">{l.qty}</Td><Td className="tnum text-right">{vnd(l.unitPrice)}</Td><Td className="tnum text-right">{vnd(l.amount)}</Td></tr>)}
        </Table>
        <div className="mt-3 ml-auto w-64 text-sm">
          <div className="flex justify-between"><span>Cộng tiền hàng</span><span className="tnum">{vnd(inv.subtotal)}</span></div>
          <div className="flex justify-between"><span>Thuế GTGT {inv.vatPct}%</span><span className="tnum">{vnd(inv.total - inv.subtotal)}</span></div>
          <div className="flex justify-between border-t border-stone-200 pt-1 font-semibold"><span>Tổng thanh toán</span><span className="tnum">{vnd(inv.total)}</span></div>
        </div>
        {inv.note && <p className="mt-2 text-xs text-stone-500">{inv.note}</p>}
      </div>
    </Modal>
  )
}

function AdjustModal({ id, onClose }: { id: string; onClose: () => void }) {
  const inv = useStore((s) => s.invoices.find((i) => i.id === id))
  const toast = useStore((s) => s.toast)
  const [mode, setMode] = useState<'adjusted' | 'replaced'>('adjusted')
  const [reason, setReason] = useState('')
  const [total, setTotal] = useState(inv?.total ?? 0)
  if (!inv) return null
  return (
    <Modal open onClose={onClose} title={`Điều chỉnh / thay thế ${inv.number}`} footer={<><Button tone="ghost" onClick={onClose}>Huỷ</Button><Button disabled={!reason.trim()} onClick={() => { const r = adjustInvoice(id, mode, reason.trim(), total); if (r.error) toast(r.error, 'err'); else toast(`Đã tạo hoá đơn ${mode === 'adjusted' ? 'điều chỉnh' : 'thay thế'} ${r.invoice!.number}`); onClose() }}>Tạo hoá đơn mới</Button></>}>
      <div className="space-y-3">
        <Field label="Hình thức" hint="Điều chỉnh: sửa sai sót về tiền/thông tin, HĐ cũ vẫn tồn tại. Thay thế: huỷ hiệu lực HĐ cũ, dòng folio chuyển sang HĐ mới (RULE-07).">
          <Select value={mode} onChange={(e) => setMode(e.target.value as 'adjusted' | 'replaced')}><option value="adjusted">Hoá đơn điều chỉnh</option><option value="replaced">Hoá đơn thay thế</option></Select>
        </Field>
        <Field label="Tổng thanh toán mới (gồm VAT)"><Input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} /></Field>
        <Field label="Lý do" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Sai mã số thuế người mua" /></Field>
      </div>
    </Modal>
  )
}

// ---------- Công nợ ----------
function DebtsTab() {
  const s = useStore()
  const can = useCan()
  const [payId, setPayId] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const pay = s.debts.find((d) => d.id === payId)
  const remaining = pay ? pay.amount - pay.paid : 0
  const typeLabel: Record<Debt['partyType'], string> = { group: 'Đoàn', agent: 'Đại lý', ota: 'OTA' }
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">Sổ công nợ: phát sinh từ folio trả sau, thanh toán, số dư, hạn. Dòng đỏ = quá hạn.</p>
        <div className="flex gap-2">
          {can('invoices', 'export') && <Button size="sm" tone="secondary" onClick={() => downloadCsv(`cong-no-${today()}.csv`, [['Đối tác', 'Loại', 'Phát sinh', 'Đã trả', 'Còn lại', 'Hạn'], ...s.debts.map((d) => [d.partyName, typeLabel[d.partyType], d.amount, d.paid, d.amount - d.paid, fmtDate(d.dueDate)])])}>Xuất CSV</Button>}
          {can('invoices', 'create') && <Button size="sm" onClick={() => setNewOpen(true)}>Ghi nợ từ booking trả sau</Button>}
        </div>
      </div>
      <Table head={['Đối tác', 'Loại', 'Booking', 'Phát sinh', 'Đã trả', 'Còn lại', 'Hạn', '']}>
        {s.debts.map((d) => {
          const rem = d.amount - d.paid
          const over = rem > 0 && d.dueDate < today()
          return (
            <tr key={d.id} className={cx(over && 'bg-red-50')}>
              <Td className="font-medium">{d.partyName}</Td>
              <Td><Badge>{typeLabel[d.partyType]}</Badge></Td>
              <Td className="tnum text-xs text-stone-500">{d.bookingIds.length} booking</Td>
              <Td className="tnum">{vnd(d.amount)}</Td>
              <Td className="tnum">{vnd(d.paid)}</Td>
              <Td className={cx('tnum font-semibold', rem < 0 && 'text-emerald-700', over && 'text-red-700')}>{rem < 0 ? `Trả trước ${vnd(-rem)}` : vnd(rem)}</Td>
              <Td className={cx('tnum', over && 'font-semibold text-red-700')}>{fmtDate(d.dueDate)}{over && <div className="text-xs">Quá hạn</div>}</Td>
              <Td className="text-right">{can('invoices', 'edit') && <Button size="sm" tone="secondary" onClick={() => { setPayId(d.id); setAmount(Math.max(0, rem)); setNote('') }}>Ghi thanh toán</Button>}</Td>
            </tr>
          )
        })}
      </Table>
      {pay && (
        <Modal open onClose={() => setPayId(null)} title={`Ghi thanh toán — ${pay.partyName}`} footer={<><Button tone="ghost" onClick={() => setPayId(null)}>Huỷ</Button><Button onClick={() => { const r = recordDebtPayment(pay.id, amount, note); if (r.error) s.toast(r.error, 'err'); else { s.toast(r.prepaid ? `Đã ghi nhận, trong đó ${vnd(r.prepaid)} là khoản trả trước` : 'Đã ghi thanh toán', r.prepaid ? 'warn' : 'ok'); setPayId(null) } }}>Ghi nhận</Button></>}>
          <div className="space-y-3">
            <p className="text-sm">Số dư còn lại: <span className="tnum font-semibold">{vnd(remaining)}</span></p>
            <Field label="Số tiền" required><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
            {amount > remaining && <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">Số tiền vượt số dư {vnd(amount - remaining)} — phần vượt sẽ được ghi nhận là khoản trả trước (FR-10 US-15 AC3).</p>}
            <Field label="Ghi chú"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="UNC số…, ngày…" /></Field>
          </div>
        </Modal>
      )}
      {newOpen && <NewDebtModal onClose={() => setNewOpen(false)} />}
    </>
  )
}

function NewDebtModal({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const cands = s.bookings.filter((b) => ['checked-in', 'checked-out'].includes(b.status)).filter((b) => {
    const total = s.folioLines.filter((f) => f.bookingId === b.id).reduce((x, f) => x + f.amount, 0)
    const paid = s.payments.filter((p) => p.bookingId === b.id).reduce((x, p) => x + p.amount, 0)
    return total - paid > 0
  })
  const [bookingId, setBookingId] = useState(cands[0]?.id ?? '')
  const [partyType, setPartyType] = useState<Debt['partyType']>('group')
  const [partyName, setPartyName] = useState('')
  const [due, setDue] = useState(addDaysISO(today(), 30))
  const b = s.bookings.find((x) => x.id === bookingId)
  const g = s.guests.find((x) => x.id === b?.guestId)
  useEffect(() => { if (g) setPartyName(g.company?.name ?? g.name) }, [g?.id])
  const balance = b ? s.folioLines.filter((f) => f.bookingId === b.id).reduce((x, f) => x + f.amount, 0) - s.payments.filter((p) => p.bookingId === b.id).reduce((x, p) => x + p.amount, 0) : 0
  return (
    <Modal open onClose={onClose} title="Ghi công nợ từ booking trả sau" footer={<><Button tone="ghost" onClick={onClose}>Huỷ</Button><Button disabled={!bookingId || !partyName} onClick={() => { const r = debtFromBooking(bookingId, partyType, partyName, due); if (r.error) s.toast(r.error, 'err'); else { s.toast('Đã ghi công nợ và thanh toán "Công nợ" vào folio'); onClose() } }}>Ghi nợ {vnd(balance)}</Button></>}>
      <div className="space-y-3">
        {cands.length === 0 ? <p className="text-sm text-stone-500">Không có booking nào còn số dư chưa thanh toán.</p> : (
          <Field label="Booking còn số dư"><Select value={bookingId} onChange={(e) => setBookingId(e.target.value)}>{cands.map((c) => <option key={c.id} value={c.id}>{c.code} — {s.guests.find((x) => x.id === c.guestId)?.name} ({CHANNEL_LABEL[c.source]})</option>)}</Select></Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loại đối tác"><Select value={partyType} onChange={(e) => setPartyType(e.target.value as Debt['partyType'])}><option value="group">Đoàn</option><option value="agent">Đại lý</option><option value="ota">OTA</option></Select></Field>
          <Field label="Hạn thanh toán"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <Field label="Tên đối tác" required><Input value={partyName} onChange={(e) => setPartyName(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

// ---------- Đối soát OTA ----------
function OtaReconcile() {
  const s = useStore()
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ ref: string; otaAmount?: number; pmsAmount?: number; code?: string; status: 'match' | 'diff' | 'missing-pms' | 'missing-ota' }[] | null>(null)
  const otaBookings = s.bookings.filter((b) => b.otaRef && b.status === 'checked-out')
  const sample = () => setText(otaBookings.slice(0, 6).map((b, i) => { const amt = s.folioLines.filter((f) => f.bookingId === b.id).reduce((x, f) => x + f.amount, 0); return `${b.otaRef},${i === 2 ? amt - 50000 : amt}` }).concat(['9999000011,850000']).join('\n'))
  const run = () => {
    const rows = text.split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => { const [ref, amt] = l.split(/[,;\t]/).map((x) => x.trim()); return { ref, amt: Number(String(amt ?? '').replace(/[^\d]/g, '')) } })
    const seen = new Set<string>()
    const out: NonNullable<typeof result> = rows.map((r) => {
      seen.add(r.ref)
      const b = s.bookings.find((x) => x.otaRef === r.ref)
      if (!b) return { ref: r.ref, otaAmount: r.amt, status: 'missing-pms' as const }
      const pms = s.folioLines.filter((f) => f.bookingId === b.id).reduce((x, f) => x + f.amount, 0)
      return { ref: r.ref, otaAmount: r.amt, pmsAmount: pms, code: b.code, status: Math.abs(pms - r.amt) < 1 ? 'match' as const : 'diff' as const }
    })
    for (const b of otaBookings) if (!seen.has(b.otaRef!)) out.push({ ref: b.otaRef!, pmsAmount: s.folioLines.filter((f) => f.bookingId === b.id).reduce((x, f) => x + f.amount, 0), code: b.code, status: 'missing-ota' })
    setResult(out)
    s.audit('Đối soát OTA', 'debt', undefined, undefined, { rows: rows.length, match: out.filter((x) => x.status === 'match').length, diff: out.filter((x) => x.status !== 'match').length })
  }
  const STATUS = { match: { l: 'Khớp', t: 'ok' as const }, diff: { l: 'Lệch số tiền', t: 'err' as const }, 'missing-pms': { l: 'Không có trong PMS', t: 'warn' as const }, 'missing-ota': { l: 'OTA chưa báo', t: 'neutral' as const } }
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div>
        <Field label="Dán file đối soát của OTA" hint="Mỗi dòng: mã booking OTA, số tiền (phân cách bằng dấu phẩy / tab).">
          <Textarea className="min-h-48 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} placeholder={'1234567890,1500000\n2345678901,980000'} />
        </Field>
        <div className="mt-2 flex gap-2"><Button size="sm" tone="secondary" onClick={sample}>Dữ liệu mẫu</Button><Button size="sm" disabled={!text.trim()} onClick={run}>Đối soát</Button></div>
      </div>
      <div>
        {!result ? <Empty title="Chưa đối soát" hint="Khớp theo mã booking OTA (otaRef) với folio đã chốt của booking đã trả phòng." /> : (
          <>
            <div className="mb-2 flex flex-wrap gap-2 text-sm">
              {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((k) => <Badge key={k} tone={STATUS[k].t}>{STATUS[k].l}: {result.filter((r) => r.status === k).length}</Badge>)}
              <Button size="sm" tone="ghost" className="ml-auto" onClick={() => downloadCsv(`doi-soat-ota-${today()}.csv`, [['Mã OTA', 'Booking PMS', 'OTA báo', 'PMS', 'Chênh lệch', 'Kết quả'], ...result.map((r) => [r.ref, r.code, r.otaAmount, r.pmsAmount, (r.otaAmount ?? 0) - (r.pmsAmount ?? 0), STATUS[r.status].l])])}>Xuất CSV</Button>
            </div>
            <Table head={['Mã OTA', 'Booking PMS', 'OTA báo', 'PMS (folio)', 'Chênh lệch', 'Kết quả']}>
              {result.map((r, i) => (
                <tr key={i} className={cx(r.status === 'diff' && 'bg-red-50')}>
                  <Td className="tnum">{r.ref}</Td>
                  <Td className="tnum">{r.code ?? '—'}</Td>
                  <Td className="tnum">{r.otaAmount !== undefined ? vnd(r.otaAmount) : '—'}</Td>
                  <Td className="tnum">{r.pmsAmount !== undefined ? vnd(r.pmsAmount) : '—'}</Td>
                  <Td className={cx('tnum', r.status === 'diff' && 'font-semibold text-red-700')}>{r.otaAmount !== undefined && r.pmsAmount !== undefined ? vnd(r.otaAmount - r.pmsAmount) : '—'}</Td>
                  <Td><Badge tone={STATUS[r.status].t}>{STATUS[r.status].l}</Badge></Td>
                </tr>
              ))}
            </Table>
          </>
        )}
      </div>
    </div>
  )
}
