import { useEffect, useState } from 'react'
import type { Role } from './types'

export type Route =
  | { name: 'landing' }
  | { name: 'invite'; code: string; nom?: string }
  | { name: 'onboarding'; role: Role; parrain?: string }
  | { name: 'home' }
  | { name: 'missions' }
  | { name: 'mission-new' }
  | { name: 'mission'; id: string; onglet?: string }
  | { name: 'vivier' }
  | { name: 'remplacant'; id: string }
  | { name: 'dossier' }
  | { name: 'parrainage' }
  | { name: 'compte' }

function parse(): Route {
  const params = new URLSearchParams(location.search)
  const p = params.get('p')
  if (p && !location.hash) return { name: 'invite', code: p, nom: params.get('n') ?? undefined }
  const h = location.hash.replace(/^#\/?/, '')
  const [a, b, c] = h.split('/')
  switch (a) {
    case '': return { name: 'landing' }
    case 'invite': return { name: 'invite', code: b ?? '', nom: c ? decodeURIComponent(c) : undefined }
    case 'onboarding': return { name: 'onboarding', role: (b === 'remplacant' ? 'remplacant' : 'cabinet'), parrain: c }
    case 'home': return { name: 'home' }
    case 'missions': return { name: 'missions' }
    case 'mission': return b === 'nouveau' ? { name: 'mission-new' } : { name: 'mission', id: b, onglet: c }
    case 'vivier': return { name: 'vivier' }
    case 'remplacant': return { name: 'remplacant', id: b }
    case 'dossier': return { name: 'dossier' }
    case 'parrainage': return { name: 'parrainage' }
    case 'compte': return { name: 'compte' }
    default: return { name: 'landing' }
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'landing': return '#/'
    case 'invite': return `#/invite/${r.code}${r.nom ? '/' + encodeURIComponent(r.nom) : ''}`
    case 'onboarding': return `#/onboarding/${r.role}${r.parrain ? '/' + r.parrain : ''}`
    case 'mission-new': return '#/mission/nouveau'
    case 'mission': return `#/mission/${r.id}${r.onglet ? '/' + r.onglet : ''}`
    case 'remplacant': return `#/remplacant/${r.id}`
    default: return `#/${r.name}`
  }
}

export function go(r: Route) {
  // Un lien ?p=CODE reste dans l'URL : on l'efface une fois lu pour que
  // l'app navigue proprement ensuite.
  if (location.search) history.replaceState(null, '', location.pathname + href(r))
  else location.hash = href(r)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
  window.scrollTo({ top: 0 })
}

export function useRoute(): Route {
  const [r, setR] = useState<Route>(parse)
  useEffect(() => {
    const h = () => setR(parse())
    window.addEventListener('hashchange', h)
    // Relecture au montage : un changement d'adresse survenu avant que
    // l'écouteur soit en place ne doit pas laisser l'écran vide.
    h()
    return () => window.removeEventListener('hashchange', h)
  }, [])
  return r
}
