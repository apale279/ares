import { useEffect, useMemo, useState } from 'react'
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
  const addMissione = useAresStore((s) => s.addMissione)
  const updatePaziente = useAresStore((s) => s.updatePaziente)
  const mezzi = useAresStore((s) => s.mezzi)
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
  const [eventoInAttesa, setEventoInAttesa] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)
  const [mezzoMissione, setMezzoMissione] = useState('')
  const [pazNome, setPazNome] = useState('')
  const [pazCognome, setPazCognome] = useState('')
  const [pazDataNascita, setPazDataNascita] = useState('')
  const [pazNote, setPazNote] = useState('')

  const dettagli = dettagliPerTipo(impostazioni, tipoEvento)
  const mezziDisponibili = useMemo(
    () => mezzi.filter((m) => m.stato === 'DISPONIBILE'),
    [mezzi],
  )

  const submit = () => {
    const eventoId = addEvento({
      indirizzoLimitato,
      indirizzo,
      lat,
      lng,
      tipoEvento,
      dettaglioEvento,
      descrizione,
      codice,
      segnalatoDa,
      eventoInAttesa,
    })

    // addEvento crea sempre un primo paziente vuoto: lo compiliamo subito.
    const autoPaziente = [...useAresStore.getState().pazienti]
      .reverse()
      .find((p) => p.eventoId === eventoId)
    if (autoPaziente) {
      updatePaziente(autoPaziente.id, {
        nome: pazNome.trim(),
        cognome: pazCognome.trim(),
        dataNascita: pazDataNascita,
        note: pazNote.trim(),
      })
    }

    if (mezzoMissione) {
      const esitoMissione = addMissione(eventoId, mezzoMissione)
      if (!esitoMissione.ok) alert(esitoMissione.reason)
    }

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
            Luogo senza nome
          </label>
          <label>
            {indirizzoLimitato ? 'Nome luogo' : 'Indirizzo'}
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
                onDraftCommit={(text) => {
                  setIndirizzo(text)
                }}
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
              disabled={geoBusy || indirizzoLimitato}
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
          <label className="ares-check">
            <input
              type="checkbox"
              checked={eventoInAttesa}
              onChange={(e) => setEventoInAttesa(e.target.checked)}
            />
            Evento in attesa
          </label>
          <section className="ares-section">
            <h3 className="ares-section-title">Missione iniziale (opzionale)</h3>
            <label>
              Mezzo da inviare subito
              <select
                value={mezzoMissione}
                onChange={(e) => setMezzoMissione(e.target.value)}
              >
                <option value="">Nessuno</option>
                {mezziDisponibili.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.sigla} ({m.tipo})
                  </option>
                ))}
              </select>
            </label>
          </section>
          <section className="ares-section">
            <h3 className="ares-section-title">Primo paziente (facoltativo)</h3>
            <div className="ares-form-grid tight">
              <label>
                Nome
                <input
                  value={pazNome}
                  onChange={(e) => setPazNome(e.target.value)}
                />
              </label>
              <label>
                Cognome
                <input
                  value={pazCognome}
                  onChange={(e) => setPazCognome(e.target.value)}
                />
              </label>
              <label>
                Data nascita
                <input
                  type="date"
                  value={pazDataNascita}
                  onChange={(e) => setPazDataNascita(e.target.value)}
                />
              </label>
            </div>
            <label>
              Note paziente
              <textarea
                rows={2}
                value={pazNote}
                onChange={(e) => setPazNote(e.target.value)}
              />
            </label>
          </section>
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
