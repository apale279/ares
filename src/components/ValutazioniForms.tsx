import type {
  Missione,
  ValutazioneMSA,
  ValutazioneMSB,
  ValutazionePMA,
} from '../types'
import {
  CIRCOLO_MSB_OPTS,
  CIRCOLO_MSA_OPTS,
  COSCIENZA_MSB,
  CUTE_OPTS,
  ESITO_PMA_OPTS,
  RESPIRO_MSB,
  RESPIRO_MSA,
  labelOpt,
} from '../constants/valutazioneOptions'
import { equipaggioToPlainText } from '../utils/equipaggioPrint'

function toggleStr(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

function MultiRow({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <fieldset className="ares-fieldset">
      <legend>{label} (multiplo)</legend>
      <div className="ares-multi-grid">
        {options.map((opt) => (
          <label key={opt} className="ares-check-inline">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onChange(toggleStr(selected, opt))}
            />
            {labelOpt(opt)}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function ValutazioneMSBEditor({
  v,
  missioniScelta,
  manovreOpts,
  onChange,
  onDelete,
}: {
  v: ValutazioneMSB
  missioniScelta: { missione: Missione; label: string }[]
  manovreOpts: string[]
  onChange: (patch: Partial<ValutazioneMSB>) => void
  onDelete: () => void
}) {
  return (
    <div className="ares-card ares-val-card">
      <div className="ares-val-head">
        <strong>Valutazione MSB</strong>
        <button type="button" className="ares-btn small danger" onClick={onDelete}>
          Elimina
        </button>
      </div>
      <label>
        Data/ora
        <input
          type="datetime-local"
          value={v.timestamp.slice(0, 16)}
          onChange={(e) =>
            onChange({
              timestamp: new Date(e.target.value).toISOString(),
            })
          }
        />
      </label>
      <label>
        Missione / mezzo (valutazione eseguita da)
        <select
          value={v.missioneId ?? ''}
          onChange={(e) => {
            const mid = e.target.value === '' ? null : e.target.value
            const row = missioniScelta.find((x) => x.missione.id === mid)
            onChange({
              missioneId: mid,
              equipaggioRiepilogo: row
                ? equipaggioToPlainText(row.missione.equipaggio)
                : '',
            })
          }}
        >
          <option value="">—</option>
          {missioniScelta.map(({ missione, label }) => (
            <option key={missione.id} value={missione.id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Equipaggio (testo)
        <textarea
          rows={5}
          value={v.equipaggioRiepilogo}
          onChange={(e) =>
            onChange({ equipaggioRiepilogo: e.target.value })
          }
        />
      </label>
      <button
        type="button"
        className={
          v.arrestoCardiaco
            ? 'ares-btn danger'
            : 'ares-btn secondary'
        }
        onClick={() => onChange({ arrestoCardiaco: !v.arrestoCardiaco })}
      >
        ARRESTO CARDIACO
      </button>
      <label>
        Coscienza
        <select
          value={v.coscienza}
          onChange={(e) =>
            onChange({ coscienza: e.target.value as ValutazioneMSB['coscienza'] })
          }
        >
          {COSCIENZA_MSB.map((o) => (
            <option key={o.v || 'x'} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </label>
      <label>
        Respiro
        <select
          value={v.respiro}
          onChange={(e) =>
            onChange({ respiro: e.target.value as ValutazioneMSB['respiro'] })
          }
        >
          {RESPIRO_MSB.map((o) => (
            <option key={o.v || 'x'} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </label>
      <MultiRow
        label="Circolo"
        options={CIRCOLO_MSB_OPTS}
        selected={v.circolo}
        onChange={(circolo) => onChange({ circolo })}
      />
      <MultiRow
        label="Cute"
        options={CUTE_OPTS}
        selected={v.cute}
        onChange={(cute) => onChange({ cute })}
      />
      <fieldset className="ares-fieldset">
        <legend>Parametri vitali</legend>
        <div className="ares-form-grid tight">
          {(
            [
              ['fr', 'FR'],
              ['spo2Aa', 'SpO2 AA'],
              ['spo2O2', 'SpO2 O2'],
              ['fc', 'FC'],
              ['pa', 'PA'],
            ] as const
          ).map(([k, lab]) => (
            <label key={k}>
              {lab}
              <input
                value={v.parametriVitali[k]}
                onChange={(e) =>
                  onChange({
                    parametriVitali: {
                      ...v.parametriVitali,
                      [k]: e.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <MultiRow
        label="Manovre MSB"
        options={manovreOpts}
        selected={v.manovre}
        onChange={(manovre) => onChange({ manovre })}
      />
      <label>
        Breve descrizione evento
        <textarea
          rows={2}
          value={v.breveDescrizione}
          onChange={(e) => onChange({ breveDescrizione: e.target.value })}
        />
      </label>
    </div>
  )
}

export function ValutazioneMSAEditor({
  v,
  missioniScelta,
  manovreOpts,
  onChange,
  onDelete,
}: {
  v: ValutazioneMSA
  missioniScelta: { missione: Missione; label: string }[]
  manovreOpts: string[]
  onChange: (patch: Partial<ValutazioneMSA>) => void
  onDelete: () => void
}) {
  const addFarmaco = () => {
    const id = `farm_${crypto.randomUUID()}`
    const ts = new Date().toISOString()
    onChange({
      farmaci: [...v.farmaci, { id, testo: '', timestamp: ts }],
    })
  }

  return (
    <div className="ares-card ares-val-card">
      <div className="ares-val-head">
        <strong>Valutazione MSA</strong>
        <button type="button" className="ares-btn small danger" onClick={onDelete}>
          Elimina
        </button>
      </div>
      <label>
        Data/ora
        <input
          type="datetime-local"
          value={v.timestamp.slice(0, 16)}
          onChange={(e) =>
            onChange({
              timestamp: new Date(e.target.value).toISOString(),
            })
          }
        />
      </label>
      <label>
        Missione / mezzo
        <select
          value={v.missioneId ?? ''}
          onChange={(e) => {
            const mid = e.target.value === '' ? null : e.target.value
            const row = missioniScelta.find((x) => x.missione.id === mid)
            onChange({
              missioneId: mid,
              equipaggioRiepilogo: row
                ? equipaggioToPlainText(row.missione.equipaggio)
                : '',
            })
          }}
        >
          <option value="">—</option>
          {missioniScelta.map(({ missione, label }) => (
            <option key={missione.id} value={missione.id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Equipaggio (testo)
        <textarea
          rows={5}
          value={v.equipaggioRiepilogo}
          onChange={(e) =>
            onChange({ equipaggioRiepilogo: e.target.value })
          }
        />
      </label>
      <label>
        GCS (1–15)
        <input
          type="number"
          min={1}
          max={15}
          value={v.gcs ?? ''}
          onChange={(e) =>
            onChange({
              gcs:
                e.target.value === ''
                  ? null
                  : Math.min(15, Math.max(1, Number(e.target.value))),
            })
          }
        />
      </label>
      <label>
        Respiro
        <select
          value={v.respiro}
          onChange={(e) =>
            onChange({ respiro: e.target.value as ValutazioneMSA['respiro'] })
          }
        >
          {RESPIRO_MSA.map((o) => (
            <option key={o.v || 'x'} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </label>
      <MultiRow
        label="Circolo"
        options={CIRCOLO_MSA_OPTS}
        selected={v.circolo}
        onChange={(circolo) => onChange({ circolo })}
      />
      <MultiRow
        label="Cute"
        options={CUTE_OPTS}
        selected={v.cute}
        onChange={(cute) => onChange({ cute })}
      />
      <fieldset className="ares-fieldset">
        <legend>Parametri vitali</legend>
        <div className="ares-form-grid tight">
          {(
            [
              ['fr', 'FR'],
              ['spo2Aa', 'SpO2 AA'],
              ['spo2O2', 'SpO2 O2'],
              ['fc', 'FC'],
              ['pa', 'PA'],
            ] as const
          ).map(([k, lab]) => (
            <label key={k}>
              {lab}
              <input
                value={v.parametriVitali[k]}
                onChange={(e) =>
                  onChange({
                    parametriVitali: {
                      ...v.parametriVitali,
                      [k]: e.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
      </fieldset>
      <div className="ares-farmaci-block">
        <div className="ares-inline space-between">
          <span className="ares-label">Farmaci somministrati</span>
          <button type="button" className="ares-btn small secondary" onClick={addFarmaco}>
            Aggiungi farmaco
          </button>
        </div>
        {v.farmaci.map((f) => (
          <div key={f.id} className="ares-farmaco-row">
            <input
              type="datetime-local"
              value={f.timestamp.slice(0, 16)}
              onChange={(e) =>
                onChange({
                  farmaci: v.farmaci.map((x) =>
                    x.id === f.id
                      ? {
                          ...x,
                          timestamp: new Date(e.target.value).toISOString(),
                        }
                      : x,
                  ),
                })
              }
            />
            <input
              value={f.testo}
              placeholder="Farmaco / dose / via"
              onChange={(e) =>
                onChange({
                  farmaci: v.farmaci.map((x) =>
                    x.id === f.id ? { ...x, testo: e.target.value } : x,
                  ),
                })
              }
            />
            <button
              type="button"
              className="ares-btn small danger"
              onClick={() =>
                onChange({
                  farmaci: v.farmaci.filter((x) => x.id !== f.id),
                })
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <MultiRow
        label="Manovre MSA"
        options={manovreOpts}
        selected={v.manovre}
        onChange={(manovre) => onChange({ manovre })}
      />
      <label>
        Breve descrizione evento
        <textarea
          rows={2}
          value={v.breveDescrizione}
          onChange={(e) => onChange({ breveDescrizione: e.target.value })}
        />
      </label>
    </div>
  )
}

export function ValutazionePMAEditor({
  v,
  presetDimissione,
  manovreOpts,
  onChange,
  onDelete,
}: {
  v: ValutazionePMA
  presetDimissione: string[]
  manovreOpts: string[]
  onChange: (patch: Partial<ValutazionePMA>) => void
  onDelete: () => void
}) {
  const addFarmaco = () => {
    const id = `farm_${crypto.randomUUID()}`
    const ts = new Date().toISOString()
    onChange({
      farmaciSomministrati: [
        ...v.farmaciSomministrati,
        { id, testo: '', timestamp: ts },
      ],
    })
  }

  const addRivalutazione = () => {
    const id = `riv_${crypto.randomUUID()}`
    const ts = new Date().toISOString()
    onChange({
      rivalutazioni: [...v.rivalutazioni, { id, timestamp: ts, note: '' }],
    })
  }

  return (
    <div className="ares-card ares-val-card">
      <div className="ares-val-head">
        <strong>Valutazione PMA</strong>
        <button type="button" className="ares-btn small danger" onClick={onDelete}>
          Elimina
        </button>
      </div>
      <label>
        Data e ora di arrivo
        <input
          type="datetime-local"
          value={v.dataOraArrivo.slice(0, 16)}
          onChange={(e) =>
            onChange({
              dataOraArrivo: new Date(e.target.value).toISOString(),
            })
          }
        />
      </label>
      <label>
        APR
        <textarea
          rows={2}
          value={v.apr}
          onChange={(e) => onChange({ apr: e.target.value })}
        />
      </label>
      <label>
        Allergie
        <textarea
          rows={2}
          value={v.allergie}
          onChange={(e) => onChange({ allergie: e.target.value })}
        />
      </label>
      <label>
        APP
        <textarea
          rows={2}
          value={v.app}
          onChange={(e) => onChange({ app: e.target.value })}
        />
      </label>
      <label>
        EO
        <textarea
          rows={2}
          value={v.eo}
          onChange={(e) => onChange({ eo: e.target.value })}
        />
      </label>
      <div className="ares-farmaci-block">
        <div className="ares-inline space-between">
          <span className="ares-label">Farmaci somministrati</span>
          <button type="button" className="ares-btn small secondary" onClick={addFarmaco}>
            Aggiungi farmaco
          </button>
        </div>
        {v.farmaciSomministrati.map((f) => (
          <div key={f.id} className="ares-farmaco-row">
            <input
              type="datetime-local"
              value={f.timestamp.slice(0, 16)}
              onChange={(e) =>
                onChange({
                  farmaciSomministrati: v.farmaciSomministrati.map((x) =>
                    x.id === f.id
                      ? {
                          ...x,
                          timestamp: new Date(e.target.value).toISOString(),
                        }
                      : x,
                  ),
                })
              }
            />
            <input
              value={f.testo}
              placeholder="Farmaco / dose"
              onChange={(e) =>
                onChange({
                  farmaciSomministrati: v.farmaciSomministrati.map((x) =>
                    x.id === f.id ? { ...x, testo: e.target.value } : x,
                  ),
                })
              }
            />
            <button
              type="button"
              className="ares-btn small danger"
              onClick={() =>
                onChange({
                  farmaciSomministrati: v.farmaciSomministrati.filter(
                    (x) => x.id !== f.id,
                  ),
                })
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="ares-nested">
        <div className="ares-inline space-between">
          <span className="ares-label">Rivalutazioni</span>
          <button type="button" className="ares-btn small secondary" onClick={addRivalutazione}>
            Rivalutazione
          </button>
        </div>
        {v.rivalutazioni.map((r) => (
          <div key={r.id} className="ares-farmaco-row">
            <input
              type="datetime-local"
              value={r.timestamp.slice(0, 16)}
              onChange={(e) =>
                onChange({
                  rivalutazioni: v.rivalutazioni.map((x) =>
                    x.id === r.id
                      ? {
                          ...x,
                          timestamp: new Date(e.target.value).toISOString(),
                        }
                      : x,
                  ),
                })
              }
            />
            <input
              value={r.note}
              placeholder="Note"
              onChange={(e) =>
                onChange({
                  rivalutazioni: v.rivalutazioni.map((x) =>
                    x.id === r.id ? { ...x, note: e.target.value } : x,
                  ),
                })
              }
            />
            <button
              type="button"
              className="ares-btn small danger"
              onClick={() =>
                onChange({
                  rivalutazioni: v.rivalutazioni.filter((x) => x.id !== r.id),
                })
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <label>
        Preset dimissione
        <select
          value=""
          onChange={(e) => {
            if (!e.target.value) return
            const prefix = v.noteDimissione.trim()
            onChange({
              noteDimissione: prefix
                ? `${prefix}\n${e.target.value}`
                : e.target.value,
            })
            e.currentTarget.value = ''
          }}
        >
          <option value="">— Seleziona preset —</option>
          {presetDimissione.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        Note alla dimissione
        <textarea
          rows={4}
          value={v.noteDimissione}
          onChange={(e) => onChange({ noteDimissione: e.target.value })}
        />
      </label>
      <MultiRow
        label="Manovre PMA"
        options={manovreOpts}
        selected={v.manovreEffettuate}
        onChange={(manovreEffettuate) => onChange({ manovreEffettuate })}
      />
      <label>
        Esito
        <select
          value={v.esito}
          onChange={(e) =>
            onChange({
              esito: e.target.value as ValutazionePMA['esito'],
            })
          }
        >
          {ESITO_PMA_OPTS.map((o) => (
            <option key={o.v || 'x'} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </label>
      {v.esito === 'ALTRO' && (
        <label>
          Note (altro)
          <textarea
            rows={2}
            value={v.esitoAltroNote}
            onChange={(e) => onChange({ esitoAltroNote: e.target.value })}
          />
        </label>
      )}
    </div>
  )
}
