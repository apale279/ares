/**
 * Autocomplete indirizzi tramite Mapbox Geocoding API.
 * @see https://docs.mapbox.com/api/search/geocoding/
 */
import { suggerisciIndirizzi } from './geocode'

export type PhotonAddressValue = {
  display_name: string
  lat: number
  lon: number
}

const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ||
  'pk.eyJ1IjoiYXBhbGUyNzkiLCJhIjoiY21vN3Fmd2ttMDd6cTJyc2Jqa3N0bWRsYiJ9.RaNbMYgNHeBetAGb2psU7wC'

type MapboxFeature = {
  place_name?: string
  center?: [number, number]
}

type MapboxResponse = {
  features?: MapboxFeature[]
}

function featureToHit(f: MapboxFeature): PhotonAddressValue | null {
  const coords = f.center
  if (!coords || coords.length < 2) return null
  const [lon, lat] = coords
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return {
    display_name: String(f.place_name ?? '').trim() || 'Indirizzo',
    lat,
    lon,
  }
}

export type PhotonSearchOptions = {
  limit?: number
  /** lang=it per etichette in italiano */
  lang?: string
  /** Se true (default), restringe la ricerca alla bbox Italia */
  boundedItaly?: boolean
}

export async function searchPhoton(
  query: string,
  options: PhotonSearchOptions = {},
): Promise<PhotonAddressValue[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const { limit = 8, lang = 'it', boundedItaly = true } = options
  if (!MAPBOX_TOKEN) {
    const fallback = await suggerisciIndirizzi(q, limit)
    return fallback.map((x) => ({
      display_name: x.displayName,
      lat: x.lat,
      lon: x.lng,
    }))
  }

  const encoded = encodeURIComponent(q)
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json`,
  )
  url.searchParams.set('access_token', MAPBOX_TOKEN)
  url.searchParams.set('autocomplete', 'true')
  url.searchParams.set('language', lang)
  url.searchParams.set('limit', String(Math.max(1, Math.min(limit, 10))))
  if (boundedItaly) {
    url.searchParams.set('country', 'it')
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    // Token invalido / rate limit: fallback su Nominatim per non bloccare l'utente.
    const fallback = await suggerisciIndirizzi(q, limit)
    return fallback.map((x) => ({
      display_name: x.displayName,
      lat: x.lat,
      lon: x.lng,
    }))
  }

  const data = (await res.json()) as MapboxResponse
  const features = data.features ?? []
  const out: PhotonAddressValue[] = []
  for (const f of features) {
    const hit = featureToHit(f)
    if (hit) out.push(hit)
  }
  return out
}
