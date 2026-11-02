import { type ReactNode, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Hàng thẻ cuộn ngang; nút trái/phải chỉ hiện khi còn nội dung để cuộn theo hướng đó */
export function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })
  const update = () => {
    const el = ref.current
    if (!el) return
    setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }
  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => { ro.disconnect(); el.removeEventListener('scroll', update) }
  }, [children])
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  const btn = 'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-md ring-1 ring-stone-200 hover:text-sea md:grid'
  return (
    <div className="relative">
      <div ref={ref} className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="region" aria-label={label}>
        {children}
      </div>
      {edge.left && <button onClick={() => go(-1)} aria-label="Trước" className={`${btn} -left-5`}><ChevronLeft size={20} /></button>}
      {edge.right && <button onClick={() => go(1)} aria-label="Sau" className={`${btn} -right-5`}><ChevronRight size={20} /></button>}
    </div>
  )
}

/** Tab dạng viên (pill) dùng cho các khối deal */
export function PillTabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={value === t.id ? 'whitespace-nowrap rounded-full bg-sea px-4 py-2 text-sm font-semibold text-white' : 'whitespace-nowrap rounded-full bg-sand px-4 py-2 text-sm font-semibold text-sea hover:bg-sea/15'}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
