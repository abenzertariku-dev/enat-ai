'use client'

import { useI18n, type Locale } from '@/lib/i18n'

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-white/20 bg-white/10 p-0.5 text-[12px] font-medium dark:border-white/15 ${className}`}
      role="group"
      aria-label={t('lang.label')}
    >
      {([
        { id: 'en' as Locale, label: 'EN' },
        { id: 'am' as Locale, label: 'አማ' },
      ]).map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setLocale(opt.id)}
          className={`rounded-md px-2.5 py-1.5 transition ${
            locale === opt.id
              ? 'bg-[#B88A44] text-[#082A20]'
              : 'text-current/70 hover:text-current'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
