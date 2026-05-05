import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const SESSION_KEY = 'ares_session_v1'

export type AresSession = {
  userId: string
  nomeUtente: string
}

function readSession(): AresSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const userId = String((o as AresSession).userId ?? '').trim()
    const nomeUtente = String((o as AresSession).nomeUtente ?? '').trim()
    if (!userId || !nomeUtente) return null
    return { userId, nomeUtente }
  } catch {
    return null
  }
}

type AuthCtx = {
  session: AresSession | null
  login: (s: AresSession) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AresSession | null>(() => readSession())

  const login = useCallback((s: AresSession) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      session,
      login,
      logout,
    }),
    [session, login, logout],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth fuori da AuthProvider')
  return v
}
