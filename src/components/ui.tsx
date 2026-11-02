import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, useEffect } from 'react'
import { X } from 'lucide-react'
import { useStore } from '@/store'

const cx = (...c: (string | number | false | undefined | null)[]) => c.filter((x) => typeof x === 'string' && x).join(' ')
export { cx }

type Tone = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
export function Button({ tone = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  const tones: Record<Tone, string> = {
    primary: 'bg-sea text-white hover:bg-sea-dark disabled:bg-stone-300',
    accent: 'bg-coral text-white hover:bg-coral-dark disabled:bg-stone-300',
    secondary: 'bg-stone-200 text-ink hover:bg-stone-300 disabled:text-stone-400',
    ghost: 'bg-transparent text-ink hover:bg-stone-200 disabled:text-stone-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-stone-300',
  }
  const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }
  return <button className={cx('inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2 disabled:cursor-not-allowed', tones[tone], sizes[size], className)} {...p} />
}

export function Card({ className, children, title, actions }: { className?: string; children: ReactNode; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={cx('min-w-0 rounded-lg bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-stone-200/70', className)}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export function Badge({ children, className, tone = 'neutral' }: { children: ReactNode; className?: string; tone?: 'neutral' | 'ok' | 'warn' | 'err' | 'info' }) {
  const tones = { neutral: 'bg-stone-100 text-stone-700', ok: 'bg-emerald-100 text-emerald-800', warn: 'bg-amber-100 text-amber-800', err: 'bg-red-100 text-red-800', info: 'bg-sky-100 text-sky-800' }
  return <span className={cx('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>
}

export function Field({ label, children, hint, error, required }: { label: string; children: ReactNode; hint?: string; error?: string; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-stone-700">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600" role="alert">{error}</span>}
    </label>
  )
}

const inputCls = 'h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-ink placeholder:text-stone-400 focus:border-sea focus:outline-none focus:ring-2 focus:ring-sea/30 disabled:bg-stone-100'
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cx(inputCls, className)} {...p} />
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cx(inputCls, className)} {...p} />
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cx(inputCls, 'h-auto min-h-20 py-2', className)} {...p} />

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={cx('max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Đóng" className="rounded p-1 text-stone-500 hover:bg-stone-100"><X size={18} /></button>
        </div>
        {children}
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'ok' | 'warn' | 'err' }) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-stone-200/70">
      <div className="text-xs font-medium text-stone-500">{label}</div>
      <div className={cx('tnum mt-1 text-2xl font-bold', tone === 'err' && 'text-red-700', tone === 'warn' && 'text-amber-700', tone === 'ok' && 'text-emerald-700')}>{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </div>
  )
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-stone-200 text-left text-xs font-semibold uppercase tracking-normal text-stone-500">{head.map((h, i) => <th key={i} className="px-3 py-2 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-stone-100">{children}</tbody>
      </table>
    </div>
  )
}
export const Td = ({ children, className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cx('px-3 py-2 align-top', className)} {...p}>{children}</td>

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-stone-200 scrollbar-thin" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', value === t.id ? 'border-sea text-sea' : 'border-transparent text-stone-500 hover:text-ink')}>
          {t.label}{t.count !== undefined && <span className="ml-1 rounded bg-stone-100 px-1.5 text-xs text-stone-600">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={cx('pointer-events-auto flex items-start justify-between gap-3 rounded-md px-4 py-3 text-sm text-white shadow-lg', t.tone === 'ok' && 'bg-emerald-700', t.tone === 'warn' && 'bg-amber-600', t.tone === 'err' && 'bg-red-700')}>
          <span>{t.text}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Đóng" className="opacity-80 hover:opacity-100"><X size={16} /></button>
        </div>
      ))}
    </div>
  )
}
