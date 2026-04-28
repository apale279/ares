/** Scala la dimensione base del testo (rem) tramite `html { font-size }`. */

const STORAGE_KEY = 'ares-font-step'
const BASE_PX = 16
const MIN_PX = 12
const MAX_PX = 26

/** Step minimo/maximo rispetto a BASE_PX (es. -4 … +10). */
export const FONT_STEP_MIN = MIN_PX - BASE_PX
export const FONT_STEP_MAX = MAX_PX - BASE_PX

function clampStep(step: number): number {
  return Math.max(FONT_STEP_MIN, Math.min(FONT_STEP_MAX, Math.trunc(step)))
}

export function getFontStep(): number {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY))
    return clampStep(Number.isFinite(n) ? n : 0)
  } catch {
    return 0
  }
}

export function applyStoredFontStep(): void {
  const step = getFontStep()
  document.documentElement.style.fontSize = `${BASE_PX + step}px`
}

/** Delta tipicamente +1 o -1. Restituisce il nuovo step (dopo clamp). */
export function adjustFontStep(delta: number): number {
  const next = clampStep(getFontStep() + delta)
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    /* ignore */
  }
  document.documentElement.style.fontSize = `${BASE_PX + next}px`
  return next
}
