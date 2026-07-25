'use client'

import { useState } from 'react'
import { Bell, AlertTriangle, Check, X, Package, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n'

interface Alert {
  id: string
  type: 'low_stock' | 'out_of_stock'
  message: string
  stockItem: {
    name: string
    quantity: number
    unit: string
  }
  createdAt: string
}

interface StockAlertsProps {
  alerts: Alert[]
  onDismiss: () => void
  onRefresh: () => void
}

export default function StockAlerts({ alerts, onDismiss, onRefresh }: StockAlertsProps) {
  const { t } = useI18n()
  const [dismissing, setDismissing] = useState(false)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const dismissAlerts = async (alertIds: string[]) => {
    setDismissing(true)
    try {
      const res = await fetch('/api/stock/alerts', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ alertIds })
      })
      if (res.ok) {
        toast.success(t('stock.dismissed'))
        onDismiss()
        onRefresh()
      }
    } catch (error) {
      toast.error(t('stock.dismissFailed'))
    } finally {
      setDismissing(false)
    }
  }

  const dismissAll = async () => {
    if (alerts.length === 0) return
    const ids = alerts.map(a => a.id)
    await dismissAlerts(ids)
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-black/5 p-8 text-center shadow-sm">
        <Bell size={40} className="mx-auto text-emerald-400 mb-3" />
        <h3 className="font-semibold text-[#1F2A24] text-lg">{t('stock.allClear')}</h3>
        <p className="text-sm text-[#1F2A24]/50">{t('stock.noAlerts')}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-red-500" />
          <h3 className="font-semibold text-[#1F2A24]">
            {t('stock.alertsTitle', { n: alerts.length })}
          </h3>
        </div>
        <button
          onClick={dismissAll}
          disabled={dismissing}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
        >
          {t('stock.dismissAll')}
        </button>
      </div>

      <div className="space-y-2">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-xl ${
              alert.type === 'out_of_stock'
                ? 'bg-red-50 border border-red-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}
          >
            <div className={`p-1.5 rounded-full ${
              alert.type === 'out_of_stock' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              {alert.type === 'out_of_stock' ? (
                <AlertTriangle size={16} className="text-red-600" />
              ) : (
                <Clock size={16} className="text-yellow-600" />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium text-[#1F2A24]">{alert.message}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-[#1F2A24]/50">
                <span>{t('stock.current', { n: alert.stockItem.quantity, unit: alert.stockItem.unit })}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-[#1F2A24]/20" />
                <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <button
              onClick={() => dismissAlerts([alert.id])}
              disabled={dismissing}
              className="p-1.5 rounded-lg hover:bg-white/60 transition"
              title={t('stock.dismiss')}
            >
              <X size={14} className="text-[#1F2A24]/40" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
