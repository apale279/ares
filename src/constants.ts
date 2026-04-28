import type { StatoMissione } from './types'

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
  GIALLO: '#eab308',
  ROSSO: '#ef4444',
}

export const DEFAULT_IMPOSTAZIONI = {
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
}

