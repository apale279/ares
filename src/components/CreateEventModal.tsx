import { useEffect, useState } from 'react'
import type { CodiceEvento, TipoEvento } from '../types'
import { dettagliPerTipo, useAresStore } from '../store/aresStore'
import { geocodeIndirizzo } from '../utils/geocode'
import { PhotonAddressField } from './PhotonAddressField'

export function CreateEventModal({
  initialLat,
  initialLng,
  onClose,
}: {
  initialLat?: number | null
  initialLng?: number | null
  onClose: () => void
}) {
  const addEvento = useAresStore((s) => s.addEvento)
  const impostazioni = useAresStore((s) => s.impostazioni)

  const [indirizzoLimitato, setIndirizzoLimitato] = useState(false)
  const [indirizzo, setIndirizzo] = useState('')
  const [lat, setLat] = useState<number | null>(initialLat ?? null)
  const [lng, setLng] = useState<number | null>(initialLng ?? null)

  useEffect(() => {
    if (initialLat != null) setLat(initialLat)
    if (initialLng != null) setLng(initialLng)
  }, [initialLat, initialLng])
  const [tipoEvento, setTipoEvento] = useState<TipoEvento>('NON_NOTO')
  const [dettaglioEvento, setDettaglioEvento] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [codice, setCodice] = useState<CodiceEvento>('GIALLO')
  const [segnalatoDa, setSegnalatoDa] = useState('')
  const [geoBusy, setGeoBusy] = useState(false)

  const dettagli = dettagliPerTipo(impostazioni, tipoEvento)

  const submit = () => {
    addEvento({
      indirizzoLimitato,
      indirizzo,
      lat: indirizzoLimitato ? null : lat,
      lng: indirizzoLimitato ? null : lng,
      tipoEvento,
      dettaglioEvento,
      descrizione,
      codice,
      segnalatoDa,
    })
    onClose()
  }

  return (
    <div className="ares-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ares-modal ares-modal--narrow"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ares-modal-head">
          <h2>Nuovo evento</h2>
          <button type="button" className="ares-btn ghost" onClick={onClose}>
            Chiudi
          </button>
        </header>
        <div className="ares-modal-scroll">
          <label className="ares-check">
            <input
              type="checkbox"
              checked={indirizzoLimitato}
              onChange={(e) => setIndirizzoLimitato(e.target.checked)}
            />
            Evento limitato (testo libero)
          </label>
          <label>
            {indirizzoLimitato ? 'Luogo / settore' : 'Indirizzo'}
            {indirizzoLimitato ? (
              <input
                value={indirizzo}
                onChange={(e) => setIndirizzo(e.target.value)}
              />
            ) : (
              <PhotonAddressField
                value={
                  lat != null && lng != null
                    ? { display_name: indirizzo, lat, lon: lng }
                    : null
                }
                previewText={lat != null && lng != null ? '' : indirizzo}
                placeholder="Cerca un indirizzo in Italia (via, piazza, comune…)"
                onChange={(hit) => {
                  if (!hit) {
                    setIndirizzo('')
                    setLat(null)
                    setLng(null)
                    return
                  }
                  setIndirizzo(hit.display_name)
                  setLat(hit.lat)
                  setLng(hit.lon)
                }}
              />
            )}
          </label>
          {!indirizzoLimitato && (
            <div className="ares-row">
              <label>
                Lat
                <input
                  type="number"
                  step="any"
                  value={lat ?? ''}
                  onChange={(e) =>
                    setLat(e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              </label>
              <label>
                Lng
                <input
                  type="number"
                  step="any"
                  value={lng ?? ''}
                  onChange={(e) =>
                    setLng(e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              </label>
              <button
                type="button"
                className="ares-btn secondary"
                disabled={geoBusy}
                onClick={async () => {
                  setGeoBusy(true)
                  try {
                    const hit = await geocodeIndirizzo(indirizzo.trim())
                    if (hit) {
                      setLat(hit.lat)
                      setLng(hit.lng)
                    } else alert('Indirizzo non trovato.')
                  } finally {
                    setGeoBusy(false)
                  }
                }}
              >
                {geoBusy ? '…' : 'Cerca coordinate'}
              </button>
            </div>
          )}
          <div>
            <span className="ares-label">Tipo evento</span>
            <div className="ares-seg">
              {(['MEDICO', 'TRAUMA', 'NON_NOTO'] as TipoEvento[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tipoEvento === t ? 'ares-seg-btn active' : 'ares-seg-btn'}
                  onClick={() => setTipoEvento(t)}
                >
                  {t === 'NON_NOTO' ? 'NON NOTO' : t}
                </button>
              ))}
            </div>
          </div>
          <label>
            Dettaglio
            <select
              value={dettaglioEvento}
              onChange={(e) => setDettaglioEvento(e.target.value)}
            >
              <option value="">—</option>
              {dettagli.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descrizione
            <textarea
              rows={3}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </label>
          <label>
            Codice
            <select
              value={codice}
              onChange={(e) => setCodice(e.target.value as CodiceEvento)}
            >
              <option value="VERDE">VERDE</option>
              <option value="GIALLO">GIALLO</option>
              <option value="ROSSO">ROSSO</option>
            </select>
          </label>
          <label>
            Segnalato da
            <input
              value={segnalatoDa}
              onChange={(e) => setSegnalatoDa(e.target.value)}
            />
          </label>
          <div className="ares-modal-actions">
            <button type="button" className="ares-btn primary" onClick={submit}>
              Crea evento
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
