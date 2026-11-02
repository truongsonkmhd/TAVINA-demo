import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Star } from 'lucide-react'
import { cx } from '@/components/ui'

export const pic = (seed: string, w = 1200, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`

/** Khung trang chuẩn: rộng tối đa 7xl, padding ngang 16px */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-[1440px] px-4 md:px-6', className)}>{children}</div>
}

/** Tiêu đề khối trang chủ / danh mục */
export function SectionHead({ title, sub, link, linkLabel }: { title: string; sub?: string; link?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        {sub && <p className="mt-1 max-w-2xl text-stone-600">{sub}</p>}
      </div>
      {link && <Link to={link} className="inline-flex items-center gap-1 font-medium text-sea hover:underline">{linkLabel ?? 'Xem tất cả'} <ChevronRight size={16} /></Link>}
    </div>
  )
}

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1 text-sm text-stone-500">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} />}
          {it.to ? <Link to={it.to} className="hover:text-sea">{it.label}</Link> : <span className="text-ink">{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function Stars({ n }: { n: number }) {
  return <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${n} sao`}>{Array.from({ length: n }).map((_, i) => <Star key={i} size={14} fill="currentColor" />)}</span>
}

/** Ảnh có tỉ lệ cố định, nền xám khi đang tải */
export function Img({ src, alt, className, ratio = 'aspect-[4/3]' }: { src: string; alt: string; className?: string; ratio?: string }) {
  return (
    <div className={cx('overflow-hidden bg-stone-200', ratio, className)}>
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  )
}

/** Đồng hồ đếm ngược mm:ss tới mốc ISO */
export function Countdown({ until, onExpire }: { until?: string; onExpire?: () => void }) {
  const [left, setLeft] = useState(() => (until ? new Date(until).getTime() - Date.now() : 0))
  useEffect(() => {
    if (!until) return
    const t = setInterval(() => {
      const l = new Date(until).getTime() - Date.now()
      setLeft(l)
      if (l <= 0) { clearInterval(t); onExpire?.() }
    }, 1000)
    return () => clearInterval(t)
  }, [until, onExpire])
  if (!until) return null
  const s = Math.max(0, Math.floor(left / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return <span className={cx('tnum font-semibold', s < 120 ? 'text-coral' : 'text-sea')}>{mm}:{ss}</span>
}

/** QR giả: lưới ô vuông sinh từ mã, chỉ để minh hoạ */
export function FakeQR({ code, size = 160 }: { code: string; size?: number }) {
  const n = 21
  let h = 2166136261
  const bits: boolean[] = []
  for (let i = 0; i < n * n; i++) {
    h ^= code.charCodeAt(i % code.length) + i
    h = Math.imul(h, 16777619) >>> 0
    bits.push((h & 0x80000) !== 0)
  }
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7)
  const cell = size / n
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Mã QR ${code}`} className="bg-white">
      {bits.map((b, i) => {
        const x = i % n, y = Math.floor(i / n)
        let on = b
        if (finder(x, y)) {
          const lx = x < 7 ? x : x - (n - 7), ly = y < 7 ? y : y - (n - 7)
          on = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4)
        }
        return on ? <rect key={i} x={x * cell} y={y * cell} width={cell} height={cell} fill="#1c1917" /> : null
      })}
    </svg>
  )
}

/** Nút "Xem thêm" cho danh sách dài */
export function usePaged<T>(items: T[], pageSize: number) {
  const [n, setN] = useState(pageSize)
  useEffect(() => setN(pageSize), [items.length, pageSize])
  return { shown: items.slice(0, n), hasMore: n < items.length, more: () => setN((x) => x + pageSize), remaining: items.length - n }
}
