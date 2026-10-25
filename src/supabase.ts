import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const persistenceKey = 'vedhas-tracker-remember-session'

let rememberSession = window.sessionStorage.getItem(persistenceKey) !== 'false'

const sessionStorageAdapter = {
  getItem(key: string): string | null {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
  },
  setItem(key: string, value: string): void {
    const destination = rememberSession ? window.localStorage : window.sessionStorage
    const other = rememberSession ? window.sessionStorage : window.localStorage
    other.removeItem(key)
    destination.setItem(key, value)
  },
  removeItem(key: string): void {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

export function setRememberSession(remember: boolean): void {
  rememberSession = remember
  if (remember) {
    window.localStorage.setItem(persistenceKey, 'true')
    window.sessionStorage.removeItem(persistenceKey)
  } else {
    window.sessionStorage.setItem(persistenceKey, 'false')
    window.localStorage.removeItem(persistenceKey)
  }
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: sessionStorageAdapter,
      },
    })
  : null
