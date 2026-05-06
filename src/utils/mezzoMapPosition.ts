import type { Mezzo } from '../types'

function finitePair(lat: number | null | undefined, lng: number | null | undefined) {
  if (lat == null || lng == null) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/** Coordinate per il marker del mezzo sulla dashboard (stazionamento vs posizione Telegram). */
export function coordinateMarkerMezzo(m: Mezzo): { lat: number; lng: number } | null {
  if (m.stato !== 'OCCUPATO') {
    return finitePair(m.stazionamentoLat, m.stazionamentoLng)
  }
  const reale = finitePair(m.posizioneRealeLat, m.posizioneRealeLng)
  if (reale) return reale
  return finitePair(m.stazionamentoLat, m.stazionamentoLng)
}
