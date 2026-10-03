import type { ReactNode } from 'react'
import { PageHeader } from '../components/ui'
import { go, type PageLegale } from '../lib/router'
import cgu from '../../legal/cgu.md?raw'
import confidentialite from '../../legal/confidentialite.md?raw'
import mentions from '../../legal/mentions-legales.md?raw'

/**
 * Pages légales. Source unique : les fichiers Markdown de /legal, que l'avocat
 * peut relire et corriger directement. Rendu volontairement minimal (titres,
 * paragraphes, listes, tableaux, gras, liens).
 */
const PAGES: Record<PageLegale, { titre: string; texte: string }> = {
  mentions: { titre: 'Mentions légales', texte: mentions },
  confidentialite: { titre: 'Confidentialité', texte: confidentialite },
  cgu: { titre: 'Conditions d’utilisation', texte: cgu },
}

export function Legal({ page }: { page: PageLegale }) {
  const p = PAGES[page]
  return (
    <div className="stack-l legal" style={{ maxWidth: 760 }}>
      <PageHeader crumb={{ label: 'Retour', onClick: () => history.length > 1 ? history.back() : go({ name: 'landing' }) }} title={p.titre} />
      <div className="row">{(Object.keys(PAGES) as PageLegale[]).filter(k => k !== page).map(k => <button key={k} className="chip" onClick={() => go({ name: 'legal', page: k })}>{PAGES[k].titre}</button>)}</div>
      <article className="card stack">{rendre(p.texte)}</article>
    </div>
  )
}

export function rendreEnLigne(t: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g).filter(Boolean).map((s, i) => {
    if (s.startsWith('**')) return <strong key={i}>{s.slice(2, -2)}</strong>
    if (s.startsWith('`')) return <code key={i}>{s.slice(1, -1)}</code>
    const lien = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (lien) {
      const url = lien[2]
      const sur = url.startsWith('#') || url.startsWith('https://') || url.startsWith('mailto:')
      return sur ? <a key={i} href={url} target={url.startsWith('#') ? undefined : '_blank'} rel="noreferrer">{lien[1]}</a> : lien[1]
    }
    return s
  })
}

export function rendre(md: string): ReactNode[] {
  const blocs = md.trim().split(/\n{2,}/)
  return blocs.map((b, i) => {
    const lignes = b.split('\n')
    if (b.startsWith('# ')) return null // le titre est dans l'en-tête de page
    if (b.startsWith('## ')) return <h2 key={i}>{b.slice(3)}</h2>
    if (b.startsWith('> ')) return <div key={i} className="banner warn"><div className="grow b-text">{rendreEnLigne(lignes.map(l => l.replace(/^> ?/, '')).join(' '))}</div></div>
    if (lignes.every(l => l.startsWith('- '))) return <ul key={i}>{lignes.map((l, j) => <li key={j}>{rendreEnLigne(l.slice(2))}</li>)}</ul>
    if (lignes.every(l => l.startsWith('|'))) {
      const cellules = (l: string) => l.split('|').slice(1, -1).map(c => c.trim())
      const [entete, , ...corps] = lignes
      return (
        <div key={i} className="table-wrap"><table className="table">
          <thead><tr>{cellules(entete).map((c, j) => <th key={j}>{c}</th>)}</tr></thead>
          <tbody>{corps.map((l, j) => <tr key={j}>{cellules(l).map((c, k) => <td key={k}>{rendreEnLigne(c)}</td>)}</tr>)}</tbody>
        </table></div>
      )
    }
    return <p key={i}>{rendreEnLigne(b.replace(/\n/g, ' '))}</p>
  })
}
