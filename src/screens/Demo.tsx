import { useEffect, useState } from 'react'
import { Btn, Chips, Field, Ic, Modal, Pill, useToast } from '../components/ui'
import { seConnecter } from '../lib/actions'
import { formatDate } from '../lib/domain'
import { go, type Route } from '../lib/router'
import { DEMO_CABINET, DEMO_REMPLACANT, semerDemo } from '../lib/seed'
import { reinitialiser, useStore } from '../lib/store'
import type { Account } from '../lib/types'

/**
 * Panneau de démonstration : sert à qui présente Relève à un confrère.
 * Il enchaîne des scènes préparées, remet la démo à zéro en un geste et
 * recueille l'avis à chaud — sans backend : les avis restent sur l'appareil
 * et s'envoient par email ou WhatsApp.
 */

interface Scene {
  titre: string
  dire: string
  faire: string
  persona: 'cabinet' | 'remplacant'
  route: Route
}

const SCENES: Scene[] = [
  { titre: 'Le tableau de bord', persona: 'cabinet', route: { name: 'home' },
    dire: '« Marie a 3 titulaires à Angers. Ce chiffre, c’est ce qu’elle a réussi à prendre comme congés cette année. Et voilà ce qu’elle a à faire aujourd’hui. »',
    faire: 'Faites défiler la liste « À faire » : tout est trié par urgence.' },
  { titre: 'Les candidats, vérifiés', persona: 'cabinet', route: { name: 'mission', id: 'mis-ete', onglet: 'candidatures' },
    dire: '« Trois candidats pour ses congés d’octobre. Regardez Amina : son autorisation de remplacement expire avant la fin. Sur Facebook, Marie l’aurait découvert le jour J. »',
    faire: 'Montrez le rouge sur Amina et Thomas, puis « Retenir » Julien.' },
  { titre: 'Le contrat et l’Ordre', persona: 'cabinet', route: { name: 'mission', id: 'mis-ete', onglet: 'contrat' },
    dire: '« Le contrat est prêt, avec les mentions que l’Ordre attend. Marie signe en tapant son nom, et Relève lui rappelle de le transmettre au conseil départemental avant le début. »',
    faire: 'Tapez « Marie Dubois », signez. Lisez le contrat si on vous le demande.' },
  { titre: 'La passation de tournée', persona: 'cabinet', route: { name: 'mission', id: 'mis-printemps', onglet: 'passation' },
    dire: '« Voilà ce que reçoit le remplaçant 7 jours avant : les patients en initiales, les créneaux, les soins, le chien peureux. Fini le cahier à spirale et les 40 minutes de téléphone. »',
    faire: 'Faites défiler la tournée. Insistez : initiales seulement, jamais de nom.' },
  { titre: 'La rétrocession, sans dispute', persona: 'cabinet', route: { name: 'mission', id: 'mis-printemps', onglet: 'retrocession' },
    dire: '« Le remplacement d’avril : une période réglée, une en retard de quelques jours. Le montant est calculé, l’échéance est visible des deux côtés. »',
    faire: 'Cliquez « Reversé » sur la ligne en retard.' },
  { titre: 'Le vivier de confiance', persona: 'cabinet', route: { name: 'vivier' },
    dire: '« Les remplaçants du 49, triés par confiance : dossier, recommandations vérifiées — qui n’existent que si un contrat a été signé — et proximité avec le cercle de Marie. »',
    faire: 'Ouvrez le profil de Julien : 3 recommandations, chacune datée et signée par un cabinet.' },
  { titre: 'Le parrainage', persona: 'cabinet', route: { name: 'parrainage' },
    dire: '« Chaque confrère qu’elle amène lui donne un mois offert et, surtout, la fait passer en tête de file quand un remplaçant se libère. Un filleul compte quand il a signé un contrat, pas juste créé un compte. »',
    faire: 'Cliquez « simuler » sur Cabinet Bellevue : Marie devient Référente.' },
  { titre: 'Côté remplaçant', persona: 'remplacant', route: { name: 'home' },
    dire: '« Et pour Julien : son dossier le suit de cabinet en cabinet, il voit ce qu’il touchera net avant de candidater, et ses rétrocessions dues. »',
    faire: 'Ouvrez « Voir les remplacements » : le net estimé est affiché sur chaque annonce.' },
]

const ETAPES = ['Le remplaçant vérifié', 'La rétrocession calculée et suivie', 'Le contrat + rappel Ordre', 'La passation de tournée', 'Le vivier et les recommandations', 'Le parrainage', 'Aucune']

interface Avis {
  id: string
  le: string
  role: 'Titulaire' | 'Remplaçant' | 'Autre'
  nom: string
  paierait: string[]
  reco: number
  manque: string
  commentaire: string
}

const CLE_AVIS = 'releve:avis'
const CLE_DEST = 'releve:destinataire'
function lireAvis(): Avis[] { try { return JSON.parse(localStorage.getItem(CLE_AVIS) ?? '[]') } catch { return [] } }

export function DemoPanel({ moi }: { moi: Account | null }) {
  const e = useStore()
  const { toast } = useToast()
  const [ouvert, setOuvert] = useState(false)
  const [scene, setScene] = useState(0)
  const [avisOuvert, setAvisOuvert] = useState(false)
  const [avis, setAvis] = useState<Avis[]>(lireAvis)
  const [dest, setDest] = useState(() => { try { return localStorage.getItem(CLE_DEST) ?? '' } catch { return '' } })
  const [f, setF] = useState<Omit<Avis, 'id' | 'le'>>({ role: 'Titulaire', nom: '', paierait: [], reco: 8, manque: '', commentaire: '' })

  useEffect(() => { try { localStorage.setItem(CLE_DEST, dest) } catch { /* mode privé */ } }, [dest])

  const persona = (p: Scene['persona']) => {
    const id = p === 'cabinet' ? DEMO_CABINET : DEMO_REMPLACANT
    if (e.session !== id) seConnecter(id)
  }
  const jouer = (i: number) => {
    const s = SCENES[i]
    setScene(i); persona(s.persona); go(s.route); setOuvert(false)
  }
  const reset = () => {
    reinitialiser(); semerDemo(); seConnecter(DEMO_CABINET); setScene(0); go({ name: 'home' }); setOuvert(false)
    toast('Démo remise à zéro')
  }

  const texteAvis = (a: Avis) => `Avis Relève — ${formatDate(a.le)}
Rôle : ${a.role}${a.nom ? ` · ${a.nom}` : ''}
Paierait 29 €/mois pour : ${a.paierait.join(', ') || '—'}
Recommanderait : ${a.reco}/10
Ce qui manque : ${a.manque || '—'}
Commentaire : ${a.commentaire || '—'}`

  const enregistrer = () => {
    const a: Avis = { ...f, id: Math.random().toString(36).slice(2, 8), le: new Date().toISOString() }
    const tous = [a, ...avis]
    setAvis(tous)
    try { localStorage.setItem(CLE_AVIS, JSON.stringify(tous)) } catch { /* mode privé */ }
    setF({ role: 'Titulaire', nom: '', paierait: [], reco: 8, manque: '', commentaire: '' })
    toast('Avis enregistré sur cet appareil', true)
    return a
  }
  const envoyer = (a: Avis) => {
    const corps = encodeURIComponent(texteAvis(a))
    location.href = `mailto:${dest}?subject=${encodeURIComponent('Avis Relève — ' + a.role)}&body=${corps}`
  }
  const partagerTous = async () => {
    const texte = avis.map(texteAvis).join('\n\n———\n\n')
    if (navigator.share) { try { await navigator.share({ title: 'Avis Relève', text: texte }); return } catch { /* annulé */ } }
    try { await navigator.clipboard.writeText(texte); toast(`${avis.length} avis copiés`) } catch { toast('Copie impossible : utilisez l’envoi par email') }
  }

  const s = SCENES[scene]
  return (
    <>
      <button className="demo-fab no-print" onClick={() => setOuvert(true)} aria-label="Ouvrir le panneau de démonstration">
        <Ic.sparkle /> Démo
      </button>

      <Modal open={ouvert} onClose={() => setOuvert(false)} title="Panneau de démonstration">
        <div className="stack">
          <p className="small muted">Pour présenter Relève à un confrère en 7 minutes. Chaque scène ouvre le bon écran avec le bon compte ; ce qu’il y a à dire et à faire est écrit dessous.</p>
          <div className="row">
            <Btn size="sm" variant="ghost" onClick={reset}>Remettre à zéro</Btn>
            <Btn size="sm" variant={moi?.id === DEMO_CABINET ? 'encre' : 'ghost'} onClick={() => { persona('cabinet'); go({ name: 'home' }); setOuvert(false) }}>Marie (cabinet)</Btn>
            <Btn size="sm" variant={moi?.id === DEMO_REMPLACANT ? 'encre' : 'ghost'} onClick={() => { persona('remplacant'); go({ name: 'home' }); setOuvert(false) }}>Julien (remplaçant)</Btn>
          </div>
          <div className="card accent stack" style={{ gap: 6 }}>
            <div className="between"><strong>Scène {scene + 1} / {SCENES.length} — {s.titre}</strong><Pill tone="neutral">{s.persona === 'cabinet' ? 'Marie' : 'Julien'}</Pill></div>
            <p className="small" style={{ fontStyle: 'italic' }}>{s.dire}</p>
            <p className="small"><strong>À faire :</strong> {s.faire}</p>
            <div className="row">
              <Btn size="sm" variant="ghost" disabled={scene === 0} onClick={() => jouer(scene - 1)}><Ic.back /> Précédente</Btn>
              <Btn size="sm" variant="encre" onClick={() => jouer(scene)}>Ouvrir cette scène</Btn>
              <Btn size="sm" variant="ghost" disabled={scene === SCENES.length - 1} onClick={() => jouer(scene + 1)}>Suivante <Ic.chevron /></Btn>
            </div>
          </div>
          <div className="list">
            {SCENES.map((sc, i) => <button key={i} className={`item tap small ${i === scene ? '' : 'muted'}`} style={{ background: 'none', border: 0, borderBottom: '1px solid var(--ligne)', textAlign: 'left', width: '100%', padding: '8px 0', cursor: 'pointer', fontWeight: i === scene ? 700 : 500 }} onClick={() => jouer(i)}><span style={{ width: 22 }}>{i + 1}.</span><span className="grow">{sc.titre}</span></button>)}
          </div>
          <div className="divider" />
          <div className="between">
            <div><strong>Avis recueillis</strong> <span className="small muted">{avis.length} sur cet appareil</span></div>
            <div className="row">
              {avis.length > 0 && <Btn size="sm" variant="ghost" icon={Ic.share} onClick={partagerTous}>Tout partager</Btn>}
              <Btn size="sm" variant="encre" icon={Ic.msg} onClick={() => { setOuvert(false); setAvisOuvert(true) }}>Recueillir un avis</Btn>
            </div>
          </div>
          <Field label="Adresse qui reçoit les avis (facultatif)" hint="Enregistrée sur cet appareil. Utilisée par le bouton « Envoyer par email »."><input id="demo-dest" className="input" type="email" value={dest} onChange={ev => setDest(ev.target.value)} placeholder="vous@exemple.fr" /></Field>
        </div>
      </Modal>

      <Modal open={avisOuvert} onClose={() => setAvisOuvert(false)} title="Votre avis, à chaud">
        <div className="stack">
          <p className="small muted">Deux minutes. Rien n’est envoyé sans votre accord : l’avis reste sur cet appareil.</p>
          <Field label="Vous êtes"><Chips options={['Titulaire', 'Remplaçant', 'Autre']} value={[f.role]} onChange={v => setF({ ...f, role: (v[v.length - 1] as Avis['role']) ?? f.role })} /></Field>
          <Field label="Prénom ou cabinet (facultatif)"><input id="avis-nom" className="input" value={f.nom} onChange={ev => setF({ ...f, nom: ev.target.value })} /></Field>
          <Field label="Pour quelle étape paieriez-vous 29 € par mois ?" hint="Plusieurs réponses possibles. C’est la question qui compte."><Chips options={ETAPES} value={f.paierait} onChange={v => setF({ ...f, paierait: v })} /></Field>
          <Field label={`Le recommanderiez-vous à un confrère ? ${f.reco}/10`}><input id="avis-reco" type="range" className="range" min={0} max={10} value={f.reco} onChange={ev => setF({ ...f, reco: +ev.target.value })} /></Field>
          <Field label="Qu’est-ce qui manque pour que vous l’utilisiez demain ?"><textarea id="avis-manque" className="textarea" value={f.manque} onChange={ev => setF({ ...f, manque: ev.target.value })} /></Field>
          <Field label="Autre chose ?"><textarea id="avis-com" className="textarea" style={{ minHeight: 64 }} value={f.commentaire} onChange={ev => setF({ ...f, commentaire: ev.target.value })} /></Field>
          <div className="row">
            <Btn variant="ghost" onClick={() => { enregistrer(); setAvisOuvert(false) }}>Enregistrer</Btn>
            <Btn variant="encre" style={{ flex: 1 }} icon={Ic.mail} onClick={() => { const a = enregistrer(); setAvisOuvert(false); envoyer(a) }}>Enregistrer et envoyer par email</Btn>
          </div>
        </div>
      </Modal>
    </>
  )
}
