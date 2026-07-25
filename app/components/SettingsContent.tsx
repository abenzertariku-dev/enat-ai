'use client'

import { useState } from 'react'
import { User, Building2, Phone, Mail, Shield, Bell, Languages, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '@/lib/theme'
import { useI18n, type Locale } from '@/lib/i18n'

interface SettingsContentProps {
  user: {
    name: string
    email: string
    businessName?: string | null
    phone?: string | null
  } | null
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={`relative h-6 w-12 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-[var(--enat-green-mid)]' : 'bg-black/15 dark:bg-white/20'
      }`}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-6' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon size={16} className="text-[var(--muted)]" />
      <div>
        <p className="text-[11px] text-[var(--muted)]">{label}</p>
        <p className="font-medium text-[var(--enat-ink)]">{value}</p>
      </div>
    </div>
  )
}

export default function SettingsContent({ user }: SettingsContentProps) {
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const [notifications, setNotifications] = useState(true)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const submitPasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'))
      return
    }
    if (newPassword.length < 8) {
      toast.error(t('settings.passwordTooShort'))
      return
    }

    setIsSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(t('settings.passwordUpdated'))
        setShowPasswordForm(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || t('settings.passwordFailed'))
      }
    } catch {
      toast.error(t('common.networkError'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-lg font-bold tracking-tight text-[var(--enat-ink)]">{t('settings.title')}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t('settings.subtitle')}</p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-[var(--enat-ink)]">
          <User size={16} className="text-[var(--enat-green-mid)]" />
          {t('settings.profile')}
        </h3>
        <div className="space-y-3">
          <InfoRow icon={User} label={t('settings.name')} value={user?.name || '—'} />
          <InfoRow icon={Mail} label={t('settings.email')} value={user?.email || '—'} />
          {user?.businessName && <InfoRow icon={Building2} label={t('settings.business')} value={user.businessName} />}
          {user?.phone && <InfoRow icon={Phone} label={t('settings.phone')} value={user.phone} />}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-[var(--enat-ink)]">
          <Bell size={16} className="text-[var(--enat-green-mid)]" />
          {t('settings.preferences')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[var(--enat-ink)]">{t('settings.reminders')}</p>
              <p className="text-[11.5px] text-[var(--muted)]">{t('settings.remindersHint')}</p>
            </div>
            <Toggle checked={notifications} onChange={() => setNotifications((v) => !v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-[var(--enat-ink)]">{t('theme.dark')}</p>
              <p className="text-[11.5px] text-[var(--muted)]">{t('theme.darkHint')}</p>
            </div>
            <Toggle
              checked={theme === 'dark'}
              onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--enat-ink)]">
                <Languages size={14} />
                {t('lang.label')}
              </p>
              <p className="text-[11.5px] text-[var(--muted)]">{t('settings.languageHint')}</p>
            </div>
            <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-0.5 text-[12px] font-medium">
              {(
                [
                  { id: 'en' as Locale, label: t('lang.english') },
                  { id: 'am' as Locale, label: t('lang.amharic') },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLocale(opt.id)}
                  className={`rounded-md px-3 py-1.5 transition ${
                    locale === opt.id
                      ? 'bg-[var(--enat-green-mid)] text-white'
                      : 'text-[var(--muted)] hover:text-[var(--enat-ink)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold text-[var(--enat-ink)]">
          <Shield size={16} className="text-[var(--enat-green-mid)]" />
          {t('settings.security')}
        </h3>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="w-full rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-left transition hover:opacity-90"
          >
            <p className="text-[13px] font-medium text-[var(--enat-ink)]">{t('settings.changePassword')}</p>
            <p className="text-[11.5px] text-[var(--muted)]">{t('settings.changePasswordHint')}</p>
          </button>
        ) : (
          <div className="space-y-2.5 rounded-xl bg-[var(--surface-muted)] p-4">
            <input
              type="password"
              placeholder={t('settings.currentPassword')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13.5px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--enat-green-mid)]/40"
            />
            <input
              type="password"
              placeholder={t('settings.newPassword')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13.5px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--enat-green-mid)]/40"
            />
            <input
              type="password"
              placeholder={t('settings.confirmNewPassword')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13.5px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--enat-green-mid)]/40"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowPasswordForm(false)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[var(--muted)] transition hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/5"
              >
                <X size={14} />
                {t('common.cancel')}
              </button>
              <button
                onClick={submitPasswordChange}
                disabled={isSaving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--enat-green-mid)] px-3 py-2.5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <Check size={14} />
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
