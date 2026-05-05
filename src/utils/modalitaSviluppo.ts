import type { Impostazioni } from '../types'

/** Bypass login e filtri route solo se esplicitamente true in Impostazioni (persistito). */
export function isModalitaSviluppoAttiva(imp?: Impostazioni): boolean {
  return imp?.modalitaSviluppo === true
}
