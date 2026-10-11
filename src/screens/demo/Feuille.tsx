import { useEffect, useRef, type ReactNode } from 'react'
import { Ic, Steps, useToast } from '../../components/ui'
import { bloc, NOTES } from '../../lib/demoBlocs'
import { lireEtat, noter, marquerBlocVu, useDemo, type BlocId, type Note } from '../../lib/demoState'

/** Lien qui s'ouvre dans un nouvel onglet, avec l'apparence d'un bouton (WhatsApp, e-mail). */
export function LienBtn({ href, children, variant = 'primary', block, grand, petit, icon: Icon, onClick }:
  { href: string; children: ReactNode; variant?: 'primary' | 'ghost' | 'soft'; block?: boolean; grand?: boolean; petit?: boolean; icon?: (p: { className?: string }) => JSX.Element; onClick?: () => void }) {
  const externe = /^https?:/.test(href)
  return (
    <a className={`btn ${variant} ${block ? 'block' : ''} ${grand ? 'grand' : ''} ${petit ? 'sm' : ''}`} href={href} onClick={onClick} {...(externe ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {Icon && <Icon />}{children}
    </a>
  )
}

const CIBLES = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Comportement d'une boîte de dialogue : le focus entre dedans à l'ouverture et
 * revient au bouton d'origine à la fermeture, Tab reste dans la feuille, Échap la
 * ferme, et la page derrière ne défile pas.
 */
export function useDialogue(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const fermer = useRef(onClose)
  fermer.current = onClose
  useEffect(() => {
    const origine = document.activeElement as HTMLElement | null
    const defilement = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    const touche = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { fermer.current(); return }
      if (ev.key !== 'Tab' || !ref.current) return
      const cibles = Array.from(ref.current.querySelectorAll<HTMLElement>(CIBLES))
      if (cibles.length === 0) return
      const premiere = cibles[0]
      const derniere = cibles[cibles.length - 1]
      const actif = document.activeElement
      if (ev.shiftKey && (actif === premiere || actif === ref.current)) { ev.preventDefault(); derniere.focus() }
      else if (!ev.shiftKey && actif === derniere) { ev.preventDefault(); premiere.focus() }
    }
    window.addEventListener('keydown', touche)
    return () => {
      window.removeEventListener('keydown', touche)
      document.body.style.overflow = defilement
      origine?.focus?.()
    }
  }, [])
  return ref
}

/** « Ce bloc vous sert ? » : trois emojis, toujours visibles en bas de la feuille. */
export function Notation({ id }: { id: BlocId }) {
  const e = useDemo()
  const { toast } = useToast()
  const note = e.notes[id]
  const choisir = (n: Note) => {
    const dejaNote = lireEtat().notes[id] !== undefined
    noter(id, n)
    if (!dejaNote && Object.keys(lireEtat().notes).length === 5) toast('Tour complet : merci pour vos 5 retours !', true)
  }
  return (
    <div className="notation" role="group" aria-label="Ce bloc vous est-il utile ?">
      <span className="notation-q">Utile pour vous ?</span>
      {(['top', 'bof', 'non'] as Note[]).map(n => (
        <button key={n} type="button" className={`note ${note === n ? 'on' : ''}`} aria-pressed={note === n} onClick={() => choisir(n)}>
          <span className="e" aria-hidden="true">{NOTES[n].emoji}</span><span className="l">{NOTES[n].libelle}</span>
        </button>
      ))}
    </div>
  )
}

/** Feuille de test d'un bloc : titre numéroté, étapes, contenu, retour. */
export function Feuille({ id, etape, total, onClose, children, actions }:
  { id: BlocId; etape: number; total: number; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const b = bloc(id)
  useEffect(() => { marquerBlocVu(id) }, [id])
  const ref = useDialogue(onClose)
  return (
    <div className="modal-bg">
      <div ref={ref} tabIndex={-1} className="modal feuille" role="dialog" aria-modal="true" aria-label={`Bloc ${id} · ${b.court}`}>
        <div className="feuille-tete">
          <span className="bloc-num">{id}</span>
          <div className="grow"><div className="eyebrow">Bloc {id} · {b.court}</div><h2>{b.titre}</h2></div>
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Fermer"><Ic.x /></button>
        </div>
        <Steps total={total} done={etape} now={etape} />
        <div className="feuille-corps">{children}</div>
        {actions && <div className="feuille-actions">{actions}</div>}
        <Notation id={id} />
      </div>
    </div>
  )
}

/** Propriétés communes des feuilles de bloc. */
export interface PropsBloc {
  onClose: () => void
  /** Ouvre un autre bloc (ou sa page Premium s'il est verrouillé). */
  onAller: (id: BlocId) => void
}
