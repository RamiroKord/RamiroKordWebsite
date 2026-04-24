import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next'

type ServerContext =
  | GetServerSidePropsContext
  | { req: NextApiRequest; res: NextApiResponse }

function getExistingCookies(ctx: ServerContext): string[] {
  const existing = ctx.res.getHeader('Set-Cookie')
  if (!existing) return []
  return Array.isArray(existing) ? existing : [String(existing)]
}

export function createServerSupabaseClient(ctx: ServerContext) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => ctx.req.cookies[name],
        set: (name, value, _options: CookieOptions) => {
          ctx.res.setHeader('Set-Cookie', [
            ...getExistingCookies(ctx),
            `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`,
          ])
        },
        remove: (name, _options: CookieOptions) => {
          ctx.res.setHeader('Set-Cookie', [
            ...getExistingCookies(ctx),
            `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`,
          ])
        },
      },
    }
  )
}
