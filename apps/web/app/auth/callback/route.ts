import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Magic link callback — exchange the code for a session cookie.
 *
 * Supabase Auth sends emailRedirectTo here after the user clicks the
 * magic link. We exchange `code` for a session (sets HttpOnly cookies
 * via @supabase/ssr).
 *
 * After success:
 *  - First login (no salon yet) → /onboarding
 *  - Returning user → /hoje (or `?redirect=...` preserved from middleware)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') ?? '/hoje';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=invalid_or_expired`);
  }

  // Determine post-login destination
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // Check if user has a salon associated (onboarded)
  const { data: membership } = await supabase
    .from('salon_members')
    .select('salon_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
