'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  AlertTriangle,
  PackageX,
  X,
  ChevronRight,
  CheckCheck,
  Sparkles,
} from 'lucide-react'

interface Alert {
  id: string
  type: 'low_stock' | 'out_of_stock'
  message: string
  stockItem: {
    id: string
    name: string
    quantity: number
    unit: string | null
  }
  createdAt: string
}

interface StockAlertWidgetProps {
  onViewAll?: () => void
}

const DISPLAY_LIMIT = 5

export default function StockAlertWidget({
  onViewAll,
}: StockAlertWidgetProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  })

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/stock/alerts?unread=true', {
        headers: getAuthHeaders(),
      })

      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Fetch alerts error:', error)
    } finally {
      setLoading(false)
    }
  }

  // UI ONLY
  const dismissAlert = (alertId: string) => {
    setDismissedIds((prev) => [...prev, alertId])
  }

  // UI ONLY
  const dismissAll = () => {
    setDismissedIds(alerts.map((a) => a.id))
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const visibleAlerts = alerts.filter(
    (alert) => !dismissedIds.includes(alert.id)
  )

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex animate-pulse items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-black/5" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-2/3 rounded bg-black/5" />
            <div className="h-3 w-1/2 rounded bg-black/5" />
          </div>
        </div>
      </div>
    )
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="rounded-2xl border border-[#0F6B4C]/15 bg-[#0F6B4C]/[0.05] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F6B4C]/10">
            <Sparkles size={18} className="text-[#0F6B4C]" />
          </div>
          <div>
            <p className="text-[13.5px] font-semibold text-[#1F2A24]">
              Stock status
            </p>
            <p className="text-[12px] text-[#1F2A24]/50">
              Everything is well stocked
            </p>
          </div>
        </div>
      </div>
    )
  }

  const critical = visibleAlerts.filter(
    (a) => a.type === 'out_of_stock'
  )
  const warning = visibleAlerts.filter(
    (a) => a.type === 'low_stock'
  )

  const visible = visibleAlerts.slice(0, DISPLAY_LIMIT)

  const visibleCritical = visible.filter(
    (a) => a.type === 'out_of_stock'
  )

  const visibleWarning = visible.filter(
    (a) => a.type === 'low_stock'
  )

  const overflow = visibleAlerts.length - visible.length

  const headerTone = critical.length > 0 ? 'brick' : 'gold'

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              headerTone === 'brick'
                ? 'bg-[#C1442E]/10'
                : 'bg-[#E5A823]/15'
            }`}
          >
            <Bell
              size={16}
              className={
                headerTone === 'brick'
                  ? 'text-[#C1442E]'
                  : 'text-[#B8860B]'
              }
            />
          </div>

          <div>
            <p className="text-[13.5px] font-semibold text-[#1F2A24]">
              Stock alerts
            </p>

            <p className="text-[11.5px] text-[#1F2A24]/50">
              {critical.length > 0 && (
                <span className="font-medium text-[#C1442E]">
                  {critical.length} out of stock
                </span>
              )}

              {critical.length > 0 && warning.length > 0 && ' · '}

              {warning.length > 0 && (
                <span
                  className={
                    critical.length > 0
                      ? ''
                      : 'font-medium text-[#B8860B]'
                  }
                >
                  {warning.length} running low
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={
            onViewAll || (() => router.push('/stock'))
          }
          className="flex items-center gap-0.5 text-[12px] font-medium text-[#0F6B4C] hover:text-[#0B5A3F]"
        >
          View all
          <ChevronRight size={13} />
        </button>
      </div>

      <div className="space-y-1.5">
        {visibleCritical.length > 0 && (
          <p className="px-0.5 pb-0.5 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#C1442E]/70">
            Out of stock
          </p>
        )}

        {visibleCritical.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center gap-2.5 rounded-xl border border-[#C1442E]/15 bg-[#C1442E]/[0.05] p-2.5"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C1442E]/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C1442E]" />
            </span>

            <AlertTriangle
              size={15}
              className="shrink-0 text-[#C1442E]"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-[#1F2A24]">
                {alert.stockItem.name}
              </p>
              <p className="text-[11px] text-[#C1442E]/80">
                Restock as soon as possible
              </p>
            </div>

            <button
              onClick={() => dismissAlert(alert.id)}
              className="rounded-lg p-1 text-[#C1442E]/40 hover:bg-[#C1442E]/10 hover:text-[#C1442E]"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {visibleWarning.length > 0 && (
          <p className="px-0.5 pb-0.5 pt-2 text-[10.5px] font-semibold uppercase tracking-wide text-[#B8860B]/70">
            Running low
          </p>
        )}

        {visibleWarning.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center gap-2.5 rounded-xl border border-[#E5A823]/25 bg-[#E5A823]/[0.08] p-2.5"
          >
            <PackageX
              size={15}
              className="shrink-0 text-[#B8860B]"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-[#1F2A24]">
                {alert.stockItem.name}
              </p>

              <p className="text-[11px] text-[#B8860B]/90">
                {alert.stockItem.quantity}{' '}
                {alert.stockItem.unit ?? 'units'} left
              </p>
            </div>

            <button
              onClick={() => dismissAlert(alert.id)}
              className="rounded-lg p-1 text-[#B8860B]/40 hover:bg-[#E5A823]/20 hover:text-[#B8860B]"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {overflow > 0 && (
          <button
            onClick={
              onViewAll || (() => router.push('/stock'))
            }
            className="w-full rounded-lg py-1.5 text-center text-[11.5px] font-medium text-[#1F2A24]/40 hover:bg-black/[0.03] hover:text-[#1F2A24]/60"
          >
            +{overflow} more
          </button>
        )}
      </div>

      {visibleAlerts.length > 1 && (
        <button
          onClick={dismissAll}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/5 py-2 text-[11.5px] font-medium text-[#1F2A24]/50 hover:bg-black/[0.03] hover:text-[#1F2A24]/70"
        >
          <CheckCheck size={13} />
          Dismiss all
        </button>
      )}
    </div>
  )
}