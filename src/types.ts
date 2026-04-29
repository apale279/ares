export type CodiceEvento = 'VERDE' | 'GIALLO' | 'ROSSO'
export type AppRouteKey =
  | 'dashboard'
  | 'diario'
  | 'ricerca'
  | 'impostazioni'
  | 'pma'
  | 'mezzo'

export type TipoEvento = 'MEDICO' | 'TRAUMA' | 'NON_NOTO'

/** IN_ATTESA / APERTO sono calcolati in base alle missioni; CHIUSO è esplicito */
export type StatoEvento = 'IN_ATTESA' | 'APERTO' | 'CHIUSO'

export type StatoMissione =
  | 'ALLERTARE'
  | 'ALLERTATO'
  | 'PARTITO'
  | 'IN_POSTO'
  | 'DIRETTO_IN_H'
  | 'ARRIVATO_IN_H'
  | 'RIENTRO'
  | 'FINE_MISSIONE'

export type StatoMezzo = 'DISPONIBILE' | 'OCCUPATO' | 'NON_DISPONIBILE'

export type EsitoPaziente =
  | ''
  | 'TRASPORTATO'
  | 'RIFIUTA_TRASPORTO'
  | 'SI_ALLONTANA'
  | 'DECEDUTO'

export interface PersonaContatto {
  nome: string
  cognome: string
  telefono: string
}

export interface Equipaggio {
  autista: PersonaContatto
  capoEquipaggio: PersonaContatto
  soccorritore1: PersonaContatto
  soccorritore2: PersonaContatto
}

export interface Mezzo {
  id: string
  tipo: string
  sigla: string
  siglaRadio: string
  targa: string
  stazionamento: string
  /** Coordinate dello stazionamento (geocoding o click mappa) */
  stazionamentoLat: number | null
  stazionamentoLng: number | null
  equipaggio: Equipaggio
  stato: StatoMezzo
}

export interface Evento {
  id: string
  createdAt: string
  parentEventoId?: string | null
  indirizzoLimitato: boolean
  indirizzo: string
  lat: number | null
  lng: number | null
  tipoEvento: TipoEvento
  dettaglioEvento: string
  descrizione: string
  codice: CodiceEvento
  segnalatoDa: string
  eventoInAttesa: boolean
  /** CHIUSO è manuale; IN_ATTESA/APERTO vengono aggiornati dallo store */
  stato: StatoEvento
}

export type StatoNota = 'APERTA' | 'IN_CORSO' | 'CHIUSA'

export interface Nota {
  id: string
  createdAt: string
  titolo: string
  testo: string
  stato: StatoNota
  importante: boolean
  telegramBroadcastRequestedAt?: string | null
}

export interface MissionStateLog {
  stato: StatoMissione
  at: string
}

export interface Missione {
  id: string
  eventoId: string
  createdAt: string
  codice: CodiceEvento
  mezzoId: string
  equipaggio: Equipaggio
  stato: StatoMissione
  statoHistory: MissionStateLog[]
  tratte: TrattaMissione[]
  telegramDispatchRequestedAt?: string | null
}

export interface TrattaMissione {
  id: string
  timestamp: string
  titolo: string
  destinazione: string
  descrizione: string
}

/** Con esito TRASPORTATO: destinazione in ospedale o in PMA */
export type TipoDestinazioneTrasporto = 'OSPEDALE' | 'PMA'

export interface Paziente {
  id: string
  eventoId: string
  nome: string
  cognome: string
  dataNascita: string
  note: string
  esito: EsitoPaziente
  /** Se TRASPORTATO: ospedale o PMA */
  tipoDestinazioneTrasporto: TipoDestinazioneTrasporto
  ospedaleDestinazione: string
  /** Nome PMA da elenco impostazioni se tipoDestinazioneTrasporto === 'PMA' */
  pmaDestinazione: string
  mezzoTrasportoId: string | null
  codiceTrasporto: CodiceEvento
  arrivoInOspedaleAt: string | null
  /** Impostato in automazione quando il mezzo è in ARRIVATO_IN_H verso PMA */
  pmaArrivoAt: string | null
  /** Fine percorso ospedale (automazione ARRIVATO_IN_H) o fine PMA (esito valutazione PMA) */
  trasportoCompletatoAt: string | null
  medicoDimissionePma: string
}

export interface ParametriVitali {
  fr: string
  spo2Aa: string
  spo2O2: string
  fc: string
  pa: string
}

export interface FarmacoRiga {
  id: string
  testo: string
  timestamp: string
}

export type CoscienzaMSB = '' | 'A' | 'V' | 'P' | 'U'
export type RespiroMSB = '' | 'normale' | 'difficoltoso' | 'assente'
export type RespiroMSA =
  | ''
  | 'normale'
  | 'difficoltoso'
  | 'tirage'
  | 'meccanica_impegnata'
  | 'assente'

export interface ValutazioneMSB {
  tipo: 'MSB'
  id: string
  pazienteId: string
  timestamp: string
  missioneId: string | null
  equipaggioRiepilogo: string
  arrestoCardiaco: boolean
  coscienza: CoscienzaMSB
  respiro: RespiroMSB
  circolo: string[]
  cute: string[]
  parametriVitali: ParametriVitali
  manovre: string[]
  breveDescrizione: string
}

export interface ValutazioneMSA {
  tipo: 'MSA'
  id: string
  pazienteId: string
  timestamp: string
  missioneId: string | null
  equipaggioRiepilogo: string
  gcs: number | null
  respiro: RespiroMSA
  circolo: string[]
  cute: string[]
  parametriVitali: ParametriVitali
  farmaci: FarmacoRiga[]
  manovre: string[]
  breveDescrizione: string
}

export interface RivalutazionePMA {
  id: string
  timestamp: string
  note: string
}

export type EsitoValutazionePMA =
  | ''
  | 'DIMESSO'
  | 'INVIATO_PS'
  | 'RIMANDATO_MMG'
  | 'RIFIUTA_PS'
  | 'AUTONOMO_PS'
  | 'SI_ALLONTANA'
  | 'ALTRO'

export interface ValutazionePMA {
  tipo: 'PMA'
  id: string
  pazienteId: string
  /** Di norma da log missione ARRIVATO_IN_H, modificabile */
  dataOraArrivo: string
  apr: string
  allergie: string
  app: string
  eo: string
  farmaciSomministrati: FarmacoRiga[]
  rivalutazioni: RivalutazionePMA[]
  manovreEffettuate: string[]
  esito: EsitoValutazionePMA
  esitoAltroNote: string
  noteDimissione: string
}

export type Valutazione = ValutazioneMSB | ValutazioneMSA | ValutazionePMA

export interface Impostazioni {
  dettagliMedico: string[]
  dettagliTrauma: string[]
  dettagliNonNoto: string[]
  tipiMezzo: string[]
  ospedali: string[]
  /** Postazioni PMA (menu destinazione e vista PMA) */
  pma: string[]
  manovreMSB: string[]
  manovreMSA: string[]
  manovrePMA: string[]
  presetDimissione: string[]
  mediciPma: string[]
  rankUtente: RankUtente[]
  utenti: Utente[]
}

export interface RankUtente {
  id: string
  nome: string
  routeKeys: AppRouteKey[]
}

export interface Utente {
  id: string
  nomeUtente: string
  password: string
  rankId: string
}

export interface PanelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutPannelli {
  eventi: PanelRect
  missioni: PanelRect
  mezzi: PanelRect
  mappa: PanelRect
}
