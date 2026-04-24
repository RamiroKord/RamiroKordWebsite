import { useState } from 'react'
import { createClient } from '../lib/supabase'
import { useUser } from '../context/UserContext'

type Tab = 'google' | 'password' | 'otp'

const inputCls = 'w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow'
const btnCls = 'w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

export function AuthModal() {
  const { authModalOpen, closeAuthModal } = useUser()
  const [tab, setTab] = useState<Tab>('google')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const supabase = createClient()

  function switchTab(t: Tab) {
    setTab(t)
    setError(null)
    setInfo(null)
    setOtpSent(false)
  }

  async function handleGoogle() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    })
    if (error) setError(error.message)
    setBusy(false)
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else if (mode === 'register') setInfo('Verifique seu e-mail para confirmar o cadastro.')
    setBusy(false)
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) setError(error.message)
    else setOtpSent(true)
    setBusy(false)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' })
    if (error) setError(error.message)
    setBusy(false)
  }

  if (!authModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAuthModal} />

      <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8">
        <button
          onClick={closeAuthModal}
          aria-label="Fechar"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
          {mode === 'register' && tab === 'password' ? 'Criar conta' : 'Entrar'}
        </h2>

        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 mb-6">
          {(['google', 'password', 'otp'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 text-sm rounded-lg transition-all ${
                tab === t
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm font-semibold'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {t === 'google' ? 'Google' : t === 'password' ? 'Senha' : 'Código'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-sm text-green-700 dark:text-green-400">
            {info}
          </div>
        )}

        {tab === 'google' && (
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-750 font-medium transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            Continuar com Google
          </button>
        )}

        {tab === 'password' && (
          <form onSubmit={handlePassword} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputCls}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputCls}
            />
            <button type="submit" disabled={busy} className={btnCls}>
              {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
            <p className="text-sm text-center text-neutral-500">
              {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          </form>
        )}

        {tab === 'otp' && !otpSent && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Enviaremos um código de 6 dígitos para o seu e-mail.
            </p>
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputCls}
            />
            <button type="submit" disabled={busy} className={btnCls}>
              {busy ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>
        )}

        {tab === 'otp' && otpSent && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Código enviado para{' '}
              <strong className="text-neutral-700 dark:text-neutral-300">{email}</strong>.
            </p>
            <input
              type="text"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={6}
              className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`}
            />
            <button type="submit" disabled={busy} className={btnCls}>
              {busy ? 'Verificando...' : 'Verificar código'}
            </button>
            <button
              type="button"
              onClick={() => { setOtpSent(false); setOtpCode('') }}
              className="text-sm text-center text-neutral-500 hover:underline"
            >
              ← Usar outro e-mail
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
