import { ToastProvider } from './components/ui'
import { PRODUIT_COMPLET } from './lib/produit'
import { ProduitAnnonce } from './ProduitAnnonce'
import { ProduitComplet } from './ProduitComplet'

export default function App() {
  return <ToastProvider>{PRODUIT_COMPLET ? <ProduitComplet /> : <ProduitAnnonce />}</ToastProvider>
}
