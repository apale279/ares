import type { Equipaggio, PersonaContatto } from '../types'

const vuoto: PersonaContatto = { nome: '', cognome: '', telefono: '' }

export function equipaggioVuoto(): Equipaggio {
  return {
    autista: { ...vuoto },
    capoEquipaggio: { ...vuoto },
    soccorritore1: { ...vuoto },
    soccorritore2: { ...vuoto },
  }
}

export function copiaEquipaggio(e: Equipaggio): Equipaggio {
  return {
    autista: { ...e.autista },
    capoEquipaggio: { ...e.capoEquipaggio },
    soccorritore1: { ...e.soccorritore1 },
    soccorritore2: { ...e.soccorritore2 },
  }
}
