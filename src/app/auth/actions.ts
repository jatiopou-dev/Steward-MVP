"use server"

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * The origin to send Google back to. Taken from the request rather than a
 * build-time constant so a preview deployment returns to itself instead of
 * dropping the user on production.
 */
async function requestOrigin(): Promise<string> {
  const h = await headers()
  const origin = h.get('origin')
  if (origin) return origin

  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : ''
}

export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${await requestOrigin()}/auth/callback`,
    },
  })

  if (error) {
    redirect('/auth?error=' + encodeURIComponent(error.message))
  }

  if (!data?.url) {
    redirect(
      '/auth?error=' +
        encodeURIComponent(
          'Google sign-in is not available. Enable the Google provider in Supabase Auth settings.'
        )
    )
  }

  redirect(data.url)
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/auth?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        full_name: formData.get('name') as string,
        organization_name: formData.get('church_name') as string,
        denomination: formData.get('denomination') as string,
        role: formData.get('role') as string,
      }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/auth?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
