import { useState } from 'react'
import { Bar, Btn, Ic, Pill, useToast } from '../components/ui'
import { urlWhatsApp } from '../lib/annonce'
import { seConnecter } from '../lib/actions'
import { BLOCS, messageAvis, NOTES, type BlocMeta } from '../lib/demoBlocs'
import {
  definirCommentaire, definirProfil, choisirOffre, estVerrouille, JOURS_ESSAI, progression, reinitialiserDemo, useDemo,
  type BlocId, type Profil,
} from '../lib/demoState'
import { go } from '../lib/router'
import { DEMO_CABINET, DEMO_REMPLACANT } from '../lib/seed'
import { BlocConfiance } from './demo/BlocConfiance'
import { BlocFinances } from './demo/BlocFinances'
import { BlocOffre } from './demo/BlocOffre'
import { BlocSignature } from './demo/BlocSignature'
import { BlocWhatsApp } from './demo/BlocWhatsApp'
import { LienBtn } from './demo/Feuille'
import { FeuillePremium } from './demo/Premium'

type Ouvert = { type: 'bloc'; id: BlocId; etape?: number } | { type: 'premium'; id: BlocId } | null

/**
 * La démonstration en cinq blocs : chacun se teste seul en 30 secondes et se note
 * d'un emoji. On arrive en version gratuite ; Premium se débloque en un tap.
 */
export function DemoHub() {
  const e = useDemo()
  const { toast } = useToast()
  const [ouvert, setOuvert] = useState<Ouvert>(null)
  const prog = progression(e)
  const essai = e.offre === 'essai'

  const fermer = () => setOuvert(null)
  const ouvrir = (id: BlocId) => setOuvert(estVerrouille(id, e.offre) ? { type: 'premium', id } : { type: 'bloc', id })
  const debloquer = (id: BlocId) => { choisirOffre('essai'); toast('Premium débloqué : les blocs 3 et 4 sont ouverts', true); setOuvert({ type: 'bloc', id }) }

  return (
    <div className="dh stack-l">
      <header className="dh-banner">
        <div className="eyebrow">Démo modulaire · 5 blocs</div>
        <h1>Testez ce qui vous parle, <span style={{ whiteSpace: 'nowrap' }}>dites-nous</span> si ça vous sert.</h1>
        <p>Cinq blocs indépendants, 30 secondes chacun. Notez-les d’un emoji (<strong>😍 utile · 😐 bof · 🙅 pas pour moi</strong>) : vos notes décident de la suite.</p>
        <div className="dh-prog">
          <Bar value={(prog.notes / prog.total) * 100} tone={prog.notes === prog.total ? 'ok' : undefined} />
          <span className="small num"><strong>{prog.notes}</strong> / {prog.total} blocs notés</span>
        </div>
        <p className="tiny muted">Aucun compte, données fictives, rien n’est envoyé sans votre accord.</p>
      </header>

      <div className={`offre-strip ${essai ? 'essai' : ''}`}>
        <Pill tone={essai ? 'ok' : 'neutral'} icon={essai ? Ic.check : Ic.lock}>{essai ? `Essai Premium · ${JOURS_ESSAI} jours` : 'Version gratuite'}</Pill>
        <button type="button" className="linkbtn small" onClick={() => setOuvert({ type: 'bloc', id: 2, etape: 2 })}>{essai ? 'Mon offre' : 'Voir Premium'}</button>
        <span className="small">{essai ? 'Tout est débloqué.' : 'L’annonce WhatsApp est ouverte ; le contrat et les finances sont Premium.'}</span>
      </div>

      <section className="stack" aria-label="Les cinq blocs">
        {BLOCS.map(b => <CarteBloc key={b.id} b={b} verrouille={estVerrouille(b.id, e.offre)} note={e.notes[b.id]} onOuvrir={() => ouvrir(b.id)} />)}
      </section>

      <EnvoiRetours />

      <footer className="dh-pied">
        <button type="button" className="linkbtn small" onClick={() => { seConnecter(DEMO_CABINET); go({ name: 'home' }) }}>Voir l’application complète (côté cabinet)</button>
        <button type="button" className="linkbtn small" onClick={() => { seConnecter(DEMO_REMPLACANT); go({ name: 'home' }) }}>Côté remplaçant</button>
        <button type="button" className="linkbtn small" onClick={() => { if (confirm('Recommencer la démo à zéro ?')) { reinitialiserDemo(); toast('Démo remise à zéro') } }}>Recommencer</button>
        <span className="footer-liens"><a href="#/legal/mentions">Mentions légales</a><a href="#/legal/confidentialite">Confidentialité</a><a href="#/legal/cgu">CGU</a></span>
      </footer>

      {ouvert?.type === 'premium' && <FeuillePremium id={ouvert.id} onClose={fermer} onDebloquer={() => debloquer(ouvert.id)} onOffres={() => setOuvert({ type: 'bloc', id: 2, etape: 2 })} />}
      {ouvert?.type === 'bloc' && <FeuilleBloc key={`${ouvert.id}:${ouvert.etape ?? 0}`} id={ouvert.id} etape={ouvert.etape} onClose={fermer} onAller={ouvrir} />}
    </div>
  )
}

function FeuilleBloc({ id, etape, onClose, onAller }: { id: BlocId; etape?: number; onClose: () => void; onAller: (id: BlocId) => void }) {
  switch (id) {
    case 1: return <BlocWhatsApp onClose={onClose} onAller={onAller} />
    case 2: return <BlocOffre onClose={onClose} onAller={onAller} etapeInitiale={etape} />
    case 3: return <BlocSignature onClose={onClose} onAller={onAller} />
    case 4: return <BlocFinances onClose={onClose} onAller={onAller} />
    case 5: return <BlocConfiance onClose={onClose} onAller={onAller} />
  }
}

function CarteBloc({ b, verrouille, note, onOuvrir }: { b: BlocMeta; verrouille: boolean; note?: keyof typeof NOTES; onOuvrir: () => void }) {
  return (
    <button type="button" className={`bloc ${verrouille ? 'verrou' : ''} ${note ? 'est-note' : ''}`} onClick={onOuvrir} aria-label={`Bloc ${b.id} : ${b.titre}${verrouille ? ', Premium, verrouillé' : ''}`}>
      <span className="bloc-num" aria-hidden="true">{b.id}</span>
      <span className="bloc-corps">
        <span className="bloc-theme">{b.court}</span>
        <span className="bloc-titre">{b.titre}</span>
        <span className="bloc-promesse">{b.promesse}</span>
        <span className="bloc-pied">
          {b.niveau === 'premium' ? <Pill tone="accent" icon={verrouille ? Ic.lock : Ic.check}>Premium</Pill> : <Pill tone="ok">{b.niveau === 'inclus' ? 'Inclus' : 'Gratuit'}</Pill>}
          {b.statut !== 'Disponible' && <Pill tone="neutral">{b.statut}</Pill>}
          <span className="bloc-cta">{verrouille ? 'Débloquer' : note ? 'Revoir' : 'Tester · 30 s'}<Ic.chevron /></span>
        </span>
      </span>
      {note && <span className="bloc-note" aria-label={`Votre note : ${NOTES[note].libelle}`}>{NOTES[note].emoji}</span>}
    </button>
  )
}

/** Fin de parcours : un récapitulatif, un profil, un mot, et l'envoi dans la conversation d'où vient le lien. */
function EnvoiRetours() {
  const e = useDemo()
  const { toast } = useToast()
  const message = messageAvis(e)
  const nbNotes = Object.keys(e.notes).length
  const copier = async () => { try { await navigator.clipboard.writeText(message); toast('Retours copiés') } catch { toast('Copie impossible') } }
  return (
    <section className="card stack" aria-labelledby="retours-titre">
      <div className="between"><h2 id="retours-titre">Envoyer mes retours · 10 s</h2><Pill tone={nbNotes === BLOCS.length ? 'ok' : 'neutral'}>{nbNotes} / {BLOCS.length}</Pill></div>
      <div className="recap" aria-label="Récapitulatif de vos notes">
        {BLOCS.map(b => <span key={b.id} className={`recap-item ${e.notes[b.id] ? 'on' : ''}`} title={`Bloc ${b.id} · ${b.court}`}><b>{b.id}</b>{e.notes[b.id] ? NOTES[e.notes[b.id]!].emoji : '·'}</span>)}
      </div>
      <div className="field"><label>Vous êtes</label>
        <div className="chips">{(['Titulaire', 'Remplaçant', 'Autre'] as Profil[]).map(p => <button key={p} type="button" className={`chip ${e.profil === p ? 'on' : ''}`} aria-pressed={e.profil === p} onClick={() => definirProfil(p)}>{p === 'Remplaçant' ? 'Remplaçant·e' : p}</button>)}</div>
      </div>
      <input className="input" placeholder="Un mot ? (facultatif)" aria-label="Un mot, facultatif" maxLength={500} value={e.commentaire} onChange={ev => definirCommentaire(ev.target.value)} />
      {nbNotes > 0
        ? <LienBtn block icon={Ic.send} href={urlWhatsApp(message)} onClick={() => toast('Merci pour vos retours !', true)}>Envoyer par WhatsApp</LienBtn>
        : <Btn block disabled icon={Ic.send}>Envoyer par WhatsApp</Btn>}
      <div className="row">
        {nbNotes > 0 && <LienBtn variant="ghost" icon={Ic.mail} href={`mailto:?subject=${encodeURIComponent('Mes retours sur la démo Relève')}&body=${encodeURIComponent(message)}`}>Par e-mail</LienBtn>}
        {nbNotes > 0 && <Btn variant="ghost" icon={Ic.copy} onClick={copier}>Copier</Btn>}
      </div>
      <p className="tiny muted">{nbNotes === 0 ? 'Notez au moins un bloc : un emoji suffit.' : 'WhatsApp s’ouvre sur le message : choisissez la personne qui vous a envoyé ce lien.'}</p>
    </section>
  )
}
