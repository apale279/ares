import type { AppRouteKey, Impostazioni } from '../types'

const ROUTE_ORDER: { key: AppRouteKey; path: string }[] = [
  { key: 'dashboard', path: '/dashboard' },
  { key: 'diario', path: '/diario' },
  { key: 'ricerca', path: '/ricerca' },
  { key: 'impostazioni', path: '/impostazioni' },
  { key: 'pma_modulo', path: '/pma' },
  { key: 'mezzo', path: '/mezzo' },
]

export function routeAllowedForUser(
  imp: Impostazioni,
  userId: string | null | undefined,
  route: AppRouteKey,
): boolean {
  if (imp.modalitaSviluppo === true) return true
  if (!userId) return false
  const u = imp.utenti?.find((x) => x.id === userId)
  if (!u) return false
  const rank = imp.rankUtente?.find((r) => r.id === u.rankId)
  if (!rank?.routeKeys?.length) return false
  return rank.routeKeys.includes(route)
}

export function firstAllowedRoutePath(
  imp: Impostazioni,
  userId: string | null | undefined,
): string {
  for (const r of ROUTE_ORDER) {
    if (routeAllowedForUser(imp, userId, r.key)) return r.path
  }
  return '/dashboard'
}
