// Transforme dist/index.html (fichier unique produit par Vite) en dist/artifact.html :
// uniquement le contenu de <head> utile et de <body>, sans squelette de document,
// tel qu'attendu par la publication en artefact.
import { readFileSync, writeFileSync } from 'node:fs'

const html = readFileSync('dist/index.html', 'utf8')
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] ?? ''
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1] ?? ''
const titre = head.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '<title>Relève</title>'
const styles = [...head.matchAll(/<style[\s\S]*?<\/style>/gi)].map(m => m[0]).join('\n')
const liens = [...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/gi)].map(m => m[0]).join('\n')
const scripts = [...head.matchAll(/<script[\s\S]*?<\/script>/gi)].map(m => m[0].replace(' type="module" crossorigin', ' type="module"')).join('\n')

writeFileSync('dist/artifact.html', `${titre}\n${liens}\n${styles}\n${body}\n${scripts}\n`)
console.log('dist/artifact.html écrit :', (readFileSync('dist/artifact.html').length / 1024).toFixed(0), 'Ko')
