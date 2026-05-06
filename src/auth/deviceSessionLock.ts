import { supabase } from '../lib/supabaseClient'

const DEVICE_ID_KEY = 'ares_device_id_v1'

function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
}

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const created = `dev_${crypto.randomUUID()}`
    localStorage.setItem(DEVICE_ID_KEY, created)
    return created
  } catch {
    return `dev_fallback_${Math.random().toString(36).slice(2, 10)}`
  }
}

function lockRowIdForUser(userId: string): string {
  return `lock_user_${userId}`
}

export async function acquireUserDeviceLock(userId: string): Promise<{
  ok: boolean
  reason?: string
}> {
  if (!isSupabaseConfigured()) return { ok: true }
  const deviceId = getOrCreateDeviceId()
  const rowId = lockRowIdForUser(userId)
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('ares_state')
    .select('payload')
    .eq('id', rowId)
    .maybeSingle()
  if (error) return { ok: false, reason: error.message }

  const payload = (data?.payload ?? null) as
    | { deviceId?: string; userId?: string; lockedAt?: string }
    | null

  if (payload?.deviceId && payload.deviceId !== deviceId) {
    return {
      ok: false,
      reason:
        'Utente già attivo su un altro dispositivo. Esegui logout dal dispositivo precedente prima di entrare qui.',
    }
  }

  const { error: upsertError } = await supabase.from('ares_state').upsert(
    {
      id: rowId,
      payload: { userId, deviceId, lockedAt: now },
      updated_at: now,
    },
    { onConflict: 'id' },
  )
  if (upsertError) return { ok: false, reason: upsertError.message }
  return { ok: true }
}

export async function releaseUserDeviceLock(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const rowId = lockRowIdForUser(userId)
  const deviceId = getOrCreateDeviceId()
  const { data, error } = await supabase
    .from('ares_state')
    .select('payload')
    .eq('id', rowId)
    .maybeSingle()
  if (error) return
  const payload = (data?.payload ?? null) as { deviceId?: string } | null
  if (payload?.deviceId !== deviceId) return
  await supabase.from('ares_state').delete().eq('id', rowId)
}
