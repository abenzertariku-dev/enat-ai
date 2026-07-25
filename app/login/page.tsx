'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Eye, EyeOff, MapPin, Building2, Users, AlertCircle } from 'lucide-react'
import BrandLogo from '@/app/components/BrandLogo'
import ThemeToggle from '@/app/components/ThemeToggle'
import LanguageToggle from '@/app/components/LanguageToggle'
import { useI18n } from '@/lib/i18n'

const MIN_PASSWORD_LENGTH = 8

// ─── Dropdown Options ────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: 'food-wholesaler', label: '🍚 Food & Grocery Wholesaler' },
  { value: 'beverage-wholesaler', label: '🥤 Beverage Wholesaler' },
  { value: 'grain-wholesaler', label: '🌾 Grain & Teff Wholesaler' },
  { value: 'flour-wholesaler', label: '🌾 Flour Wholesaler' },
  { value: 'coffee-wholesaler', label: '☕ Coffee Wholesaler' },
  { value: 'fruit-vegetable-wholesaler', label: '🥬 Fruit & Vegetable Wholesaler' },
  { value: 'meat-wholesaler', label: '🥩 Meat & Livestock Wholesaler' },
  { value: 'construction-wholesaler', label: '🧱 Construction Materials Wholesaler' },
  { value: 'hardware-wholesaler', label: '🔧 Hardware Wholesaler' },
  { value: 'electronics-wholesaler', label: '📱 Electronics Wholesaler' },
  { value: 'mobile-accessories', label: '📲 Mobile Accessories Wholesaler' },
  { value: 'clothing-wholesaler', label: '👕 Clothing & Textile Wholesaler' },
  { value: 'shoe-wholesaler', label: '👟 Shoes & Footwear Wholesaler' },
  { value: 'cosmetics-wholesaler', label: '💄 Cosmetics & Beauty Wholesaler' },
  { value: 'pharmaceutical-wholesaler', label: '💊 Pharmaceutical Wholesaler' },
  { value: 'stationery-wholesaler', label: '📚 Stationery & Office Supplies Wholesaler' },
  { value: 'plastic-wholesaler', label: '🪣 Plastic & Household Goods Wholesaler' },
  { value: 'chemical-wholesaler', label: '🧪 Chemical & Cleaning Supplies Wholesaler' },
  { value: 'agricultural-inputs', label: '🌱 Agricultural Inputs Wholesaler' },
  { value: 'other', label: '📌 Other (please specify)' },
]

const TEAM_SIZES = [
  { value: 'solo', label: '👤 Just me (Solo)' },
  { value: '2-5', label: '👥 2 - 5 people' },
  { value: '6-10', label: '👥 6 - 10 people' },
  { value: '11-20', label: '👥 11 - 20 people' },
  { value: '21-30', label: '👥 21 - 30 people' },
  { value: '30+', label: '👥 More than 30 people' },
  { value: 'other', label: '📌 Other (please specify)' },
]

const CHALLENGES = [
  { value: 'stock', label: '📦 Running out of stock unexpectedly' },
  { value: 'money', label: '💰 Not knowing where my money goes' },
  { value: 'sales', label: '📉 Sales are not growing' },
  { value: 'staff', label: '👥 Managing staff and shifts' },
  { value: 'suppliers', label: '🔗 Finding reliable suppliers' },
  { value: 'reports', label: '📊 Doing reports and tracking finances' },
  { value: 'customers', label: '👤 Finding and keeping customers' },
  { value: 'pricing', label: '🏷️ Setting the right prices' },
  { value: 'competition', label: '🏪 Competition from other businesses' },
  { value: 'technology', label: '💻 Learning new technology' },
  { value: 'credit', label: '💳 Managing customer credit/debt' },
  { value: 'other', label: '📌 Other (please specify)' },
]

// ─── Components ──────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
  icon,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted)]">
        {icon && <span className="opacity-60">{icon}</span>}
        {label} {required && <span className="text-[#C1442E]">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px] text-[var(--enat-ink)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--enat-green-mid)]/40'

const selectClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[14px] text-[var(--enat-ink)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--enat-green-mid)]/40 appearance-none'

// ─── Main Component ──────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState(1) // 1 = Basic, 2 = Business Details

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    password: '',
    phone: '',
    
    // Business Details
    businessName: '',
    businessType: '',
    businessTypeOther: '',
    teamSize: '',
    teamSizeOther: '',
    location: '',
    challenge: '',
    challengeOther: '',
  })

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'signup') {
      setIsLogin(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isLogin) {
      if (formData.password.length < MIN_PASSWORD_LENGTH) {
        toast.error(t('login.passwordTooShort', { n: MIN_PASSWORD_LENGTH }))
        return
      }
      if (formData.password !== confirmPassword) {
        toast.error(t('login.passwordMismatch'))
        return
      }
    }

    setLoading(true)
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'

    try {
      // Prepare data for registration
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            businessName: formData.businessName,
            businessType: formData.businessType === 'other' ? formData.businessTypeOther : formData.businessType,
            teamSize: formData.teamSize === 'other' ? formData.teamSizeOther : formData.teamSize,
            location: formData.location,
            challenge: formData.challenge === 'other' ? formData.challengeOther : formData.challenge,
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        if (isLogin) {
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          toast.success(t('login.welcomeBack'))
          router.push('/dashboard')
        } else {
          toast.success(t('login.accountCreated'))
          setIsLogin(true)
          setFormData((f) => ({ ...f, password: '' }))
          setConfirmPassword('')
          setStep(1)
        }
      } else {
        toast.error(data.error || t('login.somethingWrong'))
      }
    } catch {
      toast.error(t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    // Validate basic fields before moving to step 2
    if (!formData.name || !formData.email || !formData.password || !confirmPassword) {
      toast.error(t('login.fillRequired'))
      return
    }
    if (formData.password !== confirmPassword) {
      toast.error(t('login.passwordMismatch'))
      return
    }
    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(t('login.passwordTooShort', { n: MIN_PASSWORD_LENGTH }))
      return
    }
    setStep(2)
  }

  const prevStep = () => setStep(1)

  // ─── Login Mode ─────────────────────────────────────────────────────

  if (isLogin) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <LanguageToggle className="border-[var(--border)] bg-[var(--surface)] text-[var(--enat-ink)]" />
          <ThemeToggle className="border-[var(--border)] bg-[var(--surface)] text-[var(--enat-ink)]" />
        </div>
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_4px_24px_rgba(31,42,36,0.08)]">
          <div className="mb-7 text-center">
            <Link href="/" className="mb-3 flex justify-center" aria-label="Back to ENAT AI home">
              <BrandLogo size={72} />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-[var(--enat-green)] dark:text-[#7dcea0]">ENAT</span>{' '}
              <span className="text-[#B88A44]">AI</span>
            </h1>
            <p className="mt-2 text-[14px] text-[var(--muted)]">{t('login.welcome')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Field label={t('login.email')} required>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className={inputClass}
                value={formData.email}
                onChange={handleChange}
              />
            </Field>

            <Field label={t('login.password')} required>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  className={`${inputClass} pr-11`}
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--enat-ink)]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--enat-green-mid)] py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {t('login.loading')}
                </span>
              ) : (
                t('login.signIn')
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setIsLogin(false)
                setStep(1)
                setFormData((f) => ({ ...f, password: '' }))
                setConfirmPassword('')
              }}
              className="text-[13px] font-medium text-[var(--enat-green-mid)] hover:opacity-80"
            >
              {t('login.noAccount')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Registration Mode ─────────────────────────────────────────────

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageToggle className="border-[var(--border)] bg-[var(--surface)] text-[var(--enat-ink)]" />
        <ThemeToggle className="border-[var(--border)] bg-[var(--surface)] text-[var(--enat-ink)]" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_4px_24px_rgba(31,42,36,0.08)]">
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center">
            <Link href="/" aria-label="Back to ENAT AI home">
              <BrandLogo size={72} />
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-[var(--enat-green)] dark:text-[#7dcea0]">ENAT</span>{' '}
            <span className="text-[#B88A44]">AI</span>
          </h1>
          <p className="mt-1 text-[14px] text-[var(--muted)]">{t('login.create')}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className={`text-xs font-medium ${step === 1 ? 'text-[#0F6B4C]' : 'text-[#1F2A24]/30'}`}>
              {t('login.step1')}
            </span>
            <span className="text-[#1F2A24]/20">—</span>
            <span className={`text-xs font-medium ${step === 2 ? 'text-[#0F6B4C]' : 'text-[#1F2A24]/30'}`}>
              {t('login.step2')}
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full rounded-full bg-[#1F2A24]/10">
            <div 
              className="h-1 rounded-full bg-[#0F6B4C] transition-all duration-300"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* ─── STEP 1: Basic Info ──────────────────────────────────── */}
          {step === 1 && (
            <>
              <Field label={t('login.fullName')} required icon={<Users size={14} />}>
                <input
                  type="text"
                  name="name"
                  required
                  autoComplete="name"
                  className={inputClass}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('login.namePlaceholder')}
                />
              </Field>

              <Field label={t('login.email')} required icon={<span>📧</span>}>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className={inputClass}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('login.emailPlaceholder')}
                />
              </Field>

              <Field label={t('login.phone')} icon={<span>📞</span>}>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  className={inputClass}
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('login.phonePlaceholder')}
                />
              </Field>

              <Field label={t('login.password')} required>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    className={`${inputClass} pr-11`}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={t('login.passwordPlaceholder', { n: MIN_PASSWORD_LENGTH })}
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
                <p className="mt-1 text-[11.5px] text-[#1F2A24]/40">{t('login.passwordHint', { n: MIN_PASSWORD_LENGTH })}</p>
              </Field>

              <Field label={t('login.confirmPassword')} required>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  autoComplete="new-password"
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('login.confirmPlaceholder')}
                />
              </Field>

              <button
                type="button"
                onClick={nextStep}
                className="w-full rounded-xl bg-[#0F6B4C] py-3 font-semibold text-white transition hover:bg-[#0B5A3F]"
              >
                {t('login.continueBusiness')}
              </button>
            </>
          )}

          {/* ─── STEP 2: Business Details ────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="rounded-xl bg-[var(--enat-green-mid)]/[0.08] border border-[var(--enat-green-mid)]/20 p-3">
                <p className="text-xs text-[var(--muted)]">
                  {t('login.tailorHint')}
                </p>
              </div>

              <Field label={t('login.businessName')} required icon={<Building2 size={14} />}>
                <input
                  type="text"
                  name="businessName"
                  required
                  className={inputClass}
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder={t('login.businessNamePlaceholder')}
                />
              </Field>

              <Field label={t('login.businessType')} required icon={<span>🏪</span>}>
                <select
                  name="businessType"
                  required
                  className={selectClass}
                  value={formData.businessType}
                  onChange={handleChange}
                >
                  <option value="">{t('login.selectBusinessType')}</option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {formData.businessType === 'other' && (
                  <input
                    type="text"
                    name="businessTypeOther"
                    className={`${inputClass} mt-2`}
                    value={formData.businessTypeOther}
                    onChange={handleChange}
                    placeholder={t('login.businessTypeOther')}
                  />
                )}
              </Field>

              <Field label={t('login.teamSize')} required icon={<Users size={14} />}>
                <select
                  name="teamSize"
                  required
                  className={selectClass}
                  value={formData.teamSize}
                  onChange={handleChange}
                >
                  <option value="">{t('login.selectTeamSize')}</option>
                  {TEAM_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
                {formData.teamSize === 'other' && (
                  <input
                    type="number"
                    name="teamSizeOther"
                    className={`${inputClass} mt-2`}
                    value={formData.teamSizeOther}
                    onChange={handleChange}
                    placeholder={t('login.teamSizeOther')}
                    min="1"
                  />
                )}
              </Field>

              <Field label={t('login.location')} icon={<MapPin size={14} />}>
                <input
                  type="text"
                  name="location"
                  className={inputClass}
                  value={formData.location}
                  onChange={handleChange}
                  placeholder={t('login.locationPlaceholder')}
                />
              </Field>

              <Field label={t('login.challenge')} icon={<AlertCircle size={14} />}>
                <select
                  name="challenge"
                  className={selectClass}
                  value={formData.challenge}
                  onChange={handleChange}
                >
                  <option value="">{t('login.selectChallenge')}</option>
                  {CHALLENGES.map((challenge) => (
                    <option key={challenge.value} value={challenge.value}>
                      {challenge.label}
                    </option>
                  ))}
                </select>
                {formData.challenge === 'other' && (
                  <input
                    type="text"
                    name="challengeOther"
                    className={`${inputClass} mt-2`}
                    value={formData.challengeOther}
                    onChange={handleChange}
                    placeholder={t('login.challengeOther')}
                  />
                )}
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 rounded-xl border border-black/10 py-3 font-medium text-[#1F2A24]/60 transition hover:bg-black/5"
                >
                  ← {t('common.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-[#0F6B4C] py-3 font-semibold text-white transition hover:bg-[#0B5A3F] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      {t('common.creating')}
                    </span>
                  ) : (
                    t('common.create')
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setIsLogin(true)
              setFormData((f) => ({ ...f, password: '' }))
              setConfirmPassword('')
              setStep(1)
            }}
            className="text-[13px] font-medium text-[var(--enat-green-mid)] hover:opacity-80"
          >
            {t('login.hasAccount')}
          </button>
        </div>
      </div>
    </div>
  )
}