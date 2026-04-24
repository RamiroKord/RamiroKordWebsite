import { createServerSupabaseClient } from '../../../lib/supabase-server'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query

  if (typeof code === 'string') {
    const supabase = createServerSupabaseClient({ req, res })
    await supabase.auth.exchangeCodeForSession(code)
  }

  res.redirect(307, '/')
}
