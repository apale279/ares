import { useEffect, useState } from 'react'
import { DEFAULT_IMPOSTAZIONI } from '../constants'
import type { AppRouteKey, Mezzo, RankUtente, Utente } from '../types'
import { testoMultirigaDaVoci, vociDaTestoMultiriga } from '../utils/textLists'
import { DownloadFullDatabaseButton } from '../components/DownloadFullDatabaseButton'
import { ImportMezziExcelButton } from '../components/ImportMezziExcelButton'
import { MezzoFormModal } from '../components/MezzoFormModal'
import { ImpostazioniGerarchichePanel } from '../components/ImpostazioniGerarchichePanel'
import { useAuth } from '../auth/AuthContext'
import { useAresStore } from '../store/aresStore'
import { isAdminUser } from '../utils/isAdminUser'
import { ImpostazioniPmaTab } from './ImpostazioniPmaTab'

const ROUTE_OPTS: { key: AppRouteKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'diario', label: 'Diario' },
  { key: 'ricerca', label: 'Ricerca' },
  { key: 'impostazioni', label: 'Impostazioni' },
  { key: 'pma_modulo', label: 'Vista PMA' },
  { key: 'mezzo', label: 'Vista mezzo' },
]

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
  const { session } = useAuth()
  const impostazioni = useAresStore((s) => s.impostazioni)
  const setImpostazioni = useAresStore((s) => s.setImpostazioni)
  const mezzi = useAresStore((s) => s.mezzi)
  const addMezzo = useAresStore((s) => s.addMezzo)
  const updateMezzo = useAresStore((s) => s.updateMezzo)
  const deleteMezzo = useAresStore((s) => s.deleteMezzo)

  const [mezzoModalOpen, setMezzoModalOpen] = useState(false)
  const [editingMezzo, setEditingMezzo] = useState<Mezzo | null>(null)
  const [rankNome, setRankNome] = useState('')
  const [rankRoutes, setRankRoutes] = useState<AppRouteKey[]>(['dashboard'])
  const [utenteNome, setUtenteNome] = useState('')
  const [utentePassword, setUtentePassword] = useState('')
  const [utenteRankId, setUtenteRankId] = useState('')
  const [tab, setTab] = useState<
    'generali' | 'mezzi' | 'valutazioni' | 'utenti' | 'pma_impostazioni'
  >('generali')

  const tipiMezzoList =
    impostazioni.tipiMezzo.length > 0 ? impostazioni.tipiMezzo : ['MSB']
  const ranks: RankUtente[] = impostazioni.rankUtente ?? []
  const utenti: Utente[] = impostazioni.utenti ?? []

  const showModalitaSviluppoRow =
    isAdminUser(impostazioni, session?.userId) ||
    impostazioni.modalitaSviluppo === true

  const toggleRankRoute = (route: AppRouteKey) => {
    setRankRoutes((prev) =>
      prev.includes(route) ? prev.filter((x) => x !== route) : [...prev, route],
    )
  }

  return (
    <div className="ares-settings">
      <h1>Impostazioni</h1>
      <p className="ares-muted">
        Pannelli separati per entità. Gli elenchi si modificano con testo su più
        righe (una voce per riga). I dati vengono persistiti su cloud quando configurato.
      </p>
      <div className="ares-inline">
        <button
          type="button"
          className={`ares-btn secondary${tab === 'generali' ? ' active' : ''}`}
          onClick={() => setTab('generali')}
        >
          GENERALI
        </button>
        <button
          type="button"
          className={`ares-btn secondary${tab === 'mezzi' ? ' active' : ''}`}
          onClick={() => setTab('mezzi')}
        >
          MEZZI
        </button>
        <button
          type="button"
          className={`ares-btn secondary${tab === 'valutazioni' ? ' active' : ''}`}
          onClick={() => setTab('valutazioni')}
        >
          VALUTAZIONI
        </button>
        <button
          type="button"
          className={`ares-btn secondary${tab === 'utenti' ? ' active' : ''}`}
          onClick={() => setTab('utenti')}
        >
          UTENTI
        </button>
        <button
          type="button"
          className={`ares-btn secondary${tab === 'pma_impostazioni' ? ' active' : ''}`}
          onClick={() => setTab('pma_impostazioni')}
        >
          IMP. PMA
        </button>
      </div>

      {tab === 'generali' && (
        <>
      <DownloadFullDatabaseButton />
      {showModalitaSviluppoRow && (
        <section className="ares-settings-entity-panel">
          <h2>Modalità sviluppo</h2>
          <p className="ares-muted">
            Solo per prove in ambiente controllato. Se attiva, non viene richiesto il login
            e tutte le voci di menu restano disponibili (nessun filtro per rank). Le
            funzioni riservate agli amministratori restano accessibili.
          </p>
          <label className="ares-check">
            <input
              type="checkbox"
              checked={impostazioni.modalitaSviluppo === true}
              onChange={(e) =>
                setImpostazioni({ modalitaSviluppo: e.target.checked })
              }
            />
            Modalità sviluppo attiva
          </label>
        </section>
      )}
      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Evento — classificazione e contesto</h1>
        <div className="ares-settings-entity-grid">
          <ImpostazioniTextPanel
            title="Classificazione soccorso"
            description="Voci del menu a tendina sulla scheda evento."
            value={impostazioni.classificazioniSoccorso}
            onSave={(classificazioniSoccorso) =>
              setImpostazioni({ classificazioniSoccorso })
            }
          />
          <ImpostazioniTextPanel
            title="Motivo"
            description="Voci del menu «Motivo» sull’evento."
            value={impostazioni.motiviSoccorso}
            onSave={(motiviSoccorso) => setImpostazioni({ motiviSoccorso })}
          />
          <ImpostazioniTextPanel
            title="Meteo"
            description="Condizioni meteo (menu a tendina)."
            value={impostazioni.meteoEvento}
            onSave={(meteoEvento) => setImpostazioni({ meteoEvento })}
          />
          <ImpostazioniTextPanel
            title="Luogo (tipo)"
            description="Contesto del luogo dell’intervento."
            value={impostazioni.luoghiEvento}
            onSave={(luoghiEvento) => setImpostazioni({ luoghiEvento })}
          />
          <ImpostazioniTextPanel
            title="Segnalato da"
            description="Chi ha segnalato l’evento (menu a tendina)."
            value={impostazioni.segnalatoDaOpzioni}
            onSave={(segnalatoDaOpzioni) => setImpostazioni({ segnalatoDaOpzioni })}
          />
          <ImpostazioniTextPanel
            title="Esito missione"
            description="Voci per la scheda missione (menu a tendina)."
            value={impostazioni.esitiMissione}
            onSave={(esitiMissione) => setImpostazioni({ esitiMissione })}
          />
        </div>
        <details className="ares-mission-collapsible">
          <summary>Dettaglio classificazione (per ogni classificazione soccorso)</summary>
          <ImpostazioniGerarchichePanel
            title=""
            showHeading={false}
            description="Le righe seguono l’elenco «Classificazione soccorso». Salva dopo aver modificato."
            genitori={impostazioni.classificazioniSoccorso}
            gerarchia={impostazioni.dettaglioClassificazioneSoccorso}
            onSave={(dettaglioClassificazioneSoccorso) =>
              setImpostazioni({ dettaglioClassificazioneSoccorso })
            }
          />
        </details>
        <details className="ares-mission-collapsible">
          <summary>Dettaglio motivo</summary>
          <ImpostazioniGerarchichePanel
            title=""
            showHeading={false}
            description="Una textarea per ogni valore del menu «Motivo»."
            genitori={impostazioni.motiviSoccorso}
            gerarchia={impostazioni.dettaglioMotivoSoccorso}
            onSave={(dettaglioMotivoSoccorso) =>
              setImpostazioni({ dettaglioMotivoSoccorso })
            }
          />
        </details>
        <details className="ares-mission-collapsible">
          <summary>Dettaglio luogo</summary>
          <ImpostazioniGerarchichePanel
            title=""
            showHeading={false}
            description="Per ogni tipo di «Luogo», elenco dettagli possibili (uno per riga)."
            genitori={impostazioni.luoghiEvento}
            gerarchia={impostazioni.dettaglioLuogoEvento}
            onSave={(dettaglioLuogoEvento) =>
              setImpostazioni({ dettaglioLuogoEvento })
            }
          />
        </details>
      </section>
        </>
      )}

      {tab === 'generali' && (
        <>
      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Paziente — ospedali e PMA</h1>
        <p className="ares-muted">
          Ospedali per destinazione PS. Le postazioni PMA (nome, indirizzo, staff,
          inventario) si gestiscono nella tab <strong>IMP. PMA</strong>.
        </p>
        <div className="ares-settings-entity-grid">
          <ImpostazioniTextPanel
            title="Ospedali di destinazione"
            description="Lista per la scheda paziente (destinazione ospedaliera)."
            value={impostazioni.ospedali}
            onSave={(ospedali) => setImpostazioni({ ospedali })}
          />
          <ImpostazioniTextPanel
            title="Medici PMA"
            description="Lista medici per dimissione paziente PMA (il primo e default)."
            value={impostazioni.mediciPma ?? []}
            onSave={(mediciPma) => setImpostazioni({ mediciPma })}
          />
        </div>
      </section>
      </>
      )}

      {tab === 'valutazioni' && (
        <>
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
          <ImpostazioniTextPanel
            title="Manovre effettuate PMA"
            description="Multi-select nelle valutazioni PMA."
            value={impostazioni.manovrePMA ?? []}
            onSave={(manovrePMA) => setImpostazioni({ manovrePMA })}
          />
          <ImpostazioniTextPanel
            title="Preset dimissione PMA"
            description="Frasi precompilate richiamabili in valutazione PMA."
            value={impostazioni.presetDimissione ?? []}
            onSave={(presetDimissione) => setImpostazioni({ presetDimissione })}
          />
        </div>
      </section>
      </>
      )}

      {tab === 'utenti' && (
        <>
      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Utenti e Rank</h1>
        <div className="ares-settings-entity-grid">
          <section className="ares-settings-entity-panel">
            <h2>Crea rank</h2>
            <label>
              Nome rank
              <input
                value={rankNome}
                onChange={(e) => setRankNome(e.target.value)}
                placeholder="Es. Coordinatore"
              />
            </label>
            <div className="ares-list-compact">
              {ROUTE_OPTS.map((r) => (
                <label key={r.key} className="ares-check">
                  <input
                    type="checkbox"
                    checked={rankRoutes.includes(r.key)}
                    onChange={() => toggleRankRoute(r.key)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <button
              type="button"
              className="ares-btn primary"
              onClick={() => {
                const nome = rankNome.trim()
                if (!nome) return
                const next: RankUtente = {
                  id: `rank_${crypto.randomUUID()}`,
                  nome,
                  routeKeys: rankRoutes.length ? rankRoutes : ['dashboard'],
                }
                setImpostazioni({ rankUtente: [...ranks, next] })
                setRankNome('')
                setRankRoutes(['dashboard'])
                if (!utenteRankId) setUtenteRankId(next.id)
              }}
            >
              Aggiungi rank
            </button>
            <ul className="ares-list">
              {ranks.map((r) => (
                <li key={r.id} className="ares-card">
                  <label>
                    Nome rank
                    <input
                      value={r.nome}
                      onChange={(e) =>
                        setImpostazioni({
                          rankUtente: ranks.map((x) =>
                            x.id === r.id ? { ...x, nome: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <div className="ares-list-compact">
                    {ROUTE_OPTS.map((opt) => (
                      <label key={`${r.id}-${opt.key}`} className="ares-check">
                        <input
                          type="checkbox"
                          checked={r.routeKeys.includes(opt.key)}
                          onChange={() => {
                            const routeKeys = r.routeKeys.includes(opt.key)
                              ? r.routeKeys.filter((k) => k !== opt.key)
                              : [...r.routeKeys, opt.key]
                            setImpostazioni({
                              rankUtente: ranks.map((x) =>
                                x.id === r.id
                                  ? {
                                      ...x,
                                      routeKeys: routeKeys.length
                                        ? routeKeys
                                        : ['dashboard'],
                                    }
                                  : x,
                              ),
                            })
                          }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="ares-btn small danger"
                    onClick={() => {
                      const used = utenti.some((u) => u.rankId === r.id)
                      if (used) {
                        alert('Rank associato a utenti: cambia prima il rank degli utenti.')
                        return
                      }
                      setImpostazioni({
                        rankUtente: ranks.filter((x) => x.id !== r.id),
                      })
                    }}
                  >
                    Elimina rank
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="ares-settings-entity-panel">
            <h2>Crea utente</h2>
            <label>
              Nome utente
              <input
                value={utenteNome}
                onChange={(e) => setUtenteNome(e.target.value)}
                placeholder="nome.utente"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={utentePassword}
                onChange={(e) => setUtentePassword(e.target.value)}
              />
            </label>
            <label>
              Rank
              <select
                value={utenteRankId}
                onChange={(e) => setUtenteRankId(e.target.value)}
              >
                <option value="">—</option>
                {ranks.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ares-btn primary"
              onClick={() => {
                const nome = utenteNome.trim()
                if (!nome || !utentePassword || !utenteRankId) return
                if (utenti.some((u) => u.nomeUtente === nome)) {
                  alert('Nome utente gia esistente.')
                  return
                }
                const next: Utente = {
                  id: `user_${crypto.randomUUID()}`,
                  nomeUtente: nome,
                  password: utentePassword,
                  rankId: utenteRankId,
                }
                setImpostazioni({ utenti: [...utenti, next] })
                setUtenteNome('')
                setUtentePassword('')
              }}
            >
              Aggiungi utente
            </button>
            <ul className="ares-list">
              {utenti.map((u) => (
                <li key={u.id} className="ares-card">
                  <label>
                    Nome utente
                    <input
                      value={u.nomeUtente}
                      onChange={(e) =>
                        setImpostazioni({
                          utenti: utenti.map((x) =>
                            x.id === u.id
                              ? { ...x, nomeUtente: e.target.value }
                              : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={u.password}
                      onChange={(e) =>
                        setImpostazioni({
                          utenti: utenti.map((x) =>
                            x.id === u.id ? { ...x, password: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Rank
                    <select
                      value={u.rankId}
                      onChange={(e) =>
                        setImpostazioni({
                          utenti: utenti.map((x) =>
                            x.id === u.id ? { ...x, rankId: e.target.value } : x,
                          ),
                        })
                      }
                    >
                      {ranks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="ares-inline">
                    <button
                      type="button"
                      className="ares-btn small danger"
                      onClick={() =>
                        setImpostazioni({
                          utenti: utenti.filter((x) => x.id !== u.id),
                        })
                      }
                    >
                      Elimina
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
      </>
      )}

      {tab === 'mezzi' && (
        <>
      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Mezzo — tipi</h1>
        <ImpostazioniTextPanel
          title="Tipi mezzo"
          description="Compaiono nel menu a tendina in anagrafica mezzo (es. MSB, CMR, MSA). In import Excel, se il tipo non è in elenco viene usato il primo valore qui definito."
          value={impostazioni.tipiMezzo}
          onSave={(tipiMezzo) => setImpostazioni({ tipiMezzo })}
        />
      </section>
      <section className="ares-settings-entity-block">
        <h1 className="ares-settings-entity-title">Mezzi — anagrafica</h1>
        <p className="ares-muted">
          Stazionamento: Photon, coordinate manuali o click sulla mappa nel form.{' '}
          <strong>Importa</strong> legge il foglio <strong>EQUIPAGGI</strong> (o il
          primo foglio): colonne A=tipo, B=sigla, C=sigla radio, D=targa, E=stazionamento
          (geocoding), F–Q=equipaggio (autista, capo, socc.1, socc.2). Stessa sigla =
          sovrascrittura.
        </p>
        <div className="ares-inline">
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
          <ImportMezziExcelButton tipiMezzo={tipiMezzoList} />
        </div>
        {isAdminUser(impostazioni, session?.userId) && mezzi.length > 0 ? (
          <div className="ares-inline" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="ares-btn danger"
              onClick={() => {
                const n = mezzi.length
                if (
                  !window.confirm(
                    `Eliminare definitivamente tutti i mezzi (${n})?\n\n` +
                      'Verranno rimosse anche le missioni legate a ciascun mezzo; sui pazienti il riferimento al mezzo di trasporto verrà azzerato.',
                  )
                )
                  return
                const ids = mezzi.map((m) => m.id)
                for (const id of ids) deleteMezzo(id)
              }}
            >
              Cancella tutto
            </button>
          </div>
        ) : null}
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
      </>
      )}

      <div className="ares-inline">
        <button
          type="button"
          className="ares-btn ghost"
          onClick={() => {
            if (
              !confirm(
                'Ripristinare solo gli elenchi clinici predefiniti? Utenti, rank, tipi mezzo, ospedali e PMA non verranno toccati.',
              )
            )
              return
            setImpostazioni({
              manovreMSB: DEFAULT_IMPOSTAZIONI.manovreMSB,
              manovreMSA: DEFAULT_IMPOSTAZIONI.manovreMSA,
              manovrePMA: DEFAULT_IMPOSTAZIONI.manovrePMA,
              presetDimissione: DEFAULT_IMPOSTAZIONI.presetDimissione,
              mediciPma: DEFAULT_IMPOSTAZIONI.mediciPma,
              classificazioniSoccorso:
                DEFAULT_IMPOSTAZIONI.classificazioniSoccorso,
              dettaglioClassificazioneSoccorso:
                DEFAULT_IMPOSTAZIONI.dettaglioClassificazioneSoccorso,
              motiviSoccorso: DEFAULT_IMPOSTAZIONI.motiviSoccorso,
              dettaglioMotivoSoccorso:
                DEFAULT_IMPOSTAZIONI.dettaglioMotivoSoccorso,
              meteoEvento: DEFAULT_IMPOSTAZIONI.meteoEvento,
              luoghiEvento: DEFAULT_IMPOSTAZIONI.luoghiEvento,
              dettaglioLuogoEvento:
                DEFAULT_IMPOSTAZIONI.dettaglioLuogoEvento,
              segnalatoDaOpzioni: DEFAULT_IMPOSTAZIONI.segnalatoDaOpzioni,
              esitiMissione: DEFAULT_IMPOSTAZIONI.esitiMissione,
            })
          }}
        >
          Ripristina elenchi clinici predefiniti
        </button>
      </div>

      {tab === 'pma_impostazioni' && <ImpostazioniPmaTab />}

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
