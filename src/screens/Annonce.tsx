import { useMemo } from 'react'
import { Btn, Ic, Pill } from '../components/ui'
import { decoderAnnonce, messageReponse, nombreDeJours, urlWhatsApp } from '../lib/annonce'
import { formatPeriode } from '../lib/domain'
import { go } from '../lib/router'
import { LienBtn } from './demo/Feuille'

/**
 * Page ouverte par un remplaçant depuis un lien WhatsApp : l'annonce, un bouton.
 * Aucune inscription, aucun serveur : tout est dans le lien.
 */
export function Annonce({ code }: { code: string }) {
  const a = useMemo(() => decoderAnnonce(code), [code])
  if (!a) {
    return (
      <div className="stack-l" style={{ maxWidth: 520, margin: '0 auto' }}>
        <section className="hero">
          <h1>Ce lien d’annonce n’est pas valide</h1>
          <p className="lead">Il est peut-être incomplet. Demandez au cabinet de vous le renvoyer.</p>
        </section>
        <Btn variant="ghost" onClick={() => go({ name: 'landing' })}>Découvrir Relève</Btn>
      </div>
    )
  }
  return (
    <div className="stack-l" style={{ maxWidth: 520, margin: '0 auto' }}>
      <section className="hero">
        <div><Pill tone="accent" icon={Ic.calendar}>Annonce de remplacement</Pill></div>
        <h1>{a.cabinet} cherche un·e remplaçant·e</h1>
        <p className="lead">Vous êtes disponible ? Répondez en un tap.</p>
      </section>
      <div className="card facts">
        <div style={{ gridColumn: '1 / -1' }}><div className="k">Dates</div><div className="v">{formatPeriode(a.du, a.au)} · {nombreDeJours(a.du, a.au)} jours</div></div>
        <div><div className="k">Lieu</div><div className="v">{a.ville}</div></div>
        <div><div className="k">Motif</div><div className="v">{a.motif}</div></div>
      </div>
      <LienBtn block grand icon={Ic.msg} href={urlWhatsApp(messageReponse(a), a.tel)}>Je suis partant(e)</LienBtn>
      <p className="small muted">Un tap : WhatsApp s’ouvre sur un message déjà écrit pour le cabinet. Aucune inscription.</p>
      <p className="tiny muted">Annonce créée avec Relève par le cabinet. Vérifiez qui vous écrit avant de transmettre vos documents.</p>
      <button type="button" className="linkbtn small" style={{ alignSelf: 'flex-start' }} onClick={() => go({ name: 'landing' })}>Découvrir Relève, le remplacement infirmier simplifié</button>
    </div>
  )
}
