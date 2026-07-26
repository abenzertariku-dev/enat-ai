'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { ImagePlus, X } from 'lucide-react'
import BrandLogo from '@/app/components/BrandLogo'
import { PREMIUM_PRICE_ETB } from '@/lib/subscription'
import { useI18n } from '@/lib/i18n'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const MAX_BYTES = 8 * 1024 * 1024

function CheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { t } = useI18n()
  const provider = params.get('provider') === 'telebirr' ? 'telebirr' : 'chapa'
  const txRef = params.get('tx_ref') || ''
  const [confirming, setConfirming] = useState(false)
  const [proof, setProof] = useState<{ file: File; url: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    return () => {
      if (proof) URL.revokeObjectURL(proof.url)
    }
  }, [proof])

  const pickProof = (file: File | undefined) => {
    if (!file) return
    if (file.type && !ACCEPTED.includes(file.type)) {
      toast.error(t('upgrade.proofBadType'))
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('upgrade.proofTooLarge'))
      return
    }
    if (proof) URL.revokeObjectURL(proof.url)
    setProof({ file, url: URL.createObjectURL(file) })
  }

  const clearProof = () => {
    if (proof) URL.revokeObjectURL(proof.url)
    setProof(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const confirm = async () => {
    if (!txRef) {
      toast.error(t('upgrade.missingRef'))
      return
    }
    if (!proof) {
      toast.error(t('upgrade.proofRequired'))
      return
    }
    setConfirming(true)
    try {
      const token = localStorage.getItem('token')
      const form = new FormData()
      form.append('txRef', txRef)
      form.append('proof', proof.file)

      const res = await fetch('/api/payments', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
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

        <div className="mt-5">
          <p className="mb-2 text-[13px] font-medium text-[var(--enat-ink)]">{t('upgrade.proofLabel')}</p>
          <p className="mb-3 text-[12px] text-[var(--muted)]">{t('upgrade.proofHint')}</p>

          {!proof ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-8 text-[var(--muted)] transition hover:border-[var(--enat-green-mid)] hover:text-[var(--enat-ink)]"
            >
              <ImagePlus size={28} />
              <span className="text-[13px] font-medium">{t('upgrade.proofUpload')}</span>
              <span className="text-[11px]">JPG, PNG, WebP · max 8 MB</span>
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-[var(--border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proof.url} alt="Payment proof" className="max-h-56 w-full object-contain bg-[var(--surface-muted)]" />
              <button
                type="button"
                onClick={clearProof}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/75"
                aria-label={t('common.close')}
              >
                <X size={16} />
              </button>
              <p className="truncate px-3 py-2 text-[11px] text-[var(--muted)]">{proof.file.name}</p>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              pickProof(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>

        <button
          type="button"
          disabled={confirming || !txRef || !proof}
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
