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
const SAFE_NEXT_PREFIXES = [
  '/hoje',
  '/agenda',
  '/clientes',
  '/profissionais',
  '/servicos',
  '/financeiro',
  '/indicacao',
  '/configuracoes',
  '/onboarding',
  '/auth/nova-senha',
];

function safeNext(candidate: string | null): string | null {
  if (!candidate) return null;
  if (!candidate.startsWith('/')) return null;
  if (!SAFE_NEXT_PREFIXES.some((p) => candidate.startsWith(p))) return null;
  return candidate;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Accept both `next` (new param, explicit destination for flows like
  // password recovery) and legacy `redirect` (kept for back-compat).
  const explicitNext = safeNext(
    searchParams.get('next') ?? searchParams.get('redirect'),
  );

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=invalid_or_expired`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // If caller asked for a specific post-callback destination (e.g. recovery
  // flow going to /auth/nova-senha), honor it and skip onboarding detection.
  if (explicitNext) {
    return NextResponse.redirect(`${origin}${explicitNext}`);
  }

  // Default: funnel into onboarding if no salon yet, else /hoje.
  const { data: membership } = await supabase
    .from('salon_members')
    .select('salon_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}/hoje`);
}
