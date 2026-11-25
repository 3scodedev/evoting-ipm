import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware ini sengaja hanya membaca cookie — tidak ada query database,
 * tidak ada fetch, dan matcher dibatasi ke 2 prefix halaman saja sehingga
 * aset statis (`/_next/*`, `/images/*`, `/favicon.ico`) tidak pernah masuk ke sini.
 */
function getCookie(req: NextRequest, name: string) {
  return req.cookies.get(name)?.value;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/kiosk/') && pathname !== '/kiosk/login') {
    if (!getCookie(req, 'kiosk-session')) {
      return NextResponse.redirect(new URL('/kiosk/login', req.url));
    }
  }
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const hasSession = req.cookies.getAll().some((c) => c.name.endsWith('-auth-token'));
    if (!hasSession) return NextResponse.redirect(new URL('/admin/login', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/kiosk/:path*', '/admin/:path*'] };
