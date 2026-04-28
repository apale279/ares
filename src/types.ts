export type CodiceEvento = 'VERDE' | 'GIALLO' | 'ROSSO'

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
  indirizzoLimitato: boolean
  indirizzo: string
  lat: number | null
  lng: number | null
  tipoEvento: TipoEvento
  dettaglioEvento: string
  descrizione: string
  codice: CodiceEvento
  segnalatoDa: string
  /** CHIUSO è manuale; IN_ATTESA/APERTO vengono aggiornati dallo store */
  stato: StatoEvento
}

export interface MissionStateLog {
  stato: StatoMissione
  at: string
}

export interface Missione {
  id: string
  eventoId: string
  createdAt: string
  mezzoId: string
  equipaggio: Equipaggio
  stato: StatoMissione
  statoHistory: MissionStateLog[]
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
  arrivoInOspedaleAt: string | null
  /** Impostato in automazione quando il mezzo è in ARRIVATO_IN_H verso PMA */
  pmaArrivoAt: string | null
  /** Fine percorso ospedale (automazione ARRIVATO_IN_H) o fine PMA (esito valutazione PMA) */
  trasportoCompletatoAt: string | null
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
  esito: EsitoValutazionePMA
  esitoAltroNote: string
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
