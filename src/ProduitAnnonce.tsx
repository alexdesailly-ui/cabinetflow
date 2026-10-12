import { Logo } from './components/Logo'
import { go, useRoute } from './lib/router'
import { Annonce } from './screens/Annonce'
import { Annoncer } from './screens/Annoncer'
import { Landing } from './screens/Landing'
import { Legal } from './screens/Legal'

/** Le Lot 1 : accueil, outil d'annonce, page du remplaçant et mentions légales. Pas de compte. */
export function ProduitAnnonce() {
  const route = useRoute()
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-in">
          <a
            className="brand"
            href="#/"
            onClick={ev => {
              ev.preventDefault()
              go({ name: 'landing' })
            }}
            aria-label="Relève, accueil"
          >
            <Logo size={26} />
          </a>
        </div>
      </header>
      <main className="main">
        {route.name === 'annoncer' && <Annoncer />}
        {route.name === 'annonce' && <Annonce code={route.code} />}
        {route.name === 'legal' && <Legal page={route.page} />}
        {route.name !== 'annoncer' && route.name !== 'annonce' && route.name !== 'legal' && (
          <Landing />
        )}
      </main>
    </div>
  )
}
