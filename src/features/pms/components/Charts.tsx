// Biểu đồ đơn sắc tự vẽ bằng SVG — không dùng thư viện
import { num } from '@/lib/format'

export function BarChart({ data, height = 160, format = (v: number) => num(v) }: { data: { label: string; value: number; hint?: string }[]; height?: number; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const w = 100 / Math.max(1, data.length)
  return (
    <div>
      <svg viewBox={`0 0 100 ${height / 2}`} preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="Biểu đồ cột">
        {[0.25, 0.5, 0.75].map((t) => <line key={t} x1="0" x2="100" y1={(height / 2) * (1 - t)} y2={(height / 2) * (1 - t)} stroke="#e7e5e4" strokeWidth="0.3" />)}
        {data.map((d, i) => {
          const h = (d.value / max) * (height / 2 - 4)
          return (
            <rect key={i} x={i * w + w * 0.18} y={height / 2 - h} width={w * 0.64} height={h} className="fill-sea" rx="0.4">
              <title>{d.hint ?? `${d.label}: ${format(d.value)}`}</title>
            </rect>
          )
        })}
      </svg>
      <div className="mt-1 grid text-[10px] text-stone-500 tnum" style={{ gridTemplateColumns: `repeat(${Math.max(1, data.length)}, minmax(0, 1fr))` }}>
        {data.map((d, i) => <span key={i} className="overflow-visible whitespace-nowrap text-center">{i % Math.ceil(data.length / 7) ? '' : d.label}</span>)}
      </div>
    </div>
  )
}

export function HBars({ rows, colorOf }: { rows: { label: string; value: number; sub?: string; key: string }[]; colorOf?: (key: string) => string }) {
  const total = rows.reduce((x, r) => x + r.value, 0) || 1
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex justify-between"><span>{r.label}</span><span className="tnum text-stone-600">{r.value} · {Math.round((r.value / total) * 100)}%</span></div>
          <div className="mt-1 h-2 w-full rounded bg-stone-100"><div className={`h-2 rounded ${colorOf ? colorOf(r.key) : 'bg-sea'}`} style={{ width: `${(r.value / total) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}
