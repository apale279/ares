import { useMemo, useState } from 'react'
import type { PMAPostazione, PersonaContatto } from '../types'
import { geocodeIndirizzo } from '../utils/geocode'
import { MezzoStazionamentoMap } from '../components/MezzoStazionamentoMap'
import { PhotonAddressField } from '../components/PhotonAddressField'
import { useAresStore } from '../store/aresStore'

function personaVuota(): PersonaContatto {
  return { nome: '', cognome: '', telefono: '' }
}

function nuovaPostazionePma(nomeDraft: string): PMAPostazione {
  return {
    id: `pma_${crypto.randomUUID()}`,
    nome: nomeDraft.trim() || 'Nuovo PMA',
    indirizzo: '',
    lat: null,
    lng: null,
    postiLetto: null,
    medici: [],
    infermieri: [],
    soccorritori: [],
    inventarioFarmaci: '',
  }
}

function ListaPersonale({
  titolo,
  persone,
  onChange,
}: {
  titolo: string
  persone: PersonaContatto[]
  onChange: (next: PersonaContatto[]) => void
}) {
  return (
    <div className="ares-pma-personale-block">
      <h4>{titolo}</h4>
      <ul className="ares-list-compact">
        {persone.map((p, idx) => (
          <li key={idx} className="ares-card">
            <div className="ares-form-grid tight">
              <label>
                Nome
                <input
                  value={p.nome}
                  onChange={(e) => {
                    const next = [...persone]
                    next[idx] = { ...p, nome: e.target.value }
                    onChange(next)
                  }}
                />
              </label>
              <label>
                Cognome
                <input
                  value={p.cognome}
                  onChange={(e) => {
                    const next = [...persone]
                    next[idx] = { ...p, cognome: e.target.value }
                    onChange(next)
                  }}
                />
              </label>
              <label className="full">
                Telefono
                <input
                  value={p.telefono}
                  onChange={(e) => {
                    const next = [...persone]
                    next[idx] = { ...p, telefono: e.target.value }
                    onChange(next)
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              className="ares-btn small danger"
              onClick={() => onChange(persone.filter((_, i) => i !== idx))}
            >
              Rimuovi
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="ares-btn small secondary"
        onClick={() => onChange([...persone, personaVuota()])}
      >
        Aggiungi riga
      </button>
    </div>
  )
}

export function ImpostazioniPmaTab() {
  const impostazioni = useAresStore((s) => s.impostazioni)
  const setImpostazioni = useAresStore((s) => s.setImpostazioni)

  const lista = impostazioni.postazioniPma ?? []
  const [selId, setSelId] = useState<string>(() => lista[0]?.id ?? '')
  const sel = useMemo(
    () => lista.find((x) => x.id === selId) ?? null,
    [lista, selId],
  )

  const sincronizzaNomiPma = (postazioni: PMAPostazione[]) => ({
    postazioniPma: postazioni,
    pma: [...new Set(postazioni.map((p) => p.nome.trim()).filter(Boolean))],
  })

  const aggiornaLista = (postazioni: PMAPostazione[]) =>
    setImpostazioni(sincronizzaNomiPma(postazioni))

  const aggiornaCorrente = (patch: Partial<PMAPostazione>) => {
    if (!sel) return
    aggiornaLista(
      lista.map((p) => (p.id === sel.id ? { ...p, ...patch } : p)),
    )
  }

  const [nomeNuovo, setNomeNuovo] = useState('')
  const [geoBusy, setGeoBusy] = useState(false)

  return (
    <section className="ares-settings-entity-block">
      <h1 className="ares-settings-entity-title">Impostazioni PMA</h1>
      <p className="ares-muted">
        Seleziona una postazione dall’anagrafica o creane una nuova. I nomi PMA
        usati nei menu sono sincronizzati automaticamente dal campo «Nome PMA».
      </p>

      <div className="ares-inline">
        <label>
          PMA attivo
          <select
            value={selId}
            onChange={(e) => setSelId(e.target.value)}
          >
            {lista.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome || p.id}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="ares-btn secondary"
          onClick={() => {
            const n = lista.length + 1
            const neo = nuovaPostazionePma(`PMA ${n}`)
            aggiornaLista([...lista, neo])
            setSelId(neo.id)
          }}
        >
          Nuova postazione
        </button>
        <button
          type="button"
          className="ares-btn danger"
          disabled={!sel || lista.length <= 1}
          onClick={() => {
            if (!sel || !confirm('Eliminare questa postazione PMA?')) return
            const next = lista.filter((p) => p.id !== sel.id)
            aggiornaLista(next)
            setSelId(next[0]?.id ?? '')
          }}
        >
          Elimina PMA
        </button>
      </div>

      {sel && (
        <div className="ares-settings-entity-panel" style={{ marginTop: 16 }}>
          <h2>Dettaglio: {sel.nome}</h2>

          <div className="ares-form-grid tight">
            <label className="full">
              Nome PMA
              <input
                value={sel.nome}
                onChange={(e) => aggiornaCorrente({ nome: e.target.value })}
              />
            </label>
            <label className="full">
              Indirizzo (Photon)
              <PhotonAddressField
                value={
                  sel.lat != null && sel.lng != null
                    ? {
                        display_name: sel.indirizzo,
                        lat: sel.lat,
                        lon: sel.lng,
                      }
                    : null
                }
                previewText={
                  sel.lat != null && sel.lng != null ? '' : sel.indirizzo
                }
                placeholder="Cerca indirizzo…"
                onDraftCommit={(text) =>
                  aggiornaCorrente({ indirizzo: text })
                }
                onChange={(hit) => {
                  if (!hit) {
                    aggiornaCorrente({
                      indirizzo: '',
                      lat: null,
                      lng: null,
                    })
                    return
                  }
                  aggiornaCorrente({
                    indirizzo: hit.display_name,
                    lat: hit.lat,
                    lng: hit.lon,
                  })
                }}
              />
            </label>
            <label>
              Lat
              <input
                type="number"
                step="any"
                value={sel.lat ?? ''}
                onChange={(e) =>
                  aggiornaCorrente({
                    lat:
                      e.target.value === ''
                        ? null
                        : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Lng
              <input
                type="number"
                step="any"
                value={sel.lng ?? ''}
                onChange={(e) =>
                  aggiornaCorrente({
                    lng:
                      e.target.value === ''
                        ? null
                        : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Numero posti letto
              <input
                type="number"
                min={0}
                value={sel.postiLetto ?? ''}
                onChange={(e) =>
                  aggiornaCorrente({
                    postiLetto:
                      e.target.value === ''
                        ? null
                        : Math.max(
                            0,
                            Number.parseInt(e.target.value, 10) || 0,
                          ),
                  })
                }
              />
            </label>
          </div>
          <div className="ares-btn-row-2">
            <button
              type="button"
              className="ares-btn secondary"
              disabled={geoBusy || !sel.indirizzo?.trim()}
              onClick={async () => {
                setGeoBusy(true)
                try {
                  const hit = await geocodeIndirizzo(sel.indirizzo.trim())
                  if (hit)
                    aggiornaCorrente({ lat: hit.lat, lng: hit.lng })
                  else alert('Indirizzo non trovato.')
                } finally {
                  setGeoBusy(false)
                }
              }}
            >
              Aggiorna coordinate da indirizzo
            </button>
          </div>

          <MezzoStazionamentoMap
            lat={sel.lat}
            lng={sel.lng}
            onPick={(lat, lng) => aggiornaCorrente({ lat, lng })}
          />

          <ListaPersonale
            titolo="Medici"
            persone={sel.medici ?? []}
            onChange={(medici) => aggiornaCorrente({ medici })}
          />
          <ListaPersonale
            titolo="Infermieri"
            persone={sel.infermieri ?? []}
            onChange={(infermieri) => aggiornaCorrente({ infermieri })}
          />
          <ListaPersonale
            titolo="Soccorritori"
            persone={sel.soccorritori ?? []}
            onChange={(soccorritori) => aggiornaCorrente({ soccorritori })}
          />

          <label className="full">
            Inventario farmaci (una riga per farmaco o testo libero)
            <textarea
              rows={6}
              className="ares-settings-textarea"
              value={sel.inventarioFarmaci ?? ''}
              spellCheck={false}
              onChange={(e) =>
                aggiornaCorrente({ inventarioFarmaci: e.target.value })
              }
            />
          </label>

          <p className="ares-muted">
            Per aggiungere un PMA con nome personalizzato senza aprire il menu:
          </p>
          <div className="ares-inline">
            <input
              placeholder="Nome nuovo PMA"
              value={nomeNuovo}
              onChange={(e) => setNomeNuovo(e.target.value)}
            />
            <button
              type="button"
              className="ares-btn primary"
              onClick={() => {
                const neo = nuovaPostazionePma(nomeNuovo)
                aggiornaLista([...lista, neo])
                setSelId(neo.id)
                setNomeNuovo('')
              }}
            >
              Aggiungi con nome
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
