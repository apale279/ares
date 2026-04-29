import type { ReactNode } from 'react'
import { Rnd } from 'react-rnd'
import { useAresStore } from '../store/aresStore'

type PanelKey = 'eventi' | 'missioni' | 'mezzi' | 'mappa'

export function DraggablePanel({
  panelKey,
  title,
  children,
  zIndex = 10,
}: {
  panelKey: PanelKey
  title: string
  children: ReactNode
  zIndex?: number
}) {
  const rect = useAresStore((s) => s.layout[panelKey])
  const applyPanelLayoutQuad = useAresStore((s) => s.applyPanelLayoutQuad)

  const onDragStop = (_e: unknown, d: { x: number; y: number }) => {
    applyPanelLayoutQuad(panelKey, { x: d.x, y: d.y })
  }

  const onResizeStop = (
    _e: unknown,
    _dir: unknown,
    ref: HTMLElement,
    _delta: unknown,
    pos: { x: number; y: number },
  ) => {
    applyPanelLayoutQuad(panelKey, {
      x: pos.x,
      y: pos.y,
      width: ref.offsetWidth,
      height: ref.offsetHeight,
    })
  }

  return (
    <Rnd
      bounds="parent"
      size={{ width: rect.width, height: rect.height }}
      position={{ x: rect.x, y: rect.y }}
      onDragStop={onDragStop}
      onResizeStop={onResizeStop}
      minWidth={280}
      minHeight={180}
      dragHandleClassName="ares-panel-drag"
      style={{ zIndex }}
      className="ares-rnd"
    >
      <div className="ares-panel">
        <header className="ares-panel-drag ares-panel-head">
          <span>{title}</span>
        </header>
        <div className="ares-panel-body">{children}</div>
      </div>
    </Rnd>
  )
}
