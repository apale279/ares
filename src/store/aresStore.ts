import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_IMPOSTAZIONI, MISSION_STATE_ORDER } from '../constants'
import {
  computeDefaultLayout,
  LAYOUT_VERSION,
  reconcileQuadLayoutAfterPanelChange,
  workspaceArea,
} from '../utils/dashboardLayout'
import type {
  Evento,
  Impostazioni,
  LayoutPannelli,
  Mezzo,
  Missione,
  MissionStateLog,
  Paziente,
  StatoEvento,
  StatoMissione,
  TipoEvento,
  Valutazione,
} from '../types'
import { copiaEquipaggio, equipaggioVuoto } from '../utils/equipaggio'
import {
  migrateImpostazioni,
  migratePazienti,
  migrateValutazioni,
} from './persistMigration'
import {
  nuovaValutazioneMSA,
  nuovaValutazioneMSB,
  nuovaValutazionePMA,
} from './valutazioneFactories'
import {
  nuovoIdEvento,
  nuovoIdMezzo,
  nuovoIdMissione,
  nuovoIdPaziente,
} from '../utils/ids'
import {
  createSupabaseJsonStorage,
  isSupabaseConfigured,
} from './supabasePersistStorage'

function nowIso(): string {
  return new Date().toISOString()
}

function prossimoStatoMissione(s: StatoMissione): StatoMissione {
  const i = MISSION_STATE_ORDER.indexOf(s)
  if (i < 0 || i >= MISSION_STATE_ORDER.length - 1) return s
  return MISSION_STATE_ORDER[i + 1]!
}

export interface AresState {
  impostazioni: Impostazioni
  eventi: Evento[]
  missioni: Missione[]
  mezzi: Mezzo[]
  pazienti: Paziente[]
  valutazioni: Valutazione[]
  layout: LayoutPannelli
  /** Per migrazione layout a schermo intero (incrementa LAYOUT_VERSION) */
  layoutVersion: number
  /** Centra la mappa su questo punto (una tantum, consumato dalla mappa) */
  mapFocus: { lat: number; lng: number; key: number } | null

  /** Modali globali (non persistiti) */
  modalEventoId: string | null
  modalMissioneId: string | null
  modalPazienteId: string | null
  modalMezzoId: string | null
  openModalEvento: (id: string | null) => void
  openModalMissione: (id: string | null) => void
  openModalPaziente: (id: string | null) => void
  openModalMezzo: (id: string | null) => void

  setImpostazioni: (p: Partial<Impostazioni>) => void
  setLayout: (l: Partial<LayoutPannelli>) => void
  updatePanelRect: (key: keyof LayoutPannelli, rect: Partial<LayoutPannelli[keyof LayoutPannelli]>) => void
  /** Griglia 2×2 senza sovrapposizioni dopo drag/resize pannello */
  applyPanelLayoutQuad: (
    key: keyof LayoutPannelli,
    rect: Partial<LayoutPannelli[keyof LayoutPannelli]>,
  ) => void
  requestMapFocus: (lat: number, lng: number) => void
  clearMapFocus: () => void
  /** Ripristina layout pannelli dashboard a griglia su schermo */
  resetLayoutVista: () => void

  addMezzo: (partial: Omit<Mezzo, 'id' | 'equipaggio' | 'stato'> & { equipaggio?: Mezzo['equipaggio'] }) => string
  updateMezzo: (id: string, patch: Partial<Mezzo>) => void
  deleteMezzo: (id: string) => void

  addEvento: (input: Omit<Evento, 'id' | 'createdAt' | 'stato'> & { stato?: StatoEvento }) => string
  updateEvento: (id: string, patch: Partial<Evento>) => void
  chiudiEvento: (id: string) => void
  deleteEvento: (id: string) => void

  addMissione: (eventoId: string, mezzoId: string) => { ok: true; id: string } | { ok: false; reason: string }
  updateMissioneStato: (missioneId: string, stato: StatoMissione) => void
  avanzaMissione: (missioneId: string) => void
  /** Imposta FINE_MISSIONE e libera il mezzo (stesso effetto dell’ultimo stato). */
  terminaMissione: (missioneId: string) => void
  deleteMissione: (missioneId: string) => void

  addPaziente: (eventoId: string) => string
  updatePaziente: (id: string, patch: Partial<Paziente>) => void
  deletePaziente: (id: string) => void

  addValutazioneMSB: (pazienteId: string) => string
  addValutazioneMSA: (pazienteId: string) => string
  addValutazionePMA: (pazienteId: string) => string
  updateValutazione: (id: string, patch: Record<string, unknown>) => void
  deleteValutazione: (id: string) => void

  /** Ricalcola stati evento dopo mutazioni missioni */
  _reconcile: () => void
}

function collectIds(state: Pick<AresState, 'eventi' | 'missioni'>): {
  eventi: Set<string>
  missioni: Set<string>
} {
  return {
    eventi: new Set(state.eventi.map((e) => e.id)),
    missioni: new Set(state.missioni.map((m) => m.id)),
  }
}

export const useAresStore = create<AresState>()(
  persist(
    (set, get) => ({
      impostazioni: { ...DEFAULT_IMPOSTAZIONI },
      eventi: [],
      missioni: [],
      mezzi: [],
      pazienti: [],
      valutazioni: [],
      layout: computeDefaultLayout(
        workspaceArea().width,
        workspaceArea().height,
      ),
      layoutVersion: LAYOUT_VERSION,
      mapFocus: null,

      modalEventoId: null,
      modalMissioneId: null,
      modalPazienteId: null,
      modalMezzoId: null,

      openModalEvento: (id) => set({ modalEventoId: id }),
      openModalMissione: (id) => set({ modalMissioneId: id }),
      openModalPaziente: (id) => set({ modalPazienteId: id }),
      openModalMezzo: (id) => set({ modalMezzoId: id }),

      requestMapFocus: (lat, lng) =>
        set({ mapFocus: { lat, lng, key: Date.now() } }),

      clearMapFocus: () => set({ mapFocus: null }),

      resetLayoutVista: () => {
        const { width, height } = workspaceArea()
        set({ layout: computeDefaultLayout(width, height) })
      },

      setImpostazioni: (p) =>
        set((s) => ({
          impostazioni: migrateImpostazioni({ ...s.impostazioni, ...p }),
        })),

      setLayout: (l) =>
        set((s) => ({ layout: { ...s.layout, ...l } })),

      updatePanelRect: (key, rect) =>
        set((s) => ({
          layout: {
            ...s.layout,
            [key]: { ...s.layout[key], ...rect },
          },
        })),

      applyPanelLayoutQuad: (key, rect) =>
        set((s) => {
          const merged = { ...s.layout[key], ...rect }
          const { width, height } = workspaceArea()
          return {
            layout: reconcileQuadLayoutAfterPanelChange(key, merged, width, height),
          }
        }),

      addMezzo: (partial) => {
        const id = nuovoIdMezzo()
        const mezzo: Mezzo = {
          id,
          tipo: partial.tipo,
          sigla: partial.sigla,
          siglaRadio: partial.siglaRadio,
          targa: partial.targa,
          stazionamento: partial.stazionamento,
          stazionamentoLat: partial.stazionamentoLat ?? null,
          stazionamentoLng: partial.stazionamentoLng ?? null,
          equipaggio: partial.equipaggio ?? equipaggioVuoto(),
          stato: 'DISPONIBILE',
        }
        set((s) => ({ mezzi: [...s.mezzi, mezzo] }))
        return id
      },

      updateMezzo: (id, patch) =>
        set((s) => ({
          mezzi: s.mezzi.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),

      deleteMezzo: (id) =>
        set((s) => ({
          mezzi: s.mezzi.filter((m) => m.id !== id),
          missioni: s.missioni.filter((m) => m.mezzoId !== id),
          pazienti: s.pazienti.map((p) =>
            p.mezzoTrasportoId === id ? { ...p, mezzoTrasportoId: null } : p,
          ),
        })),

      addEvento: (input) => {
        const ids = collectIds(get())
        const id = nuovoIdEvento(ids.eventi)
        const evento: Evento = {
          id,
          createdAt: nowIso(),
          stato: input.stato ?? 'IN_ATTESA',
          indirizzoLimitato: input.indirizzoLimitato,
          indirizzo: input.indirizzo,
          lat: input.lat,
          lng: input.lng,
          tipoEvento: input.tipoEvento,
          dettaglioEvento: input.dettaglioEvento,
          descrizione: input.descrizione,
          codice: input.codice,
          segnalatoDa: input.segnalatoDa,
        }
        const idsPaz = new Set(get().pazienti.map((x) => x.id))
        const pazId = nuovoIdPaziente(idsPaz)
        const paziente: Paziente = {
          id: pazId,
          eventoId: id,
          nome: '',
          cognome: '',
          dataNascita: '',
          note: '',
          esito: '',
          tipoDestinazioneTrasporto: 'OSPEDALE',
          ospedaleDestinazione: '',
          pmaDestinazione: '',
          mezzoTrasportoId: null,
          arrivoInOspedaleAt: null,
          pmaArrivoAt: null,
          trasportoCompletatoAt: null,
        }
        set((s) => ({
          eventi: [...s.eventi, evento],
          pazienti: [...s.pazienti, paziente],
        }))
        get()._reconcile()
        return id
      },

      updateEvento: (id, patch) =>
        set((s) => ({
          eventi: s.eventi.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        })),

      chiudiEvento: (id) => {
        const s = get()
        const ts = nowIso()
        let missioni = s.missioni.map((m) => {
          if (m.eventoId !== id || m.stato === 'FINE_MISSIONE') return m
          return {
            ...m,
            stato: 'FINE_MISSIONE' as const,
            statoHistory: [
              ...m.statoHistory,
              { stato: 'FINE_MISSIONE' as const, at: ts },
            ],
          }
        })
        const mezzoIds = new Set(
          s.missioni.filter((m) => m.eventoId === id).map((m) => m.mezzoId),
        )
        const mezzi = s.mezzi.map((m) =>
          mezzoIds.has(m.id) && m.stato === 'OCCUPATO'
            ? { ...m, stato: 'DISPONIBILE' as const }
            : m,
        )
        const eventi = s.eventi.map((e) =>
          e.id === id ? { ...e, stato: 'CHIUSO' as const } : e,
        )
        set({ missioni, mezzi, eventi })
        get()._reconcile()
      },

      deleteEvento: (id) => {
        const s = get()
        const missioni = s.missioni.filter((m) => m.eventoId === id)
        const mezzoIds = new Set(missioni.map((m) => m.mezzoId))
        const pazIds = s.pazienti.filter((p) => p.eventoId === id).map((p) => p.id)
        set({
          eventi: s.eventi.filter((e) => e.id !== id),
          missioni: s.missioni.filter((m) => m.eventoId !== id),
          pazienti: s.pazienti.filter((p) => p.eventoId !== id),
          valutazioni: s.valutazioni.filter((v) => !pazIds.includes(v.pazienteId)),
          mezzi: s.mezzi.map((m) =>
            mezzoIds.has(m.id) && m.stato === 'OCCUPATO'
              ? { ...m, stato: 'DISPONIBILE' as const }
              : m,
          ),
        })
      },

      addMissione: (eventoId, mezzoId) => {
        const s = get()
        const ev = s.eventi.find((e) => e.id === eventoId)
        if (!ev) return { ok: false, reason: 'Evento non trovato' }
        if (ev.stato === 'CHIUSO') return { ok: false, reason: 'Evento chiuso' }
        const mezzo = s.mezzi.find((m) => m.id === mezzoId)
        if (!mezzo) return { ok: false, reason: 'Mezzo non trovato' }
        if (mezzo.stato !== 'DISPONIBILE')
          return { ok: false, reason: 'Mezzo non disponibile' }
        const ids = collectIds(s)
        const id = nuovoIdMissione(ids.missioni)
        const ts = nowIso()
        const log: MissionStateLog = { stato: 'ALLERTARE', at: ts }
        const missione: Missione = {
          id,
          eventoId,
          createdAt: ts,
          mezzoId,
          equipaggio: copiaEquipaggio(mezzo.equipaggio),
          stato: 'ALLERTARE',
          statoHistory: [log],
        }
        set({
          missioni: [...s.missioni, missione],
          mezzi: s.mezzi.map((m) =>
            m.id === mezzoId ? { ...m, stato: 'OCCUPATO' as const } : m,
          ),
        })
        get()._reconcile()
        return { ok: true, id }
      },

      updateMissioneStato: (missioneId, stato) => {
        const ts = nowIso()
        set((s) => {
          const cur = s.missioni.find((x) => x.id === missioneId)
          if (!cur || cur.stato === stato) return s
          const missioni = s.missioni.map((m) => {
            if (m.id !== missioneId) return m
            const history = [...m.statoHistory, { stato, at: ts }]
            return { ...m, stato, statoHistory: history }
          })
          let pazienti = s.pazienti
          const m = missioni.find((x) => x.id === missioneId)
          if (m && stato === 'ARRIVATO_IN_H') {
            pazienti = s.pazienti.map((p) => {
              if (
                p.eventoId !== m.eventoId ||
                p.mezzoTrasportoId !== m.mezzoId ||
                p.esito !== 'TRASPORTATO'
              ) {
                return p
              }
              const tipo = p.tipoDestinazioneTrasporto ?? 'OSPEDALE'
              const slegato: Paziente = { ...p, mezzoTrasportoId: null }
              if (tipo === 'OSPEDALE') {
                return {
                  ...slegato,
                  arrivoInOspedaleAt: p.arrivoInOspedaleAt ?? ts,
                  trasportoCompletatoAt: p.trasportoCompletatoAt ?? ts,
                }
              }
              return {
                ...slegato,
                pmaArrivoAt: p.pmaArrivoAt ?? ts,
              }
            })
          }
          let mezzi = s.mezzi
          if (m && stato === 'FINE_MISSIONE') {
            mezzi = s.mezzi.map((mz) =>
              mz.id === m.mezzoId ? { ...mz, stato: 'DISPONIBILE' as const } : mz,
            )
          }
          return { missioni, pazienti, mezzi }
        })
        get()._reconcile()
      },

      avanzaMissione: (missioneId) => {
        const m = get().missioni.find((x) => x.id === missioneId)
        if (!m) return
        const next = prossimoStatoMissione(m.stato)
        if (next === m.stato) return
        get().updateMissioneStato(missioneId, next)
      },

      terminaMissione: (missioneId) => {
        const m = get().missioni.find((x) => x.id === missioneId)
        if (!m || m.stato === 'FINE_MISSIONE') return
        get().updateMissioneStato(missioneId, 'FINE_MISSIONE')
      },

      deleteMissione: (missioneId) => {
        const s = get()
        const m = s.missioni.find((x) => x.id === missioneId)
        if (!m) return
        set({
          missioni: s.missioni.filter((x) => x.id !== missioneId),
          mezzi: s.mezzi.map((mz) =>
            mz.id === m.mezzoId && mz.stato === 'OCCUPATO'
              ? { ...mz, stato: 'DISPONIBILE' as const }
              : mz,
          ),
        })
        get()._reconcile()
      },

      addPaziente: (eventoId) => {
        const s = get()
        const id = nuovoIdPaziente(new Set(s.pazienti.map((x) => x.id)))
        const p: Paziente = {
          id,
          eventoId,
          nome: '',
          cognome: '',
          dataNascita: '',
          note: '',
          esito: '',
          tipoDestinazioneTrasporto: 'OSPEDALE',
          ospedaleDestinazione: '',
          pmaDestinazione: '',
          mezzoTrasportoId: null,
          arrivoInOspedaleAt: null,
          pmaArrivoAt: null,
          trasportoCompletatoAt: null,
        }
        set({ pazienti: [...s.pazienti, p] })
        return id
      },

      updatePaziente: (id, patch) =>
        set((s) => ({
          pazienti: s.pazienti.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      deletePaziente: (id) =>
        set((s) => ({
          pazienti: s.pazienti.filter((p) => p.id !== id),
          valutazioni: s.valutazioni.filter((v) => v.pazienteId !== id),
        })),

      addValutazioneMSB: (pazienteId) => {
        const v = nuovaValutazioneMSB(pazienteId)
        set((s) => ({ valutazioni: [...s.valutazioni, v] }))
        return v.id
      },

      addValutazioneMSA: (pazienteId) => {
        const v = nuovaValutazioneMSA(pazienteId)
        set((s) => ({ valutazioni: [...s.valutazioni, v] }))
        return v.id
      },

      addValutazionePMA: (pazienteId) => {
        const s = get()
        const p = s.pazienti.find((x) => x.id === pazienteId)
        const def = p?.pmaArrivoAt ?? nowIso()
        const v = nuovaValutazionePMA(pazienteId, def)
        set((st) => ({ valutazioni: [...st.valutazioni, v] }))
        return v.id
      },

      updateValutazione: (id, patch) =>
        set((s) => ({
          valutazioni: s.valutazioni.map((v) =>
            v.id === id ? ({ ...v, ...patch } as Valutazione) : v,
          ),
        })),

      deleteValutazione: (id) =>
        set((s) => ({
          valutazioni: s.valutazioni.filter((v) => v.id !== id),
        })),

      _reconcile: () => {
        set((s) => {
          const byEvent = new Map<string, Missione[]>()
          for (const m of s.missioni) {
            const arr = byEvent.get(m.eventoId) ?? []
            arr.push(m)
            byEvent.set(m.eventoId, arr)
          }
          const eventi = s.eventi.map((e) => {
            if (e.stato === 'CHIUSO') return e
            const list = byEvent.get(e.id) ?? []
            if (list.length === 0) {
              if (e.stato === 'IN_ATTESA') return e
              return { ...e, stato: 'IN_ATTESA' as const }
            }
            const tutteChiuse = list.every((m) => m.stato === 'FINE_MISSIONE')
            if (tutteChiuse) {
              return { ...e, stato: 'CHIUSO' as const }
            }
            if (e.stato === 'APERTO') return e
            return { ...e, stato: 'APERTO' as const }
          })
          return { eventi }
        })
      },
    }),
    {
      name: isSupabaseConfigured() ? 'ares-supabase' : 'ares-local-storage',
      storage: isSupabaseConfigured()
        ? createJSONStorage(() => createSupabaseJsonStorage())
        : createJSONStorage(() => localStorage),
      partialize: (s) => ({
        impostazioni: s.impostazioni,
        eventi: s.eventi,
        missioni: s.missioni,
        mezzi: s.mezzi,
        pazienti: s.pazienti,
        valutazioni: s.valutazioni,
        layout: s.layout,
        layoutVersion: s.layoutVersion,
      }),
      merge: (persistedState, currentState) => {
        const p = (persistedState ?? {}) as Partial<AresState>
        const c = currentState as AresState
        const out = { ...c, ...p } as AresState
        const prevVer = p.layoutVersion
        if (prevVer == null || prevVer < LAYOUT_VERSION) {
          const { width, height } = workspaceArea()
          out.layout = computeDefaultLayout(width, height)
          out.layoutVersion = LAYOUT_VERSION
        }
        if (out.mezzi?.length) {
          out.mezzi = out.mezzi.map((m) => ({
            ...m,
            stazionamentoLat: m.stazionamentoLat ?? null,
            stazionamentoLng: m.stazionamentoLng ?? null,
          }))
        }
        out.impostazioni = migrateImpostazioni(p.impostazioni)
        out.pazienti = migratePazienti(out.pazienti ?? [])
        out.valutazioni = migrateValutazioni(
          (p as { valutazioni?: unknown }).valutazioni,
        )
        return out
      },
    },
  ),
)

export function dettagliPerTipo(
  imp: Impostazioni,
  tipo: TipoEvento,
): string[] {
  if (tipo === 'MEDICO') return imp.dettagliMedico
  if (tipo === 'TRAUMA') return imp.dettagliTrauma
  return imp.dettagliNonNoto
}
