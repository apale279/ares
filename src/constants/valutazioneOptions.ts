/** Opzioni fisse (non da impostazioni) */

import type { EsitoValutazionePMA } from '../types'

export const ESITO_PMA_OPTS: { v: EsitoValutazionePMA; l: string }[] = [
  { v: '', l: '—' },
  { v: 'DIMESSO', l: 'Dimesso' },
  { v: 'INVIATO_PS', l: 'Inviato in PS' },
  { v: 'RIMANDATO_MMG', l: 'Rimandato a MMG' },
  { v: 'RIFIUTA_PS', l: 'Rifiuta invio in PS' },
  { v: 'AUTONOMO_PS', l: 'Decide di recarsi autonomamente in PS' },
  { v: 'SI_ALLONTANA', l: 'Si allontana' },
  { v: 'ALTRO', l: 'Altro (specificare in note)' },
]

export const COSCIENZA_MSB: { v: '' | 'A' | 'V' | 'P' | 'U'; l: string }[] = [
  { v: '', l: '—' },
  { v: 'A', l: 'A' },
  { v: 'V', l: 'V' },
  { v: 'P', l: 'P' },
  { v: 'U', l: 'U' },
]

export const RESPIRO_MSB: { v: string; l: string }[] = [
  { v: '', l: '—' },
  { v: 'normale', l: 'Normale' },
  { v: 'difficoltoso', l: 'Difficoltoso' },
  { v: 'assente', l: 'Assente' },
]

export const RESPIRO_MSA: { v: string; l: string }[] = [
  { v: '', l: '—' },
  { v: 'normale', l: 'Normale' },
  { v: 'difficoltoso', l: 'Difficoltoso' },
  { v: 'tirage', l: 'Tirage' },
  { v: 'meccanica_impegnata', l: 'Meccanica impegnata' },
  { v: 'assente', l: 'Assente' },
]

export const CIRCOLO_MSB_OPTS = ['periferico', 'centrale', 'ritmico', 'aritmico']
export const CIRCOLO_MSA_OPTS = [
  'periferico',
  'centrale',
  'ritmico',
  'aritmico',
  'assente',
]

export const CUTE_OPTS = ['normale', 'pallida', 'calda', 'fredda', 'sudata']

export const LABEL_ESITO_PAZIENTE: Record<string, string> = {
  '': '—',
  TRASPORTATO: 'Trasportato',
  RIFIUTA_TRASPORTO: 'Rifiuta trasporto',
  SI_ALLONTANA: 'Si allontana',
  DECEDUTO: 'Deceduto',
}

export function labelOpt(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}
