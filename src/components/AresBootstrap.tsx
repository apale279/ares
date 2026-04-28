import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAresStore } from '../store/aresStore'
import {
  isSupabaseConfigured,
  shouldSkipRemoteRehydrate,
} from '../store/supabasePersistStorage'

type Props = { children: ReactNode }

export function AresBootstrap({ children }: Props) {
  const [hydrated, setHydrated] = useState(() => useAresStore.persist.hasHydrated())

  useEffect(() => {
    if (hydrated) return
    const unsub = useAresStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    if (useAresStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [hydrated])

  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured()) return

    const channel = supabase
      .channel('ares-state-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ares_state',
          filter: 'id=eq.default',
        },
        () => {
          if (shouldSkipRemoteRehydrate()) return
          void useAresStore.persist.rehydrate()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [hydrated])

  if (!hydrated) {
    return (
      <div className="ares-bootstrap-loading" role="status">
        Caricamento dati…
      </div>
    )
  }

  return <>{children}</>
}
