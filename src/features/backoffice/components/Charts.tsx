// Biểu đồ SVG đơn sắc tự vẽ (không dùng thư viện): cột và thanh ngang.
import { useState } from 'react'
import { num } from '@/lib/format'

const SEA = '#0194f3'
const GREY = '#d6d3d1'

export function BarChart({ data, height = 180, format = (v: number) => num(v), compare }: { data: { label: string; value: number }[]; height?: number; format?: (v: number) => string; compare?: number[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const w = 720, padL = 48, padB = 26, padT = 12
  const max = Math.max(1, ...data.map((d) => d.value), ...(compare ?? []))
  const innerW = w - padL - 8, innerH = height - padB - padT
  const bw = innerW / Math.max(1, data.length)
  const y = (v: number) => padT + innerH - (v / max) * innerH
  const ticks = [0, 0.5, 1].map((t) => max * t)
  const step = Math.max(1, Math.ceil(data.length / 10))
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" role="img" aria-label="Biểu đồ cột">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={w - 8} y1={y(t)} y2={y(t)} stroke={GREY} strokeDasharray={i ? '2 3' : undefined} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#78716c">{short(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * bw
          const cmp = compare?.[i]
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {cmp !== undefined && <rect x={x + bw * 0.15} width={bw * 0.7} y={y(cmp)} height={Math.max(0, innerH + padT - y(cmp))} fill={GREY} opacity={0.6} />}
              <rect x={x + bw * 0.25} width={bw * 0.5} y={y(d.value)} height={Math.max(0, innerH + padT - y(d.value))} fill={hover === i ? '#0770cd' : SEA} rx={1} />
              <rect x={x} width={bw} y={padT} height={innerH} fill="transparent" />
              {i % step === 0 && <text x={x + bw / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#78716c">{d.label}</text>}
            </g>
          )
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded bg-ink px-2 py-1 text-xs text-white">
          {data[hover].label}: <span className="tnum font-semibold">{format(data[hover].value)}</span>
          {compare?.[hover] !== undefined && <span className="text-stone-300"> · kỳ trước {format(compare[hover])}</span>}
        </div>
      )}
    </div>
  )
}

export function HBars({ data, format = (v: number) => num(v) }: { data: { label: string; value: number; sub?: string }[]; format?: (v: number) => string }) {
  const total = data.reduce((x, d) => x + d.value, 0) || 1
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{d.label}</span>
            <span className="tnum shrink-0 text-stone-600">{format(d.value)} <span className="text-stone-400">· {Math.round((d.value / total) * 100)}%</span></span>
          </div>
          <div className="mt-1 h-2 w-full rounded-sm bg-stone-100"><div className="h-2 rounded-sm" style={{ width: `${(d.value / max) * 100}%`, background: SEA }} /></div>
          {d.sub && <div className="mt-0.5 text-xs text-stone-500">{d.sub}</div>}
        </li>
      ))}
      {!data.length && <li className="text-sm text-stone-500">Không có dữ liệu</li>}
    </ul>
  )
}

export function Delta({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  if (!prev) return <span className="text-stone-400">—</span>
  const d = ((cur - prev) / prev) * 100
  const good = invert ? d <= 0 : d >= 0
  return <span className={good ? 'text-emerald-700' : 'text-red-700'}>{d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(1)}% so kỳ trước</span>
}

function short(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`
  if (v >= 1e6) return `${Math.round(v / 1e6)} tr`
  if (v >= 1e3) return `${Math.round(v / 1e3)}k`
  return String(Math.round(v))
}
