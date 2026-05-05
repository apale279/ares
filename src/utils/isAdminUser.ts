import type { Impostazioni } from '../types'
import { isModalitaSviluppoAttiva } from './modalitaSviluppo'

/** Rank amministratore: id predefinito o nome rank esattamente «ADMIN». */
export function isAdminUser(
  imp: Impostazioni,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false
  const u = imp.utenti?.find((x) => x.id === userId)
  if (!u) return false
  const rank = imp.rankUtente?.find((r) => r.id === u.rankId)
  if (!rank) return false
  if (rank.id === 'rank_admin') return true
  if (rank.nome.trim().toUpperCase() === 'ADMIN') return true
  return false
}

/** Admin di rank oppure modalità sviluppo attiva (accesso completo alle funzioni riservate). */
export function hasFullAppPrivileges(
  imp: Impostazioni,
  userId: string | null | undefined,
): boolean {
  if (isModalitaSviluppoAttiva(imp)) return true
  return isAdminUser(imp, userId)
}
