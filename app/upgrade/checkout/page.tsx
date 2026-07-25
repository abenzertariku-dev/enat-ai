'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import BrandLogo from '@/app/components/BrandLogo'
import { PREMIUM_PRICE_ETB } from '@/lib/subscription'
import { useI18n } from '@/lib/i18n'

function CheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { t } = useI18n()
  const provider = params.get('provider') === 'telebirr' ? 'telebirr' : 'chapa'
  const txRef = params.get('tx_ref') || ''
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.replace('/login')
    }
  }, [router])

  const confirm = async () => {
    if (!txRef) {
      toast.error(t('upgrade.missingRef'))
      return
    }
    setConfirming(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/payments', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txRef }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t('upgrade.notConfirmed'))
        return
      }
      toast.success(t('upgrade.activated'))
      router.replace('/dashboard')
    } catch {
      toast.error(t('common.networkError'))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <div className="mb-5 flex justify-center">
          <BrandLogo size={64} />
        </div>
        <h1 className="text-center text-xl font-bold text-[var(--enat-ink)]">{t('upgrade.complete')}</h1>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          {t('upgrade.premiumMonth', { price: PREMIUM_PRICE_ETB })}
        </p>

        <div className="mt-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={provider === 'chapa' ? '/payments/chapa.svg' : '/payments/telebirr.png'}
            alt={provider === 'chapa' ? 'Chapa' : 'Telebirr'}
            className="h-12 w-auto"
          />
        </div>

        <div className="mt-5 rounded-xl bg-[var(--surface-muted)] p-4 text-[13px] text-[var(--muted)]">
          {provider === 'chapa' ? (
            <p>{t('upgrade.chapaHint')}</p>
          ) : (
            <p>
              {t('upgrade.telebirrHint', { price: PREMIUM_PRICE_ETB, ref: txRef || '—' })}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={confirming || !txRef}
          onClick={confirm}
          className="mt-5 w-full rounded-xl bg-[var(--enat-green-mid)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {confirming ? t('upgrade.confirming') : t('upgrade.confirmPaid')}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--enat-ink)]"
        >
          {t('upgrade.backDash')}
        </button>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const { t } = useI18n()

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[var(--enat-green-mid)]/20 border-t-[var(--enat-green-mid)]" />
          <p className="sr-only">{t('common.loading')}</p>
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  )
}
