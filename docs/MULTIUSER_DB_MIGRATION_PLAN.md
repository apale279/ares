# Multiutente: oltre il modello single-shot

Lo stato attuale usa una riga unica (`ares_state.id = 'default'`) con payload JSON completo.
Questo modello e semplice ma, in scenari multiutente contemporanei, aumenta il rischio di conflitti.

## Ottimizzazioni applicate in v1.20.1

- Scrittura cloud con debounce (`700ms`) per ridurre burst di update.
- Deduplica payload: se il contenuto non cambia, niente write su DB.
- Short-circuit remoto: se payload locale = payload cloud, niente write.
- Mantenuto controllo optimistic concurrency su `updated_at`.

Queste ottimizzazioni riducono conflitti e scritture inutili, ma non eliminano il limite strutturale del single-shot.

## Migrazione DB consigliata (step successivo)

Per un vero multiutente concorrente:

1. Separare il dominio in tabelle atomiche:
   - `ares_eventi`
   - `ares_missioni`
   - `ares_pazienti`
   - `ares_mezzi`
   - `ares_note`
   - `ares_valutazioni`

2. Aggiungere colonne di concorrenza:
   - `updated_at timestamptz not null default now()`
   - `updated_by text null`
   - opzionale `revision bigint not null default 0`

3. Update per record (non per snapshot globale):
   - edit su una missione aggiorna solo quella riga.
   - conflitto confinato alla singola entita.

4. Audit dedicato:
   - tabella `ares_audit_log(id, at, user_id, action, entity, entity_id, detail jsonb)`.

5. Backup manuali dedicati:
   - tabella `ares_manual_backups(id, name, created_at, user_id, payload jsonb)`.

## Benefici attesi

- Minori conflitti tra utenti.
- Maggiore tracciabilita per entita.
- Migliore scalabilita su piu dispositivi/operatori.
- Ripristini piu mirati.
