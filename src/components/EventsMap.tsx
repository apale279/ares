import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../map/leafletSetup'
import { CODICE_EVENTO_COLOR } from '../constants'
import type { Evento } from '../types'
import { useAresStore } from '../store/aresStore'
import { searchPhoton } from '../utils/photon'

function MapFocusHandler() {
  const map = useMap()
  const mapFocus = useAresStore((s) => s.mapFocus)
  const clearMapFocus = useAresStore((s) => s.clearMapFocus)

  useEffect(() => {
    if (!mapFocus) return
    map.flyTo([mapFocus.lat, mapFocus.lng], 16, { duration: 0.6 })
    clearMapFocus()
  }, [map, mapFocus, clearMapFocus])

  return null
}

function ClickToCreateEvent({
  enabled,
  onPick,
}: {
  enabled: boolean
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function ResizeInvalidate() {
  const map = useMap()
  const container = map.getContainer()
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [map, container])
  return null
}

function FitActiveEvents({ eventi }: { eventi: Evento[] }) {
  const map = useMap()
  useEffect(() => {
    const coords = eventi
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => [e.lat as number, e.lng as number] as [number, number])
    if (coords.length === 0) return
    if (coords.length === 1) {
      map.setView(coords[0], 14, { animate: false })
      return
    }
    const bounds = new LatLngBounds(coords)
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [map, eventi])
  return null
}

function MapSearchControl() {
  const map = useMap()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<
    { display_name: string; lat: number; lon: number }[]
  >([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = window.setTimeout(() => {
      searchPhoton(q, { limit: 8, lang: 'it', boundedItaly: true })
        .then((hits) => setResults(hits))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => window.clearTimeout(t)
  }, [query])

  const pick = (hit: { display_name: string; lat: number; lon: number }) => {
    map.flyTo([hit.lat, hit.lon], 16, { duration: 0.7 })
    setQuery(hit.display_name)
    setOpen(false)
  }

  return (
    <div className="ares-map-search" onMouseDown={(e) => e.stopPropagation()}>
      <input
        className="ares-map-search-input"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        placeholder="Cerca luogo sulla mappa..."
      />
      {open && (results.length > 0 || loading || query.trim().length >= 2) && (
        <div className="ares-map-search-menu">
          {loading && <div className="ares-map-search-empty">Ricerca in corso...</div>}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="ares-map-search-empty">Nessun risultato</div>
          )}
          {results.map((hit, i) => (
            <button
              key={`${hit.lat}-${hit.lon}-${i}`}
              type="button"
              className="ares-map-search-item"
              onClick={() => pick(hit)}
            >
              {hit.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export type PuntoMappaMezzo = {
  id: string
  lat: number
  lng: number
  label: string
}

export function EventsMap({
  eventi,
  puntiMezzi,
  onMarkerClick,
  onMezzoClick,
  createMode,
  onMapCreateClick,
}: {
  eventi: Evento[]
  /** Stazionamenti mezzi (coordinate) */
  puntiMezzi?: PuntoMappaMezzo[]
  onMarkerClick: (e: Evento) => void
  onMezzoClick?: (mezzoId: string) => void
  createMode: boolean
  onMapCreateClick: (lat: number, lng: number) => void
}) {
  const mapFocusKey = useAresStore((s) => s.mapFocus?.key)
  const defaultCenter = useMemo<[number, number]>(() => {
    const withCoords = eventi.filter((e) => e.lat != null && e.lng != null)
    if (withCoords.length > 0) {
      const i = Math.floor(withCoords.length / 2)
      const ev = withCoords[i]!
      return [ev.lat!, ev.lng!]
    }
    const pm = puntiMezzi?.[0]
    if (pm) return [pm.lat, pm.lng]
    return [45.4642, 9.19]
  }, [eventi, puntiMezzi])

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      className={`ares-leaflet${createMode ? ' ares-leaflet--create' : ''}`}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <ResizeInvalidate />
      <FitActiveEvents eventi={eventi} />
      <MapFocusHandler key={mapFocusKey} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapSearchControl />
      <ClickToCreateEvent
        enabled={createMode}
        onPick={onMapCreateClick}
      />
      {eventi.map((e) => {
        if (e.lat == null || e.lng == null) return null
        const color = CODICE_EVENTO_COLOR[e.codice] ?? '#94a3b8'
        return (
          <CircleMarker
            key={e.id}
            center={[e.lat, e.lng]}
            radius={10}
            pathOptions={{
              color: '#0f172a',
              weight: 1,
              fillColor: color,
              fillOpacity: 0.95,
            }}
            eventHandlers={{
              click: () => onMarkerClick(e),
            }}
          />
        )
      })}
      {(puntiMezzi ?? []).map((pm) => (
        <CircleMarker
          key={`mezzo-${pm.id}`}
          center={[pm.lat, pm.lng]}
          radius={8}
          pathOptions={{
            color: '#1e3a8a',
            weight: 2,
            fillColor: '#2563eb',
            fillOpacity: 1,
          }}
          eventHandlers={{
            click: () => onMezzoClick?.(pm.id),
          }}
        />
      ))}
    </MapContainer>
  )
}
