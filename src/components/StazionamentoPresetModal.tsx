import { useEffect, useState } from 'react'
import type { StazionamentoMezzoPreset } from '../types'
import { geocodeIndirizzo } from '../utils/geocode'
import { MezzoStazionamentoMap } from './MezzoStazionamentoMap'
import { PhotonAddressField } from './PhotonAddressField'

export function StazionamentoPresetModal({
  open,
  preset,
  onSave,
  onClose,
}: {
  open: boolean
  preset: StazionamentoMezzoPreset | null
  onSave: (p: StazionamentoMezzoPreset) => void
  onClose: () => void
}) {
  const empty: Omit<StazionamentoMezzoPreset, 'id'> = {
    nome: '',
    indirizzo: '',
    lat: null,
    lng: null,
  }

  const [form, setForm] = useState<StazionamentoMezzoPreset>({
    id: `staz_${crypto.randomUUID()}`,
    ...empty,
  })
  const [geoBusy, setGeoBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (preset) {
      setForm({ ...preset })
    } else {
      setForm({ id: `staz_${crypto.randomUUID()}`, ...empty })
    }
  }, [open, preset])

  if (!open) return null

  return (
    <div className="ares-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ares-modal ares-modal--narrow"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ares-modal-head">
          <h2>{preset ? 'Modifica stazionamento' : 'Nuovo stazionamento'}</h2>
          <button type="button" className="ares-btn ghost" onClick={onClose}>
            Chiudi
          </button>
        </header>
        <div className="ares-modal-scroll">
          <div className="ares-form-grid tight">
            <label className="full">
              Nome stazionamento
              <input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Es. Sede Sezionale, Deposito nord…"
              />
            </label>
            <label className="full">
              Indirizzo (Photon)
              <PhotonAddressField
                value={
                  form.lat != null && form.lng != null
                    ? { display_name: form.indirizzo, lat: form.lat, lon: form.lng }
                    : null
                }
                previewText={form.lat != null && form.lng != null ? '' : form.indirizzo}
                placeholder="Cerca su mappa (via, comune…)"
                onDraftCommit={(text) => setForm((f) => ({ ...f, indirizzo: text }))}
                onChange={(hit) => {
                  if (!hit) {
                    setForm((f) => ({ ...f, indirizzo: '', lat: null, lng: null }))
                    return
                  }
                  setForm((f) => ({
                    ...f,
                    indirizzo: hit.display_name,
                    lat: hit.lat,
                    lng: hit.lon,
                  }))
                }}
              />
            </label>
            <div className="ares-row full">
              <label>
                Lat
                <input
                  type="number"
                  step="any"
                  value={form.lat ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      lat: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Lng
                <input
                  type="number"
                  step="any"
                  value={form.lng ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      lng: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className="ares-btn secondary"
                disabled={geoBusy || !form.indirizzo.trim()}
                onClick={async () => {
                  setGeoBusy(true)
                  try {
                    const hit = await geocodeIndirizzo(form.indirizzo.trim())
                    if (hit) {
                      setForm((f) => ({
                        ...f,
                        indirizzo: hit.displayName,
                        lat: hit.lat,
                        lng: hit.lng,
                      }))
                    } else alert('Indirizzo non trovato.')
                  } finally {
                    setGeoBusy(false)
                  }
                }}
              >
                {geoBusy ? '…' : 'Cerca coordinate'}
              </button>
            </div>
            <p className="ares-muted full">
              Puoi impostare coordinate a mano oppure cliccare sulla mappa qui sotto.
            </p>
          </div>
          <MezzoStazionamentoMap
            lat={form.lat}
            lng={form.lng}
            onPick={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))}
          />
          <div className="ares-inline ares-modal-actions">
            <button
              type="button"
              className="ares-btn primary"
              onClick={() => {
                const nome = form.nome.trim()
                if (!nome) {
                  alert('Indica un nome stazionamento.')
                  return
                }
                onSave({ ...form, nome })
                onClose()
              }}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
