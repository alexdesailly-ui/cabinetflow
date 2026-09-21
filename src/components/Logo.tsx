/**
 * Identité de Relève. Le signe : deux barres qui se chevauchent, l'une
 * prenant le relais de l'autre. Monochrome, lisible à 16 px.
 */
export function Mark({ size = 28, radius }: { size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.24)
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <rect width="64" height="64" rx={(r / size) * 64} fill="var(--accent)" />
      <rect x="13" y="22" width="26" height="9" rx="4.5" fill="#fff" />
      <rect x="25" y="34" width="26" height="9" rx="4.5" fill="#fff" fillOpacity=".92" />
    </svg>
  )
}

export function Logo({ size = 26, label = true }: { size?: number; label?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.32), color: 'var(--text)', fontWeight: 700, fontSize: size * 0.72, letterSpacing: '-.02em', lineHeight: 1 }}>
      <Mark size={size} />
      {label && <span>Relève</span>}
    </span>
  )
}

/** Version autonome du signe pour les fichiers statiques (favicon, icônes). */
export const MARK_SVG = (bg = '#0E7C6B', rx = 14) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rx}" fill="${bg}"/><rect x="13" y="22" width="26" height="9" rx="4.5" fill="#fff"/><rect x="25" y="34" width="26" height="9" rx="4.5" fill="#fff" fill-opacity=".92"/></svg>`
