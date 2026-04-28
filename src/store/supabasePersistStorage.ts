import { supabase } from '../lib/supabaseClient'

const ROW_ID = 'default'
const LEGACY_STORAGE_KEY = 'ares-local-storage'

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pendingValue: string | null = null
let savePromiseChain: Promise<void> = Promise.resolve()
let ignoreRealtimeUntil = 0

function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

export function createSupabaseJsonStorage(): StateStorageLike {
  return {
    getItem: async (_name: string): Promise<string | null> => {
      if (!isSupabaseConfigured()) return null

      const { data, error } = await supabase
        .from('ares_state')
        .select('payload')
        .eq('id', ROW_ID)
        .maybeSingle()

      if (error) {
        console.error('[Ares] Supabase getItem:', error.message)
        return null
      }

      if (data?.payload != null) {
        const p = data.payload as unknown
        if (typeof p === 'string') return p
        return JSON.stringify(p)
      }

      try {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
        if (legacy) return legacy
      } catch {
        /* ignore */
      }
      return null
    },

    setItem: async (_name: string, value: string): Promise<void> => {
      if (!isSupabaseConfigured()) return

      pendingValue = value
      if (saveTimer) clearTimeout(saveTimer)

      savePromiseChain = savePromiseChain.then(
        () =>
          new Promise<void>((resolve, reject) => {
            saveTimer = setTimeout(async () => {
              saveTimer = null
              const toWrite = pendingValue
              pendingValue = null
              if (toWrite == null) {
                resolve()
                return
              }
              try {
                const payload = JSON.parse(toWrite) as unknown
                ignoreRealtimeUntil = Date.now() + 1200
                const { error } = await supabase.from('ares_state').upsert(
                  {
                    id: ROW_ID,
                    payload,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'id' },
                )
                if (error) throw error
                resolve()
              } catch (e) {
                console.error('[Ares] Supabase setItem:', e)
                reject(e)
              }
            }, 450)
          }),
      )

      await savePromiseChain
    },

    removeItem: async (_name: string): Promise<void> => {
      if (!isSupabaseConfigured()) return
      await supabase
        .from('ares_state')
        .update({
          payload: { version: 0, state: {} },
          updated_at: new Date().toISOString(),
        })
        .eq('id', ROW_ID)
    },
  }
}

/** Storage minimale compatibile con `createJSONStorage` di zustand */
interface StateStorageLike {
  getItem: (name: string) => string | null | Promise<string | null>
  setItem: (name: string, value: string) => void | Promise<void>
  removeItem: (name: string) => void | Promise<void>
}

/** Evita rehydrate subito dopo un salvataggio locale (debounce + echo Realtime). */
export function shouldSkipRemoteRehydrate(): boolean {
  return Date.now() < ignoreRealtimeUntil
}

export { isSupabaseConfigured }
