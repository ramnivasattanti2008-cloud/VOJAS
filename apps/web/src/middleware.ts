import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];
// Always reachable, regardless of auth state — no redirect either way.
// Mirrors the app/(public) route group: the landing page, anonymous citizen
// reporting, and the public project transparency/discovery surface. This is
// the primary citizen journey and must never require a login.
const ALWAYS_PUBLIC_PATHS = ['/', '/report', '/explore', '/budget', '/insights', '/about', '/privacy', '/contact'];
const AUTH_COOKIE_NAMES = ['access_token', 'vojas_token', 'sb-access-token'];

function isAuthenticated(req: NextRequest): boolean {
  // Check for the most likely auth cookies
  for (const name of AUTH_COOKIE_NAMES) {
    if (req.cookies.get(name)?.value) return true;
  }
  // Or a vojas session indicator cookie (set by API on /auth/login via httpOnly)
  if (req.cookies.get('vojas_session')?.value) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = isAuthenticated(req);

  // Bypass static and api
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Always-public routes (e.g. anonymous citizen reporting): never gate on auth.
  if (ALWAYS_PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Auth pages: redirect to home if already authed
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (authed) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Dashboard (and everything else): auth is enforced client-side by
  // AuthProvider, not here. The API is currently on a different origin (the
  // Vercel same-origin rewrite is broken), so its session cookies are scoped
  // to the API's domain and are NOT visible to this middleware — gating here
  // would bounce every genuinely logged-in user straight back to /login.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
