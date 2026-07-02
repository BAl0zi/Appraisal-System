import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin() {
  if (adminClient) {
    return adminClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key')
  }

  // Note: This client should ONLY be used in server-side contexts (API routes, Server Actions)
  // NEVER use this on the client side as it exposes your service role key.
  adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return adminClient
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    const value = Reflect.get(getSupabaseAdmin(), property, receiver)

    if (typeof value === 'function') {
      return value.bind(getSupabaseAdmin())
    }

    return value
  }
})
