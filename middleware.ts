import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const host = request.headers.get("host") || "";
    if (host.startsWith("demo.sellio.uz") && request.nextUrl.pathname === "/") {
        const demoUrl = request.nextUrl.clone();
        demoUrl.pathname = "/demo";
        return NextResponse.rewrite(demoUrl);
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isDashboardRoute = pathname.startsWith("/dashboard")
    const isLoginRoute = pathname === "/login"

    if (!user && isDashboardRoute) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = "/login"
        loginUrl.search = ""
        return NextResponse.redirect(loginUrl)
    }

    if (user && isLoginRoute) {
        const dashboardUrl = request.nextUrl.clone()
        dashboardUrl.pathname = "/dashboard"
        dashboardUrl.search = ""
        return NextResponse.redirect(dashboardUrl)
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
