import type { EsitoValutazionePMA } from '../types'

/** Esito PMA compilato: chiude il percorso PMA in anagrafica paziente. */
export function esitoPmaChiudePaziente(
  esito: EsitoValutazionePMA,
  esitoAltroNote: string,
): boolean {
  if (!esito) return false
  if (esito === 'ALTRO') return esitoAltroNote.trim().length > 0
  return true
}
