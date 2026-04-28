import { useEffect, useMemo } from 'react'
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../map/leafletSetup'

function ResizeInvalidate() {
  const map = useMap()
  const container = map.getContainer()
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(container)
    return () => ro.disconnect()
  }, [map, container])
  return null
}

function MapClick({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function MezzoStazionamentoMap({
  lat,
  lng,
  onPick,
}: {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}) {
  const center = useMemo<[number, number]>(() => {
    if (lat != null && lng != null) return [lat, lng]
    return [45.4642, 9.19]
  }, [lat, lng])

  return (
    <div className="ares-mezzo-mini-map">
      <p className="ares-muted ares-mezzo-mini-map-hint">
        Clic sulla mappa per impostare le coordinate dello stazionamento.
      </p>
      <MapContainer
        center={center}
        zoom={lat != null && lng != null ? 15 : 12}
        style={{ height: 200, width: '100%', borderRadius: 8 }}
        scrollWheelZoom
      >
        <ResizeInvalidate />
        <TileLayer
          attribution='&copy; OSM'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClick onPick={onPick} />
        {lat != null && lng != null && (
          <CircleMarker
            center={[lat, lng]}
            radius={9}
            pathOptions={{
              color: '#0c4a6e',
              weight: 2,
              fillColor: '#38bdf8',
              fillOpacity: 0.9,
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
