import type { LayoutPannelli } from '../types'

/** Incrementa quando vuoi forzare un nuovo layout predefinito sui dati già salvati */
export const LAYOUT_VERSION = 2

const PAD = 8

/**
 * Quattro pannelli a griglia 2×2 che coprono tutta l’area (es. workspace dashboard).
 */
export function computeDefaultLayout(
  areaWidth: number,
  areaHeight: number,
): LayoutPannelli {
  const w = Math.max(320, areaWidth)
  const h = Math.max(240, areaHeight)
  const innerW = w - PAD * 3
  const innerH = h - PAD * 3
  const colW = innerW / 2
  const rowH = innerH / 2

  return {
    eventi: {
      x: PAD,
      y: PAD,
      width: colW,
      height: rowH,
    },
    missioni: {
      x: PAD * 2 + colW,
      y: PAD,
      width: colW,
      height: rowH,
    },
    mezzi: {
      x: PAD,
      y: PAD * 2 + rowH,
      width: colW,
      height: rowH,
    },
    mappa: {
      x: PAD * 2 + colW,
      y: PAD * 2 + rowH,
      width: colW,
      height: rowH,
    },
  }
}

/** Stima area utile sotto nav + topbar dashboard (allineata al CSS). */
export function workspaceArea(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 }
  }
  const nav = 52
  const dashboardTopbar = 52
  const chrome = nav + dashboardTopbar
  return {
    width: window.innerWidth,
    height: Math.max(320, window.innerHeight - chrome),
  }
}
