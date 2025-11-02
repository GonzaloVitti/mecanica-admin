import { NextResponse } from "next/server";
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const verify = request.cookies.get("token");
  const { pathname } = request.nextUrl;
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  // Si no hay token y no está en signin, redirigir a signin
  if (!verify && pathname !== '/signin') {
    return NextResponse.redirect(new URL('/signin', frontendUrl));
  }

  // Si hay token y está en signin, redirigir a la raíz
  if (verify && pathname === '/signin') {
    return NextResponse.redirect(new URL('/', frontendUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};