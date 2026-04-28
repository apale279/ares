/** Geocoding tramite Nominatim (OSM). Rispetta l’uso: max ~1 richiesta/sec. */

const UA =
  'ARES-local-app/1.0 (emergency dispatch; contact: local)'

export type GeocodeHit = {
  lat: number
  lng: number
  displayName: string
}

export async function geocodeIndirizzo(
  query: string,
): Promise<GeocodeHit | null> {
  const q = query.trim()
  if (q.length < 3) return null
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '1')
  url.searchParams.set('addressdetails', '0')

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'it',
      'User-Agent': UA,
    },
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    lat: string
    lon: string
    display_name?: string
  }[]
  const first = data[0]
  if (!first) return null
  const lat = Number(first.lat)
  const lng = Number(first.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    lat,
    lng,
    displayName: first.display_name ?? q,
  }
}

/** Fino a 6 suggerimenti mentre si digita (Nominatim). */
export async function suggerisciIndirizzi(
  query: string,
  limit = 6,
): Promise<GeocodeHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('addressdetails', '0')

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'it',
      'User-Agent': UA,
    },
  })
  if (!res.ok) return []
  const data = (await res.json()) as {
    lat: string
    lon: string
    display_name?: string
  }[]
  return data
    .map((row) => {
      const lat = Number(row.lat)
      const lng = Number(row.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return {
        lat,
        lng,
        displayName: row.display_name ?? q,
      }
    })
    .filter((x): x is GeocodeHit => x != null)
}
