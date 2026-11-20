import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ message: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return jsonResponse({ message: 'Authentication is required.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ message: 'User management is not configured on the server.' }, 500)
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const accessToken = authorization.replace(/^Bearer\s+/i, '')
  const { data: callerData, error: callerError } = await callerClient.auth.getUser(accessToken)
  if (callerError || !callerData.user) return jsonResponse({ message: 'Your session is invalid or expired.' }, 401)

  const { data: callerProfile, error: profileError } = await callerClient
    .from('profiles')
    .select('role,is_active')
    .eq('id', callerData.user.id)
    .single()
  if (profileError) return jsonResponse({ message: 'Could not verify administrator access.' }, 403)
  if (callerProfile.role !== 'SYSTEM_ADMIN' || !callerProfile.is_active) {
    return jsonResponse({ message: 'Only active system administrators can manage user accounts.' }, 403)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const body = await request.json()
    if (body.action === 'invite') {
      const email = String(body.email || '').trim().toLowerCase()
      const universityId = String(body.universityId || '')
      if (!email || !universityId) return jsonResponse({ message: 'Email and university are required.' }, 400)
      const { data: university, error: universityError } = await adminClient
        .from('universities')
        .select('id')
        .eq('id', universityId)
        .single()
      if (universityError || !university) return jsonResponse({ message: 'The selected university does not exist.' }, 400)

      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          role: 'UNIVERSITY_ADMIN',
          first_name: String(body.firstName || ''),
          last_name: String(body.lastName || ''),
          phone: String(body.phone || ''),
          university_id: universityId,
        },
        redirectTo: `${(Deno.env.get('APP_ORIGIN') || new URL(request.url).origin).replace(/\/+$/, '')}/login`,
      })
      if (error) return jsonResponse({ message: error.message }, 400)
      if (!data.user) return jsonResponse({ message: 'Supabase did not return the invited user account.' }, 500)

      const { error: updateError } = await adminClient.from('profiles').update({
        role: 'UNIVERSITY_ADMIN',
        university_id: universityId,
        first_name: String(body.firstName || ''),
        last_name: String(body.lastName || ''),
        phone: String(body.phone || ''),
      }).eq('id', data.user.id)
      if (updateError) {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(data.user.id)
        return jsonResponse({
          message: deleteError
            ? `The admin profile could not be assigned and the incomplete invitation could not be removed: ${deleteError.message}`
            : 'The admin profile could not be assigned; the incomplete invitation was cancelled.',
        }, 500)
      }
      return jsonResponse({ success: true, userId: data.user.id, message: 'Invitation sent.' })
    }

    if (body.action === 'update') {
      const userId = String(body.userId || '')
      if (!userId || userId === callerData.user.id) return jsonResponse({ message: 'Choose another user account.' }, 400)
      const updates: Record<string, unknown> = {}
      if (body.role !== undefined) {
        const allowedRoles = ['STUDENT', 'PROVIDER', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN']
        if (!allowedRoles.includes(String(body.role))) return jsonResponse({ message: 'The selected role is invalid.' }, 400)
        updates.role = String(body.role)
      }
      if (body.isActive !== undefined) {
        if (typeof body.isActive !== 'boolean') return jsonResponse({ message: 'isActive must be a boolean.' }, 400)
        updates.is_active = body.isActive
      }
      if (!Object.keys(updates).length) return jsonResponse({ message: 'No user changes were provided.' }, 400)

      const { data: target, error: targetError } = await adminClient
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('id,email,is_active')
        .single()
      if (targetError) return jsonResponse({ message: targetError.message }, 400)

      if (body.isActive !== undefined) {
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: body.isActive ? 'none' : '876000h',
        })
        if (authError) return jsonResponse({ message: 'Profile updated, but authentication access could not be changed.' }, 500)
      }
      return jsonResponse({ success: true, user: target })
    }

    return jsonResponse({ message: 'Unsupported user management action.' }, 400)
  } catch (error) {
    return jsonResponse({ message: error instanceof Error ? error.message : 'User management failed.' }, 500)
  }
})
