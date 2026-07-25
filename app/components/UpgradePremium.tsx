'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { SubscriptionSnapshot } from '@/lib/subscription'
import { PREMIUM_PRICE_ETB } from '@/lib/subscription'

type Props = {
  subscription: SubscriptionSnapshot
  userPhone?: string | null
  onUpdated?: (next: SubscriptionSnapshot) => void
  forceShowPayments?: boolean
}

export default function UpgradePremium({
  subscription,
  userPhone,
  onUpdated,
  forceShowPayments,
}: Props) {
  const [loading, setLoading] = useState<'chapa' | 'telebirr' | null>(null)
  const [phone, setPhone] = useState(userPhone || '')

  useEffect(() => {
    setPhone(userPhone || '')
  }, [userPhone])

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7412/ingest/e41294ac-d718-4cb0-a12d-1333a9614c42',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'31395e'},body:JSON.stringify({sessionId:'31395e',runId:'i18n-pre',hypothesisId:'A',location:'UpgradePremium.tsx:mount',message:'UpgradePremium render — hardcoded EN?',data:{usesI18n:false,docLang:typeof document!=='undefined'?document.documentElement.lang:'?',hardcodedTitle:'Upgrade to Premium'},timestamp:Date.now()})}).catch(()=>{});
  }, [])
  // #endregion

  const showPayments = forceShowPayments || subscription.requiresUpgrade || subscription.subscriptionStatus === 'trialing'

  const startPayment = async (provider: 'chapa' | 'telebirr') => {
    if (provider === 'telebirr' && !phone.trim()) {
      toast.error('Enter your Telebirr phone number')
      return
    }
    setLoading(provider)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, phone: phone.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not start payment')
        return
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      toast.error('No checkout URL returned')
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[var(--enat-ink)]">
          {subscription.requiresUpgrade ? 'Upgrade to Premium' : 'Your plan'}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {subscription.requiresUpgrade
            ? `Your free month has ended. Unlock ENAT AI Premium for ${PREMIUM_PRICE_ETB} ETB / month.`
            : subscription.plan === 'premium'
              ? `Premium active — ${subscription.daysLeft} day(s) left`
              : `Free trial — ${subscription.daysLeft} day(s) left`}
        </p>
      </div>

      {!subscription.requiresUpgrade && subscription.subscriptionStatus === 'trialing' && (
        <div className="mb-4 rounded-xl border border-[#B88A44]/30 bg-[#B88A44]/10 px-3 py-2 text-[13px] text-[var(--enat-ink)]">
          Enjoy full access during your 1-month free trial. After that, upgrade with Chapa or Telebirr.
        </div>
      )}

      {showPayments && (
        <>
          <div className="mb-4">
            <label className="mb-1 block text-[12px] font-medium text-[var(--muted)]">
              Phone (required for Telebirr)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XX XXX XXX"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm text-[var(--enat-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--enat-green-mid)]/40"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!!loading}
              onClick={() => startPayment('chapa')}
              className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 transition hover:border-[var(--enat-green-mid)] disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/payments/chapa.svg" alt="Chapa" className="h-10 w-auto" />
              <span className="text-[13px] font-semibold text-[var(--enat-ink)]">
                {loading === 'chapa' ? 'Opening Chapa…' : 'Pay with Chapa'}
              </span>
              <span className="text-[11px] text-[var(--muted)]">{PREMIUM_PRICE_ETB} ETB</span>
            </button>

            <button
              type="button"
              disabled={!!loading}
              onClick={() => startPayment('telebirr')}
              className="flex flex-col items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 transition hover:border-[var(--enat-green-mid)] disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/payments/telebirr.png" alt="Telebirr" className="h-10 w-auto object-contain" />
              <span className="text-[13px] font-semibold text-[var(--enat-ink)]">
                {loading === 'telebirr' ? 'Opening Telebirr…' : 'Pay with Telebirr'}
              </span>
              <span className="text-[11px] text-[var(--muted)]">{PREMIUM_PRICE_ETB} ETB</span>
            </button>
          </div>
        </>
      )}

      {onUpdated && (
        <button
          type="button"
          className="mt-4 text-[12px] font-medium text-[var(--enat-green-mid)]"
          onClick={async () => {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/payments', {
              headers: { Authorization: `Bearer ${token}` },
            })
            const data = await res.json()
            if (data.subscription) onUpdated(data.subscription)
          }}
        >
          Refresh plan status
        </button>
      )}
    </div>
  )
}
