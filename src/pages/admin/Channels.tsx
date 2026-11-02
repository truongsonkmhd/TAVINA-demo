import { useMemo, useState } from 'react'
import { RefreshCw, Zap, AlertTriangle, RotateCcw } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Input, Select, PageHeader, Table, Td, Badge, cx } from '@/components/ui'
import { fmtDate, fmtDateTime, today, addDaysISO } from '@/lib/format'
import { availabilityByNight } from '@/lib/availability'
import { CHANNEL_LABEL } from '@/lib/labels'
import type { Channel, SyncLog } from '@/types'
import { updateChannelConfig, toggleClosedDate, retrySync, resyncAll, simulateOtaBooking } from '@/features/pms/actions'
import { ChannelTag, usePerm } from '@/features/pms/components/common'

const SYNC_TYPE: Record<SyncLog['type'], string> = { 'push-availability': 'Đẩy tồn', 'push-rate': 'Đẩy giá', 'pull-booking': 'Nhận booking' }
const SYNC_TONE: Record<SyncLog['status'], 'ok' | 'warn' | 'err'> = { ok: 'ok', retry: 'warn', failed: 'err' }

export default function Channels() {
  const s = useStore()
  const perm = usePerm()
  const canEdit = perm('channels', 'edit')
  const otas = s.channelConfigs.filter((c) => c.channel.startsWith('ota'))
  const [ota, setOta] = useState<Channel>(otas[0]?.channel ?? 'ota:booking')
  const [logFilter, setLogFilter] = useState<SyncLog['status'] | ''>('')
  const T = today()
  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(T, i))
  const cfg = s.channelConfigs.find((c) => c.channel === ota)!

  const grid = useMemo(() => s.roomTypes.map((rt) => ({ rt, nights: availabilityByNight(s.rooms, s.bookings, rt.id, T, addDaysISO(T, 14), cfg?.buffer[rt.id] ?? 0) })), [s.roomTypes, s.rooms, s.bookings, T, cfg])
  const logs = s.syncLogs.filter((l) => !logFilter || l.status === logFilter)
  const issues = s.syncLogs.filter((l) => l.status !== 'ok').length

  return (
    <div>
      <PageHeader title="Kênh phân phối" subtitle="Kết nối OTA qua channel manager: đồng bộ tồn & giá hai chiều, chống overbooking"
        actions={canEdit && <>
          <Button tone="secondary" onClick={() => simulateOtaBooking(ota)}><Zap size={16} /> Mô phỏng {CHANNEL_LABEL[ota]} gửi booking</Button>
          <Button onClick={resyncAll}><RefreshCw size={16} /> Đẩy đồng bộ lại</Button>
        </>} />

      {issues > 0 && <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200"><AlertTriangle size={16} />{issues} lần đồng bộ lỗi / đang thử lại — xem nhật ký bên dưới.</div>}

      <Card title="Cấu hình kênh">
        <Table head={['Kênh', 'Bật', 'Hoa hồng %', 'Hệ số giá', ...s.roomTypes.map((r) => `Mapping ${r.name}`), ...s.roomTypes.map((r) => `Giữ lại ${r.name}`)]}>
          {s.channelConfigs.map((c) => {
            const isOta = c.channel.startsWith('ota')
            return (
              <tr key={c.channel}>
                <Td><ChannelTag channel={c.channel} /></Td>
                <Td><input type="checkbox" className="h-4 w-4 accent-sea" disabled={!canEdit} checked={c.enabled} onChange={(e) => updateChannelConfig(c.channel, { enabled: e.target.checked })} aria-label={`Bật ${CHANNEL_LABEL[c.channel]}`} /></Td>
                <Td><Input type="number" className="h-8 w-20" disabled={!canEdit} defaultValue={c.commissionPct} onBlur={(e) => Number(e.target.value) !== c.commissionPct && updateChannelConfig(c.channel, { commissionPct: Number(e.target.value) })} /></Td>
                <Td><Input type="number" step={0.05} className="h-8 w-20" disabled={!canEdit} defaultValue={c.priceMultiplier} onBlur={(e) => Number(e.target.value) !== c.priceMultiplier && updateChannelConfig(c.channel, { priceMultiplier: Number(e.target.value) })} /></Td>
                {s.roomTypes.map((r) => (
                  <Td key={r.id}>{isOta ? (
                    <Input className={cx('h-8 w-28 font-mono text-xs', !c.roomTypeMapping[r.id] && 'border-red-400 bg-red-50')} disabled={!canEdit} placeholder="Chưa map" defaultValue={c.roomTypeMapping[r.id]}
                      onBlur={(e) => e.target.value !== (c.roomTypeMapping[r.id] ?? '') && updateChannelConfig(c.channel, { roomTypeMapping: { ...c.roomTypeMapping, [r.id]: e.target.value.trim() } })} />
                  ) : <span className="text-stone-400">—</span>}</Td>
                ))}
                {s.roomTypes.map((r) => (
                  <Td key={r.id}>{isOta ? <Input type="number" min={0} className="h-8 w-16" disabled={!canEdit} defaultValue={c.buffer[r.id] ?? 0} onBlur={(e) => Number(e.target.value) !== (c.buffer[r.id] ?? 0) && updateChannelConfig(c.channel, { buffer: { ...c.buffer, [r.id]: Number(e.target.value) } })} /> : <span className="text-stone-400">—</span>}</Td>
                ))}
              </tr>
            )
          })}
        </Table>
        <p className="mt-2 text-xs text-stone-500">Ô đỏ: hạng phòng chưa map với OTA — tồn & giá hạng đó không được đẩy lên kênh. "Giữ lại": số phòng không bán trên kênh (buffer chống overbooking).</p>
      </Card>

      <Card className="mt-4" title="Tồn công bố 14 ngày" actions={<Select className="h-9 w-44" value={ota} onChange={(e) => setOta(e.target.value as Channel)}>{otas.map((c) => <option key={c.channel} value={c.channel}>{CHANNEL_LABEL[c.channel]}</option>)}</Select>}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-center text-sm">
            <thead><tr className="text-xs text-stone-500"><th className="px-2 py-2 text-left">Hạng</th>{days.map((d) => <th key={d} className="px-1 py-2 font-medium">{fmtDate(d, 'EEEEEE')}<br />{fmtDate(d, 'dd/MM')}</th>)}</tr></thead>
            <tbody>
              {grid.map(({ rt, nights }) => (
                <tr key={rt.id} className="border-t border-stone-100">
                  <td className="px-2 py-2 text-left font-semibold">{rt.name}{cfg.buffer[rt.id] ? <span className="block text-xs font-normal text-stone-500">giữ lại {cfg.buffer[rt.id]}</span> : null}</td>
                  {nights.map((n) => {
                    const closed = cfg.closedDates.includes(n.night) || !cfg.enabled
                    return <td key={n.night} className={cx('tnum px-1 py-2 font-semibold', closed ? 'bg-stone-200 text-stone-400 line-through' : n.available === 0 ? 'bg-red-100 text-red-700' : n.available <= 2 ? 'bg-amber-50 text-amber-800' : 'text-emerald-700')}>{n.available}</td>
                  })}
                </tr>
              ))}
              <tr className="border-t border-stone-200">
                <td className="px-2 py-2 text-left text-xs text-stone-500">Đóng bán</td>
                {days.map((d) => <td key={d} className="py-2"><input type="checkbox" className="accent-red-600" disabled={!canEdit} checked={cfg.closedDates.includes(d)} onChange={() => toggleClosedDate(ota, d)} aria-label={`Đóng bán ${d}`} /></td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4" title="Nhật ký đồng bộ" actions={<Select className="h-9 w-40" value={logFilter} onChange={(e) => setLogFilter(e.target.value as SyncLog['status'] | '')}><option value="">Tất cả</option><option value="ok">Thành công</option><option value="retry">Đang thử lại</option><option value="failed">Lỗi</option></Select>}>
        <Table head={['Thời gian', 'Kênh', 'Loại', 'Nội dung', 'Trạng thái', '']}>
          {logs.slice(0, 40).map((l) => (
            <tr key={l.id}>
              <Td className="tnum whitespace-nowrap text-xs">{fmtDateTime(l.at)}</Td>
              <Td><ChannelTag channel={l.channel} /></Td>
              <Td className="whitespace-nowrap">{SYNC_TYPE[l.type]}</Td>
              <Td className="text-xs">{l.detail}</Td>
              <Td><Badge tone={SYNC_TONE[l.status]}>{l.status === 'ok' ? 'OK' : l.status === 'retry' ? 'Thử lại' : 'Lỗi'}</Badge></Td>
              <Td>{l.status !== 'ok' && canEdit && <Button size="sm" tone="secondary" onClick={() => retrySync(l.id)}><RotateCcw size={14} /> Thử lại</Button>}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
