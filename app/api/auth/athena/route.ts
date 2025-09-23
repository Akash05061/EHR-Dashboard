import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'login') {
    // Step 1: Redirect to Athena OAuth (3-legged flow)
    const authUrl = new URL('/oauth2/v1/authorize', process.env.ATHENA_BASE_URL!)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', process.env.ATHENA_CLIENT_ID!)
    authUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/athena?action=callback`)
    
    // 3-legged OAuth scopes for provider-facing apps
    const scopes = [
      'launch',
      'openid', 
      'fhirUser',
      'offline_access',
      'user/Patient.read',
      'user/Appointment.read',
      'user/Practitioner.read',
      'user/Organization.read',
      'user/Observation.read'
    ].join(' ')
    
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('state', 'random_state_string') // Add CSRF protection
    
    return NextResponse.redirect(authUrl.toString())
  }

  if (action === 'callback') {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state')

    if (error || !code) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=${error || 'no_code'}`)
    }

    try {
      // Step 2: Exchange authorization code for access token
      const tokenResponse = await fetch(`${process.env.ATHENA_BASE_URL}/oauth2/v1/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.ATHENA_CLIENT_ID}:${process.env.ATHENA_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/athena?action=callback`
        })
      })

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status}`)
      }

      const tokens = await tokenResponse.json()
      
      // Step 3: Get user/clinic info using the access token
      const userInfoResponse = await fetch(`${process.env.ATHENA_BASE_URL}/oauth2/v1/userinfo`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      })

      const userInfo = await userInfoResponse.json()
      
      // Step 4: Create clinic session (simplified - use database in production)
      const clinicSession = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + (tokens.expires_in * 1000),
        clinicId: userInfo.sub || 'unknown',
        clinicName: userInfo.name || 'Unknown Clinic',
        practiceId: userInfo.practice_id || '195900'
      }

      // Set secure session cookie
      const sessionToken = Buffer.from(JSON.stringify(clinicSession)).toString('base64')
      
      cookies().set('athena_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: tokens.expires_in,
        path: '/',
        sameSite: 'lax'
      })

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/?connected=true`)
    } catch (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login?error=token_exchange_failed`)
    }
  }

  if (action === 'logout') {
    // Clear session cookie
    cookies().delete('athena_session')
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/login`)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}