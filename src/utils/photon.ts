/**
 * Autocomplete indirizzi tramite Photon (Komoot).
 * @see https://photon.komoot.io
 */

export type PhotonAddressValue = {
  display_name: string
  lat: number
  lon: number
}

/** Bbox Italia (lon min, lat min, lon max, lat max) per privilegiare risultati sul territorio */
const BBOX_ITALIA = '6.627,35.492,18.784,47.091'

type PhotonFeature = {
  geometry?: { type: string; coordinates?: [number, number] }
  properties?: Record<string, unknown>
}

type PhotonResponse = {
  features?: PhotonFeature[]
}

function buildDisplayName(p: Record<string, unknown>): string {
  const name = p.name != null ? String(p.name) : ''
  const street = p.street != null ? String(p.street) : ''
  const hn = p.housenumber != null ? String(p.housenumber) : ''
  const line1 = [hn, street].filter(Boolean).join(' ').trim()
  const locality =
    (p.city as string) ||
    (p.town as string) ||
    (p.village as string) ||
    (p.locality as string) ||
    (p.district as string) ||
    ''
  const pc = p.postcode != null ? String(p.postcode) : ''
  const state = (p.state as string) || (p.county as string) || ''
  const country = p.country != null ? String(p.country) : ''

  const parts: string[] = []
  if (line1) parts.push(line1)
  else if (name) parts.push(name)
  if (locality) parts.push(locality)
  if (pc) parts.push(pc)
  if (state) parts.push(state)
  if (country) parts.push(country)
  const joined = parts.filter(Boolean).join(', ')
  return joined || name || 'Indirizzo'
}

function featureToHit(f: PhotonFeature): PhotonAddressValue | null {
  const coords = f.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const [lon, lat] = coords
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const props = f.properties ?? {}
  return {
    display_name: buildDisplayName(props),
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

  const {
    limit = 8,
    lang = 'it',
    boundedItaly = true,
  } = options

  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', q)
  url.searchParams.set('lang', lang)
  url.searchParams.set('limit', String(limit))
  if (boundedItaly) {
    url.searchParams.set('bbox', BBOX_ITALIA)
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) return []

  const data = (await res.json()) as PhotonResponse
  const features = data.features ?? []
  const out: PhotonAddressValue[] = []
  for (const f of features) {
    const hit = featureToHit(f)
    if (hit) out.push(hit)
  }
  return out
}
