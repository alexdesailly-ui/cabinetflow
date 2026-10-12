import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ajouterJours,
  dansNJours,
  estJourValide,
  formatDate,
  formatJourLong,
  formatPeriode,
  formatPeriodeLongue,
  jourLocal,
  nombreDeJours,
} from '../dates'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('estJourValide', () => {
  it('accepte un jour qui existe, bissextile compris', () => {
    expect(estJourValide('2026-12-31')).toBe(true)
    expect(estJourValide('2028-02-29')).toBe(true)
  })

  it.each([
    '',
    '2026-02-29',
    '2026-02-31',
    '2026-13-01',
    '2026-00-10',
    '2026-1-1',
    '26-01-01',
    'demain',
  ])('refuse « %s »', saisie => {
    expect(estJourValide(saisie)).toBe(false)
  })
})

describe('ajouterJours', () => {
  it('franchit les fins de mois et d’année, vers l’avant comme vers l’arrière', () => {
    expect(ajouterJours('2026-12-28', 5)).toBe('2027-01-02')
    expect(ajouterJours('2026-03-01', -1)).toBe('2026-02-28')
    expect(ajouterJours('2028-02-28', 1)).toBe('2028-02-29')
  })

  it.each(['Europe/Paris', 'America/Guadeloupe', 'Pacific/Tahiti', 'Indian/Reunion'])(
    'ignore le changement d’heure et le fuseau (%s)',
    fuseau => {
      vi.stubEnv('TZ', fuseau)
      expect(ajouterJours('2026-03-28', 3)).toBe('2026-03-31')
      expect(ajouterJours('2026-10-24', 3)).toBe('2026-10-27')
    },
  )
})

describe('jour local', () => {
  it('suit le calendrier du lieu, pas celui de Greenwich', () => {
    const instant = new Date('2026-11-25T01:30:00Z')
    vi.stubEnv('TZ', 'Europe/Paris')
    expect(jourLocal(instant)).toBe('2026-11-25')
    vi.stubEnv('TZ', 'America/Guadeloupe')
    expect(jourLocal(instant)).toBe('2026-11-24')
  })

  it('« dans 0 jour » est aujourd’hui même juste après minuit en métropole', () => {
    vi.stubEnv('TZ', 'Europe/Paris')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-25T23:30:00Z')) // 00 h 30 le 26 à Paris
    expect(dansNJours(0)).toBe('2026-11-26')
    expect(dansNJours(14)).toBe('2026-12-10')
  })
})

describe('nombreDeJours', () => {
  it('compte début et fin inclus', () => {
    expect(nombreDeJours('2026-12-01', '2026-12-14')).toBe(14)
    expect(nombreDeJours('2026-12-01', '2026-12-01')).toBe(1)
    expect(nombreDeJours('2026-03-27', '2026-03-30')).toBe(4) // changement d’heure compris
  })
})

describe('affichage', () => {
  it('compacte une période et n’écrit l’année qu’une fois quand elle est commune', () => {
    expect(formatPeriode('2026-11-25', '2026-12-08')).toBe('25 nov. → 8 déc. 2026')
    expect(formatPeriode('2026-12-28', '2027-01-10')).toBe('28 déc. 2026 → 10 janv. 2027')
    expect(formatPeriode('2026-11-25', '2026-12-08', 'phrase')).toBe('du 25 nov. au 8 déc. 2026')
  })

  it('écrit le jour de la semaine en toutes lettres', () => {
    expect(formatJourLong('2026-10-26')).toBe('lundi 26 octobre')
    expect(formatPeriodeLongue('2026-10-26', '2026-11-08')).toBe(
      'du lundi 26 octobre au dimanche 8 novembre 2026',
    )
    expect(formatPeriodeLongue('2026-12-28', '2027-01-10')).toBe(
      'du lundi 28 décembre 2026 au dimanche 10 janvier 2027',
    )
  })

  it.each(['Pacific/Tahiti', 'America/Guadeloupe', 'Europe/Paris'])(
    'ne décale jamais un jour (%s)',
    fuseau => {
      vi.stubEnv('TZ', fuseau)
      expect(formatDate('2026-11-25')).toBe('25 nov. 2026')
      expect(formatPeriode('2026-11-25', '2026-12-08')).toBe('25 nov. → 8 déc. 2026')
      expect(formatJourLong('2026-11-25')).toBe('mercredi 25 novembre')
    },
  )

  it('le piège existe : minuit UTC est la veille à Tahiti', () => {
    vi.stubEnv('TZ', 'Pacific/Tahiti')
    expect(new Date('2026-11-25').getDate()).toBe(24)
  })
})
