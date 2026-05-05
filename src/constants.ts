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
  modalitaSviluppo: false,
  tipiMezzo: ['MSB', 'CMR', 'MSA', '118', 'automedica'],
  ospedali: ['Ospedale A', 'Ospedale B', 'PS pediatrico'],
  pma: ['PMA Centrale', 'PMA Stazione', 'PMA Ovest'],
  postazioniPma: [
    {
      id: 'pma_default_central',
      nome: 'PMA Centrale',
      indirizzo: '',
      lat: null,
      lng: null,
      postiLetto: null,
      medici: [],
      infermieri: [],
      soccorritori: [],
      inventarioFarmaci: '',
    },
    {
      id: 'pma_default_stazione',
      nome: 'PMA Stazione',
      indirizzo: '',
      lat: null,
      lng: null,
      postiLetto: null,
      medici: [],
      infermieri: [],
      soccorritori: [],
      inventarioFarmaci: '',
    },
    {
      id: 'pma_default_ovest',
      nome: 'PMA Ovest',
      indirizzo: '',
      lat: null,
      lng: null,
      postiLetto: null,
      medici: [],
      infermieri: [],
      soccorritori: [],
      inventarioFarmaci: '',
    },
  ],
  classificazioniSoccorso: ['Emergenza', 'Urgenza differibile', 'Codice verde'],
  dettaglioClassificazioneSoccorso: {},
  motiviSoccorso: ['Motivo medico', 'Trauma', 'Non noto'],
  dettaglioMotivoSoccorso: {},
  meteoEvento: ['Sereno', 'Pioggia', 'Neve', 'Vento forte', 'Non noto'],
  luoghiEvento: ['Urbano', 'Extraurbano strada', 'Autostrada', 'Abitazione', 'Altro'],
  dettaglioLuogoEvento: {},
  segnalatoDaOpzioni: ['Cittadino', 'Forze ordine', 'Ente', '118', 'Altro'],
  esitiMissione: ['Regolare', 'Non eseguita', 'Annullata', 'Altri interventi prioritari'],
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

