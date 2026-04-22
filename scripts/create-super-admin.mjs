import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const email = 'superadmin@school.edu'
  const password = 'password123'
  const role = 'SUPER ADMIN'
  const fullName = 'System Super Admin'

  console.log(`Checking if ${email} already exists...`)
  
  // Try to find if user already exists
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) {
    console.error('Failed to list users:', listError.message)
    process.exit(1)
  }

  let authUserId = null;
  const existingUser = users.find(u => u.email === email)

  if (existingUser) {
    console.log('User already exists in Auth. Updating existing user...')
    authUserId = existingUser.id;
    // Ensure password is correct and confirmed
    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })
  } else {
    console.log('Creating new Auth user...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      console.error('Auth error:', authError.message)
      process.exit(1)
    }
    authUserId = authData.user.id;
  }

  console.log('Upserting user into public.users table...')
  // Add/Update public.users table
  const { error: dbError } = await supabaseAdmin.from('users').upsert({
    id: authUserId,
    email: email,
    role: role,
    full_name: fullName,
    job_category: 'SENIOR_LEADERSHIP',
    is_password_changed: false
  })

  if (dbError) {
    console.error('DB Insert error:', dbError.message)
    process.exit(1)
  }

  console.log('----------------------------------------')
  console.log('Super Admin user created successfully!')
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
  console.log('----------------------------------------')
}

run()