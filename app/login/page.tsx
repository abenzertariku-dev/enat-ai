'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

const MIN_PASSWORD_LENGTH = 8

function LedgerMark({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="19" stroke="#E5A823" strokeWidth="1.5" />
      <path d="M20 6a14 14 0 1 0 0 28 14 14 0 0 0 0-28Z" fill="#0F6B4C" />
      <path d="M8 20a12 12 0 0 1 12-12v24A12 12 0 0 1 8 20Z" fill="#0B5A3F" />
      <path d="M13 15h14M13 20h14M13 25h9" stroke="#FBF9F5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-[#1F2A24]/70">
        {label} {required && <span className="text-[#C1442E]">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-black/10 px-4 py-2.5 text-[14px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0F6B4C]/40'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    phone: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isLogin) {
      if (formData.password.length < MIN_PASSWORD_LENGTH) {
        toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
        return
      }
      if (formData.password !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
    }

    setLoading(true)
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          toast.success('Welcome back!')
          router.push('/')
        } else {
          toast.success('Account created — please sign in')
          setIsLogin(true)
          setFormData((f) => ({ ...f, password: '' }))
          setConfirmPassword('')
        }
      } else {
        toast.error(data.error || 'Something went wrong')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F1EA] p-4">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-8 shadow-[0_4px_24px_rgba(31,42,36,0.08)]">
        <div className="mb-7 text-center">
          <div className="mb-3 flex justify-center">
            <LedgerMark />
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1F2A24]">EthioGenz</h1>
          <p className="mt-2 text-[14px] text-[#1F2A24]/60">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </p>
          <p className="mt-0.5 text-[12.5px] text-[#1F2A24]/40">
            {isLogin ? 'Sign in to manage your ledger' : 'Start digitizing your Defter'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <>
              <Field label="Full name" required>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  className={inputClass}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Field>
              <Field label="Business name">
                <input
                  type="text"
                  autoComplete="organization"
                  className={inputClass}
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </Field>
              <Field label="Phone number">
                <input
                  type="tel"
                  autoComplete="tel"
                  className={inputClass}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </Field>
            </>
          )}

          <Field label="Email address" required>
            <input
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </Field>

          <Field label="Password" required>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={isLogin ? undefined : MIN_PASSWORD_LENGTH}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className={`${inputClass} pr-11`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1F2A24]/35 hover:text-[#1F2A24]/60"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {!isLogin && (
              <p className="mt-1 text-[11.5px] text-[#1F2A24]/40">Minimum {MIN_PASSWORD_LENGTH} characters</p>
            )}
          </Field>

          {!isLogin && (
            <Field label="Confirm password" required>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#0F6B4C] py-3 font-semibold text-white transition hover:bg-[#0B5A3F] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Loading…
              </span>
            ) : isLogin ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setFormData((f) => ({ ...f, password: '' }))
              setConfirmPassword('')
            }}
            className="text-[13px] font-medium text-[#0F6B4C] hover:text-[#0B5A3F]"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-[#E5A823]/25 bg-[#E5A823]/[0.08] p-3">
          <p className="text-center text-[11.5px] text-[#B8860B]">
            Demo: register with any email — an 8+ character password is all that's required.
          </p>
        </div>
      </div>
    </div>
  )
}