import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(status: number, body: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' })
  }

  let body: { fullName?: unknown; employeeId?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid account details.' })
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const employeeId = typeof body.employeeId === 'string' ? body.employeeId.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (fullName.length < 2 || fullName.length > 120) {
    return jsonResponse(400, { error: 'Enter a name between 2 and 120 characters.' })
  }
  if (!/^vc[0-9]{3,}$/.test(employeeId)) {
    return jsonResponse(400, { error: 'Employee IDs must use the vc001 format.' })
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Account creation is not configured.' })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: invitation, error: invitationError } = await adminClient
    .from('employee_invites')
    .select('employee_id')
    .eq('employee_id', employeeId)
    .maybeSingle()
  if (invitationError || !invitation) {
    return jsonResponse(403, { error: 'This employee ID is not approved for account creation. Contact your administrator.' })
  }

  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email: `${employeeId}@accounts.vedhas.local`,
    password,
    email_confirm: true,
    user_metadata: { employee_id: employeeId, full_name: fullName },
  })

  if (createUserError || !createdUser.user) {
    if (createUserError) console.error('Employee account creation failed:', createUserError.code)
    return jsonResponse(409, { error: 'That employee ID is unavailable. Check the ID or contact your administrator.' })
  }

  const { error: profileError } = await adminClient.from('profiles').insert({
    user_id: createdUser.user.id,
    employee_id: employeeId,
    full_name: fullName,
    role: 'employee',
  })

  if (profileError) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(createdUser.user.id)
    if (cleanupError) {
      console.error('Could not remove an auth account after profile creation failed:', cleanupError.code)
    }
    return jsonResponse(500, { error: 'The account could not be completed. Please try again.' })
  }

  const { error: inviteError } = await adminClient
    .from('employee_invites')
    .delete()
    .eq('employee_id', employeeId)
  if (inviteError) {
    const { error: profileCleanupError } = await adminClient
      .from('profiles')
      .delete()
      .eq('user_id', createdUser.user.id)
    const { error: authCleanupError } = await adminClient.auth.admin.deleteUser(createdUser.user.id)
    if (profileCleanupError || authCleanupError) {
      console.error('Could not roll back an employee account after invitation cleanup failed.')
    }
    return jsonResponse(500, { error: 'The account could not be completed. Please try again.' })
  }

  return jsonResponse(201, { message: 'Employee account created. Sign in with your ID and password.' })
})
