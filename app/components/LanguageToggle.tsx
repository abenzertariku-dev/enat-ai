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
          onClick={() => {
            // #region agent log
            fetch('http://127.0.0.1:7412/ingest/e41294ac-d718-4cb0-a12d-1333a9614c42',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'31395e'},body:JSON.stringify({sessionId:'31395e',runId:'i18n-pre',hypothesisId:'C',location:'LanguageToggle.tsx:setLocale',message:'locale toggle clicked',data:{from:locale,to:opt.id},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
            setLocale(opt.id)
          }}
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
