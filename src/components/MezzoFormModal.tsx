import { useEffect, useState } from 'react'
import type { Mezzo, StatoMezzo } from '../types'
import { geocodeIndirizzo } from '../utils/geocode'
import { copiaEquipaggio, equipaggioVuoto } from '../utils/equipaggio'
import { MezzoStazionamentoMap } from './MezzoStazionamentoMap'
import { PhotonAddressField } from './PhotonAddressField'

export function MezzoFormModal({
  open,
  mezzo,
  tipiMezzo,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean
  mezzo: Mezzo | null
  tipiMezzo: string[]
  onSave: (m: Omit<Mezzo, 'id'> & { id?: string }) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const empty: Omit<Mezzo, 'id'> = {
    tipo: tipiMezzo[0] ?? '',
    sigla: '',
    siglaRadio: '',
    targa: '',
    stazionamento: '',
    stazionamentoLat: null,
    stazionamentoLng: null,
    equipaggio: equipaggioVuoto(),
    stato: 'DISPONIBILE',
  }

  const [form, setForm] = useState<Omit<Mezzo, 'id'>>(empty)
  const [geoBusy, setGeoBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mezzo) {
      setForm({
        tipo: mezzo.tipo,
        sigla: mezzo.sigla,
        siglaRadio: mezzo.siglaRadio,
        targa: mezzo.targa,
        stazionamento: mezzo.stazionamento,
        stazionamentoLat: mezzo.stazionamentoLat ?? null,
        stazionamentoLng: mezzo.stazionamentoLng ?? null,
        equipaggio: copiaEquipaggio(mezzo.equipaggio),
        stato: mezzo.stato,
      })
    } else {
      setForm({
        ...empty,
        tipo: tipiMezzo[0] ?? '',
        equipaggio: equipaggioVuoto(),
      })
    }
  }, [open, mezzo, tipiMezzo])

  if (!open) return null

  const setEq = (
    role: keyof Mezzo['equipaggio'],
    field: keyof Mezzo['equipaggio']['autista'],
    value: string,
  ) => {
    setForm((f) => ({
      ...f,
      equipaggio: {
        ...f.equipaggio,
        [role]: { ...f.equipaggio[role], [field]: value },
      },
    }))
  }

  return (
    <div className="ares-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ares-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ares-modal-head">
          <h2>{mezzo ? `Modifica mezzo ${mezzo.sigla}` : 'Nuovo mezzo'}</h2>
          <button type="button" className="ares-btn ghost" onClick={onClose}>
            Chiudi
          </button>
        </header>
        <div className="ares-modal-scroll">
          <div className="ares-form-grid tight">
            <label>
              Tipo mezzo
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                {tipiMezzo.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sigla (univoca)
              <input
                value={form.sigla}
                onChange={(e) => setForm((f) => ({ ...f, sigla: e.target.value }))}
              />
            </label>
            <label>
              Sigla radio
              <input
                value={form.siglaRadio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, siglaRadio: e.target.value }))
                }
              />
            </label>
            <label>
              Targa
              <input
                value={form.targa}
                onChange={(e) => setForm((f) => ({ ...f, targa: e.target.value }))}
              />
            </label>
            <label>
              Stato mezzo
              <select
                value={form.stato}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stato: e.target.value as StatoMezzo }))
                }
              >
                <option value="DISPONIBILE">DISPONIBILE</option>
                <option value="NON_DISPONIBILE">NON DISPONIBILE</option>
              </select>
            </label>
            <label className="full">
              Stazionamento (Photon)
              <PhotonAddressField
                value={
                  form.stazionamentoLat != null && form.stazionamentoLng != null
                    ? {
                        display_name: form.stazionamento,
                        lat: form.stazionamentoLat,
                        lon: form.stazionamentoLng,
                      }
                    : null
                }
                previewText={
                  form.stazionamentoLat != null && form.stazionamentoLng != null
                    ? ''
                    : form.stazionamento
                }
                placeholder="Cerca lo stazionamento in Italia (via, sede, comune…)"
                onDraftCommit={(text) =>
                  setForm((f) => ({ ...f, stazionamento: text }))
                }
                onChange={(hit) => {
                  if (!hit) {
                    setForm((f) => ({
                      ...f,
                      stazionamento: '',
                      stazionamentoLat: null,
                      stazionamentoLng: null,
                    }))
                    return
                  }
                  setForm((f) => ({
                    ...f,
                    stazionamento: hit.display_name,
                    stazionamentoLat: hit.lat,
                    stazionamentoLng: hit.lon,
                  }))
                }}
              />
            </label>
            <div className="ares-row">
              <label>
                Lat
                <input
                  type="number"
                  step="any"
                  value={form.stazionamentoLat ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      stazionamentoLat:
                        e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Lng
                <input
                  type="number"
                  step="any"
                  value={form.stazionamentoLng ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      stazionamentoLng:
                        e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className="ares-btn secondary"
                disabled={geoBusy || !form.stazionamento.trim()}
                title="Usa il testo stazionamento (anche senza suggerimento Photon) con geocoding Nominatim"
                onClick={async () => {
                  setGeoBusy(true)
                  try {
                    const hit = await geocodeIndirizzo(form.stazionamento.trim())
                    if (hit) {
                      setForm((f) => ({
                        ...f,
                        stazionamento: hit.displayName,
                        stazionamentoLat: hit.lat,
                        stazionamentoLng: hit.lng,
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
              Coordinate attuali: Lat {form.stazionamentoLat?.toFixed(5) ?? '—'}, Lng{' '}
              {form.stazionamentoLng?.toFixed(5) ?? '—'}. Puoi modificarle a mano,
              cercarle dal testo, oppure cliccare sulla mappa sotto.
            </p>
          </div>

          <MezzoStazionamentoMap
            lat={form.stazionamentoLat}
            lng={form.stazionamentoLng}
            onPick={(lat, lng) =>
              setForm((f) => ({ ...f, stazionamentoLat: lat, stazionamentoLng: lng }))
            }
          />

          <h4>Equipaggio</h4>
          {(
            [
              ['autista', 'Autista'],
              ['capoEquipaggio', 'Capo equipaggio / medico'],
              ['soccorritore1', 'Soccorritore 1'],
              ['soccorritore2', 'Soccorritore 2'],
            ] as const
          ).map(([key, lab]) => (
            <fieldset key={key} className="ares-fieldset">
              <legend>{lab}</legend>
              <div className="ares-form-grid tight">
                <label>
                  Nome
                  <input
                    value={form.equipaggio[key].nome}
                    onChange={(e) => setEq(key, 'nome', e.target.value)}
                  />
                </label>
                <label>
                  Cognome
                  <input
                    value={form.equipaggio[key].cognome}
                    onChange={(e) => setEq(key, 'cognome', e.target.value)}
                  />
                </label>
                <label className="full">
                  Telefono
                  <input
                    value={form.equipaggio[key].telefono}
                    onChange={(e) => setEq(key, 'telefono', e.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          ))}

          <div className="ares-inline ares-modal-actions">
            <button
              type="button"
              className="ares-btn primary"
              onClick={() => {
                onSave({ ...form, id: mezzo?.id })
                onClose()
              }}
            >
              Salva
            </button>
            {mezzo && onDelete && (
              <button
                type="button"
                className="ares-btn danger"
                onClick={() => {
                  if (confirm('Eliminare il mezzo?')) {
                    onDelete()
                    onClose()
                  }
                }}
              >
                Elimina mezzo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
