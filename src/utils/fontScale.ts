/**
 * Scala il testo del contenuto (non i pulsanti) tramite `--ares-text-extra` su `:root`.
 * I pulsanti hanno `font-size` fisso in CSS.
 */

const STORAGE_KEY = 'ares-font-step'
const EXTRA_MIN = -4
const EXTRA_MAX = 10

/** Step minimo/maximo in pixel aggiunti al testo contenuto. */
export const FONT_STEP_MIN = EXTRA_MIN
export const FONT_STEP_MAX = EXTRA_MAX

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
  document.documentElement.style.removeProperty('font-size')
  document.documentElement.style.setProperty('--ares-text-extra', `${step}px`)
}

/** Delta tipicamente +1 o -1. Restituisce il nuovo step (dopo clamp). */
export function adjustFontStep(delta: number): number {
  const next = clampStep(getFontStep() + delta)
  try {
    localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    /* ignore */
  }
  document.documentElement.style.removeProperty('font-size')
  document.documentElement.style.setProperty('--ares-text-extra', `${next}px`)
  return next
}
