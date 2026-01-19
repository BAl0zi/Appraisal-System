#!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/delete-user.mjs user@example.com')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function findUserIdByEmail(email) {
  // Try public.users table first
  const { data: userRow, error: rowErr } = await supabaseAdmin
    .from('users')
    .select('id,email')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  if (rowErr) throw rowErr
  if (userRow && userRow.id) return userRow.id

  // Fallback: search auth users list
  const { data: listResp, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
  if (listErr) throw listErr
  const found = (listResp?.users || []).find(u => u.email === email)
  return found ? found.id : null
}

async function run() {
  try {
    console.log('Looking up user id for', email)
    const userId = await findUserIdByEmail(email)
    if (!userId) {
      console.error('User not found with email:', email)
      process.exit(1)
    }
    console.log('Found user id:', userId)

    console.log('Deleting related appraisals...')
    const { error: delAppErr } = await supabaseAdmin
      .from('appraisals')
      .delete()
      .eq('appraisee_id', userId)
    if (delAppErr) throw delAppErr
    console.log('Appraisals deleted')

    console.log('Deleting related appraiser_assignments...')
    const { error: delAssignErr } = await supabaseAdmin
      .from('appraiser_assignments')
      .delete()
      .or(`appraiser_id.eq.${userId},appraisee_id.eq.${userId}`)
    if (delAssignErr) throw delAssignErr
    console.log('Assignments deleted')

    console.log('Deleting users row (public.users) if present...')
    const { error: delUserRowErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
    if (delUserRowErr) throw delUserRowErr
    console.log('User row deleted')

    console.log('Deleting Auth user...')
    const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authDelErr) throw authDelErr
    console.log('Auth user deleted')

    console.log('Done')
    process.exit(0)
  } catch (err) {
    console.error('Deletion failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

run()
