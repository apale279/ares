import { useEffect, useState } from 'react'
import { DEFAULT_IMPOSTAZIONI } from '../constants'
import type { Mezzo } from '../types'
import { testoMultirigaDaVoci, vociDaTestoMultiriga } from '../utils/textLists'
import { MezzoFormModal } from '../components/MezzoFormModal'
import { useAresStore } from '../store/aresStore'

function ImpostazioniTextPanel({
  title,
  description,
  value,
  onSave,
}: {
  title: string
  description: string
  value: string[]
  onSave: (next: string[]) => void
}) {
  const [text, setText] = useState(() => testoMultirigaDaVoci(value))
  const valueKey = value.join('\n')
  useEffect(() => {
    setText(testoMultirigaDaVoci(value))
  }, [valueKey])
  return (
    <section className="ares-settings-entity-panel">
      <h2>{title}</h2>
      <p className="ares-muted">{description}</p>
      <textarea
        className="ares-settings-textarea"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      <button
        type="button"
        className="ares-btn primary"
        onClick={() => onSave(vociDaTestoMultiriga(text))}
      >
        Salva elenco
      </button>
    </section>
  )
}

export function Settings() {
  const impostazioni = useAresStore((s) => s.impostazioni)
  const setImpostazioni = useAresStore((s) => s.setImpostazioni)
  const mezzi = useAresStore((s) => s.mezzi)
  const addMezzo = useAresStore((s) => s.addMezzo)
  const updateMezzo = useAresStore((s) => s.updateMezzo)
  const deleteMezzo = useAresStore((s) => s.deleteMezzo)

  const [mezzoModalOpen, setMezzoModalOpen] = useState(false)
  const [editingMezzo, setEditingMezzo] = useState<Mezzo | null>(null)

  const tipiMezzoList =
    impostazioni.tipiMezzo.length > 0 ? impostazioni.tipiMezzo : ['MSB']

  return (
    <div className="ares-settings">
      <h1>Impostazioni</h1>
      <p className="ares-muted">
        Pannelli separati per entità. Gli elenchi si modificano con testo su più
        righe (una voce per riga). I dati restano in locale nel browser.
      </p>

      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Evento — dettagli</h1>
        <div className="ares-settings-entity-grid">
          <ImpostazioniTextPanel
            title="Tipo MEDICO"
            description="Voci del menu “dettaglio evento” quando il tipo è MEDICO."
            value={impostazioni.dettagliMedico}
            onSave={(dettagliMedico) => setImpostazioni({ dettagliMedico })}
          />
          <ImpostazioniTextPanel
            title="Tipo TRAUMA"
            description="Voci quando il tipo è TRAUMA."
            value={impostazioni.dettagliTrauma}
            onSave={(dettagliTrauma) => setImpostazioni({ dettagliTrauma })}
          />
          <ImpostazioniTextPanel
            title="Tipo NON NOTO"
            description="Voci quando il tipo è NON NOTO."
            value={impostazioni.dettagliNonNoto}
            onSave={(dettagliNonNoto) => setImpostazioni({ dettagliNonNoto })}
          />
        </div>
      </section>

      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Mezzo — tipi</h1>
        <ImpostazioniTextPanel
          title="Tipi mezzo"
          description="Compaiono nel menu a tendina in anagrafica mezzo (es. MSB, CMR, MSA)."
          value={impostazioni.tipiMezzo}
          onSave={(tipiMezzo) => setImpostazioni({ tipiMezzo })}
        />
      </section>

      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Paziente — ospedali e PMA</h1>
        <p className="ares-muted">
          Ospedali per destinazione PS; PMA per postazione e vista PMA.
        </p>
        <div className="ares-settings-entity-grid">
          <ImpostazioniTextPanel
            title="Ospedali di destinazione"
            description="Lista per la scheda paziente (destinazione ospedaliera)."
            value={impostazioni.ospedali}
            onSave={(ospedali) => setImpostazioni({ ospedali })}
          />
          <ImpostazioniTextPanel
            title="PMA (postazioni)"
            description="Elenco PMA: menu destinazione paziente e vista PMA in alto."
            value={impostazioni.pma}
            onSave={(pma) => setImpostazioni({ pma })}
          />
        </div>
      </section>

      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Valutazioni</h1>
        <p className="ares-muted">
          Manovre disponibili nei moduli valutazione MSB e MSA (una voce per
          riga).
        </p>
        <div className="ares-settings-entity-grid">
          <ImpostazioniTextPanel
            title="Manovre effettuate MSB"
            description="Multi-select nelle valutazioni MSB."
            value={impostazioni.manovreMSB}
            onSave={(manovreMSB) => setImpostazioni({ manovreMSB })}
          />
          <ImpostazioniTextPanel
            title="Manovre effettuate MSA"
            description="Multi-select nelle valutazioni MSA."
            value={impostazioni.manovreMSA}
            onSave={(manovreMSA) => setImpostazioni({ manovreMSA })}
          />
        </div>
      </section>

      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Mezzi — anagrafica</h1>
        <p className="ares-muted">
          Stazionamento: indirizzo + coordinate (geocoding o click sulla mappa nel
          form).
        </p>
        <button
          type="button"
          className="ares-btn primary"
          onClick={() => {
            setEditingMezzo(null)
            setMezzoModalOpen(true)
          }}
        >
          Crea mezzo
        </button>
        <ul className="ares-mezzi-settings-list">
          {mezzi.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="ares-btn secondary"
                onClick={() => {
                  setEditingMezzo(m)
                  setMezzoModalOpen(true)
                }}
              >
                {m.sigla} — {m.tipo} ({m.stato})
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="ares-inline">
        <button
          type="button"
          className="ares-btn ghost"
          onClick={() =>
            setImpostazioni({
              ...DEFAULT_IMPOSTAZIONI,
            })
          }
        >
          Ripristina elenchi predefiniti
        </button>
      </div>

      <MezzoFormModal
        open={mezzoModalOpen}
        mezzo={editingMezzo}
        tipiMezzo={tipiMezzoList}
        onClose={() => {
          setMezzoModalOpen(false)
          setEditingMezzo(null)
        }}
        onSave={(payload) => {
          if (payload.id) {
            updateMezzo(payload.id, {
              tipo: payload.tipo,
              sigla: payload.sigla,
              siglaRadio: payload.siglaRadio,
              targa: payload.targa,
              stazionamento: payload.stazionamento,
              stazionamentoLat: payload.stazionamentoLat,
              stazionamentoLng: payload.stazionamentoLng,
              equipaggio: payload.equipaggio,
            })
          } else {
            addMezzo({
              tipo: payload.tipo,
              sigla: payload.sigla,
              siglaRadio: payload.siglaRadio,
              targa: payload.targa,
              stazionamento: payload.stazionamento,
              stazionamentoLat: payload.stazionamentoLat,
              stazionamentoLng: payload.stazionamentoLng,
              equipaggio: payload.equipaggio,
            })
          }
        }}
        onDelete={
          editingMezzo
            ? () => {
                deleteMezzo(editingMezzo.id)
              }
            : undefined
        }
      />
    </div>
  )
}
