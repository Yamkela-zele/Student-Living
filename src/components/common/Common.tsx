import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, Inbox, LoaderCircle, X } from 'lucide-react'
import { label } from '../../utils/format'

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`btn ${className}`} {...props} />
}
export function Loader({ label = 'Loading' }: { label?: string }) {
  return <div className="state"><LoaderCircle className="animate-spin text-gold" aria-hidden="true" /><span>{label}…</span></div>
}
export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state text-red-700" role="alert"><AlertCircle aria-hidden="true" /><span>{message}</span>{retry && <Button className="btn-outline" onClick={retry}>Retry</Button>}</div>
}
export function EmptyState({ title = 'Nothing here yet', text = 'New items will appear here when they become available.' }: { title?: string; text?: string }) {
  return <div className="state"><Inbox className="text-gold" aria-hidden="true" /><strong>{title}</strong><p>{text}</p></div>
}
export function StatusBadge({ status }: { status: unknown }) {
  const value = String(status || 'UNKNOWN')
  const tone = /APPROVED|AVAILABLE|CONFIRMED|COMPLETED|RESOLVED|ACTIVE/.test(value) ? 'badge-green' : /PENDING|SUBMITTED|UNDER_REVIEW|RESERVED|OPEN/.test(value) ? 'badge-amber' : /REJECTED|SUSPENDED|CANCELLED|OCCUPIED|INACTIVE/.test(value) ? 'badge-red' : 'badge-grey'
  return <span className={`badge ${tone}`}>{label(value)}</span>
}
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement
    panel.current?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab' && panel.current) {
        const focusable = [...panel.current.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')]
        const first = focusable[0], last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [open, onClose])
  if (!open) return null
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div ref={panel} tabIndex={-1} className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="flex items-center justify-between gap-4"><h2 id="modal-title" className="text-xl font-bold">{title}</h2><button className="icon-btn" aria-label="Close dialog" onClick={onClose}><X /></button></div>{children}</div></div>
}
export function ConfirmDialog({ open, title, text, onClose, onConfirm, busy }: { open: boolean; title: string; text: string; onClose: () => void; onConfirm: () => void; busy?: boolean }) {
  return <Modal open={open} onClose={onClose} title={title}><p className="my-5 text-slate-600">{text}</p><div className="flex justify-end gap-3"><Button className="btn-outline" onClick={onClose}>Go back</Button><Button className="bg-red-700 text-white hover:bg-red-800" disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : 'Confirm'}</Button></div></Modal>
}
