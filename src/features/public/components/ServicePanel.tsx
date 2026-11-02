// Khối tìm kiếm dùng chung cho trang chủ và trang dịch vụ: chip danh mục con + ô tìm kiếm.
// Hai nơi dùng cùng component nên luôn giống nhau.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Hotel, Palmtree, Home as HomeIcon } from 'lucide-react'
import { cx } from '@/components/ui'
import type { ServiceKey } from '@/types'
import { SERVICES } from '../services'
import { HotelSearchBar } from './HotelSearchBar'
import { ServiceSearch, type ServiceSearchResult } from './ServiceSearch'
import { FlightSearch } from './FlightSearch'

const chip = (active: boolean) => cx('flex items-center gap-1.5 rounded-full border px-4 py-1.5', active ? 'border-sea bg-sand text-sea' : 'border-stone-200 text-sea hover:border-sea')

export function ServicePanel({ service, sub: subProp, onSub, onSubmit, initial }: {
  service: ServiceKey
  sub?: string
  onSub?: (v: string | undefined) => void
  onSubmit?: (r: ServiceSearchResult) => void
  initial?: Record<string, string>
}) {
  const [subState, setSubState] = useState<string | undefined>(subProp)
  const sub = onSub ? subProp : subState
  const setSub = onSub ?? setSubState

  if (service === 'hotel') {
    return (
      <>
        <div className="mb-4 flex flex-wrap gap-2 text-sm font-semibold">
          <span className={chip(true)}>Tất cả</span>
          <Link to="/khach-san/thanh-long" className={chip(false)}><Hotel size={15} /> Khách sạn Thanh Long</Link>
          <Link to={`/khach-san?city=${encodeURIComponent('Phú Yên')}`} className={chip(false)}><Palmtree size={15} /> Resort</Link>
          <Link to={`/khach-san?city=${encodeURIComponent('Phú Yên')}`} className={chip(false)}><HomeIcon size={15} /> Homestay</Link>
        </div>
        <HotelSearchBar />
      </>
    )
  }

  // Vé máy bay: hàng tuỳ chọn (một chiều/khứ hồi…) thay cho chip danh mục; Nội địa/Quốc tế suy ra từ sân bay
  if (service === 'flight') return <FlightSearch onSubmit={onSubmit} initial={initial} />

  const info = SERVICES.find((s) => s.key === service)!
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 text-sm font-semibold">
        <button type="button" onClick={() => setSub(undefined)} className={chip(!sub)} aria-pressed={!sub}>Tất cả</button>
        {info.subcategories.map((c) => (
          <button type="button" key={c.name} onClick={() => setSub(c.name)} title={c.desc} className={chip(sub === c.name)} aria-pressed={sub === c.name}>{c.name}</button>
        ))}
      </div>
      <ServiceSearch service={service} sub={sub} onSubmit={onSubmit} initial={initial} />
    </>
  )
}
