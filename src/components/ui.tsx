import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import qrcode from 'qrcode-generator'

/* Icônes (trait 1.8, Lucide-like) ---------------------------------- */
const I = (d: ReactNode) => (p: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={`ic ${p.className ?? ""}`} style={p.style} aria-hidden="true">{d}</svg>
)
export const Ic = {
  home: I(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /></>),
  users: I(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M17.5 13.5a6 6 0 0 1 4 6" /></>),
  briefcase: I(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>),
  gift: I(<><rect x="3" y="8" width="18" height="4" /><path d="M5 12v8h14v-8" /><path d="M12 8v12" /><path d="M12 8c-2-4-7-3-6-1s5 1 6 1Zm0 0c2-4 7-3 6-1s-5 1-6 1Z" /></>),
  shield: I(<><path d="M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>),
  check: I(<path d="m5 12.5 4.5 4.5L19 7" />),
  alert: I(<><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4" /><path d="M12 17.5h.01" /></>),
  x: I(<><path d="M6 6l12 12" /><path d="M18 6 6 18" /></>),
  chevron: I(<path d="m9 6 6 6-6 6" />),
  back: I(<path d="m15 6-6 6 6 6" />),
  plus: I(<><path d="M12 5v14" /><path d="M5 12h14" /></>),
  star: I(<path d="m12 3 2.7 5.7 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3 1.2-6.2L3 9.5l6.3-.8L12 3Z" />),
  map: I(<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14" /><path d="M15 6v14" /></>),
  file: I(<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h6" /></>),
  euro: I(<><path d="M18 6.5A7 7 0 0 0 7.5 12 7 7 0 0 0 18 17.5" /><path d="M4 10h10" /><path d="M4 14h10" /></>),
  share: I(<><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.6" /><path d="m8.2 13.2 7.6 4.6" /></>),
  copy: I(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></>),
  msg: I(<path d="M4 5h16v11H9l-5 4V5Z" />),
  mail: I(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>),
  phone: I(<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />),
  qr: I(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v3M17 20h3M14 20h.01" /></>),
  print: I(<><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M6 14h12v7H6z" /></>),
  logout: I(<><path d="M10 4H5v16h5" /><path d="m15 8 4 4-4 4" /><path d="M19 12H9" /></>),
  sun: I(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  car: I(<><path d="M5 16 6.5 9h11L19 16" /><rect x="3" y="14" width="18" height="5" rx="1.5" /><circle cx="7.5" cy="19" r="1.5" /><circle cx="16.5" cy="19" r="1.5" /></>),
  calendar: I(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  info: I(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  trophy: I(<><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /><path d="M12 14v4M8 21h8" /></>),
  sparkle: I(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />),
}

/* Composants de base ----------------------------------------------- */
export function Btn({ children, variant = 'primary', size, block, icon: Icon, ...rest }:
  { children: ReactNode; variant?: 'primary' | 'ghost' | 'soft' | 'encre' | 'danger'; size?: 'sm'; block?: boolean; icon?: (p: { className?: string }) => JSX.Element }
  & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn ${variant} ${size ?? ''} ${block ? 'block' : ''}`} {...rest}>
      {Icon && <Icon />}{children}
    </button>
  )
}

export function Pill({ children, tone = 'neutral', icon: Icon }: { children: ReactNode; tone?: 'ok' | 'warn' | 'danger' | 'neutral' | 'accent' | 'encre'; icon?: (p: { className?: string }) => JSX.Element }) {
  return <span className={`pill ${tone}`}>{Icon && <Icon />}{children}</span>
}

export function Ring({ value, tone }: { value: number; tone?: 'ok' | 'warn' | 'danger' }) {
  const r = 36, c = 2 * Math.PI * r
  const couleur = tone === 'ok' ? 'var(--vert)' : tone === 'warn' ? 'var(--ambre)' : tone === 'danger' ? 'var(--rouge)' : 'var(--accent)'
  return (
    <div className="ring" role="img" aria-label={`${value} %`}>
      <svg viewBox="0 0 84 84" width="84" height="84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
        <circle cx="42" cy="42" r={r} fill="none" stroke={couleur} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="val num">{value}</div>
    </div>
  )
}

export function Bar({ value, tone }: { value: number; tone?: 'ok' | 'warn' }) {
  return <div className={`bar ${tone ?? ''}`}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
}

export function Avatar({ prenom, nom, lg, encre }: { prenom: string; nom: string; lg?: boolean; encre?: boolean }) {
  return <div className={`avatar ${lg ? 'lg' : ''} ${encre ? 'encre' : ''}`}>{prenom[0]}{nom[0]}</div>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle">
      <div><div style={{ fontWeight: 600 }}>{label}</div>{hint && <div className="hint small muted">{hint}</div>}</div>
      <button type="button" role="switch" aria-checked={value} className={`switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)} aria-label={label} />
    </div>
  )
}

export function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="chips">
      {options.map(o => {
        const on = value.includes(o)
        return <button type="button" key={o} className={`chip ${on ? 'on' : ''}`} aria-pressed={on}
          onClick={() => onChange(on ? value.filter(x => x !== o) : [...value, o])}>{o}</button>
      })}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="between" style={{ marginBottom: 12 }}>
          {title ? <h2>{title}</h2> : <span />}
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer"><Ic.x /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Steps({ total, done, now }: { total: number; done: number; now?: number }) {
  return <div className="steps">{Array.from({ length: total }, (_, i) => <span key={i} className={i < done ? 'done' : i === now ? 'now' : ''} />)}</div>
}

export function QR({ text }: { text: string }) {
  const svg = useMemo(() => {
    const q = qrcode(0, 'M')
    q.addData(text)
    q.make()
    const n = q.getModuleCount()
    let path = ''
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`
    return { n, path }
  }, [text])
  return (
    <div className="qr" aria-label="QR code du lien de parrainage">
      <svg viewBox={`0 0 ${svg.n} ${svg.n}`} shapeRendering="crispEdges"><path d={svg.path} fill="#12363B" /></svg>
    </div>
  )
}

/* Toasts + confettis ------------------------------------------------ */
interface ToastCtx { toast: (msg: string, celebrate?: boolean) => void }
const Ctx = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string; celebrate?: boolean }[]>([])
  const canvas = useRef<HTMLCanvasElement>(null)
  const toast = useCallback((msg: string, celebrate?: boolean) => {
    const id = Date.now() + Math.random()
    setItems(x => [...x, { id, msg, celebrate }])
    setTimeout(() => setItems(x => x.filter(i => i.id !== id)), celebrate ? 4200 : 2800)
    if (celebrate && canvas.current && !matchMedia('(prefers-reduced-motion: reduce)').matches) confettis(canvas.current)
  }, [])
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <canvas ref={canvas} className="confetti" />
      <div className="toast-wrap" aria-live="polite">
        {items.map(i => <div key={i.id} className={`toast ${i.celebrate ? 'celebrate' : ''}`}>{i.msg}</div>)}
      </div>
    </Ctx.Provider>
  )
}

function confettis(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d')!
  c.width = innerWidth; c.height = innerHeight
  const couleurs = ['#2E7D6B', '#C2782B', '#3B8F4E', '#12363B', '#F2C94C']
  const parts = Array.from({ length: 120 }, () => ({
    x: c.width / 2 + (Math.random() - .5) * 120, y: c.height * .45,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 12 - 4,
    r: Math.random() * 6 + 3, col: couleurs[Math.floor(Math.random() * couleurs.length)], rot: Math.random() * 6,
  }))
  let t = 0
  const tick = () => {
    ctx.clearRect(0, 0, c.width, c.height)
    for (const p of parts) {
      p.x += p.vx; p.vy += .35; p.y += p.vy; p.vx *= .99; p.rot += .1
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6); ctx.restore()
    }
    if (++t < 110) requestAnimationFrame(tick); else ctx.clearRect(0, 0, c.width, c.height)
  }
  requestAnimationFrame(tick)
}
