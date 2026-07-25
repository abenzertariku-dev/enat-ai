'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mic, Camera, LineChart, ArrowRight } from 'lucide-react'
import BrandLogo from '@/app/components/BrandLogo'
import ThemeToggle from '@/app/components/ThemeToggle'
import LanguageToggle from '@/app/components/LanguageToggle'
import { useI18n } from '@/lib/i18n'

export default function LandingPage() {
  const router = useRouter()
  const { t } = useI18n()

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7412/ingest/e41294ac-d718-4cb0-a12d-1333a9614c42', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '984a50' },
      body: JSON.stringify({
        sessionId: '984a50',
        runId: 'hero-update',
        hypothesisId: 'H1',
        location: 'app/page.tsx:mount',
        message: 'Landing with custom hero bg',
        data: { heroSrc: '/hero-bg.jpg' },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    const token = localStorage.getItem('token')
    if (!token) return

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          router.replace('/dashboard')
          return
        }
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      })
      .catch(() => {})
  }, [router])

  const featureItems = [
    { icon: Mic, title: t('features.voice.title'), body: t('features.voice.body') },
    { icon: Camera, title: t('features.scan.title'), body: t('features.scan.body') },
    { icon: LineChart, title: t('features.insights.title'), body: t('features.insights.body') },
  ]

  return (
    <div className="landing-root min-h-screen bg-[#0B1A2E] text-[#F4F0E6]">
      <header className="relative isolate min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/hero-bg.jpg"
            alt="Merchant managing inventory with a digital tablet and ledger"
            fill
            priority
            className="object-cover object-[72%_center] md:object-right animate-hero-ken"
            sizes="100vw"
          />
          {/* Soft left wash so copy stays readable without hiding the right scene */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(8,18,36,0.92) 0%, rgba(8,18,36,0.78) 34%, rgba(8,18,36,0.28) 58%, rgba(8,18,36,0.12) 100%)',
            }}
          />
        </div>

        <nav className="relative z-10 flex items-center justify-between gap-3 px-5 py-5 md:px-10 lg:px-14">
          <Link href="/" className="flex items-center gap-2.5" aria-label="ENAT AI home">
            <BrandLogo size={42} priority />
            <span className="font-sans text-[1.05rem] font-bold tracking-tight">
              <span className="text-[#E8EFE9]">ENAT</span>{' '}
              <span className="text-[#B88A44]">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden text-[14px] font-medium text-[#F4F0E6]/80 transition hover:text-[#B88A44] sm:inline"
            >
              {t('nav.signIn')}
            </Link>
          </div>
        </nav>

        {/* Hero copy sits in the dark left panel; right side keeps the warehouse scene */}
        <div className="relative z-10 flex min-h-[calc(100svh-76px)] items-end px-5 pb-16 pt-10 md:items-center md:px-10 md:pb-24 lg:px-14">
          <div className="w-full max-w-xl animate-rise md:max-w-[42%]">
            <p className="font-serif text-[clamp(2.4rem,6vw,4.25rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-[#F4F0E6]">
              <span className="text-[#E8EFE9]">ENAT</span>{' '}
              <span className="text-[#B88A44]">AI</span>
            </p>
            <h1 className="mt-5 max-w-[20ch] text-[clamp(1.25rem,2.8vw,1.75rem)] font-medium leading-snug tracking-tight text-[#F4F0E6]/95">
              {t('hero.headline')}
            </h1>
            <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-[#F4F0E6]/68 md:text-[16px]">
              {t('hero.support')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login?mode=signup"
                className="group inline-flex items-center gap-2 rounded-xl bg-[#B88A44] px-6 py-3.5 text-[15px] font-semibold text-[#082A20] transition hover:bg-[#c9a05a]"
              >
                {t('nav.startFree')}
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-xl border border-[#F4F0E6]/25 bg-transparent px-6 py-3.5 text-[15px] font-medium text-[#F4F0E6] transition hover:border-[#B88A44]/60 hover:text-[#B88A44]"
              >
                {t('nav.signIn')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Feature icons as cards under the hero */}
      <section className="relative z-10 bg-[var(--surface-muted)] px-5 py-16 text-[var(--enat-ink)] md:px-10 md:py-20 lg:px-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-tight text-[var(--enat-green)] dark:text-[#7dcea0]">
            {t('features.title')}
          </h2>
          <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-[var(--muted)]">
            {t('features.subtitle')}
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {featureItems.map(({ icon: Icon, title, body }, i) => (
              <article
                key={title}
                className="animate-rise-delayed rounded-2xl border border-black/5 bg-[var(--surface)] p-5 shadow-[0_8px_30px_rgba(8,18,36,0.1)] dark:border-white/10"
                style={{ animationDelay: `${80 + i * 80}ms` }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--enat-green-mid)]/10 text-[var(--enat-green-mid)]">
                  <Icon size={22} strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="mt-4 font-serif text-[1.1rem] font-semibold text-[var(--enat-ink)]">
                  {title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#004526] px-5 py-20 dark:bg-[#0a2f1f] md:px-10 md:py-24 lg:px-14">
        <div className="relative mx-auto max-w-5xl">
          <h2 className="font-serif text-[clamp(1.65rem,3.5vw,2.35rem)] font-semibold tracking-tight text-[#F4F0E6]">
            {t('cta.title')}
          </h2>
          <p className="mt-3 max-w-md text-[15.5px] text-[#F4F0E6]/65">{t('cta.subtitle')}</p>
          <Link
            href="/login?mode=signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#B88A44] px-6 py-3.5 text-[15px] font-semibold text-[#082A20] transition hover:bg-[#c9a05a]"
          >
            {t('hero.createAccount')}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#061910] px-5 py-8 md:px-10 lg:px-14">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={36} />
            <span className="text-[15px] font-semibold">
              <span className="text-[#E8EFE9]">ENAT</span> <span className="text-[#B88A44]">AI</span>
            </span>
          </div>
          <p className="text-[12.5px] text-[#F4F0E6]/40">
            © {new Date().getFullYear()} ENAT AI. {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}
