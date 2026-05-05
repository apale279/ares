import type { Impostazioni, StatoMissione } from './types'

export const MISSION_STATE_ORDER: StatoMissione[] = [
  'ALLERTARE',
  'ALLERTATO',
  'PARTITO',
  'IN_POSTO',
  'DIRETTO_IN_H',
  'ARRIVATO_IN_H',
  'RIENTRO',
  'FINE_MISSIONE',
]

export const LABEL_STATO_MISSIONE: Record<StatoMissione, string> = {
  ALLERTARE: 'Allertare',
  ALLERTATO: 'Allertato',
  PARTITO: 'Partito',
  IN_POSTO: 'In posto',
  DIRETTO_IN_H: 'Diretto in H',
  ARRIVATO_IN_H: 'Arrivato in H',
  RIENTRO: 'Rientro',
  FINE_MISSIONE: 'Fine missione',
}

export const CODICE_EVENTO_COLOR: Record<string, string> = {
  VERDE: '#22c55e',
  'VERDE/GIALLO': '#d4c11f',
  GIALLO: '#eab308',
  ROSSO: '#ef4444',
}

export function prossimoStatoMissione(stato: StatoMissione): StatoMissione {
  const i = MISSION_STATE_ORDER.indexOf(stato)
  if (i < 0 || i >= MISSION_STATE_ORDER.length - 1) return stato
  return MISSION_STATE_ORDER[i + 1]!
}

export const DEFAULT_IMPOSTAZIONI: Impostazioni = {
  dettagliMedico: ['dolore toracico', 'dispnea', 'sincope', 'alterazione stato coscienza'],
  dettagliTrauma: ['trauma cranico', 'politrauma', 'trauma arti', 'ustioni'],
  dettagliNonNoto: ['da accertare', 'segnalazione generica'],
  tipiMezzo: ['MSB', 'CMR', 'MSA', '118', 'automedica'],
  ospedali: ['Ospedale A', 'Ospedale B', 'PS pediatrico'],
  pma: ['PMA Centrale', 'PMA Stazione', 'PMA Ovest'],
  manovreMSB: [
    'BLS',
    'defibrillazione',
    'intubazione',
    'ventilazione con BVM',
    'accesso venoso',
    'farmaci ACLS',
  ],
  manovreMSA: [
    'ossigeno',
    'accesso venoso',
    'immobilizzazione spinale',
    'collare cervicale',
    'medicazione',
    'monitoraggio',
  ],
  manovrePMA: ['osservazione clinica', 'medicazione', 'monitoraggio', 'terapia'],
  presetDimissione: [
    'Controllo dal MMG entro 24 ore.',
    'Rientro immediato in PS in caso di peggioramento.',
  ],
  mediciPma: ['Dr. Rossi', 'Dr.ssa Bianchi'],
  rankUtente: [
    {
      id: 'rank_admin',
      nome: 'ADMIN',
      routeKeys: [
        'dashboard',
        'diario',
        'ricerca',
        'impostazioni',
        'pma',
        'pma_modulo',
        'mezzo',
      ],
    },
  ],
  utenti: [
    {
      id: 'user_admin',
      nomeUtente: 'admin',
      password: 'admin',
      rankId: 'rank_admin',
    },
  ],
}

