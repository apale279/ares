import { useEffect, useMemo, useState } from 'react'
import type {
  AppRouteKey,
  Mezzo,
  RankUtente,
  StazionamentoMezzoPreset,
  Utente,
} from '../types'
import { testoMultirigaDaVoci, vociDaTestoMultiriga } from '../utils/textLists'
import { DownloadFullDatabaseButton } from '../components/DownloadFullDatabaseButton'
import { ImportMezziExcelButton } from '../components/ImportMezziExcelButton'
import { MezzoFormModal } from '../components/MezzoFormModal'
import { StazionamentoPresetModal } from '../components/StazionamentoPresetModal'
import { ImpostazioniGerarchichePanel } from '../components/ImpostazioniGerarchichePanel'
import { useAuth } from '../auth/AuthContext'
import { useAresStore } from '../store/aresStore'
import { hasFullAppPrivileges, isAdminUser } from '../utils/isAdminUser'
import { isModalitaSviluppoAttiva } from '../utils/modalitaSviluppo'
import {
  mezziInOrdinePersistito,
  ordineMezziCompleto,
} from '../utils/ordineMezzi'
import { ImpostazioniPmaTab } from './ImpostazioniPmaTab'
import {
  createManualBackup,
  isSupabaseConfigured,
  listManualBackups,
  renameManualBackup,
  restoreManualBackup,
  type ManualBackupRecord,
} from '../store/supabasePersistStorage'

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
    'generali' | 'evento' | 'mezzi' | 'valutazioni' | 'utenti' | 'pma_impostazioni'
  >('generali')
  const [filtroMezzi, setFiltroMezzi] = useState('')
  const [backupName, setBackupName] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const [backups, setBackups] = useState<ManualBackupRecord[]>([])
  const [backupNameDrafts, setBackupNameDrafts] = useState<Record<string, string>>({})
  const [rankDrafts, setRankDrafts] = useState<
    Record<string, { nome: string; routeKeys: AppRouteKey[] }>
  >({})
  const [utenteDrafts, setUtenteDrafts] = useState<
    Record<string, { nomeUtente: string; password: string; rankId: string }>
  >({})
  const [dragMezzoId, setDragMezzoId] = useState<string | null>(null)
  const [stazModalOpen, setStazModalOpen] = useState(false)
  const [editingStazione, setEditingStazione] = useState<StazionamentoMezzoPreset | null>(
    null,
  )

  const tipiMezzoList =
    impostazioni.tipiMezzo.length > 0 ? impostazioni.tipiMezzo : ['MSB']
  const ranks: RankUtente[] = impostazioni.rankUtente ?? []
  const utenti: Utente[] = impostazioni.utenti ?? []

  const nextIdMezzo = useAresStore((s) => s.nextIdMezzo)
  const nextIdEventoNum = useAresStore((s) => s.nextIdEvento)
  const nextIdPazienteNum = useAresStore((s) => s.nextIdPaziente)
  const nextIdMissioneNum = useAresStore((s) => s.nextIdMissione)
  const idSaltMezzo = useAresStore((s) => s.idSaltMezzo)
  const idSaltEvento = useAresStore((s) => s.idSaltEvento)
  const idSaltPaziente = useAresStore((s) => s.idSaltPaziente)
  const idSaltMissione = useAresStore((s) => s.idSaltMissione)
  const resetContatoreSeqMezzo = useAresStore((s) => s.resetContatoreSeqMezzo)
  const resetContatoreSeqEvento = useAresStore((s) => s.resetContatoreSeqEvento)
  const resetContatoreSeqPaziente = useAresStore((s) => s.resetContatoreSeqPaziente)

  const showModalitaSviluppoRow =
    isAdminUser(impostazioni, session?.userId) ||
    isModalitaSviluppoAttiva(impostazioni)

  const mezziOrdinati = useMemo(
    () => mezziInOrdinePersistito(mezzi, impostazioni.ordineMezziIds),
    [mezzi, impostazioni.ordineMezziIds],
  )

  const mezziListaFiltrata = useMemo(() => {
    const q = filtroMezzi.trim().toLowerCase()
    if (!q) return mezziOrdinati
    return mezziOrdinati.filter((m) => {
      const blocchi = [
        m.sigla,
        m.tipo,
        m.siglaRadio,
        m.targa,
        m.stazionamento,
        m.stato,
        m.id,
      ]
      return blocchi.some((x) => String(x ?? '').toLowerCase().includes(q))
    })
  }, [mezziOrdinati, filtroMezzi])

  const ordineCorrenteMezzi = useMemo(
    () => ordineMezziCompleto(mezzi, impostazioni.ordineMezziIds),
    [mezzi, impostazioni.ordineMezziIds],
  )

  const stazionamenti = impostazioni.stazionamentiMezzo ?? []

  const spostaMezzoConDrag = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return
    const cur = ordineMezziCompleto(mezzi, impostazioni.ordineMezziIds)
    const from = cur.indexOf(sourceId)
    const to = cur.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = [...cur]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    setImpostazioni({ ordineMezziIds: next })
  }

  const toggleRankRoute = (route: AppRouteKey) => {
    setRankRoutes((prev) =>
      prev.includes(route) ? prev.filter((x) => x !== route) : [...prev, route],
    )
  }

  const backupEnabled = isSupabaseConfigured()

  const reloadBackups = async () => {
    if (!backupEnabled) return
    const rows = await listManualBackups()
    setBackups(rows)
    setBackupNameDrafts((prev) => {
      const next: Record<string, string> = {}
      for (const b of rows) next[b.id] = prev[b.id] ?? b.name
      return next
    })
  }

  useEffect(() => {
    if (tab !== 'generali' || !backupEnabled) return
    void reloadBackups()
  }, [tab, backupEnabled])

  useEffect(() => {
    setRankDrafts((prev) => {
      const next: Record<string, { nome: string; routeKeys: AppRouteKey[] }> = {}
      for (const r of ranks) {
        next[r.id] = prev[r.id] ?? { nome: r.nome, routeKeys: [...r.routeKeys] }
      }
      return next
    })
  }, [ranks])

  useEffect(() => {
    setUtenteDrafts((prev) => {
      const next: Record<string, { nomeUtente: string; password: string; rankId: string }> =
        {}
      for (const u of utenti) {
        next[u.id] =
          prev[u.id] ?? {
            nomeUtente: u.nomeUtente,
            password: u.password,
            rankId: u.rankId,
          }
      }
      return next
    })
  }, [utenti])

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
          className={`ares-btn secondary${tab === 'evento' ? ' active' : ''}`}
          onClick={() => setTab('evento')}
        >
          EVENTO
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

      {hasFullAppPrivileges(impostazioni, session?.userId) && (
        <section className="ares-settings-entity-panel">
          <h2>Numerazione ID (mezzi · eventi · pazienti)</h2>
          <p className="ares-muted">
            Nuovi ID: prefisso, blocco alfanumerico di 6 caratteri fisso finché non lo
            rigeneri dai dati export, poi numero sequenziale.{' '}
            <strong>Esempio mezzo:</strong> M_<code>{idSaltMezzo || '⋯⋯⋯⋯⋯⋯'}</code>_
            {nextIdMezzo}.
          </p>
          <ul className="ares-list-compact ares-muted">
            <li>
              <strong>Mezzi:</strong> M_<code>{idSaltMezzo || '⋯'}</code> · prossimo
              numero: <strong>{nextIdMezzo}</strong>
            </li>
            <li>
              <strong>Eventi:</strong> E_<code>{idSaltEvento || '⋯'}</code> · prossimo:{' '}
              <strong>{nextIdEventoNum}</strong>
            </li>
            <li>
              <strong>Pazienti:</strong> P_<code>{idSaltPaziente || '⋯'}</code> ·
              prossimo: <strong>{nextIdPazienteNum}</strong>
            </li>
            <li>
              <strong>Missioni</strong> (nuove):{' '}
              <code>
                {`MS_${idSaltMissione || '⋯'}_${nextIdMissioneNum}`}
              </code>{' '}
              — prefisso <strong>MS_</strong> per non confonderle con gli ID mezzo (
              <strong>M_</strong>
              ).
            </li>
          </ul>
          <p className="ares-muted">
            Ripristino contatore da 1: rischio collisione se nel DB esistono già ID con quel
            blocco numerico basso — usalo solo se sai cosa fai.
          </p>
          <div className="ares-inline">
            <button
              type="button"
              className="ares-btn secondary"
              onClick={() => {
                if (
                  !window.confirm(
                    'Azzerare il contatore sequenziale mezzi da 1? (ID esistenti restano)',
                  )
                )
                  return
                resetContatoreSeqMezzo()
              }}
            >
              Reset contatore mezzi → 1
            </button>
            <button
              type="button"
              className="ares-btn secondary"
              onClick={() => {
                if (
                  !window.confirm(
                    'Azzerare il contatore sequenziale eventi da 1? (ID esistenti restano)',
                  )
                )
                  return
                resetContatoreSeqEvento()
              }}
            >
              Reset contatore eventi → 1
            </button>
            <button
              type="button"
              className="ares-btn secondary"
              onClick={() => {
                if (
                  !window.confirm(
                    'Azzerare il contatore sequenziale pazienti da 1? (ID esistenti restano)',
                  )
                )
                  return
                resetContatoreSeqPaziente()
              }}
            >
              Reset contatore pazienti → 1
            </button>
          </div>
        </section>
      )}

      <section className="ares-settings-entity-panel">
        <h2>Backup cloud (manuale)</h2>
        <p className="ares-muted">
          Crea backup on-demand dello stato DB corrente. Vengono mantenuti gli ultimi 5 backup.
        </p>
        {!backupEnabled && (
          <p className="ares-muted">
            Backup non disponibile: variabili Supabase non configurate.
          </p>
        )}
        {backupEnabled && (
          <>
            <div className="ares-inline">
              <input
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="Nome backup (opzionale)"
              />
              <button
                type="button"
                className="ares-btn primary"
                disabled={backupBusy}
                onClick={async () => {
                  setBackupBusy(true)
                  try {
                    await createManualBackup(backupName)
                    setBackupName('')
                    await reloadBackups()
                  } catch (e) {
                    alert(
                      `Errore creazione backup: ${e instanceof Error ? e.message : String(e)}`,
                    )
                  } finally {
                    setBackupBusy(false)
                  }
                }}
              >
                {backupBusy ? 'Creazione...' : 'Crea backup'}
              </button>
            </div>
            <div className="ares-table-wrap" style={{ marginTop: 12 }}>
              <table className="ares-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Timestamp</th>
                    <th>Utente</th>
                    <th>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <input
                          value={backupNameDrafts[b.id] ?? b.name}
                          onChange={(e) =>
                            setBackupNameDrafts((prev) => ({
                              ...prev,
                              [b.id]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        {b.createdAt
                          ? new Date(b.createdAt).toLocaleString('it-IT')
                          : '—'}
                      </td>
                      <td>{b.userId || '—'}</td>
                      <td>
                        <div className="ares-inline">
                          <button
                            type="button"
                            className="ares-btn small ghost"
                            disabled={backupBusy}
                            onClick={async () => {
                              setBackupBusy(true)
                              try {
                                await renameManualBackup(
                                  b.id,
                                  backupNameDrafts[b.id] ?? b.name,
                                )
                                await reloadBackups()
                              } catch (e) {
                                alert(
                                  `Errore rinomina backup: ${e instanceof Error ? e.message : String(e)}`,
                                )
                              } finally {
                                setBackupBusy(false)
                              }
                            }}
                          >
                            Salva nome
                          </button>
                          <button
                            type="button"
                            className="ares-btn small danger"
                            disabled={backupBusy}
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Ripristinare il backup "${b.name}"? Lo stato corrente verrà sostituito.`,
                                )
                              )
                                return
                              setBackupBusy(true)
                              try {
                                await restoreManualBackup(b.id)
                                await useAresStore.persist.rehydrate()
                                await reloadBackups()
                              } catch (e) {
                                alert(
                                  `Errore ripristino backup: ${e instanceof Error ? e.message : String(e)}`,
                                )
                              } finally {
                                setBackupBusy(false)
                              }
                            }}
                          >
                            Ripristina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr>
                      <td colSpan={4} className="ares-muted">
                        Nessun backup manuale disponibile.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
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
              checked={isModalitaSviluppoAttiva(impostazioni)}
              onChange={(e) =>
                setImpostazioni({ modalitaSviluppo: e.target.checked })
              }
            />
            Modalità sviluppo attiva
          </label>
        </section>
      )}
        </>
      )}

      {tab === 'evento' && (
        <>
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
                onSave={(segnalatoDaOpzioni) =>
                  setImpostazioni({ segnalatoDaOpzioni })
                }
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
                description="Lista medici per dimissione paziente PMA (il primo è default)."
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
                  {(() => {
                    const draft = rankDrafts[r.id] ?? {
                      nome: r.nome,
                      routeKeys: r.routeKeys,
                    }
                    return (
                      <>
                  <label>
                    Nome rank
                    <input
                      value={draft.nome}
                      onChange={(e) =>
                        setRankDrafts((prev) => ({
                          ...prev,
                          [r.id]: { ...draft, nome: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <div className="ares-list-compact">
                    {ROUTE_OPTS.map((opt) => (
                      <label key={`${r.id}-${opt.key}`} className="ares-check">
                        <input
                          type="checkbox"
                          checked={draft.routeKeys.includes(opt.key)}
                          onChange={() => {
                            const routeKeys = draft.routeKeys.includes(opt.key)
                              ? draft.routeKeys.filter((k) => k !== opt.key)
                              : [...draft.routeKeys, opt.key]
                            setRankDrafts((prev) => ({
                              ...prev,
                              [r.id]: {
                                ...draft,
                                routeKeys: routeKeys.length ? routeKeys : ['dashboard'],
                              },
                            }))
                          }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <div className="ares-inline">
                    <button
                      type="button"
                      className="ares-btn small primary"
                      onClick={() => {
                        const safeNome = draft.nome.trim()
                        if (!safeNome) {
                          alert('Nome rank obbligatorio.')
                          return
                        }
                        const safeRoutes: AppRouteKey[] = draft.routeKeys.length
                          ? draft.routeKeys
                          : ['dashboard']
                        setImpostazioni({
                          rankUtente: ranks.map((x) =>
                            x.id === r.id
                              ? { ...x, nome: safeNome, routeKeys: safeRoutes }
                              : x,
                          ),
                        })
                      }}
                    >
                      Salva rank
                    </button>
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
                  </div>
                      </>
                    )
                  })()}
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
                  {(() => {
                    const draft = utenteDrafts[u.id] ?? {
                      nomeUtente: u.nomeUtente,
                      password: u.password,
                      rankId: u.rankId,
                    }
                    return (
                      <>
                  <label>
                    Nome utente
                    <input
                      value={draft.nomeUtente}
                      onChange={(e) =>
                        setUtenteDrafts((prev) => ({
                          ...prev,
                          [u.id]: { ...draft, nomeUtente: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      value={draft.password}
                      onChange={(e) =>
                        setUtenteDrafts((prev) => ({
                          ...prev,
                          [u.id]: { ...draft, password: e.target.value },
                        }))
                      }
                    />
                  </label>
                  <label>
                    Rank
                    <select
                      value={draft.rankId}
                      onChange={(e) =>
                        setUtenteDrafts((prev) => ({
                          ...prev,
                          [u.id]: { ...draft, rankId: e.target.value },
                        }))
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
                      className="ares-btn small primary"
                      onClick={() => {
                        const nome = draft.nomeUtente.trim()
                        if (!nome || !draft.password || !draft.rankId) {
                          alert('Compila nome, password e rank.')
                          return
                        }
                        if (
                          utenti.some((x) => x.id !== u.id && x.nomeUtente === nome)
                        ) {
                          alert('Nome utente gia esistente.')
                          return
                        }
                        setImpostazioni({
                          utenti: utenti.map((x) =>
                            x.id === u.id
                              ? {
                                  ...x,
                                  nomeUtente: nome,
                                  password: draft.password,
                                  rankId: draft.rankId,
                                }
                              : x,
                          ),
                        })
                      }}
                    >
                      Salva utente
                    </button>
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
                      </>
                    )
                  })()}
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
        <h1 className="ares-settings-entity-title">Mezzi — anagrafica</h1>
        <p className="ares-muted">
          Stazionamento: Photon, coordinate manuali o mappa nel form, oppure nel modale scegli
          uno dalla sezione «Stazionamenti» (più sotto, comprimibile).{' '}
          <strong>Importa</strong> legge il foglio <strong>EQUIPAGGI</strong> (o il
          primo foglio): la <strong>riga 1</strong> deve essere solo i titoli colonne (non viene
          importata). Colonne A=tipo, B=sigla, C=sigla radio, D=targa, E=stazionamento
          (geocoding), F–Q=equipaggio (autista, capo, socc.1, socc.2), R=stato (DISPONIBILE,
          OCCUPATO, NON DISPONIBILE). Stessa sigla = sovrascrittura.
          L’ordine nell’elenco si ripete nel pannello <strong>Mezzi</strong> della dashboard.
          Senza ordine salvato valgono regole tipo CRI / MSB; «Ordine predefinito» ripristina.
          Riordina le righe <strong>trascinandole</strong>.
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
                setImpostazioni({ ordineMezziIds: [] })
              }}
            >
              Cancella tutto
            </button>
          </div>
        ) : null}
        <div className="ares-mezzi-settings-toolbar">
          <label className="ares-mezzi-settings-search">
            Ricerca rapida
            <input
              type="search"
              value={filtroMezzi}
              onChange={(e) => setFiltroMezzi(e.target.value)}
              placeholder="Sigla, tipo, radio, targa, stazionamento, stato…"
              spellCheck={false}
            />
          </label>
          <span className="ares-muted ares-mezzi-settings-count">
            {mezziListaFiltrata.length} di {mezzi.length}
          </span>
          {(impostazioni.ordineMezziIds?.length ?? 0) > 0 ? (
            <button
              type="button"
              className="ares-btn small ghost"
              onClick={() => {
                if (
                  !window.confirm(
                    'Ripristinare l’ordine predefinito (raggruppato per tipo, disponibili in cima)?',
                  )
                )
                  return
                setImpostazioni({ ordineMezziIds: [] })
              }}
            >
              Ordine predefinito
            </button>
          ) : null}
        </div>
        <div className="ares-mezzi-settings-table-wrap">
          <table className="ares-mezzi-settings-table">
            <thead>
              <tr>
                <th className="ares-mezzi-settings-ord-col" title="Trascina la riga per riordinare">
                  #
                </th>
                <th>Sigla</th>
                <th>Tipo</th>
                <th>Stato</th>
                <th>Radio</th>
                <th>Targa</th>
                <th>Stazionamento</th>
              </tr>
            </thead>
            <tbody>
              {mezziListaFiltrata.map((m) => {
                const rank = ordineCorrenteMezzi.indexOf(m.id)
                return (
                <tr
                  key={m.id}
                  className="ares-mezzi-settings-row"
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) => {
                    setDragMezzoId(m.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragMezzoId) spostaMezzoConDrag(dragMezzoId, m.id)
                    setDragMezzoId(null)
                  }}
                  onDragEnd={() => setDragMezzoId(null)}
                  onClick={() => {
                    setEditingMezzo(m)
                    setMezzoModalOpen(true)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setEditingMezzo(m)
                      setMezzoModalOpen(true)
                    }
                  }}
                >
                  <td
                    className="ares-mezzi-settings-ord-col ares-muted"
                    data-label="Ordine"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rank >= 0 ? rank + 1 : '—'}
                  </td>
                  <td data-label="Sigla">
                    <span className="ares-mezzi-settings-sigla">{m.sigla}</span>
                  </td>
                  <td data-label="Tipo">{m.tipo}</td>
                  <td
                    data-label="Stato"
                    className="ares-mezzi-settings-stato-cell"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="ares-mezzi-settings-stato-text">{m.stato}</span>
                    <span className="ares-mezzi-stato-quick">
                      <button
                        type="button"
                        title="Disp."
                        aria-label={`${m.sigla}: disponibile`}
                        className="ares-mezzi-stato-dot ares-mezzi-stato-dot--avail"
                        disabled={
                          m.stato === 'OCCUPATO' ||
                          m.stato === 'DISPONIBILE'
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          updateMezzo(m.id, { stato: 'DISPONIBILE' })
                        }}
                      />
                      <button
                        type="button"
                        title="Non disp."
                        aria-label={`${m.sigla}: non disponibile`}
                        className="ares-mezzi-stato-dot ares-mezzi-stato-dot--busy"
                        disabled={
                          m.stato === 'OCCUPATO' ||
                          m.stato === 'NON_DISPONIBILE'
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          updateMezzo(m.id, { stato: 'NON_DISPONIBILE' })
                        }}
                      />
                    </span>
                  </td>
                  <td data-label="Radio">{m.siglaRadio || '—'}</td>
                  <td data-label="Targa">{m.targa || '—'}</td>
                  <td data-label="Stazionamento">{m.stazionamento || '—'}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
          {mezziListaFiltrata.length === 0 ? (
            <p className="ares-muted ares-mezzi-settings-empty">
              {mezzi.length === 0
                ? 'Nessun mezzo in anagrafica.'
                : 'Nessun mezzo corrisponde alla ricerca.'}
            </p>
          ) : null}
        </div>
      </section>
      <details className="ares-mission-collapsible">
        <summary>Tipi mezzo (espandi)</summary>
        <section className="ares-settings-entity-block" style={{ marginTop: 8 }}>
          <ImpostazioniTextPanel
            title="Tipi mezzo"
            description="Compaiono nel menu a tendina in anagrafica mezzo (es. MSB, CMR, MSA). In import Excel, se il tipo non è in elenco viene usato il primo valore qui definito."
            value={impostazioni.tipiMezzo}
            onSave={(tipiMezzo) => setImpostazioni({ tipiMezzo })}
          />
        </section>
      </details>
      <details className="ares-mission-collapsible">
        <summary>Stazionamenti salvati — Aggiungi / elenco (espandi)</summary>
        <section className="ares-settings-entity-panel" style={{ marginTop: 8 }}>
          <p className="ares-muted">
            Nome e indirizzo (mappa Photon o coordinate) riusabili nel menu del form{' '}
            <strong>Crea / Modifica mezzo</strong>.
          </p>
          <button
            type="button"
            className="ares-btn primary"
            onClick={() => {
              setEditingStazione(null)
              setStazModalOpen(true)
            }}
          >
            Aggiungi stazionamento
          </button>
          {stazionamenti.length === 0 ? (
            <p className="ares-muted" style={{ marginTop: 12 }}>
              Nessuno stazionamento predefinito.
            </p>
          ) : (
            <div className="ares-table-wrap" style={{ marginTop: 12 }}>
              <table className="ares-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Indirizzo</th>
                    <th>Coordinate</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {stazionamenti.map((s) => (
                    <tr key={s.id}>
                      <td>{s.nome}</td>
                      <td>{s.indirizzo || '—'}</td>
                      <td className="ares-muted">
                        {s.lat != null && s.lng != null
                          ? `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`
                          : '—'}
                      </td>
                      <td>
                        <div className="ares-inline">
                          <button
                            type="button"
                            className="ares-btn small secondary"
                            onClick={() => {
                              setEditingStazione(s)
                              setStazModalOpen(true)
                            }}
                          >
                            Modifica
                          </button>
                          <button
                            type="button"
                            className="ares-btn small danger"
                            onClick={() => {
                              if (!window.confirm(`Eliminare «${s.nome}»?`)) return
                              setImpostazioni({
                                stazionamentiMezzo: stazionamenti.filter(
                                  (x) => x.id !== s.id,
                                ),
                              })
                            }}
                          >
                            Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </details>
      </>
      )}

      {tab === 'pma_impostazioni' && <ImpostazioniPmaTab />}

      <MezzoFormModal
        open={mezzoModalOpen}
        mezzo={editingMezzo}
        tipiMezzo={tipiMezzoList}
        stazionamentiPresets={stazionamenti}
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
              stato: payload.stato,
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
              stato: payload.stato,
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
      <StazionamentoPresetModal
        open={stazModalOpen}
        preset={editingStazione}
        onClose={() => {
          setStazModalOpen(false)
          setEditingStazione(null)
        }}
        onSave={(preset) => {
          const sans = editingStazione
            ? stazionamenti.map((s) => (s.id === preset.id ? preset : s))
            : [...stazionamenti, preset]
          setImpostazioni({ stazionamentiMezzo: sans })
        }}
      />
    </div>
  )
}
