import type { LayoutPannelli, PanelRect } from '../types'

export type DashboardPanelKey = keyof LayoutPannelli

const MIN_QUAD_W = 280
const MIN_QUAD_H = 180

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

/**
 * Mantiene i 4 pannelli in una griglia 2×2 senza sovrapposizioni:
 * ingrandirne uno riduce automaticamente il vicino (stessa riga o colonna).
 */
export function reconcileQuadLayoutAfterPanelChange(
  panelKey: DashboardPanelKey,
  mergedRect: PanelRect,
  areaWidth: number,
  areaHeight: number,
): LayoutPannelli {
  const w = Math.max(320, areaWidth)
  const h = Math.max(240, areaHeight)
  const innerW = Math.max(MIN_QUAD_W * 2 + 1, w - PAD * 3)
  const innerH = Math.max(MIN_QUAD_H * 2 + 1, h - PAD * 3)

  let w1: number
  let h1: number

  switch (panelKey) {
    case 'eventi':
      w1 = mergedRect.width
      h1 = mergedRect.height
      break
    case 'missioni':
      w1 = innerW - mergedRect.width
      h1 = mergedRect.height
      break
    case 'mezzi':
      w1 = mergedRect.width
      h1 = innerH - mergedRect.height
      break
    case 'mappa':
      w1 = innerW - mergedRect.width
      h1 = innerH - mergedRect.height
      break
  }

  w1 = Math.min(Math.max(w1, MIN_QUAD_W), innerW - MIN_QUAD_W)
  h1 = Math.min(Math.max(h1, MIN_QUAD_H), innerH - MIN_QUAD_H)

  const w2 = innerW - w1
  const h2 = innerH - h1

  return {
    eventi: { x: PAD, y: PAD, width: w1, height: h1 },
    missioni: { x: PAD + w1 + PAD, y: PAD, width: w2, height: h1 },
    mezzi: { x: PAD, y: PAD + h1 + PAD, width: w1, height: h2 },
    mappa: { x: PAD + w1 + PAD, y: PAD + h1 + PAD, width: w2, height: h2 },
  }
}
