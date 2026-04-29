import type {
  ParametriVitali,
  ValutazioneMSA,
  ValutazioneMSB,
  ValutazionePMA,
} from '../types'
import { nuovoIdValutazione } from '../utils/ids'

const vitVuoti: ParametriVitali = {
  fr: '',
  spo2Aa: '',
  spo2O2: '',
  fc: '',
  pa: '',
}

export function nuovaValutazioneMSB(
  pazienteId: string,
  idOverride?: string,
): ValutazioneMSB {
  return {
    tipo: 'MSB',
    id: idOverride ?? nuovoIdValutazione(),
    pazienteId,
    timestamp: new Date().toISOString(),
    missioneId: null,
    equipaggioRiepilogo: '',
    arrestoCardiaco: false,
    coscienza: '',
    respiro: '',
    circolo: [],
    cute: [],
    parametriVitali: { ...vitVuoti },
    manovre: [],
    breveDescrizione: '',
  }
}

export function nuovaValutazioneMSA(pazienteId: string): ValutazioneMSA {
  return {
    tipo: 'MSA',
    id: nuovoIdValutazione(),
    pazienteId,
    timestamp: new Date().toISOString(),
    missioneId: null,
    equipaggioRiepilogo: '',
    gcs: null,
    respiro: '',
    circolo: [],
    cute: [],
    parametriVitali: { ...vitVuoti },
    farmaci: [],
    manovre: [],
    breveDescrizione: '',
  }
}

export function nuovaValutazionePMA(
  pazienteId: string,
  dataOraArrivoDefault: string,
): ValutazionePMA {
  return {
    tipo: 'PMA',
    id: nuovoIdValutazione(),
    pazienteId,
    dataOraArrivo: dataOraArrivoDefault,
    apr: '',
    allergie: '',
    app: '',
    eo: '',
    farmaciSomministrati: [],
    rivalutazioni: [],
    manovreEffettuate: [],
    esito: '',
    esitoAltroNote: '',
    noteDimissione: '',
  }
}
