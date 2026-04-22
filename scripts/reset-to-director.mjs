#!/usr/bin/env node
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const args = process.argv.slice(2)
let keepEmail = null
let keepByRole = false
let execute = false
let dryRun = true

for (const a of args) {
  if (a.startsWith('--keep-email=')) keepEmail = a.split('=')[1]
  if (a === '--keep-role') keepByRole = true
  if (a === '--execute') { execute = true; dryRun = false }
  if (a === '--dry-run') dryRun = true
}

if (!keepEmail && !keepByRole) {
  console.log('No keep selector provided, defaulting to --keep-email=director@school.edu')
  keepEmail = 'director@school.edu'
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  try {
    console.log('--- Reset to Director: Dry-run mode ---')

    // Determine keep list
    let keepUsers = []
    if (keepByRole) {
      const { data } = await supabaseAdmin.from('users').select('id,email,role').eq('role', 'DIRECTOR')
      keepUsers = data || []
    } else if (keepEmail) {
      const { data } = await supabaseAdmin.from('users').select('id,email,role').ilike('email', keepEmail).limit(1).maybeSingle()
      if (data) keepUsers = [data]
      else {
        // fallback to auth list
        const { data: listResp } = await supabaseAdmin.auth.admin.listUsers()
        const found = (listResp?.users || []).find(u => u.email === keepEmail)
        if (found) keepUsers = [{ id: found.id, email: found.email, role: 'DIRECTOR' }]
      }
    }

    if (!keepUsers.length) {
      console.warn('No keep users found for the selector. Aborting dry-run.')
      process.exit(1)
    }

    const keepIds = new Set(keepUsers.map(u => u.id))
    console.log('Keeping user(s):')
    keepUsers.forEach(u => console.log(` - ${u.email} [${u.id}] role=${u.role}`))

    // Fetch all public.users rows
    const { data: allUsers } = await supabaseAdmin.from('users').select('id,email,role')
    const toDelete = (allUsers || []).filter(u => !keepIds.has(u.id))

    console.log(`\nUsers that would be deleted: ${toDelete.length}`)
    toDelete.slice(0, 50).forEach(u => console.log(` - ${u.email} [${u.id}] role=${u.role}`))
    if (toDelete.length > 50) console.log(` ... and ${toDelete.length - 50} more`) 

    const deleteIds = toDelete.map(u => u.id)

    if (deleteIds.length === 0) {
      console.log('\nNothing to delete. Exiting.')
      process.exit(0)
    }

    // Appraisals count
    const { data: appraiseeApps } = await supabaseAdmin.from('appraisals').select('id').in('appraisee_id', deleteIds)
    const { data: appraiserApps } = await supabaseAdmin.from('appraisals').select('id').in('appraiser_id', deleteIds)
    const appraisalIds = new Set([...(appraiseeApps || []).map(a => a.id), ...(appraiserApps || []).map(a => a.id)])

    // Assignments
    const { data: assign1 } = await supabaseAdmin.from('appraiser_assignments').select('id').in('appraiser_id', deleteIds)
    const { data: assign2 } = await supabaseAdmin.from('appraiser_assignments').select('id').in('appraisee_id', deleteIds)
    const assignIds = new Set([...(assign1 || []).map(a => a.id), ...(assign2 || []).map(a => a.id)])

    console.log(`\nAppraisals that would be deleted: ${appraisalIds.size}`)
    console.log(`Assignments that would be deleted: ${assignIds.size}`)

    // Auth users to delete (those not in keepIds)
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers()
    const authToDelete = (authList?.users || []).filter(u => !keepIds.has(u.id))
    console.log(`Auth users that would be deleted: ${authToDelete.length}`)

    if (dryRun) {
      console.log('\nDRY-RUN complete. No changes were made.')
      process.exit(0)
    }

    if (!execute) {
      console.log('No --execute flag provided. Exiting.')
      process.exit(0)
    }

    // Execute deletions (destructive) - run only if --execute
    console.log('\nExecuting deletions...')

    // Delete appraisals
    const { error: delAErr } = await supabaseAdmin.from('appraisals').delete().or(deleteIds.map(id => `appraisee_id.eq.${id}`).join(',') + ',' + deleteIds.map(id => `appraiser_id.eq.${id}`).join(','))
    if (delAErr) throw delAErr

    // Delete assignments
    const { error: delAssignErr } = await supabaseAdmin.from('appraiser_assignments').delete().or(deleteIds.map(id => `appraiser_id.eq.${id}`).join(',') + ',' + deleteIds.map(id => `appraisee_id.eq.${id}`).join(','))
    if (delAssignErr) throw delAssignErr

    // Delete public.users rows
    const { error: delUserRowsErr } = await supabaseAdmin.from('users').delete().in('id', deleteIds)
    if (delUserRowsErr) throw delUserRowsErr

    // Delete auth users
    for (const u of authToDelete) {
      const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(u.id)
      if (authDelErr) console.error('Failed deleting auth user', u.id, authDelErr)
    }

    console.log('Destructive purge complete.')
    process.exit(0)
  } catch (err) {
    console.error('Error during reset-to-director:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

run()
